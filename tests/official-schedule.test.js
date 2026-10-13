import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { testEnvironment } from './helpers/d1.js';
import { catalog, configure } from '../worker/data.js';
import { slotConflicts, timeMinutes } from '../shared/domain.js';
import {
  OFFICIAL_OFFERINGS,
  OFFICIAL_SLOTS,
  OFFICIAL_ROUTES,
  SCHOOL_PERIODS,
  SCHOOL_BREAKS,
  TEACHERS,
  SCHEDULE_VERSION,
  curriculumChoices,
  selectedCurriculum,
  curriculumIssues,
  mergeAdjacentSlots,
  slotTeacher,
  schoolScheduleBounds,
} from '../shared/official-schedule.js';

const model = { offerings: OFFICIAL_OFFERINGS, slots: OFFICIAL_SLOTS };
function combinations(group) {
  const route = OFFICIAL_ROUTES.find((r) => r.id === group);
  const offers = OFFICIAL_OFFERINGS.filter((o) => o.group_id === group);
  return route.blocks.reduce(
    (sets, block) =>
      sets.flatMap((set) => offers.filter((o) => o.block === block.id).map((o) => [...set, o.id])),
    [offers.filter((o) => !o.block).map((o) => o.id)],
  );
}
const first = (group) => combinations(group)[0];
const user = (db) => {
  db.exec(
    "INSERT INTO users(id,email,name,password_hash,salt,group_id,configured) VALUES('schedule-fixture','timetable@fje.edu','Prova local','unused','fixture','2A',1)",
  );
  return db.prepare("SELECT * FROM users WHERE id='schedule-fixture'").get();
};

