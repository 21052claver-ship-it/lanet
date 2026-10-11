import { chromium, firefox, webkit } from 'playwright';
import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { browserFixture } from '../tests/helpers/browser-fixture.mjs';
import { pngFixture, webpFixture } from '../tests/helpers/media-fixtures.js';
const out = process.env.LANET_TEST_OUTPUT || 'output/fast-uploads';
mkdirSync(out, { recursive: true });
const results = [];
for (const [engine, type] of Object.entries({ chromium, firefox, webkit })) {
  const browser = await type.launch({ headless: true });
  for (const scenario of [
    'parallel-six',
    'partial-failure-retry',
    'note-confirmation-before-sync',
    'banner-confirmation-before-sync',
  ]) {
    let active = 0,
      maximum = 0,
      calls = 0,
      release;
    const fixture = await browserFixture({
      mediaSafety: {
        async fetch() {
          const n = ++calls;
          active++;
          maximum = Math.max(maximum, active);
          await new Promise((r) => setTimeout(r, 250));
          active--;
          if (scenario === 'partial-failure-retry' && n === 2)
            return Response.json(
              { error: 'Imatge rebutjada pel filtre.', code: 'image_blocked' },
              { status: 422 },
            );
          return new Response(webpFixture, {
            headers: { 'Content-Type': 'image/webp', 'X-LaNet-Safety': 'lanet-image-v1' },
          });
        },
      },
    });
    const width = scenario === 'parallel-six' ? 1440 : 390;
    const context = await browser.newContext({
      viewport: { width, height: 900 },
      reducedMotion: 'reduce',
    });
    await context.route('**/*', (r) =>
      new URL(r.request().url()).origin === fixture.base || r.request().url().startsWith('blob:')
        ? r.continue()
        : r.abort(),
    );
    await context.addCookies([{ name: 'lanet_session', value: fixture.token, url: fixture.base }]);
    const page = await context.newPage();
    page.setDefaultTimeout(12000);
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    try {
      await page.goto(fixture.base + '/#notes');
      if (scenario === 'banner-confirmation-before-sync') {
        await page.locator('.board-trigger').first().click();
        await page.getByRole('button', { name: 'Proposa un missatge', exact: true }).click();
      } else await page.getByRole('button', { name: 'Comparteix un apunt', exact: true }).click();
      const dialog = page.getByRole('dialog');
      if (scenario === 'parallel-six' || scenario === 'partial-failure-retry') {
        const count = scenario === 'parallel-six' ? 6 : 3;
        await dialog.locator('input[type=file]').setInputFiles(
          Array.from({ length: count }, (_, i) => ({
            name: `foto-${i + 1}.png`,
            mimeType: 'image/png',
            buffer: pngFixture(),
          })),
        );
        await dialog.getByText(`Pujant i comprovant 0/${count}…`, { exact: true }).waitFor();
        await page.waitForFunction(
          () => !document.querySelector('.attachment-editor input[type=file]').disabled,
        );
        assert.equal(maximum, 3);
        assert.equal(calls, count);
        assert.equal(
          await dialog.locator('.attachment-item').count(),
          scenario === 'parallel-six' ? 6 : 2,
        );
        if (scenario === 'partial-failure-retry') {
          await dialog.getByRole('alert').filter({ hasText: 'foto-2.png' }).waitFor();
          assert.equal(
            fixture.db
              .prepare(
                "SELECT count(*) n FROM files WHERE owner_id='browser' AND mime LIKE 'image/%'",
              )
              .get().n,
            2,
          );
          await dialog
            .locator('input[type=file]')
            .setInputFiles({ name: 'foto-2.png', mimeType: 'image/png', buffer: pngFixture() });
          await page.waitForFunction(
            () => !document.querySelector('.attachment-editor input[type=file]').disabled,
          );
          assert.equal(await dialog.locator('.attachment-item').count(), 3);
          assert.equal(await dialog.getByRole('alert').count(), 0);
        } else
          assert.deepEqual(
            await dialog.locator('.attachment-item strong').allTextContents(),
            [1, 2, 3, 4, 5, 6].map((i) => `foto-${i}.webp`),
          );
      } else {
        let held = 0;
        const gate = new Promise((r) => (release = r));
        await page.route('**/api/bootstrap', async (route) => {
          held++;
          await gate;
          await route.continue();
        });
        const title = `Publicacio immediata ${engine}`;
        if (scenario === 'note-confirmation-before-sync') {
          await dialog.getByLabel('Títol', { exact: true }).fill(title);
          await dialog.locator('textarea').first().fill('Contingut de prova local.');
          await dialog.getByRole('button', { name: 'Publicar apunts', exact: true }).click();
        } else {
          await dialog.getByLabel('Missatge principal', { exact: true }).fill(title);
          await dialog.getByRole('button', { name: 'Publicar per 1 pastís', exact: true }).click();
        }
        await dialog.waitFor({ state: 'hidden' });
        const table = scenario === 'note-confirmation-before-sync' ? 'notes' : 'banners';
        assert.equal(
          fixture.db.prepare(`SELECT count(*) n FROM ${table} WHERE title=?`).get(title).n,
          1,
        );
        assert.ok(held > 0, 'The general synchronization should still be held');
        await page.getByRole('button', { name: 'Comparteix un apunt', exact: true }).click();
        const nextDialog = page.getByRole('dialog');
        await nextDialog.waitFor();
        release();
        release = null;
        if (table === 'notes')
          await page
            .getByRole('button', { name: `Obrir ${title}`, exact: true, includeHidden: true })
            .waitFor();
        else await page.locator('.board-trigger').filter({ hasText: title }).waitFor();
        assert.equal(
          await nextDialog.isVisible(),
          true,
          'Completing previous synchronization must not close a new dialog',
        );
      }
      assert.deepEqual(errors, []);
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
      await page.screenshot({ path: `${out}/${engine}-${scenario}.png`, fullPage: true });
      results.push({ engine, scenario, width, passed: true, maximumParallelUploads: maximum });
      console.log(`${engine}: ${scenario} OK`);
    } catch (error) {
      results.push({ engine, scenario, width, passed: false, error: error.message });
      console.error(`${engine}: ${scenario} FAILED ${error.stack || error.message}`);
      await page
        .screenshot({ path: `${out}/${engine}-${scenario}-failed.png`, fullPage: true })
        .catch(() => {});
    } finally {
      release?.();
      await context.close();
      await fixture.close();
      writeFileSync(
        `${out}/fast-browser-results.json`,
        JSON.stringify(
          {
            localOnly: true,
            provider: 'isolated deterministic double',
            publicSiteVisited: false,
            physicalDeviceTested: false,
            results,
          },
          null,
          2,
        ) + '\n',
      );
    }
  }
  await browser.close();
}
assert.equal(results.length, 12);
assert.ok(results.every((r) => r.passed));
console.log('12 fast upload and publication scenarios passed.');
