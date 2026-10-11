import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { parse } from 'jsonc-parser';
import { pagesConfig } from './pages-utils.mjs';
const config = parse(readFileSync('wrangler.maintenance.jsonc', 'utf8')),
  pinned = pagesConfig();
if (
  config.name !== 'lanet-file-maintenance' ||
  config.main !== 'worker/maintenance-entry.js' ||
  config.account_id !== pinned.account_id ||
  config.workers_dev !== false ||
  config.preview_urls !== false ||
  config.routes ||
  JSON.stringify(config.triggers?.crons) !== JSON.stringify(['* * * * *']) ||
  config.d1_databases?.[0]?.database_id !== pinned.d1_databases[0].database_id ||
  config.r2_buckets?.[0]?.bucket_name !== pinned.r2_buckets[0].bucket_name ||
  config.r2_buckets?.[0]?.jurisdiction !== 'eu'
)
  throw new Error('La neteja ha de ser privada, programada i vinculada a la D1/R2 de La Net.');
const result = spawnSync(
  process.execPath,
  ['node_modules/wrangler/bin/wrangler.js', 'deploy', '--config', 'wrangler.maintenance.jsonc'],
  { stdio: 'inherit', windowsHide: true, env: { ...process.env, WRANGLER_WRITE_LOGS: 'false' } },
);
if (result.status !== 0) process.exit(result.status || 1);
