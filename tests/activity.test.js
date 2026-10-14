import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { testEnvironment } from './helpers/d1.js';
import { recordActivity, activityDashboard, cleanActivity } from '../worker/activity.js';
import { maintainData } from '../worker/maintenance.js';
import { isActivityAdmin, ACTIVITY_INTERVAL, activityDayOffset } from '../shared/activity.js';
import { createActivityReporter } from '../shared/activity-reporter.js';
import app from '../worker/index.js';
import { hash } from '../worker/utils.js';

const now = Date.parse('2026-10-14T10:00:00Z');
const owner = {
  id: 'owner',
  email: '21052.claver@fje.edu',
  google_sub: 'local-owner',
  role: 'student',
  disabled: 0,
};
function fixture(t) {
  const f = testEnvironment();
  t.after(() => f.db.close());
  f.db
    .prepare(
      "INSERT INTO users(id,email,name,password_hash,salt,google_sub) VALUES(?,?,'Persona fictícia','x','x',?)",
    )
    .run(owner.id, owner.email, owner.google_sub);
  f.env.FILES = {
    delete: async () => {
      throw new Error('Unexpected R2 operation');
    },
  };
  return f;
}
const request = (query = '', method = 'GET') =>
  new Request('https://lanet.example/api/admin/analytics' + query, { method });

test('Dashboard: Google verified owner only, independent of role; no reads on denial', async () => {
  assert.equal(isActivityAdmin(owner), true);
  assert.equal(isActivityAdmin({ ...owner, email: owner.email.toUpperCase() }), true);
  for (const user of [
    { ...owner, email: 'other@fje.edu', role: 'admin' },
    { ...owner, email: '21052.claver@fje.edu.evil.example' },
    { ...owner, google_sub: null },
    { ...owner, disabled: 1 },
  ]) {
    assert.equal(isActivityAdmin(user), false);
    await assert.rejects(activityDashboard(request(), {}, user, now), { status: 403 });
  }
  await assert.rejects(activityDashboard(request('', 'POST'), {}, owner, now), { status: 405 });
});

test('Activity: concurrent duplicate samples write nothing; unique users and aggregates atomic', async (t) => {
  const { env, db } = fixture(t);
  await recordActivity(env, owner, 'notes', 'pulse', now);
  const changes = db.prepare('SELECT total_changes() n').get().n;
  await Promise.all(
    Array.from({ length: 1000 }, () => recordActivity(env, owner, 'grades', 'pulse', now + 1000)),
  );
  assert.equal(db.prepare('SELECT total_changes() n').get().n, changes);
  assert.equal(db.prepare('SELECT users FROM activity_days').get().users, 1);
  assert.equal(db.prepare('SELECT page FROM activity_daily').get().page, 'notes');
  await recordActivity(env, owner, 'grades', 'pulse', now + ACTIVITY_INTERVAL);
  await recordActivity(env, owner, 'grades', 'action', now + ACTIVITY_INTERVAL);
  await recordActivity(env, owner, 'notes', 'error', now + ACTIVITY_INTERVAL);
  const total = db.prepare('SELECT users,pulses,actions,errors FROM activity_days').get();
  assert.deepEqual({ ...total }, { users: 1, pulses: 2, actions: 1, errors: 1 });
  const sums = db
    .prepare(
      'SELECT SUM(pulses) pulses,SUM(actions) actions,SUM(errors) errors FROM activity_areas',
    )
    .get();
  assert.deepEqual({ ...sums }, { pulses: 2, actions: 1, errors: 1 });
  assert.equal(db.prepare('SELECT COUNT(*) n FROM activity_daily').get().n, 1);
  assert.equal(db.prepare('SELECT COUNT(*) n FROM activity_areas').get().n, 2);
  await assert.rejects(recordActivity(env, owner, '/notes?email=secret', 'pulse', now), {
    status: 400,
  });
});

test('Activity: heavy repeated input remains bounded over one hour', async (t) => {
  const { env, db } = fixture(t);
  const before = db.prepare('SELECT total_changes() n').get().n;
  for (let seconds = 0; seconds < 3600; seconds++)
    await recordActivity(env, owner, 'notes', 'pulse', now + seconds * 1000);
  assert.equal(db.prepare('SELECT pulses FROM activity_days').get().pulses, 30);
  // 30 accepted samples * (one detail row + two aggregate rows); indexes billed separately by D1.
  assert.equal(db.prepare('SELECT total_changes() n').get().n - before, 90);
  assert.equal(db.prepare('SELECT COUNT(*) n FROM activity_daily').get().n, 1);
});

