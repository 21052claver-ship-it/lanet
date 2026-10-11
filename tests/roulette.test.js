import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import {
  WHEEL,
  rouletteColor,
  roulettePayout,
  validateBet,
  drawRoulette,
  wheelRotation,
} from '../shared/roulette.js';
import { rouletteRoute } from '../worker/roulette.js';
import { testEnvironment } from './helpers/d1.js';

function fixture() {
  const { db, env } = testEnvironment();
  db.exec(
    "INSERT INTO users(id,email,name,password_hash,salt,google_sub) VALUES('roulette','roulette@fje.edu','Local','x','x','roulette'),('other','roulette-other@fje.edu','Altre','x','x','other');",
  );
  const user = db.prepare("SELECT * FROM users WHERE id='roulette'").get();
  const request = async (value, owner = user) => {
    const r = await rouletteRoute(
      new Request('https://lanet.example/api/roulette', {
        method: value ? 'POST' : 'GET',
        headers: { 'Content-Type': 'application/json' },
        ...(value ? { body: JSON.stringify(value) } : {}),
      }),
      env,
      owner,
    );
    return r.json();
  };
  const insert = db.prepare(
    'INSERT INTO roulette_spins(id,user_id,request_id,stake,kind,number,result,payout,day) VALUES(?,?,?,?,?,?,?,?,?)',
  );
  const settle = (bet, result, payout = roulettePayout(bet, result)) =>
    insert.run(
      randomUUID(),
      user.id,
      bet.request_id || randomUUID(),
      bet.stake,
      bet.kind,
      bet.number ?? null,
      result,
      payout,
      '2026-10-11',
    );
  return { db, env, user, request, settle };
}
test('European wheel has exactly 37 unique pockets, 18 red, 18 black and one zero', () => {
  assert.equal(new Set(WHEEL).size, 37);
  assert.deepEqual(
    [...WHEEL].sort((a, b) => a - b),
    Array.from({ length: 37 }, (_, i) => i),
  );
  assert.equal(WHEEL.filter((n) => rouletteColor(n) === 'red').length, 18);
  assert.equal(WHEEL.filter((n) => rouletteColor(n) === 'black').length, 18);
  assert.equal(rouletteColor(0), 'green');
});
test('All 1,443 combinations pay correctly, including zero and stake return', () => {
  for (let result = 0; result <= 36; result++) {
    for (const kind of ['red', 'black'])
      assert.equal(
        roulettePayout({ kind, stake: 3 }, result),
        rouletteColor(result) === kind ? 6 : 0,
      );
    for (let number = 0; number <= 36; number++)
      assert.equal(
        roulettePayout({ kind: 'number', number, stake: 3 }, result),
        number === result ? 108 : 0,
      );
  }
});
test('SQL settlement agrees with every payout and ledger balance', () => {
  const { db, settle } = fixture();
  try {
    db.exec(
      "INSERT INTO ledger(id,user_id,amount,reason,ref,day) VALUES('bank','roulette',10000,'Local fixture','bank','2026-10-11')",
    );
    for (let result = 0; result <= 36; result++)
      for (const bet of [
        { kind: 'red', stake: 1 },
        { kind: 'black', stake: 1 },
        ...Array.from({ length: 37 }, (_, number) => ({ kind: 'number', number, stake: 1 })),
      ])
        settle(bet, result);
    assert.equal(db.prepare('SELECT COUNT(*) n FROM roulette_spins').get().n, 1443);
    assert.equal(
      db.prepare("SELECT balance FROM users WHERE id='roulette'").get().balance,
      db.prepare("SELECT SUM(amount) total FROM ledger WHERE user_id='roulette'").get().total,
    );
    assert.throws(() => settle({ kind: 'red', stake: 1 }, 0, 2), /CHECK/);
    assert.throws(() => settle({ kind: 'number', number: 0, stake: 1 }, 0, 1), /CHECK/);
  } finally {
    db.close();
  }
});
test('Cryptographic rejection sampling retries values with modulo bias', () => {
  const sequence = [4294967295, Math.floor(4294967296 / 37) * 37, 36];
  let calls = 0;
  const result = drawRoulette({
    getRandomValues(v) {
      v[0] = sequence[calls++];
      return v;
    },
  });
  assert.equal(result, 36);
  assert.equal(calls, 3);
  for (let n = 0; n < 37; n++)
    assert.equal(
      drawRoulette({
        getRandomValues(v) {
          v[0] = n;
          return v;
        },
      }),
      n,
    );
});
test('Wheel always stops with the server pocket exactly under the ball', () => {
  let angle = 0;
  for (const n of [...WHEEL, ...WHEEL].reverse()) {
    const next = wheelRotation(angle, n);
    assert.ok(next - angle >= 2160);
    const offset = (next + (WHEEL.indexOf(n) * 360) / 37) % 360;
    assert.ok(offset < 1e-8 || 360 - offset < 1e-8);
    angle = next;
  }
});
test('Bet validation rejects fractions, coercion, forged outcome and malformed identities', () => {
  const valid = { request_id: randomUUID(), kind: 'number', number: 0, stake: 1 };
  assert.equal(validateBet(valid).number, 0);
  for (const patch of [
    { stake: 0 },
    { stake: -1 },
    { stake: 1.5 },
    { stake: 1001 },
    { stake: '1' },
    { stake: true },
    { kind: 'green' },
    { number: 37 },
    { number: -1 },
    { number: '1' },
    { number: null },
    { request_id: 'x' },
    { result: 0 },
    { payout: 36000 },
    { user_id: 'other' },
  ])
    assert.throws(() => validateBet({ ...valid, ...patch }));
  assert.throws(() => validateBet({ ...valid, kind: 'red', number: 1 }));
});
test('Insufficient funds and an interrupted prize roll back the entire spin', () => {
  const { db, settle } = fixture();
  try {
    assert.throws(() => settle({ stake: 6, kind: 'number', number: 0 }, 0), /insufficient_balance/);
    assert.equal(db.prepare('SELECT COUNT(*) n FROM roulette_spins').get().n, 0);
    db.exec(
      "CREATE TRIGGER fail_prize BEFORE INSERT ON ledger WHEN NEW.ref LIKE 'roulette:prize:%' BEGIN SELECT RAISE(ABORT,'fixture_prize_failure'); END",
    );
    assert.throws(() => settle({ stake: 5, kind: 'red' }, 1), /fixture_prize_failure/);
    assert.equal(db.prepare("SELECT balance FROM users WHERE id='roulette'").get().balance, 5);
    assert.equal(db.prepare('SELECT COUNT(*) n FROM roulette_spins').get().n, 0);
    assert.equal(
      db.prepare("SELECT COUNT(*) n FROM ledger WHERE ref LIKE 'roulette:%'").get().n,
      0,
    );
  } finally {
    db.close();
  }
});
test('API idempotency recovers original result, rejects changed bets and keeps history private', async () => {
  const { db, request } = fixture();
  try {
    const bet = { request_id: randomUUID(), kind: 'black', number: null, stake: 1 };
    const first = await request(bet),
      again = await request(bet);
    assert.deepEqual(first, again);
    assert.equal(first.spin.payout, roulettePayout(bet, first.spin.result));
    assert.equal(first.balance, 5 + first.spin.net);
    await assert.rejects(request({ ...bet, stake: 2 }), (e) => e.status === 409);
    assert.equal((await request()).spins.length, 1);
    assert.equal(
      (await request(undefined, db.prepare("SELECT * FROM users WHERE id='other'").get())).spins
        .length,
      0,
    );
    assert.ok(!('user_id' in first.spin));
    assert.equal(db.prepare('SELECT COUNT(*) n FROM roulette_spins').get().n, 1);
  } finally {
    db.close();
  }
});
test('Twelve concurrent copies settle once, and a later replay does not spend again', async () => {
  const { db, request } = fixture();
  try {
    const bet = { request_id: randomUUID(), kind: 'red', number: null, stake: 5 };
    const values = await Promise.all(Array.from({ length: 12 }, () => request(bet)));
    for (const value of values) assert.deepEqual(value.spin, values[0].spin);
    assert.equal(db.prepare('SELECT COUNT(*) n FROM roulette_spins').get().n, 1);
    assert.equal(
      db.prepare("SELECT COUNT(*) n FROM ledger WHERE ref LIKE 'roulette:stake:%'").get().n,
      1,
    );
    assert.deepEqual((await request(bet)).spin, values[0].spin);
    assert.equal(
      db.prepare("SELECT balance FROM users WHERE id='roulette'").get().balance,
      5 + values[0].spin.net,
    );
  } finally {
    db.close();
  }
});
test('Concurrent losses never overdraw and no winning bet can finance its own stake', async () => {
  const { db, settle } = fixture();
  try {
    const attempts = await Promise.allSettled(
      Array.from({ length: 12 }, async () => settle({ kind: 'black', stake: 1 }, 0)),
    );
    assert.equal(attempts.filter((v) => v.status === 'fulfilled').length, 5);
    assert.equal(db.prepare("SELECT balance FROM users WHERE id='roulette'").get().balance, 0);
    assert.throws(() => settle({ kind: 'number', number: 0, stake: 1 }, 0), /insufficient_balance/);
  } finally {
    db.close();
  }
});
