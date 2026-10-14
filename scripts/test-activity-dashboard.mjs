import assert from 'node:assert/strict';
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { chromium, firefox, webkit } from 'playwright';
import { browserFixture } from '../tests/helpers/browser-fixture.mjs';
import { recordActivity } from '../worker/activity.js';
const out = process.env.LANET_TEST_OUTPUT || 'output/activity-dashboard/browser';
mkdirSync(out, { recursive: true });
writeFileSync(
  `${out}/results.json`,
  JSON.stringify({ status: 'running', localOnly: true, date: new Date().toISOString() }) + '\n',
);
const results = [];
for (const engine of (process.env.LANET_BROWSER_ENGINES || 'chromium,firefox,webkit').split(',')) {
  const browser = await { chromium, firefox, webkit }[engine].launch();
  try {
    for (const width of [1280, 390, 320]) {
      const f = await browserFixture({
        beforeAsset: async (request) =>
          new URL(request.url).pathname === '/admin'
            ? new Response(readFileSync('dist-pages/index.html'), {
                headers: { 'Content-Type': 'text/html;charset=UTF-8' },
              })
            : null,
      });
      const context = await browser.newContext({
        viewport: { width, height: 850 },
        reducedMotion: 'reduce',
      });
      await context.route('**/*', (route) =>
        new URL(route.request().url()).origin === f.base ? route.continue() : route.abort(),
      );
      await context.addCookies([{ name: 'lanet_session', value: f.token, url: f.base }]);
      const p = await context.newPage();
      if (width === 1280) await p.clock.install();
      p.setDefaultTimeout(15000);
      const errors = [];
      p.on('pageerror', (error) => errors.push(error.message));
      try {
        await p.goto(f.base + '/admin');
        await p
          .getByText('Aquest espai només està disponible per al compte autoritzat.', {
            exact: true,
          })
          .waitFor();
        assert.equal((await context.request.get(f.base + '/api/admin/analytics')).status(), 403);
        assert.equal(
          await p.getByRole('heading', { name: 'Usuaris per dia', exact: true }).count(),
          0,
        );
        f.db.prepare("UPDATE users SET email='21052.claver@fje.edu' WHERE id='browser'").run();
        const env = {
          DB: {
            prepare(query) {
              return {
                bind(...args) {
                  return { run: async () => ({ meta: f.db.prepare(query).run(...args) }) };
                },
              };
            },
          },
        };
        const now = Date.now();
        for (let i = 0; i < 61; i++) {
          const id = 'local-' + String(i).padStart(3, '0');
          f.db
            .prepare(
              "INSERT INTO users(id,email,name,password_hash,salt,google_sub) VALUES(?,?,'Persona fictícia','x','x',?)",
            )
            .run(id, id + '@example.invalid', id);
          await recordActivity(env, { id }, 'study', 'pulse', now);
          for (let d = 1; d <= i % 7; d++)
            await recordActivity(env, { id }, 'notes', 'pulse', now - d * 86400000);
        }
        await p.reload();
        await p.getByRole('heading', { name: 'Usuaris per dia', exact: true }).waitFor();
        assert.equal(await p.locator('.activity-chart > span').count(), 30);
        assert.equal(
          await p
            .locator('.activity-section')
            .filter({
              has: p.getByRole('heading', { name: 'Activitat de les persones', exact: true }),
            })
            .locator('tbody tr')
            .count(),
          50,
        );
        await p.getByRole('button', { name: 'Següents persones', exact: true }).click();
        await p.getByRole('button', { name: 'Primera pàgina', exact: true }).waitFor();
        await p.waitForFunction(
          () =>
            document.querySelectorAll('.activity-section')[3].querySelectorAll('tbody tr')
              .length === 12,
        );
        await p.getByRole('button', { name: 'Primera pàgina', exact: true }).click();
        await p.getByRole('button', { name: 'Següents persones', exact: true }).waitFor();
        await p.getByRole('combobox', { name: 'Període d’activitat' }).click();
        await p.getByRole('option', { name: 'Últims 7 dies', exact: true }).click();
        await p.waitForFunction(
          () => document.querySelectorAll('.activity-chart > span').length === 7,
        );
        let fail = true;
        await p.route('**/api/admin/analytics?*', async (route) => {
          if (fail) {
            fail = false;
            await route.fulfill({
              status: 503,
              contentType: 'application/json',
              body: JSON.stringify({ error: 'Error local recuperable.' }),
            });
          } else await route.continue();
        });
        await p.getByRole('button', { name: 'Actualitzar', exact: true }).click();
        await p.getByText('Error local recuperable.', { exact: true }).waitFor();
        assert.equal(await p.locator('.activity-chart > span').count(), 7);
        await p.getByRole('button', { name: 'Actualitzar', exact: true }).click();
        await p.getByText('Error local recuperable.', { exact: true }).waitFor({ state: 'hidden' });
        assert.deepEqual(errors, []);
        assert.ok(
          await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1),
          'No page overflow',
        );
        await p.screenshot({ path: `${out}/${engine}-${width}.png`, fullPage: true });
        if (width === 1280) {
          await p.goto(f.base + '/#schedule');
          await p.getByRole('button', { name: 'Dashboard privat', exact: true }).click();
          await p.getByRole('heading', { name: 'Usuaris per dia', exact: true }).waitFor();
          assert.equal(new URL(p.url()).pathname, '/admin');
          await p.goBack();
          await p
            .getByRole('heading', { name: 'Usuaris per dia', exact: true })
            .waitFor({ state: 'hidden' });
          let reads = 0;
          p.on('request', (request) => {
            if (new URL(request.url()).pathname === '/api/bootstrap') reads++;
          });
          await p.clock.fastForward(10 * 60000);
          assert.equal(reads, 0, 'Idle tabs must not poll the full bootstrap');
          await p.locator('main').click({ position: { x: 5, y: 5 } });
          const refreshed = p.waitForResponse(
            (response) => new URL(response.url()).pathname === '/api/bootstrap',
          );
          await p.clock.fastForward(120000);
          assert.equal((await refreshed).status(), 200);
          assert.equal(reads, 1, 'An active tab performs one periodic read');
          await p.clock.fastForward(30000);
          assert.equal(reads, 1, 'No return to 30-second polling');
        }
        results.push({
          engine,
          width,
          privateAccess: true,
          pagination: true,
          recovery: true,
          noOverflow: true,
          pass: true,
        });
      } finally {
        await context.close();
        await f.close();
      }
    }
  } finally {
    await browser.close();
  }
}
writeFileSync(
  `${out}/results.json`,
  JSON.stringify({ date: new Date().toISOString(), localOnly: true, results }, null, 2) + '\n',
);
console.log(`${results.length} local dashboard scenarios verified.`);
