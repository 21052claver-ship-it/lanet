import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { chromium, firefox, webkit } from 'playwright';
import { browserFixture } from '../tests/helpers/browser-fixture.mjs';
import { hash } from '../worker/utils.js';
import { addDays, madridDay } from '../shared/domain.js';

const out = process.env.LANET_TEST_OUTPUT || 'output/class-sequence/browser';
mkdirSync(out, { recursive: true });
const results = [];
const engines = { chromium, firefox, webkit };
const closeDialog = (p) =>
  p.getByRole('dialog').getByRole('button', { name: 'Tancar', exact: true }).first().click();
const taskTitle = 'Preparar els exercicis de la classe';
const gate = () => {
  let release;
  const promise = new Promise((resolve) => (release = resolve));
  return { promise, release };
};

async function agenda(p, base) {
  await p.goto(base + '/#schedule');
  await p.getByRole('tab', { name: 'Agenda', exact: true }).click();
  await p.getByRole('tab', { name: 'Llista', exact: true }).click();
}
function taskRow(p) {
  return p.locator('.agenda-row').filter({ hasText: taskTitle });
}
async function choose(p, label, option) {
  await p.getByRole('combobox', { name: label, exact: true }).click();
  await p.getByRole('option', { name: option, exact: true }).click();
}

async function openMathClass(p, f) {
  await p.goto(f.base + '/#schedule');
  await p.getByRole('heading', { name: 'El teu horari', exact: true }).waitFor();
  const slot = f.db
    .prepare("SELECT * FROM slots WHERE offering_id='2B-math' ORDER BY day,start LIMIT 1")
    .get();
  const tab = p.locator('.timetable-days [role=tab]').nth(slot.day);
  if (await tab.isVisible()) await tab.click();
  await p.locator('.timeline-class:visible').filter({ hasText: 'Matemàtiques' }).first().click();
  return slot;
}

