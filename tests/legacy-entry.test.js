import test from 'node:test';
import assert from 'node:assert/strict';
import legacy from '../worker/legacy-entry.js';
const old = 'https://la-net.impossible-goals-research.workers.dev';
test('Adreca antiga: API retirada sense reenviar credencials, cookies o parametres', async () => {
  for (const method of ['GET', 'POST', 'PUT', 'DELETE']) {
    for (const path of [
      '/api',
      '/api/auth/guest',
      '/api/auth/login',
      '/api/profile',
      '/api/auth/google/callback?code=private-code',
    ]) {
      const r = legacy.fetch(
        new Request(old + path, { method, headers: { Cookie: 'lanet_session=private-token' } }),
      );
      assert.equal(r.status, 410);
      assert.equal(r.headers.has('Location'), false);
      assert.equal(r.headers.has('Set-Cookie'), false);
      const text = await r.text();
      assert.equal(text.includes('private-code'), false);
      assert.equal(text.includes('private-token'), false);
    }
  }
});
test('Adreca antiga: redireccio fixa a lanet i cap cache de respostes', () => {
  for (const path of ['/', '/?code=private-code', '/any', '//attacker.example/']) {
    const r = legacy.fetch(new Request(old + path));
    assert.equal(r.status, 308);
    assert.equal(r.headers.get('Location'), 'https://lanet.pages.dev/');
    assert.equal(r.headers.get('Cache-Control'), 'no-store');
    assert.equal(r.headers.get('Referrer-Policy'), 'no-referrer');
  }
});
