import test from 'node:test';
import assert from 'node:assert/strict';
import { createPreferenceWriter } from '../shared/preference-writer.js';

const deferred = () => {
  let resolve, reject;
  const promise = new Promise((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
};

test('Preference saves serialize network writes and combine the latest pending intent per field', async () => {
  const requests = [];
  const write = createPreferenceWriter((patch) => {
    const response = deferred();
    requests.push({ patch, response });
    return response.promise;
  });
  const first = write({ volume: 1 });
  const middle = write({ volume: 0.2, lofi: 'night' });
  const last = write({ volume: 0, hideGrades: true });
  assert.equal(requests.length, 1);
  requests[0].response.resolve({ ok: true });
  assert.deepEqual((await first).patch, { volume: 1 });
  assert.equal(requests.length, 2);
  assert.deepEqual(requests[1].patch, { volume: 0, lofi: 'night', hideGrades: true });
  requests[1].response.resolve({ ok: true });
  const [a, b] = await Promise.all([middle, last]);
  assert.deepEqual(a.patch, requests[1].patch);
  assert.deepEqual(b.patch, requests[1].patch);
  assert.equal(requests.length, 2);
});

test('A failed preference write rejects its callers without retrying or blocking newer changes', async () => {
  const gate = deferred(),
    calls = [];
  const write = createPreferenceWriter((patch) => {
    calls.push(patch);
    return calls.length === 1 ? gate.promise : Promise.resolve({ ok: true });
  });
  const first = write({ lofi: 'night' });
  const failure = assert.rejects(first, /offline/);
  const next = write({ lofi: 'window' });
  gate.reject(new Error('offline'));
  await failure;
  assert.deepEqual((await next).patch, { lofi: 'window' });
  assert.deepEqual(calls, [{ lofi: 'night' }, { lofi: 'window' }]);
});
