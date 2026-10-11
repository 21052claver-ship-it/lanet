import { DatabaseSync } from 'node:sqlite';
import { readFileSync, writeFileSync } from 'node:fs';
import assert from 'node:assert/strict';
const [beforePath, afterPath, report] = process.argv.slice(2);
const before = new DatabaseSync(':memory:'),
  after = new DatabaseSync(':memory:');
try {
  before.exec(readFileSync(beforePath, 'utf8'));
  after.exec(readFileSync(afterPath, 'utf8'));
  const tables = before
    .prepare(
      "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_cf_%'",
    )
    .all()
    .map((r) => r.name);
  const sorted = (rows) => rows.map((r) => JSON.stringify(r)).sort();
  const added = {};
  for (const table of tables) {
    const old = before.prepare(`SELECT * FROM "${table}"`).all();
    const current = after.prepare(`SELECT * FROM "${table}"`).all();
    if (table === 'd1_migrations') {
      assert.equal(current.length, old.length + 1);
      continue;
    }
    if (table === 'banners') {
      assert.deepEqual(sorted(current), sorted(old.map((r) => ({ ...r, archived: 1 }))));
      continue;
    }
    const expectedAdds = [
      'users',
      'events',
      'notes',
      'pluses',
      'plus_subjects',
      'proposals',
      'announcements',
      'settings',
    ];
    const fresh = current.filter((r) => !old.some((o) => JSON.stringify(o) === JSON.stringify(r)));
    if (!expectedAdds.includes(table)) assert.deepEqual(sorted(current), sorted(old), table);
    else {
      assert.ok(
        old.every((o) => current.some((r) => JSON.stringify(o) === JSON.stringify(r))),
        `Preserve ${table}`,
      );
      for (const row of fresh)
        assert.ok(
          String(row.id || row.plus_id || row.key).startsWith('beta-2026'),
          `Unexpected ${table}`,
        );
      added[table] = fresh.length;
    }
  }
  assert.equal(after.prepare('PRAGMA integrity_check').get().integrity_check, 'ok');
  assert.equal(after.prepare('PRAGMA foreign_key_check').all().length, 0);
  assert.equal(after.prepare('SELECT count(*) n FROM banners WHERE archived=0').get().n, 0);
  assert.equal(added.events, 16);
  assert.equal(added.notes, 8);
  assert.equal(added.pluses, 6);
  writeFileSync(
    report,
    JSON.stringify(
      {
        passed: true,
        added,
        archived_ads: before.prepare('SELECT count(*) n FROM banners').get().n,
        preserved_tables: tables.length,
        personal_data_preserved: true,
        wallet_preserved: true,
        integrity: 'ok',
      },
      null,
      2,
    ) + '\n',
  );
  console.log('Contingut beta verificat: dades anteriors i saldos preservats.');
} finally {
  before.close();
  after.close();
}
