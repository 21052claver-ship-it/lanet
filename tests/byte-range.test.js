import test from 'node:test';
import assert from 'node:assert/strict';
import { byteRange } from '../shared/byte-range.js';
test('Rangs de vídeo: complets, oberts, sufixos i límits', () => {
  assert.equal(byteRange(null, 100), null);
  assert.deepEqual(byteRange('bytes=0-9', 100), { offset: 0, length: 10, end: 9 });
  assert.deepEqual(byteRange('bytes=90-', 100), { offset: 90, length: 10, end: 99 });
  assert.deepEqual(byteRange('bytes=-10', 100), { offset: 90, length: 10, end: 99 });
  assert.deepEqual(byteRange('bytes=90-500', 100), { offset: 90, length: 10, end: 99 });
  assert.deepEqual(byteRange('bytes=-500', 100), { offset: 0, length: 100, end: 99 });
});
test('Rebutja rangs múltiples, buits, fora del fitxer i enters insegurs', () => {
  for (const range of [
    'bytes=',
    'bytes=-',
    'bytes=-0',
    'bytes=101-',
    'bytes=8-2',
    'bytes=0-2,4-6',
    'items=0-2',
    'bytes=99999999999999999999-',
  ])
    assert.throws(() => byteRange(range, 100), RangeError);
});
