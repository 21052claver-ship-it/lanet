import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
import { ensurePagesProject, pagesCli } from './pages-utils.mjs';

const cfg = ensurePagesProject();
const result = spawnSync(process.execPath, ['scripts/build-pages.mjs'], {
  stdio: 'inherit',
  windowsHide: true,
});
if (result.status !== 0) process.exit(result.status || 1);
// The project must already exist. Do not delegate to an account workers.dev URL.
pagesCli([
  'pages',
  'deploy',
  resolve('dist-pages'),
  '--project-name',
  cfg.name,
  '--branch',
  'main',
  '--commit-message',
  'La Net: navegació mòbil amb Més sobre la barra inferior',
]);
console.log(
  `Adreça Pages: ${cfg.vars.PUBLIC_ORIGIN}. Comprova l’entrada Google després de publicar.`,
);
