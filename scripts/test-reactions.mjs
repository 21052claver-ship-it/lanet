import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { chromium, firefox, webkit } from 'playwright';
import { browserFixture } from '../tests/helpers/browser-fixture.mjs';
import { addDays, madridDay } from '../shared/domain.js';
const out = process.env.LANET_TEST_OUTPUT || 'output/reactions/browser';
mkdirSync(out, { recursive: true });
const results = [];
function gate() {
  let release;
  const promise = new Promise((yes) => {
    release = yes;
  });
  return { promise, release };
}
async function state(button, pressed, busy) {
  assert.equal(await button.getAttribute('aria-pressed'), String(pressed));
  assert.equal(await button.getAttribute('aria-busy'), String(busy));
  assert.equal(await button.isDisabled(), busy);
}
async function settled(page, selector) {
  await page.waitForFunction(
    (s) => document.querySelector(s)?.getAttribute('aria-busy') === 'false',
    selector,
  );
}
for (const [engine, launcher] of Object.entries({ chromium, firefox, webkit })) {
  if (
    process.env.LANET_BROWSER_ENGINES &&
    !process.env.LANET_BROWSER_ENGINES.split(',').includes(engine)
  )
    continue;
  const browser = await launcher.launch();
  try {
    for (const width of [390, 1440]) {
      async function check(name, run) {
        const f = await browserFixture(),
          held = [];
        f.db
          .prepare("UPDATE pluses SET date=? WHERE id='browser-plus'")
          .run(addDays(madridDay(), 1));
        const context = await browser.newContext({
          viewport: { width, height: 1000 },
          hasTouch: width < 760,
          reducedMotion: 'reduce',
        });
        await context.route('**/*', (route) =>
          new URL(route.request().url()).origin === f.base ? route.continue() : route.abort(),
        );
        await context.addCookies([{ name: 'lanet_session', value: f.token, url: f.base }]);
        const page = await context.newPage(),
          errors = [];
        page.on('pageerror', (error) => errors.push(error.message));
        const hold = () => {
          const value = gate();
          held.push(value);
          return value;
        };
        try {
          await page.goto(f.base + '/#notes');
          await page.locator('.note-card').waitFor();
          await run(page, f, hold);
          assert.deepEqual(errors, []);
          assert.ok(
            await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1),
          );
          results.push({ engine, width, name, passed: true });
          console.log(`${engine}-${width}: ${name} OK`);
        } catch (error) {
          results.push({ engine, width, name, passed: false, error: error.message });
          await page.screenshot({
            path: `${out}/${engine}-${width}-${name}-failed.png`,
            fullPage: true,
          });
          throw error;
        } finally {
          held.forEach((value) => value.release());
          writeFileSync(
            out + '/results.json',
            JSON.stringify(
              { localOnly: true, publicSiteVisited: false, realDevicesTested: false, results },
              null,
              2,
            ) + '\n',
          );
          await context.close();
          await f.close();
        }
      }
      await check('instant-shared-canonical', async (page, f, hold) => {
        const started = hold(),
          finish = hold(),
          readStarted = hold(),
          finishRead = hold();
        let writes = 0;
        await page.route(f.base + '/api/notes/browser-note/like', async (route) => {
          writes++;
          started.release();
          await finish.promise;
          await route.continue();
        });
        const button = page.locator('.note-card .like-button');
        const original = await button.evaluate((el) => getComputedStyle(el).backgroundColor);
        await button.click();
        await started.promise;
        await state(button, true, true);
        assert.match(await button.innerText(), /T’agrada.*1/s);
        await button.evaluate((el) => el.click());
        assert.equal(writes, 1);
        assert.equal(await button.evaluate((el) => getComputedStyle(el).opacity), '1');
        await page.route(f.base + '/api/bootstrap', async (route) => {
          const response = await route.fetch();
          readStarted.release();
          await finishRead.promise;
          await route.fulfill({ response });
        });
        await page.evaluate(() => window.dispatchEvent(new Event('focus')));
        await readStarted.promise;
        await page.getByRole('button', { name: 'Obrir PDF de prova local', exact: true }).click();
        const detail = page.getByRole('dialog').locator('.like-button');
        await detail.waitFor();
        await state(detail, true, true);
        f.db
          .prepare(
            "INSERT INTO users(id,email,name,password_hash,salt) VALUES('other','other@fje.edu','Altra persona fictícia','unusable','fixture')",
          )
          .run();
        f.db
          .prepare(
            "INSERT INTO likes(user_id,type,target_id,active) VALUES('other','note','browser-note',1)",
          )
          .run();
        finish.release();
        await settled(page, '.reader .like-button');
        await state(detail, true, false);
        assert.match(await detail.innerText(), /2/);
        const staleResponse = page.waitForResponse((r) => r.url().endsWith('/api/bootstrap'));
        finishRead.release();
        await staleResponse;
        await page.getByRole('dialog').getByRole('button', { name: 'Tancar', exact: true }).click();
        await page.getByRole('dialog').waitFor({ state: 'hidden' });
        await state(button, true, false);
        assert.match(await button.innerText(), /2/);
        const selected = await button.evaluate((el) => getComputedStyle(el).backgroundColor);
        assert.notEqual(selected, original);
        if (width > 760) {
          await button.hover();
          assert.notEqual(
            await button.evaluate((el) => getComputedStyle(el).backgroundColor),
            selected,
          );
        }
        await button.focus();
        await page.keyboard.press('Tab');
        await page.keyboard.press('Shift+Tab');
        assert.equal(await button.evaluate((el) => el === document.activeElement), true);
        const box = await button.boundingBox();
        assert.ok(box.height >= 44 && box.width >= 44);
        assert.notEqual(await button.evaluate((el) => getComputedStyle(el).outlineStyle), 'none');
        await page.screenshot({ path: `${out}/${engine}-${width}-liked.png`, fullPage: true });
        await page.unroute(f.base + '/api/bootstrap');
        await page.reload();
        await page.locator('.note-card .liked').waitFor();
        assert.match(await button.innerText(), /2/);
        await button.click();
        await settled(page, '.note-card .like-button');
        await state(button, false, false);
        assert.match(await button.innerText(), /1/);
        assert.equal(writes, 2);
      });
      await check('saved-filter-rollback', async (page, f, hold) => {
        const save = page.locator('.note-card .save-button');
        await save.click();
        await settled(page, '.note-card .save-button');
        await state(save, true, false);
        await page.getByRole('tab', { name: 'Desats', exact: true }).click();
        const started = hold(),
          finish = hold();
        await page.route(f.base + '/api/notes/browser-note/save', async (route) => {
          started.release();
          await finish.promise;
          await route.fulfill({ status: 500, json: { error: 'Error local de prova' } });
        });
        await save.click();
        await started.promise;
        assert.equal(await page.locator('.note-card').count(), 0);
        finish.release();
        await page.locator('.note-card').waitFor();
        await state(save, true, false);
        await page.getByRole('alert').filter({ hasText: 'Error local' }).waitFor();
        assert.equal(
          f.db
            .prepare(
              "SELECT COUNT(*) AS n FROM saves WHERE user_id='browser' AND target_id='browser-note'",
            )
            .get().n,
          1,
        );
        await page.screenshot({ path: `${out}/${engine}-${width}-saved.png`, fullPage: true });
      });
      await check('parallel-lost-response', async (page, f, hold) => {
        await page.goto(f.base + '/#pluses');
        await page.locator('.plus-card').waitFor();
        const started = hold(),
          finish = hold(),
          saveStarted = hold(),
          saveFinish = hold(),
          lost = hold();
        let writes = 0;
        await page.route(f.base + '/api/pluses/browser-plus/like', async (route) => {
          writes++;
          started.release();
          await finish.promise;
          await route.fetch();
          await route.abort();
          lost.release();
        });
        await page.route(f.base + '/api/pluses/browser-plus/save', async (route) => {
          saveStarted.release();
          await saveFinish.promise;
          await route.continue();
        });
        const like = page.locator('.plus-card .like-button'),
          save = page.locator('.plus-card .save-button');
        await like.click();
        await started.promise;
        await state(like, true, true);
        await save.click();
        await saveStarted.promise;
        await state(save, true, true);
        finish.release();
        await lost.promise;
        await settled(page, '.plus-card .like-button');
        await state(save, true, true);
        const read = page.waitForResponse((response) => response.url().endsWith('/api/bootstrap'));
        saveFinish.release();
        await read;
        await settled(page, '.plus-card .save-button');
        await page.waitForFunction(
          () =>
            document.querySelector('.plus-card .like-button')?.getAttribute('aria-pressed') ===
            'true',
        );
        await state(like, true, false);
        await state(save, true, false);
        assert.equal(writes, 1);
        assert.equal(
          f.db
            .prepare(
              "SELECT COUNT(*) AS n FROM likes WHERE type='plus' AND target_id='browser-plus' AND active=1",
            )
            .get().n,
          1,
        );
        await page.getByRole('button', { name: 'Veure plus', exact: true }).click();
        await state(page.getByRole('dialog').locator('.like-button'), true, false);
        await state(page.getByRole('dialog').locator('.save-button'), true, false);
      });
      await check('vote-across-views', async (page, f, hold) => {
        await page.goto(f.base + '/#community');
        await page.locator('.proposal-summary').waitFor();
        const started = hold(),
          finish = hold();
        let writes = 0;
        await page.route(f.base + '/api/proposals/browser-proposal/vote', async (route) => {
          writes++;
          started.release();
          await finish.promise;
          await route.continue();
        });
        await page.locator('.proposal-summary .vote-button').click();
        await started.promise;
        await state(page.locator('.proposal-summary .vote-button'), true, true);
        await page.getByRole('tab', { name: 'Propostes', exact: true }).click();
        const button = page.locator('.proposal-row .vote-button');
        await button.waitFor();
        await state(button, true, true);
        assert.equal(await button.locator('strong').innerText(), '1');
        await button.evaluate((el) => el.click());
        assert.equal(writes, 1);
        finish.release();
        await settled(page, '.proposal-row .vote-button');
        await state(button, true, false);
        assert.equal(await button.locator('.reaction-check').count(), 1);
        await page.screenshot({ path: `${out}/${engine}-${width}-voted.png`, fullPage: true });
        await page.reload();
        await page.getByRole('tab', { name: 'Propostes', exact: true }).click();
        await page.locator('.proposal-row .vote-button.voted').waitFor();
        await state(button, true, false);
        await button.click();
        await settled(page, '.proposal-row .vote-button');
        await state(button, false, false);
        assert.equal(await button.locator('strong').innerText(), '0');
        assert.equal(writes, 2);
      });
    }
  } finally {
    await browser.close();
  }
}
console.log(`${results.length} local reaction scenarios verified.`);
