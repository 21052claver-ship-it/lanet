import { chromium, firefox, webkit } from 'playwright';
import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { browserFixture } from '../tests/helpers/browser-fixture.mjs';
import { pngFixture, webpFixture } from '../tests/helpers/media-fixtures.js';
const out = 'output/ad-retention/browser';
mkdirSync(out, { recursive: true });
const results = [];
for (const [engine, type] of Object.entries({ chromium, firefox, webkit })) {
  const browser = await type.launch({ headless: true });
  for (const width of [1440, 390])
    for (const scenario of ['replacement', 'cancel-draft', 'upload-block']) {
      let inspections = 0;
      const fixture = await browserFixture({
        mediaSafety: {
          fetch: async () => {
            inspections++;
            return new Response(webpFixture, {
              headers: { 'Content-Type': 'image/webp', 'X-LaNet-Safety': 'lanet-image-v1' },
            });
          },
        },
      });
      const context = await browser.newContext({
        viewport: { width, height: 900 },
        reducedMotion: 'reduce',
      });
      await context.route('**/*', (r) =>
        new URL(r.request().url()).origin === fixture.base || r.request().url().startsWith('blob:')
          ? r.continue()
          : r.abort(),
      );
      await context.addCookies([
        { name: 'lanet_session', value: fixture.token, url: fixture.base },
      ]);
      const page = await context.newPage();
      page.setDefaultTimeout(12000);
      const errors = [];
      page.on('pageerror', (e) => errors.push(e.message));
      try {
        await page.goto(fixture.base + '/#schedule');
        if (scenario === 'upload-block')
          fixture.db.exec(
            "INSERT INTO upload_guards(user_id,blocked_until) VALUES('browser',unixepoch()+900)",
          );
        await page.locator('.board-trigger').first().click();
        await page.getByRole('button', { name: 'Proposa un missatge', exact: true }).click();
        const dialog = page.getByRole('dialog');
        await dialog.getByRole('button', { name: 'Només imatge', exact: true }).click();
        await dialog
          .locator('input[type=file]')
          .setInputFiles({ name: 'cartell.png', mimeType: 'image/png', buffer: pngFixture() });
        const publish = dialog.getByRole('button', { name: 'Publicar per 1 pastís', exact: true });
        await publish.waitFor();
        await page.waitForFunction(
          () => !document.querySelector('.banner-composer fieldset').disabled,
        );
        if (scenario === 'cancel-draft')
          await context.route('**/api/banner', (r) =>
            r.fulfill({
              status: 409,
              contentType: 'application/json',
              body: JSON.stringify({ error: 'El cartell ha canviat. Revisa l’oferta.' }),
            }),
          );
        await publish.click();
        if (scenario === 'replacement') {
          await dialog.waitFor({ state: 'hidden' });
          assert.equal(inspections, 1);
          const old = fixture.db
            .prepare("SELECT id FROM files WHERE owner_id='browser' AND upload_purpose='banner'")
            .get();
          assert.ok(old);
          await page.locator('.board-trigger').first().click();
          await page.getByRole('button', { name: 'Proposa un missatge', exact: true }).click();
          await dialog.getByLabel('Missatge principal', { exact: true }).fill('Nou anunci net');
          await dialog
            .getByRole('button', { name: 'Publicar per 2 pastissos', exact: true })
            .click();
          await dialog.waitFor({ state: 'hidden' });
          assert.equal(
            (await context.request.get(fixture.base + '/api/files/' + old.id)).status(),
            404,
          );
          assert.equal(fixture.db.prepare('SELECT count(*) n FROM file_deletions').get().n, 0);
          assert.equal(
            fixture.db.prepare("SELECT balance FROM users WHERE id='browser'").get().balance,
            2,
          );
          assert.equal(
            fixture.db.prepare('SELECT file_id FROM banners ORDER BY rowid DESC LIMIT 1').get()
              .file_id,
            null,
          );
        } else if (scenario === 'cancel-draft') {
          await dialog.getByRole('alert').filter({ hasText: 'cartell' }).waitFor();
          assert.equal(inspections, 1);
          assert.equal(
            fixture.db.prepare("SELECT count(*) n FROM files WHERE upload_purpose='banner'").get()
              .n,
            1,
          );
          const discarded = page.waitForResponse(
            (r) => r.request().method() === 'DELETE' && r.url().includes('/api/files/'),
          );
          await dialog.getByRole('button', { name: 'Cancel·lar', exact: true }).click();
          await dialog.waitFor({ state: 'hidden' });
          await discarded;
          assert.equal(
            fixture.db.prepare("SELECT count(*) n FROM files WHERE upload_purpose='banner'").get()
              .n,
            0,
          );
          assert.equal(
            fixture.db.prepare("SELECT balance FROM users WHERE id='browser'").get().balance,
            5,
          );
        } else {
          await dialog.getByRole('alert').filter({ hasText: 'bloquejades temporalment' }).waitFor();
          assert.equal(inspections, 0);
          assert.equal(
            fixture.db.prepare("SELECT count(*) n FROM files WHERE upload_purpose='banner'").get()
              .n,
            0,
          );
          assert.equal(
            fixture.db.prepare("SELECT balance FROM users WHERE id='browser'").get().balance,
            5,
          );
          await page.screenshot({ path: `${out}/${engine}-${width}-block.png` });
          await dialog.getByRole('button', { name: 'Cancel·lar', exact: true }).click();
          await dialog.waitFor({ state: 'hidden' });
          assert.equal((await context.request.get(fixture.base + '/api/bootstrap')).status(), 200);
        }
        assert.deepEqual(errors, []);
        assert.ok(
          await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1),
        );
        results.push({ engine, width, scenario, passed: true });
        console.log(`${engine} ${width} ${scenario}: OK`);
      } catch (e) {
        results.push({ engine, width, scenario, passed: false, error: e.stack || e.message });
        console.error(`${engine} ${width} ${scenario}: ${e.message}`);
        await page
          .screenshot({ path: `${out}/${engine}-${width}-${scenario}-failure.png` })
          .catch(() => {});
      } finally {
        await context.close();
        await fixture.close();
        writeFileSync(
          `${out}/results.json`,
          JSON.stringify(
            { localOnly: true, publicSiteVisited: false, physicalDeviceTested: false, results },
            null,
            2,
          ) + '\n',
        );
      }
    }
  await browser.close();
}
if (results.some((r) => !r.passed)) process.exitCode = 1;
