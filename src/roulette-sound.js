// Short, original synthesized cues. No downloads, autoplay or shared music state.
export function createRouletteSound({ enabled = true, scope = globalThis } = {}) {
  let context, output, noise, resuming;
  let disposed = false,
    generation = 0,
    lastChip = -Infinity;
  const sources = new Set();
  const supported = !!(scope.AudioContext || scope.webkitAudioContext);
  const hidden = () => scope.document?.hidden === true;
  function stop() {
    generation++;
    for (const source of sources) {
      try {
        source.stop();
      } catch {
        /* Already ended. */
      }
    }
    sources.clear();
  }
  async function ready(gesture) {
    if (disposed || !enabled || hidden() || !supported) return null;
    if (!context && gesture) {
      const Audio = scope.AudioContext || scope.webkitAudioContext;
      context = new Audio({ latencyHint: 'interactive' });
      output = context.createGain();
      output.gain.value = 0.12;
      output.connect(context.destination);
    }
    if (!context) return null;
    if (gesture && context.state !== 'running') resuming = context.resume();
    if (resuming) await resuming;
    return !disposed && enabled && !hidden() && context.state === 'running' ? context : null;
  }
  // Failures (blocked audio, unavailable device, old browser) never affect a bet.
  function run(action, gesture = false) {
    const ticket = generation;
    return ready(gesture)
      .then((ctx) => {
        if (ctx && ticket === generation) action(ctx);
      })
      .catch(() => {});
  }
  function voice(source, at, duration, volume) {
    if (sources.size >= 96) return;
    const gain = context.createGain();
    gain.gain.setValueAtTime(0.0001, at);
    gain.gain.exponentialRampToValueAtTime(volume, at + 0.003);
    gain.gain.exponentialRampToValueAtTime(0.0001, at + duration);
    source.connect(gain);
    gain.connect(output);
    sources.add(source);
    source.onended = () => {
      sources.delete(source);
      source.disconnect();
      gain.disconnect();
    };
    source.start(at);
    source.stop(at + duration + 0.01);
  }
  function tone(frequency, at, duration, volume, type = 'sine') {
    const source = context.createOscillator();
    source.type = type;
    source.frequency.setValueAtTime(frequency, at);
    voice(source, at, duration, volume);
  }
  function tap(at, volume = 0.12, frequency = 1100) {
    if (!noise) {
      noise = context.createBuffer(1, Math.ceil(context.sampleRate * 0.045), context.sampleRate);
      const samples = noise.getChannelData(0);
      // Deterministic texture, independent of the roulette result/randomness.
      let seed = 17;
      for (let i = 0; i < samples.length; i++) {
        seed = (seed * 16807) % 2147483647;
        samples[i] = (seed / 2147483647) * 2 - 1;
      }
    }
    const source = context.createBufferSource();
    source.buffer = noise;
    voice(source, at, 0.035, volume);
    tone(frequency, at, 0.055, volume * 0.6, 'triangle');
  }
  return {
    supported,
    prepare: () => run(() => {}, true),
    chip: () =>
      run((ctx) => {
        if (ctx.currentTime - lastChip < 0.04) return;
        lastChip = ctx.currentTime;
        tap(ctx.currentTime + 0.005, 0.16, 1350);
      }, true),
    roll(durationMs) {
      stop();
      return run((ctx) => {
        const seconds = durationMs / 1000;
        // The ball is captured at 76% of the visual animation. Ticks slow before it lands.
        for (let t = 0.035; t < seconds * 0.76;) {
          const progress = t / (seconds * 0.76);
          tap(ctx.currentTime + t, 0.035 + progress * 0.025, 900 - progress * 350);
          t += 0.045 + progress ** 2 * 0.3;
        }
      });
    },
    land() {
      stop();
      return run((ctx) => tap(ctx.currentTime + 0.005, 0.13, 520));
    },
    reward(profit) {
      return run((ctx) => {
        const notes = profit ? [659.25, 830.61, 987.77] : [587.33, 783.99];
        notes.forEach((note, i) => tone(note, ctx.currentTime + i * 0.095, 0.35, 0.13));
      });
    },
    stop,
    setEnabled(value) {
      enabled = value === true;
      if (!enabled) stop();
    },
    dispose() {
      disposed = true;
      stop();
      try {
        context?.close().catch(() => {});
      } catch {
        /* Device already closed. */
      }
    },
  };
}
