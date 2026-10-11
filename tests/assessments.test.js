import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync, readdirSync } from 'node:fs';
import {
  defaultAssessments,
  restoreAssessments,
  assessmentType,
  activeAssessment,
  equalActiveAssessmentWeights,
} from '../shared/assessments.js';
import { weightedGrades } from '../shared/domain.js';
import { assessmentInput } from '../worker/assessment-input.js';
function legacyFixture() {
  const db = new DatabaseSync(':memory:');
  for (const file of readdirSync('migrations')
    .filter((file) => file.endsWith('.sql') && file !== '0011_assessment_model.sql')
    .sort())
    db.exec(readFileSync(`migrations/${file}`, 'utf8'));
  for (const user of ['blank', 'graded', 'custom', 'inactive', 'exam_only']) {
    db.prepare('INSERT INTO users(id,email,name,password_hash,salt) VALUES(?,?,?,?,?)').run(
      user,
      `${user}@example.test`,
      user,
      'hash',
      'salt',
    );
    db.prepare("INSERT INTO enrollments(user_id,offering_id) VALUES(?,'2B-math')").run(user);
    db.prepare(
      `INSERT INTO grade_entries(id,user_id,subject_id,term,category,title,date,grade,weight,position,template_id,custom)
      SELECT ?||id,?,'math',term,category,title,date,NULL,weight,position,id,? FROM templates WHERE offering_id='2B-math' AND term=1`,
    ).run(`${user}:`, user, user === 'custom' ? 1 : 0);
  }
  db.exec(
    "UPDATE grade_entries SET grade=0 WHERE user_id IN('graded','exam_only') AND position=0; UPDATE grade_entries SET grade=8,date='2026-11-05' WHERE user_id='graded' AND position=2; UPDATE grade_entries SET grade=7.5 WHERE user_id='graded' AND position=3; DELETE FROM enrollments WHERE user_id='inactive';",
  );
  return db;
}
test('Avaluació: tres exàmens i tres caselles de cada activitat, opcionals sense pes', () => {
  const rows = defaultAssessments([35, 35, 20, 10]);
  assert.equal(rows.length, 12);
  assert.deepEqual(
    rows.slice(0, 3).map((row) => [row.title, row.weight]),
    [
      ['Parcial 1', 35],
      ['Parcial 2', 35],
      ['Trimestral', 30],
    ],
  );
  for (const type of ['writing', 'assignment', 'presentation']) {
    assert.equal(rows.filter((row) => row.assessment_type === type).length, 3);
    assert.ok(
      rows
        .filter((row) => row.assessment_type === type)
        .every((row) => row.grade === null && row.weight === 0),
    );
  }
  assert.equal(
    rows.reduce((sum, row) => sum + row.weight, 0),
    100,
  );
  assert.ok(rows.every((row) => row.category !== 'participation'));
});
test('Una activitat amb nota però sense pes no canvia la mitjana; zero es conserva', () => {
  const rows = defaultAssessments();
  rows[0].grade = 0;
  rows[1].grade = 8;
  rows[3].grade = 10;
  assert.equal(weightedGrades(rows).mean, 4);
  assert.equal(activeAssessment(rows[0]), true);
  assert.equal(activeAssessment(rows[3]), true);
  assert.equal(activeAssessment(rows[4]), false);
});
test('Repartir pesos igual exclou caselles opcionals buides i inclou una activitat amb nota zero', () => {
  const entries = defaultAssessments().map((row) => ({ ...row, raw: '' }));
  let result = equalActiveAssessmentWeights(entries);
  assert.equal(
    result.reduce((sum, row) => sum + row.weight, 0),
    100,
  );
  assert.ok(result.slice(3).every((row) => row.weight === 0));
  entries[3].raw = '0';
  result = equalActiveAssessmentWeights(entries);
  assert.deepEqual(
    result.slice(0, 4).map((row) => row.weight),
    [25, 25, 25, 25],
  );
  assert.ok(result.slice(4).every((row) => row.weight === 0));
});
test('Migració: fulls buits i catàleg adopten 12 caselles, tres exàmens i pesos totals intactes', () => {
  const db = legacyFixture();
  try {
    const oldIds = db
      .prepare("SELECT id FROM grade_entries WHERE user_id='blank'")
      .all()
      .map((row) => row.id);
    db.exec(readFileSync('migrations/0011_assessment_model.sql', 'utf8'));
    const rows = db
      .prepare("SELECT * FROM grade_entries WHERE user_id='blank' ORDER BY position")
      .all();
    assert.equal(rows.length, 12);
    for (const id of oldIds) assert.ok(rows.some((row) => row.id === id));
    assert.deepEqual(
      rows.slice(0, 3).map((row) => row.title),
      ['Parcial 1', 'Parcial 2', 'Trimestral'],
    );
    assert.equal(
      rows.reduce((sum, row) => sum + row.weight, 0),
      100,
    );
    for (const type of ['writing', 'assignment', 'presentation'])
      assert.equal(rows.filter((row) => row.assessment_type === type).length, 3);
    const templates = db
      .prepare("SELECT * FROM templates WHERE offering_id='2B-math' AND term=1 ORDER BY position")
      .all();
    assert.equal(templates.length, 12);
    assert.equal(
      templates.reduce((sum, row) => sum + row.weight, 0),
      100,
    );
    assert.equal(templates.filter((row) => row.category === 'exam').length, 3);
  } finally {
    db.close();
  }
});
test('Migració: cap ID, qualificació, data, pes personalitzat, compte o matrícula existent es perd', () => {
  const db = legacyFixture();
  try {
    const previous = db.prepare('SELECT * FROM grade_entries').all();
    const users = db.prepare('SELECT * FROM users ORDER BY id').all();
    const enrollments = db.prepare('SELECT * FROM enrollments ORDER BY user_id,offering_id').all();
    db.exec(readFileSync('migrations/0011_assessment_model.sql', 'utf8'));
    for (const row of previous) {
      const after = db.prepare('SELECT * FROM grade_entries WHERE id=?').get(row.id);
      for (const key of [
        'id',
        'user_id',
        'subject_id',
        'term',
        'grade',
        'date',
        'custom',
        'template_id',
      ])
        assert.equal(after[key], row[key], `${row.id}:${key}`);
      if (['graded', 'custom'].includes(row.user_id)) assert.equal(after.weight, row.weight);
      if (row.user_id === 'custom' && row.category !== 'participation')
        assert.equal(after.title, row.title);
      assert.notEqual(after.category, 'participation');
    }
    assert.deepEqual(db.prepare('SELECT * FROM users ORDER BY id').all(), users);
    assert.deepEqual(
      db.prepare('SELECT * FROM enrollments ORDER BY user_id,offering_id').all(),
      enrollments,
    );
    assert.equal(
      db.prepare("SELECT COUNT(*) AS n FROM grade_entries WHERE user_id='inactive'").get().n,
      4,
    );
    assert.equal(
      db
        .prepare(
          "SELECT grade FROM grade_entries WHERE user_id='graded' AND assessment_type='term'",
        )
        .get().grade,
      null,
    );
    assert.equal(
      db.prepare("SELECT COUNT(*) AS n FROM grade_entries WHERE user_id='exam_only'").get().n,
      12,
    );
    assert.equal(
      db
        .prepare(
          "SELECT grade FROM grade_entries WHERE user_id='exam_only' AND assessment_type='partial1'",
        )
        .get().grade,
      0,
    );
    assert.equal(
      db
        .prepare(
          "SELECT weight FROM grade_entries WHERE user_id='exam_only' AND assessment_type='term'",
        )
        .get().weight,
      40,
    );
    assert.equal(db.prepare('PRAGMA quick_check').get().quick_check, 'ok');
    assert.deepEqual(db.prepare('PRAGMA foreign_key_check').all(), []);
  } finally {
    db.close();
  }
});
test('Recuperar plantilla conserva zeros i activitats antigues, sense traspassar-les al trimestral', () => {
  const previous = [
    {
      id: 'exam',
      title: 'Parcial personal',
      category: 'exam',
      assessment_type: 'partial1',
      grade: 0,
      weight: 30,
    },
    {
      id: 'old',
      title: 'Activitat anterior',
      category: 'activity',
      assessment_type: 'other_activity',
      template_id: 'term-template',
      grade: 7,
      weight: 20,
      date: '2026-10-12',
    },
  ];
  const templates = defaultAssessments().map((row, i) => ({
    ...row,
    id: row.assessment_type === 'term' ? 'term-template' : `template-${i}`,
  }));
  const result = restoreAssessments(previous, templates);
  assert.equal(result.length, 13);
  assert.equal(result.find((row) => row.id === 'exam').grade, 0);
  assert.equal(result.find((row) => row.assessment_type === 'term').grade, null);
  assert.deepEqual(
    result.find((row) => row.id === 'old'),
    { ...previous[1], weight: 0, template_id: null, custom: 1, position: 12 },
  );
  assert.equal(
    result.reduce((sum, row) => sum + row.weight, 0),
    100,
  );
});
test('API: tipus d’avaluació vàlids, compatibilitat amb exàmens antics i rebuig de participació', () => {
  assert.deepEqual(assessmentInput({ category: 'exam', title: 'Parcial 1' }), {
    category: 'exam',
    assessment_type: 'partial1',
  });
  assert.equal(assessmentType({ category: 'activity', title: 'Redacció 2' }), 'writing');
  assert.throws(() => assessmentInput({ category: 'participation', title: 'Participació' }));
  assert.throws(() => assessmentInput({ category: 'activity', assessment_type: 'term' }));
  assert.throws(() => assessmentInput({ assessment_type: 'fake' }));
});
