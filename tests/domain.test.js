import test from 'node:test';
import assert from 'node:assert/strict';
import {
  weightedGrades,
  neededGrade,
  parseGrade,
  madridDay,
  weekDates,
  addDays,
  bannerValue,
  nextBid,
  slotConflicts,
  safeLink,
  scheduleBounds,
  eventOutsideSchedule,
} from '../shared/domain.js';
test('Una prova pendent no es tracta com un zero', () => {
  const rows = [
    { grade: 8, weight: 30 },
    { grade: null, weight: 30 },
    { grade: 9, weight: 25 },
    { grade: 8.5, weight: 15 },
  ];
  const result = weightedGrades(rows);
  assert.equal(result.evaluated, 70);
  assert.ok(Math.abs(result.mean - 8.464285714) < 1e-8);
  assert.ok(Math.abs(neededGrade(rows, 8.5) - 8.583333333) < 1e-8);
});
test('Una nota zero és una prova avaluada', () => {
  assert.equal(
    weightedGrades([
      { grade: 0, weight: 50 },
      { grade: 10, weight: 50 },
    ]).mean,
    5,
  );
  assert.equal(weightedGrades([{ grade: null, weight: 100 }]).mean, null);
});
test('Les notes admeten coma decimal i rebutgen valors fora del rang', () => {
  assert.equal(parseGrade('8,75'), 8.75);
  assert.equal(parseGrade(' '), null);
  for (const v of ['-1', '11', 'vuit']) assert.throws(() => parseGrade(v));
});
test('La data local respecta Europe/Madrid i els canvis d’hora', () => {
  assert.equal(madridDay('2026-10-24T22:30:00Z'), '2026-10-25');
  assert.equal(madridDay('2026-10-25T22:30:00Z'), '2026-10-25');
  assert.equal(madridDay('2026-10-25T23:30:00Z'), '2026-10-26');
  assert.deepEqual(weekDates('2026-12-31'), [
    '2026-12-28',
    '2026-12-29',
    '2026-12-30',
    '2026-12-31',
    '2027-01-01',
    '2027-01-02',
    '2027-01-03',
  ]);
  assert.equal(addDays('2028-02-28', 1), '2028-02-29');
});
test('El bàner decau per períodes complets de 24 hores i exigeix doblar el valor', () => {
  const b = { amount: 100, created_at: '2026-10-01T12:00:00' };
  assert.equal(bannerValue(b, Date.parse('2026-10-02T11:59:00Z')), 100);
  assert.equal(bannerValue(b, Date.parse('2026-10-02T12:00:00Z')), 90);
  assert.equal(nextBid(b, Date.parse('2026-10-03T12:00:00Z')), 162);
  assert.equal(nextBid(null), 1);
  assert.equal(nextBid({ amount: 1, created_at: '2026-10-01T12:00:00' }), 2);
  assert.equal(bannerValue(b, Date.parse('2027-10-01T12:00:00Z')), 1);
});
test('Les variants superposades es detecten, però dues franges consecutives no', () => {
  const slots = [
    { offering_id: 'a', day: 0, start: '08:00', end: '09:00' },
    { offering_id: 'b', day: 0, start: '08:30', end: '09:30' },
    { offering_id: 'c', day: 0, start: '09:00', end: '10:00' },
  ];
  assert.equal(slotConflicts(['a', 'b'], slots).length, 1);
  assert.equal(slotConflicts(['a', 'c'], slots).length, 0);
});
test('Els enllaços de contingut no executen JavaScript', () => {
  assert.equal(safeLink('javascript:alert(1)'), null);
  assert.equal(safeLink('https://example.com'), 'https://example.com/');
});
test('L’horari representa franges personalitzades i conserva els actes de cap de setmana', () => {
  const slots = [
    { day: 0, start: '07:45', end: '08:35' },
    { day: 4, start: '14:15', end: '15:10' },
  ];
  const bounds = scheduleBounds(slots);
  assert.deepEqual(bounds, { start: 450, end: 930 });
  const dates = weekDates('2026-10-08');
  assert.equal(
    eventOutsideSchedule({ date: '2026-10-08', start: '08:15', end: '09:05' }, dates, bounds),
    false,
  );
  assert.equal(eventOutsideSchedule({ date: '2026-10-08', start: '16:00' }, dates, bounds), true);
  assert.equal(eventOutsideSchedule({ date: '2026-10-10' }, dates, bounds), true);
});
