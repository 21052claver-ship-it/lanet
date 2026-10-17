import test from 'node:test';
import assert from 'node:assert/strict';
import app from '../worker/index.js';
import { hash } from '../worker/utils.js';
import { eventSubjectIds, agendaListItems } from '../shared/agenda.js';
import { testEnvironment } from './helpers/d1.js';

test('agenda subject matching supports personal dates and every subject of a plus', () => {
  assert.deepEqual(eventSubjectIds(null), []);
  assert.deepEqual(eventSubjectIds({ subject_id: 'math' }), ['math']);
  assert.deepEqual(eventSubjectIds({ subject_id: 'math', subject_ids: ['math', 'phy'] }), [
    'math',
    'phy',
  ]);
  assert.deepEqual(eventSubjectIds({ subject_ids: ['math', 'phy'] }), ['math', 'phy']);
});

test('completed overdue tasks reappear when requested, alongside pending tasks and the selected date range', () => {
  const events = [
    { id: 'done', kind: 'exam', display_kind: 'task', date: '2026-10-12', done: 1 },
    { id: 'pending', kind: 'exam', display_kind: 'task', date: '2026-10-12', done: 0 },
    { id: 'past-exam', kind: 'exam', date: '2026-10-12' },
    { id: 'next', kind: 'exam', date: '2026-10-20' },
    { id: 'far', kind: 'exam', date: '2027-10-20' },
  ];
  assert.deepEqual(
    agendaListItems(events, '2026-10-17', '2026-10-17').map((e) => e.id),
    ['pending', 'next'],
  );
  assert.deepEqual(
    agendaListItems(events, '2026-10-17', '2026-10-17', true).map((e) => e.id),
    ['done', 'pending', 'next'],
  );
  assert.ok(
    agendaListItems(events, '2026-10-12', '2026-10-17', true).some((e) => e.id === 'past-exam'),
  );
});

test('a private calendar plus keeps all subject associations, even after withdrawal, without duplicate events', async () => {
  const { db, env } = testEnvironment();
  try {
    for (const id of ['author', 'reader', 'peer']) {
      db.prepare(
        "INSERT INTO users(id,email,name,password_hash,salt,google_sub,configured) VALUES(?,?,?,'x','x',?,1)",
      ).run(id, id + '@example.invalid', id, 'fixture-' + id);
      db.prepare(
        "INSERT INTO sessions(hash,user_id,expires,auth_provider) VALUES(?,?,?,'google')",
      ).run(await hash(id), id, Date.now() + 3600000);
    }
    db.exec(
      "INSERT INTO pluses(id,author_id,title,body,date,place) VALUES('multi-subject','author','Visita fictícia','Una activitat de dues matèries','2026-10-20','Centre fictici'); INSERT INTO plus_subjects VALUES('multi-subject','math','+0,5'),('multi-subject','phy','+0,25')",
    );
    async function call(path, user = 'reader', method = 'GET') {
      const response = await app.fetch(
        new Request('https://lanet.example/api' + path, {
          method,
          headers: {
            Cookie: 'lanet_session=' + user,
            Origin: 'https://lanet.example',
            'Content-Type': 'application/json',
          },
          ...(method === 'POST' ? { body: '{}' } : {}),
        }),
        env,
        {},
      );
      assert.equal(response.status, 200);
      return response.json();
    }
    await call('/pluses/multi-subject/calendar', 'reader', 'POST');
    await call('/pluses/multi-subject/calendar', 'reader', 'POST');
    const before = (await call('/bootstrap')).events;
    assert.equal(before.length, 1);
    assert.deepEqual(eventSubjectIds(before[0]).sort(), ['math', 'phy']);
    assert.equal(before[0].visibility, 'private');
    assert.equal((await call('/bootstrap', 'peer')).events.length, 0);
    db.exec("UPDATE pluses SET status='archived' WHERE id='multi-subject'");
    const after = await call('/bootstrap');
    assert.equal(after.pluses.length, 0);
    assert.deepEqual(eventSubjectIds(after.events[0]).sort(), ['math', 'phy']);
    assert.equal(after.events[0].id, before[0].id);
  } finally {
    db.close();
  }
});
