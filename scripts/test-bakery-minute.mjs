import { chromium, firefox, webkit } from 'playwright';
import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { browserFixture } from '../tests/helpers/browser-fixture.mjs';
import { madridDay } from '../shared/domain.js';
const out = process.env.LANET_TEST_OUTPUT || 'output/bakery-minute';
mkdirSync(out, { recursive: true });
const results = [];
const policy = { mode: 'test', intervalSeconds: 60, campaign: 'test-2026-10-11-minute-v1' };
for (const [engine, type] of Object.entries({ chromium, firefox, webkit })) {
  const browser = await type.launch({ headless: true });
  for (const scenario of [
    'daily-unchanged',
    'reset-and-minute-without-reload',
    'concurrent-api-and-server-clock',
    'confirmed-claim-refresh-failure',
  ]) {
    const fixture = await browserFixture();
    const width = scenario === 'concurrent-api-and-server-clock' ? 1440 : 390;
    const context = await browser.newContext({
      viewport: { width, height: 844 },
      reducedMotion: 'reduce',
    });
    await context.route('**/*', (r) =>
      new URL(r.request().url()).origin === fixture.base ? r.continue() : r.abort(),
    );
    await context.addCookies([{ name: 'lanet_session', value: fixture.token, url: fixture.base }]);
    const page = await context.newPage();
    page.setDefaultTimeout(12000);
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    const balance = () =>
      fixture.db.prepare("SELECT balance FROM users WHERE id='browser'").get().balance;
    const baseline = balance();
    const request = async (payload = {}, expected = [200]) => {
      const response = await context.request.post(fixture.base + '/api/bakery/claim', {
        data: payload,
        headers: { Origin: fixture.base },
      });
      assert.ok(expected.includes(response.status()));
      return { ...(await response.json()), _status: response.status() };
    };
    try {
      if (scenario !== 'daily-unchanged') {
        fixture.db
          .prepare("INSERT INTO daily_claims(user_id,day) VALUES('browser',?)")
          .run(madridDay());
        fixture.db
          .prepare("INSERT INTO settings(key,value) VALUES('bakery_reward_policy',?)")
          .run(JSON.stringify(policy));
      }
      if (scenario === 'reset-and-minute-without-reload') await page.clock.install();
      await page.goto(fixture.base + '/#bakery');
      await page.getByRole('heading', { name: 'Pastisseria', exact: true }).waitFor();
      if (scenario === 'daily-unchanged') {
        assert.equal(
          await page.getByText('Mode de prova · Un pastís cada minut.', { exact: true }).count(),
          0,
        );
        await page.getByRole('button', { name: 'Entrar a la pastisseria' }).click();
        await page.getByRole('button', { name: 'Agafa el pastís' }).click();
        await page.getByText('Pastís recollit', { exact: true }).waitFor();
        assert.equal(balance(), baseline + 1);
        await page.reload();
        await page
          .locator('.daily-status-line')
          .filter({ hasText: 'Pastís d’avui recollit' })
          .waitFor();
      } else if (scenario === 'concurrent-api-and-server-clock') {
        const claims = await Promise.all(
          Array.from({ length: 12 }, () =>
            request({ now: Date.now() + 9999999, intervalSeconds: 0, amount: 999 }, [200, 429]),
          ),
        );
        assert.equal(claims.filter((r) => r.claimed).length, 1);
        assert.ok(claims.some((r) => r._status === 429));
        assert.ok(claims.filter((r) => r._status === 429).every((r) => r.code === 'rate_limited'));
        assert.equal(balance(), baseline + 2);
        const again = await request({ now: Date.now() + 9999999 }, [429]);
        assert.equal(again.code, 'rate_limited');
        assert.equal(balance(), baseline + 2);
        assert.equal(
          fixture.db
            .prepare("SELECT count(*) n FROM bakery_test_claims WHERE user_id='browser'")
            .get().n,
          1,
        );
        const anonymous = await browser.newContext();
        const denied = await anonymous.request.post(fixture.base + '/api/bakery/claim', {
          data: {},
          headers: { Origin: fixture.base },
        });
        assert.equal(denied.status(), 401);
        await anonymous.close();
      } else {
        await page.getByText('Mode de prova · Un pastís cada minut.', { exact: true }).waitFor();
        await page.getByRole('button', { name: 'Entrar a la pastisseria' }).click();
        if (scenario === 'confirmed-claim-refresh-failure') {
          await page.route('**/api/bootstrap', (r) => r.abort());
        }
        await page.getByRole('button', { name: 'Agafa el pastís' }).click();
        await page.locator('.baker-claimed').filter({ hasText: 'Nou pastís en' }).waitFor();
        assert.equal(balance(), baseline + 2);
        assert.equal(await page.getByRole('button', { name: 'Agafa el pastís' }).count(), 0);
        assert.match(
          await page.locator('.daily-status-line').innerText(),
          /El següent, en 0[01]:\d\d/,
        );
        assert.equal(
          fixture.db.prepare("SELECT count(*) n FROM daily_claims WHERE user_id='browser'").get().n,
          1,
        );
        if (scenario === 'reset-and-minute-without-reload') {
          fixture.db
            .prepare(
              "UPDATE bakery_test_claims SET claimed_at=claimed_at-60000 WHERE user_id='browser'",
            )
            .run();
          await page.clock.fastForward(61000);
          await page.getByRole('button', { name: 'Agafa el pastís' }).click();
          await page.locator('.baker-claimed').filter({ hasText: 'Nou pastís en' }).waitFor();
          assert.equal(balance(), baseline + 3);
          await page.getByRole('button', { name: 'Aixecar la catifa de la pastisseria' }).click();
          await page.getByRole('heading', { name: 'La sala secreta', exact: true }).waitFor();
          await page.getByRole('button', { name: 'Tornar al forn', exact: true }).click();
        }
      }
      assert.deepEqual(errors, []);
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
      await page.screenshot({ path: `${out}/${engine}-${scenario}.png`, fullPage: true });
      results.push({ engine, scenario, width, passed: true });
      console.log(`${engine}: ${scenario} OK`);
    } catch (error) {
      results.push({ engine, scenario, width, passed: false, error: error.message });
      await page
        .screenshot({ path: `${out}/${engine}-${scenario}-failed.png`, fullPage: true })
        .catch(() => {});
      console.error(`${engine}: ${scenario} FAILED ${error.stack || error.message}`);
    } finally {
      await context.close();
      await fixture.close();
      writeFileSync(
        `${out}/browser-results.json`,
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
assert.equal(results.length, 12);
assert.ok(results.every((r) => r.passed));
console.log('12 bakery reward browser scenarios passed.');
