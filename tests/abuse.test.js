import test from 'node:test';
import assert from 'node:assert/strict';
import app from '../worker/index.js';
import { testEnvironment } from './helpers/d1.js';
import { body, hash, limit, HttpError } from '../worker/utils.js';
import {
  accountGuard,
  cleanAbuseState,
  recordAbuse,
  reservePublication,
  releasePublication,
} from '../worker/abuse.js';

const request = (path = '/api/preferences', value = {}, ip = '192.0.2.1') =>
  new Request(`https://lanet.example${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'CF-Connecting-IP': ip },
    body: JSON.stringify(value),
  });
async function fixture() {
  const { db, env } = testEnvironment();
  for (const uid of ['a', 'b']) {
    db.prepare(
      "INSERT INTO users(id,email,name,password_hash,salt,google_sub,configured) VALUES(?,?,?,'x','x',?,1)",
    ).run(uid, `${uid}@fje.edu`, uid, uid);
    db.prepare(
      "INSERT INTO sessions(hash,user_id,expires,auth_provider) VALUES(?,?,?,'google')",
    ).run(await hash(uid), uid, Date.now() + 86400000);
  }
  const call = async (path, value, { uid = 'a', ip = '192.0.2.1' } = {}) =>
    app.fetch(
      new Request(`https://lanet.example${path}`, {
        method: value === undefined ? 'GET' : 'POST',
        headers: {
          Cookie: `lanet_session=${uid}`,
          'Content-Type': 'application/json',
          'CF-Connecting-IP': ip,
        },
        ...(value === undefined ? {} : { body: JSON.stringify(value) }),
      }),
      env,
      { waitUntil: (promise) => promise.catch(() => {}) },
    );
  return { db, env, call };
}

test('atomic account limits survive concurrent requests and IP rotation, without sharing campus budgets', async () => {
  const { db, env } = testEnvironment();
  const outcomes = await Promise.allSettled(
    Array.from({ length: 40 }, (_, i) =>
      limit(env, request(undefined, {}, `192.0.2.${i}`), 'test:a', 7, 60, true),
    ),
  );
  assert.equal(outcomes.filter((o) => o.status === 'fulfilled').length, 7);
  for (const outcome of outcomes.filter((o) => o.status === 'rejected')) {
    assert.equal(outcome.reason.status, 429);
    assert.ok(outcome.reason.retryAfter > 0);
  }
  await limit(env, request(), 'test:b', 7, 60, true);
  assert.equal(db.prepare('SELECT COUNT(*) n FROM rate_limits').get().n, 2);
});

test('relative windows cannot be reset at the clock-minute boundary and renew after expiry', async (t) => {
  t.mock.method(Date, 'now', () => 59000);
  const { env } = testEnvironment();
  await limit(env, request(), 'rolling', 1, 60, true);
  Date.now.mock.mockImplementation(() => 60000);
  await assert.rejects(limit(env, request(), 'rolling', 1, 60, true), (e) => e.retryAfter === 59);
  Date.now.mock.mockImplementation(() => 119000);
  await limit(env, request(), 'rolling', 1, 60, true);
});

test('publications have account quotas, Retry-After and no writes past the limit', async () => {
  const { db, call } = await fixture();
  for (let i = 0; i < 10; i++)
    assert.equal(
      (
        await call(
          '/api/proposals',
          { title: `Idea ${i}`, body: 'Un canvi per al pati.' },
          { ip: `192.0.2.${i}` },
        )
      ).status,
      200,
    );
  const blocked = await call(
    '/api/proposals',
    { title: 'Una altra', body: 'Prova de límit.' },
    { ip: '203.0.113.42' },
  );
  assert.equal(blocked.status, 429);
  assert.ok(Number(blocked.headers.get('Retry-After')) > 0);
  assert.equal((await blocked.json()).code, 'rate_limited');
  assert.equal(db.prepare('SELECT COUNT(*) n FROM proposals').get().n, 10);
  assert.equal(
    (await call('/api/proposals', { title: 'Una altra', body: 'Prova de límit.' }, { uid: 'b' }))
      .status,
    200,
  );
});

