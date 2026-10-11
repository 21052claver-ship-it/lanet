import { cpSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { spawnSync } from 'node:child_process';
import { build } from 'esbuild';
import { pagesConfig } from './pages-utils.mjs';

pagesConfig();
const root = resolve('.'),
  target = resolve('dist-pages');
if (dirname(target) !== root || target !== resolve(root, 'dist-pages'))
  throw new Error('Sortida fora del projecte.');
const result = spawnSync(process.execPath, ['node_modules/vite/bin/vite.js', 'build'], {
  stdio: 'inherit',
  windowsHide: true,
});
if (result.status !== 0) process.exit(result.status || 1);
// Only this fixed, verified build directory is replaced; no project data lives here.
rmSync(target, { recursive: true, force: true });
mkdirSync(target);
cpSync(resolve('dist'), target, { recursive: true });
await build({
  entryPoints: ['worker/pages-entry.js'],
  outfile: resolve(target, '_worker.js'),
  bundle: true,
  format: 'esm',
  platform: 'browser',
  target: 'es2022',
  minify: true,
  sourcemap: false,
  legalComments: 'none',
});
// All requests use the canonical-host guard; assets are then served by ASSETS.
writeFileSync(
  resolve(target, '_routes.json'),
  JSON.stringify({ version: 1, include: ['/*'], exclude: [] }) + '\n',
);
console.log('Pages compilat: frontend conservat i backend al mateix origen.');
