import test from 'node:test';
import assert from 'node:assert/strict';
import { generateKeyPair, SignJWT } from 'jose';
import { testEnvironment } from './helpers/d1.js';
import { createGoogleRoute } from '../worker/google.js';
import { verifyGoogleToken } from '../worker/google-token.js';
import { authenticate } from '../worker/auth.js';
import { hash, publicUser } from '../worker/utils.js';
import worker from '../worker/index.js';
const { privateKey, publicKey } = await generateKeyPair('RS256');
const base = 'https://lanet.example';
const profile = {
  sub: 'google-stable-id',
  email: 'marc@fje.edu',
  hd: 'fje.edu',
  name: 'Marc Serra',
  given_name: 'Marc',
  family_name: 'Serra',
  picture: 'https://lh3.googleusercontent.com/a/photo',
  email_verified: true,
};
function fixture() {
  const { db, env } = testEnvironment();
  let calls = 0,
    current = { ...profile },
    failExchange = false;
  const diagnostics = [];
  const route = createGoogleRoute({
    report: (event) => diagnostics.push(event),
    exchange: async (code, flow, config) => {
      calls++;
      assert.equal(code, 'test-code');
      assert.equal(flow.redirect_uri, config.redirectUri);
      assert.match(flow.verifier, /^[\w-]{43}$/);
      if (failExchange) throw new Error('provider secret must not escape');
      return {
        id_token: await new SignJWT({ ...current, nonce: flow.nonce })
          .setProtectedHeader({ alg: 'RS256' })
          .setIssuer('https://accounts.google.com')
          .setAudience(config.clientId)
          .setIssuedAt()
          .setExpirationTime('5m')
          .sign(privateKey),
      };
    },
    verify: (token, config, nonce) => verifyGoogleToken(token, config, nonce, publicKey),
  });
  const req = (path, data, cookie = '') =>
    new Request(base + '/api/auth/google/' + path, {
      method: data ? 'POST' : 'GET',
      headers: { Cookie: cookie, Origin: base, 'Content-Type': 'application/json' },
      body: data ? JSON.stringify(data) : undefined,
    });
  return {
    db,
    env,
    calls: () => calls,
    diagnostics,
    setProfile: (p) => {
      current = { ...profile, ...p };
    },
    fail: () => {
      failExchange = true;
    },
    async start(intent = 'login', sessionCookie = '') {
      const r = await route(req('start', { intent }, sessionCookie), env, '/api/auth/google/start');
      const url = new URL((await r.json()).url),
        cookie = r.headers.get('Set-Cookie').split(';')[0];
      return { url, cookie: [cookie, sessionCookie].filter(Boolean).join('; '), response: r };
    },
    callback(flow, extra = '', cookie = flow.cookie) {
      return route(
        req(
          `callback?state=${flow.url.searchParams.get('state')}&code=test-code${extra}`,
          undefined,
          cookie,
        ),
        env,
        '/api/auth/google/callback',
      );
    },
    async user(id = 'existing', email = profile.email, role = 'student') {
      db.prepare(
        'INSERT INTO users(id,email,name,password_hash,salt,role,group_id,configured) VALUES(?,?,?,?,?,?,?,1)',
      ).run(id, email, 'Nom original', 'unusable', 'salt', role, '2B');
      const token = crypto.randomUUID();
      db.prepare('INSERT INTO sessions(hash,user_id,expires) VALUES(?,?,?)').run(
        await hash(token),
        id,
        Date.now() + 3600000,
      );
      return `lanet_session=${token}`;
    },
  };
}
const outcome = (r) => new URL(r.headers.get('Location')).searchParams.get('auth_result');
const loginCookie = (r) =>
  r.headers
    .getSetCookie()
    .find((s) => s.startsWith('lanet_session='))
    .split(';')[0];
