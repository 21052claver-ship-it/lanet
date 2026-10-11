import { matchesSearch } from './search.js';

export const PAU_YEARS = [2026, 2027];
export const PAU_SUBJECT_IDS = [
  'analysis',
  'performing',
  'biology',
  'general-science',
  'choir',
  'art-drawing',
  'technical-drawing',
  'design-drawing',
  'design',
  'physics',
  'art-foundations',
  'business',
  'geography',
  'geology',
  'music-history',
  'art-history',
  'spanish-literature',
  'catalan-literature',
  'drama',
  'greek',
  'latin',
  'math',
  'social-math',
  'cultural-movements',
  'chemistry',
  'graphic-expression',
  'technology',
];
export const MODALITY_IDS = [
  'math',
  'social-math',
  'latin',
  'analysis',
  'performing',
  'general-science',
  'art-drawing',
];
export const COMMON_EXAMS = ['catalan', 'spanish', 'foreign', 'history'];
export function emptyPau() {
  return {
    route: 'batx',
    year: 2027,
    accessMode: 'summary',
    average: null,
    general: null,
    exams: { catalan: null, spanish: null, foreign: null, history: null },
    modality: 'math',
    modalityGrade: null,
    modalityYear: 2027,
    subjects: [],
    selected: '',
    topFive: [],
    orientationSource: 'grades',
  };
}
export function pauMark(raw) {
  if (raw === null || raw === '') return null;
  if (!['number', 'string'].includes(typeof raw)) throw new Error('Escriu una nota entre 0 i 10.');
  const text = String(raw).trim().replace(',', '.');
  if (!/^\d{1,2}(?:\.\d{1,3})?$/.test(text) || Number(text) > 10)
    throw new Error('Escriu una nota entre 0 i 10, amb un màxim de tres decimals.');
  return Number(text);
}
const object = (v) => v && typeof v === 'object' && !Array.isArray(v);
function keys(value, allowed) {
  if (!object(value) || Object.keys(value).some((k) => !allowed.includes(k)))
    throw new Error('Dades de PAU no vàlides.');
}
export function validatePau(raw) {
  const defaults = emptyPau();
  keys(raw, Object.keys(defaults));
  const v = { ...defaults, ...raw };
  if (
    !['batx', 'cfgs'].includes(v.route) ||
    !PAU_YEARS.includes(v.year) ||
    !['summary', 'exams'].includes(v.accessMode) ||
    !MODALITY_IDS.includes(v.modality)
  )
    throw new Error('Tria opcions de PAU vàlides.');
  const examYear = (y) => Number.isInteger(y) && y >= 2024 && y <= 2027;
  if (!examYear(v.modalityYear)) throw new Error('L’any de l’examen no és vàlid.');
  keys(v.exams, COMMON_EXAMS);
  v.exams = Object.fromEntries(COMMON_EXAMS.map((k) => [k, pauMark(v.exams[k] ?? null)]));
  v.average = pauMark(v.average);
  v.general = pauMark(v.general);
  v.modalityGrade = pauMark(v.modalityGrade);
  if (typeof v.selected !== 'string' || (v.selected && !/^\d{5}$/.test(v.selected)))
    throw new Error('El grau no és vàlid.');
  if (raw.topFive === undefined && v.selected) v.topFive = [v.selected];
  if (
    !Array.isArray(v.topFive) ||
    v.topFive.length > 5 ||
    v.topFive.some((code) => typeof code !== 'string' || !/^\d{5}$/.test(code)) ||
    new Set(v.topFive).size !== v.topFive.length
  )
    throw new Error('Tria fins a cinc graus diferents per al teu top 5.');
  v.topFive = [...v.topFive];
  if (!['grades', 'simulation'].includes(v.orientationSource))
    throw new Error('Tria una base d’orientació vàlida.');
  if (!Array.isArray(v.subjects) || v.subjects.length > 3)
    throw new Error('Pots afegir fins a tres matèries de la fase d’admissió.');
  const seen = new Set(v.route === 'batx' ? [v.modality] : []);
  v.subjects = v.subjects.map((s) => {
    keys(s, ['id', 'grade', 'year']);
    if (!PAU_SUBJECT_IDS.includes(s.id) || seen.has(s.id) || !examYear(s.year))
      throw new Error('Tria matèries diferents i un any d’examen vàlid.');
    seen.add(s.id);
    return { id: s.id, grade: pauMark(s.grade), year: s.year };
  });
  return v;
}
export const roundPau = (n) =>
  Math.round((n + Number.EPSILON * Math.max(1, Math.abs(n))) * 1000) / 1000;
