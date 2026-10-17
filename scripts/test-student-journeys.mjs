import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { chromium, firefox, webkit } from 'playwright';
import { browserFixture } from '../tests/helpers/browser-fixture.mjs';
import { hash } from '../worker/utils.js';
import { madridDay, addDays, dateLabel } from '../shared/domain.js';
import { OFFICIAL_ROUTES, SCHEDULE_VERSION } from '../shared/official-schedule.js';

const out = process.env.LANET_TEST_OUTPUT || 'output/student-journeys/browser';
mkdirSync(out, { recursive: true });
const results = [];
const feedback =
  'Confirma la data amb el professor. Cal preparar els exercicis 1 a 5 i portar la calculadora.';
const title = 'Preparar la propera classe amb els companys';
const close = (p) =>
  p.getByRole('dialog').getByRole('button', { name: 'Tancar', exact: true }).first().click();
const card = (p, text = title) => p.locator('.delegate-proposal').filter({ hasText: text });
const ready = (p) =>
  p.getByRole('button', { name: 'Actualitzar propostes', exact: true }).waitFor();
const panel = async (p, f, tab = '') => {
  await p.goto(f.base + '/?community=delegates' + (tab ? '&delegates=' + tab : '') + '#community');
  await ready(p);
};
async function choose(p, label, name) {
  await p.getByRole('combobox', { name: label, exact: true }).click();
  await p.getByRole('option', { name, exact: true }).click();
}
async function checkGeometry(p, selector, gap = 0) {
  const boxes = await p.locator(selector).evaluateAll((nodes) =>
    nodes
      .filter((n) => n.getClientRects().length)
      .map((n) => {
        const r = n.getBoundingClientRect();
        return {
          x: r.x,
          y: r.y,
          right: r.right,
          bottom: r.bottom,
          width: r.width,
          height: r.height,
          text: n.textContent.trim(),
        };
      }),
  );
  assert.ok(boxes.length > 0);
  const width = p.viewportSize().width;
  for (const b of boxes) {
    assert.ok(b.width >= 43.5 && b.height >= 43.5, 'Touch target: ' + JSON.stringify(b));
    assert.ok(b.x >= -1 && b.right <= width + 1, 'Horizontal bounds: ' + JSON.stringify(b));
  }
  for (let i = 0; i < boxes.length; i++)
    for (let j = i + 1; j < boxes.length; j++) {
      const a = boxes[i],
        b = boxes[j];
      assert.ok(
        a.right + gap <= b.x + 1 ||
          b.right + gap <= a.x + 1 ||
          a.bottom + gap <= b.y + 1 ||
          b.bottom + gap <= a.y + 1,
        'Controls overlap',
      );
    }
  return boxes;
}

