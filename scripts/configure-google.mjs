import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { resolve, relative, isAbsolute, sep } from 'node:path';
import { spawnSync } from 'node:child_process';
import { parse } from 'jsonc-parser';
import { googleConfig } from '../worker/google-config.js';
import { pagesConfig, ensurePagesProject, pagesCli } from './pages-utils.mjs';
const args = process.argv.slice(2);
let remoteAccountId;
let remoteIsPages = false;
const index = args.indexOf('--file');
const originIndex = args.indexOf('--local-origin');
const confirmedIndex = args.indexOf('--confirmed-redirect');
if (index < 0 || !args[index + 1])
  throw new Error(
    'Indica --file amb el JSON del client Web descarregat de Google, guardat fora del projecte.',
  );
const file = resolve(args[index + 1]);
const part = relative(process.cwd(), file);
if (part !== '..' && !part.startsWith('..' + sep) && !isAbsolute(part))
  throw new Error('Guarda el JSON de credencials fora del projecte per mantenir-lo fora del ZIP.');
let credentials;
try {
  credentials = JSON.parse(readFileSync(file, 'utf8')).web;
} catch {
  throw new Error(
    'No s’ha pogut llegir el JSON de credencials. Descarrega el client Web des de Google Cloud.',
  );
}
const localOrigin = originIndex >= 0 ? args[originIndex + 1] : 'http://127.0.0.1:5173';
if (!/^http:\/\/(?:127\.0\.0\.1|localhost):\d{1,5}$/.test(localOrigin || ''))
  throw new Error('L’origen local ha de ser localhost o 127.0.0.1 amb port.');
const env = {
  GOOGLE_CLIENT_ID: credentials?.client_id,
  GOOGLE_CLIENT_SECRET: credentials?.client_secret,
  GOOGLE_REDIRECT_URI: localOrigin + '/api/auth/google/callback',
  GOOGLE_ALLOWED_DOMAIN: 'fje.edu',
};
if (
  !googleConfig(env) ||
  !Array.isArray(credentials?.redirect_uris) ||
  !credentials.redirect_uris.includes(env.GOOGLE_REDIRECT_URI)
)
  throw new Error(
    'Cal un client Web amb credencials i el callback local autoritzat. Consulta docs/GOOGLE-OAUTH.md.',
  );
if (args.includes('--remote')) {
  let cfg;
  try {
    const errors = [];
    cfg = parse(readFileSync('wrangler.jsonc', 'utf8'), errors, { allowTrailingComma: true });
    if (errors.length) throw new Error();
    if (cfg.pages_build_output_dir) {
      cfg = pagesConfig();
      remoteIsPages = true;
    }
  } catch {
    throw new Error('No s’ha pogut llegir la configuració de Cloudflare.');
  }
  const remote = googleConfig({ ...env, GOOGLE_REDIRECT_URI: cfg?.vars?.GOOGLE_REDIRECT_URI });
  if (
    !/^[a-f0-9]{32}$/.test(cfg?.account_id || '') ||
    !/^[a-z0-9][a-z0-9-]{0,62}$/.test(cfg?.name || '') ||
    cfg?.vars?.DEMO_MODE !== 'false' ||
    cfg?.vars?.GOOGLE_ALLOWED_DOMAIN !== 'fje.edu' ||
    !remote ||
    !remote.redirectUri.startsWith('https://') ||
    (new URL(remote.redirectUri).hostname.endsWith('.workers.dev') &&
      !new URL(remote.redirectUri).hostname.startsWith(cfg.name + '.'))
  )
    throw new Error(
      'Cal fixar el compte, l’aplicació i el callback HTTPS de producció a wrangler.jsonc.',
    );
  if (confirmedIndex >= 0 && args[confirmedIndex + 1] !== remote.redirectUri)
    throw new Error(
      'La confirmació manual ha de coincidir exactament amb el callback de producció.',
    );
  if (!credentials.redirect_uris.includes(remote.redirectUri) && confirmedIndex < 0)
    throw new Error(`Autoritza aquest callback al client de Google: ${remote.redirectUri}`);
  remoteAccountId = cfg.account_id;
}
if (args.includes('--check')) {
  console.log('Credencials i callbacks vàlids. No s’ha modificat cap configuració ni secret.');
  process.exit(0);
}
let content = existsSync('.dev.vars')
  ? readFileSync('.dev.vars', 'utf8')
  : readFileSync('.dev.vars.example', 'utf8');
for (const [key, value] of Object.entries(env)) {
  content = content.replace(new RegExp(`^${key}=.*(?:\r?\n|$)`, 'gm'), '');
  content += `\n${key}=${JSON.stringify(value)}\n`;
}
writeFileSync('.dev.vars', content, { mode: 0o600 });
if (args.includes('--remote')) {
  if (remoteIsPages) {
    ensurePagesProject();
    pagesCli(['pages', 'secret', 'bulk', '--project-name', pagesConfig().name], {
      input: JSON.stringify({
        GOOGLE_CLIENT_ID: env.GOOGLE_CLIENT_ID,
        GOOGLE_CLIENT_SECRET: env.GOOGLE_CLIENT_SECRET,
      }),
      sensitive: true,
    });
  } else {
    mkdirSync('.cache/wrangler', { recursive: true });
    const result = spawnSync(
      process.execPath,
      ['node_modules/wrangler/bin/wrangler.js', '--config', 'wrangler.jsonc', 'secret', 'bulk'],
      {
        input: JSON.stringify({
          GOOGLE_CLIENT_ID: env.GOOGLE_CLIENT_ID,
          GOOGLE_CLIENT_SECRET: env.GOOGLE_CLIENT_SECRET,
        }),
        encoding: 'utf8',
        windowsHide: true,
        env: {
          ...process.env,
          CLOUDFLARE_ACCOUNT_ID: remoteAccountId,
          WRANGLER_LOG_PATH: '.cache/wrangler/google-secrets.log',
        },
        maxBuffer: 2 * 1024 * 1024,
      },
    );
    if (result.status !== 0)
      throw new Error(
        'Configuracio local desada. No s’han pogut confirmar els secrets remots; revisa l’accés a Cloudflare i torna-ho a provar.',
      );
  }
}
console.log(
  args.includes('--remote')
    ? 'Google configurat en local i a Cloudflare. Reinicia el servidor local i comprova l’entrada real.'
    : 'Google configurat en local. Reinicia el servidor i comprova l’entrada real.',
);
