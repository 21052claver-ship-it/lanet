import { DatabaseSync } from 'node:sqlite';
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';
const [beforePath, afterPath, reportPath] = process.argv.slice(2);
assert.ok(beforePath && afterPath && reportPath, 'Calen SQL anterior, SQL actual i informe.');
const before = new DatabaseSync(':memory:'),
  after = new DatabaseSync(':memory:');
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
  const digest = (data) => createHash('sha256').update(JSON.stringify(data)).digest('hex');
  const rows = (db, table, columns = '*') =>
    db
      .prepare(`SELECT ${columns} FROM "${table.replaceAll('"', '""')}"`)
      .all()
      .map((row) => JSON.stringify(row))
      .sort();
  const preserved = [];
  for (const table of names(before).filter((name) => name !== 'd1_migrations')) {
    let current;
    if (table === 'sessions') {
      const columns = before
        .prepare('PRAGMA table_info(sessions)')
        .all()
        .map((r) => '"' + r.name + '"')
        .join(',');
      current = rows(after, table, columns);
      assert.equal(
        after.prepare("SELECT COUNT(*) AS n FROM sessions WHERE auth_provider!='legacy'").get().n,
        0,
      );
    } else current = rows(after, table);
    const original = rows(before, table);
    assert.deepEqual(current, original, `${table}: dades modificades durant la migracio`);
    preserved.push({ table, rows: original.length, sha256: digest(original) });
  }
  assert.equal(
    after.prepare('SELECT COUNT(*) AS n FROM d1_migrations').get().n,
    before.prepare('SELECT COUNT(*) AS n FROM d1_migrations').get().n + 1,
  );
  assert.ok(
    after
      .prepare('SELECT name FROM d1_migrations WHERE name=?')
      .get('0012_google_only_sessions.sql'),
  );
  assert.equal(after.prepare('PRAGMA integrity_check').get().integrity_check, 'ok');
  assert.equal(after.prepare('PRAGMA foreign_key_check').all().length, 0);
  const sha = (path) => createHash('sha256').update(readFileSync(path)).digest('hex');
  writeFileSync(
    reportPath,
    JSON.stringify(
      {
        date: new Date().toISOString(),
        migration: '0012_google_only_sessions.sql',
        beforeSha256: sha(beforePath),
        afterSha256: sha(afterPath),
        preservedTables: preserved,
        integrity: 'ok',
        foreignKeys: 'ok',
        oldSessionsReclassifiedOnly: true,
        userDataChanged: false,
      },
      null,
      2,
    ) + '\n',
  );
  console.log(
    `${preserved.length} taules preservades, sessions reclassificades i integritat correcta.`,
  );
} finally {
  before.close();
  after.close();
}
