import assert from 'node:assert/strict';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { chromium, firefox, webkit } from 'playwright';
import { browserFixture } from '../tests/helpers/browser-fixture.mjs';

const out = process.env.LANET_TEST_OUTPUT || 'output/contents-downloads/browser';
mkdirSync(out, { recursive: true });
const results = [],
  engines = { chromium, firefox, webkit };
for (const engine of (process.env.LANET_BROWSER_ENGINES || 'chromium,firefox,webkit').split(',')) {
  const browser = await engines[engine].launch();
  try {
    for (const width of [320, 1440]) {
      const f = await browserFixture();
      f.db.exec(
        "INSERT INTO notes(id,author_id,subject_id,title,body,summary) VALUES('other-pdf-note','browser','math','Un altre PDF local','Text fictici','Un segon document local.'); INSERT INTO files(id,owner_id,name,mime,size,object_key,note_id,preview) SELECT 'other-pdf','browser','segon-local.pdf',mime,size,'fixture/other-pdf','other-pdf-note',1 FROM files WHERE id='browser-pdf';",
      );
      f.files.set('fixture/other-pdf', f.files.get('fixture/pdf'));
      const context = await browser.newContext({
        viewport: { width, height: 950 },
        hasTouch: width < 1000,
        reducedMotion: 'reduce',
        acceptDownloads: true,
      });
      await context.route('**/*', (r) =>
        new URL(r.request().url()).origin === f.base || r.request().url().startsWith('blob:')
          ? r.continue()
          : r.abort(),
      );
      await context.addCookies([{ name: 'lanet_session', value: f.token, url: f.base }]);
      const p = await context.newPage();
      p.setDefaultTimeout(10000);
      const fileRequests = [],
        downloads = [],
        errors = [],
        stages = [];
      let stage = 'schedule';
      p.on('request', (r) => {
        const u = new URL(r.url());
        if (u.pathname.startsWith('/api/files/'))
          fileRequests.push({ path: u.pathname + u.search, type: r.resourceType(), stage });
      });
      p.on('download', (d) => downloads.push(d.suggestedFilename()));
      p.on('pageerror', (e) => errors.push(e.message));
      async function passive(name, expectedFiles = 0, expectedDownloads = 0) {
        stage = name;
        await p.getByRole('heading', { name: 'Continguts', exact: true }).waitFor();
        await p.locator('.note-card').first().waitFor();
        for (const card of await p.locator('.note-card').all()) await card.scrollIntoViewIfNeeded();
        await p.waitForLoadState('networkidle');
        assert.equal(
          await p.locator('.notes-grid iframe, .notes-grid object, .notes-grid embed').count(),
          0,
          name + ': no native document navigation in cards',
        );
        assert.equal(fileRequests.length, expectedFiles, name + ': no unsolicited file request');
        assert.equal(downloads.length, expectedDownloads, name + ': no unsolicited download');
        assert.equal(await p.getByRole('dialog').count(), 0, name + ': no material opened');
        stages.push(name);
      }
      try {
        await p.goto(f.base + '/?subject=math#schedule');
        await p.getByRole('heading', { name: 'El teu horari', exact: true }).waitFor();
        assert.equal(fileRequests.length, 0);
        stage = 'single-contents-click';
        await p.getByRole('button', { name: 'Continguts', exact: true }).click();
        await passive(stage);
        await p.getByRole('button', { name: 'Continguts', exact: true }).click();
        await passive('repeated-contents-click');
        await p
          .getByRole('button', { name: width < 1000 ? 'Curs' : 'Horari i agenda', exact: true })
          .click();
        await p.getByRole('heading', { name: 'El teu horari', exact: true }).waitFor();
        await p.goBack();
        await passive('history-back');
        await p.goForward();
        await p.getByRole('heading', { name: 'El teu horari', exact: true }).waitFor();
        await p.getByRole('button', { name: 'Continguts', exact: true }).click();
        await passive('return-from-schedule');
        await p.getByRole('tab', { name: 'Formularis', exact: true }).click();
        await p.locator('.library-caption').waitFor();
        await p.getByRole('tab', { name: 'Materials', exact: true }).click();
        await passive('materials-tab');
        await p
          .getByRole('textbox', { name: 'Cercar apunts', exact: true })
          .fill('PDF de prova local');
        await passive('search');
        await p.getByRole('combobox', { name: 'Ordenar apunts', exact: true }).click();
        await p.getByRole('option', { name: 'Més agradats', exact: true }).click();
        await passive('sort');
        await p.getByRole('textbox', { name: 'Cercar apunts', exact: true }).fill('');
        await p.getByRole('button', { name: 'Totes les assignatures', exact: true }).click();
        await passive('all-subjects');
        await p.reload();
        await passive('reload');
        await p.locator('.note-pdf-cover').first().scrollIntoViewIfNeeded();
        const covers = await p.locator('.note-pdf-cover').evaluateAll((items) =>
          items.map((el) => {
            const box = el.getBoundingClientRect(),
              icon = el.firstElementChild.getBoundingClientRect(),
              label = el.lastElementChild.getBoundingClientRect();
            return (
              icon.top >= box.top &&
              icon.bottom + 4 <= label.top &&
              label.bottom <= box.bottom &&
              label.left >= box.left &&
              label.right <= box.right
            );
          }),
        );
        assert.ok(
          covers.length === 2 && covers.every(Boolean),
          'PDF covers fit without overlapping text',
        );
        assert.ok(
          await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1),
          'Cards fit the viewport',
        );
        await p.screenshot({ path: `${out}/${engine}-${width}-listing.png` });

        stage = 'explicit-reader';
        const response = p.waitForResponse(
          (r) => new URL(r.url()).pathname === '/api/files/browser-pdf',
        );
        await p.getByRole('button', { name: 'Obrir PDF de prova local', exact: true }).click();
        assert.match(
          (await response).headers()['content-disposition'],
          /^attachment;/,
          'Retain the secure server disposition',
        );
        await p.waitForFunction(() => {
          const c = document.querySelector('.pdf-preview canvas');
          return c && c.width > 100 && c.height > 100;
        });
        await p.getByText('La Net local PDF compatibility check', { exact: true }).waitFor();
        await p.waitForLoadState('networkidle');
        assert.ok(
          fileRequests.some((r) => r.stage === 'explicit-reader' && r.type !== 'document'),
          'PDF.js fetches the explicitly opened PDF',
        );
        assert.equal(downloads.length, 0, 'Reading is not a download');
        assert.ok(
          !fileRequests.some((r) => r.path.startsWith('/api/files/other-pdf')),
          'An unopened PDF remains unloaded',
        );
        stage = 'explicit-download';
        const waiting = p.waitForEvent('download');
        await p.locator('.pdf-toolbar a[href$="?download=1"]').click();
        const download = await waiting;
        // Suggested filenames vary by browser; identify the download by its exact bytes and URL.
        const path = `${out}/${engine}-${width}-explicit.pdf`;
        await download.saveAs(path);
        assert.equal(await download.failure(), null);
        const bytes = readFileSync(path);
        assert.deepEqual(
          bytes,
          f.files.get('fixture/pdf'),
          'The explicitly chosen PDF is downloaded intact',
        );
        assert.equal(bytes.subarray(0, 5).toString(), '%PDF-');
        assert.equal(
          bytes.length,
          f.db.prepare("SELECT size FROM files WHERE id='browser-pdf'").get().size,
        );
        assert.equal(downloads.length, 1, 'Exactly one explicit download');
        assert.ok(
          fileRequests.some(
            (r) =>
              r.path === '/api/files/browser-pdf?download=1' && r.stage === 'explicit-download',
          ),
        );
        await p.keyboard.press('Escape');
        await p.getByRole('dialog').waitFor({ state: 'hidden' });
        await p.waitForLoadState('networkidle');
        await passive('return-after-reader', fileRequests.length, 1);
        assert.deepEqual(errors, []);
        results.push({
          engine,
          width,
          passed: true,
          passiveStages: stages,
          unsolicitedFileRequests: 0,
          unsolicitedDownloads: 0,
          explicitDownloads: downloads.length,
          fileRequests,
        });
        console.log(`${engine} ${width}: no automatic PDF; explicit reader/download OK`);
      } catch (e) {
        results.push({
          engine,
          width,
          passed: false,
          error: e.message,
          fileRequests,
          downloads,
          stages,
          errors,
        });
        await p.screenshot({ path: `${out}/${engine}-${width}-failed.png` });
        console.error(`${engine} ${width}: FAILED ${e.message}`);
      } finally {
        await context.unrouteAll({ behavior: 'wait' });
        await context.close();
        await f.close();
        writeFileSync(
          `${out}/results.json`,
          JSON.stringify(
            { localOnly: true, publicAppVisited: false, realDevicesTested: false, results },
            null,
            2,
          ) + '\n',
        );
      }
    }
  } finally {
    await browser.close();
  }
}
assert.ok(
  results.length > 0 && results.every((r) => r.passed),
  'All PDF navigation/download regressions must pass',
);