test('Dashboard: midnight deduplicates current users, Madrid dates handle DST, disabled excluded', async (t) => {
  const { env, db } = fixture(t);
  const midnight = Date.parse('2026-10-14T22:01:00Z');
  await recordActivity(env, owner, 'notes', 'pulse', midnight - 120000);
  await recordActivity(env, owner, 'grades', 'pulse', midnight);
  const result = await activityDashboard(request(), env, owner, midnight);
  assert.equal(result.today, '2026-10-15');
  assert.equal(result.active_total, 1);
  assert.equal(result.active.length, 1);
  assert.equal(result.active[0].page, 'grades');
  assert.equal(result.daily.length, 2);
  db.exec("UPDATE users SET disabled=1 WHERE id='owner'");
  assert.equal((await activityDashboard(request(), env, owner, midnight)).active_total, 0);
  assert.equal(activityDayOffset('2026-10-25', -1), '2026-10-24');
  assert.equal(activityDayOffset('2026-03-29', 1), '2026-03-30');
});

test('Dashboard: detail uses bounded keyset pagination and indexed activity queries', async (t) => {
  const { env, db } = fixture(t);
  for (let i = 0; i < 61; i++) {
    const id = 'u' + String(i).padStart(3, '0');
    db.prepare(
      "INSERT INTO users(id,email,name,password_hash,salt,google_sub) VALUES(?,?,'Persona fictícia','x','x',?)",
    ).run(id, id + '@example.invalid', id);
    await recordActivity(env, { id }, 'study', 'pulse', now);
  }
  const first = await activityDashboard(request('?days=7'), env, owner, now);
  assert.equal(first.people.length, 50);
  assert.equal(first.active.length, 50);
  assert.equal(first.active_total, 61);
  const second = await activityDashboard(request('?after=' + first.next), env, owner, now);
  assert.equal(second.people.length, 11);
  assert.equal(second.next, null);
  assert.equal(new Set([...first.people, ...second.people].map((row) => row.user_id)).size, 61);
  assert.ok(!JSON.stringify(first).includes('password_hash'));
  assert.ok(!JSON.stringify(first).includes('google_sub'));
  for (const query of ['?days=999999', '?day=2026-02-30', '?day=2025-01-01', '?day=2026-10-15'])
    await assert.rejects(activityDashboard(request(query), env, owner, now), { status: 400 });
  const plan = db
    .prepare(
      'EXPLAIN QUERY PLAN SELECT * FROM activity_daily WHERE last_seen>=? ORDER BY last_seen DESC LIMIT 50',
    )
    .all(now);
  assert.match(JSON.stringify(plan), /USING INDEX activity_recent/);
  const detail = db
    .prepare(
      'EXPLAIN QUERY PLAN SELECT * FROM activity_daily WHERE day=? AND user_id>? ORDER BY user_id LIMIT 51',
    )
    .all('2026-10-14', '');
  assert.match(JSON.stringify(detail), /USING PRIMARY KEY/);
});

test('Retention: detail expires without losing daily totals; aggregates and expired credentials bounded', async (t) => {
  const { env, db } = fixture(t);
  const old = now - 35 * 86400000,
    boundary = now - 34 * 86400000;
  await recordActivity(env, owner, 'notes', 'pulse', old);
  await recordActivity(env, owner, 'study', 'pulse', boundary);
  await recordActivity(env, owner, 'study', 'pulse', now - 400 * 86400000);
  db.prepare(
    "INSERT INTO sessions(hash,user_id,expires) VALUES('expired','owner',?),('valid','owner',?)",
  ).run(now - 1, now + 1);
  db.prepare(
    `INSERT INTO google_auth_flows(state_hash,binding_hash,nonce,verifier,redirect_uri,expires)
    VALUES('expired-flow','binding','nonce','verifier','https://lanet.example/callback',?),
    ('valid-flow','binding','nonce','verifier','https://lanet.example/callback',?)`,
  ).run(now - 1, now + 1);
  await cleanActivity(env, now);
  assert.equal(db.prepare('SELECT COUNT(*) n FROM activity_daily').get().n, 1);
  assert.equal(db.prepare('SELECT COUNT(*) n FROM activity_days').get().n, 2);
  assert.equal(db.prepare('SELECT SUM(users) n FROM activity_days').get().n, 2);
  assert.equal(db.prepare('SELECT hash FROM sessions').get().hash, 'valid');
  assert.equal(
    db.prepare('SELECT state_hash FROM google_auth_flows').get().state_hash,
    'valid-flow',
  );
  assert.equal(db.prepare('PRAGMA foreign_key_check').all().length, 0);
});

