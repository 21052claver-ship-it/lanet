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
        await p.getByRole('tab', { name: 'Per validar', exact: true }).click();
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
      await p.getByRole('dialog').getByRole('alert').filter({ hasText: 'Error local recuperable.' }).waitFor();
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
    async function represent(p, f, position = 'delegate', unit = 'tech1') {
      f.db
        .prepare(
          "INSERT INTO delegation_members VALUES('browser@fje.edu',?,'Representant fictici',?,1)",
        )
        .run(unit, position);
      await p.reload();
      await p.getByRole('heading', { name: 'El teu horari', exact: true }).waitFor();
    }
    async function publicDraft(p, f, title, kind = 'Examen') {
      const slot = await classEditor(p, f);
      await p.getByRole('textbox', { name: 'Títol', exact: true }).fill(title);
      await p.getByRole('tab', { name: kind, exact: true }).click();
      await p.getByRole('button', { name: /^Públic/ }).click();
      return slot;
    }
    for (const width of [320, 1440])
      await run('direct-delegate-publish-edit', width, async (p, f) => {
        await represent(p, f);
        const slot = await publicDraft(p, f, 'Examen directe local');
        await p.getByRole('heading', { name: 'Pots publicar directament', exact: true }).waitFor();
        assert.equal(
          await p.getByRole('button', { name: 'Enviar a validació', exact: true }).count(),
          0,
        );
        await p.screenshot({ path: `${out}/${engine}-direct-${width}.png`, fullPage: true });
        await p.getByRole('button', { name: 'Publicar ara', exact: true }).click();
        await p.getByRole('dialog').waitFor({ state: 'hidden' });
        const row = f.db.prepare("SELECT * FROM events WHERE title='Examen directe local'").get();
        assert.equal(row.review_status, 'approved');
        assert.equal(row.reviewed_by, 'browser');
        assert.equal(f.db.prepare('SELECT COUNT(*) n FROM agenda_notifications').get().n, 0);
        assert.equal(await p.locator('.agenda-pending-banner').count(), 0);
        await p
          .locator('.event-card:visible')
          .filter({ hasText: 'Examen directe local' })
          .first()
          .click();
        await p.getByRole('button', { name: 'Editar', exact: true }).click();
        await p
          .getByRole('textbox', { name: 'Títol', exact: true })
          .fill('Examen directe actualitzat');
        await p.getByRole('button', { name: 'Publicar ara', exact: true }).click();
        await p.getByRole('dialog').waitFor({ state: 'hidden' });
        assert.equal(
          f.db.prepare('SELECT revision FROM events WHERE id=?').get(row.id).revision,
          2,
        );
        assert.deepEqual(
          f.db
            .prepare('SELECT action FROM event_review_history WHERE event_id=? ORDER BY revision')
            .all(row.id)
            .map((h) => h.action),
          ['publish', 'publish'],
        );
        await p.reload();
        await p.getByRole('heading', { name: 'El teu horari', exact: true }).waitFor();
        const day = p.locator('.timetable-days [role=tab]').nth(slot.day);
        if (await day.isVisible()) await day.click();
        await p
          .locator('.event-card:visible')
          .filter({ hasText: 'Examen directe actualitzat' })
          .first()
          .waitFor();
      });
    await run('subdelegate-direct-task-and-private-date', 390, async (p, f) => {
      await represent(p, f, 'subdelegate');
      await publicDraft(p, f, 'Tasca directa del subdelegat', 'Tasca');
      await p.getByRole('button', { name: 'Publicar ara', exact: true }).click();
      await p.getByRole('dialog').waitFor({ state: 'hidden' });
      const row = f.db
        .prepare("SELECT * FROM events WHERE title='Tasca directa del subdelegat'")
        .get();
      assert.equal(row.review_status, 'approved');
      assert.equal(row.display_kind, 'task');
      await classEditor(p, f);
      await p.getByRole('textbox', { name: 'Títol', exact: true }).fill('Personal del subdelegat');
      await p.getByLabel('Data', { exact: true }).fill(addDays(row.date, 1));
      await p.getByRole('button', { name: 'Desar', exact: true }).click();
      await p.getByRole('dialog').waitFor({ state: 'hidden' });
      const privateRow = f.db
        .prepare("SELECT * FROM events WHERE title='Personal del subdelegat'")
        .get();
      assert.equal(privateRow.visibility, 'private');
      assert.equal(privateRow.reviewed_by, null);
      assert.equal(f.db.prepare('SELECT COUNT(*) n FROM agenda_notifications').get().n, 0);
    });
    await run('delegate-scope-and-changed-preview-permissions', 390, async (p, f) => {
      await represent(p, f, 'delegate', 'tech2');
      await publicDraft(p, f, 'Fora del meu àmbit');
      await p.getByRole('combobox', { name: 'Destinataris de la data', exact: true }).click();
      await p.getByRole('option', { name: /^La meva classe/ }).click();
      await p.getByRole('button', { name: 'Enviar a validació', exact: true }).click();
      await p.getByRole('dialog').waitFor({ state: 'hidden' });
      assert.equal(
        f.db.prepare("SELECT review_status FROM events WHERE title='Fora del meu àmbit'").get()
          .review_status,
        'pending',
      );
      f.db.exec("UPDATE delegation_members SET unit_id='tech1' WHERE email='browser@fje.edu';");
      await publicDraft(p, f, 'Permisos actualitzats');
      await p.getByLabel('Data', { exact: true }).fill(addDays(madridDay(), 10));
      await p.getByRole('button', { name: 'Publicar ara', exact: true }).waitFor();
      f.db.exec("UPDATE delegation_members SET active=0 WHERE email='browser@fje.edu';");
      await p.getByRole('button', { name: 'Publicar ara', exact: true }).click();
      await p
        .getByRole('dialog')
        .getByRole('alert')
        .filter({ hasText: 'Han canviat els permisos' })
        .waitFor();
      assert.equal(
        f.db.prepare("SELECT COUNT(*) n FROM events WHERE title='Permisos actualitzats'").get().n,
        0,
      );
      await p.getByRole('button', { name: 'Enviar a validació', exact: true }).click();
      await p.getByRole('dialog').waitFor({ state: 'hidden' });
      assert.equal(
        f.db.prepare("SELECT review_status FROM events WHERE title='Permisos actualitzats'").get()
          .review_status,
        'pending',
      );
    });
    await run('direct-publication-error-retry-and-duplicate', 390, async (p, f) => {
      await represent(p, f);
      await publicDraft(p, f, 'Examen amb reintent');
      let failed = false;
      await p.route('**/api/events', async (route) => {
        if (!failed && route.request().method() === 'POST') {
          failed = true;
          await route.fulfill({
            status: 503,
            json: { error: 'Error local de publicació. Torna-ho a provar.' },
          });
        } else await route.continue();
      });
      await p.getByRole('button', { name: 'Publicar ara', exact: true }).click();
      await p.getByRole('dialog').getByRole('alert').waitFor();
      assert.equal(f.db.prepare('SELECT COUNT(*) n FROM events').get().n, 0);
      assert.equal(
        await p.getByRole('textbox', { name: 'Títol', exact: true }).inputValue(),
        'Examen amb reintent',
      );
      await p.getByRole('button', { name: 'Publicar ara', exact: true }).click();
      await p.getByRole('dialog').waitFor({ state: 'hidden' });
      assert.equal(f.db.prepare('SELECT COUNT(*) n FROM events').get().n, 1);
      await publicDraft(p, f, 'El mateix examen reanomenat');
      await p.getByRole('heading', { name: 'Possible duplicat', exact: true }).waitFor();
      assert.equal(
        await p.getByRole('button', { name: 'Publicar ara', exact: true }).isDisabled(),
        true,
      );
    });
    await run('permissions-rechecked-at-write', 390, async (p, f) => {
      await represent(p, f);
      await publicDraft(p, f, 'Canvi de permisos al desar');
      await p.route('**/api/events', async (route) => {
        if (route.request().method() === 'POST')
          f.db.exec("UPDATE delegation_members SET active=0 WHERE email='browser@fje.edu';");
        await route.continue();
      });
      await p.getByRole('button', { name: 'Publicar ara', exact: true }).click();
      await p.getByRole('dialog').waitFor({ state: 'hidden' });
      const row = f.db
        .prepare("SELECT * FROM events WHERE title='Canvi de permisos al desar'")
        .get();
      assert.equal(row.review_status, 'pending');
      assert.equal(row.reviewed_by, null);
      await p.getByRole('status').filter({ hasText: 'Proposta enviada als delegats.' }).waitFor();
    });
  } finally {
    await browser.close();
  }
}
console.log(`${results.length} local browser flows passed.`);
