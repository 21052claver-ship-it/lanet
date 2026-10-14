import { chromium, firefox, webkit } from 'playwright';
import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { setTimeout as pause } from 'node:timers/promises';
import { browserFixture } from '../tests/helpers/browser-fixture.mjs';
import { adjacentTrackId } from '../shared/music-catalog.js';

const out = process.env.LANET_TEST_OUTPUT || 'output/preferences/browser';
mkdirSync(out, { recursive: true });
const results = [];
const engines = { chromium, firefox, webkit };
async function until(check) {
  const deadline = Date.now() + 10000;
  while (!check()) {
    assert.ok(Date.now() < deadline, 'Local preference writes complete');
    await pause(20);
  }
}
for (const engine of (process.env.LANET_BROWSER_ENGINES || 'chromium,firefox,webkit').split(',')) {
  const browser = await engines[engine].launch();
  for (const width of [390, 1440]) {
    for (const scenario of ['volume-order', 'track-order', 'profile-patch', 'failure-recovery']) {
      const f = await browserFixture();
      const context = await browser.newContext({
        viewport: { width, height: 900 },
        reducedMotion: 'reduce',
      });
      await context.addCookies([{ name: 'lanet_session', value: f.token, url: f.base }]);
      await context.route('**/*', (r) =>
        new URL(r.request().url()).origin === f.base ? r.continue() : r.abort(),
      );
      const p = await context.newPage(),
        errors = [],
        requests = [],
        completed = [];
      p.setDefaultTimeout(12000);
      p.on('pageerror', (error) => errors.push(error.message));
      let release, start;
      const gate = new Promise((resolve) => (release = resolve));
      const started = new Promise((resolve) => (start = resolve));
      await context.route('**/api/preferences', async (route) => {
        const patch = route.request().postDataJSON();
        requests.push(patch);
        const first = requests.length === 1;
        if (first && scenario !== 'profile-patch') {
          start();
          await gate;
        }
        if (first && scenario === 'failure-recovery') {
          completed.push(patch);
          return route.fulfill({
            status: 503,
            json: { error: 'Error local de prova de preferències.' },
          });
        }
        const response = await route.fetch();
        assert.equal(response.status(), 200);
        completed.push(patch);
        await route.fulfill({ response });
      });
      const saved = () =>
        JSON.parse(
          f.db.prepare("SELECT value FROM user_preferences WHERE user_id='browser'").get()?.value ||
            '{}',
        );
      try {
        await p.goto(f.base + '/#study');
        const slider = p.getByRole('slider', { name: 'Volum de l’àudio' });
        await slider.waitFor();
        if (scenario === 'volume-order' || scenario === 'failure-recovery') {
          await slider.press('End');
          await started;
          await slider.press('Home');
          await slider.press('Tab');
          assert.equal(await slider.inputValue(), '0', 'Volume changes immediately');
          assert.equal(requests.length, 1, 'New intent waits for the in-flight write');
          release();
          await until(() => completed.length === 2);
          assert.deepEqual(
            requests,
            [{ volume: 1 }, { volume: 0 }],
            'Blur does not send a duplicate',
          );
          assert.equal(saved().volume, 0);
          await p.waitForLoadState('networkidle');
          await p.reload();
          await slider.waitFor();
          assert.equal(await slider.inputValue(), '0', 'Latest intent survives reload');
        } else if (scenario === 'track-order') {
          const next = p.getByRole('button', { name: 'Cançó següent', exact: true });
          await next.click();
          await started;
          await next.click();
          await next.click();
          const last = adjacentTrackId(adjacentTrackId(adjacentTrackId('window', 1), 1), 1);
          assert.equal(requests.length, 1);
          release();
          await until(() => completed.length === 2);
          assert.equal(requests[1].lofi, last, 'Pending track changes are combined');
          assert.equal(saved().lofi, last);
          const title = await p.locator('.record-now-info h3').innerText();
          // Let confirmed writes finish their bootstrap before navigating away.
          // Cancelling it with reload can surface a WebKit access-control error.
          await p.waitForLoadState('networkidle');
          await p.reload();
          await p.locator('.record-player').waitFor();
          assert.equal(await p.locator('.record-now-info h3').innerText(), title);
        } else {
          await p.getByRole('button', { name: /^Perfil de / }).click();
          const dialog = p.getByRole('dialog');
          await dialog.getByRole('tab', { name: 'Aparença', exact: true }).click();
          // Another tab updates unrelated preferences while this profile is open.
          f.db
            .prepare(
              "INSERT INTO user_preferences(user_id,value) VALUES('browser',?) ON CONFLICT(user_id) DO UPDATE SET value=excluded.value",
            )
            .run(JSON.stringify({ volume: 0.9, hideGrades: true, lofi: 'night' }));
          const density = dialog.getByRole('combobox', {
            name: 'Densitat de la plataforma',
            exact: true,
          });
          await density.press('ArrowDown');
          await density.press('Escape');
          assert.equal(await dialog.isVisible(), true, 'Escape closes only the selector');
          await density.press('ArrowDown');
          await density.press('End');
          await density.press('Enter');
          await dialog.getByRole('button', { name: 'Desar preferències', exact: true }).click();
          await dialog.waitFor({ state: 'hidden' });
          assert.deepEqual(requests, [{ density: 'comfortable' }]);
          assert.deepEqual(saved(), {
            volume: 0.9,
            hideGrades: true,
            lofi: 'night',
            density: 'comfortable',
          });
          const toast = p.getByRole('status').filter({ hasText: 'Preferències actualitzades.' });
          await toast.waitFor();
          if (width < 760) {
            for (const size of [
              { width, height: 900 },
              { width: 568, height: 320 },
            ]) {
              await p.setViewportSize(size);
              const bounds = await toast.boundingBox(),
                nav = await p.locator('.bottom-nav').boundingBox();
              assert.ok(
                bounds.y + bounds.height <= nav.y - 8,
                'Feedback stays above mobile navigation',
              );
              assert.ok(bounds.y >= 0 && bounds.x >= 0 && bounds.x + bounds.width <= size.width);
              await p.screenshot({ path: `${out}/${engine}-toast-${size.width}.png` });
            }
            await p.setViewportSize({ width, height: 900 });
          }
          assert.equal(await toast.evaluate((el) => getComputedStyle(el).pointerEvents), 'none');
          // Opening and saving without edits does not perform a write.
          await p.getByRole('button', { name: /^Perfil de / }).click();
          await dialog.getByRole('tab', { name: 'Aparença', exact: true }).click();
          await dialog.getByRole('button', { name: 'Desar preferències', exact: true }).click();
          await dialog.waitFor({ state: 'hidden' });
          assert.equal(requests.length, 1);
        }
        assert.deepEqual(errors, []);
        assert.ok(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
        await p.screenshot({ path: `${out}/${engine}-${width}-${scenario}.png` });
        results.push({ engine, width, scenario, passed: true, requests });
        console.log(`${engine} ${width} ${scenario} OK`);
      } catch (error) {
        results.push({ engine, width, scenario, passed: false, error: error.stack, requests });
        await p.screenshot({ path: `${out}/${engine}-${width}-${scenario}-failed.png` });
        console.error(`${engine} ${width} ${scenario}: ${error.message}`);
      } finally {
        release();
        await context.close();
        await f.close();
        writeFileSync(
          `${out}/results.json`,
          JSON.stringify(
            { localOnly: true, publicSiteVisited: false, physicalDevicesTested: false, results },
            null,
            2,
          ),
        );
      }
    }
  }
  await browser.close();
}
assert.ok(results.every((r) => r.passed));
console.log(`${results.length} preference scenarios passed.`);
