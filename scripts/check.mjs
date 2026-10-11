import { readdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
for (const folder of ['worker', 'shared', 'scripts'])
  for (const file of readdirSync(folder).filter((n) => /\.(js|mjs)$/.test(n))) {
    const r = spawnSync(process.execPath, ['--check', `${folder}/${file}`], {
      encoding: 'utf8',
      windowsHide: true,
    });
    if (r.status !== 0) {
      console.error(r.stderr);
      process.exit(1);
    }
  }
console.log('Sintaxi del servidor i dels scripts verificada.');
