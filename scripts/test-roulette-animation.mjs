import { chromium, firefox, webkit } from 'playwright';
import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { browserFixture } from '../tests/helpers/browser-fixture.mjs';
import { roulettePayout } from '../shared/roulette.js';
const out = 'output/roulette-animation';
mkdirSync(out, { recursive: true });
const results = [];
for (const [engine, launcher] of Object.entries({ chromium, firefox, webkit })) {
  if (
    process.env.LANET_BROWSER_ENGINES &&
    !process.env.LANET_BROWSER_ENGINES.split(',').includes(engine)
  )
    continue;
  const browser = await launcher.launch();
  for (const scenario of ['win', 'loss', 'reduced', 'exit', 'exit-award', 'reduce-mid']) {
    const fixture = await browserFixture();
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
      reducedMotion: scenario === 'reduced' ? 'reduce' : 'no-preference',
    });
    await context.addCookies([{ name: 'lanet_session', value: fixture.token, url: fixture.base }]);
    await context.route('**/*', (route) =>
      new URL(route.request().url()).origin === fixture.base ? route.continue() : route.abort(),
    );
    // Seed a deterministic, valid settlement in this isolated DB; the actual API
    // returns its idempotent replay. No production random source is replaced.
    await context.route('**/api/roulette', async (route) => {
      if (route.request().method() === 'POST') {
        const bet = route.request().postDataJSON();
        const result = scenario === 'loss' ? 2 : 1;
        fixture.db
          .prepare(
            "INSERT INTO roulette_spins(id,user_id,request_id,stake,kind,number,result,payout,day) VALUES(?,'browser',?,?,?,?,?,?,?)",
          )
          .run(
            bet.request_id,
            bet.request_id,
            bet.stake,
            bet.kind,
            bet.number,
            result,
            roulettePayout(bet, result),
            '2026-10-12',
          );
      }
      await route.continue();
    });
    const page = await context.newPage();
    page.setDefaultTimeout(15000);
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    try {
      await page.goto(fixture.base + '/#bakery');
      await page.getByRole('button', { name: 'Entrar a la pastisseria', exact: true }).click();
      await page
        .getByRole('button', { name: 'Aixecar la catifa de la pastisseria', exact: true })
        .click();
      await page.waitForFunction(
        () =>
          !document.querySelector('.casino-bet-controls')?.disabled &&
          !!document.querySelector('.casino-bet-controls'),
      );
      await page.getByRole('button', { name: 'Aposta ràpida', exact: true }).click();
      await page.getByRole('button', { name: 'Fer girar la ruleta', exact: true }).click();
      const balance = () => page.locator('.cake-balance strong').textContent();
      if (scenario !== 'reduced') {
        await page.locator('.roulette-device.is-spinning').waitFor();
        assert.equal(await balance(), '4', 'only stake debit is visible during spin');
        assert.equal(
          await page.locator('.roulette-history li').count(),
          0,
          'history does not leak result',
        );
        await page.evaluate(() => window.dispatchEvent(new Event('focus')));
        await page.waitForTimeout(350);
        assert.equal(await balance(), '4', 'bootstrap cannot reveal pending prize');
        const before = await page
          .locator('.roulette-ball-orbit')
          .evaluate((e) => e.style.transform);
        await page.waitForTimeout(120);
        assert.notEqual(
          await page.locator('.roulette-ball-orbit').evaluate((e) => e.style.transform),
          before,
        );
        if (scenario === 'reduce-mid') await page.emulateMedia({ reducedMotion: 'reduce' });
        if (scenario === 'exit-award') await page.locator('.roulette-award.is-profit').waitFor();
        if (scenario === 'exit' || scenario === 'exit-award') {
          await page.getByRole('button', { name: 'Tornar al forn', exact: true }).click();
          await page.waitForFunction(
            () => document.querySelector('.cake-balance strong')?.textContent === '6',
          );
          assert.deepEqual(errors, []);
          assert.equal(
            await balance(),
            '6',
            'leaving releases display hold without losing settlement',
          );
          assert.equal(fixture.db.prepare('SELECT COUNT(*) n FROM roulette_spins').get().n, 1);
          results.push({ engine, scenario, passed: true });
          continue;
        }
        if (scenario === 'win') {
          await page.locator('.roulette-award.is-profit').waitFor();
          assert.ok(
            await page.evaluate(
              () =>
                Number(getComputedStyle(document.querySelector('.roulette-award')).zIndex) >
                Number(getComputedStyle(document.querySelector('.casino-room')).zIndex),
            ),
            'Prize celebration appears above the room',
          );
          assert.equal(await balance(), '4', 'prize held while cakes fly');
          assert.equal(await page.locator('.roulette-prize-flight').count(), 2);
          await page.screenshot({ path: `${out}/${engine}-win.png` });
          await page.waitForTimeout(1200);
          assert.equal(await balance(), '4', 'cakes in flight have not been credited visually');
          await page
            .getByRole('button', { name: 'Lliurant pastissos…', exact: true })
            .isDisabled()
            .then((v) => assert.ok(v));
        }
      }
      await page.locator('.roulette-result.has-result').waitFor();
      assert.equal(await balance(), scenario === 'loss' ? '4' : '6');
      assert.equal(await page.locator('.roulette-award').count(), 0);
      assert.equal(
        await page.locator('.roulette-device').getAttribute('data-result'),
        scenario === 'loss' ? '2' : '1',
      );
      assert.equal(fixture.db.prepare('SELECT COUNT(*) n FROM roulette_spins').get().n, 1);
      assert.equal(
        fixture.db.prepare("SELECT balance FROM users WHERE id='browser'").get().balance,
        scenario === 'loss' ? 4 : 6,
      );
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
      assert.deepEqual(errors, []);
      results.push({ engine, scenario, passed: true });
      console.log(`✓ ${engine}: ${scenario}`);
    } catch (error) {
      await page.screenshot({ path: `${out}/${engine}-${scenario}-failure.png`, fullPage: true });
      throw error;
    } finally {
      await context.close();
      await fixture.close();
    }
  }
  await browser.close();
}
writeFileSync(
  `${out}/results.json`,
  JSON.stringify({ localOnly: true, publicSiteVisited: false, results }, null, 2) + '\n',
);
