import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { parse } from 'jsonc-parser';
import { pagesConfig } from './pages-utils.mjs';
const cfg = parse(readFileSync('wrangler.media.jsonc', 'utf8'));
const app = pagesConfig();
if (
  cfg.name !== 'lanet-media-safety' ||
  cfg.account_id !== app.account_id ||
  cfg.main !== 'worker/media-entry.js' ||
  cfg.workers_dev !== false ||
  cfg.preview_urls !== false ||
  cfg.images?.binding !== 'IMAGES' ||
  cfg.ai?.binding !== 'AI' ||
  cfg.d1_databases ||
  cfg.r2_buckets ||
  cfg.routes ||
  !app.services?.some((s) => s.binding === 'MEDIA_SAFETY' && s.service === cfg.name)
)
  throw new Error(
    'El servei de comprovació ha de ser privat, separat i al mateix compte de La Net.',
  );
const result = spawnSync(
  process.execPath,
  ['node_modules/wrangler/bin/wrangler.js', 'deploy', '--config', 'wrangler.media.jsonc'],
  { stdio: 'inherit', windowsHide: true, env: { ...process.env, WRANGLER_WRITE_LOGS: 'false' } },
);
if (result.status !== 0) process.exit(result.status || 1);
console.log('Servei privat de comprovació publicat. Sense workers.dev ni URL de previsualització.');
