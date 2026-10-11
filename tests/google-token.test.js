import test from 'node:test';
import assert from 'node:assert/strict';
import { generateKeyPair, SignJWT } from 'jose';
import {
  completeGoogleProfile,
  exchangeGoogleCode,
  googlePicture,
  verifyGoogleToken,
} from '../worker/google-token.js';
import { googleConfig } from '../worker/google-config.js';
import { googleResult } from '../shared/google-auth.js';
const { privateKey, publicKey } = await generateKeyPair('RS256');
const config = { clientId: '123-test.apps.googleusercontent.com' };
const claims = () => ({
  iss: 'https://accounts.google.com',
  aud: config.clientId,
  sub: '123456789',
  email: 'marc@school.example',
  email_verified: true,
  nonce: 'test-nonce',
  iat: Math.floor(Date.now() / 1000),
  exp: Math.floor(Date.now() / 1000) + 300,
  given_name: 'Marc',
  family_name: 'Serra',
  name: 'Marc Serra',
  picture: 'https://lh3.googleusercontent.com/a/avatar',
});
const sign = (p, key = privateKey) => new SignJWT(p).setProtectedHeader({ alg: 'RS256' }).sign(key);
const verify = async (p) => verifyGoogleToken(await sign(p), config, 'test-nonce', publicKey);
test('Google: JWT signat importa identitat, nom, cognoms i foto', async () => {
  assert.deepEqual(await verify(claims()), {
    sub: '123456789',
    email: 'marc@school.example',
    domain: '',
    givenName: 'Marc',
    familyName: 'Serra',
    name: 'Marc Serra',
    picture: 'https://lh3.googleusercontent.com/a/avatar',
  });
});
test('Google: el nom complet del proveidor preval sobre la composicio dels cognoms', async () => {
  const p = {
    ...claims(),
    name: 'Marc Àlex de la Serra',
    given_name: 'Marc',
    family_name: 'Serra',
  };
  assert.equal((await verify(p)).name, p.name);
});
test('Google: noms compostos llargs no es tallen al limit antic del formulari', async () => {
  const p = {
    ...claims(),
    name: 'Maria ' + 'de la Serra '.repeat(10),
    family_name: 'de la Serra '.repeat(8).trim(),
  };
  assert.equal((await verify(p)).name, p.name.trim());
  assert.equal((await verify(p)).familyName, p.family_name);
});
for (const [label, patch] of [
  ['emissor fals', { iss: 'https://attacker.example' }],
  ['audiencia aliena', { aud: 'other' }],
  ['nonce fals', { nonce: 'other' }],
  ['correu no verificat', { email_verified: false }],
  ['presentador incorrecte', { azp: 'other' }],
  ['audiencies multiples sense azp', { aud: [config.clientId, 'other'] }],
  ['token caducat', { exp: 1 }],
  ['emissio futura', { iat: Math.floor(Date.now() / 1000) + 120 }],
  ['token massa antic', { iat: Math.floor(Date.now() / 1000) - 700 }],
  ['sub buit', { sub: '' }],
  ['correu invalid', { email: 'no-email' }],
])
  test(`Google: rebutja ${label}`, async () => assert.rejects(verify({ ...claims(), ...patch })));
