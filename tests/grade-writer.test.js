import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createGradeWriter } from '../shared/grade-writer.js';
const deferred = () => {
  let resolve;
  const promise = new Promise((yes) => {
    resolve = yes;
  });
  return { promise, resolve };
};
function fixture(intercept = async () => {}) {
  const values = new Map([
      ['a', 7],
      ['b', null],
    ]),
    calls = [];
  const writer = createGradeWriter({
    getGrade: (id) => values.get(id),
    save: async (entries) => {
      calls.push(entries);
      await intercept(entries, calls.length);
      entries.forEach((entry) => values.set(entry.id, entry.grade));
    },
  });
  return { values, calls, writer };
}
test('canvis ràpids A → B → A es desen en ordre i conserven el valor final', async () => {
  const gate = deferred(),
    f = fixture(async (_, n) => {
      if (n === 1) await gate.promise;
    });
  const first = f.writer.write([{ id: 'a', grade: 8 }]);
  const last = f.writer.write([{ id: 'a', grade: 7 }]);
  await Promise.resolve();
  assert.equal(f.calls.length, 1);
  gate.resolve();
  assert.deepEqual(await Promise.all([first, last]), [true, true]);
  assert.deepEqual(
    f.calls.map((entries) => entries[0].grade),
    [8, 7],
  );
  assert.equal(f.values.get('a'), 7);
});
test('un error conserva l’entrada, permet reintentar i només llavors incorpora Desfer', async () => {
  let offline = true;
  const f = fixture(async () => {
    if (offline) throw new Error('offline');
  });
  assert.equal(await f.writer.write([{ id: 'b', grade: 0 }]), false);
  assert.deepEqual(f.writer.snapshot(), {
    busy: false,
    failed: [{ id: 'b', grade: 0 }],
    canUndo: false,
  });
  assert.equal(f.values.get('b'), null);
  offline = false;
  assert.deepEqual(await f.writer.retry(), [true]);
  assert.equal(f.values.get('b'), 0);
  assert.equal(f.writer.snapshot().canUndo, true);
  assert.equal(await f.writer.undo(), true);
  assert.equal(f.values.get('b'), null);
  assert.equal(f.writer.snapshot().canUndo, false);
});
test('Desfer fallit conserva l’historial i el reintent consumeix exactament la mateixa acció', async () => {
  let offline = false;
  const f = fixture(async () => {
    if (offline) throw new Error('offline');
  });
  await f.writer.write([{ id: 'a', grade: 8.3 }]);
  offline = true;
  assert.equal(await f.writer.undo(), false);
  assert.equal(f.values.get('a'), 8.3);
  assert.deepEqual(f.writer.snapshot().failed, [{ id: 'a', grade: 7 }]);
  offline = false;
  await f.writer.retry();
  assert.equal(f.values.get('a'), 7);
  assert.equal(f.writer.snapshot().canUndo, false);
});
test('una escriptura posterior substitueix la fallida sense recuperar un valor antic', async () => {
  const f = fixture(async (_, n) => {
    if (n === 1) throw new Error('interrupció');
  });
  const first = f.writer.write([{ id: 'a', grade: 8 }]);
  const last = f.writer.write([{ id: 'a', grade: 9 }]);
  assert.deepEqual(await Promise.all([first, last]), [false, true]);
  assert.equal(f.values.get('a'), 9);
  assert.deepEqual(f.writer.snapshot().failed, []);
});
test('enganxar un bloc conserva zero i pendent i es desfà com una sola acció', async () => {
  const f = fixture();
  await f.writer.write([
    { id: 'a', grade: null },
    { id: 'b', grade: 0 },
  ]);
  assert.equal(f.values.get('a'), null);
  assert.equal(f.values.get('b'), 0);
  await f.writer.undo();
  assert.equal(f.values.get('a'), 7);
  assert.equal(f.values.get('b'), null);
});
test('una prova eliminada explícitament no deixa un reintent impossible', async () => {
  const f = fixture(async () => {
    throw new Error('rebutjat');
  });
  await f.writer.write([{ id: 'b', grade: 8 }]);
  f.writer.reconcile(new Set(['a']));
  assert.deepEqual(f.writer.snapshot().failed, []);
  assert.deepEqual(await f.writer.retry(), []);
});
