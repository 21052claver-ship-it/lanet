import { chromium, firefox, webkit } from 'playwright';
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { browserFixture } from '../tests/helpers/browser-fixture.mjs';
import { emptyPau, findPauDegrees, recommendPauDegrees, validatePau } from '../shared/pau.js';

const out = process.env.LANET_TEST_OUTPUT || 'output/pau';
mkdirSync(out, { recursive: true });
const catalogue = JSON.parse(readFileSync('public/data/pau.json', 'utf8'));
const engines = { chromium, firefox, webkit },
  results = [];
const sample = (p = {}) => ({
  ...emptyPau(),
  orientationSource: 'simulation',
  average: 8,
  general: 7,
  modalityGrade: 9,
  ...p,
});
for (const engine of (process.env.LANET_BROWSER_ENGINES || 'chromium,firefox,webkit').split(',')) {
  let failCatalogue = false;
  const fixture = await browserFixture({
    beforeAsset: async (request) => {
      if (failCatalogue && new URL(request.url).pathname === '/data/pau.json') {
        failCatalogue = false;
        return new Response('Offline', { status: 503 });
      }
    },
  });
  const browser = await engines[engine].launch({ headless: true });
  async function choose(page, label, option) {
    await page.getByRole('combobox', { name: label, exact: true }).click();
    await page.getByRole('option', { name: option, exact: true }).click();
  }
  async function text(locator, expected) {
    await locator.waitFor();
    await locator.page().waitForFunction(({ el, expected }) => el.textContent.trim() === expected, {
      el: await locator.elementHandle(),
      expected,
    });
  }
  async function run(label, width, initial, fn) {
    fixture.db.exec(
      "DELETE FROM pau_simulations; DELETE FROM user_preferences WHERE user_id='browser'",
    );
    if (initial)
      fixture.db
        .prepare("INSERT INTO pau_simulations(user_id,value,revision) VALUES('browser',?,1)")
        .run(JSON.stringify(initial));
    const context = await browser.newContext({
      viewport: { width, height: 900 },
      hasTouch: width < 1000,
      reducedMotion: 'reduce',
    });
    await context.route('**/*', (route) =>
      new URL(route.request().url()).origin === fixture.base ||
      route.request().url().startsWith('blob:')
        ? route.continue()
        : route.abort(),
    );
    await context.addCookies([{ name: 'lanet_session', value: fixture.token, url: fixture.base }]);
    const page = await context.newPage();
    page.setDefaultTimeout(10000);
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    try {
      await page.goto(fixture.base + '/#pau');
      await page.getByRole('heading', { name: 'PAU i universitat', exact: true }).waitFor();
      await page.getByRole('tab', { name: 'La meva nota', exact: true }).click();
      await fn(page);
      assert.deepEqual(errors, []);
      assert.ok(
        await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1),
        'No horizontal overflow',
      );
      results.push({ engine, label, width, passed: true });
      console.log(`${engine}: ${label} ${width} OK`);
    } catch (error) {
      results.push({ engine, label, width, passed: false, error: error.message });
      console.error(`${engine}: ${label} ${width} FAILED ${error.stack || error.message}`);
      await page
        .screenshot({ path: `${out}/${engine}-${label}-${width}-failed.png`, fullPage: true })
        .catch(() => {});
    } finally {
      await context.close();
      writeFileSync(
        `${out}/pau-browser-results.json`,
        JSON.stringify(
          {
            localOnly: true,
            realDevicesTested: false,
            publicBrowserVerification: 'pending_browser_permission',
            results,
          },
          null,
          2,
        ) + '\n',
      );
    }
  }
  for (const width of [1440, 390]) {
    await run('calculate-save-reload', width, null, async (p) => {
      await p.getByRole('textbox', { name: 'Mitjana de batxillerat', exact: true }).fill('8');
      await p.getByRole('textbox', { name: 'Mitjana de la fase d’accés', exact: true }).fill('7');
      await p.getByRole('textbox', { name: 'Nota de modalitat', exact: true }).fill('9');
      await text(p.getByTestId('access'), '7,600');
      await choose(p, 'Fase d’accés', 'Calcular-la examen per examen');
      for (const [label, v] of [
        ['Llengua Catalana i Literatura', '6'],
        ['Llengua Castellana i Literatura', '7'],
        ['Llengua estrangera', '8'],
        ['Història / Història de la Filosofia', '10'],
      ])
        await p.getByRole('textbox', { name: label, exact: true }).fill(v);
      await text(p.getByTestId('access'), '8,000');
      await p.getByRole('button', { name: 'Desar simulació', exact: true }).click();
      await p.getByText('Preferències i simulació PAU desades.', { exact: true }).waitFor();
      await p.reload();
      await p.getByRole('tab', { name: 'La meva nota', exact: true }).click();
      await text(p.getByTestId('access'), '8,000');
      assert.equal(
        await p.getByRole('textbox', { name: 'Nota de modalitat', exact: true }).inputValue(),
        '9',
      );
      await p.screenshot({ path: `${out}/${engine}-calculator-${width}.png`, fullPage: true });
    });
    const maximum = sample({
      route: 'cfgs',
      average: 10,
      general: null,
      subjects: [
        { id: 'biology', grade: 10, year: 2027 },
        { id: 'chemistry', grade: 10, year: 2027 },
        { id: 'physics', grade: 10, year: 2027 },
      ],
    });
    await run('finder-recommendation', width, maximum, async (p) => {
      await p.getByRole('tab', { name: 'Explorar', exact: true }).click();
      await choose(p, 'Carrera per a la recomanació', 'Medicina');
      const expected = recommendPauDegrees(
        findPauDegrees(catalogue.degrees, validatePau(maximum), { career: 'Medicina' }),
        'Medicina',
      );
      assert.ok(expected);
      await p
        .locator('.pau-recommendation')
        .getByText(expected.degree.name, { exact: true })
        .waitFor();
      const card = p.locator(`[data-code="${expected.degree.code}"]`);
      await card.getByRole('button', { name: 'Afegir al top 5', exact: true }).click();
      await card.getByRole('button', { name: /Al top 5/ }).waitFor();
      await p
        .locator('.pau-recommendation')
        .getByRole('button', { name: 'Veure aquesta opció' })
        .click();
      const dialog = p.getByRole('dialog');
      await dialog.getByRole('heading', { name: 'Matèries que ponderen · 2027' }).waitFor();
      assert.match(await dialog.locator('.pau-formula').innerText(), /14,000/);
      for (const a of await dialog.getByRole('link').all())
        assert.equal(new URL(await a.getAttribute('href')).hostname, 'universitats.gencat.cat');
      await dialog.getByRole('button', { name: 'Tancar', exact: true }).click();
      await p.getByRole('checkbox', { name: 'Mostrar només on arribo al tall històric' }).check();
      assert.equal(
        await p.locator('.pau-degree').count(),
        findPauDegrees(catalogue.degrees, validatePau(maximum), {
          career: 'Medicina',
          onlyEligible: true,
        }).length,
      );
      await choose(p, 'Referència de tall', 'Primera assignació · 10/07/2026');
      await p.screenshot({ path: `${out}/${engine}-finder-${width}.png`, fullPage: true });
    });
    await run('privacy-edit-persist', width, sample({ selected: '11033' }), async (p) => {
      await text(p.getByTestId('access'), '7,600');
      await p.getByRole('switch', { name: 'Mode discret de les notes' }).click();
      await text(p.getByTestId('access'), '•••');
      assert.equal(
        await p.getByLabel('Mitjana de batxillerat', { exact: true }).getAttribute('type'),
        'password',
      );
      const privateInput = p.getByLabel('Mitjana de batxillerat', { exact: true });
      assert.equal(await privateInput.inputValue(), '');
      await privateInput.fill('9,5');
      await privateInput.blur();
      assert.equal(await privateInput.inputValue(), '');
      await p.getByRole('button', { name: 'Desar simulació', exact: true }).click();
      await p.getByText('Preferències i simulació PAU desades.', { exact: true }).waitFor();
      await p.getByRole('tab', { name: 'Explorar', exact: true }).click();
      await choose(p, 'Carrera per a la recomanació', 'Medicina');
      assert.equal(await p.locator('.pau-recommendation').count(), 0);
      assert.equal(await p.locator('.pau-status.reaches').count(), 0);
      assert.equal(
        await p
          .getByRole('checkbox', { name: 'Mostrar només on arribo al tall històric' })
          .isDisabled(),
        true,
      );
      await p.reload();
      await p.getByRole('tab', { name: 'La meva nota', exact: true }).click();
      await text(p.getByTestId('access'), '•••');
      await p.getByRole('switch', { name: 'Mode discret de les notes' }).click();
      await text(p.getByTestId('access'), '8,500');
    });
    await run('validation-and-concurrency', width, sample(), async (p) => {
      await p.getByRole('textbox', { name: 'Mitjana de batxillerat', exact: true }).fill('99');
      await p
        .getByRole('alert')
        .getByText('Escriu una nota entre 0 i 10, amb un màxim de tres decimals.')
        .waitFor();
      assert.equal(
        await p.getByRole('button', { name: 'Desar simulació', exact: true }).isDisabled(),
        true,
      );
      await p.getByRole('textbox', { name: 'Mitjana de batxillerat', exact: true }).fill('9');
      const external = sample({ average: 6 });
      fixture.db
        .prepare("UPDATE pau_simulations SET value=?,revision=2 WHERE user_id='browser'")
        .run(JSON.stringify(external));
      await p.getByRole('button', { name: 'Desar simulació', exact: true }).click();
      await p
        .getByRole('button', {
          name: 'Recuperar versió desada (substitueix aquests canvis)',
          exact: true,
        })
        .click();
      await p.getByText('Versió desada recuperada.', { exact: true }).waitFor();
      await text(p.getByTestId('access'), '6,400');
      await p.getByRole('button', { name: 'Afegir matèria', exact: true }).click();
      await choose(p, 'Matèria 1', 'Biologia');
      await p.getByRole('button', { name: 'Afegir matèria', exact: true }).click();
      await p.getByRole('button', { name: 'Afegir matèria', exact: true }).click();
      assert.equal(
        await p.getByRole('button', { name: 'Afegir matèria', exact: true }).isDisabled(),
        true,
      );
      await p.getByRole('combobox', { name: 'Matèria 2', exact: true }).click();
      assert.equal(
        await p.getByRole('option', { name: 'Biologia', exact: true }).isDisabled(),
        true,
      );
      await p.keyboard.press('Escape');
      await p.getByRole('button', { name: 'Treure matèria 3', exact: true }).click();
      assert.equal(
        await p.getByRole('button', { name: 'Afegir matèria', exact: true }).isEnabled(),
        true,
      );
    });
    failCatalogue = true;
    await run('catalogue-recovery-and-source-gap', width, sample(), async (p) => {
      await p.getByRole('button', { name: 'Tornar a carregar el catàleg', exact: true }).click();
      await p.getByRole('tab', { name: 'Explorar', exact: true }).click();
      await p
        .getByRole('searchbox', { name: 'Cerca una carrera, campus o codi', exact: true })
        .fill('61080');
      await p
        .locator('[data-code="61080"]')
        .getByRole('button', { name: 'Detall i evolució', exact: true })
        .click();
      await p
        .getByRole('dialog')
        .getByText(/El PDF oficial publica coeficients diferents/)
        .waitFor();
      await p.getByRole('dialog').getByRole('button', { name: 'Tancar', exact: true }).click();
      await p.getByRole('searchbox').fill('zzzz-no-degree');
      await p.getByRole('heading', { name: 'Cap grau amb aquests filtres', exact: true }).waitFor();
      if (width < 1000) {
        await p.getByRole('button', { name: 'Més seccions', exact: true }).click();
        await p.getByRole('button', { name: 'PAU i universitat', exact: true }).click();
        assert.equal(
          await p.getByRole('button', { name: 'Més seccions', exact: true }).getAttribute('class'),
          'active',
        );
      }
    });
  }
  for (const [width, height] of [
    [320, 640],
    [820, 1024],
    [568, 320],
  ]) {
    const long = catalogue.degrees
      .filter((d) => d.weights['2027'])
      .toSorted((a, b) => b.name.length - a.name.length)[0];
    await run(
      `small-tablet-landscape-${height}`,
      width,
      sample({
        selected: long.code,
        subjects: [
          { id: 'design-drawing', grade: 8, year: 2027 },
          { id: 'biology', grade: 9, year: 2027 },
          { id: 'chemistry', grade: 8, year: 2027 },
        ],
      }),
      async (p) => {
        await p.setViewportSize({ width, height });
        await p.waitForFunction(() => {
          const t = document.querySelector('.pau-topline .tabs');
          return t && t.scrollWidth <= t.clientWidth + 1;
        });
        await p.getByRole('button', { name: 'Veure ponderacions i càlcul', exact: true }).click();
        const dialog = p.getByRole('dialog');
        await dialog.waitFor();
        const cards = dialog.locator('.pau-weight-card');
        assert.ok((await cards.count()) > 0, 'Subject weighting cards rendered');
        for (const card of await cards.all()) {
          assert.equal(await card.locator('.pau-weight-icon svg').count(), 1);
          assert.match(await card.locator('.pau-weight-coefficient').innerText(), /×0,[12]/);
          assert.match(
            await card.locator('.pau-weight-coefficient').innerText(),
            /Fins a [12] punts/,
          );
          assert.ok(await card.evaluate((el) => el.scrollWidth <= el.clientWidth + 1), 'Card fits');
        }
        await dialog.screenshot({ path: `${out}/${engine}-weights-${width}.png` });
        const box = await dialog.boundingBox();
        assert.ok(
          box.x >= 0 &&
            box.x + box.width <= width + 1 &&
            box.y >= 0 &&
            box.y + box.height <= height + 1,
          'Dialog inside viewport',
        );
        await dialog.getByRole('button', { name: 'Tancar', exact: true }).click();
        await p.getByRole('combobox', { name: 'Matèria 1', exact: true }).click();
        await p
          .getByRole('option', {
            name: 'Dibuix Tècnic Aplicat a les Arts Plàstiques i al Disseny',
            exact: true,
          })
          .click();
        await p.getByRole('tab', { name: 'Explorar', exact: true }).click();
        await p.getByRole('searchbox').fill('31131');
        await p.locator('[data-code="31131"]').waitFor();
        assert.match(await p.locator('[data-code="31131"]').innerText(), /Barcelona/);
        await p.screenshot({
          path: `${out}/${engine}-layout-${width}-${height}.png`,
          fullPage: true,
        });
      },
    );
  }
  await browser.close();
  await fixture.close();
}
const failed = results.filter((r) => !r.passed);
console.log(`${results.length - failed.length}/${results.length} casos PAU verificats.`);
if (failed.length) process.exitCode = 1;
