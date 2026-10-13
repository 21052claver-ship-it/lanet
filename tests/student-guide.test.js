import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CUMULATIVE_SUBJECTS,
  NON_CUMULATIVE_SUBJECTS,
  evaluationKind,
  RESEARCH_PARTS,
  researchResult,
  SCHOOL_DATES,
  schoolCalendarICS,
  SCHOOL_RESOURCES,
} from '../shared/student-guide.js';
import { courseGrade, courseSettingsFor } from '../shared/course-grades.js';
import { currentPauProfile } from '../shared/pau-outlook.js';
import { OFFICIAL_SUBJECTS } from '../shared/official-schedule.js';

test('Presentation page 9 covers every assessed subject exactly once, excluding tutoring', () => {
  assert.deepEqual(CUMULATIVE_SUBJECTS, [
    'cat',
    'cast',
    'eng',
    'math',
    'smath',
    'geo',
    'bio',
    'chem',
    'ods',
    'phy',
    'latin',
    'tech',
  ]);
  assert.deepEqual(NON_CUMULATIVE_SUBJECTS, ['hist', 'eco', 'phil', 'dt', 'art', 'lit']);
  const ids = [...CUMULATIVE_SUBJECTS, ...NON_CUMULATIVE_SUBJECTS];
  assert.equal(new Set(ids).size, 18);
  assert.deepEqual(
    ids.sort(),
    OFFICIAL_SUBJECTS.filter((s) => s.assessed)
      .map((s) => s.id)
      .sort(),
  );
  assert.equal(evaluationKind('tutor'), null);
});
test('Unconfigured cumulative subjects use the declared approximation consistently in grades and PAU', () => {
  const rows = [6, 8, 10].map((grade, i) => ({
    subject_id: 'math',
    term: i + 1,
    weight: 100,
    grade,
  }));
  const result = courseGrade(rows);
  assert.ok(Math.abs(result.base - 8.6666) < 0.00001);
  assert.equal(result.complete, true);
  const profile = currentPauProfile({ grades: rows }, [{ id: 'math' }]);
  assert.equal(profile.average, 8.667);
  const historical = rows.map((r) => ({ ...r, subject_id: 'hist' }));
  assert.equal(courseGrade(historical).base, 8);
});
test('Saved equal and custom settings remain authoritative and are never mutated', () => {
  const equal = {
    subject_id: 'math',
    equal_terms: 1,
    term1_weight: 20,
    term2_weight: 30,
    term3_weight: 50,
    limit_to_ten: 0,
  };
  const saved = [equal];
  assert.equal(courseSettingsFor(saved, 'math'), equal);
  assert.deepEqual(saved, [equal]);
  const rows = [6, 8, 10].map((grade, i) => ({
    subject_id: 'math',
    term: i + 1,
    weight: 100,
    grade,
  }));
  assert.equal(courseGrade(rows, [], equal).base, 8);
  assert.equal(courseGrade(rows, [], { ...equal, equal_terms: 0 }).base, 8.6);
  assert.equal(courseSettingsFor([], 'tutor').equal_terms, 1);
});
test('TR uses the school rubric, preserves zero/pending, normalizes only evaluated blocks', () => {
  assert.deepEqual(
    RESEARCH_PARTS.map((p) => p.weight),
    [30, 42, 21, 7],
  );
  assert.equal(researchResult({}).mean, null);
  const partial = researchResult({ followup: '0', dossier: '8,5' });
  assert.equal(partial.coverage, 72);
  assert.equal(partial.complete, false);
  assert.equal(partial.mean, (8.5 * 42) / 72);
  const full = researchResult({ followup: 6, dossier: 8, oral: 9, poster: 10 });
  assert.equal(full.mean, 7.75);
  assert.equal(full.complete, true);
  for (const raw of [-1, 11, 'NaN', 'Infinity', '8x', '1e1', '0x5', {}, false])
    assert.throws(() => researchResult({ oral: raw }));
});
test('School dates and inclusive ranges agree with the presentation and export losslessly', () => {
  assert.deepEqual(
    SCHOOL_DATES.filter((e) => e.kind === 'term').map((e) => [e.start, e.end]),
    [
      ['2026-11-18', '2026-11-24'],
      ['2027-02-11', '2027-02-17'],
      ['2027-04-28', '2027-05-04'],
    ],
  );
  assert.equal(SCHOOL_DATES.find((e) => e.id === 'tr-poster').start, '2026-12-04');
  assert.deepEqual(
    SCHOOL_DATES.filter((e) => e.kind === 'pau').map((e) => e.start),
    ['2027-06-01', '2027-06-08', '2027-07-06'],
  );
  const ics = schoolCalendarICS();
  for (const line of ics.split('\r\n')) assert.ok(Buffer.byteLength(line, 'utf8') <= 75);
  assert.equal((ics.match(/BEGIN:VEVENT/g) || []).length, 13);
  assert.match(ics, /DTSTART;VALUE=DATE:20270428\r\nDTEND;VALUE=DATE:20270505/);
  assert.match(ics, /DTSTART;VALUE=DATE:20261204\r\nDTEND;VALUE=DATE:20261205/);
  assert.equal(new Set(SCHOOL_DATES.map((e) => e.id)).size, 13);
  for (const event of SCHOOL_DATES) assert.ok(event.end >= event.start);
});
test('Orientation resources include no embedded credentials or obsolete Accessnet endpoint', () => {
  for (const resource of SCHOOL_RESOURCES) {
    const url = new URL(resource.url);
    assert.equal(url.protocol, 'https:');
    assert.equal(url.username + url.password + url.search, '');
    assert.notEqual(url.hostname, 'accesnet.gencat.cat');
  }
});
