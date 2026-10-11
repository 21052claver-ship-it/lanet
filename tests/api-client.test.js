import test from 'node:test';
import assert from 'node:assert/strict';
import { api } from '../src/api.js';

test('An unresponsive startup read aborts with a useful connection error', async (t) => {
  let aborted = false;
  t.mock.method(
    globalThis,
    'fetch',
    async (_url, options) =>
      new Promise((_resolve, reject) => {
        options.signal.addEventListener(
          'abort',
          () => {
            aborted = true;
            reject(new DOMException('Aborted', 'AbortError'));
          },
          { once: true },
        );
      }),
  );
  await assert.rejects(api('/auth/status', { timeoutMs: 10 }), /connexió triga massa/);
  assert.equal(aborted, true);
});

test('Read deadlines never abort or retry an in-flight write', async (t) => {
  let calls = 0;
  t.mock.method(globalThis, 'fetch', async (_url, options) => {
    calls++;
    assert.equal(options.signal, undefined);
    await new Promise((resolve) => setTimeout(resolve, 20));
    return new Response(JSON.stringify({ ok: true }));
  });
  assert.deepEqual(
    await api('/banner', { method: 'POST', body: { title: 'Test' }, timeoutMs: 1 }),
    { ok: true },
  );
  assert.equal(calls, 1);
});
