import test from 'node:test';
import assert from 'node:assert/strict';
import { testEnvironment } from './helpers/d1.js';
import { session } from '../worker/auth.js';
import { one, run, hash } from '../worker/utils.js';
import worker from '../worker/index.js';
const environment = testEnvironment;
function request(
  env,
  path,
  { method = 'GET', cookie = '', origin = 'http://localhost', data } = {},
) {
  return worker.fetch(
    new Request('http://localhost/api' + path, {
      method,
      headers: { Cookie: cookie, Origin: origin, 'Content-Type': 'application/json' },
      body: data === undefined ? undefined : JSON.stringify(data),
    }),
    env,
  );
}
// Google fixture: regression tests of private preferences, agenda and content.
async function enter(env) {
  const uid = crypto.randomUUID();
  await run(
    env,
    'INSERT INTO users(id,email,name,password_hash,salt,google_sub,password_enabled,configured,group_id) VALUES(?,?,?,?,?,?,0,1,?)',
    uid,
    uid + '@fje.edu',
    'Nom Google',
    'unusable',
    'salt',
    'google-' + uid,
    '2B',
  );
  await run(env, 'INSERT INTO enrollments(user_id,offering_id) VALUES(?,?)', uid, '2B-cat');
  await run(
    env,
    'INSERT INTO grade_entries(id,user_id,subject_id,term,category,title,weight,grade) VALUES(?,?,?,1,?,?,30,8)',
    uid,
    uid,
    'cat',
    'exam',
    'Parcial 1',
  );
  await run(
    env,
    'INSERT INTO ledger(id,user_id,amount,reason,ref,day) VALUES(?,?,5,?,?,?)',
    uid,
    uid,
    'Test',
    uid,
    '2026-10-11',
  );
  const response = await session(
    await one(env, 'SELECT * FROM users WHERE id=?', uid),
    new Request('http://localhost'),
    env,
  );
  assert.match(response.headers.get('Set-Cookie'), /HttpOnly; Path=\/; SameSite=Lax/);
  return {
    cookie: response.headers.get('Set-Cookie').split(';')[0],
    user: (await response.json()).user,
  };
}
test('Les preferències són personals, persisteixen i no modifiquen matrícula, notes o saldo', async () => {
  const { db, env } = environment();
  try {
    const a = await enter(env),
      b = await enter(env);
    const before = await (await request(env, '/bootstrap', a)).json();
    assert.equal(
      (
        await request(env, '/preferences', {
          ...a,
          method: 'POST',
          data: { notesSubjects: ['math'], showBoard: false },
        })
      ).status,
      200,
    );
    assert.equal(
      (
        await request(env, '/preferences', {
          ...a,
          method: 'POST',
          data: { density: 'comfortable' },
        })
      ).status,
      200,
    );
    const after = await (await request(env, '/bootstrap', a)).json();
    assert.deepEqual(after.preferences.notesSubjects, ['math']);
    assert.equal(after.preferences.showBoard, true);
    assert.equal(
      JSON.parse(
        db.prepare('SELECT value FROM user_preferences WHERE user_id=?').get(a.user.id).value,
      ).showBoard,
      true,
    );
    assert.equal(after.preferences.density, 'comfortable');
    assert.deepEqual(after.enrollments, before.enrollments);
    assert.deepEqual(after.grades, before.grades);
    assert.equal(after.user.balance, before.user.balance);
    assert.equal(
      (await (await request(env, '/bootstrap', b)).json()).preferences.notesSubjects,
      null,
    );
    assert.equal(
      (
        await request(env, '/profile', {
          ...a,
          method: 'POST',
          data: { name: 'Canvi invàlid', preferences: { notesSubjects: ['unknown'] } },
        })
      ).status,
      403,
    );
    assert.equal((await (await request(env, '/bootstrap', a)).json()).user.name, before.user.name);
  } finally {
    db.close();
  }
});
test('Agenda: tasques privades i progrés personal amb control de visibilitat', async () => {
  const { db, env } = environment();
  try {
    const a = await enter(env),
      b = await enter(env);
    const created = await request(env, '/events', {
      ...a,
      method: 'POST',
      data: {
        title: 'Tasca privada',
        kind: 'task',
        date: '2026-10-20',
        visibility: 'private',
        subject_id: 'math',
      },
    });
    assert.equal(created.status, 200);
    const { id } = await created.json();
    assert.equal(
      (
        await request(env, '/events/' + id + '/progress', {
          ...b,
          method: 'POST',
          data: { done: true },
        })
      ).status,
      404,
    );
    assert.equal(
      (
        await request(env, '/events/' + id + '/progress', {
          ...a,
          method: 'POST',
          data: { done: 'yes' },
        })
      ).status,
      400,
    );
    assert.equal(
      (
        await request(env, '/events/' + id + '/progress', {
          ...a,
          method: 'POST',
          data: { done: true },
        })
      ).status,
      200,
    );
    const event = (await (await request(env, '/bootstrap', a)).json()).events.find(
      (e) => e.id === id,
    );
    assert.equal(event.kind, 'reminder');
    assert.equal(event.display_kind, 'task');
    assert.equal(event.done, 1);
    assert.ok(
      !(await (await request(env, '/bootstrap', b)).json()).events.some((e) => e.id === id),
    );
    db.prepare("UPDATE events SET visibility='shared',group_id='2B' WHERE id=?").run(id);
    assert.equal(
      (await (await request(env, '/bootstrap', b)).json()).events.find((e) => e.id === id).done,
      0,
    );
  } finally {
    db.close();
  }
});

