import { DatabaseSync } from 'node:sqlite';
import { createHash } from 'node:crypto';
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const snapshot = process.argv[2] || 'backups/la-net-local-2026-10-10.sql';
const report = process.argv[3] || 'output/revisio-v3/copia-sql-verificada.json';
const directory = '.wrangler/state/v3/d1/miniflare-D1DatabaseObject';
const files = readdirSync(directory).filter(
  (name) => name.endsWith('.sqlite') && name !== 'metadata.sqlite',
);
if (files.length !== 1) throw new Error('Cal identificar una única base D1 local.');
const original = new DatabaseSync(join(directory, files[0]), { readOnly: true });
const restored = new DatabaseSync(':memory:');
const digest = (value) => createHash('sha256').update(value).digest('hex');
const identifiers = (db, type) =>
  db
    .prepare(
      "SELECT name FROM sqlite_master WHERE type=? AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_cf%' ORDER BY name",
    )
    .all(type)
    .map((row) => row.name);
const quote = (name) => '"' + name.replaceAll('"', '""') + '"';
const tables = [];
try {
  restored.exec('BEGIN');
  restored.exec(readFileSync(snapshot, 'utf8'));
  restored.exec('COMMIT');
  if (restored.prepare('PRAGMA quick_check').get().quick_check !== 'ok')
    throw new Error('La base restaurada no supera quick_check.');
  if (restored.prepare('PRAGMA foreign_key_check').all().length)
    throw new Error('La base restaurada té referències no vàlides.');
  for (const type of ['table', 'index', 'trigger']) {
    if (JSON.stringify(identifiers(original, type)) !== JSON.stringify(identifiers(restored, type)))
      throw new Error(`Esquema restaurat incomplet: ${type}.`);
  }
  for (const table of identifiers(original, 'table')) {
    const values = (db) =>
      db
        .prepare(`SELECT * FROM ${quote(table)}`)
        .all()
        .map((row) => JSON.stringify(row))
        .sort();
    const before = values(original),
      after = values(restored);
    if (digest(JSON.stringify(before)) !== digest(JSON.stringify(after)))
      throw new Error(`Les dades restaurades difereixen a ${table}.`);
    tables.push({ table, rows: before.length, identical: true });
  }
  const migrations = restored.prepare('SELECT COUNT(*) AS n FROM d1_migrations').get().n;
  const expectedMigrations = readdirSync('migrations')
    .filter((name) => name.endsWith('.sql'))
    .sort();
  const restoredMigrations = restored
    .prepare('SELECT name FROM d1_migrations ORDER BY name')
    .all()
    .map((row) => row.name);
  if (JSON.stringify(restoredMigrations) !== JSON.stringify(expectedMigrations))
    throw new Error('La còpia ha de contenir totes les migracions del projecte.');
  writeFileSync(
    report,
    JSON.stringify(
      {
        date: new Date().toISOString(),
        snapshot,
        readOnlyOriginal: true,
        restoredInto: 'SQLite temporal en memòria; cap base original modificada.',
        quickCheck: 'ok',
        foreignKeyErrors: 0,
        migrations,
        tables,
        snapshotSha256: digest(readFileSync(snapshot)),
        privateValuesIncluded: false,
        passed: true,
      },
      null,
      2,
    ) + '\n',
  );
  console.log(
    `SQL restaurat: ${tables.length} taules idèntiques, ${migrations} migracions, integritat i referències correctes.`,
  );
} finally {
  original.close();
  restored.close();
}
