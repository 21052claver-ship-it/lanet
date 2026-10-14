import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import app from '../worker/index.js';
import { hash } from '../worker/utils.js';
import { testEnvironment } from './helpers/d1.js';
import { eventConflicts, equivalentOfferings, userUnit } from '../shared/delegation.js';
import { OFFICIAL_OFFERINGS, OFFICIAL_SLOTS } from '../shared/official-schedule.js';
import { NOTIFICATION_QUERY } from '../worker/agenda.js';

async function fixture() {
  const { db, env } = testEnvironment();
  for (const [uid, group, tutor, role] of [
    ['a', '2A', 'comellas', 'student'],
    ['peer', '2B', 'comellas', 'student'],
    ['del', '2A', 'comellas', 'student'],
    ['sub', '2B', 'ocana', 'student'],
    ['other', '2C', 'closa', 'student'],
    ['admin', '2A', 'comellas', 'admin'],
  ]) {
    db.prepare(
      "INSERT INTO users(id,email,name,password_hash,salt,google_sub,group_id,role,configured) VALUES(?,?,?,'x','x',?,?,?,1)",
    ).run(uid, uid + '@fje.edu', uid, uid, group, role);
    db.prepare(
      "INSERT INTO sessions(hash,user_id,expires,auth_provider) VALUES(?,?,?,'google')",
    ).run(await hash(uid), uid, Date.now() + 3600000);
    for (const oid of [
      `${group}-tutor-${tutor}`,
      group === '2C' ? '2C-smath' : `${group}-math`,
      `${group}-art`,
    ])
      db.prepare('INSERT INTO enrollments VALUES(?,?)').run(uid, oid);
    if (group !== '2C') db.prepare('INSERT INTO enrollments VALUES(?,?)').run(uid, group + '-phy');
  }
  db.exec(
    "INSERT INTO delegation_members VALUES('del@fje.edu','tech1','Delegat de prova','delegate',1),('sub@fje.edu','tech1','Subdelegat de prova','subdelegate',1),('other@fje.edu','social','Delegada de prova','delegate',1);",
  );
  async function call(path, b, uid = 'a', method = b === undefined ? 'GET' : 'POST') {
    const response = await app.fetch(
      new Request('https://lanet.example/api' + path, {
        method,
        headers: { Cookie: 'lanet_session=' + uid, 'Content-Type': 'application/json' },
        ...(b === undefined ? {} : { body: JSON.stringify(b) }),
      }),
      env,
      { waitUntil: (p) => p.catch(() => {}) },
    );
    return { status: response.status, value: await response.json() };
  }
  const payload = (overrides = {}) => ({
    title: 'Parcial de derivades',
    kind: 'exam',
    date: '2026-10-23',
    start: '09:10',
    end: '10:10',
    subject_id: 'math',
    visibility: 'shared',
    audience_kind: 'class',
    ...overrides,
  });
  return { db, env, call, payload };
}
test('migration adds review schema without changing legacy events or account roles', () => {
  const { db } = testEnvironment({ through: '0027_subject_workspaces.sql' });
  db.exec(
    "INSERT INTO users(id,email,name,password_hash,salt,role) VALUES('old','old@fje.edu','Old','x','x','student'); INSERT INTO events(id,owner_id,title,kind,date,visibility) VALUES('old','old','Original','exam','2026-10-21','shared');",
  );
  const before = db.prepare("SELECT * FROM events WHERE id='old'").get();
  db.exec(readFileSync('migrations/0028_delegate_agenda.sql', 'utf8'));
  const after = db.prepare("SELECT * FROM events WHERE id='old'").get();
  for (const [k, v] of Object.entries(before)) assert.equal(after[k], v);
  assert.equal(after.review_status, 'approved');
  assert.equal(after.audience_kind, 'group');
  assert.equal(db.prepare("SELECT role FROM users WHERE id='old'").get().role, 'student');
  db.close();
});
test('every student can propose publicly; only owner and assigned representatives see pending; approval publishes and notifies', async () => {
  const f = await fixture();
  const sent = await f.call('/events', f.payload());
  assert.equal(sent.status, 200);
  assert.equal(sent.value.status, 'pending');
  const eid = sent.value.id;
  const own = (await f.call('/bootstrap')).value;
  assert.ok(own.agendaProposals.some((e) => e.id === eid));
  assert.ok(!own.events.some((e) => e.id === eid));
  const peer = (await f.call('/bootstrap', undefined, 'peer')).value;
  assert.ok(!peer.agendaProposals.some((e) => e.id === eid));
  const delegated = (await f.call('/bootstrap', undefined, 'del')).value;
  assert.ok(delegated.agendaProposals.some((e) => e.id === eid));
  assert.equal(delegated.user.role, 'student');
  assert.equal(
    (
      await f.call(
        '/events/' + eid + '/review',
        { revision: 1, decision: 'approve', confirmed: true },
        'other',
      )
    ).status,
    404,
  );
  assert.equal(
    (await f.call('/events/' + eid + '/review', { revision: 1, decision: 'approve' }, 'del'))
      .status,
    400,
  );
  assert.equal(
    (
      await f.call(
        '/events/' + eid + '/review',
        { revision: 1, decision: 'approve', confirmed: true },
        'sub',
      )
    ).status,
    200,
  );
  const published = (await f.call('/bootstrap', undefined, 'peer')).value;
  assert.ok(published.events.some((e) => e.id === eid));
  const resolved = (await f.call('/bootstrap')).value;
  assert.equal(resolved.agendaNotifications.length, 1);
  assert.equal(resolved.events.find((e) => e.id === eid).reviewer, 'sub');
  assert.equal(
    (
      await f.call(
        '/events/' + eid + '/review',
        { revision: 1, decision: 'approve', confirmed: true },
        'del',
      )
    ).status,
    409,
  );
  assert.equal(f.db.prepare('SELECT COUNT(*) n FROM agenda_notifications').get().n, 1);
  const nid = resolved.agendaNotifications[0].id;
  await f.call('/agenda/notifications/read', { ids: [nid] }, 'peer');
  assert.equal(
    f.db.prepare('SELECT read_at FROM agenda_notifications WHERE id=?').get(nid).read_at,
    null,
  );
  await f.call('/agenda/notifications/read', { ids: [nid] });
  assert.ok(f.db.prepare('SELECT read_at FROM agenda_notifications WHERE id=?').get(nid).read_at);
  f.db.close();
});
test('private dates never reach representatives or other students, including preview conflicts', async () => {
  const f = await fixture();
  const result = await f.call('/events', f.payload({ visibility: 'private' }));
  assert.equal(result.status, 200);
  for (const uid of ['del', 'peer', 'admin']) {
    const data = (await f.call('/bootstrap', undefined, uid)).value;
    assert.ok(!data.events.some((e) => e.id === result.value.id));
  }
  const preview = await f.call('/agenda/preview', f.payload(), 'del');
  assert.equal(preview.status, 200);
  assert.equal(preview.value.conflicts.length, 0);
  assert.equal(
    (await f.call('/events/' + result.value.id, undefined, 'del', 'DELETE')).status,
    404,
  );
  f.db.close();
});

