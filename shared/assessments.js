import { distributeWeights } from './weights.js';
export const ASSESSMENT_TYPES = Object.freeze([
  { key: 'partial1', label: 'Parcial 1', category: 'exam' },
  { key: 'partial2', label: 'Parcial 2', category: 'exam' },
  { key: 'term', label: 'Trimestral', category: 'exam' },
  { key: 'writing', label: 'Redacció', plural: 'Redaccions', category: 'activity', slots: 3 },
  { key: 'assignment', label: 'Entrega', plural: 'Entregues', category: 'activity', slots: 3 },
  {
    key: 'presentation',
    label: 'Presentació',
    plural: 'Presentacions',
    category: 'activity',
    slots: 3,
  },
  { key: 'other_exam', label: 'Altra prova', plural: 'Altres proves', category: 'exam' },
  {
    key: 'other_activity',
    label: 'Altra activitat',
    plural: 'Altres activitats',
    category: 'activity',
  },
]);
export const MAIN_ASSESSMENTS = ['partial1', 'partial2', 'term'];
export const OPTIONAL_ASSESSMENTS = ASSESSMENT_TYPES.filter((type) => type.slots);
export function assessmentType(row) {
  if (ASSESSMENT_TYPES.some((type) => type.key === row.assessment_type)) return row.assessment_type;
  const title = (row.title || '').trim().toLocaleLowerCase('ca');
  if (row.category === 'exam') {
    if (['prova 1', 'parcial 1'].includes(title)) return 'partial1';
    if (['prova 2', 'parcial 2'].includes(title)) return 'partial2';
    if (['trimestral', 'examen trimestral'].includes(title)) return 'term';
    return 'other_exam';
  }
  if (/^redacció(?:\s|$)/.test(title)) return 'writing';
  if (/^entrega(?:\s|$)/.test(title)) return 'assignment';
  if (/^presentació(?:\s|$)/.test(title)) return 'presentation';
  return 'other_activity';
}
export function assessmentDefinition(key) {
  return ASSESSMENT_TYPES.find((type) => type.key === key);
}
export function defaultAssessments(weights = [30, 30, 40]) {
  const examWeights =
    weights.length === 4 ? [weights[0], weights[1], weights[2] + weights[3]] : weights;
  const entries = MAIN_ASSESSMENTS.map((key, i) => ({
    assessment_type: key,
    category: 'exam',
    title: assessmentDefinition(key).label,
    weight: examWeights[i],
    grade: null,
    date: null,
  }));
  for (const type of OPTIONAL_ASSESSMENTS)
    for (let n = 1; n <= type.slots; n++)
      entries.push({
        assessment_type: type.key,
        category: 'activity',
        title: `${type.label} ${n}`,
        weight: 0,
        grade: null,
        date: null,
      });
  return entries.map((entry, position) => ({ ...entry, position }));
}
export function activeAssessment(row) {
  return (
    Number(row.weight) > 0 || (row.grade !== null && row.grade !== '' && row.grade !== undefined)
  );
}
export function equalActiveAssessmentWeights(entries) {
  const indices = entries.flatMap((row, index) =>
    activeAssessment({ ...row, grade: row.raw === undefined ? row.grade : row.raw }) ? [index] : [],
  );
  const weights = new Map(
    distributeWeights(indices.map((index) => entries[index])).map((row, i) => [
      indices[i],
      row.weight,
    ]),
  );
  return entries.map((row, index) => ({ ...row, weight: weights.get(index) ?? 0 }));
}
export function restoreAssessments(previous, templates) {
  const used = new Set();
  const restored = templates.map((template) => {
    const type = assessmentType(template);
    const candidates = previous.filter((row) => !used.has(row.id) && assessmentType(row) === type);
    const match =
      candidates.find((row) => row.template_id === template.id) ||
      candidates.find((row) => row.title === template.title) ||
      (MAIN_ASSESSMENTS.includes(type) && candidates.length === 1 ? candidates[0] : null);
    if (match) used.add(match.id);
    return {
      ...template,
      id: match?.id || null,
      template_id: template.id,
      assessment_type: type,
      grade: match?.grade ?? null,
      custom: 0,
    };
  });
  return [
    ...restored,
    ...previous
      .filter((row) => !used.has(row.id))
      .map((row) => ({
        ...row,
        assessment_type: assessmentType(row),
        weight: 0,
        template_id: null,
        custom: 1,
      })),
  ].map((entry, position) => ({ ...entry, position }));
}