test('all 208 official combinations have exactly six nonoverlapping periods per day', () => {
  let count = 0;
  for (const [group, expected] of [
    ['2A', 96],
    ['2B', 64],
    ['2C', 48],
  ]) {
    const sets = combinations(group);
    assert.equal(sets.length, expected);
    for (const ids of sets) {
      assert.deepEqual(curriculumIssues(model, group, ids), []);
      assert.deepEqual(slotConflicts(ids, model.slots), []);
      const slots = model.slots.filter((s) => ids.includes(s.offering_id));
      assert.equal(slots.length, 30);
      assert.equal(
        slots.reduce((n, s) => n + timeMinutes(s.end) - timeMinutes(s.start), 0),
        1800,
      );
      for (let day = 0; day < 5; day++)
        assert.deepEqual(
          slots
            .filter((s) => s.day === day)
            .sort((a, b) => a.start.localeCompare(b.start))
            .map((s) => [s.start, s.end]),
          SCHOOL_PERIODS,
        );
      count++;
    }
  }
  assert.equal(count, 208);
});
test('default route matrices match the independently transcribed PDF fixture', () => {
  const reference = JSON.parse(readFileSync('tests/fixtures/official-timetable.json', 'utf8'));
  const teacherKeys = Object.fromEntries(Object.entries(TEACHERS).map(([k, v]) => [v, k]));
  for (const group of ['2A', '2B', '2C']) {
    const ids = first(group);
    const matrix = Array.from({ length: 5 }, (_, day) =>
      model.slots
        .filter((s) => ids.includes(s.offering_id) && s.day === day)
        .sort((a, b) => a.start.localeCompare(b.start))
        .map((s) => {
          const offering = model.offerings.find((o) => o.id === s.offering_id);
          return `${offering.subject_id}/${teacherKeys[slotTeacher(s, offering)]}/${s.room}`;
        }),
    );
    assert.deepEqual(matrix, reference[group], group);
  }
});
test('all teacher and elective variants use the exact rooms and per-day assignments', () => {
  for (const [id, teacher, room, hours] of [
    ['2A-chem-solsona', 'Kiko Solsona', '6', 4],
    ['2A-smath', 'Mireia Biosca', '4', 4],
    ['2A-bio', 'Judit Puigpinós', '3', 4],
    ['2A-phy-ruiz', 'Alejandro Ruiz', '6', 4],
    ['2B-phy-ruiz', 'Alejandro Ruiz', '6', 4],
    ['2B-eco', 'Maria Ferrer', '5', 4],
    ['2B-tech', 'Xavier Arjó', '5', 4],
    ['2B-tech-tere', 'Tere', '4', 4],
    ['2C-bio', 'Judit Puigpinós', '3', 4],
    ...['2A', '2B', '2C'].flatMap((g) => [
      [`${g}-art`, 'Mireia Torres', '6', 4],
      [`${g}-tutor-comellas`, 'Marina Comellas', '4', 1],
      [`${g}-tutor-closa`, 'Francesc Closa', '5', 1],
      [`${g}-tutor-ocana`, 'Fer Sánchez de Ocaña', '6', 1],
    ]),
  ]) {
    const slots = model.slots.filter((s) => s.offering_id === id);
    assert.equal(slots.length, hours, id);
    assert.ok(
      slots.every((s) => s.teacher === teacher && s.room === room),
      id,
    );
  }
  const literature = model.slots
    .filter((s) => s.offering_id === '2C-lit')
    .sort((a, b) => a.day - b.day);
  assert.deepEqual(
    literature.map((s) => [s.day, s.teacher, s.room]),
    [
      [0, 'Mª José Agustí', '6'],
      [1, 'Elena Domènech', '4'],
      [2, 'Elena Domènech', '6'],
      [3, 'Elena Domènech', '6'],
    ],
  );
  const latin = model.slots.filter((s) => s.offering_id === '2C-latin');
  assert.equal(latin.length, 4, 'Duplicated Wednesday print row must not create a fifth hour');
  assert.equal(latin.filter((s) => s.teacher === 'Mª José Agustí').length, 1);
  assert.ok(
    latin
      .filter((s) => s.day !== 2)
      .every(
        (s) =>
          slotTeacher(
            s,
            model.offerings.find((o) => o.id === s.offering_id),
          ) === '' && s.note === 'Treball personal · Llatí online',
      ),
  );
});
test('Friday continuous mathematics merges visually without deleting raw hours', () => {
  const slots = model.slots.filter((s) => first('2A').includes(s.offering_id));
  const merged = mergeAdjacentSlots(slots);
  const fridayMath = merged.filter((s) => s.day === 4 && s.offering_id === '2A-math');
  assert.equal(fridayMath.length, 1);
  assert.equal(fridayMath[0].start, '08:10');
  assert.equal(fridayMath[0].end, '10:10');
  assert.equal(fridayMath[0].source_ids.length, 2);
  assert.equal(slots.length, 30);
  assert.equal(slots.find((s) => s.id === fridayMath[0].id).end, '09:10');
  assert.deepEqual(schoolScheduleBounds(slots, { periods: SCHOOL_PERIODS }), {
    start: 490,
    end: 945,
  });
  assert.deepEqual(
    SCHOOL_BREAKS.map((b) => [b.start, b.end]),
    [
      ['10:10', '10:40'],
      ['12:40', '13:45'],
    ],
  );
});
test('legacy ambiguous teacher choices need confirmation; saved choices hydrate exactly', () => {
  const ids = first('2A');
  const legacy = curriculumChoices(model, '2A', ids, false);
  assert.equal(legacy.chemistry.subject_id, 'chem');
  assert.equal(legacy.chemistry.offering_id, '');
  assert.equal(legacy.science.offering_id, '');
  assert.equal(legacy.tutor.offering_id, '');
  const current = curriculumChoices(model, '2A', ids, true);
  assert.deepEqual(new Set(selectedCurriculum(model, '2A', current)), new Set(ids));
  assert.equal(curriculumChoices(model, '2B').mathematics.offering_id, '2B-math');
});
test('D1 catalog matches official data and every valid curriculum saves atomically', async () => {
  const { db, env } = testEnvironment();
  const u = user(db);
  const cat = await catalog(env);
  assert.equal(cat.schoolSchedule.version, SCHEDULE_VERSION);
  assert.deepEqual(
    cat.slots.map((s) => ({ ...s })).sort((a, b) => a.id.localeCompare(b.id)),
    [...OFFICIAL_SLOTS].sort((a, b) => a.id.localeCompare(b.id)),
  );
  assert.equal(
    cat.templates.filter(
      (t) => cat.offerings.find((o) => o.id === t.offering_id)?.subject_id === 'tutor',
    ).length,
    0,
  );
  for (const route of OFFICIAL_ROUTES)
    for (const ids of combinations(route.id)) {
      await configure(env, u, { group_id: route.id, path: route.path, offerings: ids });
      const saved = db
        .prepare('SELECT offering_id FROM enrollments WHERE user_id=?')
        .all(u.id)
        .map((r) => r.offering_id);
      assert.deepEqual(new Set(saved), new Set(ids));
      assert.equal(
        db.prepare('SELECT schedule_version FROM users WHERE id=?').get(u.id).schedule_version,
        SCHEDULE_VERSION,
      );
    }
  db.close();
});
test('server rejects incomplete, foreign, retired, duplicate or conflicting choices without losing current course', async () => {
  const { db, env } = testEnvironment();
  const u = user(db),
    ids = first('2A');
  await configure(env, u, { group_id: '2A', path: 'science', offerings: ids });
  const bad = [
    ids.slice(1),
    ids.filter((id) => id !== '2A-chem'),
    [...ids, '2A-chem-solsona'],
    [...ids, ids[0]],
    [...ids.slice(0, -1), '2B-tutor-closa'],
    [...ids.slice(0, -1), 'unknown'],
    [...ids.slice(0, -1), {}],
    [...ids, '2A-eco'],
  ];
  for (const offerings of bad)
    await assert.rejects(configure(env, u, { group_id: '2A', path: 'science', offerings }), {
      status: 400,
    });
  await assert.rejects(
    configure(env, u, { group_id: '2C', path: 'science', offerings: first('2C') }),
    { status: 400 },
  );
  await assert.rejects(
    configure(
      env,
      { ...u, role: 'delegate' },
      { group_id: '2B', path: 'science', offerings: first('2B') },
    ),
    { status: 403 },
  );
  db.prepare(
    "UPDATE slots SET day=0,start='08:10',end='09:10' WHERE offering_id='2A-chem' AND day=0",
  ).run();
  await assert.rejects(configure(env, u, { group_id: '2A', path: 'science', offerings: ids }), {
    status: 400,
  });
  assert.deepEqual(
    new Set(
      db
        .prepare('SELECT offering_id FROM enrollments WHERE user_id=?')
        .all(u.id)
        .map((e) => e.offering_id),
    ),
    new Set(ids),
  );
  db.close();
});
test('migration preserves personal data, historical references and customized templates', async () => {
  const { db, env } = testEnvironment({ through: '0025_prediction_self_resolver.sql' });
  const u = user(db);
  db.exec(
    "INSERT INTO enrollments VALUES('schedule-fixture','2A-eco'),('schedule-fixture','2A-math'); INSERT INTO grade_entries(id,user_id,subject_id,term,category,title,grade,weight,position) VALUES('kept-grade','schedule-fixture','math',1,'exam','La meva prova',8.6,37,0); UPDATE templates SET title='Plantilla personalitzada' WHERE offering_id='2A-math' AND position=0; INSERT INTO notes(id,author_id,subject_id,title) VALUES('kept-note','schedule-fixture','math','Contingut existent'); INSERT INTO events(id,owner_id,title,kind,date,offering_id,group_id,visibility) VALUES('kept-event','schedule-fixture','Prova existent','exam','2026-10-20','2A-eco','2A','private');",
  );
  const tables = ['users', 'enrollments', 'grade_entries', 'notes', 'events', 'templates'];
  const before = Object.fromEntries(
    tables.map((t) => [
      t,
      db
        .prepare(`SELECT * FROM ${t}`)
        .all()
        .map((r) => ({ ...r })),
    ]),
  );
  db.exec(readFileSync('migrations/0026_official_schedule.sql', 'utf8'));
  for (const table of tables) {
    const after = db.prepare(`SELECT * FROM ${table}`).all();
    for (const old of before[table])
      assert.ok(
        after.some((row) => Object.keys(old).every((key) => row[key] === old[key])),
        `${table} preserves old values`,
      );
  }
  assert.equal(db.prepare("SELECT active FROM offerings WHERE id='2A-eco'").get().active, 0);
  assert.deepEqual(db.prepare('PRAGMA foreign_key_check').all(), []);
  assert.equal(db.prepare('PRAGMA quick_check').get().quick_check, 'ok');
  assert.equal(
    db.prepare('SELECT schedule_version FROM users WHERE id=?').get(u.id).schedule_version,
    '',
  );
  await configure(env, u, { group_id: '2A', path: 'science', offerings: first('2A') });
  assert.equal(
    db.prepare("SELECT grade,weight FROM grade_entries WHERE id='kept-grade'").get().grade,
    8.6,
  );
  assert.equal(
    db
      .prepare(
        "SELECT COUNT(*) AS n FROM grade_entries WHERE user_id=? AND subject_id='math' AND term=1",
      )
      .get(u.id).n,
    1,
  );
  db.close();
});
