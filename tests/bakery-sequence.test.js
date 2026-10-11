import test from 'node:test';
import assert from 'node:assert/strict';
import {
  bakerySequence,
  bakeryFrame,
  BAKERY_PREPARATION_MS,
  BAKERY_COOKING_MS,
  BAKERY_MOTION_MS,
  BAKERY_STEPS,
} from '../shared/bakery-sequence.js';

function fixture(options = {}, observe) {
  let now = 0,
    id = 0;
  const timers = new Map(),
    frames = [];
  const next = () => [...timers].sort((a, b) => a[1].at - b[1].at)[0];
  const clock = {
    now: () => now,
    setTimeout(fn, delay) {
      const key = ++id;
      timers.set(key, { at: now + delay, fn });
      return key;
    },
    clearTimeout(key) {
      timers.delete(key);
    },
  };
  const cancel = bakerySequence(
    (phase, ready) => {
      frames.push({ at: now, phase, ready });
      observe?.(phase);
    },
    options,
    clock,
  );
  return {
    frames,
    cancel,
    timers,
    tick(ms) {
      const finish = now + ms;
      for (let timer; (timer = next()) && timer[1].at <= finish;) {
        now = timer[1].at;
        timers.delete(timer[0]);
        timer[1].fn();
      }
      now = finish;
    },
    stall(ms) {
      now += ms;
    },
    flushOne() {
      const timer = next();
      if (timer && timer[1].at <= now) {
        timers.delete(timer[0]);
        timer[1].fn();
      }
    },
  };
}
test('Sortir a mig forn cancel·la la preparació i no ofereix un pastís tardà', () => {
  const f = fixture();
  f.tick(2200);
  assert.equal(f.frames.at(-1).phase, 'baking');
  const count = f.frames.length;
  f.cancel();
  f.cancel();
  f.cancel.resume();
  f.tick(BAKERY_PREPARATION_MS * 2);
  assert.equal(f.frames.length, count);
  assert.equal(f.timers.size, 0);
  assert.ok(f.frames.every((x) => !x.ready));
});
test('Moviment reduït ofereix directament; un pastís recollit queda quiet, sense temporitzadors', () => {
  for (const [options, phase, ready] of [
    [{ reduced: true }, 'offering', true],
    [{ claimed: true }, 'claimed', false],
    [{ claimed: true, reduced: true }, 'claimed', false],
  ]) {
    const f = fixture(options);
    f.cancel.pause();
    f.cancel.resume();
    f.tick(BAKERY_PREPARATION_MS * 2);
    assert.equal(f.frames.length, 1);
    assert.equal(f.frames[0].phase, phase);
    assert.equal(f.frames[0].ready, ready);
    assert.equal(f.timers.size, 0);
  }
});
test('L’oferta només arriba al final de tota la preparació i una sola vegada', () => {
  const f = fixture();
  f.tick(BAKERY_PREPARATION_MS - 1);
  assert.ok(f.frames.every((x) => !x.ready));
  f.tick(1);
  assert.equal(f.frames.at(-1).phase, 'offering');
  assert.equal(f.frames.at(-1).ready, true);
  assert.equal(f.frames.at(-1).at, 7200);
  f.tick(BAKERY_PREPARATION_MS * 2);
  assert.equal(f.frames.filter((x) => x.ready).length, 1);
  assert.equal(f.timers.size, 0);
});
test('Cinc estats simples: quatre segons de cocció i presentació completa abans de recollir', () => {
  const f = fixture();
  f.tick(BAKERY_PREPARATION_MS);
  const at = (phase) => f.frames.find((x) => x.phase === phase).at;
  assert.equal(BAKERY_PREPARATION_MS, 7200);
  assert.equal(BAKERY_COOKING_MS, 4000);
  assert.equal(at('resting') - at('baking'), BAKERY_COOKING_MS);
  assert.ok(at('baking') - at('warming') >= BAKERY_MOTION_MS.heat);
  assert.equal(at('offering') - at('presenting'), BAKERY_MOTION_MS.present);
  assert.ok(at('presenting') - at('resting') >= BAKERY_MOTION_MS.heat);
  assert.deepEqual(
    f.frames.map(({ phase }) => phase),
    ['warming', 'baking', 'resting', 'presenting', 'offering'],
  );
  assert.deepEqual(
    BAKERY_STEPS.map(([, phase]) => phase),
    f.frames.map(({ phase }) => phase),
  );
});
test('Ocultar la pestanya pausa el gest pendent i reprendre conserva el temps restant', () => {
  const f = fixture();
  f.tick(2100);
  f.cancel.pause();
  f.cancel.pause();
  const count = f.frames.length;
  f.tick(60000);
  assert.equal(f.frames.length, count);
  assert.equal(f.timers.size, 0);
  f.cancel.resume();
  f.cancel.resume();
  assert.equal(f.timers.size, 1);
  f.tick(2699);
  assert.equal(f.frames.at(-1).phase, 'baking');
  f.tick(1);
  assert.equal(f.frames.at(-1).phase, 'resting');
  f.tick(BAKERY_PREPARATION_MS - 4800);
  assert.equal(f.frames.at(-1).at, BAKERY_PREPARATION_MS + 60000);
  assert.equal(f.frames.at(-1).ready, true);
  assert.equal(new Set(f.frames.map((x) => x.phase)).size, f.frames.length);
});
test('Una escena oberta en una pestanya oculta espera abans de començar', () => {
  const f = fixture({ paused: true });
  f.tick(90000);
  assert.equal(f.frames.length, 1);
  assert.equal(f.timers.size, 0);
  f.cancel.resume();
  f.tick(799);
  assert.equal(f.frames.length, 1);
  f.tick(1);
  assert.equal(f.frames.at(-1).phase, 'baking');
});
test('Sortir amb l’escena pausada impedeix reprendre-la després', () => {
  const f = fixture();
  f.tick(4000);
  f.cancel.pause();
  const count = f.frames.length;
  f.cancel();
  f.cancel.resume();
  f.cancel.pause();
  f.tick(120000);
  assert.equal(f.frames.length, count);
  assert.equal(f.timers.size, 0);
});
test('Un callback endarrerit no escurça la cocció ni ofereix el pastís de cop', () => {
  const f = fixture();
  f.stall(40000);
  f.flushOne();
  assert.equal(f.frames.at(-1).phase, 'baking');
  assert.equal(f.frames.length, 2);
  f.flushOne();
  assert.equal(f.frames.length, 2);
  f.tick(BAKERY_COOKING_MS - 1);
  assert.equal(f.frames.length, 2);
  f.tick(1);
  assert.equal(f.frames.at(-1).phase, 'resting');
  f.tick(BAKERY_PREPARATION_MS - 4800);
  assert.equal(f.frames.at(-1).phase, 'offering');
  assert.ok(f.frames.at(-1).at >= 40000 + BAKERY_PREPARATION_MS - 800);
});
test('El pastís només apareix al taulell després de coure i no es duplica dins del forn', () => {
  const f = fixture();
  f.tick(BAKERY_PREPARATION_MS);
  for (const { phase, ready } of f.frames) {
    const frame = bakeryFrame(phase);
    assert.ok(!(frame.cooking && frame.onCounter), phase);
    assert.ok(!(frame.ovenFilled && frame.onCounter), phase);
    assert.equal(frame.ready, ready);
    if (frame.onCounter) assert.ok(frame.cooked);
    if (ready) assert.ok(frame.onCounter && !frame.preparing);
  }
  const claimed = bakeryFrame('claimed');
  assert.ok(!claimed.ready && !claimed.onCounter && !claimed.ovenFilled && !claimed.preparing);
});

test('Sortir en qualsevol punt de preparació impedeix una recollida tardana', () => {
  for (const at of [0, 799, 800, 4799, 4800, 6199, 6200, 7199]) {
    const f = fixture();
    f.tick(at);
    f.cancel();
    const count = f.frames.length;
    f.tick(60000);
    assert.equal(f.frames.length, count, `sortida a ${at}ms`);
    assert.equal(f.timers.size, 0);
    assert.ok(f.frames.every((frame) => !frame.ready));
  }
});

test('Dues pauses, durant cocció i presentació, conserven el temps visible i una sola oferta', () => {
  const f = fixture();
  f.tick(2300);
  f.cancel.pause();
  f.tick(12000);
  f.cancel.resume();
  f.tick(4200);
  assert.equal(f.frames.at(-1).phase, 'presenting');
  f.cancel.pause();
  f.tick(60000);
  f.cancel.resume();
  f.tick(699);
  assert.ok(f.frames.every((frame) => !frame.ready));
  f.tick(1);
  assert.equal(f.frames.at(-1).at, BAKERY_PREPARATION_MS + 72000);
  assert.equal(f.frames.filter((frame) => frame.ready).length, 1);
  assert.equal(f.timers.size, 0);
});
