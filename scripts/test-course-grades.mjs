import { chromium, firefox, webkit } from 'playwright';
import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { browserFixture } from '../tests/helpers/browser-fixture.mjs';

const out = process.env.LANET_TEST_OUTPUT || 'output/course-grades';
mkdirSync(out, { recursive: true });
const results = [];
const engines = { chromium, firefox, webkit };
for (const name of (process.env.LANET_BROWSER_ENGINES || 'chromium,firefox,webkit').split(',')) {
  const fixture = await browserFixture();
  fixture.db.exec(
    "UPDATE grade_entries SET grade=CASE term WHEN 1 THEN 6 WHEN 2 THEN 8 ELSE 10 END WHERE user_id='browser' AND subject_id='math'",
  );
  const browser = await engines[name].launch({ headless: true });
  async function run(label, width, scenario) {
    fixture.db.exec(
      "DELETE FROM grade_bonuses WHERE user_id='browser'; DELETE FROM grade_course_settings WHERE user_id='browser'; DELETE FROM user_preferences WHERE user_id='browser'",
    );
    fixture.db.exec(
      "INSERT INTO grade_course_settings(user_id,subject_id,equal_terms,term1_weight,term2_weight,term3_weight,limit_to_ten) VALUES('browser','math',1,33.33,33.33,33.34,1)",
    );
    const context = await browser.newContext({
      viewport: { width, height: 900 },
      hasTouch: width < 1000,
      reducedMotion: 'reduce',
      acceptDownloads: true,
    });
    await context.route('**/*', (route) =>
      new URL(route.request().url()).origin === fixture.base ||
      route.request().url().startsWith('blob:')
        ? route.continue()
        : route.abort(),
    );
    await context.addCookies([{ name: 'lanet_session', value: fixture.token, url: fixture.base }]);
    const p = await context.newPage();
    p.setDefaultTimeout(10000);
    const errors = [];
    p.on('pageerror', (error) => errors.push(error.message));
    try {
      await p.goto(fixture.base + '/#grades');
      await p.getByRole('tab', { name: 'Nota final', exact: true }).click();
      await scenario(p);
      assert.deepEqual(errors, []);
      assert.ok(
        await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1),
        'No horizontal page overflow',
      );
      results.push({ engine: name, label, width, passed: true });
      console.log(`${name}: ${label} OK`);
    } catch (error) {
      results.push({ engine: name, label, width, passed: false, error: error.message });
      console.error(`${name}: ${label} FAILED ${error.stack || error.message}`);
      await p
        .screenshot({ path: `${out}/${name}-${label}-failed.png`, fullPage: true })
        .catch(() => {});
    } finally {
      await context.close();
      writeFileSync(
        `${out}/course-browser-results.json`,
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
  const card = (p) => p.locator('.course-card[data-subject="math"]');
  async function text(p, locator, value) {
    await locator.waitFor();
    await p.waitForFunction(({ el, value }) => el.textContent.trim() === value, {
      el: await locator.elementHandle(),
      value,
    });
  }
  async function openMath(p) {
    await card(p)
      .getByRole('button', { name: /Plusos i càlcul de/ })
      .click();
    await p.getByRole('dialog', { name: 'Nota final i plusos' }).waitFor();
    return p.getByRole('dialog', { name: 'Nota final i plusos' });
  }
  async function choose(p, control, option) {
    await control.click();
    await p.getByRole('option', { name: option, exact: true }).click();
  }
  async function saved(p, path, action, status = 200) {
    const response = p.waitForResponse((response) => response.url().endsWith('/api' + path));
    response.catch(() => {});
    await action();
    assert.equal((await response).status(), status);
  }
  async function add(p, dialog, title, grade = '') {
    await dialog.getByRole('button', { name: 'Afegir un plus', exact: true }).click();
    await dialog.getByRole('textbox', { name: 'Nom del plus', exact: true }).fill(title);
    await dialog.locator('[aria-label="Nota corregida del nou plus"]').fill(grade);
    await saved(p, '/grades/bonus', () =>
      dialog.getByRole('button', { name: 'Afegir a les meves notes' }).click(),
    );
    await dialog.locator('.add-bonus-form').waitFor({ state: 'detached' });
    return dialog
      .locator('.personal-bonus')
      .filter({ has: p.locator('.personal-bonus-heading strong', { hasText: title }) });
  }
  async function removeAll(p, dialog) {
    while (await dialog.locator('.personal-bonus').count()) {
      const row = dialog.locator('.personal-bonus').first();
      const count = await dialog.locator('.personal-bonus').count();
      await row.getByRole('button', { name: /Treure el plus/ }).click();
      await saved(p, '/grades/bonus/remove', () =>
        row.getByRole('button', { name: 'Treure plus', exact: true }).click(),
      );
      await p.waitForFunction(
        ({ el, count }) => el.querySelectorAll('.personal-bonus').length === count - 1,
        { el: await dialog.elementHandle(), count },
      );
    }
  }
  const marks = () =>
    fixture.db
      .prepare(
        "SELECT * FROM grade_bonuses WHERE user_id='browser' AND subject_id='math' ORDER BY created_at,id",
      )
      .all();
  try {
    for (const width of [320, 390, 820, 1440])
      await run(`annual-layout-${width}`, width, async (p) => {
        assert.equal(await p.locator('.course-card').count(), 7);
        await text(p, card(p).locator('.course-base'), '8,00');
        await text(p, card(p).locator('.course-total-number'), '8,00');
        assert.match(await card(p).locator('.course-state').innerText(), /Completa/);
        const dialog = await openMath(p);
        await text(p, dialog.locator('.course-base'), '8,00');
        const bounds = await dialog.boundingBox();
        assert.ok(bounds.x >= 0 && bounds.x + bounds.width <= width + 1, 'Dialog fits viewport');
        await dialog.getByRole('button', { name: 'Tancar', exact: true }).click();
        if ([320, 1440].includes(width))
          await p.screenshot({ path: `${out}/${name}-annual-${width}.png`, fullPage: true });
      });
    await run('cumulative-custom-and-persistence', 390, async (p) => {
      let dialog = await openMath(p);
      await dialog.locator('.course-settings summary').click();
      await choose(
        p,
        dialog.getByRole('combobox', { name: 'Pes dels trimestres' }),
        'Acumulativa: 16,67% · 33,33% · 50%',
      );
      await saved(p, '/grades/course', () =>
        dialog.getByRole('button', { name: 'Desar el càlcul' }).click(),
      );
      await text(p, dialog.locator('.course-base'), '8,67');
      assert.deepEqual(
        {
          ...fixture.db
            .prepare(
              "SELECT term1_weight,term2_weight,term3_weight FROM grade_course_settings WHERE user_id='browser' AND subject_id='math'",
            )
            .get(),
        },
        { term1_weight: 16.67, term2_weight: 33.33, term3_weight: 50 },
      );
      await choose(
        p,
        dialog.getByRole('combobox', { name: 'Pes dels trimestres' }),
        'Percentatges personalitzats',
      );
      for (const [index, value] of ['20', '30', '49'].entries())
        await dialog.locator(`[aria-label="Pes del trimestre ${index + 1}"]`).fill(value);
      await saved(
        p,
        '/grades/course',
        () => dialog.getByRole('button', { name: 'Desar el càlcul' }).click(),
        400,
      );
      await dialog
        .getByText('Els pesos dels trimestres han de sumar el 100%.', { exact: true })
        .waitFor();
      assert.ok(
        await dialog
          .getByText('Els pesos dels trimestres han de sumar el 100%.', { exact: true })
          .isVisible(),
      );
      await dialog.locator('[aria-label="Pes del trimestre 3"]').fill('50');
      await saved(p, '/grades/course', () =>
        dialog.getByRole('button', { name: 'Desar el càlcul' }).click(),
      );
      await text(p, dialog.locator('.course-base'), '8,60');
      await p.waitForFunction(
        (button) => !button.disabled,
        await dialog.getByRole('button', { name: 'Desar el càlcul' }).elementHandle(),
      );
      await p.reload();
      await p.getByRole('tab', { name: 'Nota final', exact: true }).click();
      dialog = await openMath(p);
      await text(p, dialog.locator('.course-base'), '8,60');
      await dialog.locator('.course-settings summary').click();
      await choose(
        p,
        dialog.getByRole('combobox', { name: 'Pes dels trimestres' }),
        'Iguals: un terç cadascun',
      );
      await saved(p, '/grades/course', () =>
        dialog.getByRole('button', { name: 'Desar el càlcul' }).click(),
      );
      await text(p, dialog.locator('.course-base'), '8,00');
    });
    await run('two-quarters-pending-zero-undo-limit', 390, async (p) => {
      let dialog = await openMath(p);
      await add(p, dialog, 'Lectura corregida', '0,23');
      await text(p, dialog.locator('.course-total-number'), '8,23');
      await dialog.getByRole('button', { name: 'Tancar', exact: true }).click();
      await p.goto(fixture.base + '/#pluses');
      await p.getByRole('button', { name: 'Obrir Activitat local', exact: true }).click();
      await p.getByRole('button', { name: 'Registrar a les meves notes' }).click();
      dialog = p.getByRole('dialog', { name: 'Nota final i plusos' });
      await dialog
        .getByText(
          'Aquest plus no cap en els espais que et queden o ja no està disponible. Revisa els plusos que tens registrats.',
          { exact: true },
        )
        .waitFor();
      assert.equal(await dialog.locator('.add-bonus-form').count(), 0);
      await dialog.getByRole('button', { name: 'Tornar als meus plusos' }).click();
      const pending = await add(p, dialog, 'Presentació pendent');
      assert.equal(marks().filter((row) => row.grade === null).length, 1);
      assert.equal(
        await dialog.getByRole('button', { name: 'Afegir un plus', exact: true }).count(),
        0,
      );
      assert.ok(
        await dialog
          .getByText('Ja tens el màxim de plusos d’aquesta assignatura.', { exact: true })
          .isVisible(),
      );
      await saved(p, '/grades/batch', async () => {
        await pending.locator('input').fill('0');
        await pending.locator('input').press('Tab');
      });
      assert.equal(marks().filter((row) => row.grade === null).length, 0);
      await text(p, dialog.locator('.course-detail-state'), 'Càlcul complet.');
      await saved(p, '/grades/batch', async () => {
        await pending.locator('input').fill('0,24');
        await pending.locator('input').press('Tab');
      });
      await text(p, dialog.locator('.course-total-number'), '8,47');
      await saved(p, '/grades/batch', () =>
        dialog.getByRole('button', { name: 'Desfer l’última nota', exact: true }).click(),
      );
      await text(p, dialog.locator('.course-total-number'), '8,23');
      assert.equal(marks().find((row) => row.title === 'Presentació pendent').grade, 0);
      await removeAll(p, dialog);
      assert.equal(marks().length, 0);
    });
    await run('published-half-private-edit-export', 320, async (p) => {
      await p.goto(fixture.base + '/#pluses');
      await p.getByRole('button', { name: 'Obrir Activitat local', exact: true }).click();
      await p.getByRole('button', { name: 'Registrar a les meves notes' }).click();
      let dialog = p.getByRole('dialog', { name: 'Nota final i plusos' });
      assert.equal(
        await dialog.getByRole('combobox', { name: 'Tipus de plus' }).isDisabled(),
        true,
      );
      await dialog.locator('[aria-label="Nota corregida del nou plus"]').fill('0,40');
      await saved(p, '/grades/bonus', () =>
        dialog.getByRole('button', { name: 'Afegir a les meves notes' }).click(),
      );
      await dialog.locator('.add-bonus-form').waitFor({ state: 'detached' });
      await text(p, dialog.locator('.course-total-number'), '8,40');
      assert.equal(marks()[0].capacity, 2);
      assert.equal(marks()[0].plus_id, 'browser-plus');
      await saved(p, '/preferences', () =>
        dialog.getByRole('switch', { name: 'Mode discret de les notes' }).click(),
      );
      const input = dialog.locator('.bonus-grade-input');
      assert.equal(await input.inputValue(), '');
      assert.match(await dialog.locator('.course-figures').innerText(), /•••/);
      assert.ok(!/8,40|8,00|0,40/.test(await dialog.locator('.course-figures').innerText()));
      await input.focus();
      assert.equal(await input.inputValue(), '');
      await saved(p, '/grades/batch', async () => {
        await input.fill('0,35');
        await input.press('Tab');
      });
      assert.equal(marks()[0].grade, 0.35);
      assert.equal(await input.inputValue(), '');
      await text(
        p,
        dialog.locator('.bonus-save-status'),
        'Les notes corregides es desen en sortir de la casella.',
      );
      await p.reload();
      await p.locator('.page-title h1').waitFor();
      await p.evaluate(() => {
        location.hash = 'grades';
      });
      await p.getByRole('tab', { name: 'Nota final', exact: true }).click();
      assert.equal(
        await p
          .getByRole('switch', { name: 'Mode discret de les notes' })
          .getAttribute('aria-checked'),
        'true',
      );
      assert.ok(!/8,35|8,00|0,35/.test(await card(p).locator('.course-figures').innerText()));
      await p.locator('.grades-toolbar .section-options summary').click();
      let downloads = 0;
      p.on('download', () => downloads++);
      await p.getByRole('button', { name: 'Exportar les notes en CSV' }).click();
      assert.equal(downloads, 0);
      await p.getByText('El CSV contindrà les notes reals.', { exact: true }).waitFor();
      assert.equal(await p.locator('.grades-toolbar .section-options').getAttribute('open'), null);
      assert.ok(
        await p.getByText('El CSV contindrà les notes reals.', { exact: true }).isVisible(),
      );
      const [download] = await Promise.all([
        p.waitForEvent('download'),
        p.getByRole('button', { name: 'Descarregar el CSV amb les notes' }).click(),
      ]);
      assert.equal(download.suggestedFilename(), 'la-net-notes-finals.csv');
      const file = `${out}/${name}-synthetic-export.csv`;
      await download.saveAs(file);
      assert.match(readFileSync(file, 'utf8'), /"8,35"/);
      await p.keyboard.press('Escape');
      const options = p.locator('.grades-toolbar .section-options');
      await options.locator('summary').focus();
      await p.keyboard.press('Enter');
      await options.locator('summary').press('Tab');
      await p.keyboard.press('Tab');
      await options.locator('summary').evaluate((summary) => {
        if (summary.parentElement.open)
          throw new Error('Keyboard focus leaving the menu must close it');
      });
      dialog = await openMath(p);
      assert.equal(await dialog.locator('.bonus-grade-input').inputValue(), '');
      await saved(p, '/preferences', () =>
        dialog.getByRole('switch', { name: 'Mode discret de les notes' }).click(),
      );
      await text(p, dialog.locator('.course-total-number'), '8,35');
      await removeAll(p, dialog);
      assert.equal(
        fixture.db.prepare("SELECT COUNT(*) AS n FROM pluses WHERE id='browser-plus'").get().n,
        1,
      );
    });
    await run('failed-save-navigation-retry-invalid-undo', 390, async (p) => {
      let dialog = await openMath(p);
      await add(p, dialog, 'Connexió i correcció');
      let failed = false;
      await p.route('**/api/grades/batch', async (route) => {
        if (!failed) {
          failed = true;
          await route.fulfill({
            status: 503,
            contentType: 'application/json',
            body: JSON.stringify({ error: 'Connexió de prova interrompuda.' }),
          });
        } else await route.continue();
      });
      await saved(
        p,
        '/grades/batch',
        async () => {
          await dialog.locator('.bonus-grade-input').fill('0,24');
          await dialog.locator('.bonus-grade-input').press('Tab');
        },
        503,
      );
      await dialog.getByRole('button', { name: 'Reintentar', exact: true }).waitFor();
      assert.equal(marks()[0].grade, null);
      await dialog.getByRole('button', { name: 'Tancar', exact: true }).click();
      await p.evaluate(() => {
        location.hash = 'study';
      });
      await p.locator('.record-player').waitFor();
      await p.evaluate(() => {
        location.hash = 'grades';
      });
      await p.getByRole('tab', { name: 'Nota final', exact: true }).click();
      dialog = await openMath(p);
      assert.equal(await dialog.locator('.bonus-grade-input').inputValue(), '0,24');
      await saved(p, '/grades/batch', () =>
        dialog.getByRole('button', { name: 'Reintentar', exact: true }).click(),
      );
      await text(p, dialog.locator('.course-total-number'), '8,24');
      await saved(p, '/grades/batch', () =>
        dialog.getByRole('button', { name: 'Desfer l’última nota', exact: true }).click(),
      );
      assert.equal(marks()[0].grade, null);
      await dialog.locator('.bonus-grade-input').fill('0,26');
      await dialog.locator('.bonus-grade-input').press('Tab');
      await dialog.locator('.bonus-grade-input[aria-invalid="true"]').waitFor();
      assert.equal(marks()[0].grade, null);
      await saved(p, '/grades/batch', async () => {
        await dialog.locator('.bonus-grade-input').fill('0,25');
        await dialog.locator('.bonus-grade-input').press('Tab');
      });
      await text(p, dialog.locator('.course-total-number'), '8,25');
      await p.screenshot({ path: `${out}/${name}-bonus-detail-390.png` });
      await removeAll(p, dialog);
    });
  } finally {
    await browser.close();
    await fixture.close();
  }
}
assert.ok(
  results.length > 0 && results.every((result) => result.passed),
  'Annual grade browser checks must all pass',
);
console.log(`${results.length} annual grade scenarios passed across local browser engines.`);