test('Google: rebutja firma falsa i algoritme no autoritzat', async () => {
  const wrong = await generateKeyPair('RS256');
  await assert.rejects(
    verifyGoogleToken(await sign(claims(), wrong.privateKey), config, 'test-nonce', publicKey),
  );
  const hmac = await new SignJWT(claims())
    .setProtectedHeader({ alg: 'HS256' })
    .sign(new Uint8Array(32));
  await assert.rejects(verifyGoogleToken(hmac, config, 'test-nonce', publicKey));
});
test('Google: requereix claims i admet perfil parcial amb fallback', async () => {
  for (const key of ['sub', 'nonce', 'exp', 'iat', 'email', 'email_verified']) {
    const p = claims();
    delete p[key];
    await assert.rejects(verify(p));
  }
  const p = claims();
  delete p.name;
  delete p.picture;
  assert.equal((await verify(p)).name, 'Marc Serra');
  delete p.given_name;
  delete p.family_name;
  assert.equal((await verify(p)).name, 'marc');
  assert.equal((await verify(p)).picture, '');
});
test('Google: foto limitada a HTTPS de Google i configuracio de callback segura', () => {
  for (const url of [
    'javascript:alert(1)',
    'http://lh3.googleusercontent.com/a',
    'https://lh3.googleusercontent.com.attacker.test/a',
    'https://user:pass@lh3.googleusercontent.com/a',
    'https://attacker.example/a',
  ])
    assert.equal(googlePicture(url), '');
  const env = {
    GOOGLE_CLIENT_ID: config.clientId,
    GOOGLE_CLIENT_SECRET: 'test',
    GOOGLE_REDIRECT_URI: 'https://lanet.example/api/auth/google/callback',
  };
  assert.ok(googleConfig(env));
  assert.ok(
    googleConfig({ ...env, GOOGLE_REDIRECT_URI: 'http://localhost:5183/api/auth/google/callback' }),
  );
  for (const url of [
    'http://lanet.example/api/auth/google/callback',
    'https://lanet.example/other',
    'https://lanet.example/api/auth/google/callback?x=1',
    'https://user:pass@lanet.example/api/auth/google/callback',
  ])
    assert.equal(googleConfig({ ...env, GOOGLE_REDIRECT_URI: url }), null);
  assert.equal(googleConfig({ ...env, GOOGLE_CLIENT_SECRET: '' }), null);
});
test('Google: resultat de retorn nomes amb missatges coneguts', () => {
  assert.equal(googleResult('https://lanet.example/?auth_result=expired').type, 'error');
  assert.equal(googleResult('https://lanet.example/?auth_result=connected').type, 'success');
  assert.equal(googleResult('https://lanet.example/?auth_result=constructor'), null);
  assert.equal(googleResult('https://lanet.example/?auth_result=%3Cscript%3E'), null);
});
test('Google: UserInfo completa foto i noms amb el mateix sub verificat', async () => {
  const p = {
    sub: 'stable',
    email: 'marc@fje.edu',
    domain: 'fje.edu',
    name: 'marc',
    givenName: '',
    familyName: '',
    picture: '',
  };
  const info = {
    sub: 'stable',
    name: 'Marc Serra',
    given_name: 'Marc',
    family_name: 'Serra',
    picture: 'https://lh3.googleusercontent.com/a/photo',
  };
  let requested = false;
  const result = await completeGoogleProfile(
    p,
    { access_token: 'isolated-test' },
    async (url, options) => {
      requested = true;
      assert.equal(url, 'https://openidconnect.googleapis.com/v1/userinfo');
      assert.equal(options.headers.Authorization, 'Bearer isolated-test');
      assert.equal(options.redirect, 'manual');
      return Response.json(info);
    },
  );
  assert.equal(requested, true);
  assert.equal(result.givenName, 'Marc');
  assert.equal(result.familyName, 'Serra');
  assert.equal(result.picture, info.picture);
  assert.equal(result.email, p.email);
  await assert.rejects(
    completeGoogleProfile(p, { access_token: 'test' }, async () =>
      Response.json({ ...info, sub: 'attacker' }),
    ),
  );
  assert.deepEqual(
    await completeGoogleProfile(
      p,
      { access_token: 'test' },
      async () => new Response('', { status: 503 }),
    ),
    p,
  );
});
test('Google: intercanvi de codi envia secret i PKCE nomes al servidor de tokens', async () => {
  const c = {
    clientId: config.clientId,
    clientSecret: 'isolated-secret',
    redirectUri: 'https://lanet.example/api/auth/google/callback',
  };
  const result = await exchangeGoogleCode(
    'isolated-code',
    { redirect_uri: c.redirectUri, verifier: 'isolated-verifier' },
    c,
    async (url, options) => {
      assert.equal(url, 'https://oauth2.googleapis.com/token');
      assert.equal(options.method, 'POST');
      assert.equal(options.redirect, 'manual');
      assert.equal(options.body.get('client_secret'), c.clientSecret);
      assert.equal(options.body.get('code_verifier'), 'isolated-verifier');
      assert.equal(options.body.get('redirect_uri'), c.redirectUri);
      assert.equal(options.body.get('grant_type'), 'authorization_code');
      return Response.json({
        id_token: 'test-jwt',
        access_token: 'test-access',
        refresh_token: 'never-retained',
      });
    },
  );
  assert.deepEqual(result, { id_token: 'test-jwt', access_token: 'test-access' });
  await assert.rejects(
    exchangeGoogleCode('code', {}, c, async () => new Response('', { status: 400 })),
  );
});
