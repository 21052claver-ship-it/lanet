// A cached render timestamp may precede the start click. The display must never
// gain a second at start/resume, and an expired session stops at zero.
export function secondsRemaining(timer, now = Date.now()) {
  return timer.running
    ? Math.min(timer.remaining, Math.max(0, Math.ceil((timer.end - now) / 1000)))
    : timer.remaining;
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
  };
}
