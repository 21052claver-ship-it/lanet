import { chromium, firefox, webkit } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import { browserFixture } from '../tests/helpers/browser-fixture.mjs';

const out = process.env.LANET_TEST_OUTPUT || 'output/security-compat';
mkdirSync(out, { recursive: true });
const engines = { chromium, firefox, webkit };
const requested = (process.env.LANET_BROWSER_ENGINES || 'chromium,firefox,webkit').split(',');
const results = [];
for (const name of requested) {
  assert.ok(engines[name]);
  const fixture = await browserFixture();
  const browser = await engines[name].launch({ headless: true });
  async function context(options = {}, authenticated = true) {
    const ctx = await browser.newContext({ ...options, reducedMotion: 'reduce' });
    await ctx.route('**/*', (route) =>
      new URL(route.request().url()).origin === fixture.base ||
      route.request().url().startsWith('blob:')
        ? route.continue()
        : route.abort(),
    );
    if (authenticated)
      await ctx.addCookies([{ name: 'lanet_session', value: fixture.token, url: fixture.base }]);
    return ctx;
  }
  async function check(label, fn) {
    if (process.env.LANET_BROWSER_CHECK && !label.includes(process.env.LANET_BROWSER_CHECK)) return;
    try {
      const detail = await fn();
      results.push({ engine: name, label, passed: true, ...detail });
      console.log(`${name}: ${label} OK`);
    } catch (error) {
      results.push({ engine: name, label, passed: false, error: error.message });
      console.log(`${name}: ${label} FAILED ${error.message}`);
    }
    writeFileSync(
      `${out}/browser-results.json`,
      JSON.stringify(
        {
          localOnly: true,
          realDevicesTested: false,
          publicBrowserVerification: 'pending_browser_permission',
          results,
        },
        null,
        2,
      ),
    );
  }
  try {
    for (const [width, height] of [
      [1440, 900],
      [1024, 768],
      [768, 1024],
      [390, 844],
      [320, 640],
    ]) {
      const ctx = await context({ viewport: { width, height }, hasTouch: width <= 768 });
      const page = await ctx.newPage();
      page.setDefaultTimeout(8000);
      const errors = [];
      page.on('pageerror', (e) => errors.push(e.message));
      for (const section of [
        'schedule',
        'notes',
        'pluses',
        'grades',
        'pau',
        'study',
        'community',
        'bakery',
      ])
        await check(`${section} ${width}x${height}`, async () => {
          errors.length = 0;
          await page.goto(`${fixture.base}/#${section}`);
          await page.locator('.page-title h1').waitFor();
          await page.locator('.global-board .board-trigger').first().waitFor();
          assert.equal(await page.locator('.global-board .board-trigger').count(), 3);
          const measure = await page.evaluate(() => ({
            viewport: innerWidth,
            scroll: document.documentElement.scrollWidth,
            body: document.body.scrollWidth,
            boards: [...document.querySelectorAll('.board-trigger')].map((el) => {
              const r = el.getBoundingClientRect();
              return { left: r.left, right: r.right, width: r.width, height: r.height };
            }),
          }));
          assert.ok(
            measure.scroll <= width + 1 && measure.body <= width + 1,
            `Horizontal overflow ${JSON.stringify(measure)}`,
          );
          for (let i = 0; i < 3; i++) {
            const b = measure.boards[i];
            assert.ok(b.left >= 0 && b.right <= width + 1 && b.height >= 44);
            assert.ok(Math.abs(b.width / b.height - 16 / 9) < 0.04);
            if (i) assert.ok(b.left >= measure.boards[i - 1].right);
          }
          if (width <= 760)
            assert.ok(await page.getByRole('navigation', { name: 'Navegació mòbil' }).isVisible());
          assert.deepEqual(errors, []);
          if ((width === 1440 || width === 390) && ['study', 'grades', 'bakery'].includes(section))
            await page.screenshot({
              path: `${out}/${name}-${section}-${width}.png`,
              fullPage: true,
            });
          return { width, height, section, measure };
        });
      await ctx.close();
    }
    await check('Welcome and Google button at mobile width', async () => {
      const ctx = await context({ viewport: { width: 320, height: 640 } }, false);
      try {
        const p = await ctx.newPage();
        await p.goto(fixture.base);
        await p.getByRole('button', { name: 'Continua amb Google' }).waitFor();
        assert.equal(
          await p.getByRole('button', { name: 'Continua amb Google' }).isEnabled(),
          true,
        );
        assert.ok(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
        await p.screenshot({ path: `${out}/${name}-welcome-320.png`, fullPage: true });
      } finally {
        await ctx.close();
      }
    });
    await check('Independent ad selection and keyboard dismissal', async () => {
      const ctx = await context({ viewport: { width: 390, height: 844 } });
      try {
        const p = await ctx.newPage();
        await p.goto(fixture.base);
        await p.locator('.board-trigger').nth(2).click();
        await p.getByText('Espai 3 de 3', { exact: true }).waitFor();
        await p.getByRole('button', { name: 'Proposa un missatge' }).click();
        await p
          .locator('.banner-space-options button[aria-pressed="true"]')
          .getByText('Espai 3', { exact: true })
          .waitFor();
        await p.locator('.banner-space-options button').first().click();
        assert.equal(
          await p.locator('.banner-space-options button[aria-pressed="true"]').innerText(),
          'Espai 1\nDisponible · des de 1 pastís',
        );
        await p.keyboard.press('Escape');
        await p.getByRole('dialog').waitFor({ state: 'hidden' });
      } finally {
        await ctx.close();
      }
    });
    await check('Compatible audio starts and pauses after a user gesture', async () => {
      const ctx = await context();
      try {
        const p = await ctx.newPage();
        await p.goto(fixture.base + '/#study');
        await p.evaluate(() => {
          window.__audioDiagnostics = [];
          const play = HTMLMediaElement.prototype.play;
          HTMLMediaElement.prototype.play = function () {
            return play.call(this).catch((error) => {
              window.__audioDiagnostics.push({ name: error.name, message: error.message });
              throw error;
            });
          };
        });
        await p.getByRole('button', { name: 'Reproduir', exact: true }).click();
        try {
          await p.getByRole('button', { name: 'Pausar música', exact: true }).waitFor();
        } catch (error) {
          console.error(
            'Audio diagnostics',
            await p.evaluate(() => ({
              rejected: window.__audioDiagnostics,
              media: [...document.querySelectorAll('audio')].map((el) => ({
                src: el.currentSrc,
                paused: el.paused,
                ready: el.readyState,
                error: el.error?.message,
                code: el.error?.code,
                mp3: el.canPlayType('audio/mpeg'),
                vorbis: el.canPlayType('audio/ogg; codecs="vorbis"'),
              })),
              status: document.querySelector('.record-status')?.textContent,
            })),
          );
          throw error;
        }
        const media = await p
          .locator('audio[data-study-audio]')
          .evaluate((el) => ({ src: el.currentSrc, paused: el.paused, duration: el.duration }));
        assert.ok(/\.(mp3|ogg)$/.test(media.src) && !media.paused && media.duration > 60);
        await p.getByRole('button', { name: 'Pausar música', exact: true }).click();
        return { media };
      } finally {
        await ctx.close();
      }
    });
    await check('PDF rendering, escaped user text and modal scrolling', async () => {
      const ctx = await context({ viewport: { width: 390, height: 844 } });
      try {
        const p = await ctx.newPage();
        await p.goto(fixture.base + '/#notes');
        await p.getByRole('button', { name: 'Obrir PDF de prova local', exact: true }).click();
        await p.locator('.pdf-preview canvas').waitFor();
        await p.waitForFunction(
          () => {
            const c = document.querySelector('.pdf-preview canvas');
            return c && c.width > 100 && c.height > 100;
          },
          {},
          { timeout: 15000 },
        );
        assert.equal(await p.locator('.rich-text img[onerror]').count(), 0);
        assert.ok(
          (await p.locator('.rich-text').innerText()).includes('<img src=x onerror=alert(1)>'),
        );
        const r = await p.getByRole('dialog').boundingBox();
        assert.ok(r.x >= 0 && r.x + r.width <= 391 && r.height <= 844);
        await p.keyboard.press('Escape');
        await p.getByRole('dialog').waitFor({ state: 'hidden' });
      } finally {
        await ctx.close();
      }
    });
    await check('Native select fallback and blocked local storage', async () => {
      const ctx = await context({ viewport: { width: 390, height: 844 } });
      await ctx.addInitScript(() => {
        delete HTMLElement.prototype.showPopover;
        delete HTMLElement.prototype.hidePopover;
        Object.defineProperty(window, 'localStorage', {
          get() {
            throw new DOMException('Blocked for test', 'SecurityError');
          },
        });
      });
      try {
        const p = await ctx.newPage();
        const errors = [];
        p.on('pageerror', (e) => errors.push(e.message));
        await p.goto(fixture.base + '/#grades');
        const selector = p.locator('select.select-native-input').first();
        await selector.waitFor();
        await selector.selectOption({ index: 1 });
        await p.getByRole('button', { name: /Perfil de/ }).click();
        await p.getByRole('dialog').waitFor();
        await p.keyboard.press('Escape');
        await p.getByRole('dialog').waitFor({ state: 'hidden' });
        await p.goto(fixture.base + '/#study');
        await p.locator('.page-title h1').waitFor();
        assert.deepEqual(errors, []);
      } finally {
        await ctx.close();
      }
    });
  } finally {
    await browser.close();
    await fixture.close();
  }
}
const failures = results.filter((r) => !r.passed);
console.log(`${results.length - failures.length}/${results.length} local browser checks passed.`);
if (failures.length) process.exitCode = 1;
