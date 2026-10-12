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

test('Network failures explain reads and unconfirmed writes without retrying them', async (t) => {
  let calls = 0;
  const cause = new TypeError('Failed to fetch');
  t.mock.method(globalThis, 'fetch', async () => {
    calls++;
    throw cause;
  });
  await assert.rejects(api('/bootstrap'), (error) => {
    assert.equal(error.code, 'network_error');
    assert.equal(error.cause, cause);
    assert.match(error.message, /connectar amb La Net/);
    return true;
  });
  await assert.rejects(api('/notes', { method: 'POST', body: {} }), (error) => {
    assert.equal(error.code, 'network_error');
    assert.match(error.message, /confirmar l’acció/);
    return true;
  });
  assert.equal(calls, 2);
});

test('Caller cancellation keeps its abort reason', async (t) => {
  const controller = new AbortController();
  const reason = new DOMException('Cancelled by caller', 'AbortError');
  controller.abort(reason);
  t.mock.method(globalThis, 'fetch', async () => {
    throw reason;
  });
  await assert.rejects(api('/library', { signal: controller.signal }), (error) => error === reason);
});
