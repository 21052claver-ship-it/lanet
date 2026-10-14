import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { chromium, firefox, webkit } from 'playwright';
import { browserFixture } from '../tests/helpers/browser-fixture.mjs';
import { addDays, madridDay } from '../shared/domain.js';

const out = process.env.LANET_TEST_OUTPUT || 'output/functional-controls/browser';
mkdirSync(out, { recursive: true });
const results = [];
const gate = () => {
  let release;
  const promise = new Promise((resolve) => (release = resolve));
  return { promise, release };
};
async function choose(page, root, label, option) {
  await root.getByRole('combobox', { name: label, exact: true }).click();
  await page.getByRole('option', { name: option, exact: true }).click();
}
async function saveDialog(dialog, label = 'Desar') {
  await dialog.getByRole('button', { name: label, exact: true }).click();
  await dialog.waitFor({ state: 'hidden' });
}
for (const engine of (process.env.LANET_BROWSER_ENGINES || 'chromium,firefox,webkit').split(',')) {
  const browser = await { chromium, firefox, webkit }[engine].launch();
  try {
    async function check(name, role, width, run) {
      if (process.env.LANET_FUNCTIONAL_CHECK && !name.includes(process.env.LANET_FUNCTIONAL_CHECK))
        return;
      const f = await browserFixture();
      f.db.prepare("UPDATE users SET role=? WHERE id='browser'").run(role);
      const context = await browser.newContext({
        viewport: { width, height: 950 },
        hasTouch: width < 760,
        reducedMotion: 'reduce',
        acceptDownloads: true,
      });
      await context.route('**/*', (route) =>
        new URL(route.request().url()).origin === f.base ||
        route.request().url().startsWith('blob:')
          ? route.continue()
          : route.abort(),
      );
      await context.addCookies([{ name: 'lanet_session', value: f.token, url: f.base }]);
      const p = await context.newPage();
      p.setDefaultTimeout(10000);
      const errors = [];
      const held = [];
      p.on('pageerror', (error) => errors.push(error.message));
      try {
        await run(p, f, () => {
          const value = gate();
          held.push(value);
          return value;
        });
        assert.deepEqual(errors, []);
        assert.ok(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
        results.push({ engine, name, role, width, passed: true });
        console.log(`${engine}: ${name} OK`);
      } catch (error) {
        results.push({ engine, name, role, width, passed: false, error: error.message });
        await p.screenshot({ path: `${out}/${engine}-${name}-failed.png`, fullPage: true });
        throw error;
      } finally {
        held.forEach((value) => value.release());
        writeFileSync(
          `${out}/results.json`,
          JSON.stringify({ localOnly: true, publicSiteVisited: false, results }, null, 2) + '\n',
        );
        await context.close();
        await f.close();
      }
    }

    await check('grade-goal-zero-persists-and-reopens', 'student', 390, async (p, f) => {
      await p.goto(f.base + '/#grades');
      await p.getByRole('heading', { name: 'Les meves notes', exact: true }).waitFor();
      const openGoal = async () => {
        await p.locator('.section-options summary').click();
        await p.getByRole('button', { name: 'Objectiu i previsió', exact: true }).click();
        return p.getByRole('dialog', { name: 'Objectiu i previsió', exact: true });
      };
      let dialog = await openGoal();
      assert.equal(
        await dialog
          .getByRole('spinbutton', { name: 'Objectiu de mitjana', exact: true })
          .inputValue(),
        '8',
        'An absent goal uses the default eight',
      );
      await dialog.getByRole('spinbutton', { name: 'Objectiu de mitjana', exact: true }).fill('0');
      await dialog.getByRole('button', { name: 'Desar', exact: true }).click();
      await dialog.waitFor({ state: 'hidden' });
      assert.equal(
        f.db
          .prepare(
            "SELECT target FROM grade_goals WHERE user_id='browser' AND subject_id='math' AND term=1",
          )
          .get().target,
        0,
      );
      await p.reload();
      await p.getByRole('heading', { name: 'Les meves notes', exact: true }).waitFor();
      dialog = await openGoal();
      assert.equal(
        await dialog
          .getByRole('spinbutton', { name: 'Objectiu de mitjana', exact: true })
          .inputValue(),
        '0',
        'A valid saved zero goal must not reopen as the default eight',
      );
    });

    await check('grade-template-restore-cancel-and-persist', 'student', 1280, async (p, f) => {
      const entry = f.db
        .prepare(
          "SELECT id,assessment_type FROM grade_entries WHERE user_id='browser' AND subject_id='math' AND term=1 ORDER BY position LIMIT 1",
        )
        .get();
      f.db.prepare('UPDATE grade_entries SET grade=0 WHERE id=?').run(entry.id);
      const before = f.db
        .prepare(
          "SELECT * FROM grade_entries WHERE user_id='browser' AND subject_id='math' AND term=1 ORDER BY id",
        )
        .all();
      await p.goto(f.base + '/#grades');
      await p.getByRole('heading', { name: 'Les meves notes', exact: true }).waitFor();
      const openRestore = async () => {
        await p.locator('.section-options summary').click();
        await p.getByRole('button', { name: 'Recuperar plantilla', exact: true }).click();
        return p.getByRole('dialog', { name: 'Recuperar la plantilla del delegat', exact: true });
      };
      let dialog = await openRestore();
      await dialog.getByRole('button', { name: 'Cancel·lar', exact: true }).click();
      await dialog.waitFor({ state: 'hidden' });
      assert.deepEqual(
        f.db
          .prepare(
            "SELECT * FROM grade_entries WHERE user_id='browser' AND subject_id='math' AND term=1 ORDER BY id",
          )
          .all(),
        before,
      );
      dialog = await openRestore();
      await saveDialog(dialog, 'Recuperar plantilla');
      const after = f.db
        .prepare(
          "SELECT * FROM grade_entries WHERE user_id='browser' AND subject_id='math' AND term=1",
        )
        .all();
      assert.equal(after.find((row) => row.assessment_type === entry.assessment_type).grade, 0);
      assert.ok(Math.abs(after.reduce((sum, row) => sum + row.weight, 0) - 100) < 0.001);
      await p.reload();
      await p.getByRole('heading', { name: 'Les meves notes', exact: true }).waitFor();
      assert.equal(
        (
          await p.request.get(f.base + '/api/bootstrap').then((response) => response.json())
        ).grades.find(
          (row) =>
            row.subject_id === 'math' &&
            row.term === 1 &&
            row.assessment_type === entry.assessment_type,
        ).grade,
        0,
      );
    });

    await check('management-content-removal-cancel-and-archive', 'admin', 390, async (p, f) => {
      f.db.exec(
        "INSERT INTO reports(id,user_id,type,target_id,reason) VALUES('qa-remove','browser','note','browser-note','Retirada QA funcional');",
      );
      await p.goto(f.base + '/#management');
      await p.getByRole('tab', { name: 'Revisions', exact: true }).click();
      const report = p.locator('article').filter({ hasText: 'Retirada QA funcional' });
      await report.getByRole('button', { name: 'Retirar', exact: true }).click();
      let dialog = p.getByRole('dialog', { name: 'Retirar contingut', exact: true });
      await dialog.getByRole('button', { name: 'Cancel·lar', exact: true }).click();
      await dialog.waitFor({ state: 'hidden' });
      assert.equal(
        f.db.prepare("SELECT status FROM notes WHERE id='browser-note'").get().status,
        'published',
      );
      await report.getByRole('button', { name: 'Retirar', exact: true }).click();
      dialog = p.getByRole('dialog', { name: 'Retirar contingut', exact: true });
      await saveDialog(dialog, 'Retirar');
      assert.equal(
        f.db.prepare("SELECT status FROM notes WHERE id='browser-note'").get().status,
        'archived',
      );
      assert.equal(
        f.db.prepare("SELECT COUNT(*) n FROM files WHERE note_id='browser-note'").get().n,
        1,
        'Retirement preserves purchased material and its attachment',
      );
      await report.getByRole('button', { name: 'Veure contingut', exact: true }).click();
      await p.getByRole('dialog', { name: 'PDF de prova local', exact: true }).waitFor();
      await p.getByRole('dialog').getByRole('button', { name: 'Tancar', exact: true }).click();
      await report.getByRole('button', { name: 'Marcar com resolt', exact: true }).click();
      await report.waitFor({ state: 'hidden' });
      await p.reload();
      await p.getByRole('tab', { name: 'Revisions', exact: true }).click();
      assert.equal(
        await p.locator('article').filter({ hasText: 'Retirada QA funcional' }).count(),
        0,
      );
    });

    await check('pending-form-cancel-preserves-next-form', 'admin', 1280, async (p, f, hold) => {
      await p.goto(f.base + '/#management');
      await p.getByRole('button', { name: 'Configurar centre', exact: true }).click();
      const first = p.getByRole('dialog', { name: 'Configurar el centre', exact: true });
      await first
        .getByRole('textbox', { name: 'Nom del centre', exact: true })
        .fill('Centre QA desat');
      const started = hold();
      const finish = hold();
      await p.route(f.base + '/api/admin/settings', async (route) => {
        started.release();
        await finish.promise;
        await route.continue();
      });
      await first.getByRole('button', { name: 'Desar', exact: true }).click();
      await started.promise;
      await first.getByRole('button', { name: 'Cancel·lar', exact: true }).click();
      await first.waitFor({ state: 'hidden' });
      await p.getByRole('button', { name: 'Nou grup', exact: true }).click();
      const next = p.getByRole('dialog', { name: 'Grup del centre', exact: true });
      const field = next.getByRole('textbox', { name: 'Nom del grup', exact: true });
      await field.fill('Grup següent que cal conservar');
      const refreshed = p.waitForResponse((r) => new URL(r.url()).pathname === '/api/bootstrap');
      finish.release();
      await refreshed;
      await p.evaluate(
        () => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))),
      );
      assert.equal(
        await next.isVisible(),
        true,
        'Completing a dismissed form must not close a newer form',
      );
      assert.equal(await field.inputValue(), 'Grup següent que cal conservar');
      assert.equal(
        f.db.prepare("SELECT value FROM settings WHERE key='school_name'").get().value,
        'Centre QA desat',
      );
    });

    await check('management-catalog-and-slot-controls', 'admin', 1280, async (p, f) => {
      await p.goto(f.base + '/#management');
      await p.getByRole('button', { name: 'Nou grup', exact: true }).click();
      let dialog = p.getByRole('dialog');
      await dialog
        .getByRole('textbox', { name: 'Nom del grup', exact: true })
        .fill('Grup QA funcional');
      await saveDialog(dialog);
      const group = f.db.prepare("SELECT id FROM groups WHERE name='Grup QA funcional'").get();
      assert.ok(group);
      await p.getByRole('button', { name: 'Nova assignatura', exact: true }).click();
      dialog = p.getByRole('dialog');
      await dialog
        .getByRole('textbox', { name: 'Nom complet', exact: true })
        .fill('Ciències de prova QA');
      await dialog.getByRole('textbox', { name: 'Nom curt', exact: true }).fill('QA');
      await choose(p, dialog, 'Itinerari', 'Comuna');
      await saveDialog(dialog);
      const subject = f.db.prepare("SELECT id,path FROM subjects WHERE short='QA'").get();
      assert.equal(subject.path, 'common');
      await choose(p, p, 'Grup gestionat', 'Grup QA funcional');
      await p.getByRole('button', { name: 'Afegir variant', exact: true }).click();
      dialog = p.getByRole('dialog');
      await choose(p, dialog, 'Assignatura', 'Ciències de prova QA');
      await dialog
        .getByRole('textbox', { name: 'Professorat general', exact: true })
        .fill('Docent QA');
      await dialog
        .getByRole('textbox', { name: 'Variant', exact: true })
        .fill('Variant QA funcional');
      await dialog.getByRole('button', { name: 'Afegir franja', exact: true }).click();
      assert.equal(
        await dialog.getByRole('button', { name: 'Treure franja', exact: true }).count(),
        2,
      );
      await dialog.getByRole('button', { name: 'Treure franja', exact: true }).nth(1).click();
      assert.equal(
        await dialog.getByRole('button', { name: 'Treure franja', exact: true }).count(),
        1,
      );
      assert.equal(
        await dialog.getByRole('button', { name: 'Treure franja', exact: true }).isDisabled(),
        true,
      );
      await dialog.getByRole('button', { name: 'Afegir franja', exact: true }).click();
      await choose(p, dialog, 'Dia de la franja 2', 'Dimarts');
      await dialog.getByLabel('Inici de la franja 2', { exact: true }).fill('10:10');
      await dialog.getByLabel('Final de la franja 2', { exact: true }).fill('11:10');
      await dialog.getByRole('textbox', { name: 'Aula de la franja 2', exact: true }).fill('Q-2');
      await choose(p, dialog, 'Professorat de la franja 1', 'Treball personal');
      await choose(p, dialog, 'Professorat de la franja 2', 'Professorat d’aquest dia');
      await dialog
        .getByRole('textbox', { name: 'Nom del professor de la franja 2', exact: true })
        .fill('Docent de dimarts QA');
      await dialog
        .getByRole('textbox', { name: 'Indicació de la franja 2', exact: true })
        .fill('Indicació QA');
      await saveDialog(dialog);
      const offering = f.db
        .prepare("SELECT * FROM offerings WHERE variant='Variant QA funcional'")
        .get();
      assert.equal(offering.group_id, group.id);
      assert.equal(offering.subject_id, subject.id);
      let slots = f.db
        .prepare('SELECT * FROM slots WHERE offering_id=? ORDER BY day')
        .all(offering.id);
      assert.equal(slots.length, 2);
      assert.equal(slots[0].teacher, '');
      assert.equal(slots[0].note, 'Treball personal');
      assert.equal(slots[1].teacher, 'Docent de dimarts QA');
      assert.equal(slots[1].room, 'Q-2');
      await p.getByRole('button', { name: 'Editar QA', exact: true }).click();
      dialog = p.getByRole('dialog');
      assert.equal(
        await dialog
          .getByRole('textbox', { name: 'Nom del professor de la franja 2', exact: true })
          .inputValue(),
        'Docent de dimarts QA',
      );
      await dialog.getByRole('button', { name: 'Treure franja', exact: true }).nth(1).click();
      await choose(p, dialog, 'Professorat de la franja 1', 'Professorat general');
      await saveDialog(dialog);
      slots = f.db.prepare('SELECT * FROM slots WHERE offering_id=?').all(offering.id);
      assert.equal(slots.length, 1);
      assert.equal(slots[0].teacher, null);
      await p.reload();
      await choose(p, p, 'Grup gestionat', 'Grup QA funcional');
      await p.getByRole('button', { name: 'Editar QA', exact: true }).waitFor();
    });

    await check('management-template-preserves-personal-grades', 'admin', 1280, async (p, f) => {
      const before = f.db
        .prepare("SELECT * FROM grade_entries WHERE user_id='browser' ORDER BY id")
        .all();
      await p.goto(f.base + '/#management');
      await p.getByRole('tab', { name: 'Percentatges', exact: true }).click();
      await p
        .locator('.template-card')
        .first()
        .getByRole('button', { name: 'Editar plantilla', exact: true })
        .click();
      const dialog = p.getByRole('dialog');
      const weights = dialog.getByRole('spinbutton', { name: /^Pes:/ });
      await weights.nth(0).fill('20');
      await weights.nth(1).fill('30');
      await weights.nth(2).fill('50');
      await dialog.getByRole('textbox', { name: /^Nom:/ }).first().fill('Parcial QA conservat');
      await dialog.getByRole('button', { name: 'Altra activitat', exact: true }).click();
      await dialog
        .locator('.assessment-optional')
        .filter({ hasText: 'Altres activitats' })
        .locator('summary')
        .click();
      await dialog.getByRole('textbox', { name: /^Nom:/ }).last().fill('Activitat QA opcional');
      await dialog
        .getByRole('button', { name: 'Treure Activitat QA opcional', exact: true })
        .click();
      assert.equal(
        await dialog
          .getByRole('textbox', { name: 'Nom: Activitat QA opcional', exact: true })
          .count(),
        0,
      );
      await saveDialog(dialog);
      assert.equal(
        f.db.prepare("SELECT COUNT(*) n FROM templates WHERE title='Parcial QA conservat'").get().n,
        1,
      );
      assert.deepEqual(
        f.db.prepare("SELECT * FROM grade_entries WHERE user_id='browser' ORDER BY id").all(),
        before,
      );
      await p.reload();
      await p.getByRole('tab', { name: 'Percentatges', exact: true }).click();
      await p
        .locator('.template-card')
        .first()
        .getByRole('button', { name: 'Editar plantilla', exact: true })
        .click();
      assert.equal(
        await p.getByRole('dialog').getByRole('textbox', { name: /^Nom:/ }).first().inputValue(),
        'Parcial QA conservat',
      );
    });

    await check(
      'management-account-permissions-and-session-revocation',
      'admin',
      1280,
      async (p, f) => {
        f.db.exec(
          "INSERT INTO users(id,email,name,password_hash,salt,google_sub,group_id) VALUES('qa-other','qa-other@example.invalid','Persona QA administrada','x','x','qa-other-sub','2B');",
        );
        f.db
          .prepare(
            "INSERT INTO sessions(hash,user_id,expires,auth_provider) VALUES('qa-other-session','qa-other',?,'google')",
          )
          .run(Date.now() + 3600000);
        await p.goto(f.base + '/#management');
        await p.getByRole('tab', { name: 'Comptes', exact: true }).click();
        const own = p.locator('.admin-table tbody tr').filter({ hasText: 'browser@fje.edu' });
        assert.equal(
          await own.getByRole('button', { name: 'Gestionar', exact: true }).isDisabled(),
          true,
        );
        let row = p
          .locator('.admin-table tbody tr')
          .filter({ hasText: 'qa-other@example.invalid' });
        await row.getByRole('button', { name: 'Gestionar', exact: true }).click();
        let dialog = p.getByRole('dialog');
        await choose(p, dialog, 'Rol', 'Delegat');
        await dialog
          .getByRole('checkbox', { name: 'Desactivar l’accés d’aquest compte', exact: true })
          .check();
        await saveDialog(dialog);
        assert.deepEqual(
          { ...f.db.prepare("SELECT role,disabled FROM users WHERE id='qa-other'").get() },
          { role: 'delegate', disabled: 1 },
        );
        assert.equal(
          f.db.prepare("SELECT COUNT(*) n FROM sessions WHERE user_id='qa-other'").get().n,
          0,
        );
        row = p.locator('.admin-table tbody tr').filter({ hasText: 'qa-other@example.invalid' });
        await row.getByRole('button', { name: 'Gestionar', exact: true }).click();
        dialog = p.getByRole('dialog');
        await choose(p, dialog, 'Rol', 'Estudiant');
        await dialog
          .getByRole('checkbox', { name: 'Desactivar l’accés d’aquest compte', exact: true })
          .uncheck();
        await saveDialog(dialog);
        assert.equal(
          f.db.prepare("SELECT disabled FROM users WHERE id='qa-other'").get().disabled,
          0,
        );
      },
    );

    await check('management-retry-keeps-form-values', 'admin', 390, async (p, f) => {
      let failRead = true;
      await p.route(f.base + '/api/admin', async (route) => {
        if (failRead) {
          failRead = false;
          await route.fulfill({ status: 503, json: { error: 'Lectura QA interrompuda.' } });
        } else await route.continue();
      });
      await p.goto(f.base + '/#management');
      await p.getByRole('alert').filter({ hasText: 'Lectura QA interrompuda.' }).waitFor();
      await p.getByRole('button', { name: 'Tornar-ho a provar', exact: true }).click();
      await p
        .getByRole('alert')
        .filter({ hasText: 'Lectura QA interrompuda.' })
        .waitFor({ state: 'hidden' });
      await p.getByRole('button', { name: 'Configurar centre', exact: true }).click();
      const dialog = p.getByRole('dialog');
      await dialog
        .getByRole('textbox', { name: 'Nom del centre', exact: true })
        .fill('Centre QA recuperat');
      let failWrite = true;
      await p.route(f.base + '/api/admin/settings', async (route) => {
        if (failWrite) {
          failWrite = false;
          await route.fulfill({ status: 503, json: { error: 'Desament QA interromput.' } });
        } else await route.continue();
      });
      await dialog.getByRole('button', { name: 'Desar', exact: true }).click();
      await dialog.getByRole('alert').filter({ hasText: 'Desament QA interromput.' }).waitFor();
      assert.equal(
        await dialog.getByRole('textbox', { name: 'Nom del centre', exact: true }).inputValue(),
        'Centre QA recuperat',
      );
      await saveDialog(dialog);
      assert.equal(
        f.db.prepare("SELECT value FROM settings WHERE key='school_name'").get().value,
        'Centre QA recuperat',
      );
    });

    await check('community-proposal-edit-and-report', 'student', 390, async (p, f) => {
      await p.goto(f.base + '/#community');
      await p.getByRole('button', { name: 'Proposa una idea', exact: true }).first().click();
      let dialog = p.getByRole('dialog');
      await dialog
        .getByRole('textbox', { name: 'La teva idea', exact: true })
        .fill('Idea funcional QA');
      await dialog
        .getByRole('textbox', { name: 'Com ajudaria?', exact: true })
        .fill('Proposta local per verificar tots els controls.');
      await saveDialog(dialog, 'Publicar la idea');
      const proposal = f.db
        .prepare("SELECT id FROM proposals WHERE title='Idea funcional QA'")
        .get();
      assert.ok(proposal);
      await p.getByRole('tab', { name: 'Propostes', exact: true }).click();
      await p
        .getByRole('textbox', { name: 'Cercar propostes', exact: true })
        .fill('Idea funcional QA');
      let row = p.locator('.proposal-row').filter({ hasText: 'Idea funcional QA' });
      await row.getByRole('button', { name: 'Editar proposta', exact: true }).click();
      dialog = p.getByRole('dialog');
      await dialog
        .getByRole('textbox', { name: 'La teva idea', exact: true })
        .fill('Idea funcional QA editada');
      await saveDialog(dialog, 'Desar canvis');
      assert.equal(
        f.db.prepare('SELECT title FROM proposals WHERE id=?').get(proposal.id).title,
        'Idea funcional QA editada',
      );
      await p
        .getByRole('textbox', { name: 'Cercar propostes', exact: true })
        .fill('Una idea local');
      row = p.locator('.proposal-row').filter({ hasText: 'Una idea local' });
      await row.getByRole('button', { name: 'Informar d’aquesta proposta', exact: true }).click();
      dialog = p.getByRole('dialog');
      await dialog.getByRole('textbox').fill('Motiu QA per verificar la revisió.');
      await saveDialog(dialog, 'Enviar avís');
      assert.equal(
        f.db
          .prepare(
            "SELECT COUNT(*) n FROM reports WHERE type='proposal' AND target_id='browser-proposal'",
          )
          .get().n,
        1,
      );
      await p.reload();
      await p.getByRole('tab', { name: 'Propostes', exact: true }).click();
      await p
        .getByRole('textbox', { name: 'Cercar propostes', exact: true })
        .fill('Idea funcional QA editada');
      await p.locator('.proposal-row').filter({ hasText: 'Idea funcional QA editada' }).waitFor();
    });

    await check('community-announcement-and-proposal-management', 'admin', 1280, async (p, f) => {
      await p.goto(f.base + '/#community');
      await p.getByRole('button', { name: 'Publicar avís', exact: true }).click();
      let dialog = p.getByRole('dialog');
      await dialog.getByRole('textbox', { name: 'Títol', exact: true }).fill('Avís funcional QA');
      await dialog
        .getByRole('textbox', { name: 'Missatge', exact: true })
        .fill('Missatge per provar publicar, editar i eliminar.');
      await dialog.getByRole('checkbox', { name: 'Fixar al principi', exact: true }).check();
      await choose(p, dialog, 'Destinataris', 'Tot el centre');
      await saveDialog(dialog);
      const announcement = f.db
        .prepare("SELECT * FROM announcements WHERE title='Avís funcional QA'")
        .get();
      assert.equal(announcement.group_id, null);
      assert.equal(announcement.pinned, 1);
      let card = p.locator('.announcement').filter({ hasText: 'Avís funcional QA' });
      if (!(await card.count()))
        card = p.locator('article').filter({ hasText: 'Avís funcional QA' });
      await card.getByRole('button', { name: 'Editar avís', exact: true }).click();
      dialog = p.getByRole('dialog');
      await dialog
        .getByRole('textbox', { name: 'Missatge', exact: true })
        .fill('Missatge QA editat');
      await saveDialog(dialog);
      assert.equal(
        f.db.prepare('SELECT body FROM announcements WHERE id=?').get(announcement.id).body,
        'Missatge QA editat',
      );
      await card.getByRole('button', { name: 'Editar avís', exact: true }).click();
      await p.getByRole('dialog').getByRole('button', { name: 'Eliminar', exact: true }).click();
      await saveDialog(
        p.getByRole('dialog', { name: 'Retirar contingut', exact: true }),
        'Retirar',
      );
      assert.equal(
        f.db.prepare('SELECT COUNT(*) n FROM announcements WHERE id=?').get(announcement.id).n,
        0,
      );
      await p.getByRole('tab', { name: 'Propostes', exact: true }).click();
      const proposal = p.locator('.proposal-row').filter({ hasText: 'Una idea local' });
      await proposal.getByRole('button', { name: 'Gestionar', exact: true }).click();
      dialog = p.getByRole('dialog');
      await choose(p, dialog, 'Estat', 'Fet');
      await dialog
        .getByRole('textbox', { name: 'Resposta de l’equip', exact: true })
        .fill('Resposta funcional QA');
      await saveDialog(dialog);
      const result = f.db
        .prepare("SELECT status,response FROM proposals WHERE id='browser-proposal'")
        .get();
      assert.equal(result.status, 'Fet');
      assert.equal(result.response, 'Resposta funcional QA');
      await choose(p, p, 'Filtrar estat', 'Fet');
      await choose(p, p, 'Ordenar propostes', 'Més recents');
      assert.equal(await p.locator('.proposal-row').count(), 1);
      await p.reload();
      await p.getByRole('tab', { name: 'Propostes', exact: true }).click();
      await p.locator('.team-response').filter({ hasText: 'Resposta funcional QA' }).waitFor();
    });

    await check('plus-create-calendar-edit-and-withdraw', 'student', 390, async (p, f) => {
      await p.goto(f.base + '/#pluses');
      await p.getByRole('button', { name: 'Publica un plus', exact: true }).click();
      let dialog = p.getByRole('dialog');
      await dialog
        .getByRole('textbox', { name: 'Nom de l’activitat', exact: true })
        .fill('Activitat funcional QA');
      await dialog
        .getByRole('textbox', { name: 'De què tracta?', exact: true })
        .fill('Plus local per comprovar el calendari i les accions.');
      await dialog.getByLabel('Data', { exact: true }).fill(addDays(madridDay(), 1));
      await dialog.getByRole('textbox', { name: 'Lloc', exact: true }).fill('Aula QA');
      const math = f.db.prepare("SELECT short FROM subjects WHERE id='math'").get().short;
      await choose(p, dialog, 'Assignatura 1', math);
      await dialog.getByRole('button', { name: 'Una altra assignatura', exact: true }).click();
      assert.equal(
        await dialog.getByRole('button', { name: 'Treure assignatura', exact: true }).count(),
        2,
      );
      await dialog.getByRole('button', { name: 'Treure assignatura', exact: true }).nth(1).click();
      assert.equal(
        await dialog.getByRole('button', { name: 'Treure assignatura', exact: true }).isDisabled(),
        true,
      );
      await saveDialog(dialog, 'Publicar plus');
      const plus = f.db.prepare("SELECT id FROM pluses WHERE title='Activitat funcional QA'").get();
      assert.ok(plus);
      await p.getByRole('button', { name: 'Obrir Activitat funcional QA', exact: true }).click();
      dialog = p.getByRole('dialog');
      await dialog.getByRole('button', { name: 'Afegir al meu calendari', exact: true }).click();
      await dialog.getByRole('button', { name: 'Ja és al teu calendari', exact: true }).waitFor();
      assert.equal(
        await dialog
          .getByRole('button', { name: 'Ja és al teu calendari', exact: true })
          .isDisabled(),
        true,
      );
      const events = f.db
        .prepare('SELECT owner_id,visibility FROM events WHERE source_key=?')
        .all(`plus:${plus.id}:browser`);
      assert.equal(events.length, 1);
      assert.equal(events[0].owner_id, 'browser');
      assert.equal(events[0].visibility, 'private');
      await dialog.getByRole('button', { name: 'Editar', exact: true }).click();
      dialog = p.getByRole('dialog');
      await dialog.getByRole('textbox', { name: 'Lloc', exact: true }).fill('Aula QA editada');
      await saveDialog(dialog, 'Publicar plus');
      assert.equal(
        f.db.prepare('SELECT place FROM pluses WHERE id=?').get(plus.id).place,
        'Aula QA editada',
      );
      await p.getByRole('button', { name: 'Obrir Activitat funcional QA', exact: true }).click();
      await p.getByRole('dialog').getByRole('button', { name: 'Editar', exact: true }).click();
      await p.getByRole('dialog').getByRole('button', { name: 'Retirar', exact: true }).click();
      await saveDialog(
        p.getByRole('dialog', { name: 'Retirar contingut', exact: true }),
        'Retirar',
      );
      assert.equal(
        f.db.prepare('SELECT status FROM pluses WHERE id=?').get(plus.id).status,
        'archived',
      );
      assert.equal(
        await p.getByRole('button', { name: 'Obrir Activitat funcional QA', exact: true }).count(),
        0,
      );
    });

    await check(
      'profile-logout-error-retry-and-session-removal',
      'student',
      390,
      async (p, f, hold) => {
        await p.goto(f.base + '/#schedule');
        await p.getByRole('button', { name: /^Perfil de / }).click();
        const dialog = p.getByRole('dialog');
        await dialog.getByRole('tab', { name: 'Assignatures', exact: true }).click();
        await dialog.getByRole('tab', { name: 'Perfil', exact: true }).click();
        assert.equal(
          await dialog.getByRole('textbox').count(),
          0,
          'Google identity cannot be edited',
        );
        let attempts = 0;
        const started = hold(),
          released = hold();
        await p.route('**/api/auth/logout', async (route) => {
          attempts++;
          if (attempts === 1) {
            started.release();
            await released.promise;
            await route.fulfill({
              status: 503,
              contentType: 'application/json',
              body: JSON.stringify({ error: 'No s’ha pogut tancar la sessió de prova.' }),
            });
          } else await route.continue();
        });
        await dialog.getByRole('button', { name: 'Tancar sessió', exact: true }).click();
        await started.promise;
        assert.equal(
          await dialog.getByRole('button', { name: 'Tancant sessió…', exact: true }).isDisabled(),
          true,
        );
        released.release();
        await dialog
          .getByRole('alert')
          .filter({ hasText: 'No s’ha pogut tancar la sessió de prova.' })
          .waitFor();
        assert.equal(
          f.db.prepare("SELECT COUNT(*) n FROM sessions WHERE user_id='browser'").get().n,
          1,
        );
        await dialog.getByRole('button', { name: 'Tancar sessió', exact: true }).click();
        await dialog.waitFor({ state: 'hidden' });
        assert.equal(attempts, 2);
        assert.equal(
          f.db.prepare("SELECT COUNT(*) n FROM sessions WHERE user_id='browser'").get().n,
          0,
        );
        assert.equal((await p.request.get(f.base + '/api/bootstrap')).status(), 401);
        assert.equal(
          (await p.context().cookies(f.base)).some((cookie) => cookie.name === 'lanet_session'),
          false,
        );
      },
    );

    await check('role-restrictions-and-report-resolution', 'delegate', 390, async (p, f) => {
      f.db.exec(
        "INSERT INTO reports(id,user_id,type,target_id,reason) VALUES('qa-report','browser','note','browser-note','Motiu local QA');",
      );
      await p.goto(f.base + '/#management');
      await p.getByRole('heading', { name: 'Gestió del centre', exact: true }).waitFor();
      assert.equal(
        await p.getByRole('button', { name: 'Configurar centre', exact: true }).count(),
        0,
      );
      assert.equal(await p.getByRole('tab', { name: 'Comptes', exact: true }).count(), 0);
      const forbidden = await p.request.post(f.base + '/api/admin/settings', {
        data: { school_name: 'No autoritzat' },
        headers: { Origin: f.base },
      });
      assert.equal(forbidden.status(), 403);
      await p.getByRole('tab', { name: 'Revisions', exact: true }).click();
      const report = p.locator('article').filter({ hasText: 'Motiu local QA' });
      await report.getByRole('button', { name: 'Veure contingut', exact: true }).click();
      await p.getByRole('dialog', { name: 'PDF de prova local', exact: true }).waitFor();
      await p.getByRole('dialog').getByRole('button', { name: 'Tancar', exact: true }).click();
      await report.getByRole('button', { name: 'Marcar com resolt', exact: true }).click();
      await report.waitFor({ state: 'hidden' });
      assert.equal(
        f.db.prepare("SELECT resolved FROM reports WHERE id='qa-report'").get().resolved,
        1,
      );
      f.db.prepare("UPDATE users SET role='student' WHERE id='browser'").run();
      await p.reload();
      await p
        .getByRole('heading', {
          name: 'Aquest espai és per als responsables del centre',
          exact: true,
        })
        .waitFor();
      assert.equal((await p.request.get(f.base + '/api/admin')).status(), 403);
    });
  } finally {
    await browser.close();
  }
}
assert.ok(results.length > 0, 'The requested filter must execute at least one scenario');
if (!process.env.LANET_FUNCTIONAL_CHECK)
  assert.equal(
    results.length,
    13 * (process.env.LANET_BROWSER_ENGINES || 'chromium,firefox,webkit').split(',').length,
  );
console.log(JSON.stringify({ passed: results.length, output: out }));
