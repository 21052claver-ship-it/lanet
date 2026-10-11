import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, readdirSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, relative } from 'node:path';

// No accounts, files, grades, preferences or session cookies are created.
const [address, confirmation] = process.argv.slice(2);
const url = new URL(address);
assert.equal(url.protocol, 'https:');
assert.equal(confirmation, '--verify-google-only');
const base = url.origin,
  checks = [];
async function check(label, fn) {
  await fn();
  checks.push(label);
  console.log(`✓ ${label}`);
}
await check('Frontend HTTPS i capcaleres de proteccio', async () => {
  const response = await fetch(base);
  assert.equal(response.status, 200);
  assert.match(response.headers.get('content-type'), /text\/html/);
  assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
  assert.equal(response.headers.get('x-frame-options'), 'DENY');
  assert.match(response.headers.get('content-security-policy'), /frame-ancestors 'none'/);
  assert.match(await response.text(), /<title>La Net/);
});
await check('Google unic activat i accessos anonims protegits', async () => {
  assert.equal((await (await fetch(base + '/api/health')).json()).ok, true);
  const status = await (await fetch(base + '/api/auth/status')).json();
  assert.equal(status.auth_method, 'google');
  assert.equal(status.google, true);
  assert.equal(status.guest, false);
  assert.equal(status.demo, false);
  assert.equal(status.authenticated, false);
  for (const path of ['/bootstrap', '/auth/me', '/admin'])
    assert.equal((await fetch(base + '/api' + path)).status, 401);
});
await check('Cap endpoint antic emet sessio ni permet registre manual', async () => {
  for (const route of ['login', 'register', 'guest', 'reset', 'bootstrap', 'password']) {
    const response = await fetch(base + '/api/auth/' + route, {
      method: 'POST',
      headers: { Origin: base, 'Content-Type': 'application/json' },
      body: '{}',
    });
    assert.equal(response.status, 403);
    assert.equal(response.headers.has('Set-Cookie'), false);
  }
});
let assetCount = 0;
await check('Recursos publicats identics al build local per SHA-256', async () => {
  const files = [];
  function walk(directory) {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const path = join(directory, entry.name);
      if (entry.isDirectory()) walk(path);
      else if (!['_headers', '_redirects'].includes(entry.name)) files.push(path);
    }
  }
  walk('dist');
  let cursor = 0;
  await Promise.all(
    Array.from({ length: 4 }, async () => {
      while (cursor < files.length) {
        const path = files[cursor++],
          route = '/' + relative('dist', path).replaceAll('\\', '/');
        const response = await fetch(base + route);
        assert.equal(response.status, 200, route);
        const actual = Buffer.from(await response.arrayBuffer());
        const digest = (bytes) => createHash('sha256').update(bytes).digest('hex');
        assert.equal(digest(actual), digest(readFileSync(path)), route);
        assetCount++;
      }
    }),
  );
});
mkdirSync('output/google-only', { recursive: true });
writeFileSync(
  'output/google-only/public-smoke.json',
  JSON.stringify(
    {
      date: new Date().toISOString(),
      base,
      checks,
      assetCount,
      userDataWrites: false,
      secretsLogged: false,
    },
    null,
    2,
  ) + '\n',
);
console.log(`${checks.length} comprovacions publiques i ${assetCount} recursos verificats.`);
