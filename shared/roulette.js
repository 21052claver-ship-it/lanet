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
  if (bet.bets)
    return `${bet.bets.length} posicions · ${bet.bets
      .slice(0, 3)
      .map((b) => BETS_BY_ID[b.id]?.label || b.id)
      .join(', ')}${bet.bets.length > 3 ? '…' : ''}`;
  return bet.kind === 'number' ? `Número ${bet.number}` : bet.kind === 'red' ? 'Vermell' : 'Negre';
}
export function roulettePayout(bet, result) {
  if (bet.bets)
    return bet.bets.reduce(
      (sum, b) =>
        sum +
        (BETS_BY_ID[b.id].numbers.includes(result) ? b.stake * BETS_BY_ID[b.id].multiplier : 0),
      0,
    );
  return (bet.kind === 'number' ? bet.number === result : rouletteColor(result) === bet.kind)
    ? bet.stake * (bet.kind === 'number' ? 36 : 2)
    : 0;
}
export function validateBet(value) {
  if (value && Object.prototype.hasOwnProperty.call(value, 'bets')) return validateTicket(value);
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
// Canonical European table positions. Clients send IDs, never custom coverage or odds.
const catalog = [];
function position(kind, numbers, label) {
  const sorted = [...numbers].sort((a, b) => a - b);
  catalog.push(
    Object.freeze({
      id: `${kind}:${sorted.join('-')}`,
      kind,
      numbers: Object.freeze(sorted),
      label,
      multiplier: 36 / sorted.length,
    }),
  );
}
for (let n = 0; n <= 36; n++) position('number', [n], `Número ${n}`);
for (let n = 1; n <= 36; n++) {
  if (n % 3 !== 0) position('split', [n, n + 1], `Cavall ${n}/${n + 1}`);
  if (n <= 33) position('split', [n, n + 3], `Cavall ${n}/${n + 3}`);
  if (n % 3 === 1) {
    position('street', [n, n + 1, n + 2], `Fila ${n}–${n + 2}`);
    if (n <= 31)
      position(
        'six',
        Array.from({ length: 6 }, (_, i) => n + i),
        `Dues files ${n}–${n + 5}`,
      );
  }
  if (n <= 32 && n % 3 !== 0)
    position('corner', [n, n + 1, n + 3, n + 4], `Cantonada ${n}/${n + 1}/${n + 3}/${n + 4}`);
}
for (let n = 1; n <= 3; n++) position('split', [0, n], `Cavall 0/${n}`);
position('trio', [0, 1, 2], 'Trio 0/1/2');
position('trio', [0, 2, 3], 'Trio 0/2/3');
position('first-four', [0, 1, 2, 3], 'Primers quatre 0/1/2/3');
const range = Array.from({ length: 36 }, (_, i) => i + 1);
for (let c = 1; c <= 3; c++) {
  position(
    'column',
    range.filter((n) => (n - c) % 3 === 0),
    `Columna ${c}`,
  );
  position(
    'dozen',
    range.slice((c - 1) * 12, c * 12),
    `Dotzena ${c} · ${(c - 1) * 12 + 1}–${c * 12}`,
  );
}
position(
  'red',
  range.filter((n) => RED.has(n)),
  'Vermell',
);
position(
  'black',
  range.filter((n) => !RED.has(n)),
  'Negre',
);
position(
  'even',
  range.filter((n) => n % 2 === 0),
  'Parell',
);
position(
  'odd',
  range.filter((n) => n % 2 !== 0),
  'Senar',
);
position('low', range.slice(0, 18), '1–18');
position('high', range.slice(18), '19–36');
export const TABLE_BETS = Object.freeze(catalog);
export const BETS_BY_ID = Object.freeze(Object.fromEntries(catalog.map((b) => [b.id, b])));
export function validateTicket(value) {
  if (
    !value ||
    typeof value !== 'object' ||
    Array.isArray(value) ||
    Object.keys(value).some((k) => !['request_id', 'bets'].includes(k))
  )
    throw Error('Les dades del gir no són vàlides.');
  if (
    typeof value.request_id !== 'string' ||
    !/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(value.request_id)
  )
    throw Error('Falta la referència de l’aposta.');
  if (!Array.isArray(value.bets) || !value.bets.length || value.bets.length > TABLE_BETS.length)
    throw Error('Posa almenys una fitxa al tauler.');
  const ids = new Set();
  const bets = value.bets
    .map((b) => {
      if (
        !b ||
        typeof b !== 'object' ||
        Array.isArray(b) ||
        Object.keys(b).length !== 2 ||
        !Object.prototype.hasOwnProperty.call(BETS_BY_ID, b.id) ||
        !Number.isInteger(b.stake) ||
        b.stake < 1 ||
        b.stake > MAX_STAKE ||
        ids.has(b.id)
      )
        throw Error('Les fitxes del tauler no són vàlides.');
      if (!Object.keys(b).every((k) => ['id', 'stake'].includes(k)))
        throw Error('Les fitxes del tauler no són vàlides.');
      ids.add(b.id);
      return { id: b.id, stake: b.stake };
    })
    .sort((a, b) => a.id.localeCompare(b.id, 'en'));
  if (bets.reduce((s, b) => s + b.stake, 0) > MAX_STAKE)
    throw Error(`El límit total per gir és ${MAX_STAKE} pastissos.`);
  return { request_id: value.request_id.toLowerCase(), bets };
}
export function ticketStake(ticket) {
  return ticket.bets.reduce((s, b) => s + b.stake, 0);
}
