import { readFileSync } from 'node:fs';
import { googleConfig } from '../worker/google-config.js';
import { pagesConfig, ensurePagesProject, pagesCli } from './pages-utils.mjs';

const args = process.argv.slice(2),
  cfg = pagesConfig();
const value = (key) => args[args.indexOf(key) + 1];
const allowed = new Set([
  '--confirmed-brand',
  '--keep-existing-brand',
  '--confirmed-redirect',
  '--check',
  '--remote',
]);
for (let i = 0; i < args.length; i++) {
  if (!allowed.has(args[i])) throw new Error('Argument de configuració desconegut.');
  if (args[i].startsWith('--confirmed-')) i++;
}
const newBrand = args.includes('--confirmed-brand') && value('--confirmed-brand') === 'La Net';
const keepBrand = args.includes('--keep-existing-brand');
if (
  Number(newBrand) + Number(keepBrand) !== 1 ||
  (keepBrand && args.includes('--confirmed-brand')) ||
  !args.includes('--confirmed-redirect') ||
  value('--confirmed-redirect') !== cfg.vars.GOOGLE_REDIRECT_URI
)
  throw new Error(
    'Cal indicar la decisió sobre la marca i confirmar el callback exacte desat a Google Cloud.',
  );
if (args.includes('--check') === args.includes('--remote'))
  throw new Error('Tria --check o --remote.');

let content;
try {
  content = readFileSync('.dev.vars', 'utf8');
} catch {
  throw new Error('Falten les credencials locals privades de Google.');
}
const credentials = {};
for (const key of ['GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET']) {
  const values = [...content.matchAll(new RegExp('^' + key + '=(.*)$', 'gm'))];
  if (values.length !== 1) throw new Error('Credencials locals absents o duplicades.');
  let raw = values[0][1].trim();
  if (raw.startsWith('"')) {
    try {
      raw = JSON.parse(raw);
    } catch {
      throw new Error('Format de credencials locals invàlid.');
    }
  }
  credentials[key] = raw;
}
if (!googleConfig({ ...cfg.vars, ...credentials }))
  throw new Error('Configuració Google invàlida.');
if (args.includes('--check')) {
  console.log('Credencials i destinació Pages vàlides. No s’ha escrit cap secret.');
} else {
  ensurePagesProject();
  pagesCli(['pages', 'secret', 'bulk', '--project-name', cfg.name], {
    input: JSON.stringify(credentials),
    sensitive: true,
  });
  console.log(
    'Credencials Google desades a La Net Pages. Cal desplegar i comprovar l’entrada real.',
  );
}
