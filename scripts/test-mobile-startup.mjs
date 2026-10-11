import { chromium, firefox, webkit } from 'playwright';
import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { browserFixture } from '../tests/helpers/browser-fixture.mjs';

const out = process.env.LANET_TEST_OUTPUT || 'output/mobile-startup';
mkdirSync(out, { recursive: true });
const results = [];
for (const [engine, launcher] of Object.entries({ chromium, firefox, webkit })) {
  if (
    process.env.LANET_BROWSER_ENGINES &&
    !process.env.LANET_BROWSER_ENGINES.split(',').includes(engine)
  )
    continue;
  const browser = await launcher.launch({ headless: true });
  async function run(label, authenticated, fn, legacy = false) {
    const fixture = await browserFixture();
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
      hasTouch: true,
      reducedMotion: 'reduce',
      userAgent:
        'Mozilla/5.0 (iPhone; CPU iPhone OS 14_8 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/95.0.4638.50 Mobile/15E148 Safari/604.1',
    });
    await context.route('**/*', (route) =>
      new URL(route.request().url()).origin === fixture.base ||
      route.request().url().startsWith('blob:')
        ? route.continue()
        : route.abort(),
    );
    if (authenticated)
      await context.addCookies([
        { name: 'lanet_session', value: fixture.token, url: fixture.base },
      ]);
    if (legacy)
      await context.addInitScript(() => {
        Object.hasOwn = undefined;
        Array.prototype.at = undefined;
        Array.prototype.findLastIndex = undefined;
        Object.defineProperty(crypto, 'randomUUID', { value: undefined });
        AbortSignal.prototype.throwIfAborted = undefined;
        const match = window.matchMedia.bind(window);
        window.matchMedia = (query) => {
          const media = match(query);
          media.addEventListener = undefined;
          media.removeEventListener = undefined;
          return media;
        };
      });
    const page = await context.newPage();
    page.setDefaultTimeout(10000);
    const errors = [];
    const network = [];
    page.on('requestfailed', (request) =>
      network.push({ url: request.url(), error: request.failure()?.errorText }),
    );
    page.on('pageerror', (error) => errors.push(error.message));
    try {
      await fn(page, fixture, context);
      assert.deepEqual(errors, []);
      results.push({ engine, label, passed: true, legacyApisRemoved: legacy });
      console.log(`✓ ${engine}: ${label}`);
    } catch (error) {
      results.push({
        engine,
        label,
        passed: false,
        error: error.message,
        pageErrors: errors,
        network,
      });
      await page.screenshot({
        path: `${out}/${engine}-${results.length}-failure.png`,
        fullPage: true,
      });
      throw error;
    } finally {
      writeFileSync(
        `${out}/mobile-browser-results.json`,
        JSON.stringify(
          { localOnly: true, physicalDevice: false, publicSiteVisited: false, results },
          null,
          2,
        ) + '\n',
      );
      await context.close();
      await fixture.close();
    }
  }
  try {
    await run(
      'Login visible without recent APIs',
      false,
      async (page, fixture) => {
        await page.goto(fixture.base);
        await page.getByRole('button', { name: /Google/ }).waitFor();
        assert.equal(await page.locator('#root').evaluate((el) => el.childElementCount > 0), true);
        await page.screenshot({ path: `${out}/${engine}-legacy-login.png`, fullPage: true });
      },
      true,
    );
    await run(
      'Legacy session, grades, timer and resize',
      true,
      async (page, fixture) => {
        await page.goto(fixture.base + '/#grades');
        await page.locator('.page-title h1').waitFor();
        await page.getByRole('switch', { name: 'Mode discret de les notes' }).waitFor();
        await page.goto(fixture.base + '/#study');
        await page.getByRole('button', { name: 'Comença', exact: true }).click();
        await page.locator('.timer-pill').waitFor();
        await page.getByRole('button', { name: 'Pausar', exact: true }).click();
        await page.setViewportSize({ width: 320, height: 640 });
        assert.ok(
          await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1),
        );
        await page.screenshot({ path: `${out}/${engine}-legacy-workspace.png`, fullPage: true });
      },
      true,
    );
    await run('HTML visible while application download waits', false, async (page, fixture) => {
      let release;
      const gate = new Promise((resolve) => {
        release = resolve;
      });
      await page.route('**/assets/main-*.js', async (route) => {
        await gate;
        await route.continue();
      });
      await page.goto(fixture.base, { waitUntil: 'commit' });
      try {
        await page.getByRole('heading', { name: 'Obrint La Net' }).waitFor();
        assert.ok(await page.locator('#startup-card').isVisible());
        await page.screenshot({
          path: `${out}/${engine}-slow-start.png`,
          fullPage: true,
          timeout: 3000,
        });
      } finally {
        release();
      }
      await page.getByRole('button', { name: /Google/ }).waitFor();
    });
    await run(
      'Watchdog offers retry and a late download can still finish',
      false,
      async (page, fixture) => {
        let release;
        const gate = new Promise((resolve) => {
          release = resolve;
        });
        await page.clock.install();
        await page.route('**/assets/main-*.js', async (route) => {
          await gate;
          await route.continue();
        });
        await page.goto(fixture.base, { waitUntil: 'commit' });
        try {
          await page.waitForFunction(() => !!window.LaNetStartup);
          await page.clock.runFor(21000);
          await page.getByRole('link', { name: 'Tornar-ho a provar', exact: true }).waitFor();
        } finally {
          release();
        }
        await page.getByRole('button', { name: /Google/ }).waitFor();
      },
    );
    await run(
      'API failure shows recovery and retry reaches login',
      false,
      async (page, fixture) => {
        let fail = true;
        await page.route('**/api/auth/status', (route) =>
          fail
            ? route.fulfill({
                status: 503,
                contentType: 'application/json',
                body: '{"error":"Local failure"}',
              })
            : route.continue(),
        );
        await page.goto(fixture.base);
        await page.getByRole('heading', { name: 'No hem pogut connectar', exact: true }).waitFor();
        fail = false;
        await page.getByRole('button', { name: 'Tornar-ho a provar', exact: true }).click();
        await page.getByRole('button', { name: /Google/ }).waitFor();
      },
    );
    await run('Disabled JavaScript still shows guidance', false, async (_page, fixture) => {
      const context = await browser.newContext({
        javaScriptEnabled: false,
        viewport: { width: 390, height: 844 },
      });
      await context.route('**/*', (route) =>
        new URL(route.request().url()).origin === fixture.base ? route.continue() : route.abort(),
      );
      try {
        const page = await context.newPage();
        await page.goto(fixture.base);
        assert.ok(await page.getByRole('heading', { name: 'Obrint La Net' }).isVisible());
        assert.ok(await page.locator('noscript').isVisible());
      } finally {
        await context.close();
      }
    });
    for (const [label, glob] of [
      ['entry module', '**/assets/index-*.js'],
      ['application module', '**/assets/main-*.js'],
      ['application stylesheet', '**/assets/main-*.css'],
    ]) {
      await run(`Recover after failed ${label}`, false, async (page, fixture) => {
        let fail = true;
        await page.route(glob, (route) => (fail ? route.abort() : route.continue()));
        await page.goto(fixture.base + '/?test=kept#grades');
        await page.getByRole('link', { name: 'Tornar-ho a provar', exact: true }).waitFor();
        await page.screenshot({
          path: `${out}/${engine}-${label.replaceAll(' ', '-')}-recovery.png`,
          fullPage: true,
        });
        fail = false;
        await page.getByRole('link', { name: 'Tornar-ho a provar', exact: true }).click();
        await page.getByRole('button', { name: /Google/ }).waitFor();
        const url = new URL(page.url());
        assert.equal(url.hash, '#grades');
        assert.equal(url.searchParams.get('test'), 'kept');
        assert.ok(url.searchParams.has('_ln_reload'));
      });
    }
    await run('App render error reaches root recovery', false, async (page, fixture, context) => {
      await context.addInitScript(() => {
        const NativeURL = URL;
        window.URL = class extends NativeURL {
          constructor(...args) {
            if (args[0] === location.href && location.hash === '#root-crash')
              throw new Error('Injected root render fault');
            super(...args);
          }
        };
      });
      await page.goto(fixture.base + '/#root-crash');
      await page.getByRole('button', { name: 'Tornar a obrir', exact: true }).waitFor();
      assert.ok(await page.locator('#root').evaluate((el) => el.textContent.includes('La Net')));
    });
  } finally {
    await browser.close();
  }
}
console.log(`${results.length} mobile startup scenarios verified.`);
