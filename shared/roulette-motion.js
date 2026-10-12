import { WHEEL } from './roulette.js';

const mod = (n) => ((n % 360) + 360) % 360;
const ease = (t) => 1 - (1 - t) ** 3;
const smooth = (t) => t * t * (3 - 2 * t);

// One clock drives both objects. The last quarter carries the ball in its pocket.
// This is a presentation of the server result, never a source of randomness.
export function rouletteFrame(from, to, result, progress) {
  const t = Math.max(0, Math.min(1, progress));
  const capture = 0.76;
  const pocket = (WHEEL.indexOf(result) * 360) / WHEEL.length;
  const wheel = from + (to - from) * ease(t);
  const captureWheel = from + (to - from) * ease(capture);
  const target = -1440 + mod(captureWheel + pocket);
  let ball;
  if (t < capture) {
    const u = t / capture;
    const startVelocity = -3400 * capture;
    const endVelocity = (to - from) * 3 * (1 - capture) ** 2 * capture;
    ball =
      (u ** 3 - 2 * u * u + u) * startVelocity +
      (-2 * u ** 3 + 3 * u * u) * target +
      (u ** 3 - u * u) * endVelocity;
  } else {
    ball = target + wheel - captureWheel;
  }
  const drop = Math.max(0, Math.min(1, (t - 0.55) / (capture - 0.55)));
  const radius =
    145 +
    39 * smooth(Math.min(1, t / 0.12)) -
    39 * smooth(drop) +
    4 * Math.sin(drop * Math.PI * 4) * Math.sin(drop * Math.PI);
  return { wheel, ball, radius, captured: t >= capture };
}

export const AWARD_MS = 2100;
