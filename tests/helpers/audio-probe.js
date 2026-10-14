// Serializable Playwright initializer: retain evidence of invalid analyser frames
// without allowing one NaN to poison every subsequent audibility measurement.
export function installAudioProbeMeter(root = globalThis) {
  root.measureAudioFrame = (probe, samples) => {
    let peak = 0;
    for (const value of samples) {
      if (!Number.isFinite(value)) {
        probe.invalidFrames++;
        probe.lastPeak = 0;
        return false;
      }
      peak = Math.max(peak, Math.abs(value));
    }
    probe.finiteFrames++;
    probe.lastPeak = peak;
    probe.peak = Math.max(probe.peak, peak);
    return true;
  };
}
