import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import {
  emptyPau,
  validatePau,
  pauMark,
  pauAccess,
  pauAdmission,
  findPauDegrees,
  recommendPauDegrees,
  PAU_SUBJECT_IDS,
} from '../shared/pau.js';
import { testEnvironment } from './helpers/d1.js';
import { pauRoute } from '../worker/pau.js';
import { bootstrap } from '../worker/data.js';
import app from '../worker/index.js';

const sample = (p = {}) =>
  validatePau({ ...emptyPau(), average: 8, general: 7, modalityGrade: 9, ...p });
const degree = (p = {}) => ({
  code: '12345',
  name: 'Medicina (Campus de prova)',
  career: 'Medicina',
  university: 'UB',
  weights: { 2027: { math: 0.2, physics: 0.1, biology: 0.2, chemistry: 0.2 } },
  cutoff: 11.6,
  firstCutoff: 11.9,
  ...p,
});
const near = (a, b) => assert.ok(Math.abs(a - b) < 1e-10, `${a} != ${b}`);
test('PAU: decimal input is strict, supports comma and zero, distinguishes missing', () => {
  for (const [v, n] of [
    [null, null],
    ['', null],
    ['0', 0],
    ['9,125', 9.125],
    [10, 10],
  ])
    assert.equal(pauMark(v), n);
  for (const bad of [true, [], {}, ' ', '0x8', '1e1', '11', '-1', 'NaN', '8.1234', '5abc'])
    assert.throws(() => pauMark(bad));
});
test('PAU: batx access requires completed data, phase >=4, approved batx and access >=5', () => {
  assert.equal(pauAccess(emptyPau()).value, null);
  assert.equal(pauAccess(sample({ general: null })).value, null);
  near(pauAccess(sample()).value, 7.6);
  assert.equal(pauAccess(sample({ average: 10, general: 3.999 })).eligible, false);
  assert.equal(pauAccess(sample({ average: 5, general: 4 })).eligible, false);
  assert.equal(pauAccess(sample({ average: 5, general: 5 })).eligible, true);
  assert.equal(pauAccess(sample({ average: 4, general: 10 })).eligible, false);
});
test('PAU: arithmetic mean of all five compulsory exams, not zero for incomplete', () => {
  const v = sample({
    accessMode: 'exams',
    exams: { catalan: 6, spanish: 7, foreign: 8, history: 9 },
    modalityGrade: 10,
  });
  assert.equal(pauAccess(v).phase, 8);
  assert.equal(pauAccess(v).value, 8);
  assert.equal(pauAccess({ ...v, modalityGrade: null }).value, null);
  assert.equal(pauAccess({ ...v, exams: { ...v.exams, catalan: 0 } }).phase, 6.8);
});
test('PAU: CFGS uses cycle average without compulsory phase or modality bonus', () => {
  const v = sample({ route: 'cfgs', average: 8.75, general: null });
  assert.equal(pauAccess(v).value, 8.75);
  assert.equal(pauAdmission(v, degree()).total, 8.75);
  assert.equal(pauAccess({ ...v, average: 4.9 }).eligible, false);
});
test('PAU: select two best weighted contributions, including compulsory modality, not two highest grades', () => {
  const r = pauAdmission(
    sample({
      subjects: [
        { id: 'physics', grade: 10, year: 2027 },
        { id: 'biology', grade: 8, year: 2027 },
        { id: 'chemistry', grade: 7.5, year: 2027 },
      ],
    }),
    degree(),
  );
  assert.deepEqual(
    r.best.map((b) => b.id),
    ['math', 'biology'],
  );
  near(r.bonus, 3.4);
  near(r.total, 11);
});
test('PAU: approved >=5 and validity exam year plus two, future and expired do not add', () => {
  const r = pauAdmission(
    sample({
      modalityGrade: 4.999,
      subjects: [
        { id: 'biology', grade: 10, year: 2024 },
        { id: 'chemistry', grade: 5, year: 2025 },
      ],
    }),
    degree(),
  );
  assert.equal(r.bonus, 1);
  assert.equal(r.total, 8.6);
  assert.equal(
    pauAdmission(sample({ year: 2026 }), degree({ weights: { 2026: { math: 0.2 } } })).bonus,
    0,
  );
});
test('PAU: never add bonuses to failed access, never infer absent ponderations or absent cutoff', () => {
  assert.equal(pauAdmission(sample({ general: 3 }), degree()).total, null);
  assert.equal(pauAdmission(sample(), degree({ weights: {} })).total, null);
  assert.equal(pauAdmission(sample(), degree({ cutoff: undefined })).reaches, null);
});
test('PAU: maximum 14, exact equality reaches cutoff; first and latest rounds remain separate', () => {
  const v = sample({
    average: 10,
    general: 10,
    modalityGrade: 10,
    subjects: [
      { id: 'biology', grade: 10, year: 2027 },
      { id: 'chemistry', grade: 10, year: 2027 },
    ],
  });
  assert.equal(pauAdmission(v, degree({ cutoff: 14 })).total, 14);
  assert.equal(pauAdmission(v, degree({ cutoff: 14 })).reaches, true);
  const r = pauAdmission(sample(), degree({ cutoff: 9.4, firstCutoff: 9.5 }));
  assert.equal(r.reaches, true);
  assert.equal(r.gap, 0);
  assert.equal(
    pauAdmission(sample(), degree({ cutoff: 9.4, firstCutoff: 9.5 }), 'first').reaches,
    false,
  );
});
test('PAU: admission rounding is half-up to a thousandth even at a binary floating point boundary', () => {
  const v = sample({
    route: 'cfgs',
    average: 8.001,
    modalityGrade: null,
    subjects: [{ id: 'physics', grade: 6.335, year: 2027 }],
  });
  const r = pauAdmission(v, degree({ weights: { 2027: { physics: 0.1 } }, cutoff: 8.635 }));
  assert.equal(r.bonus, 0.634);
  assert.equal(r.total, 8.635);
  assert.equal(r.reaches, true);
  assert.equal(r.gap, 0);
});
test('PAU: access rounding matches integer decimal arithmetic across input boundaries', () => {
  for (let i = 0; i <= 1000; i++) {
    const a = 5000 + ((i * 37) % 5001),
      b = 4000 + ((i * 73) % 6001);
    assert.equal(
      pauAccess(sample({ average: a / 1000, general: b / 1000 })).value,
      Math.round((a * 6 + b * 4) / 10) / 1000,
    );
  }
});
test('PAU: validation rejects duplicate/malformed/private injected fields and over three voluntary subjects', () => {
  for (const p of [
    { subjects: [{ id: 'math', grade: 9, year: 2027 }] },
    {
      subjects: [
        { id: 'biology', grade: 9, year: 2027 },
        { id: 'biology', grade: 9, year: 2027 },
      ],
    },
    { year: 2028 },
    { user_id: 'other' },
    { modality: 'constructor' },
    { selected: '<script>' },
    { exams: { catalan: 5, hacked: 8 } },
    { subjects: PAU_SUBJECT_IDS.slice(0, 4).map((id) => ({ id, grade: 5, year: 2027 })) },
  ])
    assert.throws(() => sample(p));
});
test('PAU: search matches accents, degree, campus and joint universities; recommendation stays within career', () => {
  const data = [
    degree({ code: '10001', cutoff: 12 }),
    degree({ code: '10002', cutoff: 9.4 }),
    degree({ code: '10003', cutoff: 9.3 }),
    degree({
      code: '10004',
      career: 'Història',
      name: 'Història (Girona)',
      cutoff: 9.2,
      university: 'UdG / UOC',
    }),
  ];
  const rows = findPauDegrees(data, sample(), { career: 'Medicina' });
  assert.equal(recommendPauDegrees(rows, 'Medicina').degree.code, '10002');
  assert.equal(recommendPauDegrees(rows, ''), null);
  assert.equal(
    findPauDegrees(data, sample(), { query: 'historia girona', university: 'UOC' }).length,
    1,
  );
  assert.deepEqual(
    findPauDegrees(data, sample(), { career: 'Medicina', onlyEligible: true }).map(
      (r) => r.degree.code,
    ),
    ['10002', '10003'],
  );
});
test('PAU official catalogue: complete codes, strict weights, ranges, years and source hashes', () => {
  const c = JSON.parse(readFileSync('public/data/pau.json', 'utf8'));
  assert.equal(c.cutoffDate, '2026-10-07');
  assert.deepEqual(c.weightYears, [2026, 2027]);
  assert.equal(c.subjects.length, 27);
  assert.deepEqual(
    c.subjects.map((s) => s.id),
    PAU_SUBJECT_IDS,
  );
  assert.ok(c.degrees.length >= 450);
  assert.equal(new Set(c.degrees.map((d) => d.code)).size, c.degrees.length);
  for (const d of c.degrees) {
    assert.match(d.code, /^\d{5}$/);
    assert.ok(d.name && d.career && d.university);
    for (const k of ['cutoff', 'firstCutoff'])
      if (d[k] !== undefined) assert.ok(d[k] >= 5 && d[k] <= 14);
    for (const weights of Object.values(d.weights))
      for (const [id, v] of Object.entries(weights)) {
        assert.ok(PAU_SUBJECT_IDS.includes(id));
        assert.ok([0.1, 0.2].includes(v));
      }
  }
  for (const [name, s] of Object.entries(c.sources)) {
    assert.equal(new URL(s.url).hostname, 'universitats.gencat.cat');
    assert.equal(
      createHash('sha256')
        .update(readFileSync(`tests/fixtures/pau/sources/${name}.pdf`))
        .digest('hex'),
      s.sha256,
    );
  }
  const ade = c.degrees.find((d) => d.code === '11033');
  assert.equal(ade.cutoff, 9.228);
  assert.equal(ade.firstCutoff, 9.34);
  assert.equal(ade.weights[2027].math, 0.2);
  assert.equal(ade.weights[2027].physics, 0.2);
});
test('PAU official catalogue: conflicting source coefficients are not silently selected', () => {
  const c = JSON.parse(readFileSync('public/data/pau.json', 'utf8'));
  const d = c.degrees.find((d) => d.code === '61080');
  assert.ok(d.weightConflicts[2027].length >= 2);
  assert.equal(d.weights[2027], undefined);
  assert.equal(pauAdmission(sample(), d).total, null);
});
test('PAU official catalogue: all table codes matched text; latest title wins over clipped first-round label', () => {
  const c = JSON.parse(readFileSync('public/data/pau.json', 'utf8'));
  const a = JSON.parse(readFileSync('tests/fixtures/pau/data-audit.json', 'utf8'));
  assert.ok(Object.values(a.sources).every((s) => s.allTextCodesMatched));
  assert.equal(a.cutoffDegrees, 558);
  assert.equal(a.totalDegrees, 560);
  assert.ok(c.degrees.find((d) => d.code === '31131').name.endsWith('(Barcelona)'));
  assert.ok(
    a.normalizedNumericCells.every((cell) => cell.original === "0'2" && cell.normalized === '0,2'),
  );
});
test('PAU API: private storage, strict validation, optimistic revisions, isolation in bootstrap', async () => {
  const { db, env } = testEnvironment();
  db.exec(
    "INSERT INTO users(id,email,name,password_hash,salt,google_sub,configured) VALUES('pau-a','a@fje.edu','A','disabled','fixture','pau-a',1),('pau-b','b@fje.edu','B','disabled','fixture','pau-b',1)",
  );
  const a = db.prepare("SELECT * FROM users WHERE id='pau-a'").get(),
    b = db.prepare("SELECT * FROM users WHERE id='pau-b'").get();
  const req = (value, revision = 0) =>
    new Request('https://lanet.example/api/pau', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ value, revision }),
    });
  assert.equal((await pauRoute(new Request('https://lanet.example/api/pau'), env, a)).status, 200);
  const saved = await (await pauRoute(req(sample()), env, a)).json();
  assert.equal(saved.revision, 1);
  await assert.rejects(
    () => pauRoute(req(sample()), env, a),
    (e) => e.status === 409,
  );
  await assert.rejects(
    () => pauRoute(req({ ...sample(), owner_id: 'pau-b' }, 1), env, a),
    (e) => e.status === 400,
  );
  assert.equal((await (await pauRoute(req(sample({ average: 9 }), 1), env, a)).json()).revision, 2);
  assert.equal((await bootstrap(env, a)).pau.value.average, 9);
  assert.equal((await bootstrap(env, b)).pau.value, null);
  assert.equal((await app.fetch(new Request('https://lanet.example/api/pau'), env)).status, 401);
  db.close();
});
