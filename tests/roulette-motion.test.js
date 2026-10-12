import test from 'node:test';
import assert from 'node:assert/strict';
import { rouletteFrame } from '../shared/roulette-motion.js';
import { WHEEL, wheelRotation } from '../shared/roulette.js';

test('ball finishes inside the selected pocket for every number and repeated rotations', () => {
  for (const from of [0, 2307, 49182.4])
    for (const number of WHEEL) {
      const to = wheelRotation(from, number);
      const end = rouletteFrame(from, to, number, 1);
      const pocket = (WHEEL.indexOf(number) * 360) / 37;
      const difference = (((end.ball - end.wheel - pocket) % 360) + 360) % 360;
      assert.ok(Math.min(difference, 360 - difference) < 1e-8);
      assert.ok(Math.min(Math.abs(end.ball % 360), 360 - Math.abs(end.ball % 360)) < 1e-8);
      assert.equal(end.radius, 145);
      assert.equal(end.wheel, to);
    }
});

test('capture is continuous in position and velocity; ball moves with its pocket afterwards', () => {
  for (const number of WHEEL) {
    const to = wheelRotation(0, number),
      e = 1e-6;
    const a = rouletteFrame(0, to, number, 0.76 - e);
    const b = rouletteFrame(0, to, number, 0.76);
    const c = rouletteFrame(0, to, number, 0.76 + e);
    assert.ok(Math.abs(b.ball - a.ball) < 0.01);
    assert.ok(Math.abs((b.ball - a.ball) / e - (c.ball - b.ball) / e) < 0.1);
    assert.ok(Math.abs(b.radius - a.radius) < 0.001);
    for (const t of [0.8, 0.9, 1]) {
      const f = rouletteFrame(0, to, number, t);
      assert.ok(Math.abs(f.ball - b.ball - (f.wheel - b.wheel)) < 1e-9);
    }
    assert.ok(rouletteFrame(0, to, number, 0.01).ball < 0);
  }
});
