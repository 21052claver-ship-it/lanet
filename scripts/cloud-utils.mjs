import { spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { parse } from 'jsonc-parser';
export function config() {
  const errors = [];
  const value = parse(readFileSync('wrangler.jsonc', 'utf8'), errors, { allowTrailingComma: true });
  if (errors.length) throw new Error('wrangler.jsonc no té un format vàlid.');
  return value;
}
export function writeConfig(value) {
  writeFileSync('wrangler.jsonc', JSON.stringify(value, null, 2) + '\n');
}
export function cli(args, { capture = false, input } = {}) {
  const r = spawnSync(
    process.execPath,
    ['node_modules/wrangler/bin/wrangler.js', '--config', 'wrangler.jsonc', ...args],
    {
      windowsHide: true,
      encoding: 'utf8',
      stdio: capture ? 'pipe' : input ? ['pipe', 'inherit', 'inherit'] : 'inherit',
      input,
      maxBuffer: 8 * 1024 * 1024,
    },
  );
  if (r.status !== 0)
    throw new Error(capture ? r.stderr || r.stdout : 'L’ordre de Cloudflare no s’ha completat.');
  return r.stdout || '';
}
export function jsonOutput(text) {
  for (let i = 0; i < text.length; i++)
    if (text[i] === '[' || text[i] === '{') {
      try {
        return JSON.parse(text.slice(i).trim());
      } catch {}
    }
  throw new Error('Cloudflare no ha retornat la informació esperada.');
}
