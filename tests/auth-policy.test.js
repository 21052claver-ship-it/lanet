import test from 'node:test';
import assert from 'node:assert/strict';
import { testEnvironment } from './helpers/d1.js';
import worker from '../worker/index.js';
import { authenticate, session } from '../worker/auth.js';
import { hash } from '../worker/utils.js';

const base = 'https://lanet.example';
const request = (path, data, cookie = '') =>
  new Request(base + '/api' + path, {
    method: data === undefined ? 'GET' : 'POST',
    headers: { Origin: base, Cookie: cookie, 'Content-Type': 'application/json' },
    body: data === undefined ? undefined : JSON.stringify(data),
  });
async function fixture() {
  const f = testEnvironment();
  f.db.exec(
    "INSERT INTO users(id,email,name,password_hash,salt,role,google_sub,given_name,family_name,avatar_url,password_enabled) VALUES('google','google@fje.edu','Nom Google','old-digest','salt','admin','stable-sub','Nom','Google','https://lh3.googleusercontent.com/a/test',0)",
  );
  f.user = () => f.db.prepare("SELECT * FROM users WHERE id='google'").get();
  f.cookie = (await session(f.user(), request('/auth/me'), f.env)).headers
    .get('Set-Cookie')
    .split(';')[0];
  f.fetch = (path, data, cookie = f.cookie) => worker.fetch(request(path, data, cookie), f.env);
  return f;
}

test('Google únic: cap flag de demo ni convidat reactiva les vies antigues', async () => {
  const f = await fixture();
  try {
    f.env.DEMO_MODE = 'true';
    f.env.GUEST_ACCESS = 'true';
    for (const route of ['login', 'register', 'guest', 'reset', 'bootstrap', 'password']) {
      for (const cookie of ['', f.cookie]) {
        const r = await f.fetch(
          `/auth/${route}`,
          { email: f.user().email, password: 'old-password', name: 'Other' },
          cookie,
        );
        assert.equal(r.status, 403, route);
        assert.equal(r.headers.has('Set-Cookie'), false);
      }
    }
    const status = await (await f.fetch('/auth/status')).json();
    assert.equal(status.auth_method, 'google');
    assert.equal(status.guest, false);
    assert.equal(status.demo, false);
    assert.equal(f.db.prepare('SELECT COUNT(*) AS n FROM users').get().n, 1);
    assert.equal(f.db.prepare('SELECT COUNT(*) AS n FROM sessions').get().n, 1);
  } finally {
    f.db.close();
  }
});

test('Google únic: sessions antigues o sense identitat Google no accedeixen a cap dada', async () => {
  const f = await fixture();
  try {
    const token = crypto.randomUUID();
    f.db
      .prepare('INSERT INTO sessions(hash,user_id,expires) VALUES(?,?,?)')
      .run(await hash(token), 'google', Date.now() + 3600000);
    const legacy = `lanet_session=${token}`;
    assert.equal((await f.fetch('/bootstrap', undefined, legacy)).status, 401);
    assert.equal((await f.fetch('/auth/me', undefined, legacy)).status, 401);
    assert.equal(
      (await (await f.fetch('/auth/status', undefined, legacy)).json()).authenticated,
      false,
    );
    f.db.exec("UPDATE users SET google_sub=NULL WHERE id='google'");
    assert.equal((await f.fetch('/bootstrap')).status, 401);
    await assert.rejects(session(f.user(), request('/auth/me'), f.env), { status: 401 });
    f.db.exec("UPDATE users SET google_sub='stable-sub',disabled=1 WHERE id='google'");
    await assert.rejects(authenticate(request('/auth/me', undefined, f.cookie), f.env), {
      status: 401,
    });
  } finally {
    f.db.close();
  }
});

test('Identitat Google: API rebutja cada camp protegit de forma atomica i conserva preferencies', async () => {
  const f = await fixture();
  try {
    f.db.exec(
      'INSERT INTO user_preferences(user_id,value) VALUES(\'google\',\'{"hideGrades":true,"volume":0.2}\')',
    );
    const before = { ...f.user() };
    for (const field of [
      'name',
      'given_name',
      'family_name',
      'email',
      'avatar_url',
      'google_sub',
      'password_enabled',
    ]) {
      const r = await f.fetch('/profile', {
        [field]: 'Modified',
        preferences: { hideGrades: false, volume: 0.8 },
      });
      assert.equal(r.status, 403, field);
      assert.deepEqual({ ...f.user() }, before);
      assert.equal(
        JSON.parse(
          f.db.prepare("SELECT value FROM user_preferences WHERE user_id='google'").get().value,
        ).hideGrades,
        true,
      );
    }
    assert.equal((await f.fetch('/profile', { preferences: { volume: 0.4 } })).status, 200);
    assert.equal((await f.fetch('/preferences', { hideGrades: false })).status, 200);
    const prefs = JSON.parse(
      f.db.prepare("SELECT value FROM user_preferences WHERE user_id='google'").get().value,
    );
    assert.equal(prefs.volume, 0.4);
    assert.equal(prefs.hideGrades, false);
    const publicUser = (await (await f.fetch('/auth/me')).json()).user;
    assert.equal(publicUser.identity_locked, true);
    assert.equal(publicUser.has_password, false);
    for (const key of ['google_sub', 'password_enabled', 'password_hash', 'salt'])
      assert.equal(publicUser[key], undefined);
  } finally {
    f.db.close();
  }
});

test('Google únic: administrador tampoc pot crear invitacions ni recuperar contrasenyes', async () => {
  const f = await fixture();
  try {
    for (const path of ['/admin/invitations', '/admin/recovery'])
      assert.equal((await f.fetch(path, { user_id: 'google', label: 'old' })).status, 403);
    assert.equal(f.db.prepare('SELECT COUNT(*) AS n FROM invitations').get().n, 0);
    assert.equal(f.db.prepare('SELECT COUNT(*) AS n FROM recovery_tokens').get().n, 0);
    assert.equal((await (await f.fetch('/admin')).json()).invitations, undefined);
  } finally {
    f.db.close();
  }
});

test('Google únic: sortir neteja cookies caducades o antigues i revoca la sessio', async () => {
  const f = await fixture();
  try {
    for (const cookie of ['', 'lanet_session=obsolete', f.cookie]) {
      const r = await f.fetch('/auth/logout', {}, cookie);
      assert.equal(r.status, 200);
      assert.match(r.headers.get('Set-Cookie'), /Max-Age=0; Secure/);
    }
    assert.equal((await f.fetch('/auth/me')).status, 401);
  } finally {
    f.db.close();
  }
});
