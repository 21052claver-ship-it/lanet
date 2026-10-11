import { body, fail, id, json, limit, one, rows, run } from './utils.js';
import { madridDay } from '../shared/domain.js';
import { drawRoulette, roulettePayout, validateBet } from '../shared/roulette.js';

function sameBet(spin, bet) {
  return spin.stake === bet.stake && spin.kind === bet.kind && spin.number === bet.number;
}
function publicSpin(spin) {
  const { request_id, stake, kind, number, result, payout, created_at } = spin;
  return { request_id, stake, kind, number, result, payout, net: payout - stake, created_at };
}
export async function rouletteRoute(request, env, user) {
  if (request.method === 'GET')
    return json({
      balance: (await one(env, 'SELECT balance FROM users WHERE id=?', user.id)).balance,
      spins: (
        await rows(
          env,
          'SELECT * FROM roulette_spins WHERE user_id=? ORDER BY rowid DESC LIMIT 20',
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
    'SELECT * FROM roulette_spins WHERE user_id=? AND request_id=?',
    user.id,
    bet.request_id,
  );
  if (!previous) {
    await limit(env, request, `roulette:${user.id}`, 12, 60);
    const result = drawRoulette();
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
  }
  const spin =
    previous ||
    (await one(
      env,
      'SELECT * FROM roulette_spins WHERE user_id=? AND request_id=?',
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