const millis = (n) => Math.round(n * 1000);
export function pauAccess(v) {
  if (v.average === null)
    return {
      value: null,
      phase: null,
      eligible: false,
      reason: 'Introdueix la mitjana del batxillerat o del CFGS.',
    };
  if (v.route === 'cfgs')
    return {
      value: v.average,
      phase: null,
      eligible: v.average >= 5,
      reason: v.average >= 5 ? '' : 'Cal haver superat el CFGS (mitjana mínima de 5).',
    };
  let phase = v.general;
  if (v.accessMode === 'exams') {
    const marks = [...COMMON_EXAMS.map((k) => v.exams[k]), v.modalityGrade];
    phase = marks.every((n) => n !== null)
      ? Math.round(marks.reduce((sum, n) => sum + millis(n), 0) / 5) / 1000
      : null;
  }
  if (phase === null)
    return {
      value: null,
      phase: null,
      eligible: false,
      reason: 'Completa la nota de la fase d’accés.',
    };
  // Integer thousandths avoid floating-point drift at an admission boundary.
  const value = Math.round((millis(v.average) * 6 + millis(phase) * 4) / 10) / 1000;
  const eligible = v.average >= 5 && phase >= 4 && value >= 5;
  return {
    value,
    phase,
    eligible,
    reason:
      v.average < 5
        ? 'Cal haver superat el batxillerat.'
        : phase < 4
          ? 'La fase d’accés ha de ser com a mínim un 4.'
          : value < 5
            ? 'La nota d’accés ha de ser com a mínim un 5.'
            : '',
  };
}
export function pauAdmission(v, degree, round = 'latest') {
  const access = pauAccess(v),
    weights = degree.weights[String(v.year)];
  const available = !!weights;
  const candidates = [...v.subjects];
  if (v.route === 'batx')
    candidates.push({ id: v.modality, grade: v.modalityGrade, year: v.modalityYear });
  const contributions = candidates
    .map((s) => ({
      ...s,
      weight: weights?.[s.id] || 0,
      valid: s.year <= v.year && v.year - s.year <= 2,
      points:
        s.grade !== null && s.grade >= 5 && s.year <= v.year && v.year - s.year <= 2
          ? (weights?.[s.id] || 0) * s.grade
          : 0,
    }))
    .sort((a, b) => b.points - a.points || a.id.localeCompare(b.id));
  const best = contributions.filter((s) => s.points > 0).slice(0, 2);
  const bonus =
    Math.round(best.reduce((sum, s) => sum + millis(s.grade) * Math.round(s.weight * 10), 0) / 10) /
    1000;
  const total =
    access.eligible && available
      ? Math.min(14000, millis(access.value) + millis(bonus)) / 1000
      : null;
  const cutoff = round === 'first' ? degree.firstCutoff : degree.cutoff;
  const known = typeof cutoff === 'number';
  return {
    access,
    available,
    contributions,
    best,
    bonus,
    total,
    cutoff: known ? cutoff : null,
    reaches: total !== null && known ? total >= cutoff : null,
    gap: total !== null && known ? (millis(total) - millis(cutoff)) / 1000 : null,
    potential:
      access.eligible && available
        ? roundPau(
            Math.min(
              14,
              access.value +
                Object.values(weights)
                  .sort((a, b) => b - a)
                  .slice(0, 2)
                  .reduce((sum, w) => sum + w * 10, 0),
            ),
          )
        : null,
  };
}
export function findPauDegrees(
  degrees,
  v,
  { query = '', career = '', university = '', onlyEligible = false, round = 'latest' } = {},
) {
  return degrees
    .filter(
      (d) =>
        (!career || d.career === career) &&
        (!university || d.university.split(/\s*\/\s*/).includes(university)) &&
        matchesSearch(query, d.name, d.university, d.campus, d.code),
    )
    .map((degree) => ({ degree, result: pauAdmission(v, degree, round) }))
    .filter((r) => !onlyEligible || r.result.reaches === true)
    .sort(
      (a, b) =>
        (b.result.cutoff ?? -1) - (a.result.cutoff ?? -1) ||
        a.degree.name.localeCompare(b.degree.name, 'ca') ||
        a.degree.code.localeCompare(b.degree.code),
    );
}
export function recommendPauDegrees(rows, career) {
  if (!career) return null;
  return rows.find((r) => r.degree.career === career && r.result.reaches === true) || null;
}
