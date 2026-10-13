import { chromium, firefox, webkit } from 'playwright';
import assert from 'node:assert/strict';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { browserFixture } from '../tests/helpers/browser-fixture.mjs';

const out = process.env.LANET_TEST_OUTPUT || 'output/student-guide/browser';
mkdirSync(out, { recursive: true });
const results = [];
for (const [name, engine] of Object.entries({ chromium, firefox, webkit })) {
  const fixture = await browserFixture();
  fixture.db.exec(
    "UPDATE grade_entries SET grade=CASE term WHEN 1 THEN 6 WHEN 2 THEN 8 ELSE 10 END WHERE subject_id='math' AND user_id='browser'",
  );
  const browser = await engine.launch({ headless: true });
  try {
    for (const width of [320, 390, 820, 1440]) {
      const context = await browser.newContext({
        viewport: { width, height: 1000 },
        acceptDownloads: true,
        reducedMotion: 'reduce',
      });
      await context.route('**/*', (route) =>
        new URL(route.request().url()).origin === fixture.base ||
        route.request().url().startsWith('blob:')
          ? route.continue()
          : route.abort(),
      );
      await context.route('**/api/bootstrap', async (route) => {
        assert.equal(new URL(route.request().url()).origin, fixture.base);
        const response = await route.fetch();
        const data = await response.json();
        await route.fulfill({ response, json: { ...data, today: '2026-10-13' } });
      });
      await context.addCookies([
        { name: 'lanet_session', value: fixture.token, url: fixture.base },
      ]);
      const p = await context.newPage();
      p.setDefaultTimeout(10000);
      const errors = [];
      p.on('pageerror', (e) => errors.push(e.message));
      const fits = async () =>
        assert.ok(
          await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1),
          'Fits viewport',
        );
      try {
        await p.goto(fixture.base + '/#schedule');
        await p.getByRole('tab', { name: 'Agenda', exact: true }).click();
        await p.locator('.school-calendar > summary').click();
        assert.ok(
          await p
            .getByRole('heading', { name: 'Trimestrals · 1a avaluació', exact: true })
            .isVisible(),
        );
        await p.getByLabel('Incloure dates passades').check();
        assert.equal(await p.locator('.school-date').count(), 13);
        const calendarDownload = p.waitForEvent('download');
        await p.getByRole('button', { name: 'Exportar dates del curs' }).click();
        assert.match(
          readFileSync(await (await calendarDownload).path(), 'utf8'),
          /DTEND;VALUE=DATE:20270505/,
        );
        await fits();
        await p.screenshot({ path: `${out}/${name}-calendar-${width}.png`, fullPage: true });
        await p.goto(fixture.base + '/#grades');
        await p.getByRole('tab', { name: 'Nota final', exact: true }).click();
        const card = p.locator('.course-card[data-subject="math"]');
        assert.equal((await card.locator('.course-base').innerText()).trim(), '8,67');
        assert.match(await card.innerText(), /Acumulativa · pesos orientatius/);
        await p.getByRole('tab', { name: 'Recerca', exact: true }).click();
        for (const [part, value] of [
          ['Seguiment', '6'],
          ['Dossier', '8'],
          ['Exposició oral', '9'],
          ['Pòster', '10'],
        ])
          await p.getByRole('textbox', { name: `TR · ${part}`, exact: true }).fill(value);
        assert.equal((await p.locator('.research-result > strong').innerText()).trim(), '7,75');
        await p.getByRole('button', { name: 'Desar notes del TR' }).click();
        await p.getByText('Notes del TR desades en aquest navegador.', { exact: true }).waitFor();
        await p.reload();
        await p.getByRole('tab', { name: 'Recerca', exact: true }).click();
        assert.equal(
          await p.getByRole('textbox', { name: 'TR · Dossier', exact: true }).inputValue(),
          '8',
        );
        const pref = p.waitForResponse((r) => r.url().endsWith('/api/preferences'));
        await p.getByRole('switch', { name: 'Mode discret de les notes' }).click();
        assert.equal((await pref).status(), 200);
        const input = p.getByRole('textbox', { name: 'TR · Dossier', exact: true });
        await p.waitForFunction(() => document.querySelector('.research-parts input').value === '');
        await input.focus();
        assert.equal(await input.inputValue(), '');
        await input.fill('8,5');
        await input.press('Tab');
        assert.equal(await input.inputValue(), '');
        assert.match(await p.locator('.research-result > strong').innerText(), /•••/);
        await p.getByRole('button', { name: 'Desar notes del TR' }).click();
        if (width === 390) {
          await input.fill('11');
          await input.press('Tab');
          assert.equal(
            await p.getByRole('button', { name: 'Desar notes del TR' }).isDisabled(),
            true,
          );
          await input.fill('8,5');
          await input.press('Tab');
          await p.evaluate(() => {
            Storage.prototype.setItem = () => {
              throw new Error('Local storage blocked by fixture');
            };
          });
          await p.getByRole('button', { name: 'Desar notes del TR' }).click();
          await p
            .getByText('No s’han pogut desar. Conserva les notes abans de sortir.', { exact: true })
            .waitFor();
        }
        await p.getByRole('heading', { name: 'Treball de Recerca', exact: true }).click();
        await fits();
        await p.screenshot({
          path: `${out}/${name}-research-private-${width}.png`,
          fullPage: true,
        });
        await p.goto(fixture.base + '/#notes');
        await p.getByRole('tab', { name: 'Guia del curs', exact: true }).click();
        await p.getByRole('heading', { name: 'Com s’avaluen les teves matèries' }).waitFor();
        assert.equal(await p.locator('.school-resource-grid a').count(), 4);
        if (width <= 390)
          assert.equal(
            await p.locator('.contents-sections').evaluate((el) => getComputedStyle(el).display),
            'grid',
          );
        await fits();
        await p.screenshot({ path: `${out}/${name}-guide-${width}.png`, fullPage: true });
        await p.goto(fixture.base + '/#pau');
        await p.locator('.school-calendar > summary').click();
        assert.equal(await p.locator('.school-date').count(), 5);
        await fits();
        assert.deepEqual(errors, []);
        results.push({ engine: name, width, passed: true });
        console.log(
          `${name} ${width}: calendar, export, cumulative, TR, privacy, resources, PAU OK`,
        );
      } catch (error) {
        results.push({ engine: name, width, passed: false, error: error.message });
        console.error(error.stack);
        await p
          .screenshot({ path: `${out}/${name}-${width}-failed.png`, fullPage: true })
          .catch(() => {});
      } finally {
        await context.close();
        fixture.db.exec("DELETE FROM user_preferences WHERE user_id='browser'");
        writeFileSync(
          `${out}/results.json`,
          JSON.stringify({ localOnly: true, results }, null, 2) + '\n',
        );
      }
    }
  } finally {
    await browser.close();
    await fixture.close();
  }
}
assert.ok(
  results.every((r) => r.passed),
  'Student guide regressions failed',
);
