import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import {
  TABLE_BETS,
  BETS_BY_ID,
  roulettePayout,
  validateBet,
  ticketStake,
} from '../shared/roulette.js';
import { testEnvironment } from './helpers/d1.js';
import { rouletteRoute } from '../worker/roulette.js';
function fixture(fund = 5) {
  const { db, env } = testEnvironment();
  db.exec(
    "INSERT INTO users(id,email,name,password_hash,salt,google_sub) VALUES('r','r@fje.edu','Local','x','x','r'),('s','s@fje.edu','Other','x','x','s')",
  );
  if (fund > 5)
    db.prepare(
      "INSERT INTO ledger(id,user_id,amount,reason,ref,day) VALUES('fund','r',?,'Fixture','fund','2026-10-12')",
    ).run(fund - 5);
  const user = db.prepare("SELECT * FROM users WHERE id='r'").get();
  const settle = (
    bets,
    result,
    {
      stake = bets.reduce((s, b) => s + b.stake, 0),
      payout = roulettePayout({ bets }, result),
      request_id = randomUUID(),
    } = {},
  ) =>
    db
      .prepare(
        'INSERT INTO roulette_tickets(id,user_id,request_id,bets,stake,result,payout,day) VALUES(?,?,?,?,?,?,?,?)',
      )
      .run(
        randomUUID(),
        'r',
        request_id,
        JSON.stringify(bets),
        stake,
        result,
        payout,
        '2026-10-12',
      );
  const request = async (value, owner = user) =>
    (
      await rouletteRoute(
        new Request('https://lanet.example/api/roulette', {
          method: value ? 'POST' : 'GET',
          headers: { 'Content-Type': 'application/json' },
          ...(value ? { body: JSON.stringify(value) } : {}),
        }),
        env,
        owner,
      )
    ).json();
  return { db, settle, request };
}
const chip = (id, stake = 1) => ({ id, stake });
test('Independent geometry oracle covers exactly every legal European position', () => {
  assert.equal(TABLE_BETS.length, 157);
  assert.equal(new Set(TABLE_BETS.map((b) => b.id)).size, 157);
  const counts = {
    number: 37,
    split: 60,
    street: 12,
    six: 11,
    corner: 22,
    trio: 2,
    'first-four': 1,
    column: 3,
    dozen: 3,
    red: 1,
    black: 1,
    odd: 1,
    even: 1,
    low: 1,
    high: 1,
  };
  for (const [kind, count] of Object.entries(counts))
    assert.equal(TABLE_BETS.filter((b) => b.kind === kind).length, count, kind);
  for (const b of TABLE_BETS) {
    assert.equal(new Set(b.numbers).size, b.numbers.length);
    assert.equal(b.multiplier, 36 / b.numbers.length);
    const [a, c] = b.numbers;
    if (b.kind === 'split')
      assert.ok(
        a === 0
          ? c >= 1 && c <= 3
          : c === a + 3 || (c === a + 1 && Math.floor((a - 1) / 3) === Math.floor((c - 1) / 3)),
      );
    if (b.kind === 'corner') {
      assert.ok(a > 0 && a % 3 !== 0);
      assert.deepEqual(b.numbers, [a, a + 1, a + 3, a + 4]);
    }
    if (['street', 'six'].includes(b.kind)) {
      assert.equal(a % 3, 1);
      assert.deepEqual(
        b.numbers,
        Array.from({ length: b.kind === 'six' ? 6 : 3 }, (_, i) => a + i),
      );
    }
    if (b.kind === 'column') {
      assert.equal(b.numbers.length, 12);
      assert.ok(b.numbers.every((n) => n % 3 === a % 3));
    }
    if (b.kind === 'dozen')
      assert.deepEqual(
        b.numbers,
        Array.from({ length: 12 }, (_, i) => a + i),
      );
    if (['red', 'black', 'odd', 'even', 'low', 'high', 'column', 'dozen'].includes(b.kind))
      assert.ok(!b.numbers.includes(0));
  }
  assert.ok(!BETS_BY_ID['split:3-4']);
  assert.ok(!BETS_BY_ID['corner:3-4-6-7']);
  assert.ok(!BETS_BY_ID['trio:0-1-3']);
});
test('Every position and all 37 outcomes agree between independent odds, JS and atomic SQL (5809 cases)', () => {
  const { db, settle } = fixture(100000);
  let balance = 100000;
  try {
    const sql = db.prepare('SELECT * FROM roulette_positions WHERE id=?');
    for (const b of TABLE_BETS) {
      assert.deepEqual(JSON.parse(sql.get(b.id).numbers), b.numbers);
      assert.equal(sql.get(b.id).multiplier, b.multiplier);
      for (let n = 0; n <= 36; n++) {
        const expected = b.numbers.includes(n) ? (36 / b.numbers.length) * 2 : 0;
        const bets = [chip(b.id, 2)];
        assert.equal(roulettePayout({ bets }, n), expected);
        settle(bets, n);
        balance += expected - 2;
        assert.equal(db.prepare("SELECT balance FROM users WHERE id='r'").get().balance, balance);
        assert.throws(() => settle(bets, n, { payout: expected + 1 }), /roulette_invalid_ticket/);
      }
    }
    assert.equal(db.prepare('SELECT count(*) n FROM roulette_tickets').get().n, 5809);
  } finally {
    db.close();
  }
});
test('Overlapping winners add independently and zero loses all exterior positions', () => {
  const bets = [
    chip('number:1', 2),
    chip('split:1-2', 3),
    chip('corner:1-2-4-5', 4),
    chip('street:1-2-3', 5),
  ];
  assert.equal(roulettePayout({ bets }, 1), 72 + 54 + 36 + 60);
  const outside = TABLE_BETS.filter((b) =>
    ['column', 'dozen', 'red', 'black', 'odd', 'even', 'low', 'high'].includes(b.kind),
  ).map((b) => chip(b.id));
  assert.equal(roulettePayout({ bets: outside }, 0), 0);
  const { db, settle } = fixture(50);
  try {
    settle(bets, 1);
    assert.equal(db.prepare("SELECT balance FROM users WHERE id='r'").get().balance, 50 - 14 + 222);
  } finally {
    db.close();
  }
});
test('Strict ticket validation rejects custom odds, malformed positions, duplicates, fractional and aggregate overspend', () => {
  const good = { request_id: randomUUID(), bets: [chip('number:0'), chip('split:1-2', 5)] };
  assert.deepEqual(validateBet({ ...good, bets: [...good.bets].reverse() }), validateBet(good));
  assert.equal(ticketStake(validateBet(good)), 6);
  const invalid = [
    { ...good, stake: 6 },
    { ...good, result: 0 },
    { ...good, bets: [] },
    { ...good, bets: 'bad' },
    { ...good, bets: [null] },
    { ...good, bets: [chip('toString')] },
    { ...good, bets: [chip('split:3-4')] },
    { ...good, bets: [chip('number:37')] },
    { ...good, bets: [chip('number:0', 1.2)] },
    { ...good, bets: [chip('number:0', '1')] },
    { ...good, bets: [chip('number:0', 0)] },
    { ...good, bets: [chip('number:0', -1)] },
    { ...good, bets: [chip('number:0', 1001)] },
    { ...good, bets: [chip('number:0', 600), chip('number:1', 401)] },
    { ...good, bets: [chip('number:0'), chip('number:0')] },
    { ...good, bets: [{ ...chip('number:0'), multiplier: 100 }] },
  ];
  for (const value of invalid) assert.throws(() => validateBet(value));
});
test('SQL independently rejects forged amounts, odds, unknown positions, duplicate positions and malformed JSON', () => {
  const { db, settle } = fixture(100);
  try {
    const bets = [chip('number:0')];
    assert.throws(() => settle(bets, 0, { stake: 2 }), /roulette_invalid_ticket/);
    assert.throws(() => settle(bets, 0, { payout: 360 }), /roulette_invalid_ticket/);
    for (const values of [
      [chip('number:0', 0)],
      [chip('number:0', 1.5)],
      [chip('number:0', '1')],
      [chip('split:3-4')],
      [chip('number:0'), chip('number:0')],
      [{ ...chip('number:0'), numbers: [0] }],
      [{ id: 'number:0', other: 1 }],
      [null],
    ]) {
      assert.throws(() => settle(values, 0, { stake: 1, payout: 0 }));
    }
    assert.equal(db.prepare('SELECT COUNT(*) n FROM roulette_tickets').get().n, 0);
    assert.equal(db.prepare("SELECT balance FROM users WHERE id='r'").get().balance, 100);
  } finally {
    db.close();
  }
});
test('Full ticket debit precedes prize; insufficient balance and prize failures roll back every row', () => {
  const { db, settle } = fixture();
  try {
    assert.throws(() => settle([chip('number:0', 6)], 0), /insufficient_balance/);
    db.exec(
      "CREATE TRIGGER fail_prize BEFORE INSERT ON ledger WHEN NEW.ref LIKE 'roulette:prize:%' BEGIN SELECT RAISE(ABORT,'fixture_prize_failure'); END",
    );
    assert.throws(() => settle([chip('number:0'), chip('split:0-1')], 0), /fixture_prize_failure/);
    assert.equal(db.prepare('SELECT COUNT(*) n FROM roulette_tickets').get().n, 0);
    assert.equal(
      db.prepare("SELECT COUNT(*) n FROM ledger WHERE ref LIKE 'roulette:%'").get().n,
      0,
    );
    assert.equal(db.prepare("SELECT balance FROM users WHERE id='r'").get().balance, 5);
  } finally {
    db.close();
  }
});
test('Concurrent identical tickets settle once; reorder replays, changed positions conflict and history stays private', async () => {
  const { db, request } = fixture(100);
  try {
    const bet = { request_id: randomUUID(), bets: [chip('number:0'), chip('split:1-2', 2)] };
    const responses = await Promise.all(Array.from({ length: 12 }, () => request(bet)));
    for (const r of responses) assert.deepEqual(r.spin, responses[0].spin);
    assert.deepEqual(
      (await request({ ...bet, bets: [...bet.bets].reverse() })).spin,
      responses[0].spin,
    );
    await assert.rejects(request({ ...bet, bets: [chip('number:1', 3)] }), (e) => e.status === 409);
    await assert.rejects(
      request({ request_id: bet.request_id, kind: 'red', stake: 1 }),
      (e) => e.status === 409,
    );
    assert.equal(db.prepare('SELECT COUNT(*) n FROM roulette_tickets').get().n, 1);
    assert.equal(
      db.prepare("SELECT COUNT(*) n FROM ledger WHERE ref LIKE 'roulette:stake:%'").get().n,
      1,
    );
    assert.equal((await request()).spins.length, 1);
    assert.equal(
      (await request(undefined, db.prepare("SELECT * FROM users WHERE id='s'").get())).spins.length,
      0,
    );
    assert.ok(!('user_id' in responses[0].spin));
    assert.equal(responses[0].balance, 100 + responses[0].spin.net);
  } finally {
    db.close();
  }
});
test('Legacy pending requests remain recoverable and cannot share identity with new tickets', async () => {
  const { db, request, settle } = fixture(100);
  try {
    const old = { request_id: randomUUID(), kind: 'red', stake: 1 };
    const first = await request(old);
    await assert.rejects(
      request({ request_id: old.request_id, bets: [chip('number:0')] }),
      (e) => e.status === 409,
    );
    assert.throws(
      () => settle([chip('number:0')], 1, { request_id: old.request_id }),
      /roulette_request_conflict/,
    );
    assert.deepEqual(await request(old), first);
    await request({ request_id: randomUUID(), bets: [chip('number:1')] });
    assert.equal((await request()).spins.length, 2);
  } finally {
    db.close();
  }
});
test('Concurrent different losing tickets cannot overdraw the wallet', async () => {
  const { db, settle } = fixture();
  try {
    const black = TABLE_BETS.find((b) => b.kind === 'black').id;
    const results = await Promise.allSettled(
      Array.from({ length: 12 }, async () => settle([chip(black)], 0)),
    );
    assert.equal(results.filter((r) => r.status === 'fulfilled').length, 5);
    assert.equal(db.prepare('SELECT count(*) n FROM roulette_tickets').get().n, 5);
    assert.equal(db.prepare("SELECT balance FROM users WHERE id='r'").get().balance, 0);
  } finally {
    db.close();
  }
});
test('Full 1000 limit settles an overlapping ticket; forged API data never inserts', async () => {
  const { db, request, settle } = fixture(1000);
  try {
    const bets = [chip('number:1', 999), chip('split:1-2')];
    settle(bets, 1);
    assert.equal(db.prepare("SELECT balance FROM users WHERE id='r'").get().balance, 999 * 36 + 18);
    await assert.rejects(
      request({ request_id: randomUUID(), bets: [{ id: 'number:1', stake: 1, result: 1 }] }),
      (e) => e.status === 400,
    );
    await assert.rejects(
      request({ request_id: randomUUID(), bets: [chip('number:1', 1000), chip('number:2')] }),
      (e) => e.status === 400,
    );
    assert.equal(db.prepare('SELECT count(*) n FROM roulette_tickets').get().n, 1);
  } finally {
    db.close();
  }
});
import { DatabaseSync } from 'node:sqlite';
import { readFileSync, readdirSync } from 'node:fs';
test('Additive migration preserves every pre-existing table row, legacy spin and balance', () => {
  const db = new DatabaseSync(':memory:');
  try {
    for (const name of readdirSync('migrations')
      .filter((f) => f.endsWith('.sql') && f !== '0024_roulette_tickets.sql')
      .sort())
      db.exec(readFileSync(`migrations/${name}`, 'utf8'));
    db.exec(
      "INSERT INTO users(id,email,name,password_hash,salt,google_sub) VALUES('migration','migration@fje.edu','Local','x','x','migration')",
    );
    db.prepare(
      "INSERT INTO roulette_spins(id,user_id,request_id,stake,kind,number,result,payout,day) VALUES('old-spin','migration',?,1,'red',NULL,1,2,'2026-10-12')",
    ).run(randomUUID());
    const names = db
      .prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
      .all()
      .map((r) => r.name);
    const before = new Map(
      names.map((name) => [name, JSON.stringify(db.prepare(`SELECT * FROM "${name}"`).all())]),
    );
    const migration = readFileSync('migrations/0024_roulette_tickets.sql', 'utf8');
    assert.doesNotMatch(
      migration,
      /SELECT\s+CASE\b/,
      'D1 requires CASE expressions inside parentheses in trigger statements',
    );
    db.exec(migration);
    for (const name of names)
      assert.equal(
        JSON.stringify(db.prepare(`SELECT * FROM "${name}"`).all()),
        before.get(name),
        name,
      );
    assert.equal(db.prepare('SELECT COUNT(*) n FROM roulette_positions').get().n, 157);
    assert.equal(db.prepare('SELECT COUNT(*) n FROM roulette_tickets').get().n, 0);
  } finally {
    db.close();
  }
});
test('Concurrent legacy and multi-position requests with one UUID return a conflict and settle exactly once', async () => {
  const { db, request } = fixture(100);
  try {
    const request_id = randomUUID();
    const responses = await Promise.allSettled([
      request({ request_id, kind: 'red', stake: 1 }),
      request({ request_id, bets: [chip('number:0')] }),
    ]);
    assert.equal(responses.filter((r) => r.status === 'fulfilled').length, 1);
    assert.equal(responses.find((r) => r.status === 'rejected').reason.status, 409);
    assert.equal(
      db
        .prepare(
          'SELECT (SELECT COUNT(*) FROM roulette_spins)+(SELECT COUNT(*) FROM roulette_tickets) n',
        )
        .get().n,
      1,
    );
    assert.equal(
      db.prepare("SELECT COUNT(*) n FROM ledger WHERE ref LIKE 'roulette:stake:%'").get().n,
      1,
    );
  } finally {
    db.close();
  }
});
