import test from 'node:test';
import assert from 'node:assert/strict';
import { distributeWeights } from '../shared/weights.js';
test('Repartiment exacte del 100% amb arrodoniment i preservació de notes i identificadors', () => {
  for (const length of [1, 3, 7, 17, 60]) {
    const rows = Array.from({ length }, (_, i) => ({
      id: String(i),
      weight: 0,
      grade: i === 0 ? 0 : null,
    }));
    const result = distributeWeights(rows);
    assert.equal(
      result.reduce((s, r) => s + Math.round(r.weight * 100), 0),
      10000,
    );
    assert.equal(result[0].grade, 0);
    assert.deepEqual(
      result.map((r) => r.id),
      rows.map((r) => r.id),
    );
    assert.ok(rows.every((r) => r.weight === 0));
  }
});
test('Repartiment proporcional conserva relacions i tracta suma zero', () => {
  assert.deepEqual(
    distributeWeights([{ weight: 10 }, { weight: 30 }], true).map((r) => r.weight),
    [25, 75],
  );
  assert.deepEqual(
    distributeWeights([{ weight: 0 }, { weight: 0 }], true).map((r) => r.weight),
    [50, 50],
  );
  assert.deepEqual(distributeWeights([], true), []);
});
