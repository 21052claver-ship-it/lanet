import test from 'node:test';
import assert from 'node:assert/strict';
import { emptyPau, validatePau } from '../shared/pau.js';
import { currentPauProfile, degreeOutlook } from '../shared/pau-outlook.js';
import { pauRoute } from '../worker/pau.js';
import { testEnvironment } from './helpers/d1.js';
const degree = {
  code: '12345',
  weights: { 2027: { math: 0.2, chemistry: 0.2, physics: 0.1 } },
  cutoff: 12,
  firstCutoff: 13,
};
const subjects = [
  { id: 'math', name: 'Matemàtiques' },
  { id: 'chem', name: 'Química' },
  { id: 'cat', name: 'Català' },
];
const entries = [
  { subject_id: 'math', term: 1, weight: 100, grade: 8 },
  { subject_id: 'chem', term: 1, weight: 100, grade: 7 },
  { subject_id: 'cat', term: 1, weight: 100, grade: 9 },
];
test('Tutoria is excluded from academic average and PAU coverage', () => {
  const result = currentPauProfile({ grades: entries }, [
    ...subjects,
    { id: 'tutor', name: 'Tutoria', assessed: 0 },
  ]);
  assert.equal(result.total, 3);
  assert.equal(result.known, 3);
  assert.equal(result.average, 8);
  assert.ok(!result.subjects.some((s) => s.id === 'tutor'));
});
test('PAU top 5: ordered unique bounded codes and source are validated, legacy objective survives', () => {
  const old = emptyPau();
  delete old.topFive;
  delete old.orientationSource;
  old.selected = '12345';
  assert.deepEqual(validatePau(old).topFive, ['12345']);
  assert.equal(validatePau(old).orientationSource, 'grades');
  const codes = ['12345', '23456', '34567', '45678', '56789'];
  assert.deepEqual(validatePau({ ...emptyPau(), topFive: codes }).topFive, codes);
  for (const bad of [[...codes, '67890'], ['12345', '12345'], [12345], ['x'], null])
    assert.throws(() => validatePau({ ...emptyPau(), topFive: bad }));
  assert.throws(() => validatePau({ ...emptyPau(), orientationSource: 'probability' }));
  assert.deepEqual(validatePau({ ...old, topFive: [] }).topFive, []);
});
test('PAU outlook: no grades stay missing, zero is not missing, unenrolled grades do not leak in', () => {
  assert.equal(currentPauProfile({ grades: [] }, subjects).average, null);
  const p = currentPauProfile(
    {
      grades: [
        { ...entries[0], grade: 0 },
        { subject_id: 'other', term: 1, weight: 100, grade: 10 },
      ],
    },
    subjects,
  );
  assert.equal(p.average, 0);
  assert.equal(p.known, 1);
  assert.equal(p.total, 3);
  assert.equal(degreeOutlook(emptyPau(), degree, p).reason, 'minimum');
});
test('PAU outlook: per-subject course weights and corrected pluses retained, capped at ten', () => {
  const p = currentPauProfile(
    {
      grades: [entries[0], { ...entries[0], term: 2, grade: 10 }],
      gradeBonuses: [{ subject_id: 'math', grade: 0.5, capacity: 2 }],
      courseSettings: [
        { subject_id: 'math', equal_terms: 0, term1_weight: 25, term2_weight: 75, term3_weight: 0 },
      ],
    },
    [subjects[0]],
  );
  assert.equal(p.average, 10);
  assert.equal(p.coverage, 100);
  const partial = currentPauProfile({ grades: entries }, subjects);
  assert.equal(partial.average, 8);
  assert.equal(partial.coverage, 33);
});
test('PAU outlook: ratio is coverage of historical cutoff, uses actual weighted subject marks and best two', () => {
  const p = currentPauProfile({ grades: entries }, subjects),
    r = degreeOutlook(emptyPau(), degree, p);
  assert.equal(r.total, 11);
  assert.equal(r.percent, 92);
  assert.equal(r.gap, -1);
  assert.equal(r.reaches, false);
  assert.deepEqual(
    r.best.map((s) => s.id),
    ['math', 'chemistry'],
  );
  const reached = degreeOutlook(emptyPau(), { ...degree, cutoff: 10 }, p);
  assert.equal(reached.percent, 100);
  assert.equal(reached.gap, 1);
  assert.equal(degreeOutlook(emptyPau(), degree, p, 'first').cutoff, 13);
});
test('PAU outlook: no fictitious marks for missing subjects, no language/literature substitution', () => {
  const p = currentPauProfile({ grades: [entries[2]] }, subjects);
  const r = degreeOutlook(emptyPau(), degree, p);
  assert.equal(r.total, 9);
  assert.deepEqual(r.best, []);
  assert.equal(p.subjects.find((s) => s.id === 'cat').pauId, null);
});
test('PAU outlook: invalid manual input cannot produce a projection and decimal strings normalize', () => {
  const p = currentPauProfile({ grades: entries }, subjects);
  assert.equal(
    degreeOutlook(
      { ...emptyPau(), orientationSource: 'simulation', average: '99', general: 8 },
      degree,
      p,
    ).reason,
    'invalid',
  );
  assert.equal(
    degreeOutlook(
      { ...emptyPau(), orientationSource: 'simulation', average: '8,5', general: '8' },
      degree,
      p,
    ).total,
    8.3,
  );
});
test('PAU outlook: a near miss never rounds up to a covered cutoff', () => {
  const p = currentPauProfile({ grades: entries }, subjects),
    r = degreeOutlook(emptyPau(), { ...degree, cutoff: 11.001 }, p);
  assert.equal(r.reaches, false);
  assert.equal(r.percent, 99);
  assert.equal(r.gap, -0.001);
});
test('PAU outlook: absent/conflicting weights or cutoff cannot produce a score, CFGS needs its simulation', () => {
  const p = currentPauProfile({ grades: entries }, subjects);
  assert.equal(degreeOutlook(emptyPau(), { ...degree, weights: {} }, p).percent, null);
  assert.equal(degreeOutlook(emptyPau(), { ...degree, cutoff: null }, p).reason, 'cutoff');
  assert.equal(degreeOutlook({ ...emptyPau(), route: 'cfgs' }, degree, p).reason, 'cfgs');
  const sim = { ...emptyPau(), route: 'cfgs', average: 9, orientationSource: 'simulation' };
  assert.equal(degreeOutlook(sim, degree, p).total, 9);
  assert.equal(degreeOutlook({ ...sim, average: null }, degree, p).reason, 'simulation');
});
test('PAU top 5: persistence is private, ordered and revision-protected, no database migration', async () => {
  const { env, db } = testEnvironment();
  try {
    db.prepare(
      "INSERT INTO users(id,name,email,password_hash,salt,role) VALUES('top-user','Top','top@fje.edu','x','x','student')",
    ).run();
    const req = (value, revision) =>
      new Request('http://local/api/pau', {
        method: 'PUT',
        body: JSON.stringify({ value, revision }),
      });
    const v = { ...emptyPau(), topFive: ['23456', '12345'] };
    const saved = await (await pauRoute(req(v, 0), env, { id: 'top-user' })).json();
    assert.deepEqual(saved.value.topFive, v.topFive);
    const read = await (
      await pauRoute(new Request('http://local/api/pau'), env, { id: 'top-user' })
    ).json();
    assert.deepEqual(read.value.topFive, v.topFive);
    assert.equal(
      (await (await pauRoute(new Request('http://local/api/pau'), env, { id: 'other' })).json())
        .value,
      null,
    );
    await assert.rejects(
      pauRoute(req({ ...v, topFive: ['12345', '23456'] }, 0), env, { id: 'top-user' }),
      (e) => e.status === 409,
    );
    await assert.rejects(
      pauRoute(req({ ...v, topFive: ['12345', '12345'] }, 1), env, { id: 'top-user' }),
      (e) => e.status === 400,
    );
    assert.deepEqual(
      JSON.parse(
        db.prepare("SELECT value FROM pau_simulations WHERE user_id='top-user'").get().value,
      ).topFive,
      v.topFive,
    );
  } finally {
    db.close();
  }
});
