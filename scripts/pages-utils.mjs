import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { parse } from 'jsonc-parser';
import { jsonOutput } from './cloud-utils.mjs';

export function validatePagesConfig(cfg, original) {
  const origin = new URL(cfg.vars?.PUBLIC_ORIGIN);
  if (
    !/^[a-f0-9]{32}$/.test(cfg.account_id || '') ||
    cfg.account_id !== original.account_id ||
    !/^[a-z0-9][a-z0-9-]{0,62}$/.test(cfg.name || '') ||
    cfg.pages_build_output_dir !== './dist-pages' ||
    cfg.main ||
    cfg.assets ||
    origin.protocol !== 'https:' ||
    origin.href !== origin.origin + '/' ||
    origin.username ||
    origin.password ||
    /impossible[\s-]*goals/i.test(origin.href) ||
    cfg.vars.GOOGLE_REDIRECT_URI !== origin.origin + '/api/auth/google/callback' ||
    cfg.vars.DEMO_MODE !== 'false' ||
    cfg.vars.GUEST_ACCESS !== 'false' ||
    cfg.vars.GOOGLE_ALLOWED_DOMAIN !== 'fje.edu' ||
    cfg.vars.SCHOOL_NAME !== 'La Net' ||
    Object.hasOwn(cfg.vars, 'GOOGLE_CLIENT_ID') ||
    Object.hasOwn(cfg.vars, 'GOOGLE_CLIENT_SECRET') ||
    cfg.d1_databases?.find((d) => d.binding === 'DB')?.database_id !==
      original.d1_databases?.find((d) => d.binding === 'DB')?.database_id ||
    cfg.r2_buckets?.find((b) => b.binding === 'FILES')?.bucket_name !==
      original.r2_buckets?.find((b) => b.binding === 'FILES')?.bucket_name ||
    cfg.r2_buckets?.find((b) => b.binding === 'FILES')?.jurisdiction !== 'eu'
  )
    throw new Error(
      'Configura Pages amb una adreça pròpia, el mateix compte/D1/R2 i només Google.',
    );
  return cfg;
}

export function pagesConfig() {
  function read(path) {
    const errors = [];
    const cfg = parse(readFileSync(path, 'utf8'), errors, { allowTrailingComma: true });
    if (errors.length) throw new Error('Configuració Cloudflare invàlida.');
    return cfg;
  }
  const cfg = read('wrangler.jsonc'),
    target = read('cloudflare-target.json');
  if (cfg.name !== target.pages_project || cfg.vars?.PUBLIC_ORIGIN !== target.public_origin)
    throw new Error('La destinació no coincideix amb el projecte Pages fixat.');
  return validatePagesConfig(
    { ...cfg, account_id: target.account_id },
    read('wrangler.worker-archive.jsonc'),
  );
}

export function pagesCli(args, { capture = false, input, sensitive = false } = {}) {
  const cfg = pagesConfig();
  // Pages accepts only wrangler.jsonc in its working directory. Keep the
  // existing Worker configuration intact and use a separate generated folder.
  const cwd = resolve('.cache/pages-deploy');
  mkdirSync(cwd, { recursive: true });
  const launchConfig = {
    ...cfg,
    $schema: '../../node_modules/wrangler/config-schema.json',
    pages_build_output_dir: '../../dist-pages',
    d1_databases: cfg.d1_databases.map((d) => ({ ...d, migrations_dir: '../../migrations' })),
  };
  // Pages takes the pinned account from CLOUDFLARE_ACCOUNT_ID, not its file schema.
  delete launchConfig.account_id;
  writeFileSync(resolve(cwd, 'wrangler.jsonc'), JSON.stringify(launchConfig, null, 2) + '\n');
  const result = spawnSync(
    process.execPath,
    [resolve('node_modules/wrangler/bin/wrangler.js'), ...args],
    {
      cwd,
      encoding: 'utf8',
      windowsHide: true,
      input,
      maxBuffer: 8 * 1024 * 1024,
      stdio: capture || sensitive ? 'pipe' : 'inherit',
      env: { ...process.env, CLOUDFLARE_ACCOUNT_ID: cfg.account_id, WRANGLER_WRITE_LOGS: 'false' },
    },
  );
  if (result.status !== 0) {
    if (!sensitive && capture) process.stderr.write(result.stderr || result.stdout || '');
    throw new Error('No s’ha pogut completar l’operació de Pages.');
  }
  return result.stdout || '';
}

export function ensurePagesProject() {
  const cfg = pagesConfig();
  const projects = jsonOutput(pagesCli(['pages', 'project', 'list', '--json'], { capture: true }));
  const project = projects.find((p) => p['Project Name'] === cfg.name);
  if (
    !project ||
    !project['Project Domains'].split(/,\s*/).includes(new URL(cfg.vars.PUBLIC_ORIGIN).hostname)
  )
    throw new Error(
      'Falta el projecte Pages amb el domini previst; no es desplega cap Worker alternatiu.',
    );
  return cfg;
}
