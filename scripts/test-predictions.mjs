import { chromium, firefox, webkit } from 'playwright';
import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { randomUUID, createHash } from 'node:crypto';
import { browserFixture } from '../tests/helpers/browser-fixture.mjs';
const out = process.env.LANET_TEST_OUTPUT || 'output/predictions';
mkdirSync(out, { recursive: true });
const results = [];
for (const [engine, launcher] of Object.entries({ chromium, firefox, webkit })) {
  if (
    process.env.LANET_BROWSER_ENGINES &&
    !process.env.LANET_BROWSER_ENGINES.split(',').includes(engine)
  )
    continue;
  const browser = await launcher.launch({ headless: true });
  async function run(label, size, fn) {
    const f = await browserFixture(),
      contexts = [],
      errors = [];
    let now = Math.floor(Date.now() / 1000);
    f.db.function('unixepoch', () => now);
    f.advance = (seconds) => {
      now += seconds;
    };
    const tokens = { browser: f.token };
    for (const [id, name] of [
      ['resolver', 'Responsable de prova'],
      ['bettor', 'Participant de prova'],
    ]) {
      tokens[id] = randomUUID();
      f.db
        .prepare(
          'INSERT INTO users(id,email,name,password_hash,salt,google_sub,configured,group_id) VALUES(?,?,?,?,?,?,1,?)',
        )
        .run(id, `${id}@fje.edu`, name, 'x', 'x', id, '2B');
      f.db
        .prepare("INSERT INTO sessions(hash,user_id,expires,auth_provider) VALUES(?,?,?,'google')")
        .run(createHash('sha256').update(tokens[id]).digest('hex'), id, Date.now() + 3600000);
    }
    f.call = async (path, value, user = 'browser') => {
      const response = await fetch(f.base + '/api/predictions' + path, {
        method: value ? 'POST' : 'GET',
        headers: {
          Cookie: `lanet_session=${tokens[user]}`,
          Origin: f.base,
          'Content-Type': 'application/json',
        },
        ...(value ? { body: JSON.stringify(value) } : {}),
      });
      const data = await response.json();
      assert.equal(response.status, 200, data.error);
      return data;
    };
    f.seed = async () => {
      const m = (
        await f.call('', {
          request_id: randomUUID(),
          title: 'Guanyarà l’equip A el concurs?',
          option_a: 'Equip A',
          option_b: 'Equip B',
          rules:
            'Segons el marcador oficial del concurs. En cas d’empat, retorn de tots els pastissos.',
          resolver_id: 'resolver',
          closes_at: now + 600,
        })
      ).market;
      await f.call(`/${m.id}/actions`, { request_id: randomUUID(), kind: 'accept' }, 'resolver');
      return m;
    };
    async function pageFor(user = 'browser') {
      const context = await browser.newContext({
        viewport: size,
        hasTouch: size.width < 700,
        reducedMotion: 'reduce',
      });
      contexts.push(context);
      await context.route('**/*', (route) =>
        new URL(route.request().url()).origin === f.base ||
        route.request().url().startsWith('blob:')
          ? route.continue()
          : route.abort(),
      );
      await context.addCookies([{ name: 'lanet_session', value: tokens[user], url: f.base }]);
      const page = await context.newPage();
      page.setDefaultTimeout(15000);
      page.on('pageerror', (e) => errors.push(e.message));
      await page.goto(f.base + '/#bakery');
      await page.getByRole('button', { name: 'Entrar a la pastisseria', exact: true }).click();
      await page
        .getByRole('button', { name: 'Aixecar la catifa de la pastisseria', exact: true })
        .click();
      await page.getByRole('heading', { name: 'La sala secreta', exact: true }).waitFor();
      await page.getByRole('button', { name: 'Prediccions A/B', exact: true }).click();
      await page.getByRole('heading', { name: 'Prediccions', exact: true }).waitFor();
      await page.waitForFunction(() => !document.querySelector('.prediction-loading'));
      return page;
    }
    try {
      await fn(f, pageFor);
      assert.deepEqual(errors, []);
      results.push({ engine, label, ...size, passed: true });
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
      for (let i = 0; i < contexts.length; i++)
        await contexts[i]
          .pages()[0]
          ?.screenshot({
            path: `${out}/${engine}-${results.length}-${i}-failure.png`,
            fullPage: true,
          })
          .catch(() => {});
      throw error;
    } finally {
      writeFileSync(
        `${out}/browser-results.json`,
        JSON.stringify(
          { localOnly: true, publicSiteVisited: false, physicalDevice: false, results },
          null,
          2,
        ) + '\n',
      );
      for (const c of contexts) await c.close();
      await f.close();
    }
  }
  try {
    await run(
      'Three users create, accept, stake, close and settle with exact balances',
      { width: 1440, height: 1000 },
      async (f, pageFor) => {
        const creator = await pageFor();
        await creator.getByRole('button', { name: 'Crear predicció', exact: true }).click();
        const dialog = creator.getByRole('dialog');
        await dialog.getByLabel('Pregunta', { exact: true }).fill('Guanyarà l’equip A el concurs?');
        await dialog.getByLabel('Opció A', { exact: true }).fill('Equip A');
        await dialog.getByLabel('Opció B', { exact: true }).fill('Equip B');
        await dialog
          .getByLabel('Criteris del resultat', { exact: true })
          .fill(
            'El marcador oficial del concurs determina el guanyador. En cas d’empat, anul·lar i retornar.',
          );
        await dialog.getByLabel('Responsable del resultat', { exact: true }).fill('Responsable');
        await dialog.getByRole('button', { name: 'Responsable de prova', exact: true }).click();
        await dialog.getByRole('button', { name: 'Enviar proposta', exact: true }).click();
        await creator.locator('.prediction-detail .status-pending').waitFor();
        const m = f.db.prepare('SELECT * FROM prediction_markets').get();
        assert.ok(m);
        assert.equal(await creator.locator('.prediction-bet-form').count(), 0);
        const resolver = await pageFor('resolver');
        await resolver.getByRole('tab', { name: 'Per resoldre', exact: true }).click();
        await resolver.locator('.prediction-card').click();
        await resolver.getByRole('button', { name: 'Acceptar encàrrec', exact: true }).click();
        await resolver.locator('.prediction-detail .status-open').waitFor();
        assert.equal(await resolver.locator('.prediction-bet-form').count(), 0);
        await creator.getByRole('button', { name: 'Actualitzar', exact: true }).click();
        await creator.getByLabel('Pastissos a afegir', { exact: true }).fill('2');
        await creator.getByRole('button', { name: 'Apostar 2 a A', exact: true }).click();
        await creator.waitForFunction(
          () => document.querySelector('.prediction-wallet b')?.textContent === '3',
        );
        const bettor = await pageFor('bettor');
        await bettor.locator('.prediction-card').click();
        await bettor.getByRole('radio', { name: /B Equip B/ }).click();
        await bettor.getByLabel('Pastissos a afegir', { exact: true }).fill('3');
        await bettor.getByRole('button', { name: 'Apostar 3 a B', exact: true }).click();
        await bettor.waitForFunction(
          () => document.querySelector('.prediction-wallet b')?.textContent === '2',
        );
        nowAdvance(f, m.closes_at);
        await resolver.getByRole('button', { name: 'Actualitzar', exact: true }).click();
        await resolver.getByRole('button', { name: 'Confirmar resultat A/B', exact: true }).click();
        const result = resolver.getByRole('dialog');
        await result
          .getByLabel('Justificació i font del resultat', { exact: true })
          .fill('El marcador oficial confirma que ha guanyat l’equip A.');
        await result.getByRole('checkbox').check();
        await result.getByRole('button', { name: 'Confirmar i repartir', exact: true }).click();
        await resolver.locator('.prediction-detail .status-resolved').waitFor();
        await creator.getByRole('button', { name: 'Actualitzar', exact: true }).click();
        await creator.getByText('5 pastissos retornats', { exact: true }).waitFor();
        assert.equal(f.db.prepare("SELECT balance FROM users WHERE id='browser'").get().balance, 8);
        assert.equal(f.db.prepare("SELECT balance FROM users WHERE id='bettor'").get().balance, 2);
        assert.equal(f.db.prepare('SELECT SUM(balance) n FROM users').get().n, 15);
        await creator.screenshot({ path: `${out}/${engine}-settled-desktop.png`, fullPage: true });
      },
    );
    await run(
      'Mobile A/B choice, filters, clean layout and one-sided refunds',
      { width: 390, height: 844 },
      async (f, pageFor) => {
        const m = await f.seed(),
          page = await pageFor();
        assert.equal(
          await page.locator('.prediction-tabs').evaluate((el) => getComputedStyle(el).display),
          'grid',
        );
        const tabBoxes = await page.getByRole('tab').evaluateAll((elements) =>
          elements.map((el) => {
            const r = el.getBoundingClientRect();
            return { x: r.x, right: r.right, y: r.y, height: r.height };
          }),
        );
        assert.ok(
          tabBoxes.every((r) => r.x >= 0 && r.right <= innerViewportLimit(390) && r.height >= 44),
        );
        await page.locator('.prediction-card').click();
        const buttonColors = await page
          .getByRole('button', { name: 'Apostar 1 a A', exact: true })
          .evaluate((el) => ({
            background: getComputedStyle(el).backgroundColor,
            color: getComputedStyle(el).color,
          }));
        assert.equal(buttonColors.background, 'rgb(55, 95, 71)');
        assert.equal(buttonColors.color, 'rgb(255, 251, 237)');
        const radios = page.getByRole('radio');
        await radios.first().focus();
        await radios.first().press('ArrowDown');
        assert.equal(await radios.nth(1).getAttribute('aria-checked'), 'true');
        await page.getByRole('button', { name: 'Apostar 1 a B', exact: true }).click();
        await page.waitForFunction(
          () => document.querySelector('.prediction-wallet b')?.textContent === '4',
        );
        await page.screenshot({ path: `${out}/${engine}-mobile-bet.png`, fullPage: true });
        assert.ok(
          await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1),
        );
        nowAdvance(f, m.closes_at);
        await f.call(
          `/${m.id}/actions`,
          {
            request_id: randomUUID(),
            kind: 'resolve',
            choice: 'A',
            reason: 'Ha guanyat A segons el marcador oficial.',
          },
          'resolver',
        );
        await page.getByRole('button', { name: 'Actualitzar', exact: true }).click();
        await page.getByText('1 pastissos retornats', { exact: true }).waitFor();
        assert.equal(f.db.prepare("SELECT balance FROM users WHERE id='browser'").get().balance, 5);
        await page.getByRole('button', { name: 'Totes les prediccions', exact: true }).click();
        await page.getByRole('tab', { name: 'Finalitzades', exact: true }).click();
        await page.locator('.prediction-card .status-resolved').waitFor();
        await page.getByRole('button', { name: 'Ruleta', exact: true }).click();
        await page.getByRole('button', { name: 'Fer girar la ruleta', exact: true }).waitFor();
      },
    );
    await run(
      'Lost bet response, reload and recovery never debit twice',
      { width: 375, height: 812 },
      async (f, pageFor) => {
        await f.seed();
        const page = await pageFor();
        await page.locator('.prediction-card').click();
        let intercepted = false;
        await page.route('**/api/predictions/*/bets', async (route) => {
          if (!intercepted) {
            intercepted = true;
            const response = await route.fetch();
            assert.equal(response.status(), 200);
            await route.abort('failed');
          } else await route.continue();
        });
        await page.getByRole('button', { name: 'Apostar 1 a A', exact: true }).click();
        await page.getByRole('button', { name: 'Recuperar acció', exact: true }).waitFor();
        assert.equal(f.db.prepare('SELECT COUNT(*) n FROM prediction_bets').get().n, 1);
        await page.reload();
        await page.getByRole('button', { name: 'Entrar a la pastisseria', exact: true }).click();
        await page
          .getByRole('button', { name: 'Aixecar la catifa de la pastisseria', exact: true })
          .click();
        await page.getByRole('button', { name: 'Prediccions A/B', exact: true }).click();
        await page.getByRole('button', { name: 'Recuperar acció', exact: true }).click();
        await page.locator('.prediction-detail .status-open').waitFor();
        await page.waitForFunction(() => !document.querySelector('.prediction-recovery'));
        assert.equal(f.db.prepare('SELECT COUNT(*) n FROM prediction_bets').get().n, 1);
        assert.equal(f.db.prepare("SELECT balance FROM users WHERE id='browser'").get().balance, 4);
        assert.ok(
          await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1),
        );
      },
    );
    await run(
      'Lost creation response reveals recovery and keeps the original proposal',
      { width: 320, height: 720 },
      async (f, pageFor) => {
        const page = await pageFor();
        await page.getByRole('button', { name: 'Crear predicció', exact: true }).click();
        const dialog = page.getByRole('dialog');
        await dialog
          .getByLabel('Pregunta', { exact: true })
          .fill('Guanyarà la classe la prova local?');
        await dialog
          .getByLabel('Criteris del resultat', { exact: true })
          .fill('Segons el marcador oficial de la prova. Si no hi ha guanyador, retornar.');
        await dialog.getByLabel('Responsable del resultat', { exact: true }).fill('Responsable');
        await dialog.getByRole('button', { name: 'Responsable de prova', exact: true }).click();
        let lost = false;
        await page.route('**/api/predictions', async (route) => {
          if (route.request().method() === 'POST' && !lost) {
            lost = true;
            assert.equal((await route.fetch()).status(), 200);
            await route.abort('failed');
          } else await route.continue();
        });
        await dialog.getByRole('button', { name: 'Enviar proposta', exact: true }).click();
        await page.getByRole('button', { name: 'Recuperar acció', exact: true }).click();
        await page.locator('.prediction-detail .status-pending').waitFor();
        await page.waitForFunction(() => !document.querySelector('.prediction-recovery'));
        assert.equal(f.db.prepare('SELECT COUNT(*) n FROM prediction_markets').get().n, 1);
        assert.ok(
          await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1),
        );
        await page.screenshot({
          path: `${out}/${engine}-small-mobile-proposal.png`,
          fullPage: true,
        });
      },
    );
    await run(
      'Lost resolution response recovers the original outcome without a second payout',
      { width: 1280, height: 900 },
      async (f, pageFor) => {
        const m = await f.seed();
        await f.call(`/${m.id}/bets`, { request_id: randomUUID(), choice: 'A', stake: 2 });
        await f.call(
          `/${m.id}/bets`,
          { request_id: randomUUID(), choice: 'B', stake: 3 },
          'bettor',
        );
        f.advance(600);
        const page = await pageFor('resolver');
        await page.locator('.prediction-card').click();
        await page.getByRole('button', { name: 'Confirmar resultat A/B', exact: true }).click();
        const dialog = page.getByRole('dialog');
        await dialog
          .getByLabel('Justificació i font del resultat', { exact: true })
          .fill('L’equip A ha guanyat segons el resultat oficial.');
        await dialog.getByRole('checkbox').check();
        let lost = false;
        await page.route('**/api/predictions/*/actions', async (route) => {
          if (!lost) {
            lost = true;
            assert.equal((await route.fetch()).status(), 200);
            await route.abort('failed');
          } else await route.continue();
        });
        await dialog.getByRole('button', { name: 'Confirmar i repartir', exact: true }).click();
        await page.getByRole('button', { name: 'Recuperar acció', exact: true }).click();
        await page.locator('.prediction-detail .status-resolved').waitFor();
        await page.waitForFunction(() => !document.querySelector('.prediction-recovery'));
        assert.equal(
          f.db.prepare("SELECT COUNT(*) n FROM prediction_actions WHERE kind='resolve'").get().n,
          1,
        );
        assert.equal(f.db.prepare("SELECT balance FROM users WHERE id='browser'").get().balance, 8);
        assert.equal(
          f.db.prepare("SELECT COUNT(*) n FROM ledger WHERE ref LIKE 'prediction:settle:%'").get()
            .n,
          1,
        );
      },
    );
    await run(
      'Resolver cancels, automatic expiry and safe literal question text',
      { width: 768, height: 1024 },
      async (f, pageFor) => {
        const m = await f.seed();
        await f.call(`/${m.id}/bets`, { request_id: randomUUID(), choice: 'A', stake: 3 });
        const page = await pageFor('resolver');
        await page.locator('.prediction-card').click();
        await page
          .getByRole('button', { name: 'Anul·lar i retornar pastissos', exact: true })
          .click();
        const dialog = page.getByRole('dialog');
        await dialog
          .getByLabel('Motiu de l’anul·lació', { exact: true })
          .fill('El concurs s’ha anul·lat oficialment.');
        await dialog.getByRole('checkbox').check();
        await dialog.getByRole('button', { name: 'Anul·lar i retornar', exact: true }).click();
        await page.locator('.prediction-detail .status-cancelled').waitFor();
        assert.equal(f.db.prepare("SELECT balance FROM users WHERE id='browser'").get().balance, 5);
        const escaped = (
          await f.call('', {
            request_id: randomUUID(),
            title: 'Guanya <img src=x onerror=alert(1)>?',
            option_a: 'Sí',
            option_b: 'No',
            rules: 'Segons el resultat oficial. Empat: anul·lar la predicció.',
            resolver_id: 'resolver',
            closes_at: f.db.prepare('SELECT unixepoch() now').get().now + 600,
          })
        ).market;
        await page.getByRole('button', { name: 'Totes les prediccions', exact: true }).click();
        await page.getByRole('tab', { name: 'Taules', exact: true }).click();
        await page.getByRole('button', { name: 'Actualitzar', exact: true }).click();
        await page.getByRole('heading', { name: escaped.title, exact: true }).waitFor();
        assert.equal(await page.locator('.prediction-card img').count(), 0);
        const next = await f.seed();
        await f.call(`/${next.id}/bets`, { request_id: randomUUID(), choice: 'B', stake: 2 });
        f.advance(600 + 7 * 86400);
        await f.call('/' + next.id);
        assert.equal(f.db.prepare("SELECT balance FROM users WHERE id='browser'").get().balance, 5);
        assert.ok(
          await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1),
        );
      },
    );
  } finally {
    await browser.close();
  }
}
function nowAdvance(f, closes) {
  const current = f.db.prepare('SELECT unixepoch() now').get().now;
  f.advance(closes - current);
}
function innerViewportLimit(width) {
  return width + 1;
}
console.log(`${results.length} prediction browser scenarios passed.`);
