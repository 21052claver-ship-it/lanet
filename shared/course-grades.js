import { weightedGrades } from './domain.js';
import { evaluationKind } from './student-guide.js';

export const BONUS_TYPES = [
  { capacity: 1, maximum: 0.25, label: 'Fins a 0,25 punts' },
  { capacity: 2, maximum: 0.5, label: 'Fins a 0,50 punts' },
];
export const COURSE_WEIGHTS = [33.33, 33.33, 33.34];
export const CUMULATIVE_WEIGHTS = [16.67, 33.33, 50];
export function bonusMaximum(value) {
  const raw = typeof value === 'string' ? value.trim().match(/^\+?(0[.,]\d+)(?=\s|$)/)?.[1] : value;
  const maximum = Number(typeof raw === 'string' ? raw.replace(',', '.') : raw);
  return BONUS_TYPES.some((type) => type.maximum === maximum) ? maximum : null;
}
export function bonusLabel(maximum) {
  return `+${maximum === 0.25 ? '0,25' : '0,50'} punts`;
}
export function parseBonusGrade(raw, maximum) {
  if (raw === null || String(raw).trim() === '') return null;
  const value = Number(String(raw).trim().replace(',', '.'));
  if (!Number.isFinite(value) || value < 0 || value > maximum)
    throw new Error(`La nota del plus ha de ser entre 0 i ${String(maximum).replace('.', ',')}.`);
  return value;
}
export function courseSettingsFor(settings, subjectId) {
  const saved = (settings || []).find((setting) => setting.subject_id === subjectId);
  if (saved) return saved;
  const cumulative = evaluationKind(subjectId) === 'cumulative';
  const weights = cumulative ? CUMULATIVE_WEIGHTS : COURSE_WEIGHTS;
  return {
    subject_id: subjectId,
    equal_terms: cumulative ? 0 : 1,
    term1_weight: weights[0],
    term2_weight: weights[1],
    term3_weight: weights[2],
    limit_to_ten: 1,
  };
}
export function courseGrade(entries, bonuses = [], settings, subjectId = entries[0]?.subject_id) {
  settings = settings ?? courseSettingsFor([], subjectId);
  const equal = settings.equal_terms !== 0 && settings.equal_terms !== false;
  const weights = equal
    ? [1, 1, 1]
    : [settings.term1_weight, settings.term2_weight, settings.term3_weight].map(Number);
  const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
  const terms = [1, 2, 3].map((term, index) => {
    const summary = weightedGrades(entries.filter((entry) => entry.term === term));
    return {
      ...summary,
      term,
      weight: (weights[index] / totalWeight) * 100,
      complete:
        summary.evaluated > 0 &&
        Math.abs(summary.total - 100) < 0.001 &&
        Math.abs(summary.evaluated - summary.total) < 0.001,
    };
  });
  const known = terms.filter((term) => term.weight > 0 && term.mean !== null);
  const evaluatedWeight = known.reduce((sum, term) => sum + term.weight, 0);
  const base =
    evaluatedWeight > 0
      ? known.reduce((sum, term) => sum + term.mean * term.weight, 0) / evaluatedWeight
      : null;
  const earned = bonuses.reduce((sum, bonus) => sum + (bonus.grade ?? 0), 0);
  const pending = bonuses.filter((bonus) => bonus.grade === null).length;
  const capacity = bonuses.reduce((sum, bonus) => sum + bonus.capacity, 0);
  const raw = base === null ? null : base + earned;
  const capped = settings.limit_to_ten !== 0 && settings.limit_to_ten !== false;
  return {
    terms,
    base,
    bonus: earned,
    pending,
    capacity,
    total: raw === null ? null : capped ? Math.min(10, raw) : raw,
    raw,
    limited: capped && raw > 10,
    complete: terms.every((term) => term.weight === 0 || term.complete) && pending === 0,
    knownTerms: known.length,
  };
}
