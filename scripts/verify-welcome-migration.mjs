import { DatabaseSync } from 'node:sqlite';
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';

const [beforePath, afterPath, reportPath] = process.argv.slice(2);
assert.ok(beforePath && afterPath && reportPath, 'Calen SQL anterior, actual i informe.');
const before = new DatabaseSync(':memory:'),
  after = new DatabaseSync(':memory:');
const rows = (db, table) => db.prepare(`SELECT * FROM "${table.replaceAll('"', '""')}"`).all();
const sorted = (values) => values.map((r) => JSON.stringify(r)).sort();
try {
  before.exec(readFileSync(beforePath, 'utf8'));
  after.exec(readFileSync(afterPath, 'utf8'));
  const names = (db) =>
    db
      .prepare(
        "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_cf_%' ORDER BY name",
      )
      .all()
      .map((r) => r.name);
  assert.deepEqual(names(after), names(before));
  const oldLedger = rows(before, 'ledger'),
    refs = new Set(oldLedger.map((r) => r.ref));
  const eligible = rows(before, 'users').filter(
    (u) => u.google_sub !== null && !refs.has('welcome-' + u.id),
  );
  const ids = new Set(eligible.map((u) => u.id));
  const preserved = [];
  for (const table of names(before)) {
    const previous = rows(before, table),
      current = rows(after, table);
    if (table === 'users') {
      assert.deepEqual(
        sorted(current),
        sorted(previous.map((u) => ({ ...u, balance: u.balance + (ids.has(u.id) ? 5 : 0) }))),
      );
    } else if (table === 'ledger') {
      assert.deepEqual(sorted(current.filter((r) => refs.has(r.ref))), sorted(previous));
      const added = current.filter((r) => !refs.has(r.ref));
      assert.equal(added.length, ids.size);
      for (const row of added) {
        assert.ok(ids.has(row.user_id));
        assert.equal(row.id, 'welcome-' + row.user_id);
        assert.equal(row.ref, row.id);
        assert.equal(row.amount, 5);
        assert.equal(row.reason, 'Pastissos de benvinguda');
        assert.match(row.day, /^\d{4}-\d{2}-\d{2}$/);
      }
    } else if (table === 'd1_migrations') {
      assert.deepEqual(
        sorted(current.filter((r) => r.name !== '0013_welcome_cakes.sql')),
        sorted(previous),
      );
      assert.equal(current.filter((r) => r.name === '0013_welcome_cakes.sql').length, 1);
    } else {
      assert.deepEqual(sorted(current), sorted(previous), table);
      preserved.push({ table, rows: previous.length });
    }
  }
  assert.equal(after.prepare('PRAGMA integrity_check').get().integrity_check, 'ok');
  assert.equal(after.prepare('PRAGMA foreign_key_check').all().length, 0);
  const sha = (p) => createHash('sha256').update(readFileSync(p)).digest('hex');
  writeFileSync(
    reportPath,
    JSON.stringify(
      {
        date: new Date().toISOString(),
        migration: '0013_welcome_cakes.sql',
        beforeSha256: sha(beforePath),
        afterSha256: sha(afterPath),
        welcomeAmount: 5,
        creditedAccounts: ids.size,
        addedLedgerEntries: ids.size,
        previousLedgerPreserved: true,
        usersChangedOnlyByExpectedBalanceIncrement: true,
        preservedTables: preserved,
        integrity: 'ok',
        foreignKeys: 'ok',
      },
      null,
      2,
    ) + '\n',
  );
  console.log(
    `Benvinguda de 5 a ${ids.size} comptes; historial i ${preserved.length} altres taules preservats.`,
  );
} finally {
  before.close();
  after.close();
}