test('simultaneous duplicate submissions create one row; key order and whitespace cannot bypass detection', async () => {
  const { db, call } = await fixture();
  const responses = await Promise.all(
    Array.from({ length: 6 }, (_, i) =>
      call(
        '/api/proposals',
        i % 2
          ? { body: 'Proposta   per al pati.', title: '  Una idea  ' }
          : { title: 'Una idea', body: 'Proposta per al pati.' },
      ),
    ),
  );
  assert.equal(responses.filter((r) => r.status === 200).length, 1);
  assert.equal(responses.filter((r) => r.status === 409).length, 5);
  assert.equal(db.prepare('SELECT COUNT(*) n FROM proposals').get().n, 1);
  assert.equal(
    (
      await call(
        '/api/proposals',
        { title: 'Una idea', body: 'Proposta per al pati.' },
        { uid: 'b' },
      )
    ).status,
    200,
  );
});

test('failed validation releases its duplicate reservation and does not punish ordinary corrections', async () => {
  const { env, call } = await fixture();
  for (let i = 0; i < 4; i++)
    assert.equal(
      (await call('/api/proposals', { title: '', body: 'Proposta incompleta.' })).status,
      400,
    );
  assert.equal(
    (await call('/api/proposals', { title: 'Ara sí', body: 'Proposta incompleta.' })).status,
    200,
  );
  await accountGuard(request(), env, { id: 'a' });
});

test('repeated permission attacks pause actions, preserve balances and still permit reads/logout', async () => {
  const { db, call } = await fixture();
  for (let i = 0; i < 8; i++)
    assert.equal((await call('/api/admin/users', { id: 'b', disabled: true })).status, 403);
  const before = db
    .prepare("SELECT expires FROM rate_limits WHERE key LIKE 'abuse:block:%'")
    .get().expires;
  for (let i = 0; i < 3; i++) {
    const blocked = await call('/api/profile', { preferences: {} });
    assert.equal(blocked.status, 429);
    assert.equal((await blocked.json()).code, 'abuse_blocked');
  }
  assert.equal(
    db.prepare("SELECT expires FROM rate_limits WHERE key LIKE 'abuse:block:%'").get().expires,
    before,
  );
  assert.equal((await call('/api/roulette')).status, 200);
  assert.equal(db.prepare("SELECT disabled FROM users WHERE id='b'").get().disabled, 0);
  assert.equal(db.prepare("SELECT balance FROM users WHERE id='a'").get().balance, 5);
  assert.equal((await call('/api/auth/logout', {})).status, 200);
});

test('progressive pauses are atomic, expire, and forget past strikes after a day', async (t) => {
  let now = 2000000000000;
  t.mock.method(Date, 'now', () => now);
  const { db, env } = testEnvironment();
  const user = { id: 'a' },
    error = new HttpError(403, 'Forbidden');
  for (const duration of [60, 300, 900]) {
    await Promise.all(Array.from({ length: 16 }, () => recordAbuse(env, user, error)));
    const block = db
      .prepare("SELECT count,expires FROM rate_limits WHERE key LIKE 'abuse:block:%'")
      .get();
    assert.equal(block.expires - Math.floor(now / 1000), duration);
    await assert.rejects(accountGuard(request(), env, user), (e) => e.code === 'abuse_blocked');
    now += (duration + 61) * 1000;
    await accountGuard(request(), env, user);
  }
  now += 86401000;
  await Promise.all(Array.from({ length: 8 }, () => recordAbuse(env, user, error)));
  const block = db
    .prepare("SELECT count,expires FROM rate_limits WHERE key LIKE 'abuse:block:%'")
    .get();
  assert.equal(block.count, 1);
  assert.equal(block.expires - Math.floor(now / 1000), 60);
});

