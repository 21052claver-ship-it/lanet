import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import app from '../worker/index.js';
import { hash } from '../worker/utils.js';
import { testEnvironment } from './helpers/d1.js';
import { filterMaterials, materialTopics } from '../shared/content-workspace.js';

async function fixture() {
  const { db, env } = testEnvironment();
  const room = db
    .prepare("SELECT * FROM offerings WHERE subject_id='math' ORDER BY id LIMIT 1")
    .get();
  for (const [uid, role, group] of [
    ['a', 'student', room.group_id],
    ['b', 'student', room.group_id],
    ['delegate', 'delegate', room.group_id],
    ['outside', 'delegate', room.group_id === '2A' ? '2B' : '2A'],
    ['admin', 'admin', room.group_id],
  ]) {
    db.prepare(
      "INSERT INTO users(id,email,name,password_hash,salt,google_sub,group_id,role,configured) VALUES(?,?,?,'x','x',?,?,?,1)",
    ).run(uid, uid + '@fje.edu', uid, uid, group, role);
    db.prepare(
      "INSERT INTO sessions(hash,user_id,expires,auth_provider) VALUES(?,?,?,'google')",
    ).run(await hash(uid), uid, Date.now() + 3600000);
  }
  for (const uid of ['a', 'b'])
    db.prepare('INSERT INTO enrollments(user_id,offering_id) VALUES(?,?)').run(uid, room.id);
  db.prepare(
    "INSERT INTO notes(id,author_id,subject_id,title,body,summary) VALUES('material','a','math','Derivades','Contingut segur','Resum')",
  ).run();
  async function call(path, value, uid = 'a', method = value === undefined ? 'GET' : 'POST') {
    return app.fetch(
      new Request('https://lanet.example/api' + path, {
        method,
        headers: { Cookie: 'lanet_session=' + uid, 'Content-Type': 'application/json' },
        ...(value === undefined ? {} : { body: JSON.stringify(value) }),
      }),
      env,
      { waitUntil: (p) => p.catch(() => {}) },
    );
  }
  const create = (overrides = {}) => ({
    id: randomUUID(),
    offering_id: room.id,
    title: 'Com es deriva?',
    body: 'No entenc el segon pas.',
    note_id: 'material',
    ...overrides,
  });
  return { db, env, room, call, create };
}

test('additive workspace migration preserves existing material content, price and files', () => {
  const { db } = testEnvironment({ through: '0026_official_schedule.sql' });
  db.exec(
    "INSERT INTO users(id,email,name,password_hash,salt) VALUES('legacy','legacy@fje.edu','Legacy','x','x'); INSERT INTO notes(id,author_id,subject_id,title,body,summary,price) VALUES('legacy','legacy','math','Legacy','Original','Original',5); INSERT INTO files(id,owner_id,name,mime,size,object_key,note_id) VALUES('legacy','legacy','original.pdf','application/pdf',50,'legacy-object','legacy');",
  );
  const before = db.prepare("SELECT * FROM notes WHERE id='legacy'").get();
  db.exec(readFileSync('migrations/0027_subject_workspaces.sql', 'utf8'));
  const { topic, term, ...after } = db.prepare("SELECT * FROM notes WHERE id='legacy'").get();
  assert.deepEqual(after, { ...before });
  assert.equal(topic, '');
  assert.equal(term, null);
  assert.equal(
    db.prepare("SELECT object_key FROM files WHERE id='legacy'").get().object_key,
    'legacy-object',
  );
  db.close();
});

test('saved and own materials do not depend on preferred subjects; topics/search/term compose', () => {
  const notes = [
    {
      id: 'a',
      subject_id: 'math',
      author_id: 'me',
      topic: ' Derivades ',
      status: 'published',
      term: 2,
      saved: 1,
      title: 'Regla de la cadena',
    },
    {
      id: 'b',
      subject_id: 'phy',
      author_id: 'other',
      topic: '',
      status: 'published',
      saved: 1,
      title: 'Cinemàtica',
    },
    { id: 'c', subject_id: 'math', author_id: 'me', topic: '', status: 'draft', title: 'Idea' },
  ];
  assert.deepEqual(
    filterMaterials(notes, { subjects: null, tab: 'saved', userId: 'me', query: '' }).map(
      (n) => n.id,
    ),
    ['a', 'b'],
  );
  assert.deepEqual(
    filterMaterials(notes, { subjects: null, tab: 'mine', userId: 'me', query: '' }).map(
      (n) => n.id,
    ),
    ['a', 'c'],
  );
  assert.deepEqual(
    filterMaterials(notes, {
      subjects: ['math'],
      tab: 'explore',
      userId: 'me',
      query: 'derivades',
      topic: 'Derivades',
      term: '2',
    }).map((n) => n.id),
    ['a'],
  );
  assert.deepEqual(materialTopics(notes), [
    ['Derivades', 1],
    ['', 2],
  ]);
});