test('Google: inici amb PKCE, nonce, estat hash i cookie HttpOnly Secure', async () => {
  const f = fixture();
  try {
    const flow = await f.start(),
      p = flow.url.searchParams;
    assert.equal(flow.url.origin, 'https://accounts.google.com');
    assert.equal(p.get('scope'), 'openid email profile');
    assert.equal(p.get('code_challenge_method'), 'S256');
    assert.equal(p.get('access_type'), null);
    const state = f.db.prepare('SELECT * FROM google_auth_flows').get();
    assert.equal(state.state_hash, await hash(p.get('state')));
    assert.notEqual(state.binding_hash, flow.cookie.split('=')[1]);
    const expected = Buffer.from(
      await crypto.subtle.digest('SHA-256', new TextEncoder().encode(state.verifier)),
    ).toString('base64url');
    assert.equal(p.get('code_challenge'), expected);
    assert.equal(p.get('nonce'), state.nonce);
    assert.match(flow.response.headers.get('Set-Cookie'), /HttpOnly.*SameSite=Lax.*Secure/);
  } finally {
    f.db.close();
  }
});
test('Google: crea estudiant amb perfil real i sessio, sense tokens publics', async () => {
  const f = fixture();
  try {
    const r = await f.callback(await f.start());
    assert.equal(r.status, 303);
    assert.equal(outcome(r), 'connected');
    const user = await authenticate(
      new Request(base, { headers: { Cookie: loginCookie(r) } }),
      f.env,
    );
    assert.equal(user.role, 'student');
    assert.equal(user.configured, 0);
    assert.equal(user.given_name, 'Marc');
    assert.equal(user.family_name, 'Serra');
    assert.equal(user.name, 'Marc Serra');
    assert.equal(user.avatar_url, profile.picture);
    assert.equal(user.password_enabled, 0);
    const safe = publicUser(user);
    assert.equal(safe.google_sub, undefined);
    assert.equal(safe.password_hash, undefined);
    assert.equal(safe.has_password, false);
    assert.equal(safe.google_connected, true);
    assert.equal(f.db.prepare('SELECT COUNT(*) AS n FROM google_auth_flows').get().n, 0);
    assert.match(r.headers.get('Referrer-Policy'), /no-referrer/);
  } finally {
    f.db.close();
  }
});
test('Google: callback sense cookie o amb estat fals no crea usuari', async () => {
  const f = fixture();
  try {
    const flow = await f.start();
    assert.equal(outcome(await f.callback(flow, '', '')), 'expired');
    const bad = { ...flow, url: new URL(flow.url) };
    bad.url.searchParams.set('state', 'x'.repeat(43));
    assert.equal(outcome(await f.callback(bad)), 'expired');
    assert.equal(f.calls(), 0);
    assert.equal(outcome(await f.callback(flow)), 'connected');
  } finally {
    f.db.close();
  }
});
test('Google: estat caducat, callback duplicat i replay rebutjats', async () => {
  const f = fixture();
  try {
    const expired = await f.start();
    f.db.exec('UPDATE google_auth_flows SET expires=1');
    assert.equal(outcome(await f.callback(expired)), 'expired');
    const flow = await f.start();
    assert.equal(outcome(await f.callback(flow, '&state=duplicate')), 'expired');
    const responses = await Promise.all([f.callback(flow), f.callback(flow)]);
    assert.deepEqual(responses.map(outcome).sort(), ['connected', 'expired']);
    assert.equal(f.calls(), 1);
  } finally {
    f.db.close();
  }
});
test('Google: cancel·lacio i error del proveidor no filtren dades ni creen sessions', async () => {
  const f = fixture();
  try {
    assert.equal(outcome(await f.callback(await f.start(), '&error=access_denied')), 'cancelled');
    assert.equal(f.calls(), 0);
    f.fail();
    const r = await f.callback(await f.start());
    assert.equal(outcome(r), 'invalid');
    assert.equal((await r.text()).includes('secret'), false);
    assert.equal(f.db.prepare('SELECT COUNT(*) AS n FROM sessions').get().n, 0);
  } finally {
    f.db.close();
  }
});

