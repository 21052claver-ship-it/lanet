import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { chromium, firefox, webkit } from 'playwright';
import { browserFixture } from '../tests/helpers/browser-fixture.mjs';
import { pngFixture, webpFixture } from '../tests/helpers/media-fixtures.js';
import { SCHEDULE_VERSION } from '../shared/official-schedule.js';
import { madridDay } from '../shared/domain.js';

const out = process.env.LANET_TEST_OUTPUT || 'output/platform-recovery/browser';
mkdirSync(out, { recursive: true });
const results = [];
const scenarios = [
  'proposal-upload-keeps-latest-draft',
  'event-save-keeps-last-accepted-title',
  'proposal-save-keeps-last-accepted-title',
  'plus-save-keeps-last-accepted-title',
  'profile-slow-save-keeps-last-accepted-edit',
  'subject-filter-slow-save-keeps-last-accepted-edit',
  'subject-save-after-navigation-keeps-workspace',
  'preference-save-error-recovers',
  'damaged-event-draft-remains-usable',
].filter(
  (name) => !process.env.LANET_RECOVERY_CHECK || name.includes(process.env.LANET_RECOVERY_CHECK),
);
for (const engine of (process.env.LANET_BROWSER_ENGINES || 'chromium,firefox,webkit').split(',')) {
  const browser = await { chromium, firefox, webkit }[engine].launch();
  try {
    for (const width of (process.env.LANET_TEST_WIDTHS || '320,1440').split(',').map(Number))
      for (const role of (process.env.LANET_TEST_ROLES || 'student,delegate,subdelegate').split(
        ',',
      ))
        for (const scenario of scenarios) {
          let release, signalStart, writeFailure;
          const writes = [];
          const gate = new Promise((resolve) => {
            release = resolve;
          });
          const started = new Promise((resolve) => {
            signalStart = resolve;
          });
          async function waitForStart() {
            await new Promise((resolve, reject) => {
              const timer = setTimeout(
                () => reject(new Error('The local write did not start')),
                12000,
              );
              started.then(() => {
                clearTimeout(timer);
                resolve();
              });
            });
            assert.ifError(writeFailure);
          }
          const f = await browserFixture({
            mediaSafety: {
              async fetch() {
                // Hold the local service instead of replaying a multipart body:
                // WebKit uploads must retain their native binary request.
                if (scenario === 'proposal-upload-keeps-latest-draft') {
                  writes.push('image');
                  signalStart();
                  await gate;
                }
                return new Response(webpFixture, {
                  headers: { 'Content-Type': 'image/webp', 'X-LaNet-Safety': 'lanet-image-v1' },
                });
              },
            },
          });
          f.db
            .prepare("UPDATE users SET schedule_version=? WHERE id='browser'")
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
          const context = await browser.newContext({
            viewport: { width, height: 950 },
            hasTouch: width < 1000,
            reducedMotion: 'reduce',
            timezoneId: 'Europe/Madrid',
          });
          await context.route('**/*', (r) =>
            new URL(r.request().url()).origin === f.base || r.request().url().startsWith('blob:')
              ? r.continue()
              : r.abort(),
          );
          await context.addCookies([{ name: 'lanet_session', value: f.token, url: f.base }]);
          const page = await context.newPage(),
            errors = [];
          page.setDefaultTimeout(12000);
          page.on('pageerror', (error) => errors.push(error.message));
          page.on('console', (message) => {
            if (
              scenario === 'preference-save-error-recovers' &&
              message.location().url === f.base + '/api/preferences' &&
              /503/.test(message.text())
            )
              return;
            if (message.type() === 'error') errors.push(message.text());
          });
          const holdWrite = async (path) => {
            await page.route('**/api/' + path, async (route) => {
              if (route.request().method() !== 'POST') return route.continue();
              writes.push(route.request().postData());
              let response;
              try {
                response = await route.fetch();
                if (!response.ok())
                  writeFailure = new Error(`Local write returned ${response.status()}`);
              } catch (error) {
                writeFailure = error;
                signalStart();
                return route.abort();
              }
              signalStart();
              await gate;
              await route.fulfill({ response });
            });
          };
          const label = `${engine}-${width}-${role}-${scenario}`;
          try {
            if (scenario === 'proposal-upload-keeps-latest-draft') {
              await page.goto(f.base + '/?community=proposals#community');
              const open = () =>
                page
                  .locator('#main-content')
                  .getByRole('button', {
                    name: 'Proposa una idea',
                    exact: true,
                  })
                  .first()
                  .click();
              await open();
              const dialog = page.getByRole('dialog', { name: 'Proposa una idea', exact: true });
              await dialog.getByLabel('La teva idea', { exact: true }).fill('Idea inicial local');
              await dialog.getByLabel('Com ajudaria?', { exact: true }).fill('Text inicial local.');
              await dialog.locator('input[type=file]').setInputFiles({
                name: 'foto-local.png',
                mimeType: 'image/png',
                buffer: pngFixture(256),
              });
              await waitForStart();
              const title = 'Idea revisada mentre puja la imatge',
                body = 'Text final que cal conservar.';
              await dialog.getByLabel('La teva idea', { exact: true }).fill(title);
              await dialog.getByLabel('Com ajudaria?', { exact: true }).fill(body);
              release();
              await dialog.locator('.attachment-item').waitFor();
              await page.waitForFunction(
                () => !document.querySelector('.attachment-editor input[type=file]').disabled,
              );
              await dialog.getByRole('button', { name: 'Tancar', exact: true }).first().click();
              await dialog.waitFor({ state: 'hidden' });
              await open();
              assert.equal(
                await dialog.getByLabel('La teva idea', { exact: true }).inputValue(),
                title,
                'Completing an upload must preserve the latest proposal title',
              );
              assert.equal(
                await dialog.getByLabel('Com ajudaria?', { exact: true }).inputValue(),
                body,
                'Completing an upload must preserve the latest proposal text',
              );
              assert.equal(await dialog.locator('.attachment-item').count(), 1);
              assert.equal(writes.length, 1);
            } else if (scenario.endsWith('-save-keeps-last-accepted-title')) {
              const kind = scenario.split('-')[0];
              const spec = {
                event: {
                  route: '/?subject=math#notes',
                  open: 'Afegir tasca',
                  title: 'Títol',
                  submit: 'Desar',
                  resource: 'events',
                },
                proposal: {
                  route: '/?community=proposals#community',
                  open: 'Proposa una idea',
                  title: 'La teva idea',
                  body: 'Com ajudaria?',
                  submit: 'Publicar la idea',
                  resource: 'proposals',
                },
                plus: {
                  route: '/#pluses',
                  open: 'Publica un plus',
                  title: 'Nom de l’activitat',
                  body: 'De què tracta?',
                  submit: 'Publicar plus',
                  resource: 'pluses',
                },
              }[kind];
              await page.goto(f.base + spec.route);
              await page
                .locator('#main-content')
                .getByRole('button', { name: spec.open, exact: true })
                .first()
                .click();
              const dialog = page.getByRole('dialog');
              const title = dialog.getByLabel(spec.title, { exact: true });
              let accepted = `Guardat lent ${kind} local inicial`;
              await title.fill(accepted);
              if (spec.body)
                await dialog
                  .getByLabel(spec.body, { exact: true })
                  .fill('Contingut fictici de la comprovació local.');
              if (kind === 'plus')
                await dialog.getByLabel('Lloc', { exact: true }).fill('Aula local');
              await holdWrite(spec.resource);
              await dialog.getByRole('button', { name: spec.submit, exact: true }).click();
              await waitForStart();
              if (await title.isEnabled()) {
                accepted = `Guardat lent ${kind} local revisat`;
                await title.fill(accepted);
              }
              assert.ok(
                await dialog.evaluate((el) => el.scrollWidth <= el.clientWidth + 1),
                'Publication controls fit inside the dialog during a save',
              );
              await page.screenshot({ path: `${out}/${label}-pending.png` });
              release();
              await dialog.waitFor({ state: 'hidden' });
              const saved = f.db
                .prepare(`SELECT title FROM ${spec.resource} WHERE title LIKE ?`)
                .all(`Guardat lent ${kind}%`);
              assert.deepEqual(
                saved.map((row) => row.title),
                [accepted],
                'Publishing must preserve the last title accepted before the form closes',
              );
              assert.equal(writes.length, 1);
              await page.waitForLoadState('networkidle');
              await page.reload();
              await page.getByText(accepted, { exact: true }).first().waitFor();
            } else if (scenario === 'profile-slow-save-keeps-last-accepted-edit') {
              await page.goto(f.base + '/#notes');
              const open = () => page.getByRole('button', { name: /^Perfil de / }).click();
              await open();
              const dialog = page.getByRole('dialog');
              await dialog.getByRole('tab', { name: 'Aparença', exact: true }).click();
              const privacy = dialog.getByRole('checkbox', { name: /Mode discret a Notes/ });
              await privacy.check();
              await holdWrite('preferences');
              await dialog.getByRole('button', { name: 'Desar preferències', exact: true }).click();
              await waitForStart();
              // If a field still accepts edits, the last accepted value must survive.
              let accepted = true;
              if (await privacy.isEnabled()) {
                await privacy.uncheck();
                accepted = false;
              }
              release();
              await dialog.waitFor({ state: 'hidden' });
              await open();
              await dialog.getByRole('tab', { name: 'Aparença', exact: true }).click();
              assert.equal(
                await privacy.isChecked(),
                accepted,
                'A slow save must not silently discard edits accepted by the profile',
              );
              const saved = JSON.parse(
                f.db.prepare("SELECT value FROM user_preferences WHERE user_id='browser'").get()
                  .value,
              );
              assert.equal(saved.hideGrades, accepted);
              assert.equal(writes.length, 1);
            } else if (scenario === 'subject-filter-slow-save-keeps-last-accepted-edit') {
              await page.goto(f.base + '/#notes');
              const trigger = page.getByRole('button', { name: /^Les meves assignatures:/ });
              await trigger.click();
              const panel = page.getByRole('region', {
                name: 'Preferències d’assignatures',
                exact: true,
              });
              await panel
                .getByRole('checkbox', {
                  name: 'Seguir les assignatures del meu curs',
                  exact: true,
                })
                .uncheck();
              await panel.getByRole('button', { name: 'Cap', exact: true }).click();
              const math = panel
                .locator('.subject-choice')
                .filter({ hasText: 'Matemàtiques II' })
                .getByRole('checkbox');
              await math.check();
              await holdWrite('preferences');
              await panel.getByRole('button', { name: 'Aplicar i desar', exact: true }).click();
              await waitForStart();
              let accepted = true;
              if (await math.isEnabled()) {
                await math.uncheck();
                accepted = false;
              }
              release();
              await panel.waitFor({ state: 'hidden' });
              await trigger.click();
              assert.equal(
                await math.isChecked(),
                accepted,
                'A slow save must not discard the last accepted subject selection',
              );
              const saved = JSON.parse(
                f.db.prepare("SELECT value FROM user_preferences WHERE user_id='browser'").get()
                  .value,
              );
              assert.equal(saved.notesSubjects.includes('math'), accepted);
              assert.equal(writes.length, 1);
            } else if (scenario === 'subject-save-after-navigation-keeps-workspace') {
              await page.goto(f.base + '/#notes');
              await page.getByRole('button', { name: /^Les meves assignatures:/ }).click();
              const panel = page.getByRole('region', {
                name: 'Preferències d’assignatures',
                exact: true,
              });
              await panel
                .getByRole('checkbox', {
                  name: 'Seguir les assignatures del meu curs',
                  exact: true,
                })
                .uncheck();
              await panel.getByRole('button', { name: 'Cap', exact: true }).click();
              await panel
                .locator('.subject-choice')
                .filter({ hasText: 'Matemàtiques II' })
                .getByRole('checkbox')
                .check();
              await holdWrite('preferences');
              await panel.getByRole('button', { name: 'Aplicar i desar', exact: true }).click();
              await waitForStart();
              await page
                .getByRole('button', { name: 'Obrir l’espai de Matemàtiques II', exact: true })
                .click();
              const workspace = page.getByRole('region', {
                name: 'Espai de Matemàtiques II',
                exact: true,
              });
              await workspace.waitFor();
              release();
              await page
                .getByRole('status')
                .filter({ hasText: 'Assignatures desades al teu perfil.' })
                .waitFor();
              await page.waitForLoadState('networkidle');
              assert.equal(
                new URL(page.url()).searchParams.get('subject'),
                'math',
                'Finishing an earlier filter must preserve the workspace opened during its save',
              );
              assert.equal(await workspace.isVisible(), true);
              assert.equal(writes.length, 1);
              const saved = JSON.parse(
                f.db.prepare("SELECT value FROM user_preferences WHERE user_id='browser'").get()
                  .value,
              );
              assert.deepEqual(
                saved.notesSubjects,
                ['math'],
                'The original preference still persists',
              );
            } else if (scenario === 'preference-save-error-recovers') {
              await page.route('**/api/preferences', async (route) => {
                if (route.request().method() !== 'POST') return route.continue();
                writes.push(route.request().postDataJSON());
                if ([1, 3].includes(writes.length))
                  return route.fulfill({
                    status: 503,
                    json: {
                      error:
                        writes.length === 1
                          ? 'Error local de prova de perfil.'
                          : 'Error local de prova de filtre.',
                    },
                  });
                return route.continue();
              });
              await page.goto(f.base + '/#notes');
              await page.getByRole('button', { name: /^Perfil de / }).click();
              const dialog = page.getByRole('dialog');
              await dialog.getByRole('tab', { name: 'Aparença', exact: true }).click();
              const privacy = dialog.getByRole('checkbox', { name: /Mode discret a Notes/ });
              await privacy.check();
              const save = dialog.getByRole('button', { name: 'Desar preferències', exact: true });
              await save.click();
              await dialog
                .getByRole('alert')
                .filter({ hasText: 'Error local de prova de perfil.' })
                .waitFor();
              assert.equal(
                await privacy.isChecked(),
                true,
                'A failed write preserves the profile draft',
              );
              assert.equal(await privacy.isEnabled(), true, 'Editing resumes after a failed write');
              await save.click();
              await dialog.waitFor({ state: 'hidden' });
              const savedPreferences = () =>
                JSON.parse(
                  f.db.prepare("SELECT value FROM user_preferences WHERE user_id='browser'").get()
                    .value,
                );
              assert.equal(savedPreferences().hideGrades, true);
              await page.getByRole('button', { name: /^Les meves assignatures:/ }).click();
              const panel = page.getByRole('region', {
                name: 'Preferències d’assignatures',
                exact: true,
              });
              await panel
                .getByRole('checkbox', {
                  name: 'Seguir les assignatures del meu curs',
                  exact: true,
                })
                .uncheck();
              await panel.getByRole('button', { name: 'Cap', exact: true }).click();
              const math = panel
                .locator('.subject-choice')
                .filter({ hasText: 'Matemàtiques II' })
                .getByRole('checkbox');
              await math.check();
              const apply = panel.getByRole('button', { name: 'Aplicar i desar', exact: true });
              await apply.click();
              await page
                .getByRole('alert')
                .filter({ hasText: 'Error local de prova de filtre.' })
                .waitFor();
              assert.equal(await panel.isVisible(), true, 'The failed filter remains open');
              assert.equal(await math.isChecked(), true, 'The failed filter retains its selection');
              assert.equal(await math.isEnabled(), true, 'The filter unlocks after a failed write');
              await apply.click();
              await panel.waitFor({ state: 'hidden' });
              assert.deepEqual(savedPreferences().notesSubjects, ['math']);
              assert.equal(writes.length, 4, 'Each retry performs one new write');
            } else {
              await context.addInitScript(() => {
                localStorage.setItem(
                  'lanet.eventDraft.browser.math.task',
                  JSON.stringify({
                    title: 37,
                    date: 'not-a-date',
                    body: true,
                    start: '99:99',
                    end: {},
                    visibility: 'unknown',
                    kind: 'obsolete',
                    room: null,
                    subject_id: 'math',
                    retainedLegacyField: 'ignored',
                  }),
                );
              });
              await page.goto(f.base + '/?subject=math#notes');
              await page.getByRole('button', { name: 'Afegir tasca', exact: true }).click();
              const dialog = page.getByRole('dialog', {
                name: 'Una data al calendari',
                exact: true,
              });
              await dialog.waitFor();
              await dialog
                .getByLabel('Títol', { exact: true })
                .fill('Tasca recuperada de prova local');
              assert.equal(
                await dialog.getByLabel('Data', { exact: true }).inputValue(),
                madridDay(),
              );
              await dialog.getByRole('button', { name: 'Desar', exact: true }).click();
              await dialog.waitFor({ state: 'hidden' });
              const saved = f.db
                .prepare(
                  "SELECT title,visibility,display_kind AS kind FROM events WHERE owner_id='browser'",
                )
                .all()
                .map((event) => ({ ...event }));
              assert.deepEqual(saved, [
                { title: 'Tasca recuperada de prova local', visibility: 'private', kind: 'task' },
              ]);
            }
            assert.deepEqual(errors, [], 'The complete interaction has no uncaught errors');
            for (const dialog of await page.getByRole('dialog').all())
              assert.ok(
                await dialog.evaluate((el) => el.scrollWidth <= el.clientWidth + 1),
                'The visible dialog has no horizontal overflow',
              );
            assert.ok(
              await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1),
              'The page fits the viewport',
            );
            await page.screenshot({ path: `${out}/${label}.png` });
            results.push({ engine, width, role, scenario, passed: true });
            console.log(`${label} OK`);
          } catch (error) {
            results.push({
              engine,
              width,
              role,
              scenario,
              passed: false,
              error: error.stack,
              errors,
            });
            console.error(`${label}: ${error.message}`);
            await page.screenshot({ path: `${out}/${label}-failed.png` }).catch(() => {});
          } finally {
            release();
            await context.unrouteAll({ behavior: 'wait' });
            await context.close();
            await f.close();
            writeFileSync(
              `${out}/results.json`,
              JSON.stringify(
                {
                  localOnly: true,
                  publicSiteVisited: false,
                  physicalDevicesTested: false,
                  results,
                },
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
assert.ok(results.length > 0 && results.every((r) => r.passed));
console.log(`${results.length} platform recovery scenarios passed.`);
