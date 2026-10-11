import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
function db() {
  const d = new DatabaseSync(':memory:');
  d.exec(readFileSync('migrations/0001_initial.sql', 'utf8'));
  d.exec(readFileSync('migrations/0002_integrity.sql', 'utf8'));
  d.exec(readFileSync('migrations/0004_wallet_guard.sql', 'utf8'));
  d.exec(
    "INSERT INTO groups VALUES('2B','2n B');INSERT INTO subjects(id,name,short,color) VALUES('math','Matemàtiques','Mates','#DCE8F4');INSERT INTO users(id,email,name,password_hash,salt) VALUES('a','a@example.test','Autor','hash','salt'),('b','b@example.test','Lector','hash','salt');INSERT INTO ledger(id,user_id,amount,reason,ref,day) VALUES('seed','b',20,'Test','seed','2026-10-08');INSERT INTO notes(id,author_id,subject_id,title,body,price) VALUES('n','a','math','Apunts','Contingut',5);",
  );
  return d;
}
test('El pastís diari té una sola entrada de moneder', () => {
  const d = db();
  const claim = d.prepare('INSERT OR IGNORE INTO daily_claims VALUES(?,?)');
  for (let i = 0; i < 12; i++) claim.run('b', '2026-10-08');
  assert.equal(d.prepare("SELECT balance FROM users WHERE id='b'").get().balance, 21);
  assert.equal(
    d.prepare("SELECT COUNT(*) AS n FROM ledger WHERE reason='Pastís del dia'").get().n,
    1,
  );
  d.close();
});
test('Retirar el repte conserva les recompenses i els moviments històrics', () => {
  const d = db();
  d.prepare('INSERT INTO challenges(user_id,day,answer) VALUES(?,?,?)').run(
    'b',
    '2026-10-07',
    '12',
  );
  const wallet = d.prepare("SELECT * FROM ledger WHERE user_id='b' ORDER BY rowid").all();
  const balance = d.prepare("SELECT balance FROM users WHERE id='b'").get().balance;
  d.exec(readFileSync('migrations/0006_user_preferences.sql', 'utf8'));
  d.exec(readFileSync('migrations/0007_agenda.sql', 'utf8'));
  assert.equal(d.prepare("SELECT COUNT(*) AS n FROM challenges WHERE user_id='b'").get().n, 1);
  assert.equal(d.prepare("SELECT balance FROM users WHERE id='b'").get().balance, balance);
  assert.deepEqual(
    d.prepare("SELECT * FROM ledger WHERE user_id='b' ORDER BY rowid").all(),
    wallet,
  );
  d.close();
});
test('La compra mou exactament els pastissos entre dos comptes una sola vegada', () => {
  const d = db();
  const buy = d.prepare('INSERT OR IGNORE INTO unlocks VALUES(?,?,?,?)');
  buy.run('b', 'n', 5, '2026-10-08');
  buy.run('b', 'n', 5, '2026-10-08');
  assert.equal(d.prepare("SELECT balance FROM users WHERE id='b'").get().balance, 15);
  assert.equal(d.prepare("SELECT balance FROM users WHERE id='a'").get().balance, 5);
  assert.equal(d.prepare('SELECT COUNT(*) AS n FROM unlocks').get().n, 1);
  d.close();
});
test('Una compra sense saldo falla completa, sense crèdit a l’autor', () => {
  const d = db();
  d.exec("UPDATE notes SET price=25 WHERE id='n'");
  assert.throws(() =>
    d.prepare('INSERT OR IGNORE INTO unlocks VALUES(?,?,?,?)').run('b', 'n', 25, '2026-10-08'),
  );
  assert.equal(d.prepare("SELECT balance FROM users WHERE id='b'").get().balance, 20);
  assert.equal(d.prepare("SELECT balance FROM users WHERE id='a'").get().balance, 0);
  assert.equal(d.prepare('SELECT COUNT(*) AS n FROM unlocks').get().n, 0);
  d.close();
});
test('Les contribucions tenen un límit diari i no admeten una recompensa repetida', () => {
  const d = db();
  for (let i = 0; i < 35; i++)
    d.prepare('INSERT OR IGNORE INTO contribution_rewards VALUES(?,?,?,?)').run(
      `like:${i}`,
      'a',
      '2026-10-08',
      'Agraïment',
    );
  d.prepare('INSERT OR IGNORE INTO contribution_rewards VALUES(?,?,?,?)').run(
    'like:0',
    'a',
    '2026-10-09',
    'Agraïment',
  );
  assert.equal(d.prepare("SELECT balance FROM users WHERE id='a'").get().balance, 30);
  d.close();
});
test('Dues ofertes simultànies no poden comprar la mateixa versió del bàner', () => {
  const d = db();
  d.prepare(
    'INSERT INTO banners(id,author_id,title,body,color,amount,previous_id,day) VALUES(?,?,?,?,?,?,?,?)',
  ).run('first', 'b', 'Hola', '', 'sage', 10, null, '2026-10-08');
  assert.throws(() =>
    d
      .prepare(
        'INSERT INTO banners(id,author_id,title,body,color,amount,previous_id,day) VALUES(?,?,?,?,?,?,?,?)',
      )
      .run('stale', 'b', 'Hola', '', 'sage', 10, null, '2026-10-08'),
  );
  assert.equal(d.prepare("SELECT balance FROM users WHERE id='b'").get().balance, 10);
  d.close();
});

