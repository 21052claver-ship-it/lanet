import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { chromium, firefox, webkit } from 'playwright';
import { browserFixture } from '../tests/helpers/browser-fixture.mjs';

const out = process.env.LANET_TEST_OUTPUT || 'output/workspace-recovery';
mkdirSync(out, { recursive: true });
const results = [];
function gate() {
  let release;
  const promise = new Promise((resolve) => (release = resolve));
  return { promise, release };
}
for (const [engine, launcher] of Object.entries({ chromium, firefox, webkit })) {
  const browser = await launcher.launch();
  async function check(name, size, run) {
    const fixture = await browserFixture();
    const context = await browser.newContext({ viewport: size, reducedMotion: 'reduce' });
    await context.route('**/*', (route) =>
      new URL(route.request().url()).origin === fixture.base ? route.continue() : route.abort(),
    );
    await context.addCookies([{ name: 'lanet_session', value: fixture.token, url: fixture.base }]);
    const page = await context.newPage(),
      errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    try {
      await page.goto(fixture.base + '/#notes');
      await page.locator('.page-title h1').waitFor();
      await run(page, fixture);
      assert.deepEqual(errors, []);
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
      results.push({ engine, name, size, passed: true });
      console.log(`${engine}: ${name} passed`);
    } catch (error) {
      results.push({ engine, name, size, passed: false, error: error.message });
      await page.screenshot({ path: `${out}/${engine}-${name}-failed.png`, fullPage: true });
      throw error;
    } finally {
      await context.close();
      await fixture.close();
    }
  }
  try {
    await check('subject-preferences', { width: 320, height: 640 }, async (page) => {
      await page.getByRole('button', { name: /Perfil de/ }).click();
      await page.getByRole('tab', { name: 'Assignatures', exact: true }).click();
      const picker = page.locator('.subject-picker').first();
      const marks = () =>
        picker
          .locator('.subject-mark')
          .evaluateAll((els) => els.map((el) => el.getBoundingClientRect().width));
      const original = await marks();
      assert.ok(
        original.length > 10 &&
          original.every((width) => Math.abs(width - original[0]) < 1 && width <= 40),
      );
      await picker.getByRole('button', { name: 'Cap', exact: true }).click();
      assert.deepEqual(await marks(), original);
      await picker.getByRole('button', { name: 'Totes', exact: true }).click();
      assert.deepEqual(await marks(), original);
      const search = picker.getByRole('textbox');
      await search.fill('fisica');
      assert.equal(await picker.getByRole('checkbox', { name: 'Física', exact: true }).count(), 1);
      await search.fill('historia art');
      assert.equal(
        await picker.getByRole('checkbox', { name: 'Història de l’art', exact: true }).count(),
        1,
      );
      await search.fill('zzzz');
      await picker.getByRole('status').filter({ hasText: 'Cap assignatura' }).waitFor();
      await search.fill('');
      await picker.getByRole('button', { name: 'Les del meu curs', exact: true }).click();
      await page.screenshot({ path: `${out}/${engine}-subject-preferences.png` });
      await page.getByRole('button', { name: 'Desar preferències', exact: true }).click();
      await page.getByRole('dialog').waitFor({ state: 'hidden' });
      await page.getByRole('button', { name: /Perfil de/ }).click();
      await page.getByRole('tab', { name: 'Assignatures', exact: true }).click();
      assert.equal(
        await page
          .locator('.subject-picker')
          .first()
          .getByRole('checkbox', { checked: true })
          .count(),
        7,
      );
    });
    for (const width of [320, 1440])
      await check(`dialog-race-${width}`, { width, height: 900 }, async (page, fixture) => {
        const sent = gate(),
          finish = gate();
        await page.route('**/api/notes', async (route) => {
          if (route.request().method() !== 'POST') return route.continue();
          sent.release();
          await finish.promise;
          await route.continue();
        });
        try {
          await page.getByRole('button', { name: 'Comparteix un apunt', exact: true }).click();
          await page
            .getByRole('textbox', { name: 'Títol', exact: true })
            .fill('Recurs de prova de concurrència');
          await page
            .getByRole('textbox', { name: 'Text dels apunts', exact: true })
            .fill('Contingut local per verificar un desament lent.');
          await page.getByRole('button', { name: 'Publicar apunts', exact: true }).click();
          await sent.promise;
          await page.getByRole('button', { name: 'Cancel·lar', exact: true }).click();
          await page.getByRole('button', { name: /Perfil de/ }).click();
          const saved = page.waitForResponse((response) =>
            response.url().endsWith('/api/bootstrap'),
          );
          finish.release();
          await saved;
          await page.waitForFunction(() =>
            document.querySelector('.toast')?.textContent.includes('Apunts publicats'),
          );
          await page.getByRole('dialog', { name: 'El meu perfil', exact: true }).waitFor();
          assert.equal(
            fixture.db
              .prepare(
                "SELECT COUNT(*) AS n FROM notes WHERE title='Recurs de prova de concurrència'",
              )
              .get().n,
            1,
          );
          await page.getByRole('button', { name: 'Fet', exact: true }).click();
          await page.getByRole('dialog').waitFor({ state: 'hidden' });
        } finally {
          finish.release();
        }
      });
    await check('editor-loading-recovery', { width: 320, height: 640 }, async (page) => {
      const started = gate(),
        finish = gate();
      let fail = true;
      await page.route('**/api/notes/browser-note', async (route) => {
        started.release();
        await finish.promise;
        if (fail) await route.abort();
        else await route.continue();
      });
      try {
        await page.getByRole('button', { name: 'Editar PDF de prova local', exact: true }).click();
        await started.promise;
        const dialog = page.getByRole('dialog');
        for (const control of [
          dialog.getByRole('textbox', { name: 'Títol', exact: true }),
          dialog.locator('input[type=file]'),
          dialog.getByRole('combobox', { name: 'Assignatura', exact: true }),
        ])
          assert.equal(await control.isDisabled(), true);
        finish.release();
        await dialog.getByRole('alert').waitFor();
        assert.equal(await dialog.locator('input[type=file]').isDisabled(), true);
        fail = false;
        await dialog.getByRole('button', { name: 'Tornar a carregar', exact: true }).click();
        await dialog.getByRole('textbox', { name: 'Text dels apunts', exact: true }).waitFor();
        await page.waitForFunction(() => !document.querySelector('.note-editor-fields')?.disabled);
        assert.equal(await dialog.locator('input[type=file]').isDisabled(), false);
        assert.ok(
          (
            await dialog
              .getByRole('textbox', { name: 'Text dels apunts', exact: true })
              .inputValue()
          ).includes('Text de prova segur'),
        );
        await dialog.getByText('prova-local.pdf', { exact: true }).waitFor();
      } finally {
        finish.release();
      }
    });
    await check('offline-form-retry', { width: 390, height: 844 }, async (page, fixture) => {
      let attempts = 0,
        fail = true;
      await page.route('**/api/notes', async (route) => {
        if (route.request().method() !== 'POST') return route.continue();
        attempts++;
        if (fail) await route.abort();
        else await route.continue();
      });
      await page.getByRole('button', { name: 'Comparteix un apunt', exact: true }).click();
      await page
        .getByRole('textbox', { name: 'Títol', exact: true })
        .fill('Esborrany conservat sense connexió');
      await page
        .getByRole('textbox', { name: 'Text dels apunts', exact: true })
        .fill('Text de prova que es conserva després de l’error.');
      await page.getByRole('button', { name: 'Publicar apunts', exact: true }).click();
      await page
        .getByRole('dialog')
        .getByRole('alert')
        .filter({ hasText: 'No hem pogut confirmar l’acció' })
        .waitFor();
      assert.equal(attempts, 1);
      assert.equal(
        await page.getByRole('textbox', { name: 'Títol', exact: true }).inputValue(),
        'Esborrany conservat sense connexió',
      );
      assert.equal(
        fixture.db
          .prepare(
            "SELECT COUNT(*) AS n FROM notes WHERE title='Esborrany conservat sense connexió'",
          )
          .get().n,
        0,
      );
      fail = false;
      await page.getByRole('button', { name: 'Publicar apunts', exact: true }).click();
      await page.getByRole('dialog').waitFor({ state: 'hidden' });
      assert.equal(attempts, 2);
      assert.equal(
        fixture.db
          .prepare(
            "SELECT COUNT(*) AS n FROM notes WHERE title='Esborrany conservat sense connexió'",
          )
          .get().n,
        1,
      );
    });
    await check(
      'admin-recovery-and-ordering',
      { width: 390, height: 844 },
      async (page, fixture) => {
        fixture.db.exec(
          "UPDATE users SET role='admin',name='Responsable local antic' WHERE id='browser'",
        );
        let mode = 'fail';
        const started = gate(),
          finish = gate();
        await page.route('**/api/admin', async (route) => {
          if (mode === 'fail') return route.abort();
          if (mode !== 'hold') return route.continue();
          mode = 'normal';
          const response = await route.fetch();
          started.release();
          await finish.promise;
          await route.fulfill({
            response,
            headers: { ...response.headers(), 'x-lanet-test-late': '1' },
          });
        });
        try {
          // A hash-only navigation keeps the student bootstrap. Reload the
          // fixture identity immediately rather than waiting for the 30s sync.
          await page.goto(fixture.base + '/?audit=admin#admin');
          await page.getByRole('alert').waitFor();
          mode = 'normal';
          await page.getByRole('button', { name: 'Tornar-ho a provar', exact: true }).click();
          await page.getByRole('alert').waitFor({ state: 'hidden' });
          mode = 'hold';
          await page.getByRole('tab', { name: 'Revisions', exact: true }).click();
          await started.promise;
          fixture.db.exec(
            "UPDATE users SET name='Responsable local actualitzat' WHERE id='browser'",
          );
          await page.getByRole('tab', { name: 'Comptes', exact: true }).click();
          await page.getByRole('cell', { name: /Responsable local actualitzat/ }).waitFor();
          const old = page.waitForResponse(
            (response) => response.headers()['x-lanet-test-late'] === '1',
          );
          finish.release();
          await (await old).finished();
          await page.evaluate(
            () =>
              new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))),
          );
          assert.equal(
            await page.getByRole('cell', { name: /Responsable local actualitzat/ }).count(),
            1,
          );
          assert.equal(await page.getByRole('alert').count(), 0);
        } finally {
          finish.release();
        }
      },
    );
    await check('logout-recovery', { width: 390, height: 844 }, async (page, fixture) => {
      const started = gate(),
        finish = gate();
      let attempts = 0,
        fail = true;
      await page.route('**/api/auth/logout', async (route) => {
        attempts++;
        started.release();
        await finish.promise;
        if (fail) await route.abort();
        else await route.continue();
      });
      try {
        await page.getByRole('button', { name: 'Sortir', exact: true }).click();
        await started.promise;
        assert.equal(
          await page.getByRole('button', { name: 'Sortint…', exact: true }).isDisabled(),
          true,
        );
        finish.release();
        await page
          .getByRole('alert')
          .filter({ hasText: 'No hem pogut confirmar l’acció' })
          .waitFor();
        assert.equal(attempts, 1);
        assert.equal(
          fixture.db.prepare("SELECT COUNT(*) AS n FROM sessions WHERE user_id='browser'").get().n,
          1,
        );
        fail = false;
        await page.getByRole('button', { name: 'Sortir', exact: true }).click();
        await page.getByRole('button', { name: /Google/ }).waitFor();
        assert.equal(attempts, 2);
        assert.equal(
          fixture.db.prepare("SELECT COUNT(*) AS n FROM sessions WHERE user_id='browser'").get().n,
          0,
        );
      } finally {
        finish.release();
      }
    });
  } finally {
    writeFileSync(`${out}/results.json`, JSON.stringify({ results }, null, 2));
    await browser.close();
  }
}
console.log(`${results.length} workspace recovery scenarios verified.`);
