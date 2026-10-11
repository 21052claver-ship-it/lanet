import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID, createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { testEnvironment } from './helpers/d1.js';
import { predictionsRoute, expirePredictions } from '../worker/predictions.js';
import {
  validatePrediction,
  validatePredictionBet,
  validatePredictionAction,
  predictionDistribution,
} from '../shared/predictions.js';
import app from '../worker/index.js';

test('D1 remote trigger parsing keeps LF, uppercase BEGIN and parenthesized CASE expressions', () => {
  const sql = readFileSync('migrations/0022_predictions.sql', 'utf8');
  assert.ok(!sql.includes('\r'));
  const triggers = sql.slice(sql.indexOf('CREATE TRIGGER'));
  assert.ok([...triggers.matchAll(/\bBEGIN\b/gi)].every((match) => match[0] === 'BEGIN'));
  assert.equal(
    [...triggers.matchAll(/\bCASE\b/g)].length,
    [...triggers.matchAll(/\(\s*CASE\b/g)].length,
  );
});

function fixture() {
  const { db, env } = testEnvironment();
  let now = Math.floor(Date.now() / 1000);
  db.function('unixepoch', () => now);
  for (const name of ['creator', 'resolver', 'a', 'b', 'c', 'admin']) {
    db.prepare(
      'INSERT INTO users(id,email,name,password_hash,salt,google_sub,role) VALUES(?,?,?,?,?,?,?)',
    ).run(name, `${name}@fje.edu`, name, 'x', 'x', name, name === 'admin' ? 'admin' : 'student');
    db.prepare('INSERT INTO ledger(id,user_id,amount,reason,ref,day) VALUES(?,?,995,?,?,?)').run(
      name,
      name,
      'Fixture',
      name,
      '2026-10-11',
    );
  }
  const request = async (path = '', value, user = 'creator') => {
    const response = await predictionsRoute(
      new Request('https://lanet.example/api/predictions' + path, {
        method: value ? 'POST' : 'GET',
        headers: { 'Content-Type': 'application/json' },
        ...(value ? { body: JSON.stringify(value) } : {}),
      }),
      env,
      db.prepare('SELECT * FROM users WHERE id=?').get(user),
      '/api/predictions' + path.split('?')[0],
    );
    return response.json();
  };
  const draft = () => ({
    request_id: randomUUID(),
    title: 'Quina opció guanyarà la prova?',
    option_a: 'Equip A',
    option_b: 'Equip B',
    rules: 'Resultat final publicat al marcador oficial. Empat: anul·lar i retornar.',
    resolver_id: 'resolver',
    closes_at: now + 600,
  });
  const create = async () => (await request('', draft())).market;
  const action = (market, kind, user = 'resolver', extra = {}) =>
    request(
      `/${market.id}/actions`,
      {
        request_id: randomUUID(),
        kind,
        reason: 'Resultat verificat al marcador oficial.',
        ...extra,
      },
      user,
    );
  const bet = (market, user, choice, stake, request_id = randomUUID()) =>
    request(`/${market.id}/bets`, { request_id, choice, stake }, user);
  const open = async () => {
    const market = await create();
    await action(market, 'accept');
    return market;
  };
  const balance = (user) => db.prepare('SELECT balance FROM users WHERE id=?').get(user).balance;
  const advance = (seconds) => {
    now += seconds;
  };
  const conservation = () => {
    const balances = db.prepare('SELECT SUM(balance) n FROM users').get().n;
    const locked = db
      .prepare(
        "SELECT COALESCE(SUM(b.stake),0) n FROM prediction_bets b JOIN prediction_markets m ON m.id=b.market_id WHERE m.state IN('pending','open')",
      )
      .get().n;
    assert.equal(balances + locked, 6000);
    for (const row of db
      .prepare(
        'SELECT u.id,u.balance,COALESCE(SUM(l.amount),0) amount FROM users u LEFT JOIN ledger l ON l.user_id=u.id GROUP BY u.id',
      )
      .all())
      assert.equal(row.balance, row.amount);
  };
  return { db, env, request, draft, create, action, bet, open, balance, advance, conservation };
}
test('Prediction inputs reject forged users, coercion, duplicate choices, bad time and control characters', () => {
  const value = {
    request_id: randomUUID(),
    title: 'Quin equip guanyarà?',
    option_a: 'Sí',
    option_b: 'No',
    rules: 'Segons el resultat oficial de la prova.',
    resolver_id: 'other',
    closes_at: 1600,
  };
  assert.equal(validatePrediction(value, 1000).closes_at, 1600);
  for (const patch of [
    { creator_id: 'other' },
    { state: 'resolved' },
    { closes_at: 1299 },
    { closes_at: '1600' },
    { closes_at: 1000 + 180 * 86400 + 1 },
    { closes_at: NaN },
    { option_b: 'sí' },
    { rules: 'curt' },
    { title: '\u0000pregunta prou llarga' },
    { resolver_id: {} },
  ])
    assert.throws(() => validatePrediction({ ...value, ...patch }, 1000));
  for (const patch of [
    { stake: '1' },
    { stake: 0 },
    { stake: 1.5 },
    { stake: 1001 },
    { choice: 'C' },
    { payout: 300 },
    { request_id: 'id' },
  ])
    assert.throws(() =>
      validatePredictionBet({ request_id: randomUUID(), choice: 'A', stake: 1, ...patch }),
    );
  assert.throws(() =>
    validatePredictionAction({
      request_id: randomUUID(),
      kind: 'resolve',
      choice: 'C',
      reason: 'Raó suficient',
    }),
  );
  assert.throws(() =>
    validatePredictionAction({ request_id: randomUUID(), kind: 'cancel', reason: 'curt' }),
  );
});
test('Resolver acceptance is required; only designated resolver may accept and cannot bet', async () => {
  const f = fixture();
  try {
    const m = await f.create();
    await assert.rejects(f.bet(m, 'a', 'A', 1), (e) => e.status === 409);
    await assert.rejects(f.action(m, 'accept', 'a'), (e) => e.status === 409);
    await assert.rejects(f.action(m, 'accept', 'creator'), (e) => e.status === 409);
    await f.action(m, 'accept');
    await assert.rejects(f.bet(m, 'resolver', 'A', 1), (e) => e.status === 409);
    assert.equal((await f.bet(m, 'creator', 'A', 1)).market.own_stake, 1);
    f.conservation();
  } finally {
    f.db.close();
  }
});
test('Creation and bets recover exactly once, even concurrently and after deadline', async () => {
  const f = fixture();
  try {
    const value = f.draft();
    const copies = await Promise.all(Array.from({ length: 8 }, () => f.request('', value)));
    const m = copies[0].market;
    assert.ok(copies.every((c) => c.market.id === m.id));
    await assert.rejects(
      f.request('', { ...value, title: 'Una altra pregunta diferent?' }),
      (e) => e.status === 409,
    );
    await f.action(m, 'accept');
    const ref = randomUUID();
    const bets = await Promise.all(Array.from({ length: 12 }, () => f.bet(m, 'a', 'A', 30, ref)));
    assert.equal(f.balance('a'), 970);
    assert.ok(bets.every((b) => b.market.own_stake === 30));
    await assert.rejects(f.bet(m, 'a', 'A', 31, ref), (e) => e.status === 409);
    f.advance(601);
    assert.equal((await f.bet(m, 'a', 'A', 30, ref)).market.own_stake, 30);
    assert.equal((await f.request('', value)).market.id, m.id);
    await assert.rejects(f.bet(m, 'a', 'A', 1), (e) => e.status === 409);
    f.conservation();
  } finally {
    f.db.close();
  }
});
test('Only one side per user, no overdraft and immutable rules or stakes', async () => {
  const f = fixture();
  try {
    const m = await f.open();
    await f.bet(m, 'a', 'A', 600);
    await assert.rejects(f.bet(m, 'a', 'B', 1), (e) => e.status === 409);
    await assert.rejects(f.bet(m, 'a', 'A', 401), /insufficient_balance/);
    const answers = await Promise.allSettled([f.bet(m, 'a', 'A', 400), f.bet(m, 'a', 'A', 400)]);
    assert.equal(answers.filter((r) => r.status === 'fulfilled').length, 1);
    assert.equal(f.balance('a'), 0);
    assert.throws(
      () =>
        f.db
          .prepare(
            "UPDATE prediction_markets SET rules='Altered immutable rules string' WHERE id=?",
          )
          .run(m.id),
      /immutable/,
    );
    assert.throws(() => f.db.exec('UPDATE prediction_bets SET stake=1'), /immutable/);
    assert.throws(() => f.db.exec('DELETE FROM prediction_bets'), /immutable/);
    f.conservation();
  } finally {
    f.db.close();
  }
});
test('Resolution permissions, deadlines, integer distribution, duplicate resolution and private result', async () => {
  const f = fixture();
  try {
    const m = await f.open();
    await f.bet(m, 'a', 'A', 1);
    await f.bet(m, 'b', 'A', 2);
    await f.bet(m, 'c', 'B', 4);
    await assert.rejects(
      f.action(m, 'resolve', 'resolver', { choice: 'A' }),
      (e) => e.status === 409,
    );
    await assert.rejects(f.action(m, 'cancel', 'creator'), (e) => e.status === 409);
    f.advance(600);
    await assert.rejects(f.action(m, 'resolve', 'admin', { choice: 'A' }), (e) => e.status === 409);
    const value = {
      request_id: randomUUID(),
      kind: 'resolve',
      choice: 'A',
      reason: 'Guanya A segons el resultat oficial.',
    };
    const results = await Promise.all(
      Array.from({ length: 8 }, () => f.request(`/${m.id}/actions`, value, 'resolver')),
    );
    assert.ok(results.every((r) => r.market.state === 'resolved'));
    assert.equal(f.balance('a'), 1001);
    assert.equal(f.balance('b'), 1003);
    assert.equal(f.balance('c'), 996);
    assert.equal(f.db.prepare('SELECT SUM(payout) n FROM prediction_settlements').get().n, 7);
    assert.equal((await f.request('/' + m.id, undefined, 'a')).market.own_payout, 2);
    await assert.rejects(
      f.request(`/${m.id}/actions`, { ...value, choice: 'B' }, 'resolver'),
      (e) => e.status === 409,
    );
    await assert.rejects(
      f.action(m, 'resolve', 'resolver', { choice: 'B' }),
      (e) => e.status === 409,
    );
    const exposed = JSON.stringify(await f.request('/' + m.id, undefined, 'creator'));
    assert.ok(!exposed.includes('@fje.edu'));
    assert.ok(!exposed.includes('request_id'));
    assert.ok(!exposed.includes('password'));
    f.conservation();
  } finally {
    f.db.close();
  }
});
test('Random integer pots match SQL largest-remainder distribution and conserve all cakes', async () => {
  const f = fixture();
  try {
    for (let round = 0; round < 40; round++) {
      // No HTTP creation limit for this exhaustive accounting test.
      const m = { id: randomUUID() };
      const now = f.db.prepare('SELECT unixepoch() now').get().now;
      f.db
        .prepare(
          'INSERT INTO prediction_markets(id,creator_id,request_id,resolver_id,title,option_a,option_b,rules,closes_at,resolve_by) VALUES(?,?,?,?,?,?,?,?,?,?)',
        )
        .run(
          m.id,
          'creator',
          randomUUID(),
          'resolver',
          'Comptabilitat de la prova',
          'A',
          'B',
          'Regles oficials suficientment llargues.',
          now + 600,
          now + 605400,
        );
      f.db
        .prepare(
          "INSERT INTO prediction_actions(id,market_id,actor_id,request_id,kind,reason) VALUES(?,?,?,?,'accept','')",
        )
        .run(randomUUID(), m.id, 'resolver', randomUUID());
      const positions = ['a', 'b', 'c'].map((user_id, index) => ({
        user_id,
        choice: index === 2 ? 'B' : 'A',
        stake: 1 + ((round * 17 + index * 11) % 31),
      }));
      for (const p of positions)
        f.db
          .prepare(
            'INSERT INTO prediction_bets(id,market_id,user_id,request_id,choice,stake,day) VALUES(?,?,?,?,?,?,?)',
          )
          .run(randomUUID(), m.id, p.user_id, randomUUID(), p.choice, p.stake, '2026-10-11');
      f.advance(800);
      // Resolve via SQL action to avoid HTTP anti-spam throttle.
      const choice = round % 2 ? 'A' : 'B';
      f.db
        .prepare(
          'INSERT INTO prediction_actions(id,market_id,actor_id,request_id,kind,choice,reason) VALUES(?,?,?,?,?,?,?)',
        )
        .run(
          randomUUID(),
          m.id,
          'resolver',
          randomUUID(),
          'resolve',
          choice,
          'Resultat oficial de la prova.',
        );
      const expected = predictionDistribution(positions, choice);
      for (const p of expected)
        assert.equal(
          f.db
            .prepare('SELECT payout FROM prediction_settlements WHERE market_id=? AND user_id=?')
            .get(m.id, p.user_id).payout,
          p.payout,
        );
      f.conservation();
    }
  } finally {
    f.db.close();
  }
});
test('Cancellation, rejection, no winning stakes and expiry refund in full once', async () => {
  const f = fixture();
  try {
    let m = await f.create();
    await f.action(m, 'reject');
    assert.equal((await f.request('/' + m.id)).market.state, 'cancelled');
    m = await f.open();
    await f.bet(m, 'a', 'A', 9);
    await f.action(m, 'cancel', 'admin');
    assert.equal(f.balance('a'), 1000);
    m = await f.open();
    await f.bet(m, 'b', 'A', 13);
    f.advance(600);
    await f.action(m, 'resolve', 'resolver', { choice: 'B' });
    assert.equal(f.balance('b'), 1000);
    m = await f.open();
    await f.bet(m, 'c', 'A', 17);
    f.advance(600 + 7 * 86400);
    await expirePredictions(f.env);
    await expirePredictions(f.env);
    assert.equal(f.balance('c'), 1000);
    assert.equal((await f.request('/' + m.id)).market.state, 'cancelled');
    m = await f.create();
    f.advance(600);
    assert.equal((await f.request('/' + m.id)).market.state, 'cancelled');
    await assert.rejects(f.action(m, 'accept'), (e) => e.status === 409);
    f.conservation();
  } finally {
    f.db.close();
  }
});
test('Interrupted settlement rolls back state, action, payouts and every credit', async () => {
  const f = fixture();
  try {
    const m = await f.open();
    await f.bet(m, 'a', 'A', 5);
    await f.bet(m, 'b', 'B', 10);
    f.advance(600);
    f.db.exec(
      "CREATE TRIGGER break_settlement BEFORE INSERT ON ledger WHEN NEW.ref LIKE 'prediction:settle:%' BEGIN SELECT RAISE(ABORT,'fixture_settlement_failure'); END",
    );
    await assert.rejects(
      f.action(m, 'resolve', 'resolver', { choice: 'A' }),
      /fixture_settlement_failure/,
    );
    assert.equal(
      f.db.prepare('SELECT state FROM prediction_markets WHERE id=?').get(m.id).state,
      'open',
    );
    assert.equal(f.db.prepare('SELECT COUNT(*) n FROM prediction_settlements').get().n, 0);
    assert.equal(
      f.db.prepare("SELECT COUNT(*) n FROM prediction_actions WHERE kind='resolve'").get().n,
      0,
    );
    f.conservation();
  } finally {
    f.db.close();
  }
});
test('Filters, safe directory, cursor and full API authentication/origin protection', async () => {
  const f = fixture();
  try {
    const m = await f.open();
    await f.bet(m, 'a', 'A', 1);
    assert.equal((await f.request('?filter=mine', undefined, 'a')).markets.length, 1);
    assert.equal((await f.request('?filter=mine', undefined, 'b')).markets.length, 0);
    assert.equal((await f.request('?filter=resolve', undefined, 'resolver')).markets.length, 1);
    assert.deepEqual((await f.request('?before=' + m.id)).markets, []);
    const people = (await f.request('/people?q=re')).people;
    assert.ok(people.some((p) => p.id === 'resolver'));
    assert.ok(!people.some((p) => p.id === 'creator'));
    assert.ok(people.every((p) => Object.keys(p).sort().join(',') === 'id,name'));
    assert.deepEqual((await f.request('/people?q=%25%25')).people, []);
    assert.equal(
      (await app.fetch(new Request('https://lanet.example/api/predictions'), f.env, {})).status,
      401,
    );
    const token = randomUUID();
    f.db
      .prepare("INSERT INTO sessions(hash,user_id,expires,auth_provider) VALUES(?,'a',?,'google')")
      .run(createHash('sha256').update(token).digest('hex'), Date.now() + 3600000);
    const response = await app.fetch(
      new Request(`https://lanet.example/api/predictions/${m.id}/bets`, {
        method: 'POST',
        headers: {
          Cookie: `lanet_session=${token}`,
          Origin: 'https://evil.example',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ request_id: randomUUID(), choice: 'A', stake: 1 }),
      }),
      f.env,
      {},
    );
    assert.equal(response.status, 403);
    f.conservation();
  } finally {
    f.db.close();
  }
});
test('Opposite simultaneous bets and cancellation races cannot corrupt the pot', async () => {
  const f = fixture();
  try {
    let m = await f.open();
    const opposite = await Promise.allSettled([f.bet(m, 'a', 'A', 5), f.bet(m, 'a', 'B', 5)]);
    assert.equal(opposite.filter((r) => r.status === 'fulfilled').length, 1);
    assert.equal(f.balance('a'), 995);
    f.conservation();
    m = await f.open();
    const race = await Promise.allSettled([
      f.action(m, 'cancel', 'creator'),
      f.bet(m, 'b', 'B', 10),
    ]);
    const state = f.db.prepare('SELECT state FROM prediction_markets WHERE id=?').get(m.id).state;
    if (state === 'cancelled') assert.equal(f.balance('b'), 1000);
    else {
      assert.equal(state, 'open');
      assert.equal(f.balance('b'), 990);
    }
    assert.ok(race.some((r) => r.status === 'fulfilled'));
    f.conservation();
  } finally {
    f.db.close();
  }
});
test('Simultaneous conflicting resolutions produce one immutable outcome and one distribution', async () => {
  const f = fixture();
  try {
    const m = await f.open();
    await f.bet(m, 'a', 'A', 9);
    await f.bet(m, 'b', 'B', 11);
    f.advance(600);
    const race = await Promise.allSettled([
      f.action(m, 'resolve', 'resolver', { choice: 'A' }),
      f.action(m, 'resolve', 'resolver', { choice: 'B' }),
    ]);
    assert.equal(race.filter((r) => r.status === 'fulfilled').length, 1);
    const result = f.db
      .prepare('SELECT result FROM prediction_markets WHERE id=?')
      .get(m.id).result;
    assert.equal(f.balance(result === 'A' ? 'a' : 'b'), 1000 - (result === 'A' ? 9 : 11) + 20);
    assert.equal(f.db.prepare('SELECT SUM(payout) n FROM prediction_settlements').get().n, 20);
    f.conservation();
  } finally {
    f.db.close();
  }
});
test('Pool limit is atomic and splitting one position does not change rounding priority', async () => {
  const f = fixture();
  try {
    const m = await f.open();
    f.db
      .prepare(
        "INSERT INTO ledger(id,user_id,amount,reason,ref,day) VALUES('large','a',999000,'Fixture','large','2026-10-11')",
      )
      .run();
    const insert = f.db.prepare(
      'INSERT INTO prediction_bets(id,market_id,user_id,request_id,choice,stake,day) VALUES(?,?,?,?,?,?,?)',
    );
    for (let n = 0; n < 1000; n++)
      insert.run(randomUUID(), m.id, 'a', randomUUID(), 'A', 1000, '2026-10-11');
    assert.equal(f.balance('a'), 0);
    await assert.rejects(f.bet(m, 'b', 'B', 1), (e) => e.status === 409);
    assert.equal(f.balance('b'), 1000);
    f.advance(600);
    await f.action(m, 'resolve', 'resolver', { choice: 'A' });
    assert.equal(f.balance('a'), 1000000);
    assert.equal(f.db.prepare('SELECT COUNT(*) n FROM prediction_settlements').get().n, 1);
    const p = predictionDistribution(
      [
        { user_id: 'a', choice: 'A', stake: 1 },
        { user_id: 'b', choice: 'A', stake: 1 },
        { user_id: 'c', choice: 'B', stake: 1 },
      ],
      'A',
    );
    assert.deepEqual(
      p.map((x) => x.payout),
      [2, 1, 0],
    );
  } finally {
    f.db.close();
  }
});
test('Unicode length agrees with SQLite and short emoji strings return validation errors', async () => {
  const f = fixture();
  try {
    await assert.rejects(
      f.request('', { ...f.draft(), title: '🎂'.repeat(7) }),
      (e) => e.status === 400,
    );
    const m = (await f.request('', { ...f.draft(), title: '🎂'.repeat(8) })).market;
    await f.action(m, 'accept');
    await assert.rejects(
      f.action(m, 'cancel', 'resolver', { reason: '🎂'.repeat(9) }),
      (e) => e.status === 400,
    );
    await f.action(m, 'cancel', 'resolver', { reason: '🎂'.repeat(10) });
    f.conservation();
  } finally {
    f.db.close();
  }
});
test('Creator/resolver validation and SQL creation limits cannot be bypassed by parallel requests', async () => {
  const f = fixture();
  try {
    await assert.rejects(
      f.request('', { ...f.draft(), resolver_id: 'creator' }),
      (e) => e.status === 400,
    );
    f.db.prepare("UPDATE users SET disabled=1 WHERE id='resolver'").run();
    await assert.rejects(f.create(), (e) => e.status === 400);
    f.db.prepare("UPDATE users SET disabled=0 WHERE id='resolver'").run();
    const attempts = await Promise.allSettled(Array.from({ length: 8 }, () => f.create()));
    assert.equal(attempts.filter((r) => r.status === 'fulfilled').length, 5);
    assert.ok(
      attempts.filter((r) => r.status === 'rejected').every((r) => r.reason.status === 429),
    );
    f.conservation();
  } finally {
    f.db.close();
  }
});
