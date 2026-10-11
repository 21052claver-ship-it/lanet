import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { testEnvironment } from './helpers/d1.js';
import { pngFixture, webpFixture } from './helpers/media-fixtures.js';
import { queueUnusedFiles, drainFileDeletions } from '../worker/file-lifecycle.js';
import { beginUpload, finishUpload } from '../worker/upload-guard.js';
import { upload, fileResponse, discardUpload, fileStatements } from '../worker/files.js';
import { readLimited, MAX_FILE_BYTES } from '../worker/file-validation.js';
import maintenance from '../worker/maintenance-entry.js';

const user = { id: 'u', role: 'student' };
function fixture(t) {
  const { db, env } = testEnvironment();
  t.after(() => db.close());
  db.exec(
    "INSERT INTO users(id,email,name,password_hash,salt) VALUES('u','u@fje.edu','U','x','x'),('v','v@fje.edu','V','x','x'); INSERT INTO ledger(id,user_id,amount,reason,ref,day) VALUES('fund','u',1000,'fixture','fund','2026-10-11');",
  );
  const objects = new Map();
  let deletesFail = false,
    moderations = 0;
  env.FILES = {
    put: async (k, b) => objects.set(k, b),
    get: async (k) => (objects.has(k) ? { body: new Blob([objects.get(k)]).stream() } : null),
    delete: async (k) => {
      if (deletesFail) throw new Error('R2 temporarily unavailable');
      objects.delete(k);
    },
  };
  env.MEDIA_SAFETY = {
    fetch: async () => {
      moderations++;
      return new Response(webpFixture, {
        headers: { 'Content-Type': 'image/webp', 'X-LaNet-Safety': 'lanet-image-v1' },
      });
    },
  };
  function file(id, original = null, purpose = 'banner') {
    db.prepare(
      "INSERT INTO files(id,owner_id,name,mime,size,object_key,original_object_key,safety_state,safety_policy,upload_purpose,upload_expires_at) VALUES(?,'u','imatge.webp','image/webp',?,?,?,'approved','lanet-image-v1',?,unixepoch()+86400)",
    ).run(id, webpFixture.length, 'u/' + id, original, purpose);
    objects.set('u/' + id, webpFixture);
    if (original) objects.set(original, pngFixture());
  }
  function banner(id, slot = 1, fid = null, amount = 1) {
    const previous =
      db
        .prepare('SELECT id FROM banners WHERE archived=0 AND slot=? ORDER BY rowid DESC LIMIT 1')
        .get(slot)?.id || null;
    db.prepare(
      "INSERT INTO banners(id,author_id,title,body,color,amount,previous_id,file_id,day,slot) VALUES(?,'u','Anunci','','sage',?,?,?,'2026-10-11',?)",
    ).run(id, amount, previous, fid, slot);
  }
  return {
    db,
    env,
    objects,
    file,
    banner,
    failDeletes: (b) => {
      deletesFail = b;
    },
    moderations: () => moderations,
  };
}
function request(name = 'foto.png', ip = 'one', purpose = 'content', bytes = pngFixture()) {
  return new Request('https://lanet.test/api/files', {
    method: 'POST',
    headers: {
      'X-File-Name': encodeURIComponent(name),
      'CF-Connecting-IP': ip,
      'X-Upload-Purpose': purpose,
    },
    body: bytes,
  });
}
const count = (db, table) => db.prepare(`SELECT count(*) n FROM ${table}`).get().n;