test('L’oferta inicial d’1 pastís es cobra un cop i manté el mínim i la versió de la següent oferta', () => {
  const d = db();
  try {
    d.exec(readFileSync('migrations/0010_banner_minimum.sql', 'utf8'));
    const publish = d.prepare(
      'INSERT INTO banners(id,author_id,title,body,color,amount,previous_id,day) VALUES(?,?,?,?,?,?,?,?)',
    );
    for (const amount of [-1, 0])
      assert.throws(
        () => publish.run('invalid', 'b', 'Hola', '', 'sage', amount, null, '2026-10-10'),
        /bid_low/,
      );
    assert.equal(d.prepare('SELECT COUNT(*) AS n FROM banners').get().n, 0);
    assert.equal(d.prepare("SELECT balance FROM users WHERE id='b'").get().balance, 20);
    publish.run('one', 'b', 'Hola', '', 'sage', 1, null, '2026-10-10');
    assert.equal(d.prepare("SELECT balance FROM users WHERE id='b'").get().balance, 19);
    assert.throws(
      () => publish.run('stale', 'b', 'Hola', '', 'sage', 1, null, '2026-10-10'),
      /bid_changed/,
    );
    assert.throws(
      () => publish.run('low', 'b', 'Hola', '', 'sage', 1, 'one', '2026-10-10'),
      /bid_low/,
    );
    publish.run('two', 'b', 'Hola', '', 'sage', 2, 'one', '2026-10-10');
    assert.equal(d.prepare("SELECT balance FROM users WHERE id='b'").get().balance, 17);
    assert.equal(d.prepare('SELECT COUNT(*) AS n FROM banners').get().n, 2);
    assert.deepEqual(
      d
        .prepare("SELECT amount FROM ledger WHERE ref LIKE 'banner:%' ORDER BY rowid")
        .all()
        .map((r) => r.amount),
      [-1, -2],
    );
  } finally {
    d.close();
  }
});

test('Canviar el mínim inicial conserva els anuncis, els comptes, el moneder i el trigger de cobrament', () => {
  const d = db();
  try {
    d.prepare(
      'INSERT INTO banners(id,author_id,title,body,color,amount,previous_id,day) VALUES(?,?,?,?,?,?,?,?)',
    ).run('old', 'b', 'Anunci existent', '', 'sage', 10, null, '2026-10-10');
    const tables = ['banners', 'users', 'ledger'];
    const before = tables.map((table) => d.prepare(`SELECT * FROM ${table} ORDER BY rowid`).all());
    const debit = d.prepare("SELECT sql FROM sqlite_master WHERE name='banner_debit'").get().sql;
    d.exec(readFileSync('migrations/0010_banner_minimum.sql', 'utf8'));
    for (const [i, table] of tables.entries())
      assert.deepEqual(d.prepare(`SELECT * FROM ${table} ORDER BY rowid`).all(), before[i]);
    assert.equal(
      d.prepare("SELECT sql FROM sqlite_master WHERE name='banner_debit'").get().sql,
      debit,
    );
    assert.equal(d.prepare('PRAGMA quick_check').get().quick_check, 'ok');
    assert.deepEqual(d.prepare('PRAGMA foreign_key_check').all(), []);
  } finally {
    d.close();
  }
});
test('El codi de recuperació només es pot consumir una vegada', () => {
  const d = db();
  d.prepare('INSERT INTO recovery_tokens VALUES(?,?,?,0)').run('code', 'a', Date.now() + 60000);
  d.exec("UPDATE recovery_tokens SET used=1 WHERE hash='code'");
  assert.throws(() => d.exec("UPDATE recovery_tokens SET used=1 WHERE hash='code'"));
  d.close();
});

test('La migració d’anonimat conserva l’anunci antic i cobra les ofertes anònimes al seu compte', () => {
  const d = db();
  try {
    d.prepare(
      'INSERT INTO banners(id,author_id,title,body,color,amount,previous_id,day) VALUES(?,?,?,?,?,?,?,?)',
    ).run('old', 'b', 'Amb nom', '', 'sage', 10, null, '2026-10-10');
    const old = d.prepare("SELECT * FROM banners WHERE id='old'").get();
    const wallet = d.prepare('SELECT * FROM ledger ORDER BY rowid').all();
    d.exec(readFileSync('migrations/0008_banner_identity.sql', 'utf8'));
    const { anonymous, ...preserved } = d.prepare("SELECT * FROM banners WHERE id='old'").get();
    assert.equal(anonymous, 0);
    assert.deepEqual(preserved, { ...old });
    assert.deepEqual(d.prepare('SELECT * FROM ledger ORDER BY rowid').all(), wallet);
    assert.equal(d.prepare("SELECT balance FROM users WHERE id='b'").get().balance, 10);
    d.exec(
      "INSERT INTO ledger(id,user_id,amount,reason,ref,day) VALUES('more','b',20,'Test','more','2026-10-10')",
    );
    d.prepare(
      'INSERT INTO banners(id,author_id,title,body,color,amount,previous_id,day,anonymous) VALUES(?,?,?,?,?,?,?,?,?)',
    ).run('hidden', 'b', 'Anònim', '', 'sage', 20, 'old', '2026-10-10', 1);
    assert.equal(d.prepare("SELECT balance FROM users WHERE id='b'").get().balance, 10);
    assert.equal(d.prepare("SELECT author_id FROM banners WHERE id='hidden'").get().author_id, 'b');
    assert.equal(
      d.prepare("SELECT COUNT(*) AS n FROM ledger WHERE ref='banner:hidden'").get().n,
      1,
    );
    assert.throws(
      () => d.exec("UPDATE banners SET anonymous=2 WHERE id='hidden'"),
      /CHECK constraint/,
    );
    assert.equal(d.prepare("SELECT anonymous FROM banners WHERE id='hidden'").get().anonymous, 1);
  } finally {
    d.close();
  }
});
