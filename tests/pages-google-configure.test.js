import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, relative } from 'node:path';
import { spawnSync } from 'node:child_process';

test('Pages Google configuration requires confirmed brand and callback without exposing or changing secrets', () => {
  const root = mkdtempSync(join(tmpdir(), 'lanet-pages-google-'));
  const secret = 'isolated-pages-credential-test';
  const content =
    'GOOGLE_CLIENT_ID="123-test.apps.googleusercontent.com"\nGOOGLE_CLIENT_SECRET="' +
    secret +
    '"\n';
  for (const name of ['wrangler.jsonc', 'cloudflare-target.json', 'wrangler.worker-archive.jsonc'])
    writeFileSync(join(root, name), readFileSync(name));
  writeFileSync(join(root, '.dev.vars'), content);
  const run = (...args) =>
    spawnSync(process.execPath, [resolve('scripts/configure-pages-google.mjs'), ...args], {
      cwd: root,
      encoding: 'utf8',
      windowsHide: true,
    });
  const callback = 'https://lanet.pages.dev/api/auth/google/callback';
  try {
    for (const args of [
      ['--check', '--confirmed-redirect', callback],
      ['--check', '--confirmed-brand', 'Impossible Goals', '--confirmed-redirect', callback],
      [
        '--check',
        '--confirmed-brand',
        'La Net',
        '--confirmed-redirect',
        'https://old.example/api/auth/google/callback',
      ],
      ['--check', '--remote', '--confirmed-brand', 'La Net', '--confirmed-redirect', callback],
    ]) {
      const result = run(...args);
      assert.notEqual(result.status, 0);
      assert.equal((result.stdout + result.stderr).includes(secret), false);
      assert.equal(readFileSync(join(root, '.dev.vars'), 'utf8'), content);
    }
    const result = run('--check', '--confirmed-brand', 'La Net', '--confirmed-redirect', callback);
    assert.equal(result.status, 0, result.stderr);
    assert.equal((result.stdout + result.stderr).includes(secret), false);
    assert.equal(readFileSync(join(root, '.dev.vars'), 'utf8'), content);
    const preserved = run('--check', '--keep-existing-brand', '--confirmed-redirect', callback);
    assert.equal(preserved.status, 0, preserved.stderr);
    assert.equal((preserved.stdout + preserved.stderr).includes(secret), false);
    assert.equal(readFileSync(join(root, '.dev.vars'), 'utf8'), content);
  } finally {
    const part = relative(resolve(tmpdir()), resolve(root));
    assert.ok(part && !part.startsWith('..') && resolve(root).startsWith(resolve(tmpdir())));
    rmSync(root, { recursive: true, force: true });
  }
});
