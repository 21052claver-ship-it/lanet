import { body, fail, id, json, limit, one, rows, run } from './utils.js';
import { madridDay } from '../shared/domain.js';
import { drawRoulette, roulettePayout, validateBet, ticketStake } from '../shared/roulette.js';

function sameBet(spin, bet) {
  if (spin.bets || bet.bets)
    return !!spin.bets && !!bet.bets && spin.bets === JSON.stringify(bet.bets);
  return spin.stake === bet.stake && spin.kind === bet.kind && spin.number === bet.number;
}
function publicSpin(spin) {
  const { request_id, stake, kind, number, result, payout, created_at } = spin;
  return {
    request_id,
    stake,
    kind,
    number,
    ...(spin.bets ? { bets: JSON.parse(spin.bets) } : {}),
    result,
    payout,
    net: payout - stake,
    created_at,
  };
}
export async function rouletteRoute(request, env, user) {
  if (request.method === 'GET')
    return json({
      balance: (await one(env, 'SELECT balance FROM users WHERE id=?', user.id)).balance,
      spins: (
        await rows(
          env,
          `SELECT request_id,stake,kind,number,result,payout,created_at,NULL AS bets FROM roulette_spins WHERE user_id=?
           UNION ALL SELECT request_id,stake,'ticket' AS kind,NULL AS number,result,payout,created_at,bets FROM roulette_tickets WHERE user_id=?
           ORDER BY created_at DESC,request_id DESC LIMIT 20`,
          user.id,
          user.id,
        )
      ).map(publicSpin),
    });
  if (request.method !== 'POST') fail(405, 'Mètode no vàlid.');
  let bet;
  const value = await body(request);
  try {
    bet = validateBet(value);
  } catch (error) {
    fail(400, error.message);
  }
  const previous = await one(
    env,
    `SELECT stake,kind,number,request_id,result,payout,created_at,NULL AS bets FROM roulette_spins WHERE user_id=? AND request_id=?
     UNION ALL SELECT stake,'ticket',NULL,request_id,result,payout,created_at,bets FROM roulette_tickets WHERE user_id=? AND request_id=?`,
    user.id,
    bet.request_id,
    user.id,
    bet.request_id,
  );
  if (!previous) {
    await limit(env, request, `roulette:${user.id}`, 12, 60);
    const result = drawRoulette();
    try {
      if (bet.bets)
        await run(
          env,
          'INSERT INTO roulette_tickets(id,user_id,request_id,bets,stake,result,payout,day) VALUES(?,?,?,?,?,?,?,?) ON CONFLICT(user_id,request_id) DO NOTHING',
          id(),
          user.id,
          bet.request_id,
          JSON.stringify(bet.bets),
          ticketStake(bet),
          result,
          roulettePayout(bet, result),
          madridDay(),
        );
      else
        await run(
          env,
          'INSERT INTO roulette_spins(id,user_id,request_id,stake,kind,number,result,payout,day) VALUES(?,?,?,?,?,?,?,?,?) ON CONFLICT(user_id,request_id) DO NOTHING',
          id(),
          user.id,
          bet.request_id,
          bet.stake,
          bet.kind,
          bet.number,
          result,
          roulettePayout(bet, result),
          madridDay(),
        );
    } catch (error) {
      if (String(error?.message).includes('roulette_request_conflict'))
        fail(
          409,
          'Aquesta referència ja correspon a una altra aposta. Recupera el resultat original.',
        );
      throw error;
    }
  }
  const spin =
    previous ||
    (await one(
      env,
      `SELECT stake,kind,number,request_id,result,payout,created_at,NULL AS bets FROM roulette_spins WHERE user_id=? AND request_id=?
       UNION ALL SELECT stake,'ticket',NULL,request_id,result,payout,created_at,bets FROM roulette_tickets WHERE user_id=? AND request_id=?`,
      user.id,
      bet.request_id,
      user.id,
      bet.request_id,
    ));
  if (!sameBet(spin, bet))
    fail(409, 'Aquesta referència ja correspon a una altra aposta. Recupera el resultat original.');
  return json({
    spin: publicSpin(spin),
    balance: (await one(env, 'SELECT balance FROM users WHERE id=?', user.id)).balance,
  });
}
