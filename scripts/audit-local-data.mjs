import { DatabaseSync } from 'node:sqlite';
import { readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import assert from 'node:assert/strict';
const baselineRoot =
  process.argv[2] || 'backups/state-v3-2026-10-09T21-12-30-835Z/v3/d1/miniflare-D1DatabaseObject';
const currentRoot = '.wrangler/state/v3/d1/miniflare-D1DatabaseObject';
const filename = readdirSync(baselineRoot).find(
  (name) => name.endsWith('.sqlite') && name !== 'metadata.sqlite',
);
assert.ok(filename, 'Falta la còpia coherent de D1 anterior a la revisió.');
const before = new DatabaseSync(join(baselineRoot, filename), { readOnly: true });
const after = new DatabaseSync(join(currentRoot, filename), { readOnly: true });
try {
  const users = new Set(
    before
      .prepare(
        "SELECT id FROM users WHERE NOT (id LIKE 'guest:%' AND email LIKE '%@guest.lanet.invalid')",
      )
      .all()
      .map((row) => row.id),
  );
  const tables = [
    'users',
    'enrollments',
    'grade_entries',
    'grade_goals',
    'notes',
    'pluses',
    'events',
    'proposals',
    'announcements',
    'ledger',
    'focus_settings',
    'focus_sessions',
    'challenges',
    'daily_claims',
    'unlocks',
    'files',
  ];
  const result = [];
  for (const table of tables) {
    const columns = before.prepare(`PRAGMA table_info(${table})`).all();
    const primary = columns
      .filter((col) => col.pk)
      .sort((a, b) => a.pk - b.pk)
      .map((col) => col.name);
    const owner =
      table === 'users'
        ? 'id'
        : ['user_id', 'author_id', 'owner_id'].find((name) =>
            columns.some((col) => col.name === name),
          );
    assert.ok(owner && primary.length, `No es pot identificar el propietari de ${table}.`);
    const query = `SELECT ${columns.map((col) => `"${col.name}"`).join(',')} FROM ${table}`;
    const key = (row) => JSON.stringify(primary.map((name) => row[name]));
    const originals = before
      .prepare(query)
      .all()
      .filter((row) => users.has(row[owner]));
    const current = new Map(
      after
        .prepare(query)
        .all()
        .map((row) => [key(row), row]),
    );
    for (const row of originals)
      assert.ok(
        JSON.stringify(current.get(key(row))) === JSON.stringify(row),
        `Dades originals alterades a ${table}; no es mostren valors privats.`,
      );
    result.push({ table, originalRows: originals.length, allOriginalRowsPreserved: true });
  }
  const report = {
    date: new Date().toISOString(),
    baseline: baselineRoot,
    realUsersChecked: users.size,
    readOnly: true,
    privateValuesIncluded: false,
    tables: result,
    passed: true,
  };
  writeFileSync(
    process.argv[3] || 'output/revisio-v3/preservacio-dades.json',
    JSON.stringify(report, null, 2) + '\n',
  );
  console.log(
    `Dades originals preservades: ${users.size} usuaris, ${result.reduce((n, item) => n + item.originalRows, 0)} files en ${result.length} taules. Auditoria només de lectura.`,
  );
} finally {
  before.close();
  after.close();
}
