import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
test('Configurador Google: conserva variables, no exposa secrets i rebutja fitxer intern/callbacks incorrectes', () => {
  const root = mkdtempSync(join(tmpdir(), 'lanet-google-config-')),
    workspace = join(root, 'workspace');
  mkdirSync(workspace);
  writeFileSync(
    join(workspace, '.dev.vars'),
    'DEMO_MODE=true\nBOOTSTRAP_TOKEN=preserved-test-value\nGOOGLE_CLIENT_ID=old\n',
  );
  const file = join(root, 'client_secret_test.json');
  const web = {
    client_id: '123-test.apps.googleusercontent.com',
    client_secret: 'isolated-credential-test',
    redirect_uris: ['http://127.0.0.1:5183/api/auth/google/callback'],
  };
  writeFileSync(file, JSON.stringify({ web }));
  const run = (path = file) =>
    spawnSync(
      process.execPath,
      [
        resolve('scripts/configure-google.mjs'),
        '--file',
        path,
        '--local-origin',
        'http://127.0.0.1:5183',
      ],
      { cwd: workspace, encoding: 'utf8', windowsHide: true },
    );
  const r = run();
  assert.equal(r.status, 0, r.stderr);
  assert.equal((r.stdout + r.stderr).includes(web.client_secret), false);
  const content = readFileSync(join(workspace, '.dev.vars'), 'utf8');
  assert.match(content, /BOOTSTRAP_TOKEN=preserved-test-value/);
  assert.match(content, /GOOGLE_ALLOWED_DOMAIN="fje.edu"/);
  assert.equal(content.match(/^GOOGLE_CLIENT_ID=/gm).length, 1);
  assert.equal(content.includes(web.client_secret), true);
  const internal = join(workspace, 'client_secret_internal.json');
  writeFileSync(internal, JSON.stringify({ web }));
  assert.notEqual(run(internal).status, 0);
  writeFileSync(file, JSON.stringify({ web: { ...web, redirect_uris: [] } }));
  assert.notEqual(run().status, 0);
  writeFileSync(file, '{"client_secret":"isolated-credential-test",bad}');
  const invalid = run();
  assert.notEqual(invalid.status, 0);
  assert.equal((invalid.stdout + invalid.stderr).includes(web.client_secret), false);
});

function remoteFixture() {
  const root = mkdtempSync(join(tmpdir(), 'lanet-google-target-'));
  const workspace = join(root, 'workspace');
  mkdirSync(workspace);
  const file = join(root, 'client_secret_test.json');
  const local = 'http://127.0.0.1:5183';
  const remote = 'https://lanet.test.workers.dev/api/auth/google/callback';
  const web = {
    client_id: '123-test.apps.googleusercontent.com',
    client_secret: 'isolated-remote-credential-test',
    redirect_uris: [local + '/api/auth/google/callback', remote],
  };
  const config = {
    name: 'lanet',
    account_id: 'b'.repeat(32),
    vars: {
      DEMO_MODE: 'false',
      GOOGLE_ALLOWED_DOMAIN: 'fje.edu',
      GOOGLE_REDIRECT_URI: remote,
    },
  };
  const original = 'DEMO_MODE=true\nBOOTSTRAP_TOKEN=preserved-test-value\n';
  writeFileSync(join(workspace, '.dev.vars'), original);
  const save = () => {
    writeFileSync(file, JSON.stringify({ web }));
    writeFileSync(join(workspace, 'wrangler.jsonc'), JSON.stringify(config));
  };
  save();
  const run = (...extra) =>
    spawnSync(
      process.execPath,
      [resolve('scripts/configure-google.mjs'), '--file', file, '--local-origin', local, '--remote', '--check', ...extra],
      { cwd: workspace, encoding: 'utf8', windowsHide: true },
    );
  const assertUnchanged = (result) => {
    assert.equal(readFileSync(join(workspace, '.dev.vars'), 'utf8'), original);
    assert.equal((result.stdout + result.stderr).includes(web.client_secret), false);
  };
  return { web, config, run, save, assertUnchanged };
}

test('Google remot segueix el callback del projecte seleccionat sense escriure durant la comprovació', () => {
  const f = remoteFixture();
  const first = f.run();
  assert.equal(first.status, 0, first.stderr);
  f.assertUnchanged(first);
  f.config.vars.GOOGLE_REDIRECT_URI = 'https://la-net.example.org/api/auth/google/callback';
  f.web.redirect_uris.push(f.config.vars.GOOGLE_REDIRECT_URI);
  f.save();
  const other = f.run();
  assert.equal(other.status, 0, other.stderr);
  f.assertUnchanged(other);
});

test('Google remot rebutja el JSON amb el callback antic abans de modificar cap secret', () => {
  const f = remoteFixture();
  f.web.redirect_uris[1] = 'https://previous.test.workers.dev/api/auth/google/callback';
  f.save();
  const result = f.run();
  assert.notEqual(result.status, 0);
  assert.ok(result.stderr.includes(f.config.vars.GOOGLE_REDIRECT_URI));
  f.assertUnchanged(result);
});

test('Google remot exigeix compte explícit, domini educatiu i callback HTTPS vàlid', () => {
  for (const change of [
    (config) => delete config.account_id,
    (config) => { config.name = 'previous'; },
    (config) => { config.vars.GOOGLE_ALLOWED_DOMAIN = 'gmail.com'; },
    (config) => { config.vars.GOOGLE_REDIRECT_URI = 'http://localhost:5183/api/auth/google/callback'; },
    (config) => { config.vars.GOOGLE_REDIRECT_URI = 'https://example.org/wrong-callback'; },
  ]) {
    const f = remoteFixture();
    change(f.config);
    f.save();
    const result = f.run();
    assert.notEqual(result.status, 0);
    f.assertUnchanged(result);
  }
});

test('Google admet un callback afegit després de descarregar el JSON només amb confirmació exacta explícita', () => {
  const f = remoteFixture();
  f.web.redirect_uris.pop();
  f.save();
  const valid = f.run('--confirmed-redirect', f.config.vars.GOOGLE_REDIRECT_URI);
  assert.equal(valid.status, 0, valid.stderr);
  f.assertUnchanged(valid);
  for (const extra of [
    ['--confirmed-redirect'],
    ['--confirmed-redirect', 'https://other.test.workers.dev/api/auth/google/callback'],
  ]) {
    const result = f.run(...extra);
    assert.notEqual(result.status, 0);
    f.assertUnchanged(result);
  }
});
