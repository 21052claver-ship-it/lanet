import test from 'node:test';
import assert from 'node:assert/strict';
import worker from '../worker/pages-entry.js';
import { validatePagesConfig } from '../scripts/pages-utils.mjs';
import { parse } from 'jsonc-parser';
import { readFileSync } from 'node:fs';

const canonical = 'https://lanet.pages.dev';
test('Pages: canonical frontend and API use the existing application', async () => {
  let assets = 0;
  const env = {
    PUBLIC_ORIGIN: canonical,
    ASSETS: {
      fetch() {
        assets++;
        return new Response('frontend');
      },
    },
  };
  const page = await worker.fetch(new Request(canonical + '/'), env, {});
  assert.equal(await page.text(), 'frontend');
  assert.equal(assets, 1);
  const health = await worker.fetch(new Request(canonical + '/api/health'), env, {});
  assert.deepEqual(await health.json(), { ok: true });
  const protectedResponse = await worker.fetch(new Request(canonical + '/api/bootstrap'), env, {});
  assert.equal(protectedResponse.status, 401);
});
test('Pages: preview APIs cannot access application bindings or OAuth', async () => {
  const env = {
    PUBLIC_ORIGIN: canonical,
    get DB() {
      throw new Error('DB was accessed');
    },
    get ASSETS() {
      throw new Error('Assets were accessed');
    },
  };
  for (const path of ['/api', '/api/auth/google/start', '/api/health', '/api/bootstrap']) {
    const r = await worker.fetch(new Request('https://preview.lanet.pages.dev' + path), env, {});
    assert.equal(r.status, 421);
    assert.equal(r.headers.has('Set-Cookie'), false);
  }
});
test('Pages: preview redirect discards credentials and query parameters', async () => {
  const r = await worker.fetch(
    new Request('https://preview.lanet.pages.dev/path?code=secret&state=private'),
    { PUBLIC_ORIGIN: canonical },
    {},
  );
  assert.equal(r.status, 308);
  assert.equal(r.headers.get('Location'), canonical + '/');
  assert.equal(r.headers.get('Referrer-Policy'), 'no-referrer');
});
test('Pages: invalid canonical configuration fails closed', async () => {
  for (const origin of [
    undefined,
    'http://lanet.pages.dev',
    'https://u:p@lanet.pages.dev',
    canonical + '/?code=secret',
    canonical + '/#fragment',
    canonical + '/other',
  ]) {
    const r = await worker.fetch(new Request(canonical), { PUBLIC_ORIGIN: origin }, {});
    assert.equal(r.status, 503);
  }
});
test('Pages deployment guard keeps original account/data and rejects an alien brand or callback', () => {
  const cfg = parse(readFileSync('wrangler.jsonc', 'utf8'));
  cfg.account_id = JSON.parse(readFileSync('cloudflare-target.json', 'utf8')).account_id;
  const original = parse(readFileSync('wrangler.worker-archive.jsonc', 'utf8'));
  assert.equal(validatePagesConfig(cfg, original), cfg);
  const changes = [
    (c) => {
      c.account_id = '0'.repeat(32);
    },
    (c) => {
      c.vars.PUBLIC_ORIGIN = 'https://lanet.impossible-goals-research.workers.dev';
    },
    (c) => {
      c.vars.GOOGLE_REDIRECT_URI = 'https://other.pages.dev/api/auth/google/callback';
    },
    (c) => {
      c.vars.GUEST_ACCESS = 'true';
    },
    (c) => {
      c.d1_databases[0].database_id = 'different';
    },
    (c) => {
      c.r2_buckets[0].jurisdiction = undefined;
    },
    (c) => {
      c.vars.GOOGLE_CLIENT_SECRET = 'must-not-be-config';
    },
    (c) => {
      c.assets = { directory: 'dist' };
    },
  ];
  for (const change of changes) {
    const c = structuredClone(cfg);
    change(c);
    assert.throws(() => validatePagesConfig(c, original));
  }
});