test('Inventory: real mutations maintain counts and bytes without R2 scans', (t) => {
  const { db } = fixture(t);
  const inventory = () => ({
    ...db.prepare('SELECT users,enabled,files,file_bytes FROM activity_inventory').get(),
  });
  assert.deepEqual(inventory(), { users: 1, enabled: 1, files: 0, file_bytes: 0 });
  db.exec(
    "INSERT INTO files(id,owner_id,name,mime,size,object_key) VALUES('f','owner','f.pdf','application/pdf',100,'local/f'); UPDATE users SET disabled=1 WHERE id='owner'",
  );
  assert.deepEqual(inventory(), { users: 1, enabled: 0, files: 1, file_bytes: 100 });
  db.exec("UPDATE files SET size=150 WHERE id='f'");
  assert.equal(inventory().file_bytes, 150);
  db.exec("DELETE FROM files WHERE id='f'");
  assert.equal(inventory().files, 0);
  assert.equal(inventory().file_bytes, 0);
});

test('Maintenance: competing requests share a durable lease and do not repeat scans', async (t) => {
  const { db, env } = fixture(t);
  await maintainData(env, now);
  const changes = db.prepare('SELECT total_changes() n').get().n;
  await Promise.all(Array.from({ length: 100 }, () => maintainData(env, now + 1000)));
  assert.equal(db.prepare('SELECT total_changes() n').get().n, changes);
  await maintainData(env, now + 60000);
  assert.ok(db.prepare('SELECT total_changes() n').get().n > changes);
});

test('Reporter: throttles, ignores hidden/idle pages and bounds network retries', async () => {
  let time = now,
    visible = true,
    calls = 0,
    area = 'notes';
  const reporter = createActivityReporter({
    now: () => time,
    visible: () => visible,
    page: () => area,
    send: async (body) => {
      assert.deepEqual(body, { page: area });
      calls++;
      throw new Error('offline');
    },
  });
  await reporter.tick();
  await reporter.tick();
  assert.equal(calls, 1);
  time += ACTIVITY_INTERVAL;
  visible = false;
  await reporter.tick();
  assert.equal(calls, 1);
  visible = true;
  await reporter.tick();
  assert.equal(calls, 2);
  time += 300000;
  await reporter.tick();
  assert.equal(calls, 2);
  reporter.interact();
  await reporter.tick();
  assert.equal(calls, 3);
  time += ACTIVITY_INTERVAL;
  area = 'private?text=sensitive';
  reporter.interact();
  await reporter.tick();
  assert.equal(calls, 3);
  reporter.stop();
  area = 'notes';
  await reporter.tick();
  assert.equal(calls, 3);
});

test('Maintenance: dashboard exposes last completed pass and failures preserve the previous status', async (t) => {
  const { db, env } = fixture(t);
  await maintainData(env, now);
  assert.equal((await activityDashboard(request(), env, owner, now)).maintenance.last_success, now);
  const original = env.DB.batch;
  env.DB.batch = async () => {
    throw new Error('Local cleanup unavailable');
  };
  await assert.rejects(maintainData(env, now + 60000), /Local cleanup unavailable/);
  env.DB.batch = original;
  assert.equal(
    (await activityDashboard(request(), env, owner, now + 60000)).maintenance.last_success,
    now,
  );
  await maintainData(env, now + 120000);
  const status = JSON.parse(
    db.prepare("SELECT value FROM settings WHERE key='data_maintenance_status'").get().value,
  );
  assert.equal(status.last_success, now + 120000);
  assert.equal(status.pending_files, 0);
});

test('Migration: additive, retains existing user/file data and backfills inventory only', (t) => {
  const { db } = testEnvironment({ through: '0027_subject_workspaces.sql' });
  t.after(() => db.close());
  db.exec(
    "INSERT INTO users(id,email,name,password_hash,salt) VALUES('local','local@example.invalid','Local','x','x'); INSERT INTO files(id,owner_id,name,mime,size,object_key) VALUES('local','local','f','application/pdf',80,'local/f')",
  );
  const users = db.prepare('SELECT * FROM users').all(),
    files = db.prepare('SELECT * FROM files').all();
  db.exec(readFileSync('migrations/0029_activity_dashboard.sql', 'utf8'));
  assert.deepEqual(db.prepare('SELECT * FROM users').all(), users);
  assert.deepEqual(db.prepare('SELECT * FROM files').all(), files);
  assert.equal(db.prepare('SELECT COUNT(*) n FROM activity_daily').get().n, 0);
  assert.equal(db.prepare('SELECT file_bytes FROM activity_inventory').get().file_bytes, 80);
  assert.equal(db.prepare('PRAGMA integrity_check').get().integrity_check, 'ok');
});

