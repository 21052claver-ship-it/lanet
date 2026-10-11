export const WHEEL = Object.freeze([
  0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10, 5, 24, 16, 33, 1, 20, 14,
  31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26,
]);
const RED = new Set([1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36]);
export const MAX_STAKE = 1000;
export const SPIN_MS = 5600;
export function rouletteColor(number) {
  return number === 0 ? 'green' : RED.has(number) ? 'red' : 'black';
}
export function betLabel(bet) {
  return bet.kind === 'number' ? `Número ${bet.number}` : bet.kind === 'red' ? 'Vermell' : 'Negre';
}
export function roulettePayout(bet, result) {
  return (bet.kind === 'number' ? bet.number === result : rouletteColor(result) === bet.kind)
    ? bet.stake * (bet.kind === 'number' ? 36 : 2)
    : 0;
}
export function validateBet(value) {
  if (
    !value ||
    typeof value !== 'object' ||
    Array.isArray(value) ||
    Object.keys(value).some((key) => !['request_id', 'kind', 'number', 'stake'].includes(key))
  )
    throw new Error('Les dades de l’aposta no són vàlides.');
  if (
    typeof value.request_id !== 'string' ||
    !/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(value.request_id)
  )
    throw new Error('Falta la referència de l’aposta.');
  if (
    typeof value.stake !== 'number' ||
    !Number.isInteger(value.stake) ||
    value.stake < 1 ||
    value.stake > MAX_STAKE
  )
    throw new Error(`Aposta entre 1 i ${MAX_STAKE} pastissos sencers.`);
  if (!['red', 'black', 'number'].includes(value.kind))
    throw new Error('Tria vermell, negre o un número.');
  if (
    value.kind === 'number'
      ? !Number.isInteger(value.number) || value.number < 0 || value.number > 36
      : value.number != null
  )
    throw new Error('Tria un número entre 0 i 36.');
  return {
    request_id: value.request_id.toLowerCase(),
    kind: value.kind,
    number: value.kind === 'number' ? value.number : null,
    stake: value.stake,
  };
}
// Rejection sampling avoids modulo bias; every pocket has the same probability.
export function drawRoulette(random = globalThis.crypto) {
  const values = new Uint32Array(1);
  const ceiling = Math.floor(4294967296 / 37) * 37;
  do {
    random.getRandomValues(values);
  } while (values[0] >= ceiling);
  return values[0] % 37;
}
export function wheelRotation(current, number) {
  const index = WHEEL.indexOf(number);
  if (index < 0) throw new Error('Invalid roulette pocket');
  const target = (360 - (index * 360) / WHEEL.length) % 360;
  return current + 360 * 6 + ((target - (current % 360) + 360) % 360);
}
