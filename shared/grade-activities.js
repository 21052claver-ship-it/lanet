import { activeAssessment, assessmentType, assessmentDefinition } from './assessments.js';

export const EXTRA_ACTIVITY_SLOTS = 4;
export const extraActivityTitle = (index) => `Activitat extra ${index + 1}`;
export function isConfiguredActivity(row) {
  if (assessmentDefinition(assessmentType(row)).category !== 'activity') return false;
  if (activeAssessment(row) || (row.raw != null && row.raw !== '') || row.date) return true;
  const title = (row.title || '').trim();
  if (/^Activitat extra \d+$/i.test(title) && assessmentType(row) !== 'other_activity') return true;
  return !!title && !/^(?:Redacció|Entrega|Presentació|Activitat extra) \d+$/i.test(title);
}
export function subjectActivities(entries) {
  return entries.filter(isConfiguredActivity);
}
export function activityCsvCells(row) {
  if (!row) return ['', '', ''];
  const title = /^\s*[=+\-@]/.test(row.title) ? "'" + row.title : row.title;
  return [assessmentDefinition(assessmentType(row)).label, title, row.weight];
}
// Reuse only empty legacy slots. Keep every existing ID, score, weight and date;
// unused template rows remain in the submitted sheet, outside the visible editor.
export function prepareActivitySlots(entries, createId) {
  const exams = entries.filter(
    (row) => assessmentDefinition(assessmentType(row)).category === 'exam',
  );
  const activities = entries.filter(
    (row) => assessmentDefinition(assessmentType(row)).category === 'activity',
  );
  const configured = activities
    .filter(isConfiguredActivity)
    .map((row) => ({ ...row, extra_slot: true }));
  const unused = activities.filter((row) => !isConfiguredActivity(row));
  unused.sort(
    (a, b) =>
      Number(/^Activitat extra \d+$/.test(b.title)) - Number(/^Activitat extra \d+$/.test(a.title)),
  );
  const visible = [...configured];
  while (visible.length < EXTRA_ACTIVITY_SLOTS) {
    const original = unused.shift();
    let n = 0;
    while (visible.some((row) => row.title === extraActivityTitle(n))) n++;
    visible.push({
      ...original,
      id: original?.id || createId(),
      title: extraActivityTitle(n),
      assessment_type: 'other_activity',
      category: 'activity',
      grade: null,
      raw: '',
      weight: 0,
      date: null,
      extra_slot: true,
    });
  }
  return [...exams, ...visible, ...unused].map((row, position) => ({ ...row, position }));
}
