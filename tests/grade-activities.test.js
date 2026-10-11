import test from 'node:test';
import assert from 'node:assert/strict';
import { defaultAssessments } from '../shared/assessments.js';
import {
  prepareActivitySlots,
  subjectActivities,
  isConfiguredActivity,
  activityCsvCells,
} from '../shared/grade-activities.js';
import { weightedGrades } from '../shared/domain.js';
const source = () =>
  defaultAssessments().map((row, i) => ({
    ...row,
    id: `row-${i}`,
    raw: '',
    template_id: `template-${i}`,
  }));
test('Four initial extra slots reuse empty legacy records without losing IDs or weights', () => {
  const rows = source(),
    previous = structuredClone(rows);
  const result = prepareActivitySlots(rows, () => assert.fail('No new IDs necessary'));
  assert.deepEqual(rows, previous);
  assert.equal(result.length, rows.length);
  assert.deepEqual(new Set(result.map((r) => r.id)), new Set(rows.map((r) => r.id)));
  assert.deepEqual(
    result.filter((r) => r.extra_slot).map((r) => r.title),
    [1, 2, 3, 4].map((n) => `Activitat extra ${n}`),
  );
  assert.deepEqual(weightedGrades(result), weightedGrades(rows));
  assert.equal(subjectActivities(result).length, 0);
});
test('Configured dates, titles, explicit types, grades zero and zero-weight scores stay visible', () => {
  const rows = source();
  Object.assign(rows[3], { grade: 0, raw: '0' });
  Object.assign(rows[4], { date: '2026-10-20' });
  Object.assign(rows[6], { title: 'Comentari del llibre' });
  Object.assign(rows[9], { title: 'Activitat extra 4', assessment_type: 'presentation' });
  const result = prepareActivitySlots(rows, () => assert.fail('No new IDs necessary'));
  assert.equal(subjectActivities(result).length, 4);
  for (const i of [3, 4, 6, 9]) {
    const actual = result.find((r) => r.id === rows[i].id);
    for (const key of ['title', 'grade', 'raw', 'date', 'weight', 'assessment_type', 'template_id'])
      assert.equal(actual[key], rows[i][key]);
  }
});
test('More than four activities are never aggregated or dropped and re-opening does not grow rows', () => {
  const rows = source();
  for (const r of rows.slice(3, 9)) Object.assign(r, { weight: 2, grade: 0, raw: '0' });
  const result = prepareActivitySlots(rows, () => assert.fail('No new IDs necessary'));
  assert.equal(result.filter((r) => r.extra_slot).length, 6);
  assert.equal(subjectActivities(result).length, 6);
  const again = prepareActivitySlots(result, () => assert.fail('No new IDs necessary'));
  assert.equal(again.length, result.length);
  assert.deepEqual(weightedGrades(again), weightedGrades(rows));
});
test('Exam-only sheets get four empty activities with no effect on averages', () => {
  let next = 0;
  const rows = source().slice(0, 3);
  rows[0].grade = 8;
  const result = prepareActivitySlots(rows, () => `new-${next++}`);
  assert.equal(result.length, 7);
  assert.equal(next, 4);
  assert.deepEqual(weightedGrades(result), weightedGrades(rows));
  const again = prepareActivitySlots(result, () => assert.fail('Slots must be reused'));
  assert.equal(again.length, 7);
});
test('Activity CSV includes the selected type, title and weight, with formula-safe titles', () => {
  assert.deepEqual(
    activityCsvCells({
      category: 'activity',
      assessment_type: 'writing',
      title: 'Article',
      weight: 15,
    }),
    ['Redacció', 'Article', 15],
  );
  assert.deepEqual(
    activityCsvCells({
      category: 'activity',
      assessment_type: 'assignment',
      title: '=1+1',
      weight: 0,
    }),
    ['Entrega', "'=1+1", 0],
  );
  assert.deepEqual(activityCsvCells(null), ['', '', '']);
  assert.equal(
    isConfiguredActivity({
      category: 'activity',
      title: 'Redacció 1',
      grade: null,
      raw: null,
      weight: 0,
    }),
    false,
  );
});