for (const engine of (process.env.LANET_BROWSER_ENGINES || 'chromium,firefox,webkit').split(',')) {
  const browser = await engines[engine].launch();
  try {
    async function run(name, width, scenario) {
      if (process.env.LANET_CLASS_CHECK && !name.includes(process.env.LANET_CLASS_CHECK)) return;
      if (
        process.env.LANET_TEST_WIDTHS &&
        !process.env.LANET_TEST_WIDTHS.split(',').includes(String(width))
      )
        return;
      const f = await browserFixture();
      const today = madridDay();
      f.db.exec(
        "DELETE FROM events; DELETE FROM enrollments WHERE user_id='browser'; INSERT INTO enrollments VALUES('browser','2B-math'),('browser','2B-phy'),('browser','2B-tutor-comellas');",
      );
      for (const id of ['classmate', 'delegate']) {
        f.db
          .prepare(
            "INSERT INTO users(id,email,name,password_hash,salt,google_sub,group_id,configured) VALUES(?,?,?,'x','x',?,'2B',1)",
          )
          .run(id, id + '@example.invalid', 'Alumne fictici ' + id, 'fixture-' + id);
        f.db
          .prepare(
            "INSERT INTO enrollments SELECT ?,offering_id FROM enrollments WHERE user_id='browser'",
          )
          .run(id);
        f.db
          .prepare('INSERT INTO sessions(hash,user_id,expires,auth_provider) VALUES(?,?,?,?)')
          .run(await hash('fixture-' + id), id, Date.now() + 3600000, 'google');
      }
      f.db
        .prepare('INSERT INTO delegation_members VALUES(?,?,?,?,1)')
        .run('delegate@example.invalid', 'tech1', 'Delegat fictici', 'delegate');
      const contexts = [],
        errors = [],
        held = [];
      async function actor(id = 'browser') {
        const context = await browser.newContext({
          viewport: { width, height: width === 740 ? 390 : 950 },
          hasTouch: width < 1000,
          reducedMotion: 'reduce',
        });
        contexts.push(context);
        if (name === 'task-detail-commit-survives-refresh-error')
          await context.addInitScript(() => {
            Object.hasOwn = undefined;
          });
        await context.route('**/*', (r) =>
          new URL(r.request().url()).origin === f.base || r.request().url().startsWith('blob:')
            ? r.continue()
            : r.abort(),
        );
        await context.addCookies([
          {
            name: 'lanet_session',
            value: id === 'browser' ? f.token : 'fixture-' + id,
            url: f.base,
          },
        ]);
        const p = await context.newPage();
        p.setDefaultTimeout(7000);
        p.on('pageerror', (e) => errors.push(e.message));
        return p;
      }
      const hold = () => {
        const g = gate();
        held.push(g);
        return g;
      };
      const p = await actor();
      try {
        await scenario({ p, f, actor, today, hold });
        assert.deepEqual(errors, [], 'No uncaught browser errors');
        for (const context of contexts)
          for (const page of context.pages())
            assert.ok(
              await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1),
              'No page overflow',
            );
        await p.screenshot({ path: `${out}/${engine}-${name}-${width}.png` });
        results.push({ engine, name, width, passed: true });
        console.log(`${engine}: ${name} ${width} OK`);
      } catch (error) {
        results.push({
          engine,
          name,
          width,
          passed: false,
          error: error.message,
          stack: error.stack,
          errors,
        });
        await p
          .screenshot({ path: `${out}/${engine}-${name}-${width}-failed.png` })
          .catch(() => {});
        console.error(`${engine}: ${name} ${width} FAILED ${error.message}`);
      } finally {
        held.forEach((g) => g.release());
        await Promise.all(contexts.map((c) => c.close()));
        await f.close();
        writeFileSync(
          out + '/results.json',
          JSON.stringify({ localOnly: true, realDevicesTested: false, results }, null, 2) + '\n',
        );
      }
    }

    for (const width of [320, 740, 820, 1440]) {
      if (width === 320)
        await run('reading-hidden-during-load', width, async ({ p, f, hold }) => {
          f.db.exec("UPDATE notes SET author_id='delegate' WHERE id='browser-note'");
          await p.clock.install({ time: Date.now() });
          await p.goto(f.base + '/#notes');
          await p.evaluate(() => {
            window.fixtureVisibility = 'visible';
            Object.defineProperty(document, 'visibilityState', {
              configurable: true,
              get: () => window.fixtureVisibility,
            });
          });
          const started = hold(),
            finish = hold();
          let loading = true,
            consultations = 0;
          const trace = [];
          await p.route('**/api/notes/browser-note', async (route) => {
            const response = await route.fetch();
            if (loading) {
              started.release();
              await finish.promise;
            }
            await route.fulfill({ response });
          });
          p.on('request', (request) => {
            if (new URL(request.url()).pathname === '/api/notes/browser-note/consult') {
              consultations++;
              trace.push({ kind: 'consult', at: Date.now() });
            }
          });
          await p.getByRole('button', { name: 'Obrir PDF de prova local', exact: true }).click();
          await started.promise;
          await p.evaluate(() => {
            window.fixtureVisibility = 'hidden';
            document.dispatchEvent(new Event('visibilitychange'));
          });
          const delivered = p.waitForResponse(
            (r) => new URL(r.url()).pathname === '/api/notes/browser-note',
          );
          loading = false;
          finish.release();
          await delivered;
          await p.clock.runFor(50);
          await p.clock.fastForward(11000);
          trace.push({ kind: 'hidden', consultations });
          assert.equal(
            consultations,
            0,
            'A late load must not count a hidden reader as a consultation',
          );
          const content = p.waitForResponse(
            (r) => new URL(r.url()).pathname === '/api/notes/browser-note',
          );
          await p.evaluate(() => {
            window.fixtureVisibility = 'visible';
            document.dispatchEvent(new Event('visibilitychange'));
          });
          await content;
          await p.getByRole('dialog').getByText('Text de prova segur:', { exact: false }).waitFor();
          // Align the in-process server's reading interval with the browser's fake clock.
          f.db
            .prepare(
              "UPDATE reading_sessions SET started=? WHERE user_id='browser' AND note_id='browser-note'",
            )
            .run(Date.now() - 11000);
          const counted = p.waitForResponse(
            (r) => new URL(r.url()).pathname === '/api/notes/browser-note/consult',
          );
          await p.clock.fastForward(11000);
          trace.push({ kind: 'visible', consultations });
          writeFileSync(`${out}/${engine}-reading-trace.json`, JSON.stringify(trace));
          assert.equal((await counted).status(), 200);
          assert.equal(consultations, 1);
          assert.equal(
            f.db
              .prepare(
                "SELECT COUNT(*) n FROM consultations WHERE user_id='browser' AND note_id='browser-note'",
              )
              .get().n,
            1,
          );
        });
      await run('class-shared-task-personal-progress', width, async ({ p, f, actor }) => {
        const slot = await openMathClass(p, f);
        await p.getByRole('button', { name: 'Afegir tasca o examen', exact: true }).click();
        const dialog = p.getByRole('dialog');
        const taskDate = await dialog.getByLabel('Data', { exact: true }).inputValue();
        assert.equal(
          await dialog.getByLabel('Hora d’inici', { exact: true }).inputValue(),
          slot.start,
        );
        await dialog.getByRole('textbox', { name: 'Títol', exact: true }).fill(taskTitle);
        await dialog.getByRole('button', { name: /^Públic/ }).click();
        await dialog.getByRole('button', { name: 'Enviar a validació', exact: true }).click();
        await dialog.waitFor({ state: 'hidden' });
        const task = f.db.prepare('SELECT * FROM events WHERE title=?').get(taskTitle);
        assert.equal(task.review_status, 'pending');
        assert.equal(task.date, taskDate);
        assert.equal(task.offering_id, '2B-math');
        const peer = await actor('classmate');
        await agenda(peer, f.base);
        assert.equal(
          await taskRow(peer).count(),
          0,
          'Unreviewed tasks are not shown to classmates',
        );
        const delegate = await actor('delegate');
        await delegate.goto(f.base + '/#community');
        await delegate.getByRole('tab', { name: 'Delegats', exact: true }).click();
        await delegate.getByRole('button', { name: 'Revisar proposta', exact: true }).click();
        await delegate
          .getByText('Cap duplicat ni coincidència detectats.', { exact: true })
          .waitFor();
        await delegate
          .getByRole('checkbox', {
            name: 'Confirmo que la data i el contingut són correctes',
            exact: true,
          })
          .check();
        await delegate.getByRole('button', { name: 'Validar i publicar', exact: true }).click();
        await delegate.getByRole('dialog').waitFor({ state: 'hidden' });
        assert.equal(
          f.db.prepare('SELECT review_status FROM events WHERE id=?').get(task.id).review_status,
          'approved',
        );
        await p.reload();
        await agenda(p, f.base);
        await peer.reload();
        await taskRow(peer).waitFor();
        const check = taskRow(p).getByRole('checkbox');
        const touchTarget = await taskRow(p).locator('.agenda-task-check').boundingBox();
        assert.ok(touchTarget.width >= 44 && touchTarget.height >= 44);
        await taskRow(p).scrollIntoViewIfNeeded();
        await p.screenshot({ path: `${out}/${engine}-class-agenda-${width}.png` });
        await check.click();
        await taskRow(p).waitFor({ state: 'hidden' });
        await peer.reload();
        await taskRow(peer).waitFor();
        assert.equal(
          await taskRow(peer).getByRole('checkbox').isChecked(),
          false,
          'Each student has separate progress',
        );
        await p.reload();
        await p.getByRole('checkbox', { name: 'Incloure tasques fetes', exact: true }).check();
        assert.equal(
          await taskRow(p).getByRole('checkbox').isChecked(),
          true,
          'Progress survives reload',
        );
        assert.equal(
          await taskRow(p).locator('..').locator('h2 small').count(),
          0,
          'Completed work is not labelled pending',
        );
        assert.equal(
          f.db
            .prepare('SELECT COUNT(*) n FROM event_progress WHERE event_id=? AND done=1')
            .get(task.id).n,
          1,
        );
        await peer
          .getByRole('checkbox', { name: 'Marcar com a feta: ' + taskTitle, exact: true })
          .click();
        await taskRow(peer).waitFor({ state: 'hidden' });
        assert.equal(
          f.db
            .prepare('SELECT COUNT(*) n FROM event_progress WHERE event_id=? AND done=1')
            .get(task.id).n,
          2,
        );
        const usage = f.db
          .prepare('SELECT user_id,actions,pulses FROM activity_daily ORDER BY user_id')
          .all();
        assert.equal(usage.length, 3);
        assert.ok(
          usage.every((u) => u.actions >= 1 && u.pulses === 1),
          'Local activity records each identity with bounded sampling',
        );
      });

      await run('class-material-study-grade-continuity', width, async ({ p, f, actor, today }) => {
        f.db.exec("INSERT INTO focus_settings VALUES('browser',1,1,2,2)");
        const title = 'Derivades: exercicis resolts de la classe i preparació del pròxim parcial';
        const text =
          'Materials ficticis compartits durant la classe. Cada alumne conserva les seves notes.';
        await openMathClass(p, f);
        await p.getByRole('button', { name: 'Continguts de l’assignatura', exact: true }).click();
        await p.getByRole('region', { name: 'Espai de Matemàtiques II', exact: true }).waitFor();
        await p.getByRole('button', { name: 'Comparteix un apunt', exact: true }).click();
        const dialog = p.getByRole('dialog');
        await dialog.getByRole('textbox', { name: 'Títol', exact: true }).fill(title);
        await dialog.getByRole('textbox', { name: 'Text dels apunts', exact: true }).fill(text);
        await dialog.getByRole('button', { name: 'Publicar apunts', exact: true }).click();
        await dialog.waitFor({ state: 'hidden' });
        const note = f.db.prepare('SELECT * FROM notes WHERE title=?').get(title);
        assert.equal(note.subject_id, 'math');
        assert.equal(note.status, 'published');
        const peer = await actor('classmate');
        await openMathClass(peer, f);
        await peer
          .getByRole('button', { name: 'Continguts de l’assignatura', exact: true })
          .click();
        await peer.getByRole('button', { name: 'Obrir ' + title, exact: true }).click();
        await peer.getByRole('dialog').getByText(text, { exact: true }).waitFor();
        await peer.getByRole('dialog').getByRole('button', { name: 'Desar', exact: true }).click();
        await peer
          .getByRole('dialog')
          .getByRole('button', { name: 'Treure dels desats', exact: true })
          .waitFor();
        assert.equal(
          f.db.prepare('SELECT COUNT(*) n FROM saves WHERE target_id=?').get(note.id).n,
          1,
        );
        await closeDialog(peer);
        f.db
          .prepare(
            "INSERT INTO events(id,owner_id,title,kind,display_kind,date,subject_id,visibility) VALUES('material-task','browser',?,'exam','task',?,'math','private')",
          )
          .run(taskTitle, today);
        await p.reload();
        await p
          .getByLabel('Pròximes dates', { exact: true })
          .getByRole('button')
          .filter({ hasText: taskTitle })
          .click();
        const progressed = p.waitForResponse(
          (r) => new URL(r.url()).pathname === '/api/events/material-task/progress',
        );
        await p
          .getByRole('dialog')
          .getByRole('button', { name: 'Marcar com a feta', exact: true })
          .click();
        await progressed;
        await p
          .getByRole('dialog')
          .getByRole('button', { name: 'Tornar a marcar pendent', exact: true })
          .waitFor();
        assert.equal(
          f.db.prepare("SELECT done FROM event_progress WHERE event_id='material-task'").get().done,
          1,
        );
        await closeDialog(p);
        await p.getByRole('button', { name: 'Notes', exact: true }).click();
        const grade = p.getByRole('textbox', { name: 'Matemàtiques: Parcial 1', exact: true });
        await grade.fill('0');
        const graded = p.waitForResponse((r) => new URL(r.url()).pathname === '/api/grades/batch');
        await grade.press('Tab');
        await graded;
        assert.equal(
          f.db.prepare("SELECT grade FROM grade_entries WHERE id='math-1-0'").get().grade,
          0,
        );
        await p.getByRole('button', { name: 'Estudi', exact: true }).click();
        await p.getByRole('heading', { name: 'Estudi', exact: true }).waitFor();
        await p.clock.install({ time: Date.now() });
        await p.getByRole('button', { name: 'Comença', exact: true }).click();
        await p.getByRole('button', { name: 'Pausar', exact: true }).waitFor();
        await p.getByRole('button', { name: 'Continguts', exact: true }).click();
        await p.getByRole('heading', { name: 'Continguts', exact: true }).waitFor();
        await p.getByRole('button', { name: 'Estudi', exact: true }).click();
        await p.getByRole('button', { name: 'Pausar', exact: true }).waitFor();
        const completed = p.waitForResponse(
          (r) => new URL(r.url()).pathname === '/api/focus/complete',
        );
        await p.clock.fastForward(61000);
        assert.equal((await completed).status(), 200);
        await p.locator('.study-record summary').filter({ hasText: '1 sessions' }).waitFor();
        // The confirmed completion refresh must finish before a real navigation;
        // WebKit reports cancellation of an intercepted read as a page error.
        await p.waitForLoadState('networkidle');
        await p.reload();
        await p.getByRole('heading', { name: 'Estudi', exact: true }).waitFor();
        assert.equal(
          f.db.prepare("SELECT COUNT(*) n FROM focus_sessions WHERE user_id='browser'").get().n,
          1,
        );
        assert.equal(
          f.db.prepare("SELECT SUM(minutes) n FROM focus_sessions WHERE user_id='browser'").get().n,
          1,
        );
        assert.equal(
          f.db.prepare("SELECT COUNT(*) n FROM focus_sessions WHERE user_id='classmate'").get().n,
          0,
        );
        await p.getByRole('button', { name: 'Notes', exact: true }).click();
        assert.equal(await grade.inputValue(), '0,0');
      });

      await run(
        'task-detail-commit-survives-refresh-error',
        width,
        async ({ p, f, today, hold }) => {
          f.db
            .prepare(
              "INSERT INTO events(id,owner_id,title,kind,display_kind,date,subject_id,visibility) VALUES('detail-task','browser',?,'exam','task',?,'math','private')",
            )
            .run(taskTitle, today);
          await agenda(p, f.base);
          await taskRow(p).locator('.agenda-row-main').click();
          if (width < 760)
            assert.equal(
              await p.getByRole('dialog').evaluate((el) => el.contains(document.activeElement)),
              true,
              'Focus stays in the task dialog',
            );
          const actions = await p.locator('.event-detail-actions .button').evaluateAll((buttons) =>
            buttons.map((button) => {
              const r = button.getBoundingClientRect();
              return {
                left: r.left,
                top: r.top,
                right: r.right,
                bottom: r.bottom,
                height: r.height,
                viewport: innerWidth,
              };
            }),
          );
          assert.ok(actions.every((r) => r.left >= 0 && r.right <= r.viewport && r.height >= 44));
          for (let i = 0; i < actions.length; i++)
            for (const b of actions.slice(i + 1)) {
              const a = actions[i];
              assert.ok(
                a.right + 8 <= b.left ||
                  b.right + 8 <= a.left ||
                  a.bottom + 8 <= b.top ||
                  b.bottom + 8 <= a.top,
                'Task actions have separate touch targets',
              );
            }
          await p.screenshot({ path: `${out}/${engine}-task-detail-${width}.png` });
          let failWrite = true,
            writes = 0;
          const started = hold(),
            finish = hold();
          await p.route('**/api/events/detail-task/progress', async (route) => {
            writes++;
            if (failWrite) {
              failWrite = false;
              return route.fulfill({
                status: 503,
                json: { error: 'Desament fictici interromput.' },
              });
            }
            started.release();
            await finish.promise;
            await route.continue();
          });
          const done = p.getByRole('button', {
            name: /^(Marcar com a feta|Tornar a marcar pendent)$/,
          });
          await done.click();
          await p.getByRole('alert').filter({ hasText: 'Desament fictici interromput.' }).waitFor();
          assert.equal(
            f.db.prepare("SELECT COUNT(*) n FROM event_progress WHERE event_id='detail-task'").get()
              .n,
            0,
          );
          await p.route('**/api/bootstrap', (route) =>
            route.fulfill({
              status: 503,
              json: { error: 'Sincronització fictícia interrompuda.' },
            }),
          );
          await done.click();
          await started.promise;
          assert.equal(await done.isDisabled(), true, 'Prevent repeated task writes while pending');
          await done.evaluate((el) => el.click());
          assert.equal(writes, 2, 'One failed attempt and one retry, no duplicate request');
          finish.release();
          await p
            .getByText(
              'L’acció s’ha desat. No hem pogut actualitzar la vista; es tornarà a sincronitzar.',
              { exact: true },
            )
            .waitFor();
          await p.getByRole('button', { name: 'Tornar a marcar pendent', exact: true }).waitFor();
          assert.equal(
            f.db
              .prepare(
                "SELECT done FROM event_progress WHERE event_id='detail-task' AND user_id='browser'",
              )
              .get().done,
            1,
          );
          await p.unroute('**/api/bootstrap');
          await p.reload();
          await p.getByRole('checkbox', { name: 'Incloure tasques fetes', exact: true }).check();
          assert.equal(await taskRow(p).getByRole('checkbox').isChecked(), true);
        },
      );

      await run('plus-remains-in-subject-agenda', width, async ({ p, f, today }) => {
        f.db
          .prepare("UPDATE pluses SET date=?,author_id='delegate' WHERE id='browser-plus'")
          .run(addDays(today, 1));
        f.db.exec("INSERT INTO plus_subjects VALUES('browser-plus','phy','+0,25')");
        await p.goto(f.base + '/#pluses');
        await p.getByRole('button', { name: 'Obrir Activitat local', exact: true }).click();
        await p.getByRole('button', { name: 'Afegir al meu calendari', exact: true }).click();
        await p.getByRole('button', { name: 'Ja és al teu calendari', exact: true }).waitFor();
        await closeDialog(p);
        await agenda(p, f.base);
        assert.equal(
          await p.locator('.agenda-row').filter({ hasText: 'Activitat local' }).count(),
          1,
        );
        await choose(p, 'Assignatura de l’agenda', 'Matemàtiques');
        await p.locator('.agenda-row').filter({ hasText: 'Activitat local' }).waitFor();
        await choose(p, 'Assignatura de l’agenda', 'Física');
        await p.locator('.agenda-row').filter({ hasText: 'Activitat local' }).waitFor();
        await p.reload();
        await p.locator('.agenda-row').filter({ hasText: 'Activitat local' }).waitFor();
        assert.equal(
          f.db
            .prepare("SELECT COUNT(*) n FROM events WHERE source_key='plus:browser-plus:browser'")
            .get().n,
          1,
        );
      });

      await run('subject-agenda-context-survives-reload', width, async ({ p, f, today }) => {
        f.db
          .prepare(
            "INSERT INTO events(id,owner_id,title,kind,display_kind,date,subject_id,visibility) VALUES('math-task','browser',?,'exam','task',?,'math','private')",
          )
          .run(taskTitle, today);
        await agenda(p, f.base);
        await choose(p, 'Assignatura de l’agenda', 'Física');
        await p.goto(f.base + '/?subject=math#notes');
        await p.getByRole('button', { name: /Agenda de l’assignatura/ }).click();
        await taskRow(p).waitFor();
        await p.reload();
        await taskRow(p).waitFor();
        assert.match(
          await p
            .getByRole('combobox', { name: 'Assignatura de l’agenda', exact: true })
            .innerText(),
          /Matemàtiques/,
        );
      });
    }
  } finally {
    await browser.close();
  }
}
assert.ok(results.length > 0, 'At least one classroom scenario must run');
assert.equal(results.filter((r) => !r.passed).length, 0, 'Classroom regressions failed');
console.log(`${results.length} local classroom journeys passed.`);
