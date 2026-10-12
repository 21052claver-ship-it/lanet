import { body, fail, id, json, limit, one, rows, run } from './utils.js';
import { madridDay } from '../shared/domain.js';
import {
  RESOLUTION_SECONDS,
  predictionStatus,
  validatePrediction,
  validatePredictionBet,
  validatePredictionAction,
} from '../shared/predictions.js';

export async function expirePredictions(env) {
  return run(
    env,
    `UPDATE prediction_markets SET state='cancelled',reason=CASE WHEN state='pending' THEN 'El responsable no ha acceptat abans del tancament.' ELSE 'Ha vençut el termini de resolució de 7 dies. Retorn automàtic.' END,settled_at=unixepoch() WHERE (state='pending' AND closes_at<=unixepoch()) OR (state='open' AND resolve_by<=unixepoch())`,
  );
}
const columns = `m.id,m.creator_id,m.resolver_id,m.title,m.option_a,m.option_b,m.rules,m.closes_at,m.resolve_by,m.state,m.result,m.reason,m.settled_at,m.created_at,c.name creator,r.name resolver,
 COALESCE((SELECT SUM(stake) FROM prediction_bets WHERE market_id=m.id AND choice='A'),0) total_a,
 COALESCE((SELECT SUM(stake) FROM prediction_bets WHERE market_id=m.id AND choice='B'),0) total_b,
 (SELECT COUNT(DISTINCT user_id) FROM prediction_bets WHERE market_id=m.id) participants,
 COALESCE((SELECT SUM(stake) FROM prediction_bets WHERE market_id=m.id AND user_id=?),0) own_stake,
 (SELECT choice FROM prediction_bets WHERE market_id=m.id AND user_id=? LIMIT 1) own_choice,
 (SELECT payout FROM prediction_settlements WHERE market_id=m.id AND user_id=?) own_payout`;
const from =
  'FROM prediction_markets m JOIN users c ON c.id=m.creator_id JOIN users r ON r.id=m.resolver_id';