test('Convidat antic: cookie valida no dona acces pero conserva dades', async () => {
  const { db, env } = environment();
  try {
    db.exec(
      "INSERT INTO users(id,email,name,password_hash,salt) VALUES('guest:old','old@guest.lanet.invalid','Convidat','unusable','salt');INSERT INTO user_preferences(user_id,value) VALUES('guest:old','{\"hideGrades\":true}')",
    );
    const token = crypto.randomUUID();
    db.prepare('INSERT INTO sessions(hash,user_id,expires) VALUES(?,?,?)').run(
      await hash(token),
      'guest:old',
      Date.now() + 3600000,
    );
    const old = { cookie: 'lanet_session=' + token };
    for (const enabled of ['true', 'false']) {
      env.GUEST_ACCESS = enabled;
      env.DEMO_MODE = enabled;
      assert.equal((await request(env, '/bootstrap', old)).status, 401);
      assert.equal((await request(env, '/auth/guest', { ...old, method: 'POST' })).status, 403);
      const status = await (await request(env, '/auth/status', old)).json();
      assert.equal(status.guest, false);
      assert.equal(status.demo, false);
      assert.equal(status.authenticated, false);
    }
    assert.equal(db.prepare('SELECT COUNT(*) AS n FROM users').get().n, 1);
    assert.equal(
      db.prepare('SELECT value FROM user_preferences').get().value,
      '{"hideGrades":true}',
    );
  } finally {
    db.close();
  }
});
test('Google: sessio persisteix en recarregar i es revoca en sortir', async () => {
  const { db, env } = environment();
  try {
    const user = await enter(env);
    assert.equal((await (await request(env, '/auth/status', user)).json()).authenticated, true);
    assert.equal((await request(env, '/bootstrap', user)).status, 200);
    assert.equal((await request(env, '/auth/logout', { ...user, method: 'POST' })).status, 200);
    assert.equal((await request(env, '/bootstrap', user)).status, 401);
    assert.equal(db.prepare('SELECT COUNT(*) AS n FROM users').get().n, 1);
  } finally {
    db.close();
  }
});
test('Google: primer usuari sense privilegis i bootstrap antic tancat encara amb codi valid', async () => {
  const { db, env } = environment();
  try {
    env.BOOTSTRAP_TOKEN = 'isolated-test-only';
    const user = await enter(env);
    assert.equal((await (await request(env, '/auth/status', user)).json()).initialized, false);
    assert.equal(
      (
        await request(env, '/auth/bootstrap', {
          ...user,
          method: 'POST',
          data: {
            email: 'admin@fje.edu',
            name: 'Admin',
            password: 'OldPassword',
            code: env.BOOTSTRAP_TOKEN,
          },
        })
      ).status,
      403,
    );
    assert.equal(db.prepare("SELECT COUNT(*) AS n FROM users WHERE role='admin'").get().n, 0);
    assert.equal((await request(env, '/admin', user)).status, 403);
  } finally {
    db.close();
  }
});
