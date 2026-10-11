import test from 'node:test';
import assert from 'node:assert/strict';
import { createGoogleSession } from '../src/auth-session.js';
const url = 'https://accounts.google.com/o/oauth2/v2/auth?state=example';
const deferred = () => {
  let resolve;
  const promise = new Promise((done) => {
    resolve = done;
  });
  return { promise, resolve };
};
function fixture(request, options = {}) {
  const patches = [],
    destinations = [];
  const session = createGoogleSession({
    request,
    navigate: (url) => destinations.push(url),
    onChange: (patch) => patches.push(patch),
    ...options,
  });
  return { session, patches, destinations };
}
test('Google: doble clic inicia una sola peticio i resta ocupat fins al retorn', async () => {
  const pending = deferred(),
    calls = [];
  const f = fixture((...args) => {
    calls.push(args);
    return pending.promise;
  });
  const first = f.session.start();
  assert.equal(await f.session.start(), false);
  assert.equal(calls.length, 1);
  assert.equal(calls[0][0], '/auth/google/start');
  assert.deepEqual(calls[0][1].body, { intent: 'login' });
  pending.resolve({ url });
  assert.equal(await first, true);
  assert.deepEqual(f.destinations, [url]);
  assert.equal(f.session.pending, true);
  f.session.reset();
  assert.equal(f.session.pending, false);
  assert.deepEqual(f.patches.at(-1), { busy: false, error: '' });
});
test('Google: error de xarxa visible i reintent funcional', async () => {
  let fail = true;
  const f = fixture(async () => {
    if (fail) throw new Error('Sense connexió.');
    return { url };
  });
  assert.equal(await f.session.start(), false);
  assert.deepEqual(f.patches.at(-1), { busy: false, error: 'Sense connexió.' });
  fail = false;
  assert.equal(await f.session.start(), true);
  assert.deepEqual(f.destinations, [url]);
  f.session.dispose();
});
test('Google: URL de navegacio restringida al proveidor i ruta esperats', async () => {
  for (const invalid of [
    'javascript:alert(1)',
    'https://attacker.example/o/oauth2/v2/auth',
    'https://accounts.google.com.evil.example/o/oauth2/v2/auth',
    'http://accounts.google.com/o/oauth2/v2/auth',
    'https://accounts.google.com/other',
    'https://user:password@accounts.google.com/o/oauth2/v2/auth',
    url + '#unexpected',
    undefined,
  ]) {
    const f = fixture(async () => ({ url: invalid }));
    assert.equal(await f.session.start(), false);
    assert.deepEqual(f.destinations, []);
    assert.equal(f.session.pending, false);
    f.session.dispose();
  }
});
test('Google: desmuntar o tornar del navegador cancella respostes antigues', async () => {
  for (const action of ['dispose', 'reset']) {
    const pending = deferred();
    let signal;
    const f = fixture((_, options) => {
      signal = options.signal;
      return pending.promise;
    });
    const started = f.session.start();
    f.session[action]();
    assert.equal(signal.aborted, true);
    const count = f.patches.length;
    pending.resolve({ url });
    assert.equal(await started, false);
    assert.equal(f.patches.length, count);
    assert.deepEqual(f.destinations, []);
  }
});
test('Google: connexio penjada te limit de temps i permet reintentar', async () => {
  const f = fixture(
    (_, { signal }) =>
      new Promise((_, reject) => {
        signal.addEventListener('abort', () => reject(signal.reason), { once: true });
      }),
    { timeoutMs: 20 },
  );
  assert.equal(await f.session.start(), false);
  assert.equal(f.session.pending, false);
  assert.match(f.patches.at(-1).error, /trigant massa/);
  f.session.dispose();
});
test('Google: una resposta vella no interfereix en un reintent nou', async () => {
  const old = deferred(),
    current = deferred();
  let calls = 0;
  const f = fixture(() => (++calls === 1 ? old.promise : current.promise));
  const first = f.session.start();
  f.session.reset();
  const second = f.session.start();
  old.resolve({ url: 'https://attacker.example' });
  assert.equal(await first, false);
  assert.equal(f.session.pending, true);
  current.resolve({ url });
  assert.equal(await second, true);
  assert.deepEqual(f.destinations, [url]);
  f.session.dispose();
});
