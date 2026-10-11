import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync, readdirSync } from 'node:fs';
import { bannerSpaces, publicBanner } from '../shared/banner.js';

function fixture() {
  const db = new DatabaseSync(':memory:');
  for (const file of readdirSync('migrations')
    .filter((f) => f.endsWith('.sql') && f < '0015')
    .sort())
    db.exec(readFileSync(`migrations/${file}`, 'utf8'));
  db.exec(
    "INSERT INTO users(id,email,name,password_hash,salt) VALUES('a','a@example.test','Autor','hash','salt'); INSERT INTO ledger(id,user_id,amount,reason,ref,day) VALUES('seed','a',30,'Test','seed','2026-10-11');",
  );
  const insert = db.prepare(
    "INSERT INTO banners(id,author_id,title,body,color,amount,previous_id,day) VALUES(?,'a',?,'','peach',?,?,'2026-10-11')",
  );
  insert.run('legacy', 'Conservat', 1, null);
  return db;
}

test('Migration keeps the existing board, wallet and billing history in space 1', () => {
  const db = fixture();
  try {
    const before = db.prepare('SELECT * FROM ledger ORDER BY rowid').all();
    db.exec(readFileSync('migrations/0015_banner_slots.sql', 'utf8'));
    assert.equal(db.prepare("SELECT slot FROM banners WHERE id='legacy'").get().slot, 1);
    assert.deepEqual(db.prepare('SELECT * FROM ledger ORDER BY rowid').all(), before);
    assert.equal(db.prepare("SELECT balance FROM users WHERE id='a'").get().balance, 29);
  } finally {
    db.close();
  }
});

test('Three slots bill separately and reject stale, cross-slot and invalid offers atomically', () => {
  const db = fixture();
  try {
    db.exec(readFileSync('migrations/0015_banner_slots.sql', 'utf8'));
    const insert = db.prepare(
      "INSERT INTO banners(id,author_id,title,body,color,amount,previous_id,day,slot) VALUES(?,'a','Anunci','','peach',?,?,'2026-10-11',?)",
    );
    insert.run('second', 1, null, 2);
    insert.run('third', 1, null, 3);
    insert.run('second-replacement', 2, 'second', 2);
    const wallet = db.prepare('SELECT * FROM ledger ORDER BY rowid').all();
    assert.equal(db.prepare("SELECT balance FROM users WHERE id='a'").get().balance, 25);
    for (const [id, amount, previous, slot] of [
      ['stale', 4, 'second', 2],
      ['cross-slot', 2, 'third', 1],
      ['too-low', 1, 'third', 3],
      ['invalid-slot', 1, null, 4],
      ['no-balance', 100, 'third', 3],
    ])
      assert.throws(() => insert.run(id, amount, previous, slot));
    assert.deepEqual(db.prepare('SELECT * FROM ledger ORDER BY rowid').all(), wallet);
    assert.equal(db.prepare('SELECT COUNT(*) AS n FROM banners').get().n, 4);
    insert.run('first-replacement', 2, 'legacy', 1);
    assert.equal(db.prepare("SELECT balance FROM users WHERE id='a'").get().balance, 23);
  } finally {
    db.close();
  }
});

test('Slot projection keeps anonymous identities private and legacy clients retain space 1', () => {
  const banner = publicBanner({
    id: 'x',
    slot: 3,
    anonymous: 1,
    author: 'Private',
    author_id: 'account',
  });
  assert.equal(banner.slot, 3);
  assert.equal(banner.author, null);
  assert.equal('author_id' in banner, false);
  assert.deepEqual(bannerSpaces({ banner: { id: 'old' }, minBid: 8 }), [
    { slot: 1, banner: { id: 'old' }, minBid: 8 },
    { slot: 2, banner: null, minBid: 1 },
    { slot: 3, banner: null, minBid: 1 },
  ]);
});
