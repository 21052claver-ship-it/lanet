import { chromium, firefox, webkit } from 'playwright';
import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { browserFixture } from '../tests/helpers/browser-fixture.mjs';
const out = process.env.LANET_TEST_OUTPUT || 'output/mobile-navigation';
mkdirSync(out, { recursive: true });
const results = [];
for (const [engine, launcher] of Object.entries({ chromium, firefox, webkit })) {
  const f = await browserFixture(),
    browser = await launcher.launch({ headless: true });
  try {
    for (const size of [
      { width: 320, height: 568 },
      { width: 390, height: 844 },
      { width: 844, height: 390 },
    ]) {
      const c = await browser.newContext({
        viewport: size,
        hasTouch: true,
        reducedMotion: 'reduce',
      });
      await c.route('**/*', (r) =>
        new URL(r.request().url()).origin === f.base ? r.continue() : r.abort(),
      );
      await c.addCookies([{ name: 'lanet_session', value: f.token, url: f.base }]);
      const p = await c.newPage();
      const errors = [];
      p.on('pageerror', (e) => errors.push(e.message));
      try {
        await p.goto(f.base + '/#schedule');
        await p.locator('.page-title h1').waitFor();
        const more = p.getByRole('button', { name: 'Més seccions', exact: true }),
          dialog = p.getByRole('dialog', { name: 'Menú principal' });
        await more.click();
        await dialog.waitFor();
        assert.equal(await more.getAttribute('aria-expanded'), 'true');
        assert.equal(await p.locator('.sidebar').getAttribute('aria-hidden'), 'true');
        assert.equal(await p.evaluate(() => document.body.style.overflow), 'hidden');
        const panel = p.locator('.mobile-more-panel'),
          box = await panel.boundingBox(),
          nav = await p.locator('.bottom-nav').boundingBox();
        assert.ok(
          box.y >= 0 &&
            box.y + box.height <= nav.y &&
            box.x >= 0 &&
            box.x + box.width <= size.width,
        );
        assert.equal(await p.locator('.mobile-more-grid button').count(), 4);
        assert.ok(await p.locator('#main-content').evaluate((el) => el.inert));
        await panel.screenshot({ path: `${out}/${engine}-${size.width}-panel.png` });
        await p.screenshot({ path: `${out}/${engine}-${size.width}.png` });
        await more.click();
        await dialog.waitFor({ state: 'hidden' });
        assert.equal(await more.getAttribute('aria-expanded'), 'false');
        assert.ok(await more.evaluate((el) => el === document.activeElement));
        await more.click();
        await p.keyboard.press('Escape');
        await dialog.waitFor({ state: 'hidden' });
        assert.ok(await more.evaluate((el) => el === document.activeElement));
        await more.click();
        await p
          .getByRole('button', { name: 'Tancar menú', exact: true })
          .filter({ visible: true })
          .last()
          .click();
        await dialog.waitFor({ state: 'hidden' });
        await more.click();
        await p.locator('.mobile-scrim').click({ position: { x: 5, y: 5 } });
        await dialog.waitFor({ state: 'hidden' });
        await more.click();
        await dialog.getByRole('button', { name: 'Comunitat', exact: true }).click();
        await dialog.waitFor({ state: 'hidden' });
        await p.waitForURL('**/#community');
        assert.equal(await p.evaluate(() => document.body.style.overflow), '');
        await more.click();
        assert.equal(
          await dialog
            .getByRole('button', { name: 'Comunitat', exact: true })
            .getAttribute('aria-current'),
          'page',
        );
        await more.focus();
        await p.keyboard.press('Tab');
        assert.ok(
          await p
            .getByRole('button', { name: 'Tancar menú', exact: true })
            .filter({ visible: true })
            .last()
            .evaluate((el) => el === document.activeElement),
        );
        await dialog.getByRole('button', { name: 'Configurar perfil', exact: true }).click();
        await p.getByRole('dialog', { name: 'El meu perfil' }).waitFor();
        assert.equal(await panel.count(), 0);
        await p.keyboard.press('Escape');
        await more.click();
        await p.setViewportSize({ width: 1280, height: 900 });
        await p.waitForFunction(
          () => document.querySelector('.app-shell').dataset.compact === 'false',
        );
        assert.equal(await panel.count(), 0);
        assert.notEqual(await p.evaluate(() => document.body.style.overflow), 'hidden');
        await p.setViewportSize(size);
        await p.waitForFunction(
          () => document.querySelector('.app-shell').dataset.compact === 'true',
        );
        assert.equal(await more.getAttribute('aria-expanded'), 'false');
        assert.ok(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
        assert.deepEqual(errors, []);
        results.push({ engine, size, passed: true, checks: 12 });
        console.log(engine, size.width, 'OK');
      } catch (e) {
        results.push({ engine, size, passed: false, error: e.message });
        console.error(engine, size.width, e.message);
        await p.screenshot({ path: `${out}/${engine}-${size.width}-failed.png` });
      } finally {
        await c.close();
        writeFileSync(`${out}/results.json`, JSON.stringify({ localOnly: true, results }, null, 2));
      }
    }
  } finally {
    await browser.close();
    await f.close();
  }
}
if (results.some((r) => !r.passed)) process.exitCode = 1;