test('retired chat endpoints cannot read or mutate historical conversations', async () => {
  const f = await fixture(),
    payload = f.create();
  f.db
    .prepare(
      "INSERT INTO subject_threads(id,offering_id,author_id,title,body,request_hash) VALUES('archived',?,'a','Històric','Text conservat','archived')",
    )
    .run(f.room.id);
  f.db.exec(
    "INSERT INTO subject_replies(id,thread_id,author_id,body,request_hash) VALUES('archived-reply','archived','b','Resposta conservada','archived-reply')",
  );
  const before = f.db.prepare('SELECT * FROM subject_threads').all();
  const replies = f.db.prepare('SELECT * FROM subject_replies').all();
  for (const uid of ['a', 'delegate', 'admin']) {
    for (const [path, body, method] of [
      ['/discussions/rooms?subject=math', undefined, 'GET'],
      ['/discussions?room=' + f.room.id, undefined, 'GET'],
      ['/discussions/archived', undefined, 'GET'],
      ['/discussions', payload, 'POST'],
      ['/discussions/archived/reply', { id: randomUUID(), body: 'No publicable' }, 'POST'],
      ['/discussions/archived/resolve', { resolved: true }, 'POST'],
      ['/discussions/archived', undefined, 'DELETE'],
    ])
      assert.equal((await f.call(path, body, uid, method)).status, 404, uid + ' ' + path);
  }
  assert.deepEqual(f.db.prepare('SELECT * FROM subject_threads').all(), before);
  assert.deepEqual(f.db.prepare('SELECT * FROM subject_replies').all(), replies);
  assert.equal(
    f.db.prepare("SELECT title FROM notes WHERE id='material'").get().title,
    'Derivades',
  );
  f.db.close();
});

test('retired chat keeps authentication and never leaks data to anonymous clients', async () => {
  const f = await fixture();
  for (const path of ['/discussions', '/discussions/rooms?subject=math', '/discussions/archived']) {
    const response = await f.call(path, undefined, 'unknown');
    assert.equal(response.status, 401);
    assert.ok(!(await response.text()).includes('Contingut segur'));
  }
  f.db.close();
});

test('archived conversation reports retain moderator scope without reopening chat', async () => {
  const f = await fixture();
  f.db
    .prepare(
      "INSERT INTO subject_threads(id,offering_id,author_id,title,body,request_hash) VALUES('archived',?,'a','Històric','Text conservat','archived')",
    )
    .run(f.room.id);
  f.db.exec(
    "INSERT INTO reports(id,user_id,type,target_id,reason) VALUES('archived-report','a','discussion','archived','Informe històric')",
  );
  const own = await (await f.call('/admin', undefined, 'delegate')).json();
  const outside = await (await f.call('/admin', undefined, 'outside')).json();
  assert.ok(own.reports.some((r) => r.id === 'archived-report'));
  assert.ok(!outside.reports.some((r) => r.id === 'archived-report'));
  assert.equal((await f.call('/admin/reports', { id: 'archived-report' }, 'outside')).status, 403);
  assert.equal((await f.call('/admin/reports', { id: 'archived-report' }, 'delegate')).status, 200);
  assert.equal(
    f.db.prepare("SELECT resolved FROM reports WHERE id='archived-report'").get().resolved,
    1,
  );
  assert.equal(
    f.db.prepare("SELECT body FROM subject_threads WHERE id='archived'").get().body,
    'Text conservat',
  );
  assert.equal((await f.call('/discussions/archived', undefined, 'admin')).status, 404);
  f.db.close();
});

test('material metadata round-trips, legacy updates preserve topic and term, invalid terms rejected', async () => {
  const f = await fixture(),
    payload = {
      title: 'Material nou',
      subject_id: 'math',
      body: 'Cos del material',
      topic: '  Derivades   i límits ',
      term: 2,
      price: 0,
      status: 'published',
      files: [],
    };
  const r = await f.call('/notes', payload);
  assert.equal(r.status, 200);
  const { id } = await r.json();
  assert.equal(
    f.db.prepare('SELECT topic FROM notes WHERE id=?').get(id).topic,
    'Derivades i límits',
  );
  const { topic, term, ...legacy } = payload;
  assert.equal((await f.call('/notes/' + id, { ...legacy, title: 'Actualitzat' })).status, 200);
  const saved = f.db.prepare('SELECT topic,term FROM notes WHERE id=?').get(id);
  assert.equal(saved.topic, 'Derivades i límits');
  assert.equal(saved.term, 2);
  assert.equal((await f.call('/notes/' + id, { ...payload, term: 4 })).status, 400);
  const boot = await (await f.call('/bootstrap')).json();
  assert.equal(boot.notes.find((n) => n.id === id).term, 2);
  const event = {
    title: 'Tasques de derivades',
    subject_id: 'math',
    kind: 'task',
    date: boot.today,
    visibility: 'private',
  };
  // A student may propose publicly, but must first confirm a class tutor.
  const unconfiguredProposal = await f.call('/events', { ...event, visibility: 'shared' });
  assert.equal(unconfiguredProposal.status, 400);
  assert.match((await unconfiguredProposal.json()).error, /tutoria/);
  const er = await f.call('/events', event);
  assert.equal(er.status, 200);
  const eid = (await er.json()).id;
  assert.equal((await f.call('/events/' + eid + '/progress', { done: true })).status, 200);
  assert.equal(
    f.db.prepare('SELECT display_kind FROM events WHERE id=?').get(eid).display_kind,
    'task',
  );
  f.db.close();
});