test('Google: diagnòstic explícit amb etapa fixa, sense errors del proveïdor ni credencials', async () => {
  const f = fixture();
  try {
    f.fail();
    await f.callback(await f.start());
    assert.deepEqual(f.diagnostics, []);
    f.env.GOOGLE_AUTH_DIAGNOSTICS = 'true';
    const result = await f.callback(await f.start());
    assert.equal(outcome(result), 'invalid');
    assert.deepEqual(f.diagnostics, [{ stage: 'exchange', result: 'invalid', code: 'unexpected' }]);
    assert.equal(JSON.stringify(f.diagnostics).includes('provider secret'), false);
    assert.equal(f.db.prepare('SELECT COUNT(*) AS n FROM sessions').get().n, 0);
  } finally {
    f.db.close();
  }
});
test('Google: migra un compte antic amb el mateix correu Workspace verificat', async () => {
  const f = fixture();
  try {
    await f.user();
    const r = await f.callback(await f.start());
    assert.equal(outcome(r), 'connected');
    const u = f.db.prepare('SELECT * FROM users').get();
    assert.equal(u.google_sub, profile.sub);
    assert.equal(u.id, 'existing');
    assert.equal(u.password_enabled, 0);
    assert.equal(f.db.prepare('SELECT COUNT(*) AS n FROM users').get().n, 1);
  } finally {
    f.db.close();
  }
});
test('Google: conserva rol, saldo i ID antic sense permetre la sessio anterior', async () => {
  const f = fixture();
  try {
    const cookie = await f.user('existing', profile.email, 'delegate');
    f.db.exec(
      "INSERT INTO ledger(id,user_id,amount,reason,ref,day) VALUES('seed','existing',15,'Test','seed','2026-10-10')",
    );
    assert.equal(outcome(await f.callback(await f.start('login', cookie))), 'connected');
    const u = f.db.prepare('SELECT * FROM users').get();
    assert.equal(u.id, 'existing');
    assert.equal(u.balance, 20);
    assert.equal(u.role, 'delegate');
    assert.equal(u.password_enabled, 0);
    await assert.rejects(authenticate(new Request(base, { headers: { Cookie: cookie } }), f.env));
    assert.equal(outcome(await f.callback(await f.start())), 'connected');
    assert.equal(f.db.prepare('SELECT COUNT(*) AS n FROM users').get().n, 1);
  } finally {
    f.db.close();
  }
});
test('Google: convertir convidat conserva notes, assignatures, preferencies i pastissos', async () => {
  const f = fixture();
  try {
    const cookie = await f.user('guest:test', 'test@guest.lanet.invalid');
    f.db.exec(
      "INSERT INTO enrollments(user_id,offering_id) VALUES('guest:test','2B-cat'); INSERT INTO ledger(id,user_id,amount,reason,ref,day) VALUES('old-guest','guest:test',24,'Test','old-guest','2026-10-10'); INSERT INTO grade_entries(id,user_id,subject_id,term,category,title,weight,position,assessment_type,grade) VALUES('old-grade','guest:test','cat',1,'exam','Parcial 1',30,0,'partial1',8.3)",
    );
    const guest = f.db.prepare("SELECT * FROM users WHERE id='guest:test'").get();
    const grades = f.db.prepare('SELECT * FROM grade_entries WHERE user_id=?').all(guest.id),
      enrollments = f.db.prepare('SELECT * FROM enrollments WHERE user_id=?').all(guest.id);
    f.db
      .prepare('INSERT INTO user_preferences(user_id,value) VALUES(?,?)')
      .run(guest.id, '{"hideGrades":true}');
    const next = await f.callback(await f.start('login', cookie));
    assert.equal(outcome(next), 'connected');
    f.env.DEMO_MODE = 'false';
    const u = await authenticate(
      new Request(base, { headers: { Cookie: loginCookie(next) } }),
      f.env,
    );
    assert.equal(u.id, guest.id);
    assert.equal(u.balance, guest.balance + 5);
    assert.equal(publicUser(u).is_guest, false);
    assert.equal(u.password_enabled, 0);
    await assert.rejects(authenticate(new Request(base, { headers: { Cookie: cookie } }), f.env));
    assert.deepEqual(f.db.prepare('SELECT * FROM grade_entries WHERE user_id=?').all(u.id), grades);
    assert.deepEqual(
      f.db.prepare('SELECT * FROM enrollments WHERE user_id=?').all(u.id),
      enrollments,
    );
    assert.match(
      f.db.prepare('SELECT value FROM user_preferences WHERE user_id=?').get(u.id).value,
      /hideGrades/,
    );
  } finally {
    f.db.close();
  }
});
test('Google: vincular requereix la mateixa sessio iniciadora encara vigent', async () => {
  const f = fixture();
  try {
    const cookie = await f.user('guest:binding', 'binding@guest.lanet.invalid'),
      flow = await f.start('login', cookie);
    assert.equal(
      outcome(await f.callback(flow, '', flow.cookie.split('; ')[0])),
      'session_changed',
    );
    assert.equal(f.calls(), 0);
    const flow2 = await f.start('login', cookie);
    f.db.exec('DELETE FROM sessions');
    assert.equal(outcome(await f.callback(flow2)), 'session_changed');
  } finally {
    f.db.close();
  }
});
test('Google: rebutja compte desactivat i correu vinculat a un altre sub', async () => {
  const f = fixture();
  try {
    await f.user();
    f.db.exec("UPDATE users SET google_sub='another-google-identity'");
    assert.equal(outcome(await f.callback(await f.start())), 'already_linked');
    f.db.exec('UPDATE users SET google_sub=NULL');
    f.db.exec("UPDATE users SET disabled=1 WHERE id='existing'");
    assert.equal(outcome(await f.callback(await f.start())), 'disabled');
  } finally {
    f.db.close();
  }
});
test('Google: sub estable i identitat completa resincronitzada a cada entrada', async () => {
  const f = fixture();
  try {
    await f.callback(await f.start());
    f.db.exec("UPDATE users SET name='Nom triat',given_name='Nom',family_name='Triat'");
    f.setProfile({
      email: 'new@school.example',
      name: 'Marc Nom de Google',
      given_name: 'Marc',
      family_name: 'Nom de Google',
      picture: 'https://lh3.googleusercontent.com/a/new',
    });
    assert.equal(outcome(await f.callback(await f.start())), 'connected');
    const u = f.db.prepare('SELECT * FROM users').get();
    assert.equal(u.name, 'Marc Nom de Google');
    assert.equal(u.given_name, 'Marc');
    assert.equal(u.family_name, 'Nom de Google');
    assert.equal(u.email, 'new@school.example');
    assert.equal(u.password_enabled, 0);
    assert.equal(u.avatar_url, 'https://lh3.googleusercontent.com/a/new');
    assert.equal(f.db.prepare('SELECT COUNT(*) AS n FROM users').get().n, 1);
  } finally {
    f.db.close();
  }
});
test('Google: alta i conversio de convidats nomes del domini Workspace fje.edu', async () => {
  const f = fixture();
  try {
    for (const patch of [
      { email: 'marc@gmail.com', hd: undefined },
      { email: 'marc@fje.edu', hd: undefined },
      { email: 'marc@fje.edu', hd: 'other.edu' },
      { email: 'marc@other.edu', hd: 'fje.edu' },
    ]) {
      f.setProfile(patch);
      assert.equal(outcome(await f.callback(await f.start())), 'school_only');
    }
    assert.equal(f.db.prepare('SELECT COUNT(*) AS n FROM users').get().n, 0);
    const cookie = await f.user('guest:test', 'test@guest.lanet.invalid');
    f.setProfile({ email: 'marc@gmail.com', hd: undefined });
    assert.equal(outcome(await f.callback(await f.start('login', cookie))), 'school_only');
    assert.equal(f.db.prepare('SELECT email FROM users').get().email, 'test@guest.lanet.invalid');
  } finally {
    f.db.close();
  }
});
test('Google: una cookie antiga no pot apropiar-se de la identitat Google existent', async () => {
  const f = fixture();
  try {
    await f.callback(await f.start());
    const cookie = await f.user('other', 'other@fje.edu');
    assert.equal(outcome(await f.callback(await f.start('login', cookie))), 'connected');
    assert.equal(
      f.db.prepare("SELECT google_sub FROM users WHERE id='other'").get().google_sub,
      null,
    );
  } finally {
    f.db.close();
  }
});
test('Google: API protegeix metode, origen, configuracio i contrasenya', async () => {
  const f = fixture();
  try {
    const req = (path, method = 'GET', origin = base, data) =>
      new Request(base + '/api' + path, {
        method,
        headers: { Origin: origin, 'Content-Type': 'application/json' },
        body: data ? JSON.stringify(data) : undefined,
      });
    assert.equal((await worker.fetch(req('/auth/google/start'), f.env)).status, 405);
    assert.equal(
      (
        await worker.fetch(
          req('/auth/google/start', 'POST', 'https://attacker.example', { intent: 'login' }),
          f.env,
        )
      ).status,
      403,
    );
    const noConfig = { ...f.env, GOOGLE_CLIENT_SECRET: '' };
    assert.equal(
      (await worker.fetch(req('/auth/google/start', 'POST', base, { intent: 'login' }), noConfig))
        .status,
      503,
    );
    assert.equal((await (await worker.fetch(req('/auth/status'), noConfig)).json()).google, false);
    const r = await f.callback(await f.start()),
      cookie = loginCookie(r);
    const password = new Request(base + '/api/auth/password', {
      method: 'POST',
      headers: { Cookie: cookie, Origin: base },
      body: JSON.stringify({ current: 'x', password: 'A.long.password!' }),
    });
    assert.equal((await worker.fetch(password, f.env)).status, 403);
  } finally {
    f.db.close();
  }
});

