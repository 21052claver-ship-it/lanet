import test from 'node:test';
import assert from 'node:assert/strict';
import { createReactionWriter } from '../shared/reaction-writer.js';
import { createDataSync } from '../shared/async-state.js';
import { resourceRoute } from '../worker/resources.js';
import { testEnvironment } from './helpers/d1.js';
function gate() {
  let resolve, reject;
  const promise = new Promise((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
}
function fixture(write) {
  let data = { notes: [{ id: 'n', liked: false, likes: 4, saved: false, title: 'Original' }] },
    reads = 0;
  const sync = createDataSync({
    read: async () => {
      reads++;
      return data;
    },
    apply: (value) => {
      data = value;
    },
  });
  const errors = [];
  const writer = createReactionWriter({
    getItem: (resource, id) => data[resource].find((item) => item.id === id),
    update: (resource, id, change) => {
      data = {
        ...data,
        [resource]: data[resource].map((item) => (item.id === id ? change(item) : item)),
      };
    },
    sync,
    write,
    onError: (error) => errors.push(error),
  });
  return { writer, item: () => data.notes[0], reads: () => reads, errors };
}
test('reaction is visible before the POST resolves, shared lock prevents duplicates, canonical count wins', async () => {
  const request = gate();
  let calls = 0;
  const f = fixture(async (path, body) => {
    calls++;
    assert.equal(path, '/notes/n/like');
    assert.deepEqual(body, { active: true });
    return request.promise;
  });
  const save = f.writer.toggle('notes', 'n', 'like');
  assert.equal(f.item().liked, true);
  assert.equal(f.item().likes, 5);
  assert.equal(f.writer.isPending('notes', 'n', 'like'), true);
  assert.equal(await f.writer.toggle('notes', 'n', 'like'), false);
  assert.equal(calls, 1);
  request.resolve({ reaction: { liked: 1, likes: 9 } });
  assert.equal(await save, true);
  assert.equal(f.item().likes, 9);
  assert.equal(f.item().title, 'Original');
  assert.equal(f.writer.isPending('notes', 'n', 'like'), false);
  assert.equal(f.reads(), 0, 'No full bootstrap needed to confirm a reaction');
});
test('a rejected like rolls back only its own fields while a save commits independently', async () => {
  const like = gate(),
    saved = gate();
  const f = fixture((path) => (path.endsWith('/like') ? like.promise : saved.promise));
  const a = f.writer.toggle('notes', 'n', 'like'),
    b = f.writer.toggle('notes', 'n', 'save');
  assert.equal(f.item().liked && f.item().saved, true);
  saved.resolve({ reaction: { saved: 1 } });
  await b;
  like.reject(new Error('No autoritzat'));
  assert.equal(await a, false);
  assert.deepEqual(f.item(), { id: 'n', liked: false, likes: 4, saved: true, title: 'Original' });
  assert.equal(f.errors.length, 1);
  assert.equal(f.reads(), 1);
});
test('late snapshots cannot undo a confirmed optimistic reaction', async () => {
  const stale = gate(),
    fresh = gate(),
    post = gate();
  let reads = 0;
  let item = { id: 'n', liked: false, likes: 0 };
  const sync = createDataSync({
    read: () => (reads++ === 0 ? stale.promise : fresh.promise),
    apply: (value) => {
      item = value;
    },
  });
  const writer = createReactionWriter({
    getItem: () => item,
    update: (_, __, change) => {
      item = change(item);
    },
    sync,
    write: () => post.promise,
  });
  const old = sync.refresh(),
    pending = writer.toggle('notes', 'n', 'like');
  post.resolve({ reaction: { liked: 1, likes: 2 } });
  await pending;
  stale.resolve({ id: 'n', liked: false, likes: 0 });
  await old;
  assert.equal(item.liked, true);
  assert.equal(item.likes, 2);
  fresh.resolve({ id: 'n', liked: true, likes: 2 });
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(item.liked, true);
  assert.equal(item.likes, 2);
});
test('a compatible older response retains the optimistic state and removing a like cannot make a negative count', async () => {
  const f = fixture(async () => ({ ok: true }));
  await f.writer.toggle('notes', 'n', 'like');
  assert.equal(f.item().likes, 5);
  await f.writer.toggle('notes', 'n', 'like');
  assert.equal(f.item().likes, 4);
  assert.equal(f.item().liked, false);
  assert.equal(await f.writer.toggle('notes', 'deleted', 'save'), false);
});
test('lightweight endpoints return authoritative counts and private save state; rewards remain idempotent', async (t) => {
  const { db, env } = testEnvironment();
  t.after(() => db.close());
  for (const id of ['a', 'b'])
    db.prepare(
      "INSERT INTO users(id,email,name,password_hash,salt) VALUES(?,?,?,'unusable','fixture')",
    ).run(id, id + '@fje.edu', 'Usuari ' + id);
  db.exec(
    "INSERT INTO notes(id,author_id,subject_id,title) VALUES('n','a','math','Recurs'); INSERT INTO pluses(id,author_id,title,body,date,place) VALUES('p','a','Plus','Prova','2026-10-20','Aula'); INSERT INTO proposals(id,author_id,title,body) VALUES('q','a','Proposta','Prova');",
  );
  const post = async (path, active, user = 'b') =>
    JSON.parse(
      JSON.stringify(
        await resourceRoute(
          new Request('https://lanet.example/api' + path, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ active }),
          }),
          env,
          { id: user },
          '/api' + path,
        ),
      ),
    );
  const balance = db.prepare("SELECT balance FROM users WHERE id='a'").get().balance;
  for (const resource of ['notes/n', 'pluses/p']) {
    assert.deepEqual((await post('/' + resource + '/like', true)).reaction, { liked: 1, likes: 1 });
    assert.deepEqual((await post('/' + resource + '/like', true)).reaction, { liked: 1, likes: 1 });
    await post('/' + resource + '/like', false);
    assert.deepEqual((await post('/' + resource + '/like', true)).reaction, { liked: 1, likes: 1 });
    assert.deepEqual((await post('/' + resource + '/save', true)).reaction, { saved: 1 });
    assert.deepEqual((await post('/' + resource + '/save', false, 'a')).reaction, { saved: 0 });
  }
  assert.equal(db.prepare("SELECT balance FROM users WHERE id='a'").get().balance, balance + 2);
  await post('/proposals/q/vote', true, 'a');
  assert.deepEqual((await post('/proposals/q/vote', true)).reaction, { voted: 1, votes: 2 });
  assert.deepEqual((await post('/proposals/q/vote', true)).reaction, { voted: 1, votes: 2 });
  assert.deepEqual((await post('/proposals/q/vote', false)).reaction, { voted: 0, votes: 1 });
  db.prepare("UPDATE notes SET status='draft' WHERE id='n'").run();
  await assert.rejects(post('/notes/n/like', true), (error) => error.status === 403);
});
