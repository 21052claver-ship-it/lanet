import assert from 'node:assert/strict';
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { resolve, extname, sep } from 'node:path';
import { chromium, firefox, webkit } from 'playwright';
import { browserFixture } from '../tests/helpers/browser-fixture.mjs';
import { emptyPau } from '../shared/pau.js';
const out = process.env.LANET_TEST_OUTPUT || 'output/pau-history/browser';
mkdirSync(out, { recursive: true });
writeFileSync(`${out}/results.json`, JSON.stringify({ status: 'running', localOnly: true }) + '\n');
const assetRoot = process.env.LANET_TEST_ASSETS ? resolve(process.env.LANET_TEST_ASSETS) : null;
const types = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.mp3': 'audio/mpeg',
  '.ogg': 'audio/ogg',
};
const results = [];
for (const engine of (process.env.LANET_BROWSER_ENGINES || 'chromium,firefox,webkit').split(',')) {
  const browser = await { chromium, firefox, webkit }[engine].launch();
  try {
    for (const width of [1440, 768, 390, 320]) {
      let failHistory = width === 390;
      const fixture = await browserFixture({
        beforeAsset: async (request) => {
          const pathname = new URL(request.url).pathname;
          if (pathname === '/data/pau-history.json' && failHistory) {
            failHistory = false;
            return new Response('Local outage', { status: 503 });
          }
          if (!assetRoot) return null;
          const path = resolve(
            assetRoot,
            '.' + decodeURIComponent(pathname === '/' ? '/index.html' : pathname),
          );
          if (!path.startsWith(assetRoot + sep)) return new Response(null, { status: 404 });
          try {
            return new Response(readFileSync(path), {
              headers: { 'Content-Type': types[extname(path)] || 'application/octet-stream' },
            });
          } catch {
            return new Response(null, { status: 404 });
          }
        },
      });
      fixture.db
        .prepare("INSERT INTO pau_simulations(user_id,value,revision) VALUES('browser',?,1)")
        .run(
          JSON.stringify({
            ...emptyPau(),
            topFive: ['11033', '11119', '11102'],
            selected: '11033',
          }),
        );
      const before = fixture.db
        .prepare("SELECT value,revision FROM pau_simulations WHERE user_id='browser'")
        .get();
      const context = await browser.newContext({
        viewport: { width, height: 900 },
        reducedMotion: 'reduce',
        hasTouch: width < 1000,
      });
      await context.route('**/*', (route) =>
        new URL(route.request().url()).origin === fixture.base ? route.continue() : route.abort(),
      );
      await context.addCookies([
        { name: 'lanet_session', value: fixture.token, url: fixture.base },
      ]);
      const p = await context.newPage();
      p.setDefaultTimeout(15000);
      const errors = [];
      let historyRequests = 0;
      p.on('pageerror', (error) => errors.push(error.message));
      p.on('request', (request) => {
        if (new URL(request.url()).pathname === '/data/pau-history.json') historyRequests++;
      });
      try {
        await p.goto(fixture.base + '/#pau');
        await p
          .locator('[data-choice="11033"]')
          .getByRole('button', { name: 'Detall i evolució', exact: true })
          .waitFor();
        assert.equal(historyRequests, 0, 'History does not load in startup or the unopened top 5');
        await p
          .locator('[data-choice="11033"]')
          .getByRole('button', { name: 'Detall i evolució', exact: true })
          .click();
        const dialog = p.getByRole('dialog');
        if (width === 390) {
          await dialog
            .getByRole('button', { name: 'Tornar a carregar l’històric', exact: true })
            .click();
        }
        await dialog
          .getByRole('region', { name: 'Taula de notes de tall històriques', exact: true })
          .waitFor();
        assert.equal(await dialog.locator('.pau-history-table tbody tr').count(), 5);
        assert.equal(
          await dialog.locator('.pau-history-stats').getByText('9,427', { exact: true }).count(),
          1,
        );
        assert.equal(await dialog.locator('.pau-history-plot circle').count(), 5);
        await dialog
          .getByRole('combobox', { name: 'Assignació de l’històric', exact: true })
          .click();
        await p.getByRole('option', { name: 'Última publicada', exact: true }).click();
        await dialog
          .locator('.pau-history-table td.is-selected a')
          .filter({ hasText: '9,228' })
          .waitFor();
        assert.equal(await dialog.locator('.pau-history-table tbody tr').count(), 5);
        const graphic = await dialog.locator('.pau-history-plot svg').boundingBox();
        assert.ok(graphic.width <= width && graphic.height >= 250, 'Readable responsive chart');
        await dialog.screenshot({ path: `${out}/${engine}-${width}-detail.png` });
        await dialog.getByRole('button', { name: 'Tancar', exact: true }).click();
        await p
          .locator('[data-choice="11119"]')
          .getByRole('button', { name: 'Detall i evolució', exact: true })
          .click();
        await dialog
          .locator('.pau-history-stats')
          .getByText('1/5 anys amb dada', { exact: true })
          .waitFor();
        assert.equal(await dialog.locator('.pau-history-plot circle').count(), 1);
        assert.equal(await dialog.locator('.pau-history-plot polyline').count(), 0);
        await dialog.getByRole('button', { name: 'Comparar codi 11020', exact: true }).click();
        await dialog.locator('.pau-history-table tbody tr').nth(1).waitFor();
        assert.equal(await dialog.locator('.pau-history-plot circle').count(), 5);
        assert.equal(
          await dialog.locator('.pau-history-plot polyline').count(),
          1,
          'Different codes are not joined into a continuous line',
        );
        await dialog.screenshot({ path: `${out}/${engine}-${width}-code-change.png` });
        await dialog.getByRole('button', { name: 'Tancar', exact: true }).click();
        await p.getByText('Comparar l’evolució del meu top 5', { exact: true }).click();
        await p.locator('.pau-history-comparison tbody tr').nth(2).waitFor();
        assert.equal(await p.locator('.pau-history-comparison tbody tr').count(), 3);
        assert.equal(
          historyRequests,
          width === 390 ? 2 : 1,
          'Detail and comparison share one cached catalogue',
        );
        assert.deepEqual(
          fixture.db
            .prepare("SELECT value,revision FROM pau_simulations WHERE user_id='browser'")
            .get(),
          before,
          'History controls never modify private scores or saved top 5',
        );
        assert.deepEqual(errors, []);
        assert.ok(
          await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1),
          'No page overflow',
        );
        await p.screenshot({ path: `${out}/${engine}-${width}-comparison.png`, fullPage: true });
        results.push({
          engine,
          width,
          firstAndLatest: true,
          exactMean: true,
          codeChangesSeparate: true,
          lazyCached: true,
          privateDataPreserved: true,
          pass: true,
        });
      } finally {
        await context.close();
        await fixture.close();
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
console.log(`${results.length} local history scenarios verified.`);
