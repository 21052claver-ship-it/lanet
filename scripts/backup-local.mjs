import { DatabaseSync, backup } from 'node:sqlite';
import { mkdirSync, readdirSync, copyFileSync, writeFileSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { createHash } from 'node:crypto';
const source = '.wrangler/state';
const destination = `backups/state-v3-${new Date().toISOString().replaceAll(':', '-').replaceAll('.', '-')}`;
mkdirSync(destination, { recursive: true });
const files = [];
async function copy(directory) {
  for (const item of readdirSync(directory, { withFileTypes: true })) {
    const path = join(directory, item.name),
      target = join(destination, relative(source, path));
    if (item.isDirectory()) {
      mkdirSync(target, { recursive: true });
      await copy(path);
    } else if (!/-wal$|-shm$/.test(path)) {
      if (path.endsWith('.sqlite')) {
        const db = new DatabaseSync(path, { readOnly: true });
        try {
          await backup(db, target);
        } finally {
          db.close();
        }
      } else copyFileSync(path, target);
      files.push({
        path: relative(destination, target).replaceAll('\\', '/'),
        sha256: createHash('sha256').update(readFileSync(target)).digest('hex'),
      });
    }
  }
}
await copy(source);
writeFileSync(
  destination + '/manifest.json',
  JSON.stringify({ created: new Date().toISOString(), files }, null, 2),
);
console.log(`D1/R2 preservats: ${destination} (${files.length} fitxers).`);