test('duplicate reservations renew after expiry, and stale cleanup cannot remove a newer reservation', async (t) => {
  let now = 2000000000000;
  t.mock.method(Date, 'now', () => now);
  const { env } = testEnvironment(),
    user = { id: 'a' };
  const old = await reservePublication(request('/api/proposals', { title: 'Idea' }), env, user);
  now += 601000;
  const current = await reservePublication(request('/api/proposals', { title: 'Idea' }), env, user);
  await releasePublication(env, old);
  await assert.rejects(
    reservePublication(request('/api/proposals', { title: 'Idea' }), env, user),
    (e) => e.code === 'duplicate_content',
  );
  await releasePublication(env, current);
  await reservePublication(request('/api/proposals', { title: 'Idea' }), env, user);
});

test('housekeeping removes expired budgets while retaining recent strike history and no raw identifiers', async (t) => {
  const now = 2000000000;
  t.mock.method(Date, 'now', () => now * 1000);
  const { db, env } = testEnvironment();
  db.prepare('INSERT INTO rate_limits VALUES(?,1,?)').run('old-rate', now - 1);
  db.prepare('INSERT INTO rate_limits VALUES(?,2,?)').run('abuse:block:recent', now - 100);
  db.prepare('INSERT INTO rate_limits VALUES(?,3,?)').run('abuse:block:old', now - 86401);
  await limit(env, request(), 'user-private:example@fje.edu', 10, 60, true);
  await cleanAbuseState(env);
  const keys = db
    .prepare('SELECT key FROM rate_limits')
    .all()
    .map((r) => r.key);
  assert.ok(keys.includes('abuse:block:recent'));
  assert.ok(!keys.includes('old-rate'));
  assert.ok(!keys.includes('abuse:block:old'));
  assert.ok(keys.every((k) => !k.includes('example@') && !k.includes('192.0.2.1')));
});

test('complex JSON and prototype keys are rejected, ordinary text remains valid and body reads are cached', async () => {
  for (const value of [
    '{"__proto__":{"admin":true}}',
    '{"constructor":{}}',
    JSON.stringify({ x: Array.from({ length: 10001 }, () => 0) }),
  ]) {
    await assert.rejects(
      body(new Request('https://lanet.example/api/profile', { method: 'POST', body: value })),
      (e) => e.status === 400,
    );
  }
  let value = {};
  for (let i = 0; i < 22; i++) value = { x: value };
  await assert.rejects(body(request('/api/profile', value)), (e) => e.status === 400);
  const r = request('/api/proposals', {
    title: 'JavaScript i constructor',
    body: 'Apunts sobre __proto__: text, no instruccions.',
  });
  assert.strictEqual(await body(r), await body(r));
});

test('ignored random fields cannot bypass duplicate prevention or create extra rows', async () => {
  const { db, call } = await fixture();
  const value = { title: 'Una proposta real', body: 'Millorar el pati.' };
  assert.equal((await call('/api/proposals', value)).status, 200);
  for (let i = 0; i < 4; i++) {
    const response = await call('/api/proposals', { ...value, nonce: crypto.randomUUID() });
    assert.equal(response.status, 409);
    assert.equal((await response.json()).code, 'duplicate_content');
  }
  assert.equal(db.prepare("SELECT COUNT(*) n FROM proposals WHERE author_id='a'").get().n, 1);
  const { env } = testEnvironment();
  await reservePublication(request('/api/notes', { title: 'Foto', files: ['file-id'] }), env, {
    id: 'a',
  });
  await assert.rejects(
    reservePublication(
      request('/api/notes', {
        title: 'Foto',
        files: [{ id: 'file-id', name: crypto.randomUUID() }],
      }),
      env,
      { id: 'a' },
    ),
    (e) => e.code === 'duplicate_content',
  );
});

test('normal rapid preference and grade autosaves with refresh remain possible', async (t) => {
  let now = Date.now();
  t.mock.method(Date, 'now', () => now);
  const { call } = await fixture();
  for (let i = 0; i < 45; i++) {
    now += 1000;
    assert.equal((await call('/api/preferences', { hideGrades: i % 2 === 0 })).status, 200);
    assert.equal((await call('/api/grades/batch', { entries: [] })).status, 200);
    assert.equal((await call('/api/bootstrap')).status, 200);
  }
});
