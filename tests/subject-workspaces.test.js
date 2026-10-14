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

test('rooms, thread reads/writes and moderation enforce exact enrollment and delegate scope', async () => {
  const f = await fixture(),
    payload = f.create();
  assert.equal((await f.call('/discussions', payload)).status, 201);
  const rooms = await (await f.call('/discussions/rooms?subject=math')).json();
  assert.equal(rooms.rooms.length, 1);
  assert.equal(rooms.rooms[0].id, f.room.id);
  for (const uid of ['outside']) {
    for (const [path, body] of [
      ['/discussions?room=' + f.room.id, undefined],
      ['/discussions/' + payload.id, undefined],
      ['/discussions/' + payload.id + '/reply', { id: randomUUID(), body: 'No accés' }],
      ['/discussions/' + payload.id + '/resolve', { resolved: true }],
      ['/discussions/' + payload.id + '/report', { reason: 'No accés' }],
    ])
      assert.equal((await f.call(path, body, uid)).status, 403);
  }
  assert.equal(
    (await f.call('/discussions/' + payload.id + '/resolve', { resolved: true }, 'b')).status,
    403,
  );
  assert.equal(
    (await f.call('/discussions/' + payload.id + '/resolve', { resolved: true }, 'delegate'))
      .status,
    200,
  );
  assert.equal(
    (
      await f.call(
        '/discussions/' + payload.id + '/reply',
        { id: randomUUID(), body: 'Massa tard' },
        'b',
      )
    ).status,
    409,
  );
  assert.equal(
    (await f.call('/discussions/' + payload.id + '/resolve', { resolved: false }, 'a')).status,
    200,
  );
  f.db.prepare("DELETE FROM enrollments WHERE user_id='b'").run();
  assert.equal((await f.call('/discussions/' + payload.id, undefined, 'b')).status, 403);
  assert.equal((await f.call('/discussions/' + payload.id, undefined, 'admin')).status, 200);
  assert.equal((await f.call('/discussions/' + payload.id, undefined, 'unknown')).status, 401);
  f.db.close();
});

test('thread and reply sends are idempotent after lost responses; changing nonce cannot bypass duplicates', async () => {
  const f = await fixture(),
    payload = f.create();
  const results = await Promise.all([
    f.call('/discussions', payload),
    f.call('/discussions', payload),
  ]);
  assert.ok(results.every((r) => [200, 201].includes(r.status)));
  assert.equal(f.db.prepare('SELECT COUNT(*) n FROM subject_threads').get().n, 1);
  assert.equal((await f.call('/discussions', { ...payload, body: 'Canviat' })).status, 409);
  assert.equal(
    (await f.call('/discussions', { ...payload, id: randomUUID(), nonce: 'bypass' })).status,
    409,
  );
  const reply = { id: randomUUID(), body: 'Aplica la regla de la cadena.' };
  assert.equal((await f.call('/discussions/' + payload.id + '/reply', reply, 'b')).status, 201);
  assert.equal((await f.call('/discussions/' + payload.id + '/reply', reply, 'b')).status, 200);
  assert.equal(
    (await f.call('/discussions/' + payload.id + '/reply', { ...reply, id: randomUUID() }, 'b'))
      .status,
    409,
  );
  assert.equal((await f.call('/discussions/' + payload.id + '/reply', reply, 'a')).status, 409);
  assert.equal(f.db.prepare('SELECT COUNT(*) n FROM subject_replies').get().n, 1);
  f.db.close();
});

test('reply and thread paging has stable cursors and no duplicated or missing boundary rows', async () => {
  const f = await fixture(),
    payload = f.create();
  await f.call('/discussions', payload);
  for (let i = 0; i < 56; i++)
    f.db
      .prepare(
        'INSERT INTO subject_replies(id,thread_id,author_id,body,request_hash) VALUES(?,?,?,?,?)',
      )
      .run(randomUUID(), payload.id, 'b', 'Resposta ' + i, 'hash' + i);
  const first = await (await f.call('/discussions/' + payload.id)).json();
  assert.equal(first.replies.length, 50);
  assert.ok(first.next);
  const second = await (
    await f.call('/discussions/' + payload.id + '?before=' + first.next)
  ).json();
  assert.equal(second.replies.length, 6);
  assert.equal(second.next, null);
  assert.equal(new Set([...first.replies, ...second.replies].map((r) => r.id)).size, 56);
  for (let i = 0; i < 33; i++)
    f.db
      .prepare(
        'INSERT INTO subject_threads(id,offering_id,author_id,title,body,request_hash) VALUES(?,?,?,?,?,?)',
      )
      .run(randomUUID(), f.room.id, 'a', 'Dubte ' + i, 'Prova ' + i, 'thread' + i);
  const list = await (await f.call('/discussions?room=' + f.room.id)).json();
  assert.equal(list.items.length, 30);
  const older = await (
    await f.call('/discussions?room=' + f.room.id + '&before=' + list.next)
  ).json();
  assert.equal(older.items.length, 4);
  assert.equal(new Set([...list.items, ...older.items].map((r) => r.id)).size, 34);
  assert.equal((await f.call('/discussions/' + payload.id + '?before=-1')).status, 400);
  f.db.close();
});