test('API: owner access, authentication, CSRF and strict heartbeat input are enforced', async (t) => {
  const { env, db } = fixture(t);
  const token = 'only-local-activity-test';
  db.prepare(
    "INSERT INTO sessions(hash,user_id,expires,auth_provider) VALUES(?,'owner',?,'google')",
  ).run(await hash(token), Date.now() + 3600000);
  const call = (
    path,
    method = 'GET',
    body,
    origin = 'https://lanet.example',
    authenticated = true,
  ) =>
    app.fetch(
      new Request('https://lanet.example/api' + path, {
        method,
        headers: {
          Origin: origin,
          ...(authenticated ? { Cookie: 'lanet_session=' + token } : {}),
          'Content-Type': 'application/json',
        },
        ...(body ? { body: JSON.stringify(body) } : {}),
      }),
      env,
      {},
    );
  assert.equal((await call('/admin/analytics', 'GET', undefined, undefined, false)).status, 401);
  const allowed = await call('/admin/analytics');
  assert.equal(allowed.status, 200);
  assert.equal(allowed.headers.get('Cache-Control'), 'no-store');
  assert.equal(
    (await call('/activity', 'POST', { page: 'notes', email: 'sensitive@example.invalid' })).status,
    400,
  );
  assert.equal(
    (await call('/activity', 'POST', { page: 'notes' }, 'https://evil.example')).status,
    403,
  );
  assert.equal(db.prepare('SELECT COUNT(*) n FROM activity_daily').get().n, 0);
  assert.equal((await call('/activity', 'POST', { page: 'notes' })).status, 200);
  assert.equal((await call('/activity', 'POST', { page: 'grades' })).status, 200);
  assert.equal(db.prepare('SELECT pulses FROM activity_daily').get().pulses, 1);
  db.exec("UPDATE users SET email='other@example.invalid',role='admin' WHERE id='owner'");
  assert.equal((await call('/admin/analytics')).status, 403);
  db.exec("UPDATE users SET email='21052.claver@fje.edu',disabled=1 WHERE id='owner'");
  assert.equal((await call('/admin/analytics')).status, 401);
});

test('API: telemetry outages do not fail committed preferences or duplicate their operation', async (t) => {
  const { env, db } = fixture(t);
  db.prepare(
    "INSERT INTO sessions(hash,user_id,expires,auth_provider) VALUES(?,'owner',?,'google')",
  ).run(await hash('local-failure'), Date.now() + 3600000);
  const original = env.DB.prepare;
  env.DB.prepare = (query) => {
    if (query.startsWith('INSERT INTO activity_daily')) throw new Error('Local telemetry outage');
    return original(query);
  };
  const response = await app.fetch(
    new Request('https://lanet.example/api/preferences', {
      method: 'POST',
      headers: {
        Origin: 'https://lanet.example',
        Cookie: 'lanet_session=local-failure',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ hideGrades: true }),
    }),
    env,
    {},
  );
  assert.equal(response.status, 200);
  assert.equal(
    JSON.parse(db.prepare("SELECT value FROM user_preferences WHERE user_id='owner'").get().value)
      .hideGrades,
    true,
  );
});

test('Retention: each cleanup removes at most 1000 detail rows and resumes without aggregate loss', async (t) => {
  const { env, db } = fixture(t);
  for (let i = 0; i < 1001; i++) {
    const id = 'expired-' + i;
    db.prepare(
      "INSERT INTO users(id,email,name,password_hash,salt) VALUES(?,?,'Local','x','x')",
    ).run(id, id + '@example.invalid');
    await recordActivity(env, { id }, 'notes', 'pulse', now - 35 * 86400000);
  }
  await cleanActivity(env, now);
  assert.equal(db.prepare('SELECT COUNT(*) n FROM activity_daily').get().n, 1);
  assert.equal(db.prepare('SELECT users FROM activity_days').get().users, 1001);
  await cleanActivity(env, now);
  assert.equal(db.prepare('SELECT COUNT(*) n FROM activity_daily').get().n, 0);
  assert.equal(db.prepare('SELECT users FROM activity_days').get().users, 1001);
});
