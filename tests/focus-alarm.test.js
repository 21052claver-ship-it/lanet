import test from 'node:test';
import assert from 'node:assert/strict';
import { createFocusAlarm } from '../src/focus-alarm.js';
function fixture() {
  const voices = [],
    gains = [];
  class AudioContext {
    constructor() {
      this.state = 'suspended';
      this.currentTime = 10;
      this.destination = {};
    }
    async resume() {
      this.state = 'running';
    }
    async close() {
      this.state = 'closed';
    }
    createOscillator() {
      const v = {
        frequency: { setValueAtTime() {} },
        connect() {},
        disconnect() {},
        start(t) {
          v.started = t;
        },
        stop(t) {
          v.stopped = t;
        },
      };
      voices.push(v);
      return v;
    }
    createGain() {
      const v = {
        gain: {
          setValueAtTime() {},
          linearRampToValueAtTime(v) {
            gains.push(v);
          },
          exponentialRampToValueAtTime() {},
        },
        connect() {},
        disconnect() {},
      };
      return v;
    }
  }
  return { sound: createFocusAlarm({ AudioContext }), voices, gains };
}
test('alarms require a gesture preparation; one cue produces bounded original tones and cancels cleanly', async () => {
  const f = fixture();
  assert.equal(f.sound.schedule(), false);
  assert.equal(f.voices.length, 0);
  assert.equal(await f.sound.prepare(), true);
  assert.equal(f.sound.schedule({ tone: 'bell', volume: 0.5 }), true);
  assert.equal(f.voices.length, 3);
  assert.ok(f.gains.every((g) => g > 0 && g <= 0.18));
  f.sound.cancel();
  assert.ok(f.voices.every((v) => v.stopped === undefined));
  f.sound.dispose();
  assert.equal(await f.sound.prepare(), false);
});
test('muting or an unsupported device is safe and cannot interrupt a timer', async () => {
  const f = fixture();
  await f.sound.prepare();
  assert.equal(f.sound.schedule({ volume: 0 }), false);
  assert.equal(f.voices.length, 0);
  const unsupported = createFocusAlarm({});
  assert.equal(unsupported.supported, false);
  assert.equal(await unsupported.prepare(), false);
  assert.equal(unsupported.schedule(), false);
  f.sound.dispose();
});
