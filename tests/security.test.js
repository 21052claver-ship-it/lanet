import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import pages from '../worker/pages-entry.js';
import { CONTENT_SECURITY_POLICY, withSecurityHeaders } from '../worker/security.js';
import { allowedRequestOrigin } from '../worker/origin.js';
import { body } from '../worker/utils.js';

test('Security headers cover static content, API errors, canonical redirects and configuration errors', async () => {
  const env = {
    PUBLIC_ORIGIN: 'https://lanet.pages.dev',
    ASSETS: { fetch: async () => new Response('page') },
  };
  for (const [url, bindings, status] of [
    ['https://lanet.pages.dev/', env, 200],
    ['https://lanet.pages.dev/api/bootstrap', env, 401],
    ['https://preview.lanet.pages.dev/', env, 308],
    ['https://preview.lanet.pages.dev/api/bootstrap', env, 421],
    ['https://lanet.pages.dev/', {}, 503],
  ]) {
    const r = await pages.fetch(new Request(url), bindings, {});
    assert.equal(r.status, status);
    assert.equal(r.headers.get('X-Frame-Options'), 'DENY');
    assert.equal(r.headers.get('X-Content-Type-Options'), 'nosniff');
    assert.equal(r.headers.get('Strict-Transport-Security'), 'max-age=31536000');
    assert.equal(r.headers.get('Content-Security-Policy'), CONTENT_SECURITY_POLICY);
    assert.ok(r.headers.get('Permissions-Policy').includes('microphone=()'));
  }
  const staticHeaders = readFileSync('public/_headers', 'utf8');
  assert.ok(staticHeaders.includes('Content-Security-Policy: ' + CONTENT_SECURITY_POLICY));
});

test('Security wrapping preserves both OAuth cookies, redirect and stricter file policies', () => {
  const headers = new Headers({
    Location: '/next',
    'Content-Security-Policy': "sandbox; default-src 'none'",
    'Cache-Control': 'private, no-store',
  });
  headers.append('Set-Cookie', 'lanet_session=fixture; HttpOnly; Secure; SameSite=Lax');
  headers.append('Set-Cookie', 'lanet_google_state=; Max-Age=0; Secure; HttpOnly');
  const r = withSecurityHeaders(
    new Response(null, { status: 303, headers }),
    new Request('https://lanet.pages.dev/api/auth/google/callback'),
  );
  assert.equal(r.headers.getSetCookie().length, 2);
  assert.equal(r.status, 303);
  assert.equal(r.headers.get('Location'), '/next');
  assert.equal(r.headers.get('Cache-Control'), 'private, no-store');
  assert.equal(r.headers.get('Content-Security-Policy'), "sandbox; default-src 'none'");
});

test('Missing Origin cannot bypass browser cross-site metadata or a foreign referer', () => {
  const request = (headers) =>
    new Request('https://lanet.pages.dev/api/banner', { method: 'POST', headers });
  const env = { DEMO_MODE: 'false' };
  assert.equal(allowedRequestOrigin(request({ 'Sec-Fetch-Site': 'cross-site' }), env), false);
  assert.equal(allowedRequestOrigin(request({ 'Sec-Fetch-Site': 'same-site' }), env), false);
  assert.equal(allowedRequestOrigin(request({ Referer: 'https://attacker.example/' }), env), false);
  assert.equal(allowedRequestOrigin(request({ Origin: 'null' }), env), false);
  assert.equal(allowedRequestOrigin(request({ Origin: 'https://lanet.pages.dev' }), env), true);
  assert.equal(allowedRequestOrigin(request({ 'Sec-Fetch-Site': 'same-origin' }), env), true);
  assert.equal(allowedRequestOrigin(request({}), env), true);
});

test('JSON size is bounded while streaming, even without Content-Length', async () => {
  let cancelled = false;
  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(new Uint8Array(70000));
      controller.enqueue(new Uint8Array(70000));
    },
    cancel() {
      cancelled = true;
    },
  });
  await assert.rejects(
    body(
      new Request('https://lanet.test/api/banner', {
        method: 'POST',
        body: stream,
        duplex: 'half',
      }),
    ),
    (e) => e.status === 413,
  );
  assert.equal(cancelled, true);
  const value = { title: 'Àudio, apunts i més' };
  assert.deepEqual(
    await body(
      new Request('https://lanet.test/api/banner', { method: 'POST', body: JSON.stringify(value) }),
    ),
    value,
  );
});