for (const engine of (process.env.LANET_BROWSER_ENGINES || 'chromium,firefox,webkit').split(',')) {
  const browser = await { chromium, firefox, webkit }[engine].launch();
  try {
    async function run(name, width, route, scenario) {
      if (process.env.LANET_JOURNEY_CHECK && !name.includes(process.env.LANET_JOURNEY_CHECK))
        return;
      if (
        process.env.LANET_TEST_WIDTHS &&
        !process.env.LANET_TEST_WIDTHS.split(',').includes(String(width))
      )
        return;
      if (
        process.env.LANET_TEST_ROUTES &&
        !process.env.LANET_TEST_ROUTES.split(',').includes(route)
      )
        return;
      const f = await browserFixture();
      const today = madridDay(),
        contexts = [],
        errors = [],
        releases = [];
      const tutor = { '2A': 'puigpinos', '2B': 'comellas', '2C': 'closa' }[route];
      const unit = { '2A': 'science', '2B': 'tech1', '2C': 'social' }[route];
      f.db.exec("DELETE FROM events; DELETE FROM enrollments WHERE user_id='browser'");
      const offerings = f.db
        .prepare('SELECT * FROM offerings WHERE group_id=? AND active=1')
        .all(route);
      const ids = [
        ...offerings.filter((o) => !o.block).map((o) => o.id),
        ...OFFICIAL_ROUTES.find((r) => r.id === route)
          .blocks.map(
            (b) =>
              offerings.find(
                (o) => o.block === b.id && (b.id !== 'tutor' || o.id.endsWith('-' + tutor)),
              )?.id,
          )
          .filter(Boolean),
      ];
      const course = offerings.find((o) => ids.includes(o.id) && o.block === 'mathematics');
      assert.ok(course);
      const subjectName = f.db
        .prepare('SELECT name FROM subjects WHERE id=?')
        .get(course.subject_id).name;
      f.db
        .prepare("UPDATE users SET group_id=?,schedule_version=? WHERE id='browser'")
        .run(route, SCHEDULE_VERSION);
      for (const id of ids) f.db.prepare("INSERT INTO enrollments VALUES('browser',?)").run(id);
      for (const id of ['delegate', 'subdelegate', 'classmate', 'outsider']) {
        f.db
          .prepare(
            "INSERT INTO users(id,email,name,password_hash,salt,google_sub,group_id,configured,schedule_version) VALUES(?,?,?,'x','x',?,?,1,?)",
          )
          .run(
            id,
            id + '@example.invalid',
            'Persona fictícia ' + id,
            'fixture-' + id,
            route,
            SCHEDULE_VERSION,
          );
        if (id !== 'outsider')
          f.db
            .prepare(
              "INSERT INTO enrollments SELECT ?,offering_id FROM enrollments WHERE user_id='browser'",
            )
            .run(id);
        f.db
          .prepare('INSERT INTO sessions(hash,user_id,expires,auth_provider) VALUES(?,?,?,?)')
          .run(await hash('fixture-' + id), id, Date.now() + 3600000, 'google');
      }
      for (const id of ['delegate', 'subdelegate'])
        f.db
          .prepare('INSERT INTO delegation_members VALUES(?,?,?,?,1)')
          .run(id + '@example.invalid', unit, 'Persona fictícia ' + id, id);
      const seed = (id, status = 'pending', extra = {}) => {
        f.db
          .prepare(
            "INSERT INTO events(id,owner_id,title,kind,display_kind,date,subject_id,offering_id,visibility,review_status,audience_kind,unit_id,body,review_note) VALUES(?,?,?,'deadline','task',?,?,?,'shared',?,'class',?,?,?)",
          )
          .run(
            id,
            extra.owner || 'browser',
            extra.title || title,
            addDays(today, 3),
            course.subject_id,
            course.id,
            status,
            unit,
            extra.body || 'Exercicis de pràctica.',
            extra.note || '',
          );
        f.db.prepare('INSERT INTO event_review_units VALUES(?,?)').run(id, unit);
      };
      async function actor(id = 'browser', storageBlocked = false) {
        const context = await browser.newContext({
          viewport: { width, height: width === 740 ? 390 : 950 },
          hasTouch: width < 1000,
          reducedMotion: 'reduce',
        });
        contexts.push(context);
        await context.route('**/*', (r) =>
          new URL(r.request().url()).origin === f.base || r.request().url().startsWith('blob:')
            ? r.continue()
            : r.abort(),
        );
        if (storageBlocked)
          await context.addInitScript(() =>
            Object.defineProperty(window, 'sessionStorage', {
              configurable: true,
              get() {
                throw new DOMException('Disabled', 'SecurityError');
              },
            }),
          );
        await context.addCookies([
          {
            name: 'lanet_session',
            value: id === 'browser' ? f.token : 'fixture-' + id,
            url: f.base,
          },
        ]);
        const p = await context.newPage();
        p.setDefaultTimeout(9000);
        p.on('pageerror', (e) => errors.push(e.message));
        return p;
      }
      const p = await actor();
      const gate = () => {
        let release;
        const promise = new Promise((r) => (release = r));
        releases.push(release);
        return { promise, release };
      };
      try {
        await scenario({ p, f, actor, seed, today, course, subjectName, gate });
        assert.deepEqual(errors, [], 'No uncaught browser errors');
        for (const c of contexts)
          for (const page of c.pages())
            assert.ok(
              await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1),
              'No document overflow',
            );
        await p.screenshot({ path: `${out}/${engine}-${name}-${route}-${width}.png` });
        results.push({ engine, name, route, width, passed: true });
        console.log(`${engine}: ${name} ${route} ${width} OK`);
      } catch (e) {
        results.push({
          engine,
          name,
          route,
          width,
          passed: false,
          error: e.message,
          stack: e.stack,
          errors,
        });
        for (let i = 0; i < contexts.length; i++)
          for (const page of contexts[i].pages())
            await page
              .screenshot({
                path: `${out}/${engine}-${name}-${route}-${width}-actor-${i}-failed.png`,
              })
              .catch(() => {});
        console.error(`${engine}: ${name} ${route} ${width} FAILED ${e.message}`);
      } finally {
        releases.forEach((r) => r());
        await Promise.all(contexts.map((c) => c.close()));
        await f.close();
        writeFileSync(
          out + '/results.json',
          JSON.stringify({ localOnly: true, realDevicesTested: false, results }, null, 2) + '\n',
        );
      }
    }

    for (const width of [320, 740, 820, 1440]) {
      await run(
        'class-return-and-completed-context',
        width,
        '2B',
        async ({ p, f, course, subjectName }) => {
          await p.goto(f.base + '/#schedule');
          await p.getByRole('button', { name: 'Següent', exact: true }).click();
          const week = await p.locator('.date-navigation [role=status]').innerText();
          const slot = f.db
            .prepare('SELECT * FROM slots WHERE offering_id=? ORDER BY day,start LIMIT 1')
            .get(course.id);
          const day = p.locator('.timetable-days [role=tab]').nth(slot.day);
          if (await day.isVisible()) await day.click();
          await p
            .locator('.timeline-class:visible')
            .filter({ hasText: subjectName })
            .first()
            .click();
          await p.getByRole('button', { name: 'Continguts de l’assignatura', exact: true }).click();
          await p.getByRole('heading', { name: 'Continguts', exact: true }).waitFor();
          await p.goBack();
          await p.getByRole('heading', { name: 'El teu horari', exact: true }).waitFor();
          assert.equal(await p.locator('.date-navigation [role=status]').innerText(), week);
          assert.equal(
            await p.locator('.timetable-days [aria-selected=true]').getAttribute('aria-selected'),
            'true',
          );
          if (await day.isVisible()) assert.equal(await day.getAttribute('aria-selected'), 'true');
          await p.getByRole('tab', { name: 'Agenda', exact: true }).click();
          await p.getByRole('checkbox', { name: 'Incloure tasques fetes', exact: true }).check();
          await p.evaluate(() => (location.hash = 'notes'));
          await p.getByRole('heading', { name: 'Continguts', exact: true }).waitFor();
          await p.goBack();
          await p.getByRole('heading', { name: 'La teva agenda', exact: true }).waitFor();
          assert.equal(
            await p
              .getByRole('checkbox', { name: 'Incloure tasques fetes', exact: true })
              .isChecked(),
            true,
          );
          await p.reload();
          await p.getByRole('heading', { name: 'La teva agenda', exact: true }).waitFor();
          assert.equal(await p.locator('.date-navigation [role=status]').innerText(), week);
          assert.equal(
            await p
              .getByRole('checkbox', { name: 'Incloure tasques fetes', exact: true })
              .isChecked(),
            true,
          );
          await p.getByRole('button', { name: 'Avui', exact: true }).click();
          assert.notEqual(await p.locator('.date-navigation [role=status]').innerText(), week);
        },
      );

      await run(
        'delegate-publish-retry-and-navigation',
        width,
        '2B',
        async ({ p, f, actor, subjectName, gate }) => {
          const d = await actor('delegate');
          await panel(d, f);
          await d.getByRole('tab', { name: 'Contactes', exact: true }).click();
          await d.reload();
          await ready(d);
          assert.equal(
            await d
              .getByRole('tab', { name: 'Contactes', exact: true })
              .getAttribute('aria-selected'),
            'true',
          );
          await d.goBack();
          await ready(d);
          assert.equal(
            await d
              .getByRole('tab', { name: 'Per validar', exact: true })
              .getAttribute('aria-selected'),
            'true',
          );
          // A private draft must not silently override the explicitly public entry point.
          await d.evaluate(() =>
            localStorage.setItem(
              'lanet.eventDraft.delegate.all.exam',
              JSON.stringify({ title: 'Esborrany privat', visibility: 'private' }),
            ),
          );
          await d
            .getByRole('searchbox', { name: 'Cercar dates del panell', exact: true })
            .fill('Una cerca anterior sense resultats');
          await d.getByRole('button', { name: 'Publicar una data', exact: true }).click();
          assert.equal(
            await d.getByRole('button', { name: /^Públic/ }).getAttribute('aria-pressed'),
            'true',
          );
          await d.getByRole('textbox', { name: 'Títol', exact: true }).fill(title);
          await choose(d, 'Assignatura', subjectName);
          await d.getByRole('button', { name: 'Publicar ara', exact: true }).waitFor();
          let writes = 0;
          const finish = gate(),
            started = gate();
          await d.route('**/api/events', async (r) => {
            if (r.request().method() !== 'POST') return r.continue();
            writes++;
            if (writes === 1)
              return r.fulfill({
                status: 503,
                contentType: 'application/json',
                body: JSON.stringify({ error: 'Error local recuperable.' }),
              });
            started.release();
            await finish.promise;
            await r.continue();
          });
          await d.getByRole('button', { name: 'Publicar ara', exact: true }).click();
          await d
            .getByRole('dialog')
            .getByRole('alert')
            .filter({ hasText: 'Error local recuperable.' })
            .waitFor();
          assert.equal(
            await d.getByRole('textbox', { name: 'Títol', exact: true }).inputValue(),
            title,
          );
          await d.getByRole('button', { name: 'Publicar ara', exact: true }).click();
          await started.promise;
          const save = d.getByRole('button', { name: 'Publicar ara', exact: true });
          assert.equal(await save.isDisabled(), true);
          await save.evaluate((b) => b.click());
          assert.equal(writes, 2);
          finish.release();
          await d.getByRole('dialog').waitFor({ state: 'hidden' });
          await card(d).waitFor();
          assert.equal(
            await d
              .getByRole('tab', { name: 'Publicades', exact: true })
              .getAttribute('aria-selected'),
            'true',
          );
          const event = f.db.prepare('SELECT * FROM events WHERE title=?').get(title);
          assert.equal(event.review_status, 'approved');
          assert.equal(event.owner_id, 'delegate');
          assert.equal(f.db.prepare('SELECT count(*) n FROM events WHERE title=?').get(title).n, 1);
          await card(d).getByRole('button', { name: 'Editar data', exact: true }).click();
          assert.equal(
            await d.locator('.toast.success').count(),
            0,
            'A previous confirmation must not cover the new form',
          );
          await close(d);
          await d.waitForLoadState('networkidle');
          await d.reload();
          await ready(d);
          await card(d).waitFor();
          await checkGeometry(d, '.delegate-panel-actions .button, .delegation-hub > .tabs button');
          await d.screenshot({ path: `${out}/${engine}-published-${width}.png` });
          await panel(p, f, 'published');
          assert.equal(await p.getByRole('tab', { name: 'Publicades', exact: true }).count(), 0);
          assert.equal(
            await p.getByRole('button', { name: 'Publicar una data', exact: true }).count(),
            0,
          );
          const denied = await p.request.post(f.base + '/api/events/' + event.id + '/review', {
            data: { revision: event.revision, decision: 'withdraw', note: 'Intent sense permisos' },
          });
          assert.equal(denied.status(), 403);
        },
      );

      await run(
        'dense-panel-search-refresh-and-layout',
        width,
        '2B',
        async ({ p, f, actor, seed }) => {
          for (let i = 0; i < 9; i++)
            seed('pending-' + i, 'pending', {
              title:
                i === 0 ? 'Àlgebra i geometria ' + 'M'.repeat(120) : 'Preparació de la classe ' + i,
              body: 'Detalls ' + 'text de pràctica '.repeat(70),
            });
          const d = await actor('subdelegate');
          await panel(d, f);
          await card(d, 'Àlgebra').waitFor();
          await checkGeometry(d, '.delegate-panel-actions .button, .delegation-hub > .tabs button');
          await d
            .getByRole('searchbox', { name: 'Cercar dates del panell', exact: true })
            .fill('algebra geometria');
          assert.equal(await d.locator('.delegate-proposal').count(), 1);
          await d
            .getByRole('searchbox', { name: 'Cercar dates del panell', exact: true })
            .fill('no coincideix');
          await d
            .getByRole('heading', { name: 'Cap data coincideix amb la cerca', exact: true })
            .waitFor();
          await d.getByRole('button', { name: 'Netejar la cerca', exact: true }).click();
          assert.equal(await d.locator('.delegate-proposal').count(), 9);
          let bootstrap = 0;
          await d.route('**/api/bootstrap', async (r) => {
            bootstrap++;
            return r.fulfill({
              status: 503,
              contentType: 'application/json',
              body: JSON.stringify({ error: 'Connexió local interrompuda.' }),
            });
          });
          await d.getByRole('button', { name: 'Actualitzar propostes', exact: true }).click();
          await d.getByRole('alert').filter({ hasText: 'Connexió local interrompuda.' }).waitFor();
          assert.equal(await d.locator('.delegate-proposal').count(), 9);
          assert.equal(bootstrap, 1);
          await d.unroute('**/api/bootstrap');
          seed('new', 'pending', { title: 'Ha arribat una proposta nova' });
          await d.getByRole('button', { name: 'Actualitzar propostes', exact: true }).click();
          await ready(d);
          assert.equal(await d.locator('.delegate-proposal').count(), 10);
          assert.equal(await d.getByRole('alert').count(), 0);
          await d.locator('.delegate-hero').scrollIntoViewIfNeeded();
          await d.screenshot({ path: `${out}/${engine}-dense-${width}.png` });
          await panel(p, f);
          assert.equal(await p.getByRole('tab', { name: 'Per validar', exact: true }).count(), 0);
        },
      );
    }

    for (const route of ['2A', '2B', '2C'])
      for (const width of [320, 1440])
        await run(
          'return-correct-publish-complete-withdraw',
          width,
          route,
          async ({ p, f, actor, today, subjectName }) => {
            const d = await actor('delegate'),
              peer = await actor('classmate');
            // Keep an already-open delegate page to test fresh proposals on entry.
            await d.goto(f.base + '/#schedule');
            await d.getByRole('heading', { name: 'El teu horari', exact: true }).waitFor();
            await panel(p, f);
            await p.getByRole('button', { name: 'Proposar una data', exact: true }).click();
            await p.getByRole('textbox', { name: 'Títol', exact: true }).fill(title);
            await p.getByRole('tab', { name: 'Tasca', exact: true }).click();
            await choose(p, 'Assignatura', subjectName);
            await p.getByLabel('Data', { exact: true }).fill(addDays(today, 4));
            await p.getByRole('button', { name: 'Enviar a validació', exact: true }).click();
            await p.getByRole('dialog').waitFor({ state: 'hidden' });
            await card(p).waitFor();
            const event = f.db.prepare('SELECT * FROM events WHERE title=?').get(title);
            assert.equal(event.review_status, 'pending');
            await d.evaluate(() => (location.hash = 'community'));
            await d.getByRole('tab', { name: 'Delegats', exact: true }).click();
            await ready(d);
            await card(d).waitFor();
            await card(d).getByRole('button', { name: 'Revisar proposta', exact: true }).click();
            await d.getByLabel('Missatge per a l’autor', { exact: true }).fill(feedback);
            await d.getByRole('button', { name: 'Demanar canvis', exact: true }).click();
            await d.getByRole('dialog').waitFor({ state: 'hidden' });
            assert.equal(
              f.db.prepare('SELECT review_status FROM events WHERE id=?').get(event.id)
                .review_status,
              'returned',
            );
            await p.getByRole('tab', { name: 'Notificacions', exact: true }).click();
            await p.getByRole('button', { name: 'Corregir proposta', exact: true }).click();
            await p
              .getByRole('region', { name: 'Canvis demanats', exact: true })
              .getByText(feedback, { exact: true })
              .waitFor();
            assert.equal(
              await p.getByRole('textbox', { name: 'Títol', exact: true }).inputValue(),
              title,
            );
            await p.getByLabel('Data', { exact: true }).fill(addDays(today, 5));
            await p.screenshot({ path: `${out}/${engine}-correction-${route}-${width}.png` });
            await p.getByRole('button', { name: 'Enviar a validació', exact: true }).click();
            await p.getByRole('dialog').waitFor({ state: 'hidden' });
            const sub = await actor('subdelegate');
            await panel(sub, f);
            await card(sub).getByRole('button', { name: 'Revisar proposta', exact: true }).click();
            await sub
              .getByText('Cap duplicat ni coincidència detectats.', { exact: true })
              .waitFor();
            await sub
              .getByRole('checkbox', {
                name: 'Confirmo que la data i el contingut són correctes',
                exact: true,
              })
              .check();
            await sub.getByRole('button', { name: 'Validar i publicar', exact: true }).click();
            await sub.getByRole('dialog').waitFor({ state: 'hidden' });
            assert.equal(
              f.db.prepare('SELECT review_status FROM events WHERE id=?').get(event.id)
                .review_status,
              'approved',
            );
            await p.getByRole('tab', { name: 'Delegats', exact: true }).click();
            await ready(p);
            await card(p).getByText('Publicada', { exact: true }).waitFor();
            await card(p).getByRole('button', { name: 'Veure data', exact: true }).click();
            await p.getByRole('button', { name: 'Marcar com a feta', exact: true }).click();
            await p.getByRole('button', { name: 'Tornar a marcar pendent', exact: true }).waitFor();
            await checkGeometry(p, '.dialog .event-detail-actions .button');
            await close(p);
            assert.equal(
              f.db
                .prepare("SELECT done FROM event_progress WHERE event_id=? AND user_id='browser'")
                .get(event.id).done,
              1,
            );
            const peerData = await (await peer.request.get(f.base + '/api/bootstrap')).json();
            assert.equal(peerData.events.find((e) => e.id === event.id).done, 0);
            const outsider = await actor('outsider');
            const outsiderData = await (
              await outsider.request.get(f.base + '/api/bootstrap')
            ).json();
            assert.equal(
              outsiderData.events.some((e) => e.id === event.id),
              false,
            );
            await sub.getByRole('tab', { name: 'Publicades', exact: true }).click();
            await card(sub)
              .getByRole('button', { name: 'Revisar o retirar la data', exact: true })
              .click();
            assert.equal(
              await sub
                .getByRole('button', { name: 'Retirar de l’agenda', exact: true })
                .isDisabled(),
              true,
            );
            assert.equal(
              await sub.getByRole('button', { name: 'Validar i publicar', exact: true }).count(),
              0,
            );
            await sub
              .getByLabel('Missatge per a l’autor', { exact: true })
              .fill('La sessió ha canviat de dia; cal confirmar una nova data.');
            await sub.getByRole('button', { name: 'Retirar de l’agenda', exact: true }).click();
            await sub.getByRole('dialog').waitFor({ state: 'hidden' });
            assert.equal(
              f.db.prepare('SELECT review_status FROM events WHERE id=?').get(event.id)
                .review_status,
              'withdrawn',
            );
            await p.getByRole('tab', { name: 'Notificacions', exact: true }).click();
            await p.getByRole('heading', { name: 'Data retirada', exact: true }).waitFor();
            assert.equal(
              f.db
                .prepare('SELECT count(*) n FROM agenda_notifications WHERE event_id=?')
                .get(event.id).n,
              3,
            );
            const peerAfter = await (await peer.request.get(f.base + '/api/bootstrap')).json();
            assert.equal(
              peerAfter.events.some((e) => e.id === event.id),
              false,
            );
          },
        );

    for (const width of [320, 1440])
      await run('live-date-update-and-withdrawal', width, '2B', async ({ p, f, seed, today }) => {
        seed('live', 'approved');
        await p.clock.install({ time: Date.now() });
        await panel(p, f);
        await card(p).getByRole('button', { name: 'Veure data', exact: true }).click();
        await p.getByRole('dialog').getByRole('heading', { name: title, exact: true }).waitFor();
        const updatedTitle = 'La classe ha canviat de dia',
          updatedBody = 'Porta la calculadora i el dossier actualitzat.',
          date = addDays(today, 5);
        f.db
          .prepare(
            "UPDATE events SET title=?,date=?,body=?,room='Aula de pràctiques',revision=revision+1 WHERE id='live'",
          )
          .run(updatedTitle, date, updatedBody);
        const updated = p.waitForResponse((r) => new URL(r.url()).pathname === '/api/bootstrap');
        await p.clock.fastForward(121000);
        assert.equal(
          (await (await updated).json()).events.find((e) => e.id === 'live').title,
          updatedTitle,
        );
        await p
          .getByRole('dialog')
          .getByRole('heading', { name: updatedTitle, exact: true })
          .waitFor();
        await p.getByRole('dialog').getByText(updatedBody, { exact: true }).waitFor();
        await p.getByRole('dialog').getByText('Aula de pràctiques', { exact: true }).waitFor();
        await checkGeometry(p, '.dialog .event-detail-actions .button', 8);
        await p
          .getByRole('dialog')
          .getByText(dateLabel(date, { weekday: 'long', day: 'numeric', month: 'long' }), {
            exact: false,
          })
          .first()
          .waitFor();
        await p.screenshot({ path: `${out}/${engine}-updated-date-${width}.png` });
        f.db.exec(
          "UPDATE events SET review_status='withdrawn',revision=revision+1 WHERE id='live'",
        );
        const withdrawn = p.waitForResponse((r) => new URL(r.url()).pathname === '/api/bootstrap');
        await p.clock.fastForward(121000);
        assert.equal(
          (await (await withdrawn).json()).events.some((e) => e.id === 'live'),
          false,
        );
        await p
          .getByRole('dialog')
          .getByRole('heading', { name: 'Aquesta data ja no està disponible', exact: true })
          .waitFor();
        assert.equal(
          await p
            .getByRole('dialog')
            .getByRole('button', { name: 'Marcar com a feta', exact: true })
            .count(),
          0,
        );
        await p.screenshot({ path: `${out}/${engine}-withdrawn-date-${width}.png` });
        await p.getByRole('button', { name: 'Tornar a l’agenda', exact: true }).click();
        await p.getByRole('dialog').waitFor({ state: 'hidden' });
        await p.getByRole('heading', { name: 'La teva agenda', exact: true }).waitFor();
        assert.equal(
          await p.getByRole('tab', { name: 'Llista', exact: true }).getAttribute('aria-selected'),
          'true',
        );
      });

    await run('two-delegates-conflict-recovery', 390, '2B', async ({ p, f, actor, seed }) => {
      seed('concurrent');
      const d = await actor('delegate'),
        s = await actor('subdelegate');
      for (const page of [d, s]) {
        await panel(page, f);
        await card(page).getByRole('button', { name: 'Revisar proposta', exact: true }).click();
        await page.getByText('Cap duplicat ni coincidència detectats.', { exact: true }).waitFor();
        await page
          .getByRole('checkbox', {
            name: 'Confirmo que la data i el contingut són correctes',
            exact: true,
          })
          .check();
      }
      await d.getByRole('button', { name: 'Validar i publicar', exact: true }).click();
      await d.getByRole('dialog').waitFor({ state: 'hidden' });
      await s.getByRole('button', { name: 'Validar i publicar', exact: true }).click();
      await s
        .getByRole('dialog')
        .getByRole('alert')
        .filter({ hasText: 'La proposta ha canviat.' })
        .waitFor();
      assert.equal(
        await s.getByRole('button', { name: 'Validar i publicar', exact: true }).isDisabled(),
        true,
      );
      await s.getByRole('button', { name: 'Actualitzar el panell', exact: true }).click();
      await s.getByRole('dialog').waitFor({ state: 'hidden' });
      assert.equal(await s.locator('.delegate-proposal').count(), 0);
      await s.getByRole('tab', { name: 'Publicades', exact: true }).click();
      await card(s).waitFor();
      assert.equal(
        f.db
          .prepare("SELECT count(*) n FROM agenda_notifications WHERE event_id='concurrent'")
          .get().n,
        1,
      );
      await panel(p, f);
      await card(p).getByText('Publicada', { exact: true }).waitFor();
    });

    await run(
      'storage-unavailable-and-preview-recovery',
      320,
      '2B',
      async ({ p, f, actor, seed }) => {
        const local = await actor('browser', true);
        await local.goto(f.base + '/#schedule');
        await local.getByRole('button', { name: 'Següent', exact: true }).click();
        const week = await local.locator('.date-navigation [role=status]').innerText();
        await local.evaluate(() => (location.hash = 'notes'));
        await local.getByRole('heading', { name: 'Continguts', exact: true }).waitFor();
        await local.goBack();
        await local.getByRole('heading', { name: 'El teu horari', exact: true }).waitFor();
        assert.equal(await local.locator('.date-navigation [role=status]').innerText(), week);
        seed('preview');
        const d = await actor('delegate');
        await panel(d, f);
        let preview = 0;
        await d.route('**/api/agenda/preview', (r) =>
          ++preview === 1
            ? r.fulfill({
                status: 503,
                contentType: 'application/json',
                body: JSON.stringify({ error: 'No hem pogut comprovar la proposta.' }),
              })
            : r.continue(),
        );
        await card(d).getByRole('button', { name: 'Revisar proposta', exact: true }).click();
        await d.getByRole('dialog').getByRole('alert').waitFor();
        assert.equal(
          await d.getByRole('button', { name: 'Validar i publicar', exact: true }).isDisabled(),
          true,
        );
        await d.getByRole('button', { name: 'Tornar a comprovar', exact: true }).click();
        await d.getByText('Cap duplicat ni coincidència detectats.', { exact: true }).waitFor();
        assert.equal(await d.getByRole('dialog').getByRole('alert').count(), 0);
        await close(d);
        await panel(p, f);
        await card(p).waitFor();
      },
    );
  } finally {
    await browser.close();
  }
}
assert.ok(results.length, 'At least one journey must run');
assert.ok(
  results.every((r) => r.passed),
  'All local student/delegate journeys must pass',
);
console.log(`${results.length} local student/delegate journeys passed.`);
