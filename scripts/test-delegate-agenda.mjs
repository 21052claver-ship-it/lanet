import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { chromium, firefox, webkit } from 'playwright';
import { browserFixture } from '../tests/helpers/browser-fixture.mjs';
import { hash } from '../worker/utils.js';
import { monday, madridDay, addDays } from '../shared/domain.js';
const out = process.env.LANET_TEST_OUTPUT || 'output/delegates/browser';
mkdirSync(out, { recursive: true });
const results = [];
for (const engine of (process.env.LANET_BROWSER_ENGINES || 'chromium,firefox,webkit').split(',')) {
  const browser = await { chromium, firefox, webkit }[engine].launch();
  async function run(name, width, fn) {
    if (process.env.LANET_DELEGATE_CHECK && process.env.LANET_DELEGATE_CHECK !== name) return;
    if (
      process.env.LANET_TEST_WIDTHS &&
      !process.env.LANET_TEST_WIDTHS.split(',').includes(String(width))
    )
      return;
    const fixture = await browserFixture();
    fixture.db.exec(
      "DELETE FROM enrollments WHERE user_id='browser'; DELETE FROM events; INSERT INTO enrollments VALUES('browser','2B-math'),('browser','2B-phy'),('browser','2B-art'),('browser','2B-cat'),('browser','2B-tutor-comellas'); INSERT INTO users(id,email,name,password_hash,salt,google_sub,group_id,configured) VALUES('delegate','delegate-fixture@fje.edu','Delegada Local','x','x','fixture-delegate','2A',1); INSERT INTO delegation_members VALUES('delegate-fixture@fje.edu','tech1','Delegada Local','delegate',1),('sub-fixture@fje.edu','tech1','Subdelegat Local','subdelegate',1);",
    );
    fixture.db
      .prepare(
        "INSERT INTO sessions(hash,user_id,expires,auth_provider) VALUES(?,'delegate',?,'google')",
      )
      .run(await hash('local-delegate-token'), Date.now() + 3600000);
    const context = await browser.newContext({
      viewport: { width, height: 950 },
      reducedMotion: 'reduce',
      hasTouch: width < 1000,
    });
    await context.route('**/*', (route) =>
      new URL(route.request().url()).origin === fixture.base ? route.continue() : route.abort(),
    );
    await context.addCookies([{ name: 'lanet_session', value: fixture.token, url: fixture.base }]);
    const p = await context.newPage();
    p.setDefaultTimeout(15000);
    const errors = [];
    const failedRequests = [];
    p.on('pageerror', (e) => errors.push(e.message));
    p.on('requestfailed', (r) =>
      failedRequests.push({ url: r.url(), error: r.failure()?.errorText }),
    );
    try {
      await p.goto(fixture.base + '/#schedule');
      await p.getByRole('heading', { name: 'El teu horari', exact: true }).waitFor();
      await fn(p, fixture, context);
      assert.deepEqual(errors, []);
      assert.ok(
        await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1),
        'No page overflow',
      );
      results.push({ engine, name, width, passed: true });
      console.log(`${engine}: ${name} ${width} passed`);
    } catch (e) {
      results.push({
        engine,
        name,
        width,
        passed: false,
        error: e.message,
        errors,
        failedRequests,
      });
      await p.screenshot({ path: `${out}/${engine}-${name}-${width}-failed.png`, fullPage: true });
      throw e;
    } finally {
      writeFileSync(
        out + '/results.json',
        JSON.stringify({ localOnly: true, realDevicesTested: false, results }, null, 2),
      );
      await context.close();
      await fixture.close();
    }
  }
  const close = (p) =>
    p.getByRole('dialog').getByRole('button', { name: 'Tancar', exact: true }).first().click();
  async function classEditor(p, f) {
    const slot = f.db
      .prepare("SELECT * FROM slots WHERE offering_id='2B-math' ORDER BY day,start LIMIT 1")
      .get();
    const tab = p.locator('.timetable-days [role=tab]').nth(slot.day);
    if (await tab.isVisible()) await tab.click();
    const existing = p.locator('.timeline-event:visible .event-card').first();
    if (await existing.count()) {
      await existing.click();
      await p.getByRole('button', { name: 'Afegir una altra tasca o examen', exact: true }).click();
    } else {
      await p
        .locator('.timeline-class:visible')
        .filter({ hasText: 'Matemàtiques' })
        .first()
        .click();
      await p.getByRole('button', { name: 'Afegir tasca o examen', exact: true }).click();
    }
    const dialog = p.getByRole('dialog');
    assert.equal(
      await dialog.getByLabel('Data', { exact: true }).inputValue(),
      addDays(monday(madridDay()), slot.day),
    );
    assert.equal(await dialog.getByLabel('Hora d’inici', { exact: true }).inputValue(), slot.start);
    return slot;
  }
  try {
    for (const width of [320, 390, 820, 1440])
      await run('public-review-notification-contact', width, async (p, f, context) => {
        await classEditor(p, f);
        await p
          .getByRole('textbox', { name: 'Títol', exact: true })
          .fill('Parcial contextual local');
        await p.getByRole('tab', { name: 'Examen', exact: true }).click();
        await p.getByRole('button', { name: /^Públic/ }).click();
        await p
          .getByRole('region', { name: 'Qui ha d’autoritzar la proposta' })
          .getByText('Delegada Local', { exact: false })
          .waitFor();
        assert.equal(
          await p.getByRole('button', { name: /^Públic/ }).getAttribute('aria-pressed'),
          'true',
        );
        await p.screenshot({ path: `${out}/${engine}-public-editor-${width}.png`, fullPage: true });
        await p.getByRole('button', { name: 'Enviar a validació', exact: true }).click();
        await p.getByRole('dialog').waitFor({ state: 'hidden' });
        const event = f.db
          .prepare("SELECT * FROM events WHERE title='Parcial contextual local'")
          .get();
        assert.equal(event.review_status, 'pending');
        assert.equal(event.offering_id, '2B-math');
        await p.getByRole('button', { name: 'Veure propostes', exact: true }).click();
        await p.getByRole('heading', { name: 'Delegats de la comunitat', exact: true }).waitFor();
        await p.getByRole('tab', { name: 'Contactes', exact: true }).click();
        await p.getByRole('link', { name: 'delegate-fixture@fje.edu', exact: true }).waitFor();
        await p.screenshot({ path: `${out}/${engine}-contacts-${width}.png`, fullPage: true });
        await context.addCookies([
          { name: 'lanet_session', value: 'local-delegate-token', url: f.base },
        ]);
        await p.reload();
        await p.getByRole('tab', { name: 'Delegats', exact: true }).click();
        await p.getByRole('button', { name: 'Revisar proposta', exact: true }).click();
        await p.getByText('Cap duplicat ni coincidència detectats.', { exact: true }).waitFor();
        await p
          .getByRole('checkbox', {
            name: 'Confirmo que la data i el contingut són correctes',
            exact: true,
          })
          .check();
        await p.screenshot({ path: `${out}/${engine}-review-${width}.png`, fullPage: true });
        await p.getByRole('button', { name: 'Validar i publicar', exact: true }).click();
        await p.getByRole('dialog').waitFor({ state: 'hidden' });
        assert.equal(
          f.db.prepare('SELECT review_status FROM events WHERE id=?').get(event.id).review_status,
          'approved',
        );
        await context.addCookies([{ name: 'lanet_session', value: f.token, url: f.base }]);
        await p.reload();
        await p.getByRole('button', { name: /^Veure avisos/ }).click();
        await p.getByRole('heading', { name: 'Proposta aprovada', exact: true }).waitFor();
        await p.getByRole('button', { name: 'Marcar com a llegides', exact: true }).click();
        await p.waitForFunction(() => !document.querySelector('.agenda-notification.unread'));
        await p.reload();
        await p.getByRole('tab', { name: 'Notificacions', exact: true }).click();
        assert.equal(await p.locator('.agenda-notification.unread').count(), 0);
      });
    await run('private-recovery-duplicate-overlap', 390, async (p, f) => {
      const slot = await classEditor(p, f);
      const title = p.getByRole('textbox', { name: 'Títol', exact: true });
      await title.fill('Tasca privada local');
      const dateInput = p.getByLabel('Data', { exact: true }),
        dateValue = await dateInput.inputValue();
      await dateInput.fill('');
      await p.getByText('Tria la data', { exact: false }).first().waitFor();
      await dateInput.fill(dateValue);
      await close(p);
      await classEditor(p, f);
      assert.equal(await title.inputValue(), 'Tasca privada local');
      let failed = false;
      await p.route('**/api/events', async (route) => {
        if (!failed && route.request().method() === 'POST') {
          failed = true;
          await route.fulfill({ status: 503, json: { error: 'Error local recuperable.' } });
        } else await route.continue();
      });
      await p.getByRole('button', { name: 'Desar', exact: true }).click();
      await p.getByRole('alert').filter({ hasText: 'Error local recuperable.' }).waitFor();
      assert.equal(await title.inputValue(), 'Tasca privada local');
      await p.getByRole('button', { name: 'Desar', exact: true }).click();
      await p.getByRole('dialog').waitFor({ state: 'hidden' });
      const row = f.db.prepare("SELECT * FROM events WHERE title='Tasca privada local'").get();
      assert.equal(row.visibility, 'private');
      await classEditor(p, f);
      await title.fill('Tasca privada local');
      await p.getByRole('heading', { name: 'Possible duplicat', exact: true }).waitFor();
      assert.equal(await p.getByRole('button', { name: 'Desar', exact: true }).isDisabled(), true);
      await close(p);
      f.db
        .prepare(
          "INSERT INTO events(id,owner_id,title,kind,display_kind,date,start,end,subject_id,visibility) VALUES('overlap','browser','Examen existent','exam','exam',?,?,?,'phy','private')",
        )
        .run(row.date, slot.start, slot.end);
      await classEditor(p, f);
      await title.fill('Una tasca diferent');
      await p.getByRole('heading', { name: 'Coincidències d’horari', exact: true }).waitFor();
      await p
        .getByRole('checkbox', {
          name: 'He revisat les coincidències i vull continuar',
          exact: true,
        })
        .check();
      await p.screenshot({ path: `${out}/${engine}-overlap-390.png`, fullPage: true });
      await p.getByRole('button', { name: 'Desar', exact: true }).click();
      await p.getByRole('dialog').waitFor({ state: 'hidden' });
    });
  } finally {
    await browser.close();
  }
}
console.log(`${results.length} local browser flows passed.`);
