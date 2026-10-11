import { chromium, firefox, webkit } from 'playwright';
import assert from 'node:assert/strict';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { browserFixture } from '../tests/helpers/browser-fixture.mjs';
const out = process.env.LANET_TEST_OUTPUT || 'output/grade-activities';
mkdirSync(out, { recursive: true });
const results = [];
function seed(f, subject = 'math', count = 4) {
  f.db
    .prepare(
      "UPDATE grade_entries SET weight=CASE assessment_type WHEN 'term' THEN 10 ELSE 25 END WHERE user_id='browser' AND subject_id=? AND term=1",
    )
    .run(subject);
  const types = ['writing', 'assignment', 'presentation', 'other_activity'];
  const titles = [
    'Comentari de text',
    'Dossier de problemes',
    'Exposició oral',
    'Treball de recerca',
  ];
  for (let i = 0; i < count; i++)
    f.db
      .prepare(
        "INSERT INTO grade_entries(id,user_id,subject_id,term,category,title,weight,position,assessment_type,grade) VALUES(?,'browser',?,1,'activity',?,?,?,?,?)",
      )
      .run(
        `${subject}-extra-${i}`,
        subject,
        titles[i] || `Activitat número ${i + 1}`,
        count === 4 ? 10 : 40 / count,
        3 + i,
        types[i % 4],
        i === 0 ? 0 : 7.5,
      );
}
const mathRow = (p) =>
  p
    .locator('.grade-summary-table tbody tr')
    .filter({ has: p.getByRole('button', { name: 'Veure el full de Matemàtiques', exact: true }) });
