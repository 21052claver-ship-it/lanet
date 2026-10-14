import test from 'node:test';
import assert from 'node:assert/strict';
import { installAudioProbeMeter } from './helpers/audio-probe.js';

test('Invalid analyser frames remain recorded and cannot poison a later native signal', () => {
  const root = {},
    probe = { peak: 0, lastPeak: 0, invalidFrames: 0, finiteFrames: 0 };
  installAudioProbeMeter(root);
  for (const invalid of [NaN, Infinity, -Infinity]) {
    assert.equal(root.measureAudioFrame(probe, [0, invalid]), false);
    assert.equal(probe.peak, 0);
  }
  assert.equal(root.measureAudioFrame(probe, new Float32Array([0, -0.125, 0.25])), true);
  assert.equal(probe.peak, 0.25);
  assert.equal(probe.invalidFrames, 3);
  assert.equal(probe.finiteFrames, 1);
  root.measureAudioFrame(probe, [0, 0]);
  assert.equal(probe.lastPeak, 0);
  assert.equal(probe.peak, 0.25);
});

test('Invalid or silent frames alone never satisfy the audibility threshold', () => {
  const root = {},
    probe = { peak: 0, lastPeak: 0, invalidFrames: 0, finiteFrames: 0 };
  installAudioProbeMeter(root);
  for (let i = 0; i < 20; i++) root.measureAudioFrame(probe, [NaN, NaN]);
  root.measureAudioFrame(probe, new Float32Array(256));
  assert.equal(probe.peak > 0.00001, false);
  assert.equal(probe.invalidFrames, 20);
  assert.equal(probe.finiteFrames, 1);
});
