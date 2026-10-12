import { chromium, firefox, webkit } from 'playwright';
import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { browserFixture } from '../tests/helpers/browser-fixture.mjs';

const out = process.env.LANET_TEST_OUTPUT || 'output/abuse/browser';
mkdirSync(out, { recursive: true });
const results = [];
const engines = { chromium, firefox, webkit };
for (const engine of (process.env.LANET_BROWSER_ENGINES || 'chromium,firefox,webkit').split(',')) {
  const browser = await engines[engine].launch({ headless: true });
  for (const scenario of ['duplicate', 'pause-recovery']) {
    const fixture = await browserFixture();
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
      reducedMotion: 'reduce',
    });
    await context.route('**/*', (route) =>
      new URL(route.request().url()).origin === fixture.base ? route.continue() : route.abort(),
    );
    await context.addCookies([{ name: 'lanet_session', value: fixture.token, url: fixture.base }]);
    const page = await context.newPage();
    page.setDefaultTimeout(10000);
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    const value = { title: 'Idea local antiabús', body: 'Més espais per repassar.', files: [] };
    try {
      await page.goto(fixture.base + '/#community');
      await page.getByRole('heading', { name: 'Comunitat', exact: true }).waitFor();
      if (scenario === 'duplicate') {
        assert.equal(
          (await context.request.post(fixture.base + '/api/proposals', { data: value })).status(),
          200,
        );
      } else {
        for (let i = 0; i < 8; i++) {
          assert.equal(
            (
              await context.request.post(fixture.base + '/api/admin/users', {
                data: { id: 'browser', disabled: true },
              })
            ).status(),
            403,
          );
        }
      }
      await page.getByRole('tab', { name: 'Propostes', exact: true }).click();
      await page.getByRole('button', { name: 'Proposa una idea', exact: true }).click();
      const dialog = page.getByRole('dialog');
      await dialog.getByRole('textbox', { name: 'La teva idea' }).fill(value.title);
      await dialog.getByRole('textbox', { name: 'Com ajudaria?' }).fill(value.body);
      await dialog.getByRole('button', { name: 'Publicar la idea', exact: true }).click();
      await dialog
        .getByRole('alert')
        .filter({
          hasText: scenario === 'duplicate' ? 'Ja has enviat' : 'Les accions estan en pausa',
        })
        .waitFor();
      assert.equal(
        await dialog.getByRole('textbox', { name: 'La teva idea' }).inputValue(),
        value.title,
      );
      assert.equal(
        await dialog.getByRole('textbox', { name: 'Com ajudaria?' }).inputValue(),
        value.body,
      );
      assert.equal((await context.request.get(fixture.base + '/api/bootstrap')).status(), 200);
      if (scenario === 'pause-recovery') {
        // Local fixture clock boundary only: prove the same form recovers after expiry.
        fixture.db.prepare("UPDATE rate_limits SET expires=0 WHERE key LIKE 'abuse:block:%'").run();
        await dialog.getByRole('button', { name: 'Publicar la idea', exact: true }).click();
        await dialog.waitFor({ state: 'hidden' });
        await page.getByRole('heading', { name: value.title, exact: true }).waitFor();
      }
      assert.equal(
        fixture.db.prepare('SELECT COUNT(*) n FROM proposals WHERE title=?').get(value.title).n,
        1,
      );
      assert.equal(
        (await context.request.post(fixture.base + '/api/auth/logout', { data: {} })).status(),
        200,
      );
      assert.deepEqual(errors, []);
      results.push({ engine, scenario, passed: true });
      console.log(`✓ ${engine}: ${scenario}`);
    } catch (e) {
      results.push({ engine, scenario, passed: false, error: e.message });
      await page.screenshot({ path: `${out}/${engine}-${scenario}-failure.png`, fullPage: true });
      throw e;
    } finally {
      writeFileSync(`${out}/results.json`, JSON.stringify({ results }, null, 2));
      await context.close();
      await fixture.close();
    }
  }
  await browser.close();
}
console.log(`${results.length} anti-abuse UX scenarios verified.`);
