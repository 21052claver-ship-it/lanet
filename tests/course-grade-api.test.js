import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync, readdirSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { testEnvironment } from './helpers/d1.js';
import worker from '../worker/index.js';
import { session } from '../worker/auth.js';
const base = 'https://lanet.example';
async function fixture(t) {
  const f = testEnvironment();
  t.after(() => f.db.close());
  f.cookies = {};
  for (const id of ['a', 'b']) {
    f.db
      .prepare(
        "INSERT INTO users(id,email,name,password_hash,salt,google_sub,configured) VALUES(?,?,?,'unusable','fixture',?,1)",
      )
      .run(id, `${id}@fje.edu`, `Usuari ${id}`, `google-${id}`);
    const user = f.db.prepare('SELECT * FROM users WHERE id=?').get(id);
    f.cookies[id] = (await session(user, new Request(base + '/api/auth/me'), f.env)).headers
      .get('Set-Cookie')
      .split(';')[0];
    for (const subject of ['math', 'phy'])
      f.db
        .prepare(
          'INSERT INTO enrollments(user_id,offering_id) SELECT ?,id FROM offerings WHERE subject_id=? LIMIT 1',
        )
        .run(id, subject);
  }
  f.fetch = (path, data, owner = 'a', extraHeaders = {}) =>
    worker.fetch(
      new Request(base + '/api' + path, {
        method: data === undefined ? 'GET' : 'POST',
        headers: {
          Cookie: f.cookies[owner] || '',
          Origin: base,
          'Content-Type': 'application/json',
          ...extraHeaders,
        },
        body: data === undefined ? undefined : JSON.stringify(data),
      }),
      f.env,
    );
  f.post = async (path, data, status = 200, owner = 'a') => {
    const response = await f.fetch(path, data, owner);
    const body = await response.json();
    assert.equal(response.status, status, JSON.stringify(body));
    return body;
  };
  f.add = (extra = {}, status = 200, owner = 'a') =>
    f.post(
      '/grades/bonus',
      { subject_id: 'math', title: 'Activitat corregida', maximum: 0.25, ...extra },
      status,
      owner,
    );
  return f;
}

