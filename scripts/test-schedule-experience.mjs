import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { chromium, firefox, webkit } from 'playwright';
import { browserFixture } from '../tests/helpers/browser-fixture.mjs';
import { SCHEDULE_VERSION } from '../shared/official-schedule.js';
const out = process.env.LANET_TEST_OUTPUT || 'output/schedule-experience/browser';
mkdirSync(out, { recursive: true });
const results = [];
for (const engine of (process.env.LANET_BROWSER_ENGINES || 'chromium,firefox,webkit').split(',')) {
  const browser = await { chromium, firefox, webkit }[engine].launch();
  try {
    for (const width of (process.env.LANET_SCHEDULE_WIDTHS || '320,740,820,1440')
      .split(',')
      .map(Number))
      for (const role of (process.env.LANET_SCHEDULE_ROLES || 'student,delegate,subdelegate').split(
        ',',
      )) {
        const f = await browserFixture();
        f.db
          .prepare("UPDATE users SET group_id='2B',schedule_version=? WHERE id='browser'")
          .run(SCHEDULE_VERSION);
        f.db.exec("DELETE FROM enrollments WHERE user_id='browser'; DELETE FROM events;");
        for (const choice of [
          'cat',
          'cast',
          'eng',
          'hist',
          'phil',
          'math',
          'phy-ruiz',
          'eco',
          'tech-tere',
          'tutor-closa',
        ])
          f.db
            .prepare("INSERT INTO enrollments(user_id,offering_id) VALUES('browser',?)")
            .run('2B-' + choice);
        if (role !== 'student')
          f.db
            .prepare('INSERT INTO delegation_members VALUES(?,?,?,?,1)')
            .run('browser@fje.edu', 'social', 'Representant local', role);
        for (const [id, start, end] of [
          ['a', '08:10', '09:10'],
          ['b', '08:40', '10:10'],
          ['c', '09:10', '10:10'],
          ['d', '09:25', '09:40'],
          ['short1', '11:40', '11:50'],
          ['short2', '11:50', '12:00'],
        ])
          f.db
            .prepare(
              "INSERT INTO events(id,owner_id,title,kind,date,start,end,subject_id,visibility) VALUES(?,'browser',?,'exam','2026-10-13',?,?,'math','private')",
            )
            .run(id, 'Prova local ' + id, start, end);
        const c = await browser.newContext({
          viewport: { width, height: width === 740 ? 390 : 950 },
          hasTouch: width < 1000,
          reducedMotion: 'reduce',
        });
        await c.route('**/*', (r) =>
          new URL(r.request().url()).origin === f.base ? r.continue() : r.abort(),
        );
        await c.route('**/api/bootstrap', async (r) => {
          const response = await r.fetch();
          const data = await response.json();
          await r.fulfill({ response, json: { ...data, today: '2026-10-15' } });
        });
        await c.addCookies([{ name: 'lanet_session', value: f.token, url: f.base }]);
        const p = await c.newPage(),
          errors = [];
        p.on('pageerror', (e) => errors.push(e.message));
        p.setDefaultTimeout(12000);
        try {
          await p.goto(f.base + '/#schedule');
          await p.getByRole('heading', { name: 'El teu horari', exact: true }).waitFor();
          const tabs = p.locator('.timetable-days [role=tab]');
          const selectDay = async (i) => {
            if (await tabs.nth(i).isVisible()) await tabs.nth(i).click();
            else await p.locator('.timeline-mode > .week-heading').nth(i).click();
          };
          const checkAdd = async (expected) => {
            await p.getByRole('button', { name: 'Afegir a l’agenda', exact: true }).click();
            const dialog = p.getByRole('dialog');
            assert.equal(await dialog.getByLabel('Data', { exact: true }).inputValue(), expected);
            await dialog.getByRole('button', { name: 'Tancar', exact: true }).first().click();
          };
          await selectDay(1);
          await checkAdd('2026-10-13');
          await p.getByRole('button', { name: 'Avui', exact: true }).click();
          assert.match(
            await p.locator('.timeline-mode > .week-heading[data-current="true"]').innerText(),
            /15/,
          );
          await selectDay(1);
          await p.getByRole('button', { name: 'Següent', exact: true }).click();
          await checkAdd('2026-10-20');
          await p.getByRole('button', { name: 'Avui', exact: true }).click();
          await selectDay(1);
          assert.ok((await p.locator('.timeline-class:visible').count()) >= 6);
          const clippedClasses = await p.locator('.timeline-class:visible').evaluateAll((nodes) =>
            nodes
              .filter((el) => {
                const outer = el.getBoundingClientRect();
                return [...el.children].some((child) => {
                  if (getComputedStyle(child).display === 'none') return false;
                  const inner = child.getBoundingClientRect();
                  return inner.top < outer.top - 1 || inner.bottom > outer.bottom + 1;
                });
              })
              .map((el) => el.getAttribute('aria-label')),
          );
          assert.deepEqual(clippedClasses, [], 'Class lines fit their true time box');
          await p.screenshot({
            path: out + '/' + engine + '-' + width + '-' + role + '-schedule.png',
            fullPage: false,
          });
          const rects = await p.locator('.timeline-event:visible').evaluateAll((nodes) =>
            nodes.map((el) => {
              const r = el.getBoundingClientRect();
              return { x: r.x, y: r.y, right: r.right, bottom: r.bottom };
            }),
          );
          for (let i = 0; i < rects.length; i++)
            for (let j = i + 1; j < rects.length; j++) {
              const a = rects[i],
                b = rects[j];
              assert.ok(
                !(
                  a.x < b.right - 0.5 &&
                  b.x < a.right - 0.5 &&
                  a.y < b.bottom - 0.5 &&
                  b.y < a.bottom - 0.5
                ),
                'Timed dates must not overlap visually',
              );
            }
          const full = p.locator('.schedule-day-events');
          if (!(await full.evaluate((el) => el.open)))
            await full.locator(':scope > summary').click();
          assert.equal(await full.locator('.schedule-date-row').count(), 12);
          await full.locator(':scope > div .schedule-date-row').first().click();
          await p.getByRole('heading', { name: 'Prova local a', exact: true }).waitFor();
          if (width <= 760)
            await p
              .getByRole('dialog')
              .getByRole('button', { name: 'Tancar', exact: true })
              .first()
              .click();
          else
            await p
              .getByRole('button', { name: 'Tornar a les properes dates', exact: true })
              .click();
          await p.locator('.calendar-navigation-row .section-options > summary').click();
          const waiting = p.waitForEvent('download');
          await p.getByRole('button', { name: 'Exportar aquesta setmana', exact: true }).click();
          const download = await waiting;
          const path = out + '/' + engine + '-' + width + '-' + role + '.ics';
          await download.saveAs(path);
          const ics = readFileSync(path, 'utf8');
          assert.equal((ics.match(/BEGIN:VEVENT/g) || []).length, 36);
          assert.match(ics, /CLASS:PRIVATE/);
          assert.match(ics, /Natàlia Ramos/);
          await p.locator('.calendar-navigation-row .section-options > summary').click();
          await p.getByRole('tab', { name: 'Agenda', exact: true }).click();
          await p.getByRole('tab', { name: 'Mes', exact: true }).click();
          if (width <= 760) {
            await p
              .locator('.day-number')
              .filter({ has: p.locator('time[datetime="2026-10-18"]') })
              .click();
            await checkAdd('2026-10-18');
          }
          if (width <= 760)
            await p.getByRole('button', { name: 'Més seccions', exact: true }).click();
          const panel = width <= 760 ? p.locator('.mobile-more-panel') : p.locator('.sidebar');
          const shortcut = panel.getByRole('button', { name: 'Panell de delegats', exact: true });
          assert.equal(await shortcut.count(), role === 'student' ? 0 : 1);
          if (role !== 'student') {
            await shortcut.click();
            await p
              .getByRole('heading', { name: 'El teu panell de delegats', exact: true })
              .waitFor();
            await p.getByRole('button', { name: 'Actualitzar propostes', exact: true }).waitFor();
            assert.equal(await p.locator('.sidebar nav [aria-current="page"]').count(), 1);
          }
          assert.ok(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
          assert.deepEqual(errors, []);
          await p.screenshot({
            path: out + '/' + engine + '-' + width + '-' + role + '.png',
            fullPage: true,
          });
          results.push({ engine, width, role, passed: true });
          console.log(engine + ' ' + width + ' ' + role + ' passed');
        } catch (e) {
          results.push({
            engine,
            width,
            role,
            passed: false,
            error: e.message,
            errors,
            diagnostics: await p.evaluate(() => ({
              focus: document.hasFocus(),
              visibility: document.visibilityState,
              scrollY,
              viewport: [innerWidth, innerHeight],
              sidebar: document.querySelector('.sidebar').getBoundingClientRect().toJSON(),
              button: document
                .querySelector('[aria-label="Panell de delegats"]')
                ?.getBoundingClientRect()
                .toJSON(),
            })),
          });
          await p.screenshot({
            path: out + '/' + engine + '-' + width + '-' + role + '-failed.png',
            fullPage: true,
          });
          throw e;
        } finally {
          // The panel refresh can still be completing after its heading appears.
          await c.unrouteAll({ behavior: 'wait' });
          await c.close();
          await f.close();
          writeFileSync(
            out + '/results.json',
            JSON.stringify({ localOnly: true, results }, null, 2) + '\n',
          );
        }
      }
  } finally {
    await browser.close();
  }
}
console.log(results.length + ' schedule/navigation flows passed.');
