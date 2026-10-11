import { chromium, firefox, webkit } from 'playwright';
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { browserFixture } from '../tests/helpers/browser-fixture.mjs';
import { emptyPau } from '../shared/pau.js';
import { currentPauProfile, degreeOutlook } from '../shared/pau-outlook.js';
const out = process.env.LANET_TEST_OUTPUT || 'output/pau-top5';
mkdirSync(out, { recursive: true });
const catalogue = JSON.parse(readFileSync('public/data/pau.json', 'utf8'));
const codes = catalogue.degrees.slice(0, 6).map((d) => d.code),
  results = [];
const chosen = catalogue.degrees.find(
  (d) => d.weights['2027']?.math === 0.2 && d.weights['2027']?.chemistry === 0.2 && d.cutoff > 10,
);
async function select(p, label, option) {
  await p.getByRole('combobox', { name: label, exact: true }).click();
  await p.getByRole('option', { name: option, exact: true }).click();
}
for (const [engine, type] of Object.entries({ chromium, firefox, webkit })) {
  const browser = await type.launch({ headless: true });
  for (const scenario of [
    'empty-without-grades',
    'five-reorder-persist',
    'live-estimate-privacy',
    'source-and-incomplete',
    'unknown-and-conflicting',
    'conflict-recovery',
    'legacy-objective',
    'invalid-simulation',
  ]) {
    const fixture = await browserFixture();
    const width =
      scenario === 'five-reorder-persist' ? 1440 : scenario === 'empty-without-grades' ? 320 : 390;
    const context = await browser.newContext({
      viewport: { width, height: 900 },
      hasTouch: width < 1000,
      reducedMotion: 'reduce',
    });
    await context.route('**/*', (r) =>
      new URL(r.request().url()).origin === fixture.base || r.request().url().startsWith('blob:')
        ? r.continue()
        : r.abort(),
    );
    await context.addCookies([{ name: 'lanet_session', value: fixture.token, url: fixture.base }]);
    const p = await context.newPage();
    p.setDefaultTimeout(12000);
    const errors = [];
    p.on('pageerror', (e) => errors.push(e.message));
    const store = (v) =>
      fixture.db
        .prepare("INSERT INTO pau_simulations(user_id,value,revision) VALUES('browser',?,1)")
        .run(JSON.stringify(v));
    const save = async () => {
      await p.getByRole('button', { name: 'Desar preferències', exact: true }).click();
      await p.getByText('Preferències i simulació PAU desades.', { exact: true }).waitFor();
    };
    const load = async () => {
      await p.goto(fixture.base + '/#pau');
      await p.locator('.pau-choices').waitFor();
      await p.getByRole('button', { name: 'Explorar graus', exact: true }).waitFor();
    };
    try {
      if (scenario === 'invalid-simulation')
        store({
          ...emptyPau(),
          orientationSource: 'simulation',
          average: 8,
          general: 8,
          topFive: [chosen.code],
        });
      if (scenario === 'empty-without-grades')
        fixture.db.exec("DELETE FROM grade_entries WHERE user_id='browser'");
      if (scenario === 'live-estimate-privacy' || scenario === 'source-and-incomplete')
        store({ ...emptyPau(), topFive: [chosen.code] });
      if (scenario === 'unknown-and-conflicting')
        store({ ...emptyPau(), topFive: ['99999', '61080'] });
      if (scenario === 'conflict-recovery') store({ ...emptyPau(), topFive: [codes[0], codes[1]] });
      if (scenario === 'legacy-objective') {
        const legacy = emptyPau();
        delete legacy.topFive;
        delete legacy.orientationSource;
        legacy.selected = codes[0];
        store(legacy);
      }
      await load();
      if (scenario === 'empty-without-grades') {
        await p.getByRole('heading', { name: 'On t’agradaria estudiar?', exact: true }).waitFor();
        assert.equal(
          await p
            .getByRole('tab', { name: 'El meu top 5', exact: true })
            .getAttribute('aria-selected'),
          'true',
        );
        assert.equal(await p.locator('.pau-outlook progress').count(), 0);
        await p.getByRole('button', { name: 'Explorar graus', exact: true }).click();
        await p.getByRole('searchbox').fill(codes[0]);
        await p
          .locator(`[data-code="${codes[0]}"]`)
          .getByRole('button', { name: 'Afegir al top 5', exact: true })
          .click();
        await p.getByRole('tab', { name: 'El meu top 5', exact: true }).click();
        await save();
        await p.reload();
        await p.locator(`[data-choice="${codes[0]}"]`).waitFor();
        assert.equal(await p.locator('.pau-outlook progress').count(), 0);
      } else if (scenario === 'five-reorder-persist') {
        await p.getByRole('tab', { name: 'Explorar', exact: true }).click();
        for (const code of codes.slice(0, 5)) {
          await p.getByRole('searchbox').fill(code);
          await p
            .locator(`[data-code="${code}"]`)
            .getByRole('button', { name: 'Afegir al top 5', exact: true })
            .click();
        }
        await p.getByRole('searchbox').fill(codes[5]);
        assert.equal(
          await p
            .locator(`[data-code="${codes[5]}"]`)
            .getByRole('button', { name: 'Top 5 complet', exact: true })
            .isDisabled(),
          true,
        );
        await p.getByRole('tab', { name: 'El meu top 5', exact: true }).click();
        await p.getByRole('button', { name: 'Pujar opció 5', exact: true }).click();
        await p.getByRole('button', { name: 'Treure opció 2', exact: true }).click();
        const expected = [codes[0], codes[2], codes[4], codes[3]];
        await save();
        await p.reload();
        await p.locator('.pau-choice').first().waitFor();
        assert.deepEqual(
          await p.locator('.pau-choice').evaluateAll((els) => els.map((e) => e.dataset.choice)),
          expected,
        );
        assert.deepEqual(
          JSON.parse(
            fixture.db.prepare("SELECT value FROM pau_simulations WHERE user_id='browser'").get()
              .value,
          ).topFive,
          expected,
        );
      } else if (scenario === 'live-estimate-privacy') {
        const enrolled = fixture.db
          .prepare(
            "SELECT DISTINCT s.* FROM subjects s JOIN offerings o ON o.subject_id=s.id JOIN enrollments e ON e.offering_id=o.id WHERE e.user_id='browser'",
          )
          .all();
        const profile = currentPauProfile(
          {
            grades: fixture.db.prepare("SELECT * FROM grade_entries WHERE user_id='browser'").all(),
          },
          enrolled,
        );
        const expected = degreeOutlook(emptyPau(), chosen, profile);
        assert.ok(expected.ready);
        const card = p.locator(`[data-choice="${chosen.code}"]`);
        await card.locator('progress').waitFor();
        assert.equal(
          await card.locator('progress').getAttribute('value'),
          String(expected.percent),
        );
        await p.getByRole('switch', { name: 'Mode discret de les notes' }).click();
        await card
          .getByText('Orientació personal oculta · mode discret', { exact: true })
          .waitFor();
        await p.waitForFunction(() => !document.querySelector('.grade-privacy-toggle').disabled);
        assert.equal(await p.locator('.pau-outlook progress,.pau-outlook-numbers').count(), 0);
        assert.equal(
          await p
            .locator('.pau-orientation-base')
            .getByText(/de mitjana provisional/)
            .count(),
          0,
        );
        await p.reload();
        await p.locator('.pau-choice').waitFor();
        assert.equal(await p.locator('.pau-outlook progress').count(), 0);
        await p.getByRole('switch', { name: 'Mode discret de les notes' }).click();
        await p.locator('.pau-outlook progress').waitFor();
        await p.waitForFunction(() => !document.querySelector('.grade-privacy-toggle').disabled);
        fixture.db
          .prepare("UPDATE grade_entries SET grade=9 WHERE user_id='browser' AND grade IS NOT NULL")
          .run();
        await p.reload();
        await p.locator('.pau-outlook progress').waitFor();
        assert.notEqual(
          await p.locator('.pau-outlook progress').getAttribute('value'),
          String(expected.percent),
        );
      } else if (scenario === 'source-and-incomplete') {
        await p.locator('.pau-outlook progress').waitFor();
        await p.getByText('Base i criteri de l’orientació', { exact: true }).click();
        await select(p, 'Base de l’orientació', 'La meva simulació PAU');
        await p
          .getByText('Completa la simulació a La meva nota per comparar-la.', { exact: true })
          .waitFor();
        assert.equal(await p.locator('.pau-outlook progress').count(), 0);
        await save();
        await p.getByRole('tab', { name: 'La meva nota', exact: true }).click();
        await p.getByRole('textbox', { name: 'Mitjana de batxillerat', exact: true }).fill('8');
        await p.getByRole('textbox', { name: 'Mitjana de la fase d’accés', exact: true }).fill('8');
        await p.getByRole('tab', { name: 'El meu top 5', exact: true }).click();
        await p.locator('.pau-outlook progress').waitFor();
        await p.getByText('Admissió simulada', { exact: false }).waitFor();
      } else if (scenario === 'unknown-and-conflicting') {
        await p.locator('[data-choice="99999"]').waitFor();
        await p.getByText('Grau fora del catàleg', { exact: true }).waitFor();
        assert.equal(await p.locator('[data-choice="61080"] progress').count(), 0);
        await p
          .locator('[data-choice="61080"]')
          .getByRole('button', { name: 'Ponderacions i detall', exact: true })
          .click();
        await p
          .getByRole('dialog')
          .getByText(/El PDF oficial publica coeficients diferents/)
          .waitFor();
        await p.getByRole('dialog').getByRole('button', { name: 'Tancar', exact: true }).click();
        await p.getByRole('button', { name: 'Treure opció 1', exact: true }).click();
        await save();
        assert.deepEqual(
          JSON.parse(
            fixture.db.prepare("SELECT value FROM pau_simulations WHERE user_id='browser'").get()
              .value,
          ).topFive,
          ['61080'],
        );
      } else if (scenario === 'conflict-recovery') {
        await p.getByRole('button', { name: 'Pujar opció 2', exact: true }).click();
        fixture.db
          .prepare("UPDATE pau_simulations SET value=?,revision=2 WHERE user_id='browser'")
          .run(JSON.stringify({ ...emptyPau(), topFive: [codes[2]] }));
        await p.getByRole('button', { name: 'Desar preferències', exact: true }).click();
        await p
          .getByRole('button', {
            name: 'Recuperar versió desada (substitueix aquests canvis)',
            exact: true,
          })
          .click();
        await p.locator(`[data-choice="${codes[2]}"]`).waitFor();
        assert.equal(await p.locator('.pau-choice').count(), 1);
      } else if (scenario === 'invalid-simulation') {
        await p.locator('.pau-outlook progress').waitFor();
        await p.getByRole('tab', { name: 'La meva nota', exact: true }).click();
        await p.getByRole('textbox', { name: 'Mitjana de batxillerat', exact: true }).fill('99');
        await p.getByRole('tab', { name: 'El meu top 5', exact: true }).click();
        await p
          .getByText('Revisa les dades de La meva nota; pots continuar triant graus.', {
            exact: true,
          })
          .waitFor();
        assert.equal(await p.locator('.pau-outlook progress').count(), 0);
        await p.getByRole('tab', { name: 'Explorar', exact: true }).click();
        await p.getByRole('searchbox').fill(chosen.code);
        await p
          .locator(`[data-code="${chosen.code}"]`)
          .getByText('Revisa les dades de La meva nota; pots continuar triant graus.', {
            exact: true,
          })
          .waitFor();
        assert.equal(await p.locator('.pau-outlook progress').count(), 0);
      } else {
        await p.locator(`[data-choice="${codes[0]}"]`).waitFor();
        await p.getByRole('button', { name: 'Treure opció 1', exact: true }).click();
        await save();
        await p.reload();
        await p.getByRole('heading', { name: 'On t’agradaria estudiar?', exact: true }).waitFor();
      }
      assert.deepEqual(errors, []);
      assert.ok(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
      await p.screenshot({ path: `${out}/${engine}-${scenario}-${width}.png`, fullPage: true });
      results.push({ engine, scenario, width, passed: true });
      console.log(`${engine}: ${scenario} OK`);
    } catch (e) {
      results.push({ engine, scenario, width, passed: false, error: e.message });
      console.error(`${engine}: ${scenario} FAILED ${e.stack}`);
      await p
        .screenshot({ path: `${out}/${engine}-${scenario}-${width}-failed.png`, fullPage: true })
        .catch(() => {});
    } finally {
      await context.close();
      await fixture.close();
      writeFileSync(
        `${out}/top5-browser-results.json`,
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
assert.equal(results.length, 24);
assert.ok(results.every((r) => r.passed));
console.log('24 top 5 browser scenarios passed.');
