import test from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { Miniflare, Response, convertV4MiniflareOptions } from 'miniflare';
import { fileURLToPath } from 'node:url';

test('Google: intercanvi i perfil funcionen en workerd sense seguir redirects ni exposar credencials', async (t) => {
  const bundle = await build({
    stdin: {
      resolveDir: fileURLToPath(new URL('../', import.meta.url)),
      contents: `
        import { exchangeGoogleCode, completeGoogleProfile } from './worker/google-token.js';
        export default { async fetch(request) {
          const path = new URL(request.url).pathname;
          try {
            if (path === '/profile') return Response.json(await completeGoogleProfile(
              {sub:'stable',email:'test@fje.edu',domain:'fje.edu',name:'test',givenName:'',familyName:'',picture:''},
              {access_token:'isolated-runtime-access'}
            ));
            return Response.json(await exchangeGoogleCode(
              path === '/redirect' ? 'redirect-test' : 'runtime-test',
              {redirect_uri:'https://lanet.example/api/auth/google/callback',verifier:'isolated-runtime-verifier'},
              {clientId:'test.apps.googleusercontent.com',clientSecret:'isolated-runtime-secret'}
            ));
          } catch { return new Response('rejected', {status:401}); }
        }};
      `,
    },
    bundle: true,
    format: 'esm',
    platform: 'browser',
    write: false,
  });
  const calls = [];
  const mf = new Miniflare(convertV4MiniflareOptions({
    cf: false,
    modules: true,
    script: bundle.outputFiles[0].text,
    compatibilityDate: '2026-10-08',
    compatibilityFlags: ['nodejs_compat'],
    outboundService: async (request) => {
      const url = new URL(request.url);
      calls.push(url.origin + url.pathname);
      if (url.href === 'https://oauth2.googleapis.com/token') {
        assert.equal(request.method, 'POST');
        const body = new URLSearchParams(await request.text());
        assert.equal(body.get('client_secret'), 'isolated-runtime-secret');
        assert.equal(body.get('code_verifier'), 'isolated-runtime-verifier');
        if (body.get('code') === 'redirect-test')
          return new Response(null, { status: 302, headers: { Location: 'https://untrusted.invalid/token' } });
        return Response.json({ id_token: 'isolated-runtime-id', access_token: 'isolated-runtime-access' });
      }
      if (url.href === 'https://openidconnect.googleapis.com/v1/userinfo') {
        assert.equal(request.headers.get('Authorization'), 'Bearer isolated-runtime-access');
        return Response.json({
          sub: 'stable', name: 'Test Student', given_name: 'Test', family_name: 'Student',
          picture: 'https://lh3.googleusercontent.com/a/test',
        });
      }
      throw new Error('No es permet cap altra destinació al proveïdor aïllat.');
    },
  }));
  t.after(() => mf.dispose());
  const token = await mf.dispatchFetch('https://runtime.test/token');
  assert.equal(token.status, 200, 'El motor Workers ha de completar la petició al proveïdor.');
  assert.deepEqual(await token.json(), { id_token: 'isolated-runtime-id', access_token: 'isolated-runtime-access' });
  const before = calls.length;
  assert.equal((await mf.dispatchFetch('https://runtime.test/redirect')).status, 401);
  assert.equal(calls.length, before + 1, 'No ha de seguir la redirecció amb credencials.');
  const profile = await (await mf.dispatchFetch('https://runtime.test/profile')).json();
  assert.equal(profile.givenName, 'Test');
  assert.equal(profile.familyName, 'Student');
  assert.equal(profile.picture, 'https://lh3.googleusercontent.com/a/test');
  assert.equal(calls.length, 3);
});
