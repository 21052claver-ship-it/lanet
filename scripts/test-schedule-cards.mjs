import { chromium, firefox, webkit } from 'playwright';
import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { browserFixture } from '../tests/helpers/browser-fixture.mjs';
import { monday, madridDay, addDays } from '../shared/domain.js';
const out = process.env.LANET_TEST_OUTPUT || 'output/schedule-cards/browser';
mkdirSync(out, { recursive: true });
const results = [];
for (const [engine, launcher] of Object.entries({ chromium, firefox, webkit })) {
  if (
    process.env.LANET_BROWSER_ENGINES &&
    !process.env.LANET_BROWSER_ENGINES.split(',').includes(engine)
  )
    continue;
  const f = await browserFixture();
  f.db.prepare('DELETE FROM events').run();
  const day = monday(madridDay());
  const title = 'Relat Parcial · Derivades i aplicacions amb funcions compostes';
  const add = f.db.prepare(
    "INSERT INTO events(id,owner_id,title,kind,date,start,end,subject_id,visibility) VALUES(?,'browser',?,'exam',?,?,?,'math','private')",
  );
  for (const [id, start, end, offset] of [
    ['long', '08:00', '10:00', 0],
    ['hour', '10:00', '11:00', 0],
    ['half', '11:00', '11:30', 0],
    ['short', '12:00', '12:15', 0],
    ['tiny', '13:00', '13:10', 0],
    ['overlap-a', '08:00', '09:00', 1],
    ['overlap-b', '08:30', '09:30', 1],
  ])
    add.run(id, title, addDays(day, offset), start, end);
  const browser = await launcher.launch({ headless: true });
  try {
    for (const width of [320, 390, 768, 1024, 1440]) {
      const context = await browser.newContext({
        viewport: { width, height: 1000 },
        reducedMotion: 'reduce',
      });
      await context.route('**/*', (r) =>
        new URL(r.request().url()).origin === f.base ? r.continue() : r.abort(),
      );
      // Start on a day without fixture events, even when this runs on Monday.
      await context.route(f.base + '/api/bootstrap', async (route) => {
        const response = await route.fetch();
        const payload = await response.json();
        await route.fulfill({ response, json: { ...payload, today: addDays(day, 2) } });
      });
      await context.addCookies([{ name: 'lanet_session', value: f.token, url: f.base }]);
      const p = await context.newPage();
      const errors = [];
      p.on('pageerror', (e) => errors.push(e.message));
      try {
        await p.goto(f.base + '/#schedule');
        const firstDay = p.locator('.timetable-days [role="tab"]').first();
        await firstDay.waitFor({ state: 'attached' });
        if (await firstDay.isVisible()) await firstDay.click();
        await p.locator('.timeline-event:visible .event-card').first().waitFor();
        const cards = p.locator('.timeline-event:visible .event-card');
        assert.equal(await cards.count(), width <= 760 ? 5 : 7, 'All fixture intervals visible');
        const measurements = await cards.evaluateAll((nodes) =>
          nodes.map((card) => ({
            title: card.title,
            cardHeight: card.getBoundingClientRect().height,
            boxHeight: card.parentElement.getBoundingClientRect().height,
            children: [...card.children]
              .filter((el) => getComputedStyle(el).display !== 'none')
              .map((el) => {
                const rect = el.getBoundingClientRect(),
                  parent = card.getBoundingClientRect(),
                  css = getComputedStyle(el);
                return {
                  className: el.className || el.tagName,
                  height: rect.height,
                  lineHeight: parseFloat(css.lineHeight),
                  inside: rect.top >= parent.top && rect.bottom <= parent.bottom,
                };
              }),
          })),
        );
        await p.getByRole('heading', { name: 'El teu horari', exact: true }).focus();
        await p.screenshot({ path: out + '/' + engine + '-' + width + '.png', fullPage: true });
        for (const c of measurements) {
          assert.ok(c.cardHeight <= c.boxHeight + 1, 'Card must fit its time box');
          for (const child of c.children) {
            assert.ok(
              child.height >= child.lineHeight - 1,
              'Text compressed: ' + JSON.stringify(c),
            );
            assert.ok(child.inside, 'Text outside card: ' + JSON.stringify(c));
          }
        }
        assert.ok(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
        await cards.filter({ hasText: 'Matemàtiques II' }).first().click();
        await p.locator('.selected-event-title').filter({ hasText: title }).waitFor();
        assert.deepEqual(errors, []);
        results.push({ engine, width, passed: true, measurements });
        console.log(engine + ': schedule cards ' + width + 'px OK');
      } catch (e) {
        results.push({ engine, width, passed: false, error: e.message });
        throw e;
      } finally {
        writeFileSync(
          out + '/results.json',
          JSON.stringify(
            { localOnly: true, publicSiteVisited: false, realDevicesTested: false, results },
            null,
            2,
          ) + '\n',
        );
        await context.close();
      }
    }
  } finally {
    await browser.close();
    await f.close();
  }
}
console.log(results.length + ' schedule card scenarios verified.');
