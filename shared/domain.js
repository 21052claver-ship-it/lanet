export const DAYS = [
  'Dilluns',
  'Dimarts',
  'Dimecres',
  'Dijous',
  'Divendres',
  'Dissabte',
  'Diumenge',
];
export const PERIODS = ['08:00', '09:00', '10:00', '11:30', '12:30', '13:30'];
export const DAYS_SHORT = ['Dl', 'Dt', 'Dc', 'Dj', 'Dv', 'Ds', 'Dg'];
export const TERM_LABELS = ['1r trimestre', '2n trimestre', '3r trimestre'];
export function madridDay(time = Date.now()) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Madrid',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(time));
}
export function addDays(day, n) {
  const d = new Date(`${day}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}
export function monday(day = madridDay()) {
  return addDays(day, -((new Date(`${day}T12:00:00Z`).getUTCDay() + 6) % 7));
}
export function weekDates(day = madridDay()) {
  return Array.from({ length: 7 }, (_, i) => addDays(monday(day), i));
}
export function timeMinutes(time) {
  return Number(time.slice(0, 2)) * 60 + Number(time.slice(3));
}
export function scheduleBounds(slots) {
  const weekdays = slots.filter((s) => s.day < 5);
  return {
    start: Math.floor(Math.min(480, ...weekdays.map((s) => timeMinutes(s.start))) / 30) * 30,
    end: Math.ceil(Math.max(870, ...weekdays.map((s) => timeMinutes(s.end))) / 30) * 30,
  };
}
export function eventOutsideSchedule(event, dates, bounds) {
  return (
    dates.indexOf(event.date) >= 5 ||
    !!(
      event.start &&
      (timeMinutes(event.start) < bounds.start ||
        timeMinutes(event.start) >= bounds.end ||
        (event.end && timeMinutes(event.end) > bounds.end))
    )
  );
}
export function dateLabel(day, options = { day: 'numeric', month: 'short' }) {
  return new Intl.DateTimeFormat('ca-ES', { ...options, timeZone: 'UTC' }).format(
    new Date(`${day}T12:00:00Z`),
  );
}
export function weightedGrades(rows) {
  const valid = rows.filter(
    (r) => r.grade !== null && r.grade !== '' && Number.isFinite(Number(r.grade)),
  );
  const evaluated = valid.reduce((s, r) => s + Number(r.weight), 0);
  const contribution = valid.reduce((s, r) => s + (Number(r.grade) * Number(r.weight)) / 100, 0);
  return {
    mean: evaluated > 0 ? (contribution * 100) / evaluated : null,
    evaluated,
    total: rows.reduce((s, r) => s + Number(r.weight), 0),
    contribution,
  };
}
export function neededGrade(rows, target = 8) {
  const { total, evaluated, contribution } = weightedGrades(rows);
  return total > evaluated
    ? (((target * total) / 100 - contribution) * 100) / (total - evaluated)
    : null;
}
export function numberLabel(value, digits = 1) {
  return value === null || value === undefined
    ? '—'
    : Number(value).toLocaleString('ca-ES', {
        minimumFractionDigits: digits,
        maximumFractionDigits: digits,
      });
}
export function parseGrade(raw) {
  if (String(raw).trim() === '') return null;
  const n = Number(String(raw).trim().replace(',', '.'));
  if (!Number.isFinite(n) || n < 0 || n > 10) throw new Error('La nota ha de ser entre 0 i 10.');
  return n;
}
export function bannerValue(banner, now = Date.now()) {
  if (!banner) return 1;
  const days = Math.max(
    0,
    Math.floor((now - new Date(banner.created_at + 'Z').getTime()) / 86400000),
  );
  return Math.max(1, Math.ceil(banner.amount * Math.pow(0.9, days)));
}
export function nextBid(banner, now = Date.now()) {
  return banner ? bannerValue(banner, now) * 2 : 1;
}
export function slotConflicts(offerings, slots) {
  const ids = new Set(offerings.map((o) => (typeof o === 'string' ? o : o.id)));
  const selected = slots.filter((s) => ids.has(s.offering_id));
  return selected.flatMap((a, i) =>
    selected
      .slice(i + 1)
      .filter((b) => a.day === b.day && a.start < b.end && b.start < a.end)
      .map((b) => [a, b]),
  );
}
export function safeLink(link) {
  try {
    const u = new URL(link);
    return ['https:', 'http:'].includes(u.protocol) ? u.href : null;
  } catch {
    return null;
  }
}
