import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync } from 'node:fs';
import { resolve, join, relative } from 'node:path';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import assert from 'node:assert/strict';
import { ensurePagesProject, pagesCli } from './pages-utils.mjs';
import { jsonOutput } from './cloud-utils.mjs';
import { RELEASE_REPOSITORY, releaseNotes, validateRelease } from './release-utils.mjs';
const repo = RELEASE_REPOSITORY;
const env = { ...process.env };
if (!env.GH_CONFIG_DIR && existsSync('.cache/gh-lanet/hosts.yml'))
  env.GH_CONFIG_DIR = resolve('.cache/gh-lanet');
function command(binary, args, { input, optional = false } = {}) {
  const r = spawnSync(binary, args, {
    encoding: 'utf8',
    windowsHide: true,
    env,
    input,
    maxBuffer: 16 * 1024 * 1024,
  });
  if (r.status !== 0 && !optional)
    throw new Error(
      `No s’ha pogut completar ${binary} ${args.slice(0, 2).join(' ')}; revisa accés i estat. No s’imprimeixen credencials.`,
    );
  return { ok: r.status === 0, text: (r.stdout || '').trim() };
}
const git = (...args) => command('git', args).text;
const gh = (...args) => command('gh', args).text;
const api = (path) => JSON.parse(gh('api', path) || 'null');
function mutateApi(path, body) {
  return JSON.parse(
    command('gh', ['api', path, '--input', '-'], { input: JSON.stringify(body) }).text || 'null',
  );
}
const pkg = JSON.parse(readFileSync('package.json', 'utf8')),
  version = pkg.version,
  tag = 'v' + version;
