import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync, readdirSync } from 'node:fs';
import { testEnvironment } from './helpers/d1.js';
import { googleUser } from '../worker/google.js';

test('Welcome: Google signup receives exactly five; repeat login and linking cannot mint more', async () => {
  const { db, env } = testEnvironment();
  const profile = {
    sub: 'welcome-sub',
    email: 'welcome@fje.edu',
    domain: 'fje.edu',
    name: 'Nom Cognoms',
    givenName: 'Nom',
    familyName: 'Cognoms',
    picture: '',
  };
  try {
    const first = await googleUser(env, profile, null, { allowedDomain: 'fje.edu' });
    assert.equal(first.balance, 5);
    const repeat = await googleUser(env, profile, null, { allowedDomain: 'fje.edu' });
    assert.equal(repeat.id, first.id);
    assert.equal(repeat.balance, 5);
    assert.equal(db.prepare('SELECT COUNT(*) n FROM ledger WHERE user_id=?').get(first.id).n, 1);
    db.prepare(
      "INSERT INTO ledger VALUES('spent',?,-5,'Compra','spent','2026-10-11','2026-10-11')",
    ).run(first.id);
    assert.equal((await googleUser(env, profile, null, { allowedDomain: 'fje.edu' })).balance, 0);
    db.prepare('UPDATE users SET google_sub=NULL WHERE id=?').run(first.id);
    assert.equal((await googleUser(env, profile, null, { allowedDomain: 'fje.edu' })).balance, 0);
    assert.equal(
      db.prepare('SELECT COUNT(*) n FROM ledger WHERE ref=?').get('welcome-' + first.id).n,
      1,
    );
  } finally {
    db.close();
  }
});

test('Welcome: old account linking preserves earnings and returns the gift immediately', async () => {
  const { db, env } = testEnvironment();
  try {
    db.exec(
      "INSERT INTO users(id,email,name,password_hash,salt) VALUES('old','old@fje.edu','Nom','x','x'); INSERT INTO ledger(id,user_id,amount,reason,ref,day) VALUES('earned','old',12,'Apunts','earned','2026-10-11')",
    );
    const user = await googleUser(
      env,
      {
        sub: 'old-sub',
        email: 'old@fje.edu',
        domain: 'fje.edu',
        name: 'Nom Nou',
        givenName: 'Nom',
        familyName: 'Nou',
        picture: '',
      },
      null,
      { allowedDomain: 'fje.edu' },
    );
    assert.equal(user.id, 'old');
    assert.equal(user.balance, 17);
    assert.equal(db.prepare("SELECT amount FROM ledger WHERE ref='earned'").get().amount, 12);
  } finally {
    db.close();
  }
});

test('Welcome: migration credits existing Google members once, preserves earlier welcome and unrelated data', () => {
  const db = new DatabaseSync(':memory:');
  try {
    for (const file of readdirSync('migrations')
      .filter((f) => f.endsWith('.sql') && !f.startsWith('0013'))
      .sort())
      db.exec(readFileSync('migrations/' + file, 'utf8'));
    db.exec(
      "INSERT INTO users(id,email,name,password_hash,salt,google_sub) VALUES('member','member@fje.edu','Nom','x','x','member-sub'),('demo','demo@fje.edu','Demo','x','x','demo-sub'),('legacy','legacy@fje.edu','Antic','x','x',NULL); INSERT INTO ledger(id,user_id,amount,reason,ref,day) VALUES('earn','member',7,'Apunts','earn','2026-10-11'),('welcome-demo','demo',24,'Benvinguda de demostració','welcome-demo','2026-10-10')",
    );
    db.exec(readFileSync('migrations/0013_welcome_cakes.sql', 'utf8'));
    assert.equal(db.prepare("SELECT balance FROM users WHERE id='member'").get().balance, 12);
    assert.equal(db.prepare("SELECT balance FROM users WHERE id='demo'").get().balance, 24);
    assert.equal(db.prepare("SELECT balance FROM users WHERE id='legacy'").get().balance, 0);
    db.exec(
      "UPDATE users SET google_sub='member-sub' WHERE id='member'; UPDATE users SET google_sub='legacy-sub' WHERE id='legacy'",
    );
    assert.equal(db.prepare("SELECT balance FROM users WHERE id='member'").get().balance, 12);
    assert.equal(db.prepare("SELECT balance FROM users WHERE id='legacy'").get().balance, 5);
    assert.equal(db.prepare('PRAGMA integrity_check').get().integrity_check, 'ok');
    assert.deepEqual(db.prepare('PRAGMA foreign_key_check').all(), []);
  } finally {
    db.close();
  }
});