test('old unread notices remain accessible behind over 100 newer read notices; inbox is bounded and private', async () => {
  const f = await fixture();
  const insert = f.db.prepare(
    'INSERT INTO agenda_notifications(id,user_id,title,body,read_at,created_at) VALUES(?,?,?,?,?,?)',
  );
  insert.run('old-unread', 'a', 'Antic pendent', 'Pendent', null, '2026-09-01T10:00:00.000Z');
  insert.run('peer-private', 'peer', 'Privat', 'Només peer', null, '2026-10-15T12:00:00.000Z');
  for (let n = 0; n < 110; n++)
    insert.run(
      `history-${n}`,
      'a',
      'Històric',
      'Ja llegit',
      '2026-10-15T12:00:00.000Z',
      '2026-10-15T10:00:00.000Z',
    );
  const data = (await f.call('/bootstrap')).value;
  assert.equal(data.agendaNotifications.length, 100);
  assert.equal(data.agendaNotifications[0].id, 'old-unread');
  assert.equal(data.agendaNotificationsMoreUnread, false);
  assert.ok(data.agendaNotifications.every((n) => n.user_id === 'a'));
  const plan = f.db.prepare('EXPLAIN QUERY PLAN ' + NOTIFICATION_QUERY).all('a', 101, 'a', 100);
  assert.equal(plan.filter((p) => p.detail.includes('agenda_notifications_user')).length, 2);
  f.db.close();
});