test('material links must be published and belong to room subject; only intended public data returned', async () => {
  const f = await fixture();
  f.db.exec(
    "INSERT INTO notes(id,author_id,subject_id,title,body,summary,status) VALUES('private','b','math','Secret','private-content','Secret','draft'); INSERT INTO notes(id,author_id,subject_id,title,body,summary) VALUES('other','b','phy','Física','Física','Física');",
  );
  for (const note_id of ['private', 'other', 'missing'])
    assert.equal((await f.call('/discussions', f.create({ note_id }))).status, 400);
  const p = f.create();
  assert.equal((await f.call('/discussions', p)).status, 201);
  const detail = await (await f.call('/discussions/' + p.id)).json();
  assert.equal(detail.thread.note_title, 'Derivades');
  assert.ok(!JSON.stringify(detail).includes('@fje.edu'));
  assert.ok(!Object.hasOwn(detail.thread, 'request_hash'));
  f.db.close();
});

test('reports reach authorized moderators; users cannot delete another person reply; withdrawn text disappears', async () => {
  const f = await fixture(),
    p = f.create();
  await f.call('/discussions', p);
  const r = { id: randomUUID(), body: 'Una resposta' };
  await f.call('/discussions/' + p.id + '/reply', r, 'b');
  assert.equal(
    (await f.call('/discussions/' + p.id + '/reply/' + r.id, undefined, 'a', 'DELETE')).status,
    403,
  );
  assert.equal(
    (await f.call('/discussions/' + p.id + '/reply/' + r.id, undefined, 'delegate', 'DELETE'))
      .status,
    200,
  );
  assert.equal(f.db.prepare('SELECT body FROM subject_replies WHERE id=?').get(r.id).body, '');
  assert.equal(
    (await f.call('/discussions/' + p.id + '/report', { reason: 'Revisar aquest fil' }, 'b'))
      .status,
    200,
  );
  assert.equal(
    (await f.call('/discussions/' + p.id + '/report', { reason: 'Repetició' }, 'b')).status,
    200,
  );
  assert.equal(f.db.prepare('SELECT COUNT(*) n FROM reports').get().n, 1);
  for (const [uid, count] of [
    ['delegate', 1],
    ['outside', 0],
    ['admin', 1],
  ])
    assert.equal((await (await f.call('/admin', undefined, uid)).json()).reports.length, count);
  const report = f.db.prepare('SELECT id FROM reports').get();
  assert.equal((await f.call('/admin/reports', { id: report.id }, 'outside')).status, 403);
  assert.equal((await f.call('/discussions/' + p.id, undefined, 'b', 'DELETE')).status, 403);
  assert.equal((await f.call('/discussions/' + p.id, undefined, 'a', 'DELETE')).status, 200);
  assert.equal((await f.call('/discussions/' + p.id)).status, 404);
  f.db.close();
});

test('discussion search finds older threads beyond first page, folds accents and treats SQL wildcards literally', async () => {
  const f = await fixture(),
    p = f.create({ title: 'Derivació de la funció', body: 'Com combinem les regles?' });
  await f.call('/discussions', p);
  for (let i = 0; i < 33; i++)
    f.db
      .prepare(
        'INSERT INTO subject_threads(id,offering_id,author_id,title,body,request_hash) VALUES(?,?,?,?,?,?)',
      )
      .run(randomUUID(), f.room.id, 'a', 'Altre ' + i, 'Resposta ' + i, 'search' + i);
  const list = await (await f.call('/discussions?room=' + f.room.id)).json();
  assert.ok(!list.items.some((t) => t.id === p.id));
  const found = await (
    await f.call('/discussions?room=' + f.room.id + '&q=derivacio%20funcio')
  ).json();
  assert.deepEqual(
    found.items.map((t) => t.id),
    [p.id],
  );
  const literal = await (await f.call('/discussions?room=' + f.room.id + '&q=%25')).json();
  assert.equal(literal.items.length, 0);
  const resolved = await (
    await f.call('/discussions?room=' + f.room.id + '&state=resolved')
  ).json();
  assert.equal(resolved.items.length, 0);
  f.db.close();
});

test('per-account publication limits persist across changed request UUIDs', async () => {
  const f = await fixture();
  for (let i = 0; i < 6; i++)
    assert.equal(
      (await f.call('/discussions', f.create({ title: 'Pregunta ' + i, body: 'Contingut ' + i })))
        .status,
      201,
    );
  assert.equal((await f.call('/discussions', f.create({ title: 'Setena' }))).status, 429);
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
  assert.equal((await f.call('/events', { ...event, visibility: 'shared' })).status, 403);
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
