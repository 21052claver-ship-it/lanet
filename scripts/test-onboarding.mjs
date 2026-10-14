import { chromium, firefox, webkit } from 'playwright';
import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { browserFixture } from '../tests/helpers/browser-fixture.mjs';
import { onboardingKey } from '../shared/onboarding.js';
const out = process.env.LANET_TEST_OUTPUT || 'output/onboarding/browser';
mkdirSync(out, { recursive: true });
const results = [];
const picks = {
  '2A': ['smath', '2A-chem-solsona', 'phy', '2A-phy-ruiz', 'art', '2A-tutor-comellas'],
  '2B': ['2B-phy-ruiz', 'eco', 'tech', '2B-tech-tere', '2B-tutor-closa'],
  '2C': ['latin', 'lit', 'bio', '2C-tutor-ocana'],
};
const cases = [
  ['2A', 320, 780],
  ['2B', 390, 844],
  ['2C', 1440, 1000],
  ['2B', 844, 390],
  ['2A', 768, 1024],
];
async function fits(page) {
  assert.ok(
    await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1),
    'No horizontal page overflow',
  );
  assert.equal(await page.getByRole('dialog').count(), 0, 'First entry is a page, never a dialog');
  assert.equal(
    await page.locator('.app-shell,.bottom-nav,.sidebar').count(),
    0,
    'No workspace behind onboarding',
  );
  assert.equal(await page.locator('h1').count(), 1);
  assert.equal(await page.locator('.onboarding-progress [aria-current="step"]').count(), 1);
}
for (const [engine, launcher] of Object.entries({ chromium, firefox, webkit })) {
  if (
    process.env.LANET_BROWSER_ENGINES &&
    !process.env.LANET_BROWSER_ENGINES.split(',').includes(engine)
  )
    continue;
  const browser = await launcher.launch();
  try {
    for (const [group, width, height] of cases) {
      const f = await browserFixture();
      f.db.exec(
        "UPDATE users SET configured=0 WHERE id='browser'; DELETE FROM enrollments WHERE user_id='browser';",
      );
      const before = f.db.prepare("SELECT balance,name FROM users WHERE id='browser'").get();
      const context = await browser.newContext({
        viewport: { width, height },
        reducedMotion: 'reduce',
      });
      await context.route('**/*', (r) =>
        new URL(r.request().url()).origin === f.base ? r.continue() : r.abort(),
      );
      await context.addCookies([{ name: 'lanet_session', value: f.token, url: f.base }]);
      const page = await context.newPage();
      const errors = [];
      page.on('pageerror', (e) => errors.push(e.message));
      let writes = 0;
      page.on('request', (r) => {
        if (r.url().endsWith('/api/configure') && r.method() === 'POST') writes++;
      });
      const name = `${engine}-${group}-${width}x${height}`;
      try {
        await page.goto(f.base + '/#notes');
        await page.getByRole('heading', { name: /Menys embolics/ }).waitFor();
        await fits(page);
        if (height < 500)
          assert.equal(
            await page.locator('.onboarding-layout').evaluate((e) => getComputedStyle(e).display),
            'block',
            'Short landscape screens use the compact progress row',
          );
        assert.equal(await page.locator('.onboarding-feature').count(), 3);
        assert.equal(
          await page
            .locator('.course-setup-body')
            .evaluate((e) => getComputedStyle(e).animationName),
          'none',
        );
        await page.screenshot({ path: `${out}/${name}-welcome.png`, fullPage: true });
        await page.getByRole('button', { name: 'Personalitzar el meu curs' }).click();
        assert.ok(await page.getByRole('button', { name: 'Continuar', exact: true }).isDisabled());
        assert.equal(await page.evaluate(() => document.activeElement.tagName), 'H1');
        await page.locator('.course-route input').first().focus();
        await page.keyboard.press('ArrowRight');
        assert.ok(await page.locator('.course-route input[value="2B"]').isChecked());
        await page.locator(`.course-choice:has(input[value="${group}"])`).click();
        await fits(page);
        await page.screenshot({ path: `${out}/${name}-route.png`, fullPage: true });
        await page.getByRole('button', { name: 'Continuar', exact: true }).click();
        assert.ok(await page.getByRole('button', { name: 'Continuar', exact: true }).isDisabled());
        for (const value of picks[group])
          await page.locator(`.course-choice:has(input[value="${value}"])`).click();
        await page.reload();
        await page.getByRole('heading', { name: 'Fes-lo teu', exact: true }).waitFor();
        for (const value of picks[group])
          assert.ok(await page.locator(`.course-choice input[value="${value}"]`).isChecked());
        await page.getByRole('button', { name: 'Enrere', exact: true }).click();
        assert.ok(await page.locator(`.course-route input[value="${group}"]`).isChecked());
        await page.getByRole('button', { name: 'Continuar', exact: true }).click();
        await fits(page);
        await page.screenshot({ path: `${out}/${name}-subjects.png`, fullPage: true });
        await page.getByRole('button', { name: 'Continuar', exact: true }).click();
        await fits(page);
        assert.equal(await page.locator('.course-week-preview section').count(), 5);
        await page.screenshot({ path: `${out}/${name}-review.png`, fullPage: true });
        if (width === 390) {
          await page.route(
            '**/api/configure',
            (r) =>
              r.fulfill({
                status: 503,
                contentType: 'application/json',
                body: JSON.stringify({ error: 'Error local de prova. Torna-ho a provar.' }),
              }),
            { times: 1 },
          );
          await page.getByRole('button', { name: 'Entrar a La Net', exact: true }).click();
          await page.locator('.course-setup [role="alert"]').waitFor();
          assert.equal(
            f.db.prepare("SELECT configured FROM users WHERE id='browser'").get().configured,
            0,
          );
          await fits(page);
        }
        if (width === 1440)
          await page.route(
            '**/api/bootstrap',
            (r) =>
              r.fulfill({
                status: 503,
                contentType: 'application/json',
                body: '{"error":"Read failed after confirmed write"}',
              }),
            { times: 1 },
          );
        await page.getByRole('button', { name: 'Entrar a La Net', exact: true }).click();
        await page.locator('.app-shell').waitFor();
        assert.equal(await page.locator('.onboarding').count(), 0);
        assert.equal(await page.getByRole('dialog').count(), 0);
        assert.ok(page.url().endsWith('#schedule'));
        const saved = f.db
          .prepare("SELECT configured,group_id,balance,name FROM users WHERE id='browser'")
          .get();
        assert.equal(saved.configured, 1);
        assert.equal(saved.group_id, group);
        assert.equal(saved.balance, before.balance);
        assert.equal(saved.name, before.name);
        assert.equal(
          f.db.prepare("SELECT grade FROM grade_entries WHERE id='math-1-0'").get().grade,
          7.4,
        );
        assert.equal(
          f.db.prepare("SELECT count(*) n FROM enrollments WHERE user_id='browser'").get().n,
          10,
        );
        assert.equal(
          await page.evaluate((key) => sessionStorage.getItem(key), onboardingKey('browser')),
          null,
        );
        assert.equal(writes, width === 390 ? 2 : 1);
        if (width === 1440) {
          // A confirmed course save updates class context even if its read failed.
          await page.goto(f.base + '/#community');
          await page.getByRole('tab', { name: 'Delegats', exact: true }).click();
          await page.getByRole('tab', { name: 'Contactes', exact: true }).click();
          assert.match(
            await page.locator('.delegate-contact.my-class h3').innerText(),
            /Tecnològic 2/,
          );
        }
        await page.reload();
        await page.locator('.app-shell').waitFor();
        assert.equal(await page.locator('.onboarding').count(), 0);
        assert.deepEqual(errors, []);
        results.push({
          engine,
          group,
          width,
          height,
          result: 'passed',
          recovery: true,
          writeFailure: width === 390,
          readFailure: width === 1440,
        });
      } catch (error) {
        await page.screenshot({ path: `${out}/${name}-failed.png`, fullPage: true });
        throw error;
      } finally {
        await context.close();
        await f.close();
      }
    }
    // Storage/privacy restrictions and logout failure must leave a usable page.
    const f = await browserFixture();
    f.db.exec("UPDATE users SET configured=0 WHERE id='browser';");
    const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
    await context.route('**/*', (r) =>
      new URL(r.request().url()).origin === f.base ? r.continue() : r.abort(),
    );
    await context.addCookies([{ name: 'lanet_session', value: f.token, url: f.base }]);
    await context.addInitScript(() => {
      Object.defineProperty(window, 'sessionStorage', {
        get() {
          throw Error('Storage disabled in local test');
        },
      });
    });
    const page = await context.newPage();
    try {
      await page.goto(f.base);
      await page.getByRole('heading', { name: /Menys embolics/ }).waitFor();
      assert.equal(
        await page.locator('.course-setup-body').evaluate((e) => getComputedStyle(e).animationName),
        'onboarding-arrive',
      );
      await page.getByRole('button', { name: 'Personalitzar el meu curs' }).click();
      await page.locator('.course-choice:has(input[value="2A"])').click();
      await page.getByRole('button', { name: 'Continuar', exact: true }).click();
      await page.locator('.course-choice:has(input[value="phy"])').click();
      await page.getByRole('button', { name: 'Enrere', exact: true }).click();
      await page.locator('.course-choice:has(input[value="2C"])').click();
      await page.getByRole('button', { name: 'Continuar', exact: true }).click();
      assert.equal(await page.locator('.course-choice input[value="phy"]').count(), 0);
      assert.ok(await page.getByRole('button', { name: 'Continuar', exact: true }).isDisabled());
      await fits(page);
      await page.route(
        '**/api/auth/logout',
        (r) =>
          r.fulfill({
            status: 503,
            contentType: 'application/json',
            body: '{"error":"Logout failed locally"}',
          }),
        { times: 1 },
      );
      await page.getByRole('button', { name: 'Tancar sessió', exact: true }).click();
      await page.locator('.onboarding-main > [role="alert"]').waitFor();
      await page.getByRole('button', { name: 'Tancar sessió', exact: true }).click();
      await page.locator('.onboarding').waitFor({ state: 'hidden' });
      results.push({ engine, test: 'storage denied and logout retry', result: 'passed' });
    } finally {
      await context.close();
      await f.close();
    }
  } finally {
    await browser.close();
    writeFileSync(`${out}/results.json`, JSON.stringify(results, null, 2) + '\n');
  }
}
console.log(JSON.stringify({ passed: results.length, output: out }));