test('bounded unread batches drain without losing concurrent arrivals; a read is one idempotent scoped update', async () => {
  const f = await fixture();
  const insert = f.db.prepare(
    'INSERT INTO agenda_notifications(id,user_id,title,body,created_at) VALUES(?,?,?,?,?)',
  );
  for (let n = 0; n < 102; n++)
    insert.run(`unread-${n}`, 'a', 'Pendent', 'Cos', '2026-10-15T10:00:00.000Z');
  insert.run('peer-private', 'peer', 'Privat', 'Cos privat', '2026-10-15T11:00:00.000Z');
  const first = (await f.call('/bootstrap')).value;
  assert.equal(first.agendaNotifications.length, 100);
  assert.equal(first.agendaNotificationsMoreUnread, true);
  insert.run('new-arrival', 'a', 'Nova', 'Després de veure la llista', '2026-10-15T12:00:00.000Z');
  let updates = 0;
  const prepare = f.env.DB.prepare;
  f.env.DB.prepare = (query) => {
    if (query.startsWith('UPDATE agenda_notifications')) updates++;
    return prepare(query);
  };
  const ids = first.agendaNotifications.map((n) => n.id);
  const read = await f.call('/agenda/notifications/read', { ids });
  assert.equal(read.status, 200);
  assert.equal(updates, 1);
  assert.equal(read.value.ids.length, 100);
  assert.ok(Number.isFinite(Date.parse(read.value.read_at)));
  assert.equal(
    f.db
      .prepare("SELECT COUNT(*) n FROM agenda_notifications WHERE user_id='a' AND read_at IS NULL")
      .get().n,
    3,
  );
  const next = (await f.call('/bootstrap')).value;
  assert.equal(next.agendaNotificationsMoreUnread, false);
  assert.equal(next.agendaNotifications.filter((n) => !n.read_at).length, 3);
  assert.equal(next.agendaNotifications[0].id, 'new-arrival');
  await f.call('/agenda/notifications/read', { ids: [ids[0], ids[0], 'peer-private'] });
  assert.equal(
    f.db.prepare('SELECT read_at FROM agenda_notifications WHERE id=?').get(ids[0]).read_at,
    read.value.read_at,
  );
  assert.equal(
    f.db.prepare("SELECT read_at FROM agenda_notifications WHERE id='peer-private'").get().read_at,
    null,
  );
  const before = updates;
  assert.equal((await f.call('/agenda/notifications/read', { ids: [] })).status, 200);
  assert.equal(updates, before);
  for (const bad of [null, [1], [''], ['x'.repeat(129)], Array(101).fill('x')])
    assert.equal((await f.call('/agenda/notifications/read', { ids: bad })).status, 400);
  f.db.close();
});
test('return requires explanation; changes invalidate revision, approval and prior review', async () => {
  const f = await fixture();
  const sent = await f.call('/events', f.payload());
  const eid = sent.value.id;
  assert.equal(
    (await f.call('/events/' + eid + '/review', { revision: 1, decision: 'return' }, 'del')).status,
    400,
  );
  assert.equal(
    (
      await f.call(
        '/events/' + eid + '/review',
        { revision: 1, decision: 'return', note: 'Comprova el dia.' },
        'del',
      )
    ).status,
    200,
  );
  assert.equal((await f.call('/events/' + eid, { ...f.payload(), revision: 1 })).status, 409);
  assert.equal(
    (await f.call('/events/' + eid, { ...f.payload({ date: '2026-10-24' }), revision: 2 })).status,
    200,
  );
  assert.equal(
    (
      await f.call(
        '/events/' + eid + '/review',
        { revision: 3, decision: 'approve', confirmed: true },
        'del',
      )
    ).status,
    200,
  );
  assert.equal(
    (await f.call('/events/' + eid, { ...f.payload({ date: '2026-10-25' }), revision: 4 })).status,
    200,
  );
  const row = f.db.prepare('SELECT * FROM events WHERE id=?').get(eid);
  assert.equal(row.review_status, 'pending');
  assert.equal(row.reviewed_by, null);
  assert.equal(
    (await f.call('/events/' + eid, { ...f.payload(), revision: 5 }, 'del')).status,
    403,
  );
  f.db.close();
});
test('duplicate exams are blocked despite a renamed title; overlaps require current acknowledgment on submission and approval', async () => {
  const f = await fixture();
  const first = await f.call('/events', f.payload());
  assert.equal(first.status, 200);
  const duplicate = await f.call('/agenda/preview', f.payload({ title: 'Un altre nom' }));
  assert.equal(duplicate.value.conflicts[0].type, 'duplicate');
  assert.equal((await f.call('/events', f.payload({ title: 'Un altre nom' }))).status, 409);
  const second = f.payload({ title: 'Examen de física', subject_id: 'phy' });
  const p = await f.call('/agenda/preview', second);
  assert.equal(p.value.conflicts[0].type, 'overlap');
  assert.equal((await f.call('/events', second)).status, 409);
  const sent = await f.call('/events', { ...second, conflicts_token: p.value.conflicts_token });
  assert.equal(sent.status, 200);
  assert.equal(
    (
      await f.call(
        '/events/' + first.value.id + '/review',
        { revision: 1, decision: 'approve', confirmed: true },
        'del',
      )
    ).status,
    409,
  );
  const check = await f.call('/agenda/preview', { review_id: first.value.id }, 'del');
  assert.equal(
    (
      await f.call(
        '/events/' + first.value.id + '/review',
        {
          revision: 1,
          decision: 'approve',
          confirmed: true,
          conflicts_token: check.value.conflicts_token,
        },
        'del',
      )
    ).status,
    200,
  );
  f.db.close();
});
test('mixed optative targets identical physical classes across itineraries and names every authorized representative', async () => {
  const f = await fixture();
  const payload = f.payload({
    title: 'Treball d’art',
    subject_id: 'art',
    kind: 'task',
    offering_id: '2A-art',
    audience_kind: 'offering',
  });
  const preview = await f.call('/agenda/preview', payload);
  assert.equal(preview.status, 200);
  assert.deepEqual(preview.value.targets.sort(), ['2A-art', '2B-art', '2C-art']);
  assert.ok(preview.value.reviewers.some((m) => m.unit_id === 'social'));
  const sent = await f.call('/events', payload);
  assert.equal(sent.status, 200);
  assert.equal(
    (
      await f.call(
        '/events/' + sent.value.id + '/review',
        { revision: 1, decision: 'approve', confirmed: true },
        'other',
      )
    ).status,
    200,
  );
  assert.ok(
    (await f.call('/bootstrap', undefined, 'other')).value.events.some(
      (e) => e.id === sent.value.id,
    ),
  );
  assert.equal(
    (
      await f.call(
        '/events',
        f.payload({ offering_id: '2C-latin', subject_id: 'latin', audience_kind: 'offering' }),
      )
    ).status,
    403,
  );
  f.db.close();
});
test('forged reviewer scope, group, approval and role cannot grant publication or review power', async () => {
  const f = await fixture();
  const sent = await f.call(
    '/events',
    f.payload({
      group_id: '2C',
      unit_id: 'social',
      review_status: 'approved',
      review_units: ['social'],
      role: 'admin',
    }),
  );
  assert.equal(sent.status, 200);
  const e = f.db.prepare('SELECT * FROM events WHERE id=?').get(sent.value.id);
  assert.equal(e.unit_id, 'tech1');
  assert.equal(e.review_status, 'pending');
  assert.equal(
    (
      await f.call('/events/' + e.id + '/review', {
        revision: 1,
        decision: 'approve',
        confirmed: true,
      })
    ).status,
    403,
  );
  assert.equal((await f.call('/agenda/preview', { review_id: e.id }, 'peer')).status, 403);
  f.db.close();
});
test('delegated withdrawal preserves audit history and notifies owner', async () => {
  const f = await fixture();
  const sent = await f.call('/events', f.payload());
  assert.equal((await f.call('/events/' + sent.value.id, undefined, 'del', 'DELETE')).status, 403);
  assert.equal(f.db.prepare('SELECT COUNT(*) n FROM agenda_notifications').get().n, 0);
  const eid = sent.value.id;
  await f.call(
    '/events/' + eid + '/review',
    { revision: 1, decision: 'approve', confirmed: true },
    'del',
  );
  assert.equal((await f.call('/events/' + eid, undefined, 'sub', 'DELETE')).status, 403);
  assert.equal(
    (await f.call('/events/' + eid + '/review', { revision: 2, decision: 'withdraw' }, 'sub'))
      .status,
    400,
  );
  assert.equal(
    (
      await f.call(
        '/events/' + eid + '/review',
        { revision: 2, decision: 'withdraw', note: 'El professor ha canviat el dia.' },
        'sub',
      )
    ).status,
    200,
  );
  assert.equal(
    f.db.prepare('SELECT COUNT(*) n FROM event_review_history WHERE event_id=?').get(eid).n,
    3,
  );
  const notifications = f.db
    .prepare('SELECT * FROM agenda_notifications WHERE event_id=? AND user_id=?')
    .all(eid, 'a');
  assert.equal(notifications.length, 2);
  assert.ok(
    notifications.some(
      (n) => n.title === 'Data retirada' && n.body.includes('El professor ha canviat el dia.'),
    ),
  );
  assert.equal(
    (await f.call('/bootstrap', undefined, 'peer')).value.events.some((e) => e.id === eid),
    false,
  );
  f.db.close();
});
test('equal start/end, missing start, invalid day and unassigned tutor are rejected', async () => {
  const f = await fixture();
  for (const fields of [{ end: '09:10' }, { start: '', end: '10:10' }, { date: '2026-02-30' }])
    assert.equal((await f.call('/events', f.payload(fields))).status, 400);
  f.db.exec("DELETE FROM enrollments WHERE user_id='a' AND offering_id LIKE '%tutor%'");
  assert.equal((await f.call('/events', f.payload())).status, 400);
  assert.equal((await f.call('/events', f.payload({ visibility: 'private' }))).status, 200);
  f.db.close();
});
test('conflict classifier uses half-open intervals and folds accents; tutor and equivalent classes derive from official data', () => {
  const base = {
    id: 'a',
    date: '2026-10-21',
    kind: 'task',
    subject_id: 'art',
    title: 'Lliurament d’Àrt',
    start: '09:10',
    end: '10:10',
  };
  assert.equal(
    eventConflicts(base, [{ ...base, id: 'b', title: 'lliurament d art' }])[0].type,
    'duplicate',
  );
  assert.equal(
    eventConflicts(base, [{ ...base, id: 'b', start: '10:10', end: '11:10' }]).length,
    0,
  );
  assert.equal(userUnit([{ offering_id: '2B-tutor-comellas' }], OFFICIAL_OFFERINGS).id, 'tech1');
  assert.equal(
    equivalentOfferings(
      OFFICIAL_OFFERINGS.find((o) => o.id === '2A-art'),
      OFFICIAL_OFFERINGS,
      OFFICIAL_SLOTS,
    ).length,
    3,
  );
});
test('database prevents overlapping renamed exams inserted after a stale preview, but permits adjacent intervals', async () => {
  const f = await fixture();
  const sent = await f.call('/events', f.payload());
  assert.equal(sent.status, 200);
  const existing = f.db.prepare('SELECT * FROM events WHERE id=?').get(sent.value.id);
  const insert = f.db.prepare(
    "INSERT INTO events(id,owner_id,title,kind,display_kind,date,start,end,subject_id,visibility,review_status,dedupe_scope,dedupe_identity) VALUES(?,'peer','Un altre títol','exam','test',?,?,?,'math','shared','pending',?,'exam')",
  );
  assert.throws(
    () => insert.run('racing', existing.date, '09:40', '10:40', existing.dedupe_scope),
    /agenda_duplicate/,
  );
  insert.run('adjacent', existing.date, '10:10', '11:10', existing.dedupe_scope);
  assert.throws(
    () => f.db.prepare("UPDATE events SET start='09:40' WHERE id='adjacent'").run(),
    /agenda_duplicate/,
  );
  assert.equal(f.db.prepare("SELECT start FROM events WHERE id='adjacent'").get().start, '10:10');
  f.db.close();
});
test('untimed tasks do not produce noisy time-overlap warnings for unrelated all-day work', () => {
  assert.deepEqual(
    eventConflicts(
      { id: 'a', title: 'Tasca', kind: 'task', date: '2026-10-23', subject_id: 'math' },
      [{ id: 'b', title: 'Examen', kind: 'exam', date: '2026-10-23', subject_id: 'phy' }],
    ),
    [],
  );
});