test('Replaced ad is revoked atomically, deletes normalized and original R2 bytes, preserves billing', async (t) => {
  const c = fixture(t);
  c.file('old', 'original/raw');
  c.banner('a', 1, 'old');
  const before = count(c.db, 'ledger');
  c.banner('b', 1, null, 2);
  assert.equal(c.db.prepare("SELECT file_id FROM banners WHERE id='a'").get().file_id, null);
  assert.ok(c.db.prepare("SELECT deleting_at FROM files WHERE id='old'").get().deleting_at);
  await assert.rejects(
    fileResponse(new Request('https://lanet.test'), c.env, user, 'old'),
    (e) => e.status === 410,
  );
  assert.equal(count(c.db, 'ledger'), before + 1);
  await drainFileDeletions(c.env);
  assert.equal(c.objects.size, 0);
  assert.equal(count(c.db, 'files'), 0);
  assert.equal(count(c.db, 'file_deletions'), 0);
  assert.equal(count(c.db, 'banners'), 2);
  assert.equal(c.db.prepare("SELECT balance FROM users WHERE id='u'").get().balance, 997);
});
test('Same image across slots or reused by replacement remains until its last live reference ends', async (t) => {
  const c = fixture(t);
  c.file('shared');
  c.banner('a', 1, 'shared');
  c.banner('b', 2, 'shared');
  c.banner('c', 1, 'shared', 2);
  assert.equal(count(c.db, 'file_deletions'), 0);
  c.banner('d', 1, null, 4);
  assert.equal(count(c.db, 'file_deletions'), 0);
  c.banner('e', 2, null, 2);
  assert.equal(count(c.db, 'file_deletions'), 1);
  await drainFileDeletions(c.env);
  assert.equal(c.objects.size, 0);
});
test('Rejected bids roll back retirement and wallet; retired images cannot be resurrected', async (t) => {
  const c = fixture(t);
  c.file('old');
  c.banner('a', 1, 'old');
  const before = count(c.db, 'ledger');
  assert.throws(() => c.banner('bad', 1, null, 1));
  assert.equal(count(c.db, 'file_deletions'), 0);
  assert.equal(count(c.db, 'ledger'), before);
  c.banner('b', 1, null, 2);
  assert.throws(() => c.banner('resurrect', 3, 'old'), /file_retired/);
  await assert.rejects(
    fileStatements(c.env, user, ['old'], 'note_id', 'missing'),
    (e) => e.status === 403,
  );
});
test('R2 failure retains a durable retry while access is revoked; retry is idempotent', async (t) => {
  const c = fixture(t);
  c.file('old', 'old/raw');
  c.banner('a', 1, 'old');
  c.banner('b', 1, null, 2);
  c.failDeletes(true);
  assert.deepEqual(await drainFileDeletions(c.env), { deleted: 0, remaining: 1 });
  assert.equal(c.db.prepare('SELECT attempts FROM file_deletions').get().attempts, 1);
  await assert.rejects(
    fileResponse(new Request('https://lanet.test'), c.env, user, 'old'),
    (e) => e.status === 410,
  );
  c.failDeletes(false);
  c.db.exec('UPDATE file_deletions SET retry_at=0');
  await drainFileDeletions(c.env);
  await drainFileDeletions(c.env);
  assert.equal(c.objects.size, 0);
  assert.equal(count(c.db, 'file_deletions'), 0);
});
test('Historical obsolete ads are collected, live ads and content attachments are preserved', async (t) => {
  const c = fixture(t);
  c.file('old');
  c.file('live');
  c.file('note', null, 'content');
  c.banner('a', 1, 'live');
  c.db.exec(
    "INSERT INTO notes(id,author_id,subject_id,title) VALUES('n','u','math','Apunt'); UPDATE files SET note_id='n',created_at='2020-01-01' WHERE id='note'; INSERT INTO banners(id,author_id,title,body,color,amount,previous_id,day,slot,archived) VALUES('historical','u','old','','sage',1,NULL,'2026-10-11',2,0); UPDATE banners SET file_id='old',archived=1 WHERE id='historical';",
  );
  await queueUnusedFiles(c.env);
  await drainFileDeletions(c.env);
  assert.equal(c.objects.has('u/old'), false);
  assert.equal(c.objects.has('u/live'), true);
  assert.equal(c.objects.has('u/note'), true);
});
test('Unused banner drafts expire in 30 minutes, other unattached uploads in 24 hours', async (t) => {
  const c = fixture(t);
  for (const [id, purpose, age] of [
    ['banner-old', 'banner', '-31 minutes'],
    ['content-recent', 'content', '-1 hour'],
    ['content-old', 'content', '-25 hours'],
    ['banner-recent', 'banner', '-20 minutes'],
  ]) {
    c.file(id, null, purpose);
    c.db
      .prepare(
        "UPDATE files SET upload_expires_at=unixepoch('now',?)+(CASE WHEN upload_purpose='banner' THEN 1800 ELSE 86400 END) WHERE id=?",
      )
      .run(age, id);
  }
  await queueUnusedFiles(c.env);
  await drainFileDeletions(c.env);
  assert.deepEqual([...c.objects.keys()].sort(), ['u/banner-recent', 'u/content-recent']);
});
test('Legacy unattached content is preserved; only new uploads acquire a draft expiry', async (t) => {
  const c = fixture(t);
  c.file('historical', null, 'content');
  c.db.exec(
    "UPDATE files SET upload_expires_at=NULL,created_at='2020-01-01' WHERE id='historical'",
  );
  await queueUnusedFiles(c.env);
  await drainFileDeletions(c.env);
  assert.equal(c.objects.has('u/historical'), true);
  const created = await upload(request(), c.env, user);
  const row = c.db
    .prepare('SELECT upload_expires_at,unixepoch() now FROM files WHERE id=?')
    .get(created.id);
  assert.ok(row.upload_expires_at - row.now > 86390);
});
test('New unattached file quota cannot grow beyond 24, and publishing frees draft capacity', async (t) => {
  const c = fixture(t);
  for (let i = 0; i < 24; i++) c.file('draft-' + i, null, 'content');
  await assert.rejects(upload(request(), c.env, user), (e) => e.code === 'upload_capacity');
  assert.equal(c.moderations(), 0);
  c.db.exec(
    "INSERT INTO notes(id,author_id,subject_id,title) VALUES('n','u','math','Apunt'); UPDATE files SET note_id='n',upload_expires_at=0 WHERE id='draft-0'",
  );
  await upload(request(), c.env, user);
  assert.equal(c.moderations(), 1);
  assert.equal(c.objects.has('u/draft-0'), true);
});
test('Discard only affects own unpublished drafts and frees capacity', async (t) => {
  const c = fixture(t);
  c.file('draft');
  c.file('live');
  c.banner('a', 1, 'live');
  await discardUpload(c.env, { id: 'v' }, 'draft');
  assert.equal(c.objects.has('u/draft'), true);
  await assert.rejects(discardUpload(c.env, user, 'live'), (e) => e.status === 409);
  await discardUpload(c.env, user, 'draft');
  await discardUpload(c.env, user, 'draft');
  assert.equal(c.objects.has('u/draft'), false);
  assert.equal(c.objects.has('u/live'), true);
});
test('Admission is account-wide across changing IPs and blocks the 21st rapid attempt before moderation', async (t) => {
  const c = fixture(t);
  for (let n = 0; n < 20; n++) {
    const lease = await beginUpload(request('foto.png', 'ip-' + n), c.env, user);
    await finishUpload(c.env, user, lease);
  }
  await assert.rejects(
    upload(request('foto.png', 'new-ip'), c.env, user),
    (e) => e.status === 429 && e.code === 'upload_blocked' && e.retryAfter <= 900,
  );
  assert.equal(c.moderations(), 0);
  assert.equal(count(c.db, 'upload_leases'), 0);
  const guard = c.db.prepare('SELECT * FROM upload_guards').get();
  assert.equal(guard.strikes, 1);
  assert.equal(guard.minute_count, 21);
  await assert.rejects(beginUpload(request(), c.env, user), (e) => e.code === 'upload_blocked');
  assert.equal(c.db.prepare('SELECT minute_count FROM upload_guards').get().minute_count, 21);
});
test('Parallel attempts reserve at most three slots even with missing/forged length headers', async (t) => {
  const c = fixture(t);
  const all = await Promise.allSettled(
    Array.from({ length: 10 }, () => beginUpload(request(), c.env, user)),
  );
  const accepted = all.filter((r) => r.status === 'fulfilled');
  assert.equal(accepted.length, 3);
  assert.equal(count(c.db, 'upload_leases'), 3);
  assert.ok(
    all.filter((r) => r.status === 'rejected').every((r) => r.reason.code === 'upload_capacity'),
  );
  assert.equal(
    c.db.prepare('SELECT sum(reserved_bytes) n FROM upload_leases').get().n,
    3 * MAX_FILE_BYTES,
  );
  for (const r of accepted) await finishUpload(c.env, user, r.value);
  const next = await beginUpload(request(), c.env, user);
  await finishUpload(c.env, user, next);
  assert.equal(count(c.db, 'upload_leases'), 0);
});
test('Three unpublished banner images fill the draft quota; discard admits the next', async (t) => {
  const c = fixture(t);
  const files = [];
  for (let i = 0; i < 3; i++)
    files.push(await upload(request('foto.png', 'one', 'banner'), c.env, user));
  await assert.rejects(
    upload(request('foto.png', 'other', 'banner'), c.env, user),
    (e) => e.code === 'upload_capacity',
  );
  assert.equal(c.moderations(), 3);
  await discardUpload(c.env, user, files[0].id);
  await upload(request('foto.png', 'other', 'banner'), c.env, user);
  assert.equal(c.moderations(), 4);
});
test('Five forbidden files trigger a temporary block; provider outages and uncertain verdicts do not', async (t) => {
  const c = fixture(t);
  for (let i = 0; i < 5; i++)
    await assert.rejects(upload(request('attack.js'), c.env, user), (e) => e.status === 400);
  await assert.rejects(upload(request(), c.env, user), (e) => e.code === 'upload_blocked');
  assert.equal(c.moderations(), 0);
  c.db.exec('DELETE FROM upload_guards');
  c.env.MEDIA_SAFETY.fetch = async () =>
    Response.json({ error: 'Temporary outage' }, { status: 503 });
  for (let i = 0; i < 5; i++)
    await assert.rejects(upload(request(), c.env, user), (e) => e.status === 503);
  assert.equal(
    c.db.prepare('SELECT invalid_count,blocked_until FROM upload_guards').get().invalid_count,
    0,
  );
  c.env.MEDIA_SAFETY.fetch = async () => Response.json({ error: 'Uncertain' }, { status: 422 });
  for (let i = 0; i < 5; i++)
    await assert.rejects(upload(request(), c.env, user), (e) => e.status === 422);
  assert.equal(c.db.prepare('SELECT blocked_until FROM upload_guards').get().blocked_until, 0);
});
test('Repeat floods increase cooldown and server clock alone restores eligibility', async (t) => {
  const c = fixture(t);
  await beginUpload(request(), c.env, user);
  c.db.exec('DELETE FROM upload_leases; UPDATE upload_guards SET minute_count=20');
  for (const [strike, seconds] of [
    [1, 900],
    [2, 3600],
    [3, 86400],
  ]) {
    await assert.rejects(
      beginUpload(request(), c.env, user),
      (e) => e.code === 'upload_blocked' && e.retryAfter === seconds,
    );
    assert.equal(c.db.prepare('SELECT strikes FROM upload_guards').get().strikes, strike);
    c.db.exec('UPDATE upload_guards SET blocked_until=0');
  }
  c.db.exec('UPDATE upload_guards SET minute_start=0,hour_start=0,day_start=0');
  const lease = await beginUpload(request(), c.env, user);
  await finishUpload(c.env, user, lease);
  assert.equal(count(c.db, 'upload_leases'), 0);
});
test('Hourly, daily and byte quotas survive IP changes; daily window renews on server time', async (t) => {
  const c = fixture(t);
  let lease = await beginUpload(request(), c.env, user);
  await finishUpload(c.env, user, lease, 300 * 1024 * 1024);
  await assert.rejects(
    beginUpload(request(), c.env, user),
    (e) => e.status === 429 && /300 MB/.test(e.message),
  );
  c.db.exec('UPDATE upload_guards SET day_start=0');
  lease = await beginUpload(request(), c.env, user);
  await finishUpload(c.env, user, lease, 100);
  assert.equal(c.db.prepare('SELECT day_bytes FROM upload_guards').get().day_bytes, 100);
  c.db.exec('UPDATE upload_guards SET hour_count=60');
  await assert.rejects(beginUpload(request(), c.env, user), (e) => e.code === 'upload_blocked');
  c.db.exec('UPDATE upload_guards SET blocked_until=0,hour_start=0,day_count=180');
  await assert.rejects(beginUpload(request(), c.env, user), (e) => e.code === 'upload_blocked');
});
test('Stopped uploads release expired leases; interrupted R2 writes have durable orphan cleanup', async (t) => {
  const c = fixture(t);
  for (let i = 0; i < 3; i++) await beginUpload(request(), c.env, user);
  c.db.exec('UPDATE upload_leases SET expires=0');
  const next = await beginUpload(request(), c.env, user);
  await finishUpload(c.env, user, next);
  c.objects.set('u/abandoned', webpFixture);
  c.db.exec("INSERT INTO unclaimed_uploads(object_key,created_at) VALUES('u/abandoned',0)");
  c.file('live');
  c.db.exec("INSERT INTO unclaimed_uploads(object_key,created_at) VALUES('u/live',0)");
  await drainFileDeletions(c.env);
  assert.equal(c.objects.has('u/abandoned'), false);
  assert.equal(c.objects.has('u/live'), true);
  assert.equal(count(c.db, 'unclaimed_uploads'), 0);
});
test('Raw uploads and scheduled maintenance drain expired drafts without a bootstrap or a page visit', async (t) => {
  const c = fixture(t);
  c.file('abandoned');
  c.db.exec("UPDATE files SET upload_expires_at=0 WHERE id='abandoned'");
  await upload(request(), c.env, user);
  assert.equal(c.objects.has('u/abandoned'), false);
  c.file('another');
  c.db.exec("UPDATE files SET upload_expires_at=0 WHERE id='another'");
  await maintenance.scheduled({}, c.env);
  assert.equal(c.objects.has('u/another'), false);
  assert.equal(count(c.db, 'file_deletions'), 0);
  assert.equal(maintenance.fetch, undefined);
});
test('Slow streaming requests are cancelled before an upload reservation can expire', async () => {
  let cancelled = false;
  const stream = new ReadableStream({
    cancel() {
      cancelled = true;
    },
  });
  await assert.rejects(readLimited(stream, 100, { timeoutMs: 10 }), (e) => e.status === 408);
  assert.equal(cancelled, true);
});
test('Migration is LF and remote D1 CASE expressions are parenthesized', () => {
  const source = readFileSync('migrations/0023_upload_retention.sql', 'utf8');
  assert.equal(source.includes('\r'), false);
  assert.equal(/(?<!\()CASE\b/.test(source), false);
});
