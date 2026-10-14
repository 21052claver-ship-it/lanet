import { chromium, firefox, webkit } from 'playwright';
import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { browserFixture } from '../tests/helpers/browser-fixture.mjs';
import { SCHEDULE_VERSION } from '../shared/official-schedule.js';

const out = process.env.LANET_TEST_OUTPUT || 'output/official-schedule/browser';
mkdirSync(out, { recursive: true });
const results = [];
const cases = [
  { group: '2A', width: 390 },
  { group: '2B', width: 390 },
  { group: '2C', width: 390 },
  { group: '2A', width: 1440 },
  { group: '2B', width: 1440 },
  { group: '2C', width: 1440 },
  { group: '2A', width: 320 },
  { group: '2C', width: 320 },
  { group: '2B', width: 768 },
];
const expected = {
  '2A': [
    '2A-cat',
    '2A-cast',
    '2A-eng',
    '2A-hist',
    '2A-phil',
    '2A-smath',
    '2A-chem-solsona',
    '2A-phy-ruiz',
    '2A-art',
    '2A-tutor-comellas',
  ],
  '2B': [
    '2B-cat',
    '2B-cast',
    '2B-eng',
    '2B-hist',
    '2B-phil',
    '2B-math',
    '2B-phy-ruiz',
    '2B-eco',
    '2B-tech-tere',
    '2B-tutor-closa',
  ],
  '2C': [
    '2C-cat',
    '2C-cast',
    '2C-eng',
    '2C-hist',
    '2C-phil',
    '2C-latin',
    '2C-lit',
    '2C-geo',
    '2C-bio',
    '2C-tutor-ocana',
  ],
};
async function choose(page, value) {
  await page.locator(`.course-choice:has(input[value="${value}"])`).click();
}
async function fill(page, group) {
  for (const value of {
    '2A': ['smath', '2A-chem-solsona', 'phy', '2A-phy-ruiz', 'art', '2A-tutor-comellas'],
    '2B': ['2B-phy-ruiz', 'eco', 'tech', '2B-tech-tere', '2B-tutor-closa'],
    '2C': ['latin', 'lit', 'bio', '2C-tutor-ocana'],
  }[group])
    await choose(page, value);
}
async function fits(page) {
  assert.ok(
    await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1),
    'Page must fit the viewport',
  );
  const dialog = page.getByRole('dialog');
  if (await dialog.isVisible())
    assert.ok(
      await dialog.evaluate((el) => el.scrollWidth <= el.clientWidth + 1),
      'Dialog must not overflow horizontally',
    );
}
for (const [engine, launcher] of Object.entries({ chromium, firefox, webkit })) {
  if (
    process.env.LANET_BROWSER_ENGINES &&
    !process.env.LANET_BROWSER_ENGINES.split(',').includes(engine)
  )
    continue;
  const browser = await launcher.launch({ headless: true });
  try {
    for (const { group, width } of cases) {
      const f = await browserFixture();
      f.db.prepare('DELETE FROM events').run();
      const context = await browser.newContext({
        viewport: { width, height: 1000 },
        reducedMotion: 'reduce',
      });
      await context.route('**/*', (r) =>
        new URL(r.request().url()).origin === f.base ? r.continue() : r.abort(),
      );
      await context.addCookies([{ name: 'lanet_session', value: f.token, url: f.base }]);
      const page = await context.newPage();
      const errors = [];
      page.on('pageerror', (e) => errors.push(e.message));
      const prefix = `${engine}-${group}-${width}`;
      try {
        await page.goto(f.base + '/#schedule');
        await page.getByRole('button', { name: 'Revisar el meu horari' }).click();
        if (group === '2A' && width === 1440) {
          await page.locator('.course-route input[value="2A"]').focus();
          await page.keyboard.press('ArrowRight');
          assert.ok(
            await page.locator('.course-route input[value="2B"]').isChecked(),
            'Native route radio group must support arrow keys',
          );
        }
        await choose(page, group);
        await fits(page);
        await page.getByRole('dialog').screenshot({ path: `${out}/${prefix}-1-route.png` });
        await page.getByRole('button', { name: 'Continuar', exact: true }).click();
        assert.ok(
          await page.getByRole('button', { name: 'Continuar', exact: true }).isDisabled(),
          'Incomplete electives must not save',
        );
        assert.equal(await page.locator('.course-common .subject-chip').count(), 5);
        await fill(page, group);
        await fits(page);
        await page.getByRole('dialog').screenshot({ path: `${out}/${prefix}-2-subjects.png` });
        await page.getByRole('button', { name: 'Continuar', exact: true }).click();
        const preview = page.locator('.course-week-preview');
        assert.equal(await preview.locator('section').count(), 5);
        assert.equal(await preview.locator('li').count(), group === '2A' ? 29 : 30);
        if (group === '2C') {
          const monday = preview.locator('section').first();
          assert.match(
            await monday.locator('li').first().innerText(),
            /Treball personal · Llatí online/,
          );
          assert.match(await monday.locator('li').nth(1).innerText(), /Mª José Agustí/);
          assert.match(
            await preview.locator('section').nth(1).locator('li').nth(1).innerText(),
            /Elena Domènech[\s\S]*Aula 4/,
          );
        }
        await fits(page);
        await page.getByRole('dialog').screenshot({ path: `${out}/${prefix}-3-review.png` });
        // A transient write failure must preserve all choices and offer an explicit retry.
        if (group === '2B' && width === 390) {
          await page.route(
            '**/api/configure',
            (r) =>
              r.fulfill({
                status: 503,
                contentType: 'application/json',
                body: JSON.stringify({ error: 'Connexió de prova interrompuda.' }),
              }),
            { times: 1 },
          );
          await page.getByRole('button', { name: 'Desar el meu horari' }).click();
          await page.locator('.course-setup [role="alert"]').waitFor();
          assert.equal(await preview.locator('li').count(), 30);
        }
        const response = page.waitForResponse(
          (r) => r.url().endsWith('/api/configure') && r.request().method() === 'POST',
        );
        await page.getByRole('button', { name: 'Desar el meu horari' }).click();
        assert.equal((await response).status(), 200);
        await page.getByRole('dialog').waitFor({ state: 'hidden' });
        assert.equal(await page.locator('.schedule-review-notice').count(), 0);
        const persisted = f.db
          .prepare("SELECT offering_id FROM enrollments WHERE user_id='browser'")
          .all()
          .map((e) => e.offering_id);
        assert.deepEqual(new Set(persisted), new Set(expected[group]));
        assert.equal(
          f.db.prepare("SELECT schedule_version FROM users WHERE id='browser'").get()
            .schedule_version,
          SCHEDULE_VERSION,
        );
        assert.equal(
          f.db.prepare("SELECT grade FROM grade_entries WHERE id='math-1-0'").get().grade,
          7.4,
        );
        await page.reload();
        await page.getByRole('heading', { name: 'El teu horari', exact: true }).waitFor();
        assert.equal(await page.locator('.schedule-review-notice').count(), 0);
        const firstDay = page.locator('.timetable-days [role="tab"]').first();
        if (await firstDay.isVisible()) await firstDay.click();
        const cards = page.locator('.timeline-class:visible');
        assert.ok((await cards.count()) >= 6);
        const breaks = page.locator('.timeline-day[data-current="true"] .timeline-break');
        assert.equal(await breaks.count(), 2);
        assert.match(await breaks.first().getAttribute('aria-label'), /10:10–10:40/);
        assert.match(await breaks.nth(1).getAttribute('aria-label'), /12:40–13:45/);
        await fits(page);
        await page.screenshot({ path: `${out}/${prefix}-4-timetable.png`, fullPage: true });
        const cardGeometry = await cards.evaluateAll((nodes) =>
          nodes.map((el) => {
            const box = el.getBoundingClientRect();
            return [...el.children]
              .filter((child) => getComputedStyle(child).display !== 'none')
              .every((child) => {
                const r = child.getBoundingClientRect();
                return r.top >= box.top && r.bottom <= box.bottom + 1;
              });
          }),
        );
        assert.ok(cardGeometry.every(Boolean), 'Class title, teacher and room must fit their hour');
        await cards.first().click();
        const detail = page.getByRole('dialog');
        assert.match(
          await detail.innerText(),
          group === '2C'
            ? /Treball personal · Llatí online/
            : group === '2A'
              ? /Mireia Biosca/
              : /Natàlia Ramos/,
        );
        await detail.getByRole('button', { name: 'Continguts de l’assignatura' }).click();
        assert.ok(page.url().endsWith('#notes'));
        if (width === 390) {
          await page.getByRole('button', { name: /Perfil de/ }).click();
          await page.getByRole('button', { name: 'Configurar el meu curs', exact: true }).click();
          assert.ok(await page.locator(`.course-route input[value="${group}"]`).isChecked());
          await page.getByRole('button', { name: 'Continuar', exact: true }).click();
          for (const id of expected[group]) {
            const variant = page.locator(`.course-choice input[value="${id}"]`);
            if (await variant.count())
              assert.ok(
                await variant.isChecked(),
                'Profile editor must hydrate the saved teacher: ' + id,
              );
          }
          assert.ok(await page.getByRole('button', { name: 'Continuar', exact: true }).isEnabled());
          await page.getByRole('button', { name: 'Tancar', exact: true }).click();
        }
        const managementRoundTrip = group === '2C' && [320, 390, 1440].includes(width);
        if (managementRoundTrip) {
          f.db.prepare("UPDATE users SET role='admin' WHERE id='browser'").run();
          await page.goto(f.base + '/#management');
          // The fixture changed the role outside the app. A hash navigation
          // keeps the old bootstrap; reload instead of waiting for the 30s poll.
          await page.reload();
          for (const [id, label] of [
            ['2C-lit', 'Literatura catalana'],
            ['2C-latin', 'Llatí'],
          ]) {
            const before = f.db
              .prepare('SELECT * FROM slots WHERE offering_id=? ORDER BY id')
              .all(id);
            await page.getByRole('button', { name: 'Editar ' + label, exact: true }).click();
            if (id === '2C-lit') {
              assert.equal(
                await page
                  .getByLabel('Nom del professor de la franja 1', { exact: true })
                  .inputValue(),
                'Mª José Agustí',
              );
              assert.equal(
                await page
                  .getByLabel('Nom del professor de la franja 2', { exact: true })
                  .inputValue(),
                'Elena Domènech',
              );
            } else {
              assert.equal(
                await page.getByLabel('Indicació de la franja 1', { exact: true }).inputValue(),
                'Treball personal · Llatí online',
              );
              assert.equal(await page.locator('.slot-teacher-editor input[required]').count(), 1);
            }
            await fits(page);
            const dayLabels = page.locator(
              '.slot-editor > div > .select-control:first-child .select-value',
            );
            if (await dayLabels.count())
              assert.ok(
                await dayLabels.evaluateAll((els) =>
                  els.every((el) => el.getBoundingClientRect().height < 40),
                ),
                'Day names must not wrap vertically in the slot editor',
              );
            await page
              .getByRole('dialog')
              .screenshot({ path: `${out}/${prefix}-5-management-${id}.png` });
            await page
              .getByRole('dialog')
              .getByRole('button', { name: 'Desar', exact: true })
              .click();
            await page.getByRole('dialog').waitFor({ state: 'hidden' });
            assert.deepEqual(
              f.db.prepare('SELECT * FROM slots WHERE offering_id=? ORDER BY id').all(id),
              before,
            );
          }
        }
        assert.deepEqual(errors, []);
        results.push({ engine, group, width, managementRoundTrip, passed: true });
        console.log(
          `${prefix}: route, subjects, teachers, preview, persistence and class links OK`,
        );
      } catch (e) {
        await page.screenshot({ path: `${out}/${prefix}-failure.png`, fullPage: true });
        results.push({ engine, group, width, passed: false, error: e.message });
        throw e;
      } finally {
        writeFileSync(
          `${out}/results.json`,
          JSON.stringify(
            { localOnly: true, publicSiteVisited: false, realDevicesTested: false, results },
            null,
            2,
          ) + '\n',
        );
        await context.close();
        await f.close();
      }
    }
  } finally {
    await browser.close();
  }
}
console.log(`${results.length} official timetable browser scenarios verified.`);
