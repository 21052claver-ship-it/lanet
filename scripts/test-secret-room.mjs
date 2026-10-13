import { chromium, firefox, webkit } from 'playwright';
import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { browserFixture } from '../tests/helpers/browser-fixture.mjs';
import { WHEEL } from '../shared/roulette.js';
const out = process.env.LANET_TEST_OUTPUT || 'output/secret-room';
mkdirSync(out, { recursive: true });
const results = [];
for (const [engine, launcher] of Object.entries({ chromium, firefox, webkit })) {
  if (
    process.env.LANET_BROWSER_ENGINES &&
    !process.env.LANET_BROWSER_ENGINES.split(',').includes(engine)
  )
    continue;
  const browser = await launcher.launch({ headless: true });
  async function run(label, size, fn, { motion = false, legacy = false } = {}) {
    const fixture = await browserFixture();
    const context = await browser.newContext({
      viewport: size,
      hasTouch: size.width < 1000,
      reducedMotion: motion ? 'no-preference' : 'reduce',
    });
    await context.route('**/*', (route) =>
      new URL(route.request().url()).origin === fixture.base ||
      route.request().url().startsWith('blob:')
        ? route.continue()
        : route.abort(),
    );
    await context.addCookies([{ name: 'lanet_session', value: fixture.token, url: fixture.base }]);
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
    page.setDefaultTimeout(12000);
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    try {
      await page.goto(fixture.base + '/#bakery');
      await page.getByRole('button', { name: 'Entrar a la pastisseria', exact: true }).click();
      await page.getByRole('heading', { name: 'El forn de La Net', exact: true }).waitFor();
      await fn(page, fixture, context);
      assert.ok(
        await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1),
        'No horizontal overflow',
      );
      assert.deepEqual(errors, []);
      results.push({ engine, label, ...size, motion, legacy, passed: true });
      console.log(`✓ ${engine}: ${label}`);
    } catch (error) {
      results.push({
        engine,
        label,
        ...size,
        passed: false,
        error: error.message,
        pageErrors: errors,
      });
      await page.screenshot({
        path: `${out}/${engine}-${results.length}-failure.png`,
        fullPage: true,
      });
      throw error;
    } finally {
      writeFileSync(
        `${out}/secret-room-browser-results.json`,
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
  const enter = async (page) => {
    await page.locator('.secret-rug').scrollIntoViewIfNeeded();
    assert.ok(
      await page.locator('.secret-rug').evaluate((rug) => {
        const box = rug.getBoundingClientRect();
        return [0.1, 0.5, 0.9].every(
          (y) =>
            document
              .elementFromPoint(box.x + box.width / 2, box.y + box.height * y)
              ?.closest('button') === rug,
        );
      }),
      'The cake button must not cover the rug touch target',
    );
    await page
      .getByRole('button', { name: 'Aixecar la catifa de la pastisseria', exact: true })
      .click();
    await page.getByRole('heading', { name: 'La sala secreta', exact: true }).waitFor();
    await page.getByRole('button', { name: 'Fer girar la ruleta', exact: true }).waitFor();
    await page.waitForFunction(() => !document.querySelector('.casino-bet-controls')?.disabled);
    await page.getByRole('button', { name: 'Aposta ràpida', exact: true }).click();
  };
  const assertResult = async (page, fixture, count = 1) => {
    await page.locator('.roulette-result.has-result').waitFor();
    const spin = fixture.db
      .prepare("SELECT * FROM roulette_spins WHERE user_id='browser' ORDER BY rowid DESC LIMIT 1")
      .get();
    assert.ok(spin);
    assert.equal(fixture.db.prepare('SELECT COUNT(*) n FROM roulette_spins').get().n, count);
    assert.equal(
      await page.locator('.roulette-device').getAttribute('data-result'),
      String(spin.result),
    );
    const angle = Number(await page.locator('.roulette-device').getAttribute('data-angle'));
    const offset = (angle + (WHEEL.indexOf(spin.result) * 360) / 37) % 360;
    assert.ok(offset < 1e-7 || 360 - offset < 1e-7);
    const displayed = await page.locator('.roulette-wheel').evaluate((el) => {
      const transform = getComputedStyle(el).transform;
      if (transform === 'none') return 0;
      const matrix = transform
        .match(/matrix\(([^)]+)\)/)[1]
        .split(',')
        .map(Number);
      return ((Math.atan2(matrix[1], matrix[0]) * 180) / Math.PI + 360) % 360;
    });
    const difference = Math.abs(displayed - (angle % 360));
    assert.ok(
      Math.min(difference, 360 - difference) < 0.5,
      'Visual wheel matches the server pocket',
    );
    assert.equal(
      fixture.db.prepare("SELECT balance FROM users WHERE id='browser'").get().balance,
      5 +
        fixture.db
          .prepare(
            "SELECT COALESCE(SUM(payout-stake),0) total FROM roulette_spins WHERE user_id='browser'",
          )
          .get().total,
    );
    return spin;
  };
  try {
    await run(
      'Desktop keyboard discovery, red bet and return focus',
      { width: 1440, height: 900 },
      async (page, fixture) => {
        const rug = page.getByRole('button', {
          name: 'Aixecar la catifa de la pastisseria',
          exact: true,
        });
        await rug.focus();
        await page.screenshot({ path: `${out}/${engine}-bakery-rug.png`, fullPage: true });
        await rug.press('Enter');
        await page.getByRole('heading', { name: 'La sala secreta', exact: true }).waitFor();
        await page.waitForFunction(() => !document.querySelector('.casino-bet-controls')?.disabled);
        await page.getByRole('button', { name: 'Aposta ràpida', exact: true }).click();
        const red = page.getByRole('radio', { name: /Vermell/ });
        await red.focus();
        await red.press('ArrowRight');
        assert.equal(
          await page.getByRole('radio', { name: /Negre/ }).getAttribute('aria-checked'),
          'true',
        );
        await page.getByRole('radio', { name: /Negre/ }).press('Home');
        await page.screenshot({ path: `${out}/${engine}-casino-desktop.png`, fullPage: true });
        await page.getByRole('button', { name: 'Fer girar la ruleta', exact: true }).click();
        await assertResult(page, fixture);
        await page.getByRole('button', { name: 'Tornar al forn', exact: true }).click();
        await rug.waitFor();
        assert.equal(await rug.evaluate((el) => el === document.activeElement), true);
      },
    );
    await run(
      '320px number grid, input validation and duplicate click guard',
      { width: 320, height: 640 },
      async (page, fixture) => {
        await enter(page);
        await page.getByRole('radio', { name: /Número/ }).click();
        await page.getByRole('button', { name: 'Apostar al número 17', exact: true }).click();
        await page
          .getByRole('button', { name: 'Apostar al número 17', exact: true })
          .press('ArrowRight');
        assert.equal(
          await page
            .getByRole('button', { name: 'Apostar al número 18', exact: true })
            .getAttribute('aria-pressed'),
          'true',
        );
        await page
          .getByRole('button', { name: 'Apostar al número 18', exact: true })
          .press('ArrowLeft');
        const stake = page.getByLabel('Pastissos a apostar', { exact: true });
        await stake.fill('0');
        assert.equal(
          await page.getByRole('button', { name: 'Fer girar la ruleta', exact: true }).isDisabled(),
          true,
        );
        await stake.fill('2');
        await page.screenshot({ path: `${out}/${engine}-casino-320-numbers.png`, fullPage: true });
        await page
          .getByRole('button', { name: 'Fer girar la ruleta', exact: true })
          .evaluate((el) => {
            el.click();
            el.click();
          });
        const spin = await assertResult(page, fixture);
        assert.equal(spin.number, 17);
        assert.equal(spin.stake, 2);
        await page.locator('.roulette-information > summary').click();
        await page.locator('.roulette-history summary').click();
        assert.equal(await page.locator('.roulette-history li').count(), 1);
      },
    );
    await run(
      '390px black choice and private history',
      { width: 390, height: 844 },
      async (page, fixture) => {
        await enter(page);
        await page.getByRole('radio', { name: /Negre/ }).tap();
        await page.getByRole('button', { name: 'Fer girar la ruleta', exact: true }).tap();
        assert.equal((await assertResult(page, fixture)).kind, 'black');
        await page.locator('.roulette-information > summary').click();
        await page.locator('.roulette-history summary').click();
        await page.screenshot({ path: `${out}/${engine}-casino-390-result.png`, fullPage: true });
      },
    );
    await run('Tablet room and landscape controls', { width: 820, height: 1180 }, async (page) => {
      await enter(page);
      await page.screenshot({ path: `${out}/${engine}-casino-tablet.png`, fullPage: true });
      await page.setViewportSize({ width: 844, height: 390 });
      assert.ok(
        await page.getByRole('button', { name: 'Tornar al forn', exact: true }).isVisible(),
      );
    });
    await run(
      'Committed response lost, reload and recover same spin',
      { width: 390, height: 844 },
      async (page, fixture) => {
        await enter(page);
        let dropped = false;
        await page.route('**/api/roulette', async (route) => {
          if (route.request().method() === 'POST' && !dropped) {
            dropped = true;
            await route.fetch();
            await route.abort();
          } else await route.continue();
        });
        await page.getByRole('button', { name: 'Fer girar la ruleta', exact: true }).click();
        await page.getByRole('button', { name: 'Recuperar aposta', exact: true }).waitFor();
        await page.waitForFunction(
          () => !document.querySelector('.casino-pending button')?.disabled,
        );
        assert.equal(fixture.db.prepare('SELECT COUNT(*) n FROM roulette_spins').get().n, 1);
        const original = fixture.db
          .prepare('SELECT request_id FROM roulette_spins')
          .get().request_id;
        await page.reload();
        await page.getByRole('button', { name: 'Entrar a la pastisseria', exact: true }).click();
        await page.getByRole('heading', { name: 'El forn de La Net', exact: true }).waitFor();
        await page
          .getByRole('button', { name: 'Aixecar la catifa de la pastisseria', exact: true })
          .click();
        await page.getByRole('button', { name: 'Recuperar aposta', exact: true }).click();
        const spin = await assertResult(page, fixture);
        assert.equal(spin.request_id, original);
        assert.equal(
          await page.evaluate(() => localStorage.getItem('lanet.roulette.pending.browser')),
          null,
        );
      },
    );
    await run(
      'Unsent request recovers with one eventual settlement',
      { width: 390, height: 844 },
      async (page, fixture) => {
        await enter(page);
        let fail = true;
        await page.route('**/api/roulette', (route) =>
          route.request().method() === 'POST' && fail ? route.abort() : route.continue(),
        );
        await page.getByRole('button', { name: 'Fer girar la ruleta', exact: true }).click();
        await page.waitForFunction(
          () =>
            document.querySelector('.casino-pending button') &&
            !document.querySelector('.casino-pending button').disabled,
        );
        assert.equal(fixture.db.prepare('SELECT COUNT(*) n FROM roulette_spins').get().n, 0);
        fail = false;
        await page.getByRole('button', { name: 'Recuperar aposta', exact: true }).click();
        await assertResult(page, fixture);
      },
    );
    await run(
      'Two tabs recover one outstanding spin without another stake',
      { width: 390, height: 844 },
      async (page, fixture, context) => {
        await enter(page);
        const other = await context.newPage();
        const errors = [];
        other.on('pageerror', (e) => errors.push(e.message));
        await other.goto(fixture.base + '/#bakery');
        await other.getByRole('button', { name: 'Entrar a la pastisseria', exact: true }).click();
        await other.getByRole('heading', { name: 'El forn de La Net', exact: true }).waitFor();
        await enter(other);
        let release, committed;
        const gate = new Promise((resolve) => {
            release = resolve;
          }),
          ready = new Promise((resolve) => {
            committed = resolve;
          });
        let hold = true;
        await page.route('**/api/roulette', async (route) => {
          if (route.request().method() === 'POST' && hold) {
            hold = false;
            const response = await route.fetch();
            committed();
            await gate;
            await route.fulfill({ response });
          } else await route.continue();
        });
        try {
          await page.getByRole('button', { name: 'Fer girar la ruleta', exact: true }).click();
          await ready;
          await other.getByRole('button', { name: 'Recuperar aposta', exact: true }).click();
          await assertResult(other, fixture);
        } finally {
          release();
        }
        await assertResult(page, fixture);
        assert.deepEqual(errors, []);
        await other.close();
      },
    );
    await run(
      'Balance changed in another tab rejects cleanly',
      { width: 390, height: 844 },
      async (page, fixture) => {
        await enter(page);
        fixture.db.exec(
          "INSERT INTO ledger(id,user_id,amount,reason,ref,day) VALUES('spent','browser',-5,'Local other tab','spent','2026-10-11')",
        );
        await page.getByRole('button', { name: 'Fer girar la ruleta', exact: true }).click();
        await page
          .getByText('No tens pastissos disponibles. Pots tornar al forn.', { exact: true })
          .waitFor();
        assert.equal(fixture.db.prepare('SELECT COUNT(*) n FROM roulette_spins').get().n, 0);
        assert.equal(await page.locator('.casino-pending').count(), 0);
        assert.equal(
          await page.evaluate(() => localStorage.getItem('lanet.roulette.pending.browser')),
          null,
        );
      },
    );
    await run(
      'Blocked storage prevents an unrecoverable write',
      { width: 390, height: 844 },
      async (page, fixture) => {
        await enter(page);
        await page.evaluate(() => {
          Storage.prototype.setItem = () => {
            throw new Error('Blocked storage');
          };
        });
        await page.getByRole('button', { name: 'Fer girar la ruleta', exact: true }).click();
        await page
          .getByText(
            'Permet l’emmagatzematge local per poder recuperar l’aposta si es talla la connexió.',
            { exact: true },
          )
          .waitFor();
        assert.equal(fixture.db.prepare('SELECT COUNT(*) n FROM roulette_spins').get().n, 0);
      },
    );
    await run(
      'Animated hatch, tunnel and wheel stop at actual pocket',
      { width: 1440, height: 900 },
      async (page, fixture) => {
        await page
          .getByRole('button', { name: 'Aixecar la catifa de la pastisseria', exact: true })
          .click();
        await page.locator('.state-opening').waitFor();
        await page.screenshot({ path: `${out}/${engine}-hatch-opening.png`, fullPage: true });
        await page.locator('.secret-tunnel').waitFor();
        await page.screenshot({ path: `${out}/${engine}-tunnel.png`, fullPage: true });
        await page.getByRole('heading', { name: 'La sala secreta', exact: true }).waitFor();
        await page.waitForFunction(() => !document.querySelector('.casino-bet-controls')?.disabled);
        await page.getByRole('button', { name: 'Aposta ràpida', exact: true }).click();
        await page.getByRole('button', { name: 'Fer girar la ruleta', exact: true }).click();
        await page.locator('.roulette-device.is-spinning').waitFor();
        assert.equal(
          await page.getByRole('button', { name: /La ruleta està girant/ }).isDisabled(),
          true,
        );
        await assertResult(page, fixture);
        await page.screenshot({ path: `${out}/${engine}-animated-result.png`, fullPage: true });
      },
      { motion: true },
    );
    await run(
      'Cancel descending tunnel prevents stale navigation',
      { width: 390, height: 844 },
      async (page, fixture) => {
        await page
          .getByRole('button', { name: 'Aixecar la catifa de la pastisseria', exact: true })
          .click();
        await page.locator('.secret-tunnel').waitFor();
        await page.getByRole('button', { name: 'Tornar al forn', exact: true }).click();
        assert.equal(await page.locator('.secret-transition').count(), 0);
        await page.clock.install();
        await page.clock.runFor(4000);
        assert.equal(await page.locator('.casino-room').count(), 0);
        assert.equal(fixture.db.prepare('SELECT COUNT(*) n FROM roulette_spins').get().n, 0);
      },
      { motion: true },
    );
    await run(
      'Legacy iPhone APIs, bakery and roulette',
      { width: 320, height: 640 },
      async (page, fixture) => {
        await enter(page);
        await page.getByRole('button', { name: 'Fer girar la ruleta', exact: true }).click();
        await assertResult(page, fixture);
      },
      { legacy: true },
    );
  } finally {
    await browser.close();
  }
}
console.log(`${results.length} secret room scenarios verified.`);
