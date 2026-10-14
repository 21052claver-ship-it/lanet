import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { chromium, firefox, webkit } from 'playwright';
import { browserFixture } from '../tests/helpers/browser-fixture.mjs';
const out = process.env.LANET_TEST_OUTPUT || 'output/subject-workspaces/browser';
mkdirSync(out, { recursive: true });
const results = [];
for (const engine of (process.env.LANET_BROWSER_ENGINES || 'chromium,firefox,webkit').split(',')) {
  const browser = await { chromium, firefox, webkit }[engine].launch();
  async function run(name, width, fn, { height = 900, setup } = {}) {
    if(process.env.LANET_WORKSPACE_CHECK && process.env.LANET_WORKSPACE_CHECK !== name) return;
    const fixture = await browserFixture();
    fixture.db.prepare("UPDATE notes SET topic='Derivades',term=1 WHERE id='browser-note'").run();
    fixture.db
      .prepare("INSERT INTO user_preferences(user_id,value) VALUES('browser',?)")
      .run(JSON.stringify({ notesSubjects: ['math', 'phy'] }));
    setup?.(fixture);
    const context = await browser.newContext({
      viewport: { width, height },
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
    p.on('pageerror', (e) => errors.push(e.message));
    try {
      await p.goto(fixture.base + '/#notes');
      await p.getByRole('heading', { name: 'Continguts', exact: true }).waitFor();
      await fn(p, fixture);
      assert.deepEqual(errors, []);
      assert.ok(
        await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1),
        'No horizontal page overflow',
      );
      await p.screenshot({ path: `${out}/${engine}-${name}-${width}.png`, fullPage: true });
      results.push({ engine, name, width, height, passed: true });
      console.log(`${engine}: ${name} ${width} passed`);
    } catch (e) {
      results.push({ engine, name, width, height, passed: false, error: e.message });
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
  const space = (p) =>
    p.getByRole('button', { name: 'Obrir l’espai de Matemàtiques II', exact: true }).click();
  const close = (p) =>
    p.getByRole('dialog').getByRole('button', { name: 'Tancar', exact: true }).first().click();
  const choose = async (p, label, name) => {
    await p.getByRole('combobox', { name: label, exact: true }).click();
    await p.getByRole('option', { name, exact: true }).click();
  };
  try {
    for (const width of [320, 390, 820, 1440])
      await run('subject-topic-material', width, async (p) => {
        await space(p);
        await p.getByRole('button', { name: /Derivades 1/ }).click();
        await p.getByRole('button', { name: 'Obrir PDF de prova local', exact: true }).click();
        await p.getByRole('dialog').waitFor();
        assert.ok((await p.url()).includes('subject=math'));
        await close(p);
        await p.reload();
        await p.getByRole('region', { name: 'Espai de Matemàtiques II' }).waitFor();
        assert.equal(await p.locator('.note-card').count(), 1);
        await choose(p, 'Trimestre dels materials', '2n trimestre');
        await p.getByRole('heading', { name: 'No hem trobat apunts', exact: true }).waitFor();
        await choose(p, 'Trimestre dels materials', 'Tot el curs');
        await p.getByRole('button', { name: 'Totes les assignatures', exact: true }).click();
        await p.getByRole('region', { name: 'Espais per assignatura' }).waitFor();
        await p.goBack();
        await p.getByRole('region', { name: 'Espai de Matemàtiques II' }).waitFor();
      });
    await run(
      'saved-outside-preferences-and-global-search',
      390,
      async (p, f) => {
        await p.getByRole('tab', { name: 'Desats', exact: true }).click();
        await p
          .getByRole('button', { name: 'Obrir Recurso guardado externo', exact: true })
          .waitFor();
        await p.getByRole('tab', { name: 'Explorar', exact: true }).click();
        await p.getByRole('textbox', { name: 'Cercar apunts', exact: true }).fill('externo');
        await p
          .getByRole('button', { name: 'Obrir Recurso guardado externo', exact: true })
          .waitFor();
        assert.equal(
          f.db.prepare("SELECT COUNT(*) n FROM notes WHERE id='outside-note'").get().n,
          1,
        );
      },
      {
        setup: (f) =>
          f.db.exec(
            "INSERT INTO notes(id,author_id,subject_id,title,body,summary) VALUES('outside-note','browser','chem','Recurso guardado externo','Text','Resum'); INSERT INTO saves(user_id,type,target_id) VALUES('browser','note','outside-note');",
          ),
      },
    );
    await run('contextual-question-lost-reply-response', 390, async (p, f) => {
      await space(p);
      await p.getByRole('button', { name: 'Obrir PDF de prova local', exact: true }).click();
      await p.getByRole('button', { name: 'Preguntar sobre aquest material', exact: true }).click();
      await p
        .getByRole('textbox', { name: 'Títol del dubte', exact: true })
        .fill('Dubte de la cadena');
      await p
        .getByRole('textbox', { name: 'Explica el dubte', exact: true })
        .fill('En quin pas es deriva la funció interior?');
      await close(p);
      await p.reload();
      await p.getByRole('tab', { name: 'Dubtes', exact: true }).click();
      await p.getByRole('button', { name: 'Nou dubte', exact: true }).click();
      assert.equal(
        await p.getByRole('textbox', { name: 'Títol del dubte', exact: true }).inputValue(),
        'Dubte de la cadena',
      );
      await p.getByRole('button', { name: 'Publicar dubte', exact: true }).click();
      await p.getByRole('heading', { name: 'Dubte de la cadena', exact: true }).waitFor();
      const t = f.db.prepare('SELECT * FROM subject_threads').get();
      assert.equal(t.note_id, 'browser-note');
      let lost = false;
      await p.route('**/api/discussions/*/reply', async (route) => {
        if (!lost) {
          lost = true;
          const response = await route.fetch();
          assert.equal(response.status(), 201);
          await route.abort('failed');
        } else await route.continue();
      });
      const answer = p.getByRole('textbox', { name: 'La teva resposta', exact: true });
      await answer.fill('Primer derivem la funció exterior. <script>window.hacked=true</script>');
      await p.getByRole('button', { name: 'Enviar resposta', exact: true }).click();
      await p
        .getByRole('alert')
        .filter({ hasText: /confirmar/ })
        .waitFor();
      assert.ok((await answer.inputValue()).includes('Primer derivem'));
      await p.getByRole('button', { name: 'Enviar resposta', exact: true }).click();
      await p.locator('.discussion-reply').waitFor();
      assert.equal(f.db.prepare('SELECT COUNT(*) n FROM subject_replies').get().n, 1);
      assert.equal(await p.evaluate(() => window.hacked), undefined);
      await p.getByRole('button', { name: 'Marcar com a resolt', exact: true }).click();
      await p.locator('.discussion-resolved').waitFor();
      assert.equal(
        await p.getByRole('textbox', { name: 'La teva resposta', exact: true }).count(),
        0,
      );
      await p.getByRole('button', { name: 'Reobrir dubte', exact: true }).click();
      await p.getByRole('textbox', { name: 'La teva resposta', exact: true }).waitFor();
      await p
        .getByRole('button', { name: 'Obrir material: PDF de prova local', exact: true })
        .click();
      await p.getByRole('dialog', { name: 'PDF de prova local', exact: true }).waitFor();
    });
    await run('contextual-task-exam-draft-and-audience', 320, async (p, f) => {
      await space(p);
      await p.getByRole('button', { name: 'Afegir tasca', exact: true }).click();
      const kindBounds = await p.locator('.event-kind-picker > button').evaluateAll((els) =>
        els.map((el) => {
          const r = el.getBoundingClientRect();
          return { left: r.left, right: r.right, width: r.width };
        }),
      );
      assert.equal(kindBounds.length, 6);
      assert.ok(
        kindBounds.every((r) => r.left >= 0 && r.right <= 320 && r.width >= 60),
        'All six event kinds fit visibly',
      );
      assert.equal(
        await p.getByRole('tab', { name: 'Tasca', exact: true }).getAttribute('aria-selected'),
        'true',
      );
      assert.ok(
        (await p.getByRole('combobox', { name: 'Assignatura', exact: true }).innerText()).includes(
          'Matemàtiques',
        ),
      );
      assert.equal(await p.getByRole('combobox', { name: 'Visibilitat', exact: true }).count(), 0);
      await p
        .getByRole('textbox', { name: 'Títol', exact: true })
        .fill('Acabar exercicis de derivades');
      await close(p);
      await p.getByRole('button', { name: 'Afegir tasca', exact: true }).click();
      assert.equal(
        await p.getByRole('textbox', { name: 'Títol', exact: true }).inputValue(),
        'Acabar exercicis de derivades',
      );
      let failed = false;
      await p.route('**/api/events', async (route) => {
        if (route.request().method() === 'POST' && !failed) {
          failed = true;
          await route.fulfill({
            status: 503,
            contentType: 'application/json',
            body: JSON.stringify({ error: 'Connexió local interrompuda.' }),
          });
        } else await route.continue();
      });
      await p.getByRole('button', { name: 'Desar', exact: true }).click();
      await p
        .getByRole('dialog')
        .getByRole('alert')
        .filter({ hasText: 'Connexió local interrompuda.' })
        .waitFor();
      await p.getByRole('button', { name: 'Desar', exact: true }).click();
      await p.getByRole('dialog').waitFor({ state: 'hidden' });
      const task = f.db
        .prepare("SELECT * FROM events WHERE title='Acabar exercicis de derivades'")
        .get();
      assert.equal(task.subject_id, 'math');
      assert.equal(task.visibility, 'private');
      assert.equal(task.display_kind, 'task');
      await p.getByRole('button', { name: 'Afegir examen', exact: true }).click();
      await p.getByRole('textbox', { name: 'Títol', exact: true }).fill('Parcial 2 de derivades');
      await p.getByRole('button', { name: 'Desar', exact: true }).click();
      await p.getByRole('dialog').waitFor({ state: 'hidden' });
      assert.equal(
        f.db
          .prepare(
            "SELECT COUNT(*) n FROM events WHERE title='Parcial 2 de derivades' AND subject_id='math' AND kind='exam'",
          )
          .get().n,
        1,
      );
      await p.getByRole('button', { name: /Agenda de l’assignatura/ }).click();
      await p.getByRole('tab', { name: 'Agenda', exact: true, selected: true }).waitFor();
      assert.equal(
        await p.getByRole('tab', { name: 'Agenda', exact: true }).getAttribute('aria-selected'),
        'true',
      );
      let release,
        firstProgress = true;
      const held = new Promise((resolve) => {
        release = resolve;
      });
      await p.route('**/api/events/*/progress', async (route) => {
        if (firstProgress) {
          firstProgress = false;
          await held;
          await route.fulfill({
            status: 503,
            contentType: 'application/json',
            body: JSON.stringify({ error: 'Tasca pendent de desar.' }),
          });
        } else await route.continue();
      });
      const checkbox = p.getByRole('checkbox', {
        name: 'Marcar com a feta: Acabar exercicis de derivades',
        exact: true,
      });
      try {
        await checkbox.click();
        assert.equal(
          await checkbox.isChecked(),
          true,
          'Immediate feedback while server is pending',
        );
        assert.equal(await checkbox.isDisabled(), true, 'Duplicate completion is blocked');
      } finally {
        release();
      }
      await p.getByRole('alert').filter({ hasText: 'Tasca pendent de desar.' }).waitFor();
      await p.waitForFunction(
        () =>
          document.querySelector('[aria-label="Marcar com a feta: Acabar exercicis de derivades"]')
            ?.disabled === false,
      );
      assert.equal(await checkbox.isChecked(), false, 'Failed completion is rolled back');
      await Promise.all([
        p.waitForResponse(
          (r) => r.url().includes('/events/' + task.id + '/progress') && r.status() === 200,
        ),
        checkbox.click(),
      ]);
      await p.waitForFunction(
        () =>
          !document.querySelector(
            '[aria-label="Marcar com a feta: Acabar exercicis de derivades"]',
          ),
      );
      assert.equal(
        f.db.prepare('SELECT done FROM event_progress WHERE event_id=?').get(task.id).done,
        1,
      );
    });
    await run('question-confirmation-preserves-new-dialog',390,async(p,f)=>{
      await space(p);
      await p.getByRole('tab',{name:'Dubtes',exact:true}).click();
      await p.getByRole('button',{name:'Nou dubte',exact:true}).click();
      await p.getByRole('textbox',{name:'Títol del dubte',exact:true}).fill('Pregunta pendent');
      await p.getByRole('textbox',{name:'Explica el dubte',exact:true}).fill('Dubte enviat mentre canvio de pantalla.');
      let release,arrived;
      const held=new Promise(r=>release=r),sent=new Promise(r=>arrived=r);
      await p.route('**/api/discussions',async route=>{if(route.request().method()==='POST'){arrived();await held;}await route.continue();});
      try {
        await p.getByRole('button',{name:'Publicar dubte',exact:true}).click();await sent;
        await close(p);
        await p.getByRole('button',{name:/Perfil de/}).click();
        await p.getByRole('dialog',{name:'El meu perfil',exact:true}).waitFor();
        release();
        await p.getByText('Dubte publicat.',{exact:true}).waitFor();
        assert.equal(f.db.prepare('SELECT COUNT(*) n FROM subject_threads').get().n,1);
        assert.equal(await p.getByRole('dialog',{name:'El meu perfil',exact:true}).count(),1);
      } finally {release();}
    });
    await run(
      'thread-pagination-and-material-editor',
      1440,
      async (p, f) => {
        await space(p);
        await p.getByRole('tab', { name: 'Dubtes', exact: true }).click();
        await p.getByRole('button', { name: /Pregunta amb respostes/ }).click();
        await p.locator('.discussion-reply').first().waitFor();
        assert.equal(await p.locator('.discussion-reply').count(), 50);
        await p.getByRole('button', { name: 'Mostrar respostes anteriors', exact: true }).click();
        await p.waitForFunction(() => document.querySelectorAll('.discussion-reply').length === 56);
        await close(p);
        await p.getByRole('tab', { name: 'Materials', exact: true }).click();
        await p.getByRole('button', { name: 'Comparteix un apunt', exact: true }).click();
        await p.getByRole('textbox', { name: 'Títol', exact: true }).fill('Exercicis del nou tema');
        await p.getByRole('combobox', { name: 'Tema', exact: true }).fill('Integrals');
        await choose(p, 'Trimestre del material', '2n trimestre');
        await p
          .getByRole('textbox', { name: 'Text dels apunts', exact: true })
          .fill('Material de prova per resoldre integrals.');
        await p.getByRole('button', { name: 'Publicar apunts', exact: true }).click();
        await p.getByRole('dialog').waitFor({ state: 'hidden' });
        const n = f.db.prepare("SELECT * FROM notes WHERE title='Exercicis del nou tema'").get();
        assert.equal(n.topic, 'Integrals');
        assert.equal(n.term, 2);
        assert.equal(n.subject_id, 'math');
        await p.getByRole('button', { name: /Integrals 1/ }).click();
        assert.equal(await p.locator('.note-card').count(), 1);
      },
      {
        setup: (f) => {
          const room = f.db
            .prepare(
              "SELECT o.id FROM enrollments e JOIN offerings o ON o.id=e.offering_id WHERE e.user_id='browser' AND o.subject_id='math'",
            )
            .get();
          f.db
            .prepare(
              "INSERT INTO subject_threads(id,offering_id,author_id,title,body,request_hash) VALUES('paging',?,'browser','Pregunta amb respostes','Historial de prova','paging')",
            )
            .run(room.id);
          for (let i = 0; i < 56; i++)
            f.db
              .prepare(
                "INSERT INTO subject_replies(id,thread_id,author_id,body,request_hash) VALUES(?,'paging','browser',?,?)",
              )
              .run(randomUUID(), 'Resposta ' + i, 'paging' + i);
        },
      },
    );
    await run(
      'landscape-keyboard-navigation',
      568,
      async (p) => {
        await space(p);
        await p.getByRole('tab', { name: 'Materials', exact: true }).focus();
        await p.keyboard.press('ArrowRight');
        assert.equal(
          await p
            .getByRole('tab', { name: 'Formularis', exact: true })
            .getAttribute('aria-selected'),
          'true',
        );
        await p.locator('.library-caption').waitFor();
        assert.equal(
          await p
            .getByRole('combobox', { name: 'Assignatura de la biblioteca', exact: true })
            .count(),
          0,
        );
      },
      { height: 320 },
    );
  } finally {
    await browser.close();
  }
}
assert.ok(results.every((r) => r.passed));
console.log(`${results.length} subject workspace journeys passed.`);
