// Real local app/server and SQLite fixtures. External requests are blocked.
import assert from 'node:assert/strict';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { chromium, firefox, webkit } from 'playwright';
import { browserFixture } from '../tests/helpers/browser-fixture.mjs';
import { SCHEDULE_VERSION } from '../shared/official-schedule.js';

const out = process.env.LANET_TEST_OUTPUT || 'output/technology-chemistry/browser';
mkdirSync(out, { recursive: true });
const reference = JSON.parse(readFileSync('tests/fixtures/technology-chemistry.json', 'utf8'));
const results = [];
const choose = (p, value) => p.locator(`.course-choice:has(input[value="${value}"])`).click();
const next = (p) => p.getByRole('button', { name: 'Continuar', exact: true });
async function fits(p) {
  assert.ok(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
  const dialog = p.getByRole('dialog');
  assert.ok(await dialog.evaluate((el) => el.scrollWidth <= el.clientWidth + 1));
  assert.ok(
    await p.locator('.course-choice').evaluateAll((els) =>
      els.every((el) => {
        const box = el.getBoundingClientRect();
        return [...el.querySelectorAll('strong, .course-choice-check')].every((child) => {
          const rect = child.getBoundingClientRect();
          return rect.left >= box.left && rect.right <= box.right + 1;
        });
      }),
    ),
    'Choice labels and checks stay inside their cards',
  );
}
async function edit(p) {
  await p.getByRole('button', { name: /Perfil de/ }).click();
  await p.getByRole('button', { name: 'Configurar el meu curs', exact: true }).click();
  await next(p).click();
}
for (const engine of (process.env.LANET_BROWSER_ENGINES || 'chromium,firefox,webkit').split(',')) {
  const browser = await { chromium, firefox, webkit }[engine].launch();
  try {
    for (const position of ['student', 'delegate', 'subdelegate']) {
      for (const width of (process.env.LANET_TEST_WIDTHS || '320,1440').split(',').map(Number)) {
        const f = await browserFixture();
        f.db.exec(
          "DELETE FROM events; UPDATE users SET group_id='2B',schedule_version='' WHERE id='browser'",
        );
        if (position !== 'student') {
          f.db.prepare("UPDATE users SET role='delegate' WHERE id='browser'").run();
          f.db
            .prepare(
              "INSERT INTO delegation_members(email,unit_id,name,position) VALUES('browser@fje.edu','tech1','Representant local',?)",
            )
            .run(position);
        }
        const context = await browser.newContext({
          viewport: { width, height: 1000 },
          reducedMotion: 'reduce',
          hasTouch: width < 1000,
        });
        await context.route('**/*', (r) =>
          new URL(r.request().url()).origin === f.base ? r.continue() : r.abort(),
        );
        await context.addCookies([{ name: 'lanet_session', value: f.token, url: f.base }]);
        const p = await context.newPage();
        p.setDefaultTimeout(15000);
        const errors = [],
          prefix = `${engine}-${position}-${width}`;
        p.on('pageerror', (e) => errors.push(e.message));
        try {
          await p.goto(f.base + '/#schedule');
          await p.getByRole('button', { name: 'Revisar el meu horari' }).click();
          if (position !== 'student') {
            for (const group of ['2A', '2C'])
              assert.ok(await p.locator(`.course-route input[value="${group}"]`).isDisabled());
          }
          await choose(p, '2B');
          await next(p).click();
          const block = p.locator('[data-block="speciality"]');
          assert.deepEqual(
            await block
              .locator('.course-subject-options input')
              .evaluateAll((els) => els.map((el) => el.value).sort()),
            ['chem', 'dt', 'eco'],
          );
          await choose(p, '2B-phy-ruiz');
          await choose(p, 'tech');
          await choose(p, '2B-tech-tere');
          await choose(p, '2B-tutor-comellas');
          for (const subject of ['dt', 'eco', 'chem']) {
            await choose(p, subject);
            assert.equal(await block.locator('.course-subject-options input:checked').count(), 1);
          }
          assert.equal(await block.locator('.course-teacher-options input:checked').count(), 0);
          assert.ok(await next(p).isDisabled(), 'Chemistry requires an explicit teacher choice');
          await choose(p, reference.variants[0].id);
          await choose(p, 'eco');
          await choose(p, 'chem');
          assert.equal(
            await block.locator('.course-teacher-options input:checked').count(),
            0,
            'Changing subject clears a stale teacher choice',
          );
          for (const [index, variant] of reference.variants.entries()) {
            if (index) {
              await p.reload();
              await edit(p);
              assert.ok(await p.locator(`input[value="${reference.variants[0].id}"]`).isChecked());
            }
            await choose(p, variant.id);
            await fits(p);
            if (!index)
              await p.getByRole('dialog').screenshot({ path: `${out}/${prefix}-choices.png` });
            await next(p).click();
            const preview = p.locator('.course-week-preview');
            assert.equal(await preview.locator('li').count(), 30);
            for (const [day, start, end] of reference.periods) {
              const chemistry = preview
                .locator('section')
                .nth(day)
                .locator('li')
                .filter({ hasText: 'Química' });
              assert.equal(await chemistry.count(), 1);
              assert.equal(await chemistry.locator('time').innerText(), `${start}–${end}`);
              assert.match(await chemistry.innerText(), new RegExp(variant.teacher));
              assert.ok((await chemistry.innerText()).includes('Aula ' + variant.room));
            }
            assert.equal(
              await preview
                .locator('li')
                .filter({ hasText: /Dibuix tècnic|Empresa/ })
                .count(),
              0,
            );
            await fits(p);
            if (!index) {
              await p.getByRole('dialog').screenshot({ path: `${out}/${prefix}-review.png` });
              await p.route(
                '**/api/configure',
                (r) =>
                  r.fulfill({
                    status: 503,
                    contentType: 'application/json',
                    body: JSON.stringify({ error: 'Connexió local interrompuda.' }),
                  }),
                { times: 1 },
              );
              await p.getByRole('button', { name: 'Desar el meu horari' }).click();
              await p
                .getByRole('dialog')
                .getByRole('alert')
                .filter({ hasText: 'Connexió local interrompuda.' })
                .waitFor();
              assert.equal(await preview.locator('li').count(), 30);
            }
            const saved = p.waitForResponse(
              (r) =>
                r.url().endsWith('/api/configure') &&
                r.request().method() === 'POST' &&
                r.status() === 200,
            );
            await p.getByRole('button', { name: 'Desar el meu horari' }).click();
            await saved;
            await p.getByRole('dialog').waitFor({ state: 'hidden' });
            const enrolled = f.db
              .prepare("SELECT offering_id FROM enrollments WHERE user_id='browser'")
              .all()
              .map((e) => e.offering_id);
            assert.ok(
              enrolled.includes(variant.id) &&
                !enrolled.includes('2B-dt') &&
                !enrolled.includes('2B-eco'),
            );
            assert.equal(
              f.db.prepare("SELECT schedule_version FROM users WHERE id='browser'").get()
                .schedule_version,
              SCHEDULE_VERSION,
            );
          }
          await p.reload();
          const classes = p.locator('.timeline-class:visible').filter({ hasText: 'Química' });
          // Mobile shows one selected weekday; desktop shows the complete week.
          if (width < 1000) await p.locator('.timetable-days [role=tab]').first().click();
          await classes.first().waitFor();
          assert.ok(await classes.count());
          await classes.first().click();
          assert.match(await p.getByRole('dialog').innerText(), /Química[\s\S]*Kiko Solsona/);
          await p
            .getByRole('dialog')
            .getByRole('button', { name: 'Tancar', exact: true })
            .first()
            .click();
          await edit(p);
          assert.ok(await p.locator('input[value="2B-chem-solsona"]').isChecked());
          assert.ok(await next(p).isEnabled());
          assert.deepEqual(errors, []);
          results.push({
            engine,
            position,
            width,
            passed: true,
            teachersPersisted: 2,
            failedWriteRecovered: true,
            independentPeriodsChecked: true,
            alternativesExclusive: true,
          });
          console.log(
            `${prefix}: Chemistry selection, exact periods, retry, persistence and profile OK`,
          );
        } catch (e) {
          results.push({ engine, position, width, passed: false, error: e.message, errors });
          await p.screenshot({ path: `${out}/${prefix}-failed.png` });
          console.error(`${prefix}: FAILED ${e.message}`);
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
    }
  } finally {
    await browser.close();
  }
}
assert.ok(
  results.length > 0 && results.every((r) => r.passed),
  'Every technological Chemistry journey must pass',
);