function present(m, user, now) {
  const active = ['pending', 'open'].includes(m.state);
  const resolver = m.resolver_id === user.id;
  return {
    ...m,
    status: predictionStatus(m, now),
    can_accept: resolver && m.state === 'pending' && m.closes_at > now,
    can_resolve: resolver && m.state === 'open' && m.closes_at <= now && m.resolve_by > now,
    can_cancel:
      active &&
      (resolver || user.role === 'admin' || (m.creator_id === user.id && m.participants === 0)),
    can_bet: !resolver && m.state === 'open' && m.closes_at > now,
  };
}
async function detail(env, user, marketId) {
  const m = await one(
    env,
    `SELECT ${columns} ${from} WHERE m.id=?`,
    user.id,
    user.id,
    user.id,
    marketId,
  );
  if (!m) fail(404, 'Aquesta predicció no existeix.');
  const history = await rows(
    env,
    `SELECT a.kind,a.choice,a.reason,a.created_at,u.name actor FROM prediction_actions a JOIN users u ON u.id=a.actor_id WHERE a.market_id=? ORDER BY a.rowid LIMIT 20`,
    marketId,
  );
  const now = (await one(env, 'SELECT unixepoch() now')).now;
  return {
    market: { ...present(m, user, now), history },
    server_now: now,
    balance: (await one(env, 'SELECT balance FROM users WHERE id=?', user.id)).balance,
  };
}
function validate(fn, value) {
  try {
    return fn(value);
  } catch (e) {
    fail(400, e.message);
  }
}
function same(previous, value, keys) {
  if (keys.some((k) => previous[k] !== value[k]))
    fail(409, 'Aquesta referència correspon a una altra acció. Recupera l’acció original.');
}
async function route(request, env, user, path) {
  await expirePredictions(env);
  const url = new URL(request.url),
    parts = path.split('/').filter(Boolean).slice(2);
  if (request.method === 'GET' && parts[0] === 'people' && parts.length === 1) {
    const query = (url.searchParams.get('q') || '').trim();
    if (query.length < 2) return json({ people: [] });
    if (query.length > 80) fail(400, 'Cerca un nom més curt.');
    const search = '%' + query.replace(/[\\%_]/g, '\\$&') + '%';
    return json({
      people: await rows(
        env,
        `SELECT id,name FROM users WHERE disabled=0 AND google_sub IS NOT NULL AND id<>? AND name LIKE ? ESCAPE '\\' ORDER BY name,id LIMIT 20`,
        user.id,
        search,
      ),
    });
  }
  if (request.method === 'GET' && !parts.length) {
    const filter = url.searchParams.get('filter') || 'open';
    if (!['open', 'mine', 'resolve', 'finished'].includes(filter)) fail(400, 'Filtre no vàlid.');
    const cursor = url.searchParams.get('before') || '';
    if (cursor.length > 80) fail(400, 'Pàgina no vàlida.');
    const where = {
      open: "m.state IN('pending','open')",
      mine: '(m.creator_id=? OR m.resolver_id=? OR EXISTS(SELECT 1 FROM prediction_bets WHERE market_id=m.id AND user_id=?))',
      resolve: "m.resolver_id=? AND m.state IN('pending','open')",
      finished: "m.state IN('resolved','cancelled')",
    }[filter];
    const args =
      filter === 'mine' ? [user.id, user.id, user.id] : filter === 'resolve' ? [user.id] : [];
    const list = await rows(
      env,
      `SELECT ${columns} ${from} WHERE ${where} ${cursor ? 'AND m.rowid<(SELECT rowid FROM prediction_markets WHERE id=?)' : ''} ORDER BY m.rowid DESC LIMIT 41`,
      user.id,
      user.id,
      user.id,
      ...args,
      ...(cursor ? [cursor] : []),
    );
    const now = (await one(env, 'SELECT unixepoch() now')).now;
    return json({
      markets: list.slice(0, 40).map((m) => present(m, user, now)),
      next_cursor: list.length > 40 ? list[39].id : null,
      server_now: now,
      balance: (await one(env, 'SELECT balance FROM users WHERE id=?', user.id)).balance,
    });
  }
  if (request.method === 'GET' && parts.length === 1)
    return json(await detail(env, user, parts[0]));
  if (request.method !== 'POST') fail(405, 'Mètode no vàlid.');
  const b = await body(request);
  if (!parts.length) {
    const previous =
      typeof b.request_id === 'string'
        ? await one(
            env,
            'SELECT * FROM prediction_markets WHERE creator_id=? AND request_id=?',
            user.id,
            b.request_id.toLowerCase(),
          )
        : null;
    const now = (await one(env, 'SELECT unixepoch() now')).now;
    const value = validate((v) => validatePrediction(v, previous ? null : now), b);
    if (previous)
      same(previous, value, ['title', 'option_a', 'option_b', 'rules', 'resolver_id', 'closes_at']);
    else {
      if (value.resolver_id === user.id) fail(400, 'Designa una altra persona com a responsable.');
      if (
        !(await one(
          env,
          'SELECT id FROM users WHERE id=? AND disabled=0 AND google_sub IS NOT NULL',
          value.resolver_id,
        ))
      )
        fail(400, 'Tria un responsable actiu de La Net.');
      await limit(env, request, `prediction:create:${user.id}`, 30, 60, true);
      await run(
        env,
        `INSERT INTO prediction_markets(id,creator_id,request_id,resolver_id,title,option_a,option_b,rules,closes_at,resolve_by) SELECT ?,?,?,?,?,?,?,?,?,? WHERE NOT EXISTS(SELECT 1 FROM prediction_markets WHERE creator_id=? AND request_id=?)`,
        id(),
        user.id,
        value.request_id,
        value.resolver_id,
        value.title,
        value.option_a,
        value.option_b,
        value.rules,
        value.closes_at,
        value.closes_at + RESOLUTION_SECONDS,
        user.id,
        value.request_id,
      );
    }
    const market =
      previous ||
      (await one(
        env,
        'SELECT * FROM prediction_markets WHERE creator_id=? AND request_id=?',
        user.id,
        value.request_id,
      ));
    same(market, value, ['title', 'option_a', 'option_b', 'rules', 'resolver_id', 'closes_at']);
    return json(await detail(env, user, market.id));
  }
  if (parts.length !== 2 || !['bets', 'actions'].includes(parts[1]))
    fail(404, 'Acció no disponible.');
  const marketId = parts[0];
  if (
    marketId.length > 80 ||
    !(await one(env, 'SELECT id FROM prediction_markets WHERE id=?', marketId))
  )
    fail(404, 'Aquesta predicció no existeix.');
  if (parts[1] === 'bets') {
    const value = validate(validatePredictionBet, b);
    const previous = await one(
      env,
      'SELECT * FROM prediction_bets WHERE user_id=? AND request_id=?',
      user.id,
      value.request_id,
    );
    if (!previous) {
      await limit(env, request, `prediction:bet:${user.id}`, 30, 60, true);
      await run(
        env,
        `INSERT INTO prediction_bets(id,market_id,user_id,request_id,choice,stake,day) SELECT ?,?,?,?,?,?,? WHERE NOT EXISTS(SELECT 1 FROM prediction_bets WHERE user_id=? AND request_id=?)`,
        id(),
        marketId,
        user.id,
        value.request_id,
        value.choice,
        value.stake,
        madridDay(),
        user.id,
        value.request_id,
      );
    }
    const bet =
      previous ||
      (await one(
        env,
        'SELECT * FROM prediction_bets WHERE user_id=? AND request_id=?',
        user.id,
        value.request_id,
      ));
    same(bet, { ...value, market_id: marketId }, ['market_id', 'choice', 'stake']);
  } else {
    const value = validate(validatePredictionAction, b);
    const previous = await one(
      env,
      'SELECT * FROM prediction_actions WHERE actor_id=? AND request_id=?',
      user.id,
      value.request_id,
    );
    if (!previous) {
      await limit(env, request, `prediction:action:${user.id}`, 30, 60, true);
      await run(
        env,
        `INSERT INTO prediction_actions(id,market_id,actor_id,request_id,kind,choice,reason) SELECT ?,?,?,?,?,?,? WHERE NOT EXISTS(SELECT 1 FROM prediction_actions WHERE actor_id=? AND request_id=?)`,
        id(),
        marketId,
        user.id,
        value.request_id,
        value.kind,
        value.choice,
        value.reason,
        user.id,
        value.request_id,
      );
    }
    const action =
      previous ||
      (await one(
        env,
        'SELECT * FROM prediction_actions WHERE actor_id=? AND request_id=?',
        user.id,
        value.request_id,
      ));
    same(action, { ...value, market_id: marketId }, ['market_id', 'kind', 'choice', 'reason']);
  }
  return json(await detail(env, user, marketId));
}
export async function predictionsRoute(request, env, user, path) {
  try {
    return await route(request, env, user, path);
  } catch (error) {
    if (String(error.message).includes('prediction_create_rate'))
      fail(429, 'Pots crear fins a 5 prediccions per hora. Torna-ho a provar més tard.');
    const messages = {
      prediction_invalid_creation:
        'Revisa el responsable i el termini: almenys 5 minuts a partir d’ara.',
      prediction_market_limit:
        'Ja tens 10 prediccions actives. Tanca’n alguna abans de crear-ne més.',
      prediction_betting_closed: 'Les apostes no estan obertes o ets el responsable del resultat.',
      prediction_side_locked:
        'Ja has triat l’altre costat. Només pots afegir pastissos a la teva opció.',
      prediction_pool_limit: 'Aquesta taula ja ha arribat al límit del pot.',
      prediction_action_unavailable:
        'Aquesta acció ja no està disponible. Actualitza la taula i revisa el termini i el responsable.',
      prediction_immutable: 'Aquesta predicció ja no es pot modificar.',
    };
    const key = Object.keys(messages).find((k) => String(error.message).includes(k));
    if (key) fail(409, messages[key]);
    throw error;
  }
}
