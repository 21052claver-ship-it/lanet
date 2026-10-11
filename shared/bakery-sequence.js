export const BAKERY_PREPARATION_MS = 7200;
export const BAKERY_COOKING_MS = 4000;

// Only the oven and the cake move. The baker is a single still illustration.
export const BAKERY_MOTION_MS = Object.freeze({
  entry: 650,
  reveal: 450,
  present: 1000,
  heat: 700,
  fade: 400,
});

// Four seconds of visible cooking, then a quiet rest and one cake reveal.
export const BAKERY_STEPS = Object.freeze(
  [
    [0, 'warming'],
    [800, 'baking'],
    [800 + BAKERY_COOKING_MS, 'resting'],
    [6200, 'presenting'],
    [BAKERY_PREPARATION_MS, 'offering'],
  ].map((step) => Object.freeze(step)),
);

const filled = new Set(['warming', 'baking', 'resting']);
const onCounter = new Set(['presenting', 'offering']);
const cooked = new Set(['resting', 'presenting', 'offering']);

export function bakeryFrame(phase) {
  return {
    phase,
    ready: phase === 'offering',
    cooking: phase === 'baking',
    warming: phase === 'warming',
    ovenFilled: filled.has(phase),
    cooked: cooked.has(phase),
    onCounter: onCounter.has(phase),
    preparing: !['offering', 'claimed'].includes(phase),
  };
}

export function bakerySequence(
  update,
  { claimed = false, reduced = false, paused: initiallyPaused = false } = {},
  clock = {
    setTimeout: (fn, delay) => setTimeout(fn, delay),
    clearTimeout: (timer) => clearTimeout(timer),
    now: () => performance.now(),
  },
) {
  let cancelled = false;
  let paused = initiallyPaused;
  let timer = null;
  let index = 1;
  let elapsed = 0;
  let anchor = clock.now();
  const staticFrame = claimed || reduced;
  function schedule() {
    if (cancelled || paused || staticFrame || index >= BAKERY_STEPS.length) return;
    anchor = clock.now();
    const [at, phase] = BAKERY_STEPS[index];
    timer = clock.setTimeout(
      () => {
        timer = null;
        if (cancelled || paused) return;
        elapsed = at;
        index++;
        anchor = clock.now();
        // Delayed callbacks cannot skip the visible cooking or reveal.
        update(phase, phase === 'offering');
        schedule();
      },
      Math.max(0, at - elapsed),
    );
  }
  function cancel() {
    cancelled = true;
    clock.clearTimeout(timer);
  }
  cancel.pause = () => {
    if (cancelled || paused || staticFrame || index >= BAKERY_STEPS.length) return;
    elapsed = Math.min(BAKERY_STEPS[index][0], elapsed + Math.max(0, clock.now() - anchor));
    paused = true;
    clock.clearTimeout(timer);
    timer = null;
  };
  cancel.resume = () => {
    if (cancelled || !paused) return;
    paused = false;
    schedule();
  };
  if (claimed) update('claimed', false);
  else if (reduced) update('offering', true);
  else {
    update('warming', false);
    schedule();
  }
  return cancel;
}
