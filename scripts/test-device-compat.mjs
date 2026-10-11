import { chromium, webkit, devices } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import { browserFixture } from '../tests/helpers/browser-fixture.mjs';
const results = [];
const out = process.env.LANET_TEST_OUTPUT || 'output/security-compat';
mkdirSync(out, { recursive: true });
for (const [name, engine, launch, device] of [
  ['Chrome', chromium, { channel: 'chrome' }, { viewport: { width: 1280, height: 800 } }],
  ['Edge', chromium, { channel: 'msedge' }, { viewport: { width: 1280, height: 800 } }],
  ['iPhone 13 emulated', webkit, {}, devices['iPhone 13']],
  ['Pixel 7 emulated', chromium, {}, devices['Pixel 7']],
]) {
  const fixture = await browserFixture();
  const browser = await engine.launch({ headless: true, ...launch });
  const context = await browser.newContext({ ...device, reducedMotion: 'reduce' });
  const errors = [];
  await context.route('**/*', (route) =>
    new URL(route.request().url()).origin === fixture.base ||
    route.request().url().startsWith('blob:')
      ? route.continue()
      : route.abort(),
  );
  await context.addCookies([{ name: 'lanet_session', value: fixture.token, url: fixture.base }]);
  const page = await context.newPage();
  page.setDefaultTimeout(10000);
  page.on('pageerror', (e) => errors.push(e.message));
  try {
    for (const section of [
      'schedule',
      'notes',
      'pluses',
      'grades',
      'study',
      'community',
      'bakery',
    ]) {
      await page.goto(fixture.base + '/#' + section);
      await page.locator('.page-title h1').waitFor();
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
    }
    await page.goto(fixture.base + '/#grades');
    const select = page.locator('.select-trigger[role="combobox"]').first();
    await select.click();
    await page.getByRole('listbox').first().waitFor();
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Enter');
    await page.waitForFunction(() =>
      document
        .querySelector('.select-trigger[role="combobox"]')
        ?.textContent.includes('2n trimestre'),
    );
    await select.click();
    await page.keyboard.press('Home');
    await page.keyboard.press('Enter');
    const privacy = page.getByRole('switch', { name: 'Mode discret de les notes' });
    await privacy.click();
    await page.waitForFunction(
      () => document.querySelector('[role="switch"]')?.getAttribute('aria-checked') === 'true',
    );
    const input = page.locator('.grade-input').first();
    await input.waitFor();
    assert.equal(await input.inputValue(), '');
    const entry = await input.getAttribute('data-entry');
    await input.fill('8,1');
    await input.press('Tab');
    await page.waitForFunction(
      async ({ base, entry }) => {
        const r = await fetch(base + '/api/bootstrap');
        const b = await r.json();
        return b.grades.some((g) => g.id === entry && g.grade === 8.1);
      },
      { base: fixture.base, entry },
    );
    assert.equal(await input.inputValue(), '');
    await page.goto(fixture.base + '/#study');
    const play = page.getByRole('button', { name: 'Reproduir', exact: true });
    device.hasTouch ? await play.tap() : await play.click();
    await page.getByRole('button', { name: 'Pausar música', exact: true }).waitFor();
    if (device.isMobile) {
      await page.setViewportSize({ width: 320, height: 640 });
      await page.getByRole('button', { name: 'Comença', exact: true }).click();
      await page.locator('.timer-pill').waitFor();
      assert.ok(
        await page.evaluate(() => {
          const controls = [...document.querySelectorAll('.topbar-actions > button')].map(
            (button) => button.getBoundingClientRect(),
          );
          const menu = document.querySelector('.menu-button').getBoundingClientRect();
          return (
            document.documentElement.scrollWidth <= innerWidth + 1 &&
            controls.every((rect) => rect.x >= menu.right && rect.right <= innerWidth) &&
            controls.every((rect, index) => !index || controls[index - 1].right <= rect.x)
          );
        }),
        '320px header controls fit while music and timer run together',
      );
      await page.screenshot({
        path: `${out}/${name.split(' ')[0]}-active-header-320.png`,
        fullPage: true,
      });
      await page.getByRole('button', { name: 'Pausar', exact: true }).click();
    }
    await page.getByRole('button', { name: 'Pausar música', exact: true }).click();
    if (device.isMobile) {
      await page.setViewportSize({ width: device.viewport.height, height: device.viewport.width });
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
      await page.screenshot({
        path: `${out}/${name.split(' ')[0]}-landscape.png`,
        fullPage: true,
      });
    }
    assert.deepEqual(errors, []);
    results.push({
      name,
      passed: true,
      version: browser.version(),
      realPhysicalDevice: false,
      checks: [
        'seven sections without overflow',
        'custom dropdown keyboard',
        'hidden grade entry saved while concealed',
        'MP3 playback from gesture',
        ...(device.isMobile ? ['320px header with active music and timer', 'landscape'] : []),
      ],
    });
    console.log(name + ': OK');
  } catch (error) {
    results.push({ name, passed: false, error: error.message });
    console.error(name + ': ' + error.message);
    process.exitCode = 1;
  } finally {
    await browser.close();
    await fixture.close();
  }
  writeFileSync(
    `${out}/device-results.json`,
    JSON.stringify({ localOnly: true, results }, null, 2) + '\n',
  );
}
