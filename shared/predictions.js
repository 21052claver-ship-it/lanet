export const PREDICTION_MAX_STAKE = 1000;
export const PREDICTION_MAX_POOL = 1000000;
export const RESOLUTION_SECONDS = 7 * 86400;
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
function object(value, keys) {
  if (
    !value ||
    typeof value !== 'object' ||
    Array.isArray(value) ||
    Object.keys(value).some((k) => !keys.includes(k))
  )
    throw new Error('Revisa les dades de la predicció.');
  if (!uuid.test(value.request_id))
    throw new Error('Falta una referència vàlida per recuperar l’acció.');
}
function text(value, min, max, label) {
  const clean = typeof value === 'string' ? value.trim() : '';
  const length = Array.from(clean).length;
  if (
    typeof value !== 'string' ||
    length < min ||
    length > max ||
    /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(value)
  )
    throw new Error(`${label}: entre ${min} i ${max} caràcters.`);
  return clean;
}
export function validatePrediction(value, now = Math.floor(Date.now() / 1000)) {
  object(value, [
    'request_id',
    'title',
    'option_a',
    'option_b',
    'rules',
    'resolver_id',
    'closes_at',
  ]);
  const title = text(value.title, 8, 140, 'Pregunta');
  const option_a = text(value.option_a, 1, 60, 'Opció A'),
    option_b = text(value.option_b, 1, 60, 'Opció B');
  if (option_a.toLocaleLowerCase() === option_b.toLocaleLowerCase())
    throw new Error('Les opcions A i B han de ser diferents.');
  const rules = text(value.rules, 20, 1200, 'Criteris del resultat');
  const resolver_id = text(value.resolver_id, 1, 80, 'Responsable');
  if (
    !Number.isSafeInteger(value.closes_at) ||
    (now !== null && (value.closes_at < now + 300 || value.closes_at > now + 180 * 86400))
  )
    throw new Error('El termini ha d’estar entre 5 minuts i 180 dies.');
  return {
    request_id: value.request_id.toLowerCase(),
    title,
    option_a,
    option_b,
    rules,
    resolver_id,
    closes_at: value.closes_at,
  };
}
export function validatePredictionBet(value) {
  object(value, ['request_id', 'choice', 'stake']);
  if (!['A', 'B'].includes(value.choice)) throw new Error('Tria A o B.');
  if (!Number.isInteger(value.stake) || value.stake < 1 || value.stake > PREDICTION_MAX_STAKE)
    throw new Error('Aposta entre 1 i 1.000 pastissos enters.');
  return { request_id: value.request_id.toLowerCase(), choice: value.choice, stake: value.stake };
}
export function validatePredictionAction(value) {
  object(value, ['request_id', 'kind', 'choice', 'reason']);
  if (!['accept', 'reject', 'cancel', 'resolve'].includes(value.kind))
    throw new Error('Acció no disponible.');
  if (value.kind === 'resolve' ? !['A', 'B'].includes(value.choice) : value.choice != null)
    throw new Error('Revisa el resultat seleccionat.');
  const reason = value.kind === 'accept' ? '' : text(value.reason, 10, 1000, 'Justificació');
  return {
    request_id: value.request_id.toLowerCase(),
    kind: value.kind,
    choice: value.kind === 'resolve' ? value.choice : null,
    reason,
  };
}
export function predictionStatus(market, now = Math.floor(Date.now() / 1000)) {
  return market.state === 'open' && market.closes_at <= now ? 'closed' : market.state;
}
// Integer largest-remainder apportionment, grouped by participant. This also
// provides a transparent estimate; only the database can settle actual cakes.
export function predictionDistribution(positions, choice) {
  const pot = positions.reduce((sum, p) => sum + p.stake, 0);
  const winning = positions.filter((p) => p.choice === choice).reduce((sum, p) => sum + p.stake, 0);
  if (!winning || !choice) return positions.map((p) => ({ ...p, payout: p.stake }));
  const winners = positions
    .filter((p) => p.choice === choice)
    .map((p) => ({
      ...p,
      payout: Math.floor((p.stake * pot) / winning),
      remainder: (p.stake * pot) % winning,
    }));
  let left = pot - winners.reduce((sum, p) => sum + p.payout, 0);
  winners.sort(
    (a, b) =>
      b.remainder - a.remainder || (a.user_id < b.user_id ? -1 : a.user_id > b.user_id ? 1 : 0),
  );
  const payouts = new Map(winners.map((p) => [p.user_id, p.payout + (left-- > 0 ? 1 : 0)]));
  return positions.map((p) => ({ ...p, payout: payouts.get(p.user_id) || 0 }));
}
