import { chromium, firefox, webkit } from 'playwright';
import { browserFixture } from '../tests/helpers/browser-fixture.mjs';
import { mkdirSync, writeFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import { BETS_BY_ID, roulettePayout, ticketStake } from '../shared/roulette.js';
const out = 'output/roulette-panorama';
mkdirSync(out, { recursive: true });
const results = [];
for (const [engine, launcher] of Object.entries({ chromium, firefox, webkit })) {
  if (
    process.env.LANET_BROWSER_ENGINES &&
    !process.env.LANET_BROWSER_ENGINES.split(',').includes(engine)
  )
    continue;
  const browser = await launcher.launch();
  const f = await browserFixture();
  f.db.exec(
    "INSERT INTO ledger(id,user_id,amount,reason,ref,day) VALUES('panorama-fund','browser',995,'Local fixture','panorama-fund','2026-10-13')",
  );
  for (const [width, height] of [
    [1280, 720],
    [1366, 768],
    [1920, 1080],
    [320, 812],
    [390, 844],
  ]) {
    const context = await browser.newContext({
      viewport: { width, height },
      reducedMotion: 'reduce',
    });
    await context.route('**/*', (r) =>
      new URL(r.request().url()).origin === f.base ? r.continue() : r.abort(),
    );
    let fixedResult = 0;
    await context.route('**/api/roulette', async (route) => {
      if (route.request().method() === 'POST') {
        const bet = route.request().postDataJSON();
        f.db
          .prepare(
            "INSERT INTO roulette_tickets(id,user_id,request_id,bets,stake,result,payout,day) VALUES(?,'browser',?,?,?,?,?,?)",
          )
          .run(
            bet.request_id,
            bet.request_id,
            JSON.stringify(bet.bets),
            ticketStake(bet),
            fixedResult,
            roulettePayout(bet, fixedResult),
            '2026-10-13',
          );
      }
      await route.continue();
    });
    await context.addCookies([{ name: 'lanet_session', value: f.token, url: f.base }]);
    const p = await context.newPage();
    p.setDefaultTimeout(12000);
    try {
      await p.goto(f.base + '/#bakery');
      await p.getByRole('button', { name: 'Entrar a la pastisseria', exact: true }).click();
      await p
        .getByRole('button', { name: 'Aixecar la catifa de la pastisseria', exact: true })
        .click();
      await p.waitForFunction(
        () =>
          document.querySelector('.casino-bet-controls') &&
          !document.querySelector('.casino-bet-controls').disabled,
      );
      await p.getByRole('dialog').waitFor();
      const room = await p.locator('.casino-room').boundingBox();
      const main = await p.locator('main').boundingBox();
      assert.ok(
        room &&
          main &&
          room.x >= main.x &&
          room.width < width &&
          room.y > 0 &&
          room.x + room.width <= main.x + main.width + 1,
        `Room stays inside workspace ${width}x${height}: ${JSON.stringify(room)}`,
      );
      assert.equal(
        await p.locator('.casino-room').evaluate((e) => getComputedStyle(e).position),
        'relative',
        'Room follows page flow instead of taking over the viewport',
      );
      assert.equal(await p.locator('.casino-backdrop').count(), 0, 'No fullscreen backdrop');
      assert.ok(await p.locator('.topbar').isVisible(), 'Topbar remains visible');
      assert.equal(await p.locator('.topbar').getAttribute('aria-hidden'), null);
      assert.equal(await p.locator('.casino-room').getAttribute('aria-modal'), null);
      for (const selector of [
        '.casino-sound-toggle',
        '.casino-header-actions > button:last-child',
      ]) {
        const button = await p.locator(selector).boundingBox();
        assert.ok(
          button && button.x >= room.x && button.x + button.width <= room.x + room.width + 1,
          `Header control remains inside room at ${width}px: ${selector}`,
        );
      }
      await p.screenshot({ path: `${out}/${engine}-${width}-entry.png` });
      if (width >= 1200) {
        assert.ok(await p.locator('.sidebar').isVisible(), 'Sidebar remains visible');
        const topbar = await p.locator('.topbar').boundingBox();
        assert.ok(room.y >= topbar.y + topbar.height - 1, 'Room does not cover topbar');
        await p.locator('.sidebar .nav-item').first().click({ trial: true });
        await p.locator('.topbar .profile-button').click({ trial: true });
      }
      if (width >= 1200) {
        for (const selector of [
          '.roulette-device',
          '.casino-host',
          '.tapet-container',
          '.roulette-spin',
          '.tapet-toolbar',
        ]) {
          const b = await p.locator(selector).boundingBox();
          assert.ok(
            b && b.x >= 0 && b.y >= 0 && b.x + b.width <= width + 1 && b.y + b.height <= height + 1,
            `${selector} fits ${width}x${height}: ${JSON.stringify(b)}`,
          );
        }
        assert.ok(
          await p.locator('.casino-room').evaluate((e) => e.scrollHeight <= e.clientHeight + 1),
          'Room has no vertical scroll',
        );
      }
      assert.ok(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
      await p.locator('[data-bet-id^="red:"]').click();
      await p.getByRole('button', { name: 'Fer girar la ruleta', exact: true }).click();
      await p.locator('.roulette-result.has-result').waitFor();
      const number = Number(await p.locator('.roulette-board').getAttribute('data-result'));
      assert.equal(number, 0);
      assert.equal(
        await p.locator('.tapet-outside.is-winning').count(),
        0,
        'Zero does not win outside bets',
      );
      assert.equal(
        await p.locator('.tapet-cell.is-result').getAttribute('data-number'),
        String(number),
      );
      for (const b of await p.locator('.tapet-target.is-winning').all()) {
        assert.ok(BETS_BY_ID[await b.getAttribute('data-bet-id')].numbers.includes(number));
      }
      fixedResult = 17;
      await p.locator('[data-bet-id="split:16-17"]').click();
      await p.locator('[data-bet-id^="red:"]').click();
      await p.getByRole('button', { name: 'Fer girar la ruleta', exact: true }).click();
      await p.locator('.roulette-board[data-result="17"]').waitFor();
      assert.equal(await p.locator('.tapet-cell.is-result').getAttribute('data-number'), '17');
      assert.equal(
        await p.locator('.tapet-zero-number.is-winning').count(),
        0,
        'Old result cleared',
      );
      assert.equal(
        await p.locator('[data-bet-id="split:16-17"].is-winning').count(),
        1,
        'Placed winning split remains marked after settlement',
      );
      const winner = p.locator('[data-bet-id="number:17"]');
      await winner.scrollIntoViewIfNeeded();
      assert.ok(
        await winner.evaluate((e) => {
          const r = e.getBoundingClientRect();
          return e.contains(document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2));
        }),
        'Winning number stays visible above highlight',
      );
      await p.screenshot({ path: `${out}/${engine}-${width}.png` });
      await p
        .getByRole('button', { name: 'Fer girar la ruleta', exact: true })
        .scrollIntoViewIfNeeded();
      if (width >= 1200)
        assert.ok(
          await p.locator('.casino-room').evaluate((e) => e.scrollHeight <= e.clientHeight + 1),
          'Result fits without scroll',
        );
      await p.keyboard.press('Escape');
      await p.getByRole('heading', { name: 'El forn de La Net', exact: true }).waitFor();
      results.push({ engine, width, height, passed: true });
      console.log(`${engine} ${width}x${height} OK`);
    } catch (error) {
      await p.screenshot({ path: `${out}/${engine}-${width}-failed.png` });
      results.push({ engine, width, height, passed: false, error: error.message });
      console.error(error.message);
    } finally {
      await context.close();
      writeFileSync(`${out}/results.json`, JSON.stringify({ localOnly: true, results }, null, 2));
    }
  }
  await browser.close();
  await f.close();
}
if (results.some((r) => !r.passed)) process.exitCode = 1;
