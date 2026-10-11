import { chromium, firefox, webkit } from 'playwright';
import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { browserFixture } from '../tests/helpers/browser-fixture.mjs';

const out = process.env.LANET_TEST_OUTPUT || 'output/contents';
mkdirSync(out, { recursive: true });
const results = [];
const engines = { chromium, firefox, webkit };
for (const engine of (process.env.LANET_BROWSER_ENGINES || 'chromium,firefox,webkit').split(',')) {
  const browser = await engines[engine].launch({ headless: true });
  async function run(label, width, role, fn, height = 900) {
    const fixture = await browserFixture();
    fixture.db.prepare("UPDATE users SET role=? WHERE id='browser'").run(role);
    const context = await browser.newContext({
      viewport: { width, height },
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
      await page.goto(fixture.base + '/#notes');
      await page.getByRole('heading', { name: 'Continguts', exact: true }).waitFor();
      await fn(page, fixture);
      assert.deepEqual(errors, []);
      results.push({ engine, label, width, height, passed: true });
      console.log(`✓ ${engine}: ${label} ${width}x${height}`);
    } catch (e) {
      results.push({ engine, label, width, height, passed: false, error: e.message });
      await page.screenshot({
        path: `${out}/${engine}-${results.length}-failure.png`,
        fullPage: true,
      });
      writeFileSync(`${out}/contents-browser-results.json`, JSON.stringify({ results }, null, 2));
      throw e;
    } finally {
      await context.close();
      await fixture.close();
    }
  }
  const choose = async (page, label, option) => {
    await page.getByRole('combobox', { name: label, exact: true }).click();
    await page.getByRole('option', { name: option, exact: true }).click();
  };
  const tab = async (page, name) => {
    await page.getByRole('tab', { name, exact: true }).click();
    await page.locator('.library-caption').waitFor();
  };
  const close = async (page) => {
    await page
      .getByRole('dialog')
      .getByRole('button', { name: 'Tancar', exact: true })
      .first()
      .click();
    await page.getByRole('dialog').waitFor({ state: 'hidden' });
  };
  const fill = async (page, title = 'Moviment rectilini local') => {
    await page.getByRole('textbox', { name: 'Títol del recurs', exact: true }).fill(title);
    await choose(page, 'Assignatura del recurs', 'Física');
    await page.getByRole('textbox', { name: 'Tema del recurs', exact: true }).fill('Cinemàtica');
    await page
      .getByRole('textbox', { name: 'Resum del recurs', exact: true })
      .fill('Relacions per a acceleració constant.');
    await page
      .getByRole('textbox', { name: 'Font o bibliografia', exact: true })
      .fill('Bibliografia de física del centre');
    await page
      .getByRole('textbox', { name: 'Enllaç de la font', exact: true })
      .fill('https://example.edu/physics');
    await page.getByRole('button', { name: 'Afegir fórmula', exact: true }).click();
    await page.getByRole('textbox', { name: 'Nom de la fórmula 1', exact: true }).fill('Velocitat');
    await page
      .getByRole('textbox', { name: 'Expressió de la fórmula 1', exact: true })
      .fill('v = v₀ + a·t');
    await page
      .getByRole('textbox', { name: 'Explicació de la fórmula 1', exact: true })
      .fill('Acceleració constant. v en m/s; a en m/s²; t en segons.');
  };
  async function createPending(page) {
    await tab(page, 'Formularis');
    await page.getByRole('button', { name: 'Revisió del grup', exact: true }).click();
    await page.getByRole('button', { name: 'Nou formulari', exact: true }).click();
    await fill(page);
    await page.getByRole('button', { name: 'Previsualitzar', exact: true }).click();
    await page.locator('.formula-expression').waitFor();
    assert.equal(await page.locator('.formula-expression').textContent(), 'v = v₀ + a·t');
    await page.getByRole('button', { name: 'Enviar a revisió', exact: true }).click();
    await page.getByRole('dialog').waitFor({ state: 'hidden' });
    await page
      .getByRole('button', { name: 'Editar Moviment rectilini local', exact: true })
      .waitFor();
  }
  async function publish(page) {
    await page
      .getByRole('button', { name: 'Editar Moviment rectilini local', exact: true })
      .click();
    await page.getByRole('button', { name: 'Aprovar i publicar', exact: true }).click();
    await page.getByRole('dialog').waitFor({ state: 'hidden' });
  }
  try {
    await run(
      'Materials conservats i fonts filtrades per assignatura i tema',
      1440,
      'student',
      async (page) => {
        assert.equal(
          await page
            .getByRole('tab', { name: 'Materials', exact: true })
            .getAttribute('aria-selected'),
          'true',
        );
        await page.getByRole('button', { name: 'Obrir PDF de prova local', exact: true }).click();
        await page.getByRole('dialog').waitFor();
        await close(page);
        await tab(page, 'Formularis');
        assert.equal(
          await page.getByRole('button', { name: 'Revisió del grup', exact: true }).count(),
          0,
        );
        await choose(page, 'Assignatura de la biblioteca', 'Totes les assignatures');
        assert.equal(await page.locator('.library-card').count(), 5);
        await choose(page, 'Assignatura de la biblioteca', 'Química');
        assert.equal(await page.locator('.library-card').count(), 2);
        await choose(page, 'Tema de la biblioteca', 'Equilibri químic');
        assert.equal(await page.locator('.library-card').count(), 1);
        await page.getByRole('button', { name: 'Consultar Equilibri químic', exact: true }).click();
        const link = page.getByRole('dialog').getByRole('link', { name: /Obrir la font original/ });
        assert.equal(
          await link.getAttribute('href'),
          'https://openstax.org/books/chemistry-2e/pages/14-key-equations',
        );
        assert.equal(await link.getAttribute('rel'), 'noopener noreferrer');
        assert.equal(await page.locator('.library-review-stamp').count(), 0);
        await page.screenshot({ path: `${out}/${engine}-formula-reference.png`, fullPage: true });
        await close(page);
        await tab(page, 'Eines i webs');
        await choose(page, 'Assignatura de la biblioteca', 'Totes les assignatures');
        assert.equal(await page.locator('.library-card').count(), 7);
        await page
          .getByRole('textbox', { name: 'Cercar a la biblioteca', exact: true })
          .fill('optimot');
        assert.equal(await page.locator('.library-card').count(), 1);
      },
    );
    for (const [width, height] of [
      [320, 640],
      [390, 844],
      [820, 900],
      [568, 320],
    ])
      await run(
        'Navegació, filtres i diàlegs dins la pantalla',
        width,
        'student',
        async (page) => {
          const tabs = page.getByRole('tablist', { name: 'Apartats de Continguts', exact: true });
          await tabs.getByRole('tab', { name: 'Materials', exact: true }).focus();
          await page.keyboard.press('ArrowRight');
          await page.locator('.library-caption').waitFor();
          assert.equal(
            await tabs
              .getByRole('tab', { name: 'Formularis', exact: true })
              .getAttribute('aria-selected'),
            'true',
          );
          const measures = await page.evaluate(() => {
            const tabs = document.querySelector('.contents-sections');
            return {
              width: innerWidth,
              scroll: document.documentElement.scrollWidth,
              tabs: tabs.scrollWidth,
              client: tabs.clientWidth,
              nav: [...document.querySelectorAll('.bottom-nav button')].map((b) => ({
                scroll: b.scrollWidth,
                client: b.clientWidth,
              })),
            };
          });
          assert.ok(measures.scroll <= width + 1, JSON.stringify(measures));
          assert.ok(measures.tabs <= measures.client + 1, JSON.stringify(measures));
          assert.ok(
            measures.nav.every((b) => b.scroll <= b.client + 1),
            JSON.stringify(measures),
          );
          await choose(page, 'Assignatura de la biblioteca', 'Física');
          await page
            .getByRole('button', { name: 'Consultar Formulari fonamental de física', exact: true })
            .click();
          const box = await page.getByRole('dialog').boundingBox();
          assert.ok(
            box.x >= 0 &&
              box.x + box.width <= width + 1 &&
              box.y >= 0 &&
              box.y + box.height <= height + 1,
          );
          await close(page);
          await tab(page, 'Eines i webs');
          if (width === 390)
            await page.screenshot({ path: `${out}/${engine}-tools-mobile.png`, fullPage: true });
        },
        height,
      );
    await run(
      'Delegat: crear, previsualitzar, enviar a revisió i aprovar',
      1440,
      'delegate',
      async (page, fixture) => {
        await createPending(page);
        assert.equal(
          fixture.db.prepare('SELECT published FROM content_library').get().published,
          null,
        );
        await publish(page);
        await page.getByRole('button', { name: 'Veure biblioteca', exact: true }).click();
        await page
          .getByRole('button', { name: 'Consultar Moviment rectilini local', exact: true })
          .click();
        await page.locator('.library-review-stamp').waitFor();
        assert.ok(
          (await page.locator('.library-review-stamp').textContent()).includes(
            'Usuari de prova local',
          ),
        );
        assert.equal(await page.locator('.formula-expression').textContent(), 'v = v₀ + a·t');
        await page.screenshot({ path: `${out}/${engine}-reviewed-formula.png`, fullPage: true });
        await close(page);
        await page.reload();
        await page.getByRole('heading', { name: 'Continguts', exact: true }).waitFor();
        await tab(page, 'Formularis');
        assert.ok(
          await page
            .getByRole('button', { name: 'Consultar Moviment rectilini local', exact: true })
            .isVisible(),
        );
      },
    );
    await run(
      'Edició pendent conserva la publicació i mostra historial',
      390,
      'delegate',
      async (page, fixture) => {
        await createPending(page);
        await publish(page);
        await page
          .getByRole('button', { name: 'Editar Moviment rectilini local', exact: true })
          .click();
        await page
          .getByRole('textbox', { name: 'Títol del recurs', exact: true })
          .fill('Versió nova pendent');
        assert.equal(
          await page.getByRole('button', { name: 'Aprovar i publicar', exact: true }).count(),
          0,
        );
        await page.getByRole('button', { name: 'Enviar a revisió', exact: true }).click();
        await page.getByRole('dialog').waitFor({ state: 'hidden' });
        const stored = fixture.db.prepare('SELECT * FROM content_library').get();
        assert.equal(JSON.parse(stored.published).title, 'Moviment rectilini local');
        await page.getByRole('button', { name: 'Editar Versió nova pendent', exact: true }).click();
        await page.getByRole('button', { name: 'Versió publicada', exact: true }).click();
        assert.ok(
          await page.getByRole('button', { name: 'Aprovar i publicar', exact: true }).isDisabled(),
        );
        assert.ok((await page.getByRole('dialog').textContent()).includes('Velocitat'));
        await page.getByText('Historial de revisions', { exact: true }).click();
        assert.ok(
          await page
            .getByRole('dialog')
            .getByText(/Aprovat i publicat/)
            .isVisible(),
        );
        await page.getByRole('button', { name: 'Retornar a esborrany', exact: true }).click();
        await page.getByRole('dialog').waitFor({ state: 'hidden' });
        assert.equal(fixture.db.prepare('SELECT state FROM content_library').get().state, 'draft');
      },
    );
    await run(
      'Conflicte de revisió conserva els canvis locals',
      1440,
      'delegate',
      async (page, fixture) => {
        await createPending(page);
        await page
          .getByRole('button', { name: 'Editar Moviment rectilini local', exact: true })
          .click();
        await page
          .getByRole('textbox', { name: 'Títol del recurs', exact: true })
          .fill('Canvi local pendent');
        fixture.db.exec('UPDATE content_library SET revision=revision+1');
        await page.getByRole('button', { name: 'Enviar a revisió', exact: true }).click();
        await page.getByRole('dialog').getByRole('alert').waitFor();
        assert.equal(
          await page.getByRole('textbox', { name: 'Títol del recurs', exact: true }).inputValue(),
          'Canvi local pendent',
        );
        assert.equal(
          JSON.parse(fixture.db.prepare('SELECT draft FROM content_library').get().draft).title,
          'Moviment rectilini local',
        );
        page.once('dialog', (d) => d.accept());
        await close(page);
      },
    );
    await run(
      'Previsualització segura i avís abans de descartar',
      390,
      'delegate',
      async (page) => {
        await tab(page, 'Formularis');
        await page.getByRole('button', { name: 'Revisió del grup', exact: true }).click();
        await page.getByRole('button', { name: 'Nou formulari', exact: true }).click();
        await fill(page, '<img src=x onerror=alert(1)>');
        await page
          .getByRole('textbox', { name: 'Expressió de la fórmula 1', exact: true })
          .fill('<script>alert(1)</script>');
        await page
          .getByRole('textbox', { name: 'Enllaç de la font', exact: true })
          .fill('javascript:alert(1)');
        await page.getByRole('button', { name: 'Previsualitzar', exact: true }).click();
        assert.equal(await page.getByRole('dialog').locator('script,img').count(), 0);
        assert.equal(await page.getByRole('dialog').getByRole('link').count(), 0);
        await page.getByRole('button', { name: 'Enviar a revisió', exact: true }).click();
        await page.getByRole('dialog').getByRole('alert').waitFor();
        page.once('dialog', (d) => d.dismiss());
        await page
          .getByRole('dialog')
          .getByRole('button', { name: 'Tancar', exact: true })
          .first()
          .click();
        assert.ok(await page.getByRole('dialog').isVisible());
        page.once('dialog', (d) => d.accept());
        await close(page);
      },
    );
    await run('Recuperació d’error de càrrega', 1440, 'student', async (page) => {
      let failNext = true;
      await page.route('**/api/library', async (route) => {
        if (!failNext) {
          await route.fallback();
          return;
        }
        failNext = false;
        await route.fulfill({
          status: 503,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Error local de prova' }),
        });
      });
      await page.getByRole('tab', { name: 'Formularis', exact: true }).click();
      await page.getByRole('alert').waitFor();
      await page.getByRole('button', { name: 'Tornar-ho a provar', exact: true }).click();
      await page.locator('.library-card').first().waitFor();
      assert.equal(await page.getByRole('alert').count(), 0);
    });
    await run(
      'Eines del grup segueixen el mateix procés de revisió',
      1440,
      'delegate',
      async (page) => {
        await tab(page, 'Eines i webs');
        await page.getByRole('button', { name: 'Revisió del grup', exact: true }).click();
        await page.getByRole('button', { name: 'Nova eina', exact: true }).click();
        for (const [name, text] of [
          ['Títol del recurs', 'Eina del grup local'],
          ['Tema del recurs', 'Pràctica'],
          ['Resum del recurs', 'Una eina del centre.'],
          ['Font o bibliografia', 'Departament del centre'],
          ['Enllaç de la font', 'https://example.edu/tool'],
        ])
          await page.getByRole('textbox', { name, exact: true }).fill(text);
        await page.getByRole('button', { name: 'Enviar a revisió', exact: true }).click();
        await page.getByRole('dialog').waitFor({ state: 'hidden' });
        await page.getByRole('button', { name: 'Editar Eina del grup local', exact: true }).click();
        await page.getByRole('button', { name: 'Aprovar i publicar', exact: true }).click();
        await page.getByRole('dialog').waitFor({ state: 'hidden' });
        await page.getByRole('button', { name: 'Veure biblioteca', exact: true }).click();
        await page
          .getByRole('button', { name: 'Consultar Eina del grup local', exact: true })
          .click();
        assert.equal(
          await page.getByRole('dialog').getByRole('link').getAttribute('href'),
          'https://example.edu/tool',
        );
        await close(page);
      },
    );
  } finally {
    await browser.close();
  }
}
writeFileSync(
  `${out}/contents-browser-results.json`,
  JSON.stringify({ date: new Date().toISOString(), localOnly: true, results }, null, 2) + '\n',
);
console.log(`${results.length} escenaris de Continguts verificats.`);
