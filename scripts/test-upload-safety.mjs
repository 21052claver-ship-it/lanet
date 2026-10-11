import { chromium, firefox, webkit } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import { browserFixture } from '../tests/helpers/browser-fixture.mjs';
import { pngFixture, webpFixture } from '../tests/helpers/media-fixtures.js';
const out = process.env.LANET_TEST_OUTPUT || 'output/upload-safety';
mkdirSync(out, { recursive: true });
const results = [];
for (const [name, engine] of Object.entries({ chromium, firefox, webkit })) {
  let mode = 'safe',
    calls = 0;
  const fixture = await browserFixture({
    mediaSafety: {
      async fetch() {
        calls++;
        if (mode === 'offline') throw new Error('Isolated outage');
        if (mode === 'blocked')
          return Response.json(
            { error: 'Aquesta imatge no supera el filtre de contingut.', code: 'image_blocked' },
            { status: 422 },
          );
        return new Response(webpFixture, {
          headers: { 'Content-Type': 'image/webp', 'X-LaNet-Safety': 'lanet-image-v1' },
        });
      },
    },
  });
  const browser = await engine.launch({ headless: true });
  try {
    for (const width of [1440, 390]) {
      const ctx = await browser.newContext({
        viewport: { width, height: 900 },
        reducedMotion: 'reduce',
      });
      await ctx.route('**/*', (r) =>
        new URL(r.request().url()).origin === fixture.base || r.request().url().startsWith('blob:')
          ? r.continue()
          : r.abort(),
      );
      await ctx.addCookies([{ name: 'lanet_session', value: fixture.token, url: fixture.base }]);
      const page = await ctx.newPage();
      page.setDefaultTimeout(10000);
      async function check(label, fn) {
        try {
          await fn();
          results.push({ engine: name, width, label, passed: true });
          console.log(`${name} ${width}: ${label} OK`);
        } catch (e) {
          results.push({ engine: name, width, label, passed: false, error: e.message });
          console.log(`${name} ${width}: ${label} FAILED ${e.message}`);
        }
        writeFileSync(
          `${out}/browser-results.json`,
          JSON.stringify(
            {
              localOnly: true,
              moderationService: 'isolated deterministic double; real provider checked separately',
              results,
            },
            null,
            2,
          ) + '\n',
        );
      }
      await page.goto(fixture.base + '/#notes');
      await page.getByRole('button', { name: 'Comparteix un apunt', exact: true }).click();
      const dialog = page.getByRole('dialog');
      await dialog.getByLabel('Títol', { exact: true }).fill(`Nota segura ${name} ${width}`);
      const input = dialog.locator('input[type=file]');
      await check('Server rejects JS disguised as PNG and preserves the draft', async () => {
        const before = calls;
        await input.setInputFiles({ name: 'atac.js', mimeType: 'image/png', buffer: pngFixture() });
        await dialog.getByRole('alert').filter({ hasText: 'executables' }).waitFor();
        assert.equal(await dialog.locator('.attachment-item').count(), 0);
        assert.equal(calls, before);
        assert.equal(
          await dialog.getByLabel('Títol', { exact: true }).inputValue(),
          `Nota segura ${name} ${width}`,
        );
      });
      await check('Blocked image is neither attached nor stored', async () => {
        mode = 'blocked';
        const count = fixture.db.prepare('SELECT count(*) n FROM files').get().n;
        await input.setInputFiles({
          name: 'imatge.png',
          mimeType: 'image/png',
          buffer: pngFixture(),
        });
        await dialog.getByRole('alert').filter({ hasText: 'filtre' }).waitFor();
        assert.equal(await dialog.locator('.attachment-item').count(), 0);
        assert.equal(fixture.db.prepare('SELECT count(*) n FROM files').get().n, count);
      });
      await check('Provider outage blocks upload and allows retry', async () => {
        mode = 'offline';
        await input.setInputFiles({
          name: 'imatge.png',
          mimeType: 'image/png',
          buffer: pngFixture(),
        });
        await dialog.getByRole('alert').filter({ hasText: 'Torna' }).waitFor();
        assert.equal(await dialog.locator('.attachment-item').count(), 0);
        mode = 'safe';
        await input.setInputFiles({
          name: 'imatge.png',
          mimeType: 'application/javascript',
          buffer: pngFixture(),
        });
        await dialog.getByText('imatge.webp', { exact: true }).waitFor();
        await page.waitForFunction(() => {
          const i = document.querySelector('.attachment-item img');
          return i?.complete && i.naturalWidth > 0;
        });
        assert.equal(await dialog.getByRole('alert').count(), 0);
        await page.screenshot({ path: `${out}/${name}-upload-${width}.png` });
      });
      await check('Approved image publishes and remains readable', async () => {
        await dialog.getByRole('button', { name: 'Publicar apunts', exact: true }).click();
        await dialog.waitFor({ state: 'hidden' });
        await page
          .getByRole('button', { name: `Obrir Nota segura ${name} ${width}`, exact: true })
          .waitFor();
        const entry = fixture.db
          .prepare('SELECT f.* FROM files f JOIN notes n ON n.id=f.note_id WHERE n.title=?')
          .get(`Nota segura ${name} ${width}`);
        assert.equal(entry.safety_state, 'approved');
        assert.equal(entry.mime, 'image/webp');
      });
      await check('Uploaded JavaScript text cannot execute as a script', async () => {
        const file = await page.evaluate(async () => {
          const r = await fetch('/api/files', {
            method: 'POST',
            headers: { 'X-File-Name': 'exemple.txt', 'Content-Type': 'text/javascript' },
            body: 'globalThis.lanetUploadExecuted=true;',
          });
          if (r.status !== 201) throw new Error('Text fixture upload failed');
          return r.json();
        });
        const response = await ctx.request.get(fixture.base + '/api/files/' + file.id);
        assert.equal(response.headers()['x-content-type-options'], 'nosniff');
        assert.match(response.headers()['content-disposition'], /^attachment/);
        const executed = await page.evaluate(async (id) => {
          await new Promise((resolve) => {
            const script = document.createElement('script');
            script.src = '/api/files/' + id;
            script.onload = script.onerror = () => {
              script.remove();
              resolve();
            };
            document.body.append(script);
          });
          return globalThis.lanetUploadExecuted === true;
        }, file.id);
        assert.equal(executed, false);
      });
      await check('Rejected legacy image has a clean accessible placeholder', async () => {
        const key = `blocked-${name}-${width}`;
        fixture.db
          .prepare(
            "INSERT INTO notes(id,author_id,subject_id,title,body,summary) VALUES(?,'browser','math',?,'','')",
          )
          .run(key, key);
        fixture.db
          .prepare(
            "INSERT INTO files(id,owner_id,name,mime,size,object_key,note_id,safety_state) VALUES(?,'browser','imatge.png','image/png',100,?,?,'blocked')",
          )
          .run(key, key, key);
        await page.reload();
        const preview = page.getByRole('button', { name: `Previsualitzar ${key}`, exact: true });
        await preview.locator('.image-unavailable').waitFor();
        assert.match(
          await preview.locator('.image-unavailable').getAttribute('aria-label'),
          /no disponible/,
        );
        assert.ok(
          await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1),
        );
      });
      await ctx.close();
    }
  } finally {
    await browser.close();
    await fixture.close();
  }
}
if (results.some((r) => !r.passed)) process.exitCode = 1;
console.log(
  `${results.filter((r) => r.passed).length}/${results.length} upload browser scenarios passed.`,
);
