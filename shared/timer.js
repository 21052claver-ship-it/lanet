import { madridDay } from './domain.js';
// A cached render timestamp may precede the start click. The display must never
// gain a second at start/resume, and an expired session stops at zero.
export function secondsRemaining(timer, now = Date.now()) {
  return timer.running
    ? Math.min(timer.remaining, Math.max(0, Math.ceil((timer.end - now) / 1000)))
    : timer.remaining;
}

export function pauseTimer(timer, now = Date.now()) {
  return timer.running
    ? { ...timer, running: false, remaining: secondsRemaining(timer, now), end: null }
    : timer;
}

export const phaseMinutes = (phase, focus) =>
  phase === 'work'
    ? focus.work
    : phase === 'long'
      ? focus.long_rest || focus.long || 20
      : focus.rest;
export function advanceTimer(timer, focus, now, automatic, makeId) {
  if (!timer.running || secondsRemaining(timer, now) > 0) return null;
  const completed =
    timer.phase === 'work' && timer.sessionId
      ? {
          id: timer.sessionId,
          subject_id: timer.subject_id || '',
          task: timer.task || '',
          minutes: timer.workMinutes || focus.work,
          day: madridDay(timer.end),
        }
      : null;
  let phase =
    timer.phase === 'work' ? (timer.round % focus.rounds === 0 ? 'long' : 'rest') : 'work';
  let round = timer.phase === 'work' ? timer.round : timer.round + 1;
  let start = timer.end;
  // Resume one real phase after suspension. Never invent completed work for
  // the hours/days in which this page could not observe the timer.
  if (automatic && now - start >= phaseMinutes(phase, focus) * 60000) {
    if (phase !== 'work') round++;
    phase = 'work';
    start = now;
  }
  const remaining = phaseMinutes(phase, focus) * 60;
  return {
    completed,
    timer: {
      ...timer,
      phase,
      round,
      running: automatic,
      remaining,
      end: automatic ? start + remaining * 1000 : null,
      sessionId: automatic && phase === 'work' ? makeId() : null,
      workMinutes: automatic && phase === 'work' ? focus.work : null,
      phaseSeconds: remaining,
    },
  };
}

export const DEFAULT_FOCUS_OPTIONS = {
  mode: 'pomodoro',
  automatic: true,
  alarm: true,
  tone: 'bell',
  alarmVolume: 0.5,
  theme: 'linen',
  visual: 'ring',
  music: true,
  awake: false,
};
export function focusOptions(value) {
  const input = value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  const result = { ...DEFAULT_FOCUS_OPTIONS };
  for (const k of ['automatic', 'alarm', 'music', 'awake'])
    if (typeof input[k] === 'boolean') result[k] = input[k];
  for (const [k, allowed] of Object.entries({
    mode: ['pomodoro', 'free'],
    tone: ['bell', 'soft', 'digital'],
    theme: ['linen', 'forest', 'night'],
    visual: ['ring', 'digital'],
  }))
    if (allowed.includes(input[k])) result[k] = input[k];
  if (typeof input.alarmVolume === 'number' && Number.isFinite(input.alarmVolume))
    result.alarmVolume = Math.max(0, Math.min(1, input.alarmVolume));
  return result;
}

export function restoreTimer(cached, focus) {
  const fresh = {
    phase: 'work',
    round: 1,
    remaining: focus.work * 60,
    running: false,
    task: '',
    subject_id: '',
    end: null,
    sessionId: null,
    workMinutes: null,
  };
  if (
    !cached ||
    typeof cached !== 'object' ||
    Array.isArray(cached) ||
    !['work', 'rest', 'long'].includes(cached.phase) ||
    !Number.isInteger(cached.round) ||
    cached.round < 1 ||
    cached.round > 10000 ||
    !Number.isFinite(cached.remaining) ||
    cached.remaining < 0 ||
    cached.remaining > 7200 ||
    typeof cached.running !== 'boolean' ||
    (cached.running && (!Number.isFinite(cached.end) || cached.end <= 0))
  )
    return fresh;
  const sessionId =
    cached.phase === 'work' &&
    typeof cached.sessionId === 'string' &&
    cached.sessionId.length > 0 &&
    cached.sessionId.length <= 100
      ? cached.sessionId
      : null;
  if (cached.phase === 'work' && cached.running && !sessionId) return fresh;
  return {
    ...fresh,
    phase: cached.phase,
    round: cached.round,
    remaining: cached.remaining,
    running: cached.running,
    end: cached.running ? cached.end : null,
    sessionId,
    workMinutes: sessionId
      ? Number.isInteger(cached.workMinutes) && cached.workMinutes >= 1 && cached.workMinutes <= 120
        ? cached.workMinutes
        : focus.work
      : null,
    ...(Number.isFinite(cached.phaseSeconds) &&
    cached.phaseSeconds >= cached.remaining &&
    cached.phaseSeconds <= 7200
      ? { phaseSeconds: cached.phaseSeconds }
      : {}),
  };
}
