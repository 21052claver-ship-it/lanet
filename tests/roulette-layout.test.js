import test from 'node:test';
import assert from 'node:assert/strict';
import { TABLE_BETS, BETS_BY_ID } from '../shared/roulette.js';
import { roulettePosition, rouletteTargetClass } from '../shared/roulette-layout.js';

test('Every inside bet has its own physical anchor, including zero and the row edge', () => {
  const anchors = new Map();
  for (const b of TABLE_BETS) {
    const point = roulettePosition(b);
    if (!point) continue;
    const key = point.join(',');
    assert.ok(!anchors.has(key), `${b.id} overlaps ${anchors.get(key)}`);
    anchors.set(key, b.id);
  }
  assert.equal(anchors.size, 148);
  const expected = {
    'number:0': [1.5, -0.5],
    'number:1': [0.5, 0.5],
    'number:36': [2.5, 11.5],
    'split:1-2': [1, 0.5],
    'split:1-4': [0.5, 1],
    'corner:1-2-4-5': [1, 1],
    'street:1-2-3': [0, 0.5],
    'six:1-2-3-4-5-6': [0, 1],
    'split:0-1': [0.5, 0],
    'split:0-2': [1.5, 0],
    'split:0-3': [2.5, 0],
    'trio:0-1-2': [1, 0],
    'trio:0-2-3': [2, 0],
    'first-four:0-1-2-3': [0, 0],
  };
  for (const [id, point] of Object.entries(expected))
    assert.deepEqual(roulettePosition(BETS_BY_ID[id]), point, id);
});

test('Split hit areas follow their actual dividing line and outside bets stay on the felt', () => {
  assert.equal(rouletteTargetClass(BETS_BY_ID['split:1-2']), 'tapet-line-vertical');
  assert.equal(rouletteTargetClass(BETS_BY_ID['split:1-4']), 'tapet-line-horizontal');
  assert.equal(rouletteTargetClass(BETS_BY_ID['split:0-1']), 'tapet-line-horizontal');
  const outside = TABLE_BETS.filter((b) => !roulettePosition(b));
  assert.equal(outside.length, 9);
  assert.ok(outside.every((b) => rouletteTargetClass(b) === 'tapet-outside'));
});
