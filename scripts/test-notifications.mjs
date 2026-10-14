import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { chromium, firefox, webkit } from 'playwright';
import { browserFixture } from '../tests/helpers/browser-fixture.mjs';

const out = process.env.LANET_TEST_OUTPUT || 'output/notifications/browser';
mkdirSync(out, { recursive: true });
const results = [];
function notice(f, id, { read = null, event = null, date = '2026-10-15T12:00:00.000Z' } = {}) {
  f.db
    .prepare(
      'INSERT INTO agenda_notifications(id,user_id,event_id,title,body,read_at,created_at) VALUES(?,?,?,?,?,?,?)',
    )
    .run(id, 'browser', event, `Avís ${id}`, 'Resultat de prova local', read, date);
}
for (const engine of (process.env.LANET_BROWSER_ENGINES || 'chromium,firefox,webkit').split(',')) {
  const browser = await { chromium, firefox, webkit }[engine].launch();
  try {
    for (const width of [320, 1440]) {
      async function run(name, fn) {
        const f = await browserFixture();
        const context = await browser.newContext({
          viewport: { width, height: 950 },
          reducedMotion: 'reduce',
        });
        await context.route('**/*', (route) =>
          new URL(route.request().url()).origin === f.base ? route.continue() : route.abort(),
        );
        await context.addCookies([{ name: 'lanet_session', value: f.token, url: f.base }]);
        const p = await context.newPage(),
          errors = [];
        p.on('pageerror', (e) => errors.push(e.message));
        p.setDefaultTimeout(15000);
        try {
          await p.goto(f.base + '/#schedule');
          await p.getByRole('heading', { name: 'El teu horari', exact: true }).waitFor();
          await fn(p, f);
          assert.deepEqual(errors, []);
          assert.ok(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
          results.push({ engine, width, name, passed: true });
          console.log(`${engine}: ${name} ${width} passed`);
        } catch (e) {
          results.push({ engine, width, name, passed: false, error: e.message, errors });
          await p.screenshot({
            path: `${out}/${engine}-${width}-${name}-failed.png`,
            fullPage: true,
          });
          throw e;
        } finally {
          writeFileSync(
            out + '/results.json',
            JSON.stringify({ localOnly: true, realDevicesTested: false, results }, null, 2),
          );
          await context.close();
          await f.close();
        }
      }
      const inbox = async (p) => {
        await p.getByRole('button', { name: /^Veure avisos/ }).click();
        await p.getByRole('button', { name: 'Actualitzar avisos', exact: true }).waitFor();
        await p.waitForFunction(() => {
          const selected = document.querySelector('.page-community .tabs [aria-selected="true"]');
          if (!selected) return false;
          const item = selected.getBoundingClientRect(),
            list = selected.parentElement.getBoundingClientRect();
          return item.left >= list.left - 1 && item.right <= list.right + 1;
        });
      };
      const unread = (p) => p.locator('.agenda-notification.unread');
      const waitUnread = (p, count) =>
        p.waitForFunction(
          (n) => document.querySelectorAll('.agenda-notification.unread').length === n,
          count,
        );
      await run('fresh-old-unread-destination-persistence', async (p, f) => {
        const event = f.db.prepare("SELECT id FROM events WHERE owner_id='browser' LIMIT 1").get();
        notice(f, 'antic', { event: event.id, date: '2026-09-01T10:00:00.000Z' });
        for (let n = 0; n < 110; n++)
          notice(f, `history-${n}`, { read: '2026-10-15T12:00:00.000Z' });
        let reads = 0;
        p.on('request', (request) => {
          if (request.url().endsWith('/api/bootstrap')) reads++;
        });
        await inbox(p);
        assert.equal(reads, 1, 'one refresh when opening the inbox');
        assert.equal(await unread(p).count(), 1);
        const first = p.locator('.agenda-notification').first();
        assert.equal(await first.locator('h3').innerText(), 'Avís antic');
        await p.screenshot({ path: `${out}/${engine}-${width}-inbox.png` });
        await first.getByRole('button', { name: 'Veure data', exact: true }).click();
        await p.getByRole('dialog').waitFor();
        await p
          .getByRole('dialog')
          .getByRole('button', { name: 'Tancar', exact: true })
          .first()
          .click();
        await first.getByRole('button', { name: 'Marcar com a llegida', exact: true }).click();
        await waitUnread(p, 0);
        assert.ok(
          f.db.prepare("SELECT read_at FROM agenda_notifications WHERE id='antic'").get().read_at,
        );
        assert.equal(await p.locator('.agenda-bell-count').count(), 0);
        await p.reload();
        await p.getByRole('tab', { name: 'Notificacions', exact: true }).click();
        await p.getByRole('button', { name: 'Actualitzar avisos', exact: true }).waitFor();
        assert.equal(await unread(p).count(), 0);
        if (width === 1440) {
          await p.setViewportSize({ width: 320, height: 950 });
          await p.waitForFunction(() => {
            const selected = document.querySelector('.page-community .tabs [aria-selected="true"]');
            const item = selected.getBoundingClientRect(),
              list = selected.parentElement.getBoundingClientRect();
            return item.left >= list.left - 1 && item.right <= list.right + 1;
          });
        }
      });
      await run('write-failure-committed-read-refresh-failure-arrival', async (p, f) => {
        notice(f, 'one');
        notice(f, 'two');
        await inbox(p);
        let failWrite = true,
          failRead = false;
        await p.route('**/api/agenda/notifications/read', async (route) => {
          if (failWrite) {
            failWrite = false;
            await route.fulfill({
              status: 503,
              json: { error: 'Lectura local fallida. Torna-ho a provar.' },
            });
          } else {
            const ids = route.request().postDataJSON().ids;
            assert.deepEqual([...ids].sort(), ['one', 'two']);
            notice(f, 'arrival');
            failRead = true;
            await route.continue();
          }
        });
        await p.route('**/api/bootstrap', async (route) => {
          if (failRead)
            await route.fulfill({ status: 503, json: { error: 'Actualització local fallida.' } });
          else await route.continue();
        });
        await p.getByRole('button', { name: 'Marcar com a llegides', exact: true }).click();
        await p
          .getByRole('region', { name: 'Notificacions de l’agenda' })
          .getByRole('alert')
          .waitFor();
        assert.equal(await unread(p).count(), 2);
        assert.equal(
          f.db
            .prepare('SELECT COUNT(*) n FROM agenda_notifications WHERE read_at IS NOT NULL')
            .get().n,
          0,
        );
        await p.getByRole('button', { name: 'Marcar com a llegides', exact: true }).click();
        await waitUnread(p, 0);
        await p.getByRole('status').filter({ hasText: 'L’acció s’ha desat.' }).waitFor();
        assert.equal(await p.locator('.agenda-bell-count').count(), 0);
        assert.equal(
          f.db.prepare("SELECT read_at FROM agenda_notifications WHERE id='arrival'").get().read_at,
          null,
        );
        failRead = false;
        await p.unroute('**/api/agenda/notifications/read');
        await p.getByRole('button', { name: 'Actualitzar avisos', exact: true }).click();
        await waitUnread(p, 1);
        await unread(p).getByRole('button', { name: 'Marcar com a llegida', exact: true }).click();
        await waitUnread(p, 0);
      });
      await run('overflow-drains-in-bounded-batches', async (p, f) => {
        for (let n = 0; n < 101; n++) notice(f, `pending-${n}`);
        await inbox(p);
        assert.equal(await unread(p).count(), 100);
        assert.equal(await p.locator('.agenda-bell-count').innerText(), '100+');
        await p.getByRole('status').filter({ hasText: 'Hi ha més avisos sense llegir.' }).waitFor();
        await p.getByRole('button', { name: 'Marcar com a llegides', exact: true }).click();
        await waitUnread(p, 1);
        assert.equal(await p.locator('.agenda-bell-count').innerText(), '1');
        await unread(p).getByRole('button', { name: 'Marcar com a llegida', exact: true }).click();
        await waitUnread(p, 0);
        assert.equal(
          f.db
            .prepare('SELECT COUNT(*) n FROM agenda_notifications WHERE read_at IS NOT NULL')
            .get().n,
          101,
        );
      });
      await run('returned-proposal-and-unavailable-date', async (p, f) => {
        f.db.exec(
          "INSERT INTO events(id,owner_id,title,kind,display_kind,date,subject_id,visibility,review_status,audience_kind,unit_id,review_note) VALUES('returned','browser','Proposta amb correccions','exam','exam','2026-10-23','math','shared','returned','class','tech1','Confirma la data');",
        );
        notice(f, 'correccio', { event: 'returned' });
        notice(f, 'sense-data');
        await inbox(p);
        const correction = p.locator('.agenda-notification').filter({ hasText: 'Avís correccio' });
        await correction.getByRole('button', { name: 'Corregir proposta', exact: true }).click();
        assert.equal(
          await p
            .getByRole('dialog')
            .getByRole('textbox', { name: 'Títol', exact: true })
            .inputValue(),
          'Proposta amb correccions',
        );
        await p
          .getByRole('dialog')
          .getByRole('button', { name: 'Tancar', exact: true })
          .first()
          .click();
        const unavailable = p
          .locator('.agenda-notification')
          .filter({ hasText: 'Avís sense-data' });
        await unavailable
          .getByText('La data relacionada ja no està disponible.', { exact: true })
          .waitFor();
        assert.equal(
          await unavailable.getByRole('button').count(),
          1,
          'only the read action remains available',
        );
      });
      await run('refresh-retry-and-review-queue-destination', async (p, f) => {
        f.db.exec(
          "INSERT INTO delegation_members VALUES('browser@fje.edu','tech1','Delegat fictici','delegate',1); INSERT INTO events(id,owner_id,title,kind,display_kind,date,subject_id,visibility,review_status,audience_kind,unit_id) VALUES('pending-review','browser','Proposta per revisar','exam','exam','2026-10-23','math','shared','pending','class','tech1'); INSERT INTO event_review_units VALUES('pending-review','tech1');",
        );
        let failed = false;
        await p.route('**/api/bootstrap', async (route) => {
          if (!failed) {
            failed = true;
            await route.fulfill({
              status: 503,
              json: { error: 'No hem pogut carregar els avisos locals.' },
            });
          } else await route.continue();
        });
        await inbox(p);
        await p
          .getByRole('region', { name: 'Notificacions de l’agenda' })
          .getByRole('alert')
          .waitFor();
        await p.getByRole('button', { name: 'Actualitzar avisos', exact: true }).click();
        await p.getByRole('button', { name: 'Revisar propostes pendents', exact: true }).waitFor();
        assert.equal(await p.locator('.agenda-bell-count').innerText(), '1');
        await p.getByRole('button', { name: 'Revisar propostes pendents', exact: true }).click();
        await p.getByRole('tab', { name: 'Per validar', exact: true }).waitFor();
        await p.getByRole('button', { name: 'Revisar proposta', exact: true }).click();
        await p
          .getByRole('dialog')
          .getByRole('heading', { name: 'Validar una proposta de l’agenda', exact: true })
          .waitFor();
      });
    }
  } finally {
    await browser.close();
  }
}