test('Concurrent bonus creation reserves at most two quarter-point slots', async (t) => {
  const f = await fixture(t);
  const responses = await Promise.all(
    Array.from({ length: 8 }, (_, index) =>
      f.fetch('/grades/bonus', { subject_id: 'math', title: `Activitat ${index}`, maximum: 0.25 }),
    ),
  );
  assert.equal(responses.filter((response) => response.status === 200).length, 2);
  assert.equal(responses.filter((response) => response.status === 409).length, 6);
  const saved = f.db
    .prepare("SELECT SUM(capacity) AS capacity,COUNT(*) AS n FROM grade_bonuses WHERE user_id='a'")
    .get();
  assert.deepEqual({ ...saved }, { capacity: 2, n: 2 });
  await f.add({ maximum: 0.5 }, 409);
  await f.add({ maximum: 0.5, subject_id: 'phy' });
  await f.add({ maximum: 0.25, subject_id: 'phy' }, 409);
  await f.add({}, 200, 'b');
});
test('Idempotent retry preserves a corrected grade and does not reserve another slot', async (t) => {
  const f = await fixture(t);
  const id = `bonus:${randomUUID()}`;
  assert.equal((await f.add({ id, grade: 0.2 })).created, true);
  await f.post('/grades/batch', { entries: [{ id, grade: 0.24 }] });
  assert.equal((await f.add({ id, grade: 0.2 })).created, false);
  assert.equal(f.db.prepare('SELECT grade FROM grade_bonuses WHERE id=?').get(id).grade, 0.24);
  assert.equal(f.db.prepare('SELECT COUNT(*) AS n FROM grade_bonuses').get().n, 1);
  await f.add({ id, title: 'Una altra activitat' }, 409);
  await f.add({ id }, 403, 'b');
});
test('Corrected bonus API enforces each maximum, zero, pending and atomic mixed saves', async (t) => {
  const f = await fixture(t);
  const bonus = await f.add();
  f.db.exec(
    "INSERT INTO grade_entries(id,user_id,subject_id,term,category,title,weight,grade) VALUES('exam','a','math',1,'exam','Parcial 1',100,7)",
  );
  await f.post(
    '/grades/batch',
    {
      entries: [
        { id: 'exam', grade: 8 },
        { id: bonus.id, grade: 0.26 },
      ],
    },
    400,
  );
  assert.equal(f.db.prepare("SELECT grade FROM grade_entries WHERE id='exam'").get().grade, 7);
  assert.equal(
    f.db.prepare('SELECT grade FROM grade_bonuses WHERE id=?').get(bonus.id).grade,
    null,
  );
  await f.post('/grades/batch', {
    entries: [
      { id: 'exam', grade: 8 },
      { id: bonus.id, grade: 0 },
    ],
  });
  assert.equal(f.db.prepare('SELECT grade FROM grade_bonuses WHERE id=?').get(bonus.id).grade, 0);
  await f.post('/grades/batch', { entries: [{ id: bonus.id, grade: null }] });
  assert.equal(
    f.db.prepare('SELECT grade FROM grade_bonuses WHERE id=?').get(bonus.id).grade,
    null,
  );
  for (const grade of [-0.01, 0.5, '', true, 'NaN'])
    await f.post('/grades/batch', { entries: [{ id: bonus.id, grade }] }, 400);
  for (const entries of [[null], [{ id: 'exam' }, null], [true]])
    await f.post('/grades/batch', { entries }, 400);
  const half = await f.add({ maximum: 0.5, subject_id: 'phy', grade: 0.5 });
  await f.post('/grades/batch', { entries: [{ id: half.id, grade: 0.51 }] }, 400);
});
test('Bootstrap and all mutations keep private bonuses and course settings isolated', async (t) => {
  const f = await fixture(t);
  const bonus = await f.add({ grade: 0.23 });
  await f.post('/grades/course', {
    subject_id: 'math',
    equal_terms: false,
    limit_to_ten: true,
    weights: [16.67, 33.33, 50],
  });
  const own = await (await f.fetch('/bootstrap')).json();
  const other = await (await f.fetch('/bootstrap', undefined, 'b')).json();
  assert.equal(own.gradeBonuses[0].grade, 0.23);
  assert.equal(own.courseSettings[0].term3_weight, 50);
  assert.deepEqual(other.gradeBonuses, []);
  assert.deepEqual(other.courseSettings, []);
  await f.post('/grades/batch', { entries: [{ id: bonus.id, grade: 0 }] }, 403, 'b');
  await f.post('/grades/bonus/remove', { id: bonus.id }, 403, 'b');
  assert.equal(
    (
      await f.fetch('/grades/bonus', { subject_id: 'math', title: 'X', maximum: 0.25 }, 'a', {
        Origin: 'https://foreign.example',
      })
    ).status,
    403,
  );
  assert.equal((await f.fetch('/grades/bonus', {}, 'none')).status, 401);
  const result = await f.fetch('/grades/bonus');
  assert.equal(result.status, 405);
  assert.equal(result.headers.get('Cache-Control'), 'no-store');
});
test('Deleting a private bonus frees capacity and never deletes the published activity', async (t) => {
  const f = await fixture(t);
  f.db.exec(
    "INSERT INTO pluses(id,author_id,title,body,date,place) VALUES('public','a','Activitat del centre','Text','2026-11-01','Centre'); INSERT INTO plus_subjects(plus_id,subject_id,bonus) VALUES('public','math','+0,25 punts')",
  );
  const bonus = await f.add({ plus_id: 'public', title: '', grade: 0.2 });
  await f.add({ plus_id: 'public', title: '' }, 409);
  await f.post('/grades/bonus/remove', { id: bonus.id });
  assert.equal(f.db.prepare("SELECT COUNT(*) AS n FROM pluses WHERE id='public'").get().n, 1);
  await f.add({ maximum: 0.5 });
});
test('Published activity deletion preserves corrected private snapshot and its capacity', async (t) => {
  const f = await fixture(t);
  f.db.exec(
    "INSERT INTO pluses(id,author_id,title,body,date,place) VALUES('public','a','Activitat del centre','Text','2026-11-01','Centre'); INSERT INTO plus_subjects(plus_id,subject_id,bonus) VALUES('public','math','+0,50 punts')",
  );
  await f.add({ plus_id: 'public', title: '', maximum: 0.25 }, 400);
  const bonus = await f.add({ plus_id: 'public', title: '', maximum: 0.5, grade: 0.4 });
  f.db.exec("DELETE FROM pluses WHERE id='public'");
  const saved = f.db
    .prepare('SELECT plus_id,title,grade,capacity FROM grade_bonuses WHERE id=?')
    .get(bonus.id);
  assert.deepEqual(
    { ...saved },
    { plus_id: null, title: 'Activitat del centre', grade: 0.4, capacity: 2 },
  );
  await f.add({}, 409);
});
test('Subject enrollment, type, source visibility and weight validation reject invalid data', async (t) => {
  const f = await fixture(t);
  for (const maximum of [0.2, 0.3, 1, '0.25', null]) await f.add({ maximum }, 400);
  await f.add({ subject_id: 'chem' }, 400);
  await f.add({ title: '   ' }, 400);
  await f.add({ grade: 0.3 }, 400);
  await f.add({ id: 'injected' }, 400);
  await f.add({ plus_id: 'missing' }, 400);
  f.db.exec(
    "INSERT INTO pluses(id,author_id,title,body,date,place,status) VALUES('draft','b','Ocult','Text','2026-11-01','Centre','draft'); INSERT INTO plus_subjects(plus_id,subject_id,bonus) VALUES('draft','math','+0,25')",
  );
  await f.add({ plus_id: 'draft' }, 400);
  const payload = {
    subject_id: 'math',
    equal_terms: false,
    limit_to_ten: true,
    weights: [16.67, 33.33, 50],
  };
  for (const weights of [
    [16, 33, 50],
    [33, 33],
    [0, 0, 0],
    [-1, 51, 50],
    [null, 50, 50],
    [101, 0, -1],
  ])
    await f.post('/grades/course', { ...payload, weights }, 400);
  await f.post('/grades/course', { ...payload, subject_id: 'chem' }, 400);
  await f.post('/grades/course', { ...payload, equal_terms: 'false' }, 400);
  await f.post('/grades/course', payload);
  await f.post('/grades/course', { ...payload, weights: [20, 30, 50], limit_to_ten: false });
  assert.deepEqual(
    { ...f.db.prepare('SELECT term1_weight,limit_to_ten FROM grade_course_settings').get() },
    { term1_weight: 20, limit_to_ten: 0 },
  );
});
test('Published plus form accepts only the two defined types', async (t) => {
  const f = await fixture(t);
  const payload = {
    title: 'Una activitat',
    body: 'Informació',
    date: '2026-11-01',
    place: 'Centre',
    subjects: [{ subject_id: 'math', bonus: '+0,20' }],
  };
  await f.post('/pluses', payload, 400);
  const plus = await f.post('/pluses', {
    ...payload,
    subjects: [
      { subject_id: 'math', bonus: '+0,25' },
      { subject_id: 'phy', bonus: '+0,5' },
    ],
  });
  assert.deepEqual(
    f.db
      .prepare('SELECT bonus FROM plus_subjects WHERE plus_id=? ORDER BY subject_id')
      .all(plus.id)
      .map((row) => row.bonus),
    ['+0,25 punts', '+0,50 punts'],
  );
});
test('Database constraints enforce capacity and score even outside the application', async (t) => {
  const f = await fixture(t);
  const a = await f.add();
  await f.add();
  assert.throws(
    () => f.db.prepare('UPDATE grade_bonuses SET capacity=2 WHERE id=?').run(a.id),
    /grade_bonus_limit/,
  );
  assert.throws(
    () => f.db.prepare('UPDATE grade_bonuses SET grade=0.26 WHERE id=?').run(a.id),
    /CHECK constraint/,
  );
});
test('Migration 0016 is additive and preserves every pre-existing table row', () => {
  const db = new DatabaseSync(':memory:');
  try {
    for (const file of readdirSync('migrations')
      .filter((name) => name.endsWith('.sql') && name < '0016')
      .sort())
      db.exec(readFileSync(`migrations/${file}`, 'utf8'));
    db.exec(
      "INSERT INTO users(id,email,name,password_hash,salt) VALUES('existing','existing@fje.edu','Existing','hash','salt'); INSERT INTO enrollments(user_id,offering_id) SELECT 'existing',id FROM offerings WHERE subject_id='math' LIMIT 1; INSERT INTO grade_entries(id,user_id,subject_id,term,category,title,weight,grade) VALUES('existing-exam','existing','math',1,'exam','Examen existent',100,8.3)",
    );
    const tables = db
      .prepare(
        "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name",
      )
      .all()
      .map((row) => row.name);
    const snapshot = () =>
      tables.map((table) => [table, db.prepare(`SELECT * FROM ${table} ORDER BY rowid`).all()]);
    const before = snapshot();
    db.exec(readFileSync('migrations/0016_course_grades.sql', 'utf8'));
    assert.deepEqual(snapshot(), before);
    assert.equal(db.prepare('SELECT COUNT(*) AS n FROM grade_bonuses').get().n, 0);
    assert.equal(db.prepare('SELECT COUNT(*) AS n FROM grade_course_settings').get().n, 0);
  } finally {
    db.close();
  }
});
