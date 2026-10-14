// Original short oscillator cues; no downloads or interference with music.
export function createFocusAlarm(scope = globalThis) {
  let context,
    disposed = false,
    generation = 0;
  const voices = new Set();
  const supported = !!(scope.AudioContext || scope.webkitAudioContext);
  function cancel() {
    generation++;
    for (const voice of voices)
      try {
        voice.stop();
      } catch {}
    voices.clear();
  }
  async function prepare() {
    if (disposed || !supported) return false;
    try {
      if (!context) context = new (scope.AudioContext || scope.webkitAudioContext)();
      if (context.state !== 'running') await context.resume();
      return !disposed && context.state === 'running';
    } catch {
      return false;
    }
  }
  function schedule({ delay = 0, phase = 'rest', tone = 'bell', volume = 0.5 } = {}) {
    cancel();
    if (disposed || !context || context.state !== 'running' || volume <= 0) return false;
    const ticket = generation,
      start = context.currentTime + Math.max(0, delay) + 0.02;
    const notes =
      tone === 'digital'
        ? [880, 880, 1174.66]
        : tone === 'soft'
          ? [523.25, 659.25]
          : [659.25, 830.61, 987.77];
    if (phase === 'work') notes.reverse();
    notes.forEach((frequency, i) => {
      const voice = context.createOscillator(),
        gain = context.createGain();
      const at = start + i * 0.23,
        duration = tone === 'digital' ? 0.15 : 0.7;
      voice.type = tone === 'soft' ? 'sine' : 'triangle';
      voice.frequency.setValueAtTime(frequency, at);
      gain.gain.setValueAtTime(0, at);
      gain.gain.linearRampToValueAtTime(Math.min(1, volume) * 0.18, at + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001, at + duration);
      voice.connect(gain);
      gain.connect(context.destination);
      voices.add(voice);
      voice.onended = () => {
        voices.delete(voice);
        voice.disconnect();
        gain.disconnect();
      };
      if (ticket === generation) {
        voice.start(at);
        voice.stop(at + duration + 0.02);
      }
    });
    return true;
  }
  return {
    supported,
    prepare,
    schedule,
    cancel,
    dispose() {
      disposed = true;
      cancel();
      try {
        context?.close().catch(() => {});
      } catch {}
    },
  };
}
