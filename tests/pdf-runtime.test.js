import test from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { Miniflare, convertV4MiniflareOptions } from 'miniflare';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { PDFDocument, PDFName } from 'pdf-lib';
import { webpFixture } from './helpers/media-fixtures.js';
import { PDF_SAFETY_POLICY } from '../worker/pdf-safety.js';

test('PDF: production entry renders and moderates in workerd using a precompiled Wasm module', async (t) => {
  const root = fileURLToPath(new URL('../', import.meta.url));
  const bundle = await build({
    stdin: {
      resolveDir: root,
      contents: `
        import entry from './worker/media-entry.js';
        import { Buffer } from 'node:buffer';
        export default { async fetch(request, _, ctx) {
          let calls = 0;
          const blocked = request.headers.get('X-Fixture-Verdict');
          const env = {
            SAFETY_CACHE: { async match() {return null;}, async put() {} },
            IMAGES: {
              async info() { return {format:'image/png',width:400,height:500}; },
              input() { return { transform() {return this;}, async output() {
                return { response: () => new Response(Buffer.from('${webpFixture.toString('base64')}', 'base64')) };
              }}; }
            },
            AI: { async run() {
              calls++;
              return {response: {sexual_content:false,nudity:blocked === 'blocked' && calls === 2,
                graphic_violence:false,uncertain:blocked === 'uncertain'}};
            }}
          };
          const response = await entry.fetch(request, env, ctx);
          response.headers.set('X-Fixture-Calls', String(calls));
          return response;
        }};
      `,
    },
    bundle: true,
    format: 'esm',
    platform: 'browser',
    write: false,
    external: ['node:*'],
    plugins: [
      {
        name: 'precompiled-wasm',
        setup(build) {
          build.onResolve({ filter: /pdfium\.wasm$/ }, () => ({
            path: './pdfium.wasm',
            external: true,
          }));
        },
      },
    ],
  });
  const mf = new Miniflare(
    convertV4MiniflareOptions({
      cf: false,
      modulesRoot: root,
      modules: [
        {
          type: 'ESModule',
          path: resolve(root, 'pdf-runtime.js'),
          contents: bundle.outputFiles[0].text,
        },
        {
          type: 'CompiledWasm',
          path: resolve(root, 'pdfium.wasm'),
          contents: readFileSync(
            createRequire(import.meta.url).resolve('@hyzyla/pdfium/pdfium.wasm'),
          ),
        },
      ],
      compatibilityDate: '2026-10-08',
      compatibilityFlags: ['nodejs_compat'],
      outboundService: () => {
        throw new Error('No network is permitted in this fixture.');
      },
    }),
  );
  t.after(() => mf.dispose());
  const doc = await PDFDocument.create();
  doc.addPage([200, 250]).drawText('Apunts', { x: 20, y: 200 });
  doc.addPage([200, 250]).drawText('Pagina 2', { x: 20, y: 200 });
  const bytes = await doc.save();
  const send = (body, verdict = '') =>
    mf.dispatchFetch('https://media.test/inspect-pdf', {
      method: 'POST',
      headers: { 'Content-Type': 'application/pdf', 'X-Fixture-Verdict': verdict },
      body,
    });
  const approved = await send(bytes);
  assert.equal(approved.status, 200, await approved.clone().text());
  assert.equal(approved.headers.get('X-LaNet-Safety'), PDF_SAFETY_POLICY);
  assert.equal(approved.headers.get('X-Fixture-Calls'), '2');
  assert.equal((await PDFDocument.load(await approved.arrayBuffer())).getPageCount(), 2);
  for (const verdict of ['blocked', 'uncertain']) {
    const response = await send(bytes, verdict);
    assert.equal(response.status, 422);
    assert.equal(response.headers.get('X-LaNet-Safety'), null);
    if (verdict === 'blocked') assert.equal((await response.json()).code, 'image_blocked');
  }
  const forged = await send(Buffer.from('%PDF-1.4\nalert(1)\n%%EOF'));
  assert.equal(forged.status, 400);
  assert.equal(forged.headers.get('X-Fixture-Calls'), '0');
  doc.catalog.set(PDFName.of('OpenAction'), doc.context.obj({ S: 'JavaScript', JS: 'alert(1)' }));
  const active = await send(await doc.save());
  assert.equal(active.status, 400);
  assert.equal(active.headers.get('X-Fixture-Calls'), '0');
});
