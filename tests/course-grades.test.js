import test from 'node:test';
import assert from 'node:assert/strict';
import {
  courseGrade,
  bonusMaximum,
  bonusLabel,
  parseBonusGrade,
  CUMULATIVE_WEIGHTS,
} from '../shared/course-grades.js';
const entries = (marks) => marks.map((grade, index) => ({ term: index + 1, grade, weight: 100 }));
const settings = (weights, extra = {}) => ({
  equal_terms: 0,
  term1_weight: weights[0],
  term2_weight: weights[1],
  term3_weight: weights[2],
  ...extra,
});
const near = (actual, expected) =>
  assert.ok(Math.abs(actual - expected) < 1e-10, `${actual} ≠ ${expected}`);

test('Annual marks use exact equal thirds and add only corrected personal bonuses', () => {
  const rows = entries([6, 8, 10]);
  const before = structuredClone(rows);
  const result = courseGrade(rows, [
    { capacity: 1, grade: 0.23 },
    { capacity: 1, grade: 0.24 },
  ]);
  near(result.base, 8);
  near(result.bonus, 0.47);
  near(result.total, 8.47);
  assert.equal(result.complete, true);
  assert.deepEqual(rows, before);
  assert.deepEqual(
    result.terms.map((term) => term.mean),
    [6, 8, 10],
  );
});
test('Cumulative subjects use 16.67%, 33.33%, 50% before adding the bonus', () => {
  const result = courseGrade(
    entries([6, 8, 10]),
    [{ capacity: 2, grade: 0.4 }],
    settings(CUMULATIVE_WEIGHTS),
  );
  near(result.base, 8.6666);
  near(result.total, 9.0666);
  assert.equal(result.complete, true);
  assert.deepEqual(
    result.terms.map((term) => term.weight),
    CUMULATIVE_WEIGHTS,
  );
});
test('Custom weights can exclude a term without making the course incomplete', () => {
  const result = courseGrade(entries([null, 8, 10]), [], settings([0, 25, 75]));
  near(result.total, 9.5);
  assert.equal(result.complete, true);
});
test('Missing terms give a normalized provisional estimate, never a zero final mark', () => {
  const result = courseGrade(entries([6, null, 10]), [], settings(CUMULATIVE_WEIGHTS));
  near(result.base, (6 * 16.67 + 10 * 50) / 66.67);
  assert.equal(result.complete, false);
  assert.equal(result.knownTerms, 2);
});
test('A partial term stays provisional even when all three term means are known', () => {
  const rows = [
    ...entries([7, 8, 9]).filter((entry) => entry.term !== 1),
    { term: 1, grade: 6, weight: 25 },
    { term: 1, grade: null, weight: 75 },
  ];
  const result = courseGrade(rows);
  assert.equal(result.terms[0].mean, 6);
  assert.equal(result.terms[0].complete, false);
  assert.equal(result.complete, false);
});
test('No assessment grades means no final mark even with a corrected bonus', () => {
  const result = courseGrade(entries([null, null, null]), [{ capacity: 2, grade: 0.5 }]);
  assert.equal(result.base, null);
  assert.equal(result.total, null);
  assert.equal(result.bonus, 0.5);
  assert.equal(result.complete, false);
});
test('Zero is corrected; null is pending and never gives automatic credit', () => {
  const corrected = courseGrade(entries([0, 0, 0]), [{ capacity: 1, grade: 0 }]);
  assert.equal(corrected.total, 0);
  assert.equal(corrected.pending, 0);
  assert.equal(corrected.complete, true);
  const pending = courseGrade(entries([8, 8, 8]), [{ capacity: 2, grade: null }]);
  assert.equal(pending.total, 8);
  assert.equal(pending.pending, 1);
  assert.equal(pending.complete, false);
});
test('The optional cap applies after bonuses and preserves the uncapped calculation', () => {
  const rows = entries([9.9, 9.9, 9.9]);
  const bonuses = [{ capacity: 2, grade: 0.5 }];
  const capped = courseGrade(rows, bonuses);
  near(capped.raw, 10.4);
  assert.equal(capped.total, 10);
  assert.equal(capped.limited, true);
  near(courseGrade(rows, bonuses, { limit_to_ten: 0 }).total, 10.4);
});
test('Bonus types accept the two existing formats but reject other maxima', () => {
  for (const value of ['+0,25', '+0.25 punts', '0,25 punts · mostra', 0.25])
    assert.equal(bonusMaximum(value), 0.25);
  for (const value of ['+0,5', '+0.50 punts', 0.5]) assert.equal(bonusMaximum(value), 0.5);
  for (const value of ['', null, undefined, '+0,20', '+1', '+0,25abc'])
    assert.equal(bonusMaximum(value), null);
  assert.equal(bonusLabel(0.25), '+0,25 punts');
  assert.equal(bonusLabel(0.5), '+0,50 punts');
});
test('Corrected bonus parser supports decimal commas, pending and bounded zero', () => {
  assert.equal(parseBonusGrade('0,23', 0.25), 0.23);
  assert.equal(parseBonusGrade('0.5', 0.5), 0.5);
  assert.equal(parseBonusGrade('0', 0.25), 0);
  assert.equal(parseBonusGrade('', 0.25), null);
  assert.equal(parseBonusGrade(null, 0.5), null);
  for (const value of ['-0,1', '0,26', '0,5', 'no', 'Infinity'])
    assert.throws(() => parseBonusGrade(value, 0.25));
});
