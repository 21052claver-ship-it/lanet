import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, readdirSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, relative } from 'node:path';
import { pagesConfig } from './pages-utils.mjs';

const mode = process.argv[2];
assert.ok(['--stage', '--ready'].includes(mode));
const reportDir = process.argv[4] || 'output/brand-lanet';
assert.ok(
  process.argv.length === 3 ||
    (process.argv.length === 5 && process.argv[3] === '--report-dir'),
);
assert.match(reportDir, /^output\/[a-z0-9-]+$/);
const cfg = pagesConfig(),
  base = cfg.vars.PUBLIC_ORIGIN,
  checks = [];
const get = (path, options = {}) =>
  fetch(base + path, { ...options, signal: AbortSignal.timeout(30000) });
const sha = (bytes) => createHash('sha256').update(bytes).digest('hex');
const response = await get('/');
assert.equal(response.status, 200);
const html = await response.text();
assert.match(html, /<title>La Net/);
assert.doesNotMatch(html, /impossible[\s-]*goals/i);
assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
assert.equal(response.headers.get('x-frame-options'), 'DENY');
assert.match(response.headers.get('content-security-policy'), /frame-ancestors 'none'/);
checks.push('Frontend La Net, own HTTPS origin and security headers');
const status = await (await get('/api/auth/status')).json();
assert.equal(status.auth_method, 'google');
assert.equal(status.google, mode === '--ready');
assert.equal(status.guest, false);
assert.equal(status.demo, false);
assert.equal(status.authenticated, false);
for (const path of ['/api/bootstrap', '/api/auth/me', '/api/admin'])
  assert.equal((await get(path)).status, 401);
for (const route of ['login', 'register', 'guest', 'reset', 'bootstrap', 'password']) {
  const r = await get('/api/auth/' + route, {
    method: 'POST',
    headers: { Origin: base, 'Content-Type': 'application/json' },
    body: '{}',
  });
  assert.equal(r.status, 403);
  assert.equal(r.headers.has('Set-Cookie'), false);
}
checks.push('Google only; protected data and no alternative sign-in');
if (mode === '--stage') {
  const r = await get('/api/auth/google/start', {
    method: 'POST',
    headers: { Origin: base, 'Content-Type': 'application/json' },
    body: '{"intent":"login"}',
  });
  assert.equal(r.status, 503);
  assert.equal(r.headers.has('Set-Cookie'), false);
  checks.push('Staged login fails closed before Google configuration');
}
const files = [];
function walk(directory) {
  for (const item of readdirSync(directory, { withFileTypes: true })) {
    const path = join(directory, item.name);
    if (item.isDirectory()) walk(path);
    else if (!['_headers', '_redirects', '_worker.js', '_routes.json'].includes(item.name))
      files.push(path);
  }
}
walk('dist-pages');
const hashes = [];
for (let offset = 0; offset < files.length; offset += 4) {
  const results = await Promise.allSettled(
    files.slice(offset, offset + 4).map(async (file) => {
      const path = '/' + relative('dist-pages', file).replaceAll('\\', '/');
      const r = await get(path);
      assert.equal(r.status, 200, path);
      const local = readFileSync(file),
        hash = sha(local);
      assert.equal(sha(Buffer.from(await r.arrayBuffer())), hash, path);
      if (/\.(?:html|js|css)$/.test(path))
        assert.doesNotMatch(local.toString(), /impossible[\s-]*goals/i, path);
      return { path, sha256: hash };
    }),
  );
  for (const result of results) {
    if (result.status === 'rejected') throw result.reason;
    hashes.push(result.value);
  }
}
const workerResponse = await get('/_worker.js');
const served = Buffer.from(await workerResponse.arrayBuffer());
assert.notEqual(sha(served), sha(readFileSync('dist-pages/_worker.js')));
assert.doesNotMatch(workerResponse.headers.get('content-type') || '', /javascript/);
checks.push('All ' + hashes.length + ' public assets match; backend bundle is not public');
const report = {
  date: new Date().toISOString(),
  mode,
  origin: base,
  googleAvailable: status.google,
  googleBrand: 'Existing brand retained at user request',
  assetCount: hashes.length,
  checks,
  assets: hashes,
  productionDataMutated: false,
};
mkdirSync(reportDir, { recursive: true });
writeFileSync(
  reportDir + '/' + (mode === '--stage' ? 'stage-smoke' : 'public-smoke') + '.json',
  JSON.stringify(report, null, 2) + '\n',
);
console.log(checks.join('\n'));
