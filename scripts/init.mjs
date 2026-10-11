import { existsSync, copyFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
if (!existsSync('.dev.vars')) copyFileSync('.dev.vars.example', '.dev.vars');
for (const args of [
  [
    'node_modules/wrangler/bin/wrangler.js',
    '--config',
    'wrangler.local.jsonc',
    'd1',
    'migrations',
    'apply',
    'DB',
    '--local',
  ],
  ['scripts/seed.mjs'],
]) {
  const r = spawnSync(process.execPath, args, { stdio: 'inherit', windowsHide: true });
  if (r.status !== 0) process.exit(r.status || 1);
}
