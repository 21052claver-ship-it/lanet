import { chromium, firefox, webkit } from 'playwright';
import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { browserFixture } from '../tests/helpers/browser-fixture.mjs';

const out = process.env.LANET_TEST_OUTPUT || 'output/responsive';
mkdirSync(out, { recursive: true });
const results = [];
const engines = { chromium, firefox, webkit };
for (const name of (process.env.LANET_BROWSER_ENGINES || 'chromium,firefox,webkit').split(',')) {
  assert.ok(engines[name]);
  const fixture = await browserFixture();
  const browser = await engines[name].launch({ headless: true });
  async function run(label, size, scenario, authenticated = true) {
    const context = await browser.newContext({
      viewport: size,
      hasTouch: true,
      reducedMotion: 'reduce',
    });
    await context.route('**/*', (route) =>
      new URL(route.request().url()).origin === fixture.base ||
      route.request().url().startsWith('blob:')
        ? route.continue()
        : route.abort(),
    );
    if (authenticated)
      await context.addCookies([
        { name: 'lanet_session', value: fixture.token, url: fixture.base },
      ]);
    const p = await context.newPage();
    p.setDefaultTimeout(10000);
    const errors = [];
    p.on('pageerror', (error) => errors.push(error.message));
    const file = `${name}-${label.replaceAll(/[^a-z0-9-]/gi, '-')}`;
    try {
      await scenario(p);
      assert.deepEqual(errors, [], 'No JavaScript errors during interaction');
      assert.ok(
        await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1),
        'No page overflow',
      );
      results.push({ engine: name, label, size, passed: true });
      console.log(`${name}: ${label} OK`);
    } catch (error) {
      results.push({ engine: name, label, size, passed: false, error: error.message });
      console.error(`${name}: ${label} FAILED ${error.message}`);
      await p.screenshot({ path: `${out}/${file}-failed.png` }).catch(() => {});
    } finally {
      await context.close();
      writeFileSync(
        `${out}/responsive-results.json`,
        JSON.stringify(
          {
            localOnly: true,
            realDevicesTested: false,
            publicBrowserVerification: 'pending_browser_permission',
            results,
          },
          null,
          2,
        ) + '\n',
      );
    }
  }
  async function goto(p, section) {
    await p.goto(fixture.base + '/#' + section);
    await p.locator('.page-title h1').waitFor();
  }
  async function inViewport(p, locator) {
    await p.waitForFunction(
      (el) => {
        const r = el.getBoundingClientRect();
        return r.x >= -1 && r.right <= innerWidth + 1 && r.y >= -1 && r.bottom <= innerHeight + 1;
      },
      await locator.elementHandle(),
      { timeout: 3000 },
    );
    const r = await locator.boundingBox();
    const { width, height } = p.viewportSize();
    assert.ok(
      r && r.x >= -1 && r.x + r.width <= width + 1 && r.y >= -1 && r.y + r.height <= height + 1,
      `Control outside viewport: ${JSON.stringify(r)}`,
    );
  }
  try {
    for (const width of [320, 390, 430]) {
      const size = { width, height: 844 };
      await run(`mobile-schedule-${width}`, size, async (p) => {
        await goto(p, 'schedule');
        const days = p.getByRole('tablist', { name: 'Dia de l’horari' });
        await days.waitFor();
        assert.equal(await days.getByRole('tab').count(), 5);
        for (let i = 0; i < 5; i++) {
          await days.getByRole('tab').nth(i).click();
          assert.equal(await p.locator('.timeline-day:visible').count(), 1);
          assert.equal(
            await p.locator('.timeline-day:visible').getAttribute('data-current'),
            'true',
          );
          await inViewport(p, days.getByRole('tab').nth(i));
        }
        const timeline = p.locator('.timeline-mode');
        assert.ok(await timeline.evaluate((el) => el.scrollWidth <= el.clientWidth + 1));
        await p.locator('.timeline-day:visible .class-card').first().click();
        await p.getByRole('dialog').waitFor();
        await inViewport(p, p.getByRole('dialog'));
        await p.getByRole('button', { name: 'Tancar', exact: true }).click();
        await p.getByRole('tab', { name: 'Agenda', exact: true }).click();
        await p.getByRole('tab', { name: 'Mes', exact: true }).click();
        assert.ok(
          await p.locator('.month-grid').evaluate((el) => el.scrollWidth <= el.clientWidth + 1),
        );
        await p
          .locator('.month-cell:not(.outside) .day-number')
          .filter({ has: p.locator('.month-event-dot') })
          .first()
          .click();
        const agenda = p.getByRole('region', { name: 'Agenda del dia seleccionat' });
        await agenda.waitFor();
        await agenda.locator('.agenda-row-main').first().click();
        const detail = p.getByRole('dialog');
        await detail.waitFor();
        assert.ok((await detail.innerText()).includes('Examen local de compatibilitat'));
        await inViewport(p, detail);
        await detail.getByRole('button', { name: 'Editar', exact: true }).click();
        await p.getByRole('dialog', { name: 'Una data al calendari' }).waitFor();
        assert.equal(
          await p.getByRole('dialog').count(),
          1,
          'Event detail closes before edit form opens',
        );
        await p.getByRole('button', { name: 'Tancar', exact: true }).click();
        await p.screenshot({ path: `${out}/${name}-month-${width}.png` });
      });
      await run(`mobile-grades-${width}`, size, async (p) => {
        await goto(p, 'grades');
        const row = p.locator('.grade-summary-table tbody tr').first();
        assert.equal(await row.locator('.grade-input').count(), 3);
        const rects = await row.locator('.grade-input').evaluateAll((inputs) =>
          inputs.map((el) => {
            const r = el.getBoundingClientRect();
            return { x: r.x, right: r.right, width: r.width, height: r.height };
          }),
        );
        assert.ok(
          rects.every((r) => r.x >= 0 && r.right <= width && r.width >= 60 && r.height >= 44),
          'All three grade inputs fit without sideways scrolling',
        );
        const privacy = p.getByRole('switch', { name: 'Mode discret de les notes' });
        if ((await privacy.getAttribute('aria-checked')) !== 'true') await privacy.click();
        await p.waitForFunction(
          () => document.querySelector('[role="switch"]')?.getAttribute('aria-checked') === 'true',
        );
        const input = row.locator('.grade-input').first();
        assert.equal(await input.inputValue(), '');
        await input.focus();
        await input.press('ArrowRight');
        assert.ok(
          await row
            .locator('.grade-input')
            .nth(1)
            .evaluate((el) => el === document.activeElement),
        );
        const entry = await input.getAttribute('data-entry');
        await input.fill('8,2');
        await input.press('Tab');
        await p.waitForFunction(
          async (entry) =>
            (await (await fetch('/api/bootstrap')).json()).grades.some(
              (g) => g.id === entry && g.grade === 8.2,
            ),
          entry,
        );
        assert.equal(await input.inputValue(), '', 'Saved grade remains concealed');
        await p.screenshot({ path: `${out}/${name}-grades-${width}.png` });
        await p.getByRole('button', { name: 'Configurar avaluació', exact: true }).click();
        await p.getByRole('dialog').waitFor();
        await p.setViewportSize({ width, height: 360 });
        await inViewport(p, p.getByRole('dialog'));
        const selector = p.getByRole('dialog').locator('.select-trigger').first();
        await selector.click();
        await p.getByRole('listbox').waitFor();
        await inViewport(p, p.getByRole('listbox'));
        await p.keyboard.press('Escape');
        assert.ok(await p.getByRole('dialog').isVisible());
        const cancel = p
          .getByRole('dialog')
          .getByRole('button', { name: 'Cancel·lar', exact: true });
        await cancel.scrollIntoViewIfNeeded();
        await inViewport(p, cancel);
        await inViewport(p, p.getByRole('button', { name: 'Tancar', exact: true }));
        await cancel.click();
        await p.getByRole('dialog').waitFor({ state: 'hidden' });
      });
      await run(`mobile-resources-${width}`, size, async (p) => {
        for (const section of ['notes', 'pluses']) {
          await goto(p, section);
          const r = await p.locator('.resource-filters').evaluate((el) => {
            const a = el.querySelector('.search-field').getBoundingClientRect(),
              b = el.querySelector('.resource-subjects-trigger').getBoundingClientRect();
            return {
              overlap:
                Math.min(a.right, b.right) > Math.max(a.left, b.left) &&
                Math.min(a.bottom, b.bottom) > Math.max(a.top, b.top),
              scroll: el.scrollWidth,
              width: el.clientWidth,
            };
          });
          assert.ok(!r.overlap && r.scroll <= r.width + 1, 'Search and subjects do not overlap');
          await p.locator('.resource-subjects-trigger').click();
          await p.getByRole('region', { name: 'Preferències d’assignatures' }).waitFor();
          assert.ok(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
          await p.getByRole('button', { name: 'Cancel·lar', exact: true }).click();
          await p
            .getByRole('button', {
              name: section === 'notes' ? 'Comparteix un apunt' : 'Publica un plus',
              exact: true,
            })
            .click();
          await p.getByRole('dialog').waitFor();
          await inViewport(p, p.getByRole('dialog'));
          assert.ok(
            await p.getByRole('dialog').evaluate((el) => el.scrollWidth <= el.clientWidth + 1),
          );
          if (section === 'pluses') {
            assert.ok(
              await p.getByRole('dialog').evaluate((dialog) => {
                const bounds = dialog.getBoundingClientRect();
                return [...dialog.querySelectorAll('input[type="date"], input[type="time"]')].every(
                  (input) => input.getBoundingClientRect().right <= bounds.right - 10,
                );
              }),
              'Date and time controls fit inside the dialog',
            );
            assert.ok(
              await p
                .locator('.bonus-row .select-value')
                .evaluateAll((labels) =>
                  labels.every((label) => label.getBoundingClientRect().width >= 70),
                ),
              'Subject and bonus labels remain readable',
            );
          }
          await p.getByRole('button', { name: 'Tancar', exact: true }).click();
        }
      });
    }
    await run('optional-assessments-320', { width: 320, height: 844 }, async (p) => {
      await p.route('**/api/bootstrap', async (route) => {
        const response = await route.fetch();
        const data = await response.json();
        const original = data.grades.find((row) => row.term === 1 && row.subject_id === 'math');
        data.grades.push(
          ...Array.from({ length: 3 }, (_, index) => ({
            ...original,
            id: `responsive-writing-${index}`,
            assessment_type: 'writing',
            category: 'activity',
            title: `Redacció ${index + 1}`,
            weight: 5,
            grade: 7.5,
            position: 20 + index,
          })),
        );
        await route.fulfill({ response, json: data });
      });
      await goto(p, 'grades');
      const individual = p
        .locator('.grade-summary-table tbody tr')
        .first()
        .locator('.grade-extra-cell .grade-input');
      assert.equal(await individual.count(), 3);
      await individual.first().scrollIntoViewIfNeeded();
      await inViewport(p, individual.first());
      assert.equal(await p.locator('.aggregate-cell').count(), 0);
      await p.getByRole('button', { name: 'Veure el full de Matemàtiques', exact: true }).click();
      const writing = p
        .locator('.assessment-optional')
        .filter({ has: p.getByText('Redaccions', { exact: true }) });
      if (!(await writing.evaluate((el) => el.open))) await writing.locator('summary').click();
      assert.equal(await writing.locator('.grade-input:visible').count(), 3);
      assert.ok(
        await p.locator('.spreadsheet').evaluate((el) => el.scrollWidth <= el.clientWidth + 1),
      );
      await p.screenshot({ path: `${out}/${name}-optional-grades-320.png` });
    });
    for (const width of [820, 1024])
      await run(`tablet-${width}`, { width, height: 1180 }, async (p) => {
        for (const section of [
          'schedule',
          'notes',
          'pluses',
          'grades',
          'study',
          'community',
          'bakery',
        ]) {
          await goto(p, section);
          const sidebar = await p.locator('.sidebar').boundingBox();
          const content = await p.locator('.main-content').boundingBox();
          const clientWidth = await p.evaluate(() => document.documentElement.clientWidth);
          assert.ok(
            sidebar.width <= 90 && content.width >= clientWidth - 90,
            'Tablet navigation rail preserves content width',
          );
          assert.ok(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
          assert.equal(
            await p.getByRole('tablist', { name: 'Dia de l’horari' }).isVisible(),
            false,
          );
          if (section === 'grades')
            assert.ok(
              await p
                .locator('.spreadsheet')
                .evaluate((el) => el.scrollWidth <= el.clientWidth + 1),
            );
        }
        await p.screenshot({ path: `${out}/${name}-tablet-${width}.png` });
      });
    await run('landscape-and-drawer-resize', { width: 844, height: 390 }, async (p) => {
      await goto(p, 'study');
      await p.evaluate(() => {
        window.__audioDiagnostics = [];
        const play = HTMLMediaElement.prototype.play;
        HTMLMediaElement.prototype.play = function () {
          return play.call(this).catch((error) => {
            window.__audioDiagnostics.push({
              name: error.name,
              message: error.message,
              mp3: this.canPlayType('audio/mpeg'),
              vorbis: this.canPlayType('audio/ogg; codecs="vorbis"'),
            });
            throw error;
          });
        };
      });
      await p.getByRole('navigation', { name: 'Navegació mòbil' }).waitFor();
      await p.getByRole('button', { name: 'Comença', exact: true }).click();
      await p.getByRole('button', { name: 'Reproduir', exact: true }).click();
      await p.locator('.audio-pill').waitFor();
      assert.ok(
        (await p.locator('.topbar').boundingBox()).height <= 76,
        'Landscape header leaves vertical room for content',
      );
      assert.ok(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
      try {
        await p.getByRole('button', { name: 'Pausar música', exact: true }).click();
      } catch (error) {
        console.error('Audio diagnostics', await p.evaluate(() => window.__audioDiagnostics));
        throw error;
      }
      await p.getByRole('button', { name: 'Pausar', exact: true }).click();
      await p.evaluate(() => scrollTo(0, 0));
      await p.screenshot({ path: `${out}/${name}-landscape.png` });
      await p.getByRole('button', { name: 'Més seccions' }).click();
      const menu = p.getByRole('dialog', { name: 'Menú principal' });
      await menu.waitFor();
      await inViewport(p, menu);
      assert.equal(await p.evaluate(() => document.body.style.overflow), 'hidden');
      await menu.getByRole('button', { name: 'Comunitat', exact: true }).click();
      await menu.waitFor({ state: 'hidden' });
      assert.notEqual(await p.evaluate(() => document.body.style.overflow), 'hidden');
      await p.getByRole('button', { name: 'Més seccions' }).click();
      await menu.waitFor();
      await p.setViewportSize({ width: 1024, height: 768 });
      await p.waitForFunction(
        () => document.querySelector('.app-shell')?.dataset.compact === 'false',
      );
      assert.notEqual(await p.evaluate(() => document.body.style.overflow), 'hidden');
      assert.equal(await p.locator('.workspace').getAttribute('inert'), null);
      await p.setViewportSize({ width: 390, height: 844 });
      await p.waitForFunction(
        () => document.querySelector('.app-shell')?.dataset.compact === 'true',
      );
      assert.equal(await p.locator('.sidebar').getAttribute('aria-hidden'), 'true');
      await p.screenshot({ path: `${out}/${name}-drawer-resize.png` });
    });
    await run('ad-crop-and-short-profile', { width: 320, height: 568 }, async (p) => {
      await goto(p, 'schedule');
      await p.locator('.board-trigger').nth(2).click();
      await p.getByRole('button', { name: 'Proposa un missatge', exact: true }).click();
      await p.getByRole('button', { name: 'Només imatge', exact: true }).click();
      await p
        .locator('.banner-image-editor input[type="file"]')
        .setInputFiles('public/images/ui/bulb-alpha-v1.png');
      await p.locator('.crop-selection').waitFor();
      const crop = p.locator('.crop-overview');
      await crop.scrollIntoViewIfNeeded();
      await inViewport(p, crop);
      const selection = await p.locator('.crop-selection').boundingBox();
      assert.ok(
        Math.abs(selection.width / selection.height - 16 / 9) < 0.05,
        'Image crop preserves 16:9',
      );
      await crop.focus();
      await crop.press('+');
      await crop.press('ArrowRight');
      assert.ok(await p.getByRole('dialog').evaluate((el) => el.scrollWidth <= el.clientWidth + 1));
      await p.screenshot({ path: `${out}/${name}-crop-320.png` });
      await p.getByRole('button', { name: 'Tancar', exact: true }).click();
      await p.getByRole('button', { name: /Perfil de/ }).click();
      await p.getByRole('dialog').waitFor();
      await p.setViewportSize({ width: 320, height: 320 });
      await inViewport(p, p.getByRole('dialog'));
      const done = p.getByRole('dialog').getByRole('button', { name: 'Fet', exact: true });
      await done.scrollIntoViewIfNeeded();
      await inViewport(p, done);
      await inViewport(p, p.getByRole('button', { name: 'Tancar', exact: true }));
      await p.screenshot({ path: `${out}/${name}-short-dialog.png` });
      await done.click();
      await p.getByRole('dialog').waitFor({ state: 'hidden' });
    });
    await run('active-header-all-widths', { width: 1440, height: 900 }, async (p) => {
      await p.route('**/api/bootstrap', async (route) => {
        const response = await route.fetch();
        const data = await response.json();
        data.user.name = 'Nom compost molt llarg amb dos cognoms de prova';
        data.user.balance = 123456;
        await route.fulfill({ response, json: data });
      });
      await goto(p, 'study');
      await p.getByRole('button', { name: 'Comença', exact: true }).click();
      await p.getByRole('button', { name: 'Reproduir', exact: true }).click();
      await p.locator('.audio-pill').waitFor();
      for (const width of [320, 390, 820, 1101, 1201, 1440]) {
        await p.setViewportSize({ width, height: 900 });
        await p.waitForFunction(() => {
          const r = document.querySelector('.topbar').getBoundingClientRect();
          return (
            r.right <= innerWidth + 1 && document.documentElement.scrollWidth <= innerWidth + 1
          );
        });
        const boxes = await p.locator('.topbar-actions > button:visible').evaluateAll((buttons) =>
          buttons.map((button) => {
            const r = button.getBoundingClientRect();
            return { x: r.x, y: r.y, right: r.right, bottom: r.bottom };
          }),
        );
        assert.ok(boxes.every((r) => r.x >= 0 && r.right <= width + 1));
        for (let i = 0; i < boxes.length; i++)
          for (let j = i + 1; j < boxes.length; j++) {
            const a = boxes[i],
              b = boxes[j];
            assert.ok(
              !(
                Math.min(a.right, b.right) > Math.max(a.x, b.x) &&
                Math.min(a.bottom, b.bottom) > Math.max(a.y, b.y)
              ),
              'Header controls do not overlap',
            );
          }
        if (width === 320 || width === 1101)
          await p.screenshot({ path: `${out}/${name}-active-header-${width}.png` });
      }
    });
    await run(
      'welcome-small-and-landscape',
      { width: 320, height: 480 },
      async (p) => {
        await p.goto(fixture.base);
        const google = p.getByRole('button', { name: 'Continua amb Google', exact: true });
        await google.waitFor();
        await google.scrollIntoViewIfNeeded();
        await inViewport(p, google);
        await p.setViewportSize({ width: 844, height: 390 });
        await google.scrollIntoViewIfNeeded();
        await inViewport(p, google);
      },
      false,
    );
  } finally {
    await browser.close();
    await fixture.close();
  }
}
const failed = results.filter((r) => !r.passed);
console.log(`${results.length - failed.length}/${results.length} responsive scenarios passed.`);
if (failed.length) process.exitCode = 1;