const notes = releaseNotes(readFileSync('CHANGELOG.md', 'utf8'), version);
const sha = git('rev-parse', 'HEAD');
const runs = JSON.parse(
  gh(
    'run',
    'list',
    '--repo',
    repo,
    '--workflow',
    'verify.yml',
    '--commit',
    sha,
    '--branch',
    'main',
    '--event',
    'push',
    '--limit',
    '1',
    '--json',
    'databaseId,headSha,status,conclusion,url',
  ),
);
validateRelease({
  login: api('user').login,
  remote: git('remote', 'get-url', 'origin'),
  branch: git('branch', '--show-current'),
  dirty: git('status', '--porcelain'),
  localSha: sha,
  remoteSha: api(`repos/${repo}/commits/main`).sha,
  version,
  lockVersion: JSON.parse(readFileSync('package-lock.json', 'utf8')).version,
  run: runs[0],
});
const cfg = ensurePagesProject();
assert.equal(cfg.name, 'lanet');
const existing = command('gh', ['release', 'view', tag, '--repo', repo, '--json', 'tagName'], {
  optional: true,
});
assert.ok(!existing.ok, 'La versió ja està publicada; incrementa-la.');
const tagged = command('gh', ['api', `repos/${repo}/git/ref/tags/${tag}`], { optional: true });
assert.ok(!tagged.ok, 'El tag ja existeix; no es reescriu.');
const out = resolve('output/releases', version);
mkdirSync(out, { recursive: true });
const receiptFile = join(out, 'receipt.json');
let receipt = existsSync(receiptFile) ? JSON.parse(readFileSync(receiptFile, 'utf8')) : null;
if (receipt) {
  assert.equal(receipt.sha, sha, 'El rebut parcial pertany a un altre commit.');
  assert.equal(receipt.version, version);
} else {
  console.log('CI correcta. Compilant el commit exacte ' + sha.slice(0, 8));
  const built = spawnSync(process.execPath, ['scripts/build-pages.mjs'], {
    stdio: 'inherit',
    windowsHide: true,
    env,
  });
  assert.equal(built.status, 0, 'Compilació fallida.');
  const files = [];
  function walk(dir) {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const path = join(dir, entry.name);
      if (entry.isDirectory()) walk(path);
      else {
        const name = relative(resolve('dist-pages'), path).replaceAll('\\', '/');
        assert.ok(
          !/(?:^|\/)(?:\.dev\.vars|\.env|client_secret|backups|exports|output)/i.test(name),
        );
        const bytes = readFileSync(path);
        assert.ok(
          !/GOCSPX-[A-Za-z0-9_-]{20,}|\bgh[pousr]_[A-Za-z0-9]{30,}\b/.test(bytes.toString('utf8')),
        );
        files.push({
          path: name,
          bytes: bytes.length,
          sha256: createHash('sha256').update(bytes).digest('hex'),
        });
      }
    }
  }
  walk(resolve('dist-pages'));
  const deployment = mutateApi(`repos/${repo}/deployments`, {
    ref: sha,
    auto_merge: false,
    required_contexts: [],
    environment: 'production',
    production_environment: true,
    description: `La Net ${version}`,
    payload: { version, ci: runs[0].url },
  });
  receipt = {
    version,
    sha,
    repository: repo,
    origin: cfg.vars.PUBLIC_ORIGIN,
    githubDeployment: deployment.id,
    ci: runs[0].url,
    ciConclusion: 'success',
    files,
    publicSiteVisited: false,
  };
  writeFileSync(receiptFile, JSON.stringify(receipt, null, 2) + '\n');
  mutateApi(`repos/${repo}/deployments/${deployment.id}/statuses`, {
    state: 'in_progress',
    environment_url: cfg.vars.PUBLIC_ORIGIN,
    log_url: runs[0].url,
    description: `Publicant La Net ${version}`,
  });
}
try {
  if (!receipt.cloudflareDeployment) {
    for (const file of receipt.files) {
      const path = resolve('dist-pages', file.path);
      assert.ok(
        path.startsWith(resolve('dist-pages') + '/') ||
          path.startsWith(resolve('dist-pages') + '\\'),
      );
      assert.equal(
        createHash('sha256').update(readFileSync(path)).digest('hex'),
        file.sha256,
        'El build ha canviat; no es publica un rebut diferent.',
      );
    }
    const log = pagesCli(
      [
        'pages',
        'deploy',
        resolve('dist-pages'),
        '--project-name',
        cfg.name,
        '--branch',
        'main',
        '--commit-hash',
        sha,
        '--commit-message',
        `La Net ${version}`,
      ],
      { capture: true },
    );
    writeFileSync(join(out, 'deploy.txt'), log);
    const short = log.match(/Deployment complete!.*https:\/\/([a-f0-9]+)\.lanet\.pages\.dev/)?.[1];
    assert.ok(short, 'Falta rebut de Cloudflare.');
    receipt.cloudflareDeployment = short;
    receipt.publishedAt = new Date().toISOString();
    writeFileSync(receiptFile, JSON.stringify(receipt, null, 2) + '\n');
  }
  const deployments = jsonOutput(
    pagesCli(['pages', 'deployment', 'list', '--project-name', cfg.name, '--json'], {
      capture: true,
    }),
  );
  assert.ok(
    deployments.some(
      (d) =>
        JSON.stringify(d).includes(receipt.cloudflareDeployment) &&
        JSON.stringify(d).includes(sha.slice(0, 7)),
    ),
    'El proveïdor no confirma desplegament/commit.',
  );
  receipt.providerConfirmed = true;
  writeFileSync(receiptFile, JSON.stringify(receipt, null, 2) + '\n');
  mutateApi(`repos/${repo}/deployments/${receipt.githubDeployment}/statuses`, {
    state: 'success',
    environment_url: cfg.vars.PUBLIC_ORIGIN,
    log_url: runs[0].url,
    description: `La Net ${version} · Pages ${receipt.cloudflareDeployment}`,
  });
  const notesFile = join(out, 'notes.md');
  writeFileSync(
    notesFile,
    notes +
      `\n\nCommit: ${sha}\n\nCloudflare Pages: ${receipt.cloudflareDeployment}\n\nCI: ${runs[0].url}\n\nAplicació: ${cfg.vars.PUBLIC_ORIGIN}\n\nProves amb fixtures locals; cap visita a l’aplicació pública. Rebut JSON adjunt, sense secrets ni dades d’usuaris.\n`,
  );
  gh(
    'release',
    'create',
    tag,
    receiptFile,
    '--repo',
    repo,
    '--target',
    sha,
    '--title',
    `La Net ${version}`,
    '--notes-file',
    notesFile,
    '--latest',
  );
  console.log(
    `Publicada La Net ${version}: https://github.com/${repo}/releases/tag/${tag} · Pages ${receipt.cloudflareDeployment}`,
  );
} catch (error) {
  command(
    'gh',
    ['api', `repos/${repo}/deployments/${receipt.githubDeployment}/statuses`, '--input', '-'],
    {
      input: JSON.stringify({
        state: 'error',
        description: 'Publicació incompleta; revisa rebut local abans de reintentar.',
      }),
      optional: true,
    },
  );
  throw error;
}
