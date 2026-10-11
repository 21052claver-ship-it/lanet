import { test } from 'node:test';
import assert from 'node:assert/strict';
import { secondsRemaining, restoreTimer } from '../shared/timer.js';

test('starting or resuming never displays an extra second from a stale render clock', () => {
  assert.equal(secondsRemaining({ running: true, remaining: 1500, end: 1501800 }, 1000), 1500);
  assert.equal(secondsRemaining({ running: true, remaining: 240, end: 241800 }, 1000), 240);
});

test('the countdown uses its deadline and keeps an expired session at zero', () => {
  const timer = { running: true, remaining: 1500, end: 1501800 };
  assert.equal(secondsRemaining(timer, 2800), 1499);
  assert.equal(secondsRemaining(timer, timer.end), 0);
  assert.equal(secondsRemaining(timer, timer.end + 10000), 0);
});

test('pausing preserves the exact remaining duration regardless of the render clock', () => {
  assert.equal(secondsRemaining({ running: false, remaining: 247, end: null }, 999999), 247);
});

const focus = { work: 45, rest: 7, long: 20 };
const cached = {
  phase: 'work',
  round: 2,
  remaining: 247,
  running: true,
  end: 999999,
  sessionId: 'focus-own-session',
  workMinutes: 25,
};

test('a missing or corrupt cache uses the user’s configured duration', () => {
  for (const value of [
    null,
    [],
    'bad',
    { ...cached, remaining: -1 },
    { ...cached, phase: 'unknown' },
    { ...cached, end: 'tomorrow' },
    { ...cached, sessionId: null },
    { ...cached, round: 0 },
  ]) {
    const timer = restoreTimer(value, focus);
    assert.equal(timer.remaining, 2700);
    assert.equal(timer.running, false);
    assert.equal(timer.sessionId, null);
  }
});

test('a restored active or paused session preserves its original reward duration', () => {
  for (const running of [true, false]) {
    const timer = restoreTimer(
      { ...cached, running, task: 'obsolete', subject_id: 'obsolete' },
      focus,
    );
    assert.equal(timer.remaining, 247);
    assert.equal(timer.workMinutes, 25);
    assert.equal(timer.sessionId, cached.sessionId);
    assert.equal(timer.task, '');
    assert.equal(timer.subject_id, '');
    assert.equal(timer.end, running ? 999999 : null);
  }
});

test('a restored break cannot retain a work session or its reward', () => {
  const timer = restoreTimer({ ...cached, phase: 'rest' }, focus);
  assert.equal(timer.sessionId, null);
  assert.equal(timer.workMinutes, null);
  assert.equal(secondsRemaining(timer, 1000000), 0);
});
