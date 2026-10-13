import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createDataSync, runMutation, privacyAfterFailure } from '../shared/async-state.js';

function deferred() {
  let resolve, reject;
  const promise = new Promise((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
}
test('una lectura antiga acabada després de la nova no desfà el canvi', async () => {
  const requests = [deferred(), deferred()],
    applied = [];
  let cursor = 0;
  const sync = createDataSync({
    read: () => requests[cursor++].promise,
    apply: (v) => applied.push(v),
  });
  const old = sync.refresh(),
    fresh = sync.refresh();
  requests[1].resolve({ value: 'nou' });
  await fresh;
  requests[0].resolve({ value: 'antic' });
  await old;
  assert.deepEqual(applied, [{ value: 'nou' }]);
});
test('lectures anteriors o durant escriptures concurrents no publiquen snapshots parcials', async () => {
  const requests = [deferred(), deferred(), deferred()],
    applied = [];
  let cursor = 0;
  const sync = createDataSync({
    read: () => requests[cursor++].promise,
    apply: (v) => applied.push(v),
  });
  const old = sync.refresh();
  sync.beginWrite();
  sync.beginWrite();
  const partial = sync.refresh();
  sync.endWrite();
  requests[0].resolve('antic');
  requests[1].resolve('parcial');
  await Promise.all([old, partial]);
  assert.deepEqual(applied, []);
  sync.endWrite();
  const fresh = sync.refresh();
  requests[2].resolve('complet');
  await fresh;
  assert.deepEqual(applied, ['complet']);
});
test('una escriptura confirmada continua sent reeixida si falla la recàrrega', async () => {
  let writes = 0,
    committed = 0,
    warnings = 0,
    errors = 0;
  const sync = createDataSync({
    read: async () => {
      throw new Error('GET interromput');
    },
    apply: () => assert.fail(),
  });
  const result = await runMutation({
    sync,
    write: async () => {
      writes++;
      return { id: 'creat' };
    },
    onCommitted: () => committed++,
    onRefreshError: () => warnings++,
    onError: () => errors++,
  });
  assert.deepEqual(result, { id: 'creat' });
  assert.deepEqual(
    { writes, committed, warnings, errors },
    { writes: 1, committed: 1, warnings: 1, errors: 0 },
  );
});
test('un POST rebutjat no es confirma ni activa una recàrrega d’èxit', async () => {
  let reads = 0,
    errors = 0;
  const sync = createDataSync({
    read: async () => {
      reads++;
    },
    apply: () => {},
  });
  await assert.rejects(
    runMutation({
      sync,
      write: async () => {
        throw new Error('rebutjat');
      },
      onError: () => errors++,
      onCommitted: () => assert.fail(),
    }),
    /rebutjat/,
  );
  assert.equal(reads, 0);
  assert.equal(errors, 1);
  await sync.refresh();
  assert.equal(reads, 1);
});
test('un error de privadesa conserva qualsevol estat ocult sol·licitat o anterior', () => {
  assert.equal(privacyAfterFailure(true, false), true);
  assert.equal(privacyAfterFailure(false, true), true);
  assert.equal(privacyAfterFailure(false, false), false);
});

test('una recàrrega descartada durant una reacció es recupera en acabar l’última escriptura', async () => {
  const requests = [deferred(), deferred()],
    applied = [];
  let reads = 0;
  const sync = createDataSync({
    read: () => requests[reads++].promise,
    apply: (value) => applied.push(value),
  });
  sync.beginWrite();
  const partial = sync.refresh();
  requests[0].resolve({ created: true, liked: false });
  await partial;
  assert.deepEqual(applied, []);
  sync.endWrite();
  await Promise.resolve();
  assert.equal(reads, 2);
  requests[1].resolve({ created: true, liked: true });
  await new Promise((resolve) => setImmediate(resolve));
  assert.deepEqual(applied, [{ created: true, liked: true }]);
});

test('una lectura iniciada després d’un desament però abans d’una reacció tampoc es perd', async () => {
  const requests = [deferred(), deferred()],
    applied = [];
  let reads = 0;
  const sync = createDataSync({
    read: () => requests[reads++].promise,
    apply: (value) => applied.push(value),
  });
  const saved = sync.refresh();
  sync.beginWrite();
  sync.endWrite();
  await Promise.resolve();
  assert.equal(reads, 2);
  requests[0].resolve({ created: true, liked: false });
  await saved;
  requests[1].resolve({ created: true, liked: true });
  await new Promise((resolve) => setImmediate(resolve));
  assert.deepEqual(applied, [{ created: true, liked: true }]);
});
