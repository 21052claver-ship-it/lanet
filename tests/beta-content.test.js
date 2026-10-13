import test from 'node:test';
import assert from 'node:assert/strict';
import { testEnvironment } from './helpers/d1.js';
import { SUBJECTS } from '../shared/catalog.js';
import { betaContentSql, betaBoardResetSql, betaPublisher } from '../scripts/beta-content.mjs';
import { bootstrap } from '../worker/data.js';

test('Beta: safe publisher, real visible samples, free notes and idempotent progress', async () => {
  const { db, env } = testEnvironment();
  try {
    for (const [id, name, short, color, path] of SUBJECTS)
      db.prepare('INSERT OR IGNORE INTO subjects(id,name,short,color,path) VALUES(?,?,?,?,?)').run(
        id,
        name,
        short,
        color,
        path,
      );
    db.exec(
      "INSERT INTO users(id,email,name,password_hash,salt) VALUES('tester','tester@fje.edu','Tester','x','x')",
    );
    db.exec(betaContentSql('2026-10-11'));
    db.exec("INSERT INTO event_progress VALUES('tester','beta-2026-task-math',1)");
    db.exec(betaContentSql('2026-10-19'));
    const user = db.prepare("SELECT * FROM users WHERE id='tester'").get();
    const data = await bootstrap(env, user);
    assert.equal(data.events.length, 16);
    assert.equal(data.events.filter((e) => e.display_kind === 'task').length, 8);
    assert.equal(data.events.find((e) => e.id === 'beta-2026-task-math').done, 1);
    assert.equal(data.notes.length, 8);
    assert.ok(data.notes.every((n) => n.price === 0));
    assert.equal(data.pluses.length, 6);
    assert.equal(data.proposals.length, 3);
    assert.equal(data.announcements.length, 1);
    assert.equal(data.events[0].date, '2026-10-12');
    for (const e of data.events)
      assert.ok(![0, 6].includes(new Date(e.date + 'T12:00:00Z').getUTCDay()));
    const publisher = db.prepare('SELECT * FROM users WHERE id=?').get(betaPublisher);
    assert.equal(publisher.disabled, 1);
    assert.equal(publisher.password_enabled, 0);
    assert.equal(publisher.google_sub, null);
    assert.equal(publisher.role, 'student');
    assert.equal(db.prepare('SELECT count(*) n FROM ledger').get().n, 0);
    assert.equal(db.prepare('SELECT count(*) n FROM grade_entries').get().n, 0);
  } finally {
    db.close();
  }
});

test('Beta: board reset preserves anonymity, files and payments; retry cannot clear new bid', async () => {
  const { db, env } = testEnvironment();
  try {
    db.exec(
      "INSERT INTO users(id,email,name,password_hash,salt) VALUES('tester','tester@fje.edu','Tester','x','x'); INSERT INTO ledger(id,user_id,amount,reason,ref,day) VALUES('fund','tester',10,'Test','fund','2026-10-11'); INSERT INTO banners(id,author_id,title,body,color,amount,day,anonymous) VALUES('old','tester','Anterior','','#fff',1,'2026-10-11',1)",
    );
    db.exec(betaBoardResetSql);
    const user = db.prepare("SELECT * FROM users WHERE id='tester'").get();
    const data = await bootstrap(env, user);
    assert.equal(data.banner, null);
    assert.equal(data.minBid, 1);
    assert.equal(user.balance, 9);
    assert.equal(db.prepare("SELECT anonymous FROM banners WHERE id='old'").get().anonymous, 1);
    db.exec(
      "INSERT INTO banners(id,author_id,title,body,color,amount,day) VALUES('new','tester','Nou','','#fff',1,'2026-10-11')",
    );
    db.exec(betaBoardResetSql);
    assert.equal((await bootstrap(env, user)).banner.id, 'new');
    assert.equal(db.prepare("SELECT balance FROM users WHERE id='tester'").get().balance, 8);
    assert.throws(
      () =>
        db.exec(
          "INSERT INTO banners(id,author_id,title,body,color,amount,previous_id,day) VALUES('stale','tester','Error','','#fff',2,'old','2026-10-11')",
        ),
      /bid_changed/,
    );
  } finally {
    db.close();
  }
});