async function visible(p) {
  const toggle = p.getByRole('switch', { name: 'Mode discret de les notes', exact: true });
  if ((await toggle.getAttribute('aria-checked')) === 'true') await toggle.click();
  await p.waitForFunction(
    () => document.querySelector('.grade-privacy-toggle')?.getAttribute('aria-checked') === 'false',
  );
}
async function choose(p, label, value) {
  await p.getByRole('combobox', { name: label, exact: true }).click();
  await p.getByRole('option', { name: value, exact: true }).click();
}
async function save(p) {
  const [response] = await Promise.all([
    p.waitForResponse(
      (r) => new URL(r.url()).pathname === '/api/grades/sheet' && r.request().method() === 'POST',
    ),
    p.getByRole('button', { name: 'Desar proves i pesos', exact: true }).click(),
  ]);
  assert.equal(response.status(), 200);
  await p.getByRole('dialog').waitFor({ state: 'hidden' });
}
for (const [engine, launcher] of Object.entries({ chromium, firefox, webkit })) {
  const b = await launcher.launch({ headless: true });
  async function run(label, width, fn, setup) {
    const f = await browserFixture();
    setup?.(f);
    const c = await b.newContext({
      viewport: { width, height: 900 },
      hasTouch: width < 1000,
      reducedMotion: 'reduce',
      acceptDownloads: true,
    });
    await c.route('**/*', (r) =>
      new URL(r.request().url()).origin === f.base || r.request().url().startsWith('blob:')
        ? r.continue()
        : r.abort(),
    );
    await c.addCookies([{ name: 'lanet_session', value: f.token, url: f.base }]);
    const p = await c.newPage();
    p.setDefaultTimeout(12000);
    const errors = [];
    p.on('pageerror', (e) => errors.push(e.message));
    try {
      await p.goto(f.base + '/#grades');
      await p.getByRole('heading', { name: 'Les meves notes' }).waitFor();
      await visible(p);
      await fn(p, f);
      assert.deepEqual(errors, []);
      assert.ok(
        await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1),
        'No page overflow',
      );
      results.push({ engine, label, width, passed: true });
      console.log(`✓ ${engine}: ${label}`);
    } catch (e) {
      results.push({ engine, label, width, passed: false, error: e.message });
      await p.screenshot({ path: `${out}/${engine}-${label}-failed.png`, fullPage: true });
      throw e;
    } finally {
      writeFileSync(
        `${out}/activities-browser-results.json`,
        JSON.stringify(
          { localOnly: true, physicalDevice: false, publicSiteVisited: false, results },
          null,
          2,
        ) + '\n',
      );
      await c.close();
      await f.close();
    }
  }
  try {
    await run('four-default-slots-and-cancel', 1440, async (p, f) => {
      assert.equal(
        await p.getByRole('columnheader', { name: /^Activitat extra [1-4]$/ }).count(),
        4,
      );
      assert.equal(await mathRow(p).locator('.grade-activity-add').count(), 4);
      const frozen = await mathRow(p).locator('th.frozen').boundingBox();
      const firstGrade = await mathRow(p).locator('td[data-label="Parcial 1"]').boundingBox();
      assert.ok(
        frozen.x + frozen.width <= firstGrade.x + 1,
        'Sticky subject must not cover the first grade',
      );
      const before = f.db
        .prepare(
          "SELECT * FROM grade_entries WHERE user_id='browser' AND subject_id='math' ORDER BY id",
        )
        .all();
      await mathRow(p)
        .getByRole('button', { name: 'Matemàtiques: configurar l’activitat extra 4', exact: true })
        .click();
      assert.equal(await p.locator('.extra-activity-editor tbody tr').count(), 4);
      await p
        .getByRole('textbox', { name: 'Nom: Activitat extra 4', exact: true })
        .fill('Canvi cancel·lat');
      await p.getByRole('button', { name: 'Cancel·lar', exact: true }).click();
      assert.deepEqual(
        f.db
          .prepare(
            "SELECT * FROM grade_entries WHERE user_id='browser' AND subject_id='math' ORDER BY id",
          )
          .all(),
        before,
      );
      await p.screenshot({ path: `${out}/${engine}-default-1440.png`, fullPage: true });
    });
    await run('configure-writing-save-reload', 1440, async (p, f) => {
      await mathRow(p)
        .getByRole('button', { name: 'Matemàtiques: configurar l’activitat extra 1', exact: true })
        .click();
      await choose(p, 'Tipus: Activitat extra 1', 'Redacció');
      await p
        .getByRole('textbox', { name: 'Nom: Activitat extra 1', exact: true })
        .fill('Comentari de text');
      await p.getByRole('spinbutton', { name: 'Pes: Comentari de text', exact: true }).fill('10');
      await p.getByRole('spinbutton', { name: 'Pes: Trimestral', exact: true }).fill('40');
      await p.getByRole('textbox', { name: 'Nota de Comentari de text', exact: true }).fill('8');
      await save(p);
      await mathRow(p)
        .getByRole('textbox', { name: 'Matemàtiques: Comentari de text', exact: true })
        .waitFor();
      assert.match(
        await mathRow(p).locator('.grade-extra-cell').first().innerText(),
        /10% · Redacció/,
      );
      assert.equal(
        f.db
          .prepare(
            "SELECT grade FROM grade_entries WHERE user_id='browser' AND title='Comentari de text'",
          )
          .get().grade,
        8,
      );
      await p.reload();
      await mathRow(p)
        .getByRole('textbox', { name: 'Matemàtiques: Comentari de text', exact: true })
        .waitFor();
      assert.equal(
        await mathRow(p)
          .getByRole('textbox', { name: 'Matemàtiques: Comentari de text', exact: true })
          .inputValue(),
        '8,0',
      );
      await p.getByRole('button', { name: 'Configurar avaluació', exact: true }).click();
      assert.equal(await p.locator('.extra-activity-editor tbody tr').count(), 4);
      await save(p);
      assert.equal(
        f.db
          .prepare(
            "SELECT COUNT(*) n FROM grade_entries WHERE user_id='browser' AND subject_id='math' AND term=1",
          )
          .get().n,
        7,
      );
    });
    await run(
      'four-types-and-preserved-zero',
      1440,
      async (p, f) => {
        const row = mathRow(p);
        const cells = row.locator('.grade-extra-cell');
        assert.equal(await cells.count(), 4);
        for (const [i, type] of ['Redacció', 'Entrega', 'Presentació', 'Altra activitat'].entries())
          assert.match(await cells.nth(i).innerText(), new RegExp(`10% · ${type}`));
        assert.equal(await cells.first().locator('input').inputValue(), '0,0');
        const before = f.db
          .prepare(
            "SELECT id,grade,weight,date,assessment_type FROM grade_entries WHERE user_id='browser' AND subject_id='math' AND term=1 ORDER BY id",
          )
          .all();
        await p.getByRole('button', { name: 'Configurar avaluació', exact: true }).click();
        assert.equal(await p.locator('.extra-activity-editor tbody tr').count(), 4);
        await save(p);
        assert.deepEqual(
          f.db
            .prepare(
              "SELECT id,grade,weight,date,assessment_type FROM grade_entries WHERE user_id='browser' AND subject_id='math' AND term=1 ORDER BY id",
            )
            .all(),
          before,
        );
        await p.screenshot({ path: `${out}/${engine}-configured-1440.png`, fullPage: true });
      },
      (f) => seed(f),
    );
    await run(
      'mobile-six-activities-individual',
      320,
      async (p) => {
        const row = mathRow(p);
        assert.equal(await row.locator('.grade-extra-cell .grade-input').count(), 6);
        assert.equal(await p.locator('.aggregate-cell').count(), 0);
        for (const input of await row.locator('.grade-extra-cell input').all()) {
          await input.scrollIntoViewIfNeeded();
          const box = await input.boundingBox();
          assert.ok(box.width >= 44 && box.height >= 44);
        }
        await p.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
        await p.screenshot({ path: `${out}/${engine}-activities-320.png`, fullPage: true });
      },
      (f) => seed(f, 'math', 6),
    );
    await run(
      'discreet-entry-and-subject-separation',
      390,
      async (p, f) => {
        const row = mathRow(p);
        await p.getByRole('switch', { name: 'Mode discret de les notes' }).click();
        const input = row.getByRole('textbox', {
          name: 'Matemàtiques: Comentari de text',
          exact: true,
        });
        await input.scrollIntoViewIfNeeded();
        assert.equal(await input.inputValue(), '');
        await input.fill('6,5');
        const response = p.waitForResponse(
          (r) => new URL(r.url()).pathname === '/api/grades/batch',
        );
        await input.blur();
        assert.equal((await response).status(), 200);
        assert.equal(
          f.db.prepare("SELECT grade FROM grade_entries WHERE id='math-extra-0'").get().grade,
          6.5,
        );
        assert.equal(
          f.db.prepare("SELECT grade FROM grade_entries WHERE id='phy-extra-0'").get().grade,
          0,
        );
        assert.equal(await input.inputValue(), '');
        assert.match(await row.locator('.grade-extra-cell').first().innerText(), /Redacció/);
        await p.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
        await p.screenshot({ path: `${out}/${engine}-activities-390.png`, fullPage: true });
      },
      (f) => {
        seed(f);
        seed(f, 'phy');
      },
    );
    await run(
      'csv-types-and-term-isolation',
      820,
      async (p) => {
        await p.locator('.grades-toolbar .section-options summary').click();
        const [download] = await Promise.all([
          p.waitForEvent('download'),
          p.getByRole('button', { name: 'Exportar les notes en CSV', exact: true }).click(),
        ]);
        const file = `${out}/${engine}-activities.csv`;
        await download.saveAs(file);
        const csv = readFileSync(file, 'utf8');
        assert.match(csv, /Activitat extra 1 · Tipus/);
        assert.match(csv, /"Redacció";"Comentari de text";"10"/);
        assert.match(csv, /"0,00";"Redacció"/);
        await choose(p, 'Trimestre', '2n trimestre');
        assert.equal(await mathRow(p).locator('.grade-activity-add').count(), 4);
        await choose(p, 'Trimestre', '1r trimestre');
        assert.equal(await mathRow(p).locator('.grade-extra-cell input').count(), 4);
      },
      (f) => seed(f),
    );
  } finally {
    await b.close();
  }
}
assert.equal(results.length, 18);
assert.ok(results.every((r) => r.passed));
console.log('18 grade activity scenarios verified.');