test('Google: correu antic no es vincula amb email_verified sol sense hd del centre', async () => {
  const f = fixture();
  try {
    await f.user('old', profile.email, 'admin');
    for (const hd of [undefined, 'other.edu']) {
      f.setProfile({ hd });
      assert.equal(outcome(await f.callback(await f.start())), 'school_only');
      const u = f.db.prepare("SELECT * FROM users WHERE id='old'").get();
      assert.equal(u.google_sub, null);
      assert.equal(u.role, 'admin');
      assert.equal(u.name, 'Nom original');
    }
  } finally {
    f.db.close();
  }
});

test('Google: canvi de correu que coincideix amb un altre compte no sobreescriu identitats', async () => {
  const f = fixture();
  try {
    await f.callback(await f.start());
    await f.user('other', 'other@fje.edu', 'delegate');
    const before = f.db.prepare('SELECT * FROM users ORDER BY id').all();
    f.setProfile({ email: 'other@fje.edu', name: 'New name' });
    assert.equal(outcome(await f.callback(await f.start())), 'already_linked');
    assert.deepEqual(f.db.prepare('SELECT * FROM users ORDER BY id').all(), before);
  } finally {
    f.db.close();
  }
});

test('Google: entrada des de convidat antic no fusiona ni sobreescriu un compte Google existent', async () => {
  const f = fixture();
  try {
    const first = await f.callback(await f.start());
    const original = await authenticate(
      new Request(base, { headers: { Cookie: loginCookie(first) } }),
      f.env,
    );
    const cookie = await f.user('guest:other', 'other@guest.lanet.invalid');
    f.db.exec(
      "INSERT INTO user_preferences(user_id,value) VALUES('guest:other','{\"hideGrades\":true}')",
    );
    const guest = f.db.prepare("SELECT * FROM users WHERE id='guest:other'").get();
    const next = await f.callback(await f.start('login', cookie));
    assert.equal(outcome(next), 'connected');
    const logged = await authenticate(
      new Request(base, { headers: { Cookie: loginCookie(next) } }),
      f.env,
    );
    assert.equal(logged.id, original.id);
    assert.deepEqual(f.db.prepare("SELECT * FROM users WHERE id='guest:other'").get(), guest);
    assert.equal(
      f.db.prepare("SELECT value FROM user_preferences WHERE user_id='guest:other'").get().value,
      '{"hideGrades":true}',
    );
  } finally {
    f.db.close();
  }
});
