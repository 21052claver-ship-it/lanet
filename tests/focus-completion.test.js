import test from 'node:test';
import assert from 'node:assert/strict';
import app from '../worker/index.js';
import { testEnvironment } from './helpers/d1.js';
import { hash } from '../worker/utils.js';
import { madridDay, addDays } from '../shared/domain.js';
test('offline focus completion preserves its original day, is idempotent, and validates future/invalid dates', async () => {
  const { db, env } = testEnvironment();
  db.exec(
    "INSERT INTO users(id,email,name,password_hash,salt,google_sub,group_id) VALUES('focus-user','focus-local@fje.edu','Focus local','x','x','focus-sub','2B');",
  );
  db.prepare(
    "INSERT INTO sessions(hash,user_id,expires,auth_provider) VALUES(?,'focus-user',?,'google')",
  ).run(await hash('focus-token'), Date.now() + 3600000);
  const call = (b) =>
    app.fetch(
      new Request('https://lanet.example/api/focus/complete', {
        method: 'POST',
        headers: { Cookie: 'lanet_session=focus-token', 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: 'offline-previous-day', minutes: 25, task: '', ...b }),
      }),
      env,
      { waitUntil: (p) => p.catch(() => {}) },
    );
  const previous = addDays(madridDay(), -1);
  assert.equal((await call({ day: previous })).status, 200);
  assert.equal(
    db.prepare("SELECT day FROM focus_sessions WHERE id='offline-previous-day'").get().day,
    previous,
  );
  assert.equal((await call({ day: madridDay(), minutes: 50 })).status, 200);
  assert.equal(
    db.prepare("SELECT minutes FROM focus_sessions WHERE id='offline-previous-day'").get().minutes,
    25,
  );
  assert.equal((await call({ id: 'invalid', day: '2026-02-30' })).status, 400);
  assert.equal((await call({ id: 'future', day: addDays(madridDay(), 1) })).status, 400);
  assert.equal((await call({ id: 'missing-subject', subject_id: 'obsolete-subject' })).status, 400);
  assert.equal((await call({ id: 'legacy' })).status, 200);
  assert.equal(
    db.prepare("SELECT day FROM focus_sessions WHERE id='legacy'").get().day,
    madridDay(),
  );
  db.close();
});
