import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { pagesConfig } from './pages-utils.mjs';
import { betaContentSql, betaBoardResetSql } from './beta-content.mjs';

const remote = process.argv.includes('--remote');
const apply = process.argv.includes('--apply');
const label = remote ? 'remote' : 'local';
const directory = remote ? '.cloud' : 'backups';
mkdirSync(directory, { recursive: true });
mkdirSync('output/beta-ready', { recursive: true });
const cfg = pagesConfig();
const cli = (args) =>
  execFileSync(
    process.execPath,
    [
      'node_modules/wrangler/bin/wrangler.js',
      '--config',
      remote ? 'wrangler.jsonc' : 'wrangler.local.jsonc',
      ...args,
    ],
    {
      encoding: 'utf8',
      windowsHide: true,
      env: { ...process.env, CLOUDFLARE_ACCOUNT_ID: cfg.account_id, WRANGLER_WRITE_LOGS: 'false' },
      maxBuffer: 32 * 1024 * 1024,
      stdio: 'pipe',
    },
  );
const mode = remote ? '--remote' : '--local';
const before = `${directory}/lanet-before-beta-2026-10-11.sql`;
const after = `${directory}/lanet-after-beta-2026-10-11.sql`;
try {
  if (!apply) {
    cli(['d1', 'export', 'DB', mode, '--output', before]);
    console.log(`${label}: còpia prèvia desada.`);
  } else {
    // The backup is mandatory. Verification below also checks every preserved row.
    const { existsSync } = await import('node:fs');
    if (!existsSync(before)) throw Error('Missing backup');
    writeFileSync(
      `output/beta-ready/${label}-migration.txt`,
      cli(['d1', 'migrations', 'apply', 'DB', mode]),
    );
    const sql = `${directory}/beta-content.sql`;
    writeFileSync(sql, betaContentSql() + '\n' + betaBoardResetSql);
    writeFileSync(
      `output/beta-ready/${label}-seed.txt`,
      cli(['d1', 'execute', 'DB', mode, '--file', sql, '--yes']),
    );
    cli(['d1', 'export', 'DB', mode, '--output', after]);
    execFileSync(
      process.execPath,
      ['scripts/verify-beta-data.mjs', before, after, `output/beta-ready/${label}-data.json`],
      { stdio: 'inherit', windowsHide: true },
    );
    console.log(`${label}: beta aplicada i dades preservades.`);
  }
} catch (error) {
  mkdirSync('.cloud', { recursive: true });
  writeFileSync(
    `.cloud/beta-${label}-error.txt`,
    String(error.stderr || error.stdout || error.stack || error),
  );
  throw Error(
    `${label}: procés interromput. Revisa els registres privadament abans de repetir-lo.`,
  );
}
