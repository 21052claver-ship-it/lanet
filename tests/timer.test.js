import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  secondsRemaining,
  pauseTimer,
  restoreTimer,
  advanceTimer,
  focusOptions,
} from '../shared/timer.js';
import { madridDay } from '../shared/domain.js';

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
const settings = { work: 25, rest: 5, long_rest: 15, rounds: 4 };
const working = {
  phase: 'work',
  round: 1,
  running: true,
  end: 1000000,
  remaining: 1500,
  sessionId: 'real-session',
  workMinutes: 25,
};
test('automatic cycles follow exact deadlines, record only work and use long breaks every four sessions', () => {
  let next = advanceTimer(working, settings, 1000600, true, () => 'next-session');
  assert.equal(next.completed.id, 'real-session');
  assert.equal(next.completed.minutes, 25);
  assert.equal(next.completed.day, madridDay(working.end));
  assert.equal(next.timer.phase, 'rest');
  assert.equal(next.timer.running, true);
  assert.equal(next.timer.end, 1300000);
  assert.equal(secondsRemaining(next.timer, 1000600), 300);
  assert.equal(next.timer.sessionId, null);
  next = advanceTimer(next.timer, settings, 1300100, true, () => 'next-session');
  assert.equal(next.completed, null);
  assert.equal(next.timer.phase, 'work');
  assert.equal(next.timer.round, 2);
  assert.equal(next.timer.sessionId, 'next-session');
  assert.equal(next.timer.end, 2800000);
  next = advanceTimer({ ...working, round: 4 }, settings, 1000000, true, () => 'unused');
  assert.equal(next.timer.phase, 'long');
  assert.equal(next.timer.remaining, 900);
  assert.equal(
    advanceTimer({ ...working, round: 5 }, settings, 1000000, true, () => 'unused').timer.phase,
    'rest',
  );
});
test('manual continuation stops on the next phase; paused and unfinished timers do not advance', () => {
  const next = advanceTimer(working, settings, 1000000, false, () => 'unused');
  assert.equal(next.timer.running, false);
  assert.equal(next.timer.phase, 'rest');
  assert.equal(next.timer.end, null);
  assert.equal(
    advanceTimer({ ...working, running: false }, settings, 9999999, true, () => 'unused'),
    null,
  );
  assert.equal(
    advanceTimer(working, settings, 999000, true, () => 'unused'),
    null,
  );
});
test('suspension never invents additional completed work or cascades alarms for unseen cycles', () => {
  const next = advanceTimer(working, settings, 1000000 + 86400000, true, () => 'fresh');
  assert.equal(next.completed.id, 'real-session');
  assert.equal(next.timer.phase, 'work');
  assert.equal(next.timer.round, 2);
  assert.equal(next.timer.sessionId, 'fresh');
  assert.equal(next.timer.remaining, 1500);
  assert.equal(next.timer.end, 1000000 + 86400000 + 1500000);
  const resumedBreak = advanceTimer(
    { ...working, phase: 'long', sessionId: null },
    settings,
    1000000 + 86400000,
    true,
    () => 'fresh',
  );
  assert.equal(resumedBreak.completed, null);
  assert.equal(resumedBreak.timer.phase, 'work');
  assert.equal(resumedBreak.timer.remaining, 1500);
});
test('changing future settings preserves the duration of the completed work session', () => {
  const next = advanceTimer(
    working,
    { ...settings, work: 50, rest: 10 },
    1000000,
    true,
    () => 'fresh',
  );
  assert.equal(next.completed.minutes, 25);
  assert.equal(next.timer.remaining, 600);
});
test('focus options are bounded and malformed preferences cannot disable required defaults', () => {
  assert.equal(focusOptions(null).automatic, true);
  assert.equal(focusOptions({ alarm: 'no' }).alarm, true);
  assert.equal(focusOptions({ tone: 'unknown' }).tone, 'bell');
  assert.equal(focusOptions({ alarmVolume: 99 }).alarmVolume, 1);
  assert.equal(focusOptions({ alarmVolume: NaN }).alarmVolume, 0.5);
  assert.equal(focusOptions({ automatic: false, theme: 'night' }).automatic, false);
});

test('free study pauses work and breaks without resetting or awarding a session', () => {
  for (const phase of ['work', 'rest', 'long']) {
    const active = { ...working, phase };
    const paused = pauseTimer(active, active.end - 37000);
    assert.deepEqual(paused, { ...active, running: false, remaining: 37, end: null });
    assert.equal(
      advanceTimer(paused, settings, active.end + 86400000, true, () => 'unused'),
      null,
    );
    assert.equal(pauseTimer(paused, active.end + 86400000), paused);
    assert.equal(active.running, true);
  }
  assert.equal(pauseTimer(working, working.end + 1).remaining, 0);
});

test('new focus preferences keep sound on while explicit silence and old preferences survive', () => {
  const defaults = focusOptions(null);
  assert.equal(defaults.mode, 'pomodoro');
  assert.equal(defaults.alarm, true);
  assert.ok(defaults.alarmVolume > 0);
  assert.equal(defaults.music, true);
  assert.equal(focusOptions({ mode: 'free' }).mode, 'free');
  assert.equal(focusOptions({ mode: 'bad' }).mode, 'pomodoro');
  const saved = focusOptions({ alarm: false, alarmVolume: 0, music: false });
  assert.equal(saved.alarm, false);
  assert.equal(saved.alarmVolume, 0);
  assert.equal(saved.music, false);
  assert.equal(saved.mode, 'pomodoro');
});
