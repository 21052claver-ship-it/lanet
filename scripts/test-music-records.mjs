import { chromium, firefox, webkit } from 'playwright';
import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { browserFixture } from '../tests/helpers/browser-fixture.mjs';
import { MUSIC_TRACKS, MUSIC_STYLES } from '../shared/music-catalog.js';

const out = process.env.LANET_TEST_OUTPUT || 'output/music-records';
mkdirSync(out, { recursive: true });
const results = [];
const engines = { chromium, firefox, webkit };
async function bounded(promise) {
  let timeout;
  try {
    return await Promise.race([
      promise,
      new Promise((_, reject) => {
        timeout = setTimeout(
          () => reject(new Error('No local media request received in 10s')),
          10000,
        );
      }),
    ]);
  } finally {
    clearTimeout(timeout);
  }
}
for (const name of (process.env.LANET_BROWSER_ENGINES || 'chromium,firefox,webkit').split(',')) {
  assert.ok(engines[name]);
  let mediaFault = null;
  const fixture = await browserFixture({
    beforeAsset: (request) =>
      new URL(request.url).pathname.endsWith('.mp3') ? mediaFault?.(request) : null,
  });
  const browser = await engines[name].launch({ headless: true });
  async function run(label, size, scenario) {
    const context = await browser.newContext({
      viewport: size,
      hasTouch: size.width < 1000,
      reducedMotion: 'reduce',
    });
    await context.route('**/*', (route) =>
      new URL(route.request().url()).origin === fixture.base ||
      route.request().url().startsWith('blob:')
        ? route.continue()
        : route.abort(),
    );
    await context.addCookies([{ name: 'lanet_session', value: fixture.token, url: fixture.base }]);
    const page = await context.newPage();
    page.setDefaultTimeout(10000);
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    try {
      await page.goto(`${fixture.base}/#study`);
      await page.locator('.record-player').waitFor();
      await scenario(page, context);
      assert.deepEqual(errors, [], 'No unhandled page errors');
      assert.ok(
        await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1),
        'No page overflow',
      );
      results.push({ engine: name, label, size, passed: true });
      console.log(`${name}: ${label} OK`);
    } catch (error) {
      results.push({ engine: name, label, size, passed: false, error: error.message });
      console.error(`${name}: ${label} FAILED ${error.message}`);
      await page.screenshot({ path: `${out}/${name}-${label}-failed.png` }).catch(() => {});
    } finally {
      await context.close();
      mediaFault = null;
      writeFileSync(
        `${out}/music-results.json`,
        JSON.stringify(
          {
            localOnly: true,
            publicBrowserVerification: 'pending_browser_permission',
            physicalDevicesTested: false,
            results,
          },
          null,
          2,
        ) + '\n',
      );
    }
  }
  async function openLibrary(page) {
    await page.getByRole('button', { name: /Tria un disc/ }).click();
    await page.getByRole('dialog', { name: 'La teva col·lecció de discos' }).waitFor();
  }
  async function playing(page, id) {
    await page.waitForFunction((id) => {
      const element = document.querySelector('audio[data-study-audio]');
      return (
        element &&
        !element.paused &&
        element.duration > 60 &&
        (!id || element.src.includes(`/${id}.mp3`)) &&
        document.querySelector('.music-header-control')?.dataset.musicState === 'playing'
      );
    }, id);
    assert.equal(
      await page.locator('audio[data-study-audio]').count(),
      1,
      'Only one live audio element',
    );
  }
  try {
    await run('library-search-keyboard', { width: 1440, height: 900 }, async (page) => {
      const trigger = page.getByRole('button', { name: /Tria un disc/ });
      await trigger.focus();
      await trigger.press('Enter');
      const dialog = page.getByRole('dialog');
      await dialog.waitFor();
      assert.equal(await dialog.locator('.record-option').count(), MUSIC_TRACKS.length);
      assert.equal(await dialog.locator('.record-option[aria-pressed="true"]').count(), 1);
      assert.equal(
        await dialog.locator('.music-style-filters button').count(),
        MUSIC_STYLES.length + 1,
      );
      await dialog.getByRole('button', { name: 'Piano', exact: true }).click();
      assert.equal(await dialog.locator('.record-option').count(), 2);
      const search = dialog.getByRole('searchbox');
      await search.fill('Cafè');
      await dialog.getByText('No hem trobat cap disc.').waitFor();
      await dialog.getByRole('button', { name: 'Tot', exact: true }).click();
      assert.equal(await dialog.locator('.record-option').count(), 1);
      assert.match(await dialog.locator('.record-option').innerText(), /Cafè de tarda/);
      await search.fill('cafe');
      assert.equal(await dialog.locator('.record-option').count(), 1, 'Accent-insensitive search');
      await search.fill('Kevin');
      assert.equal(
        await dialog.locator('.record-option').count(),
        MUSIC_TRACKS.filter((track) => track.author === 'Kevin MacLeod').length,
      );
      await search.fill('no-such-song');
      await dialog.getByRole('button', { name: 'Veure tots els discos' }).click();
      assert.equal(await dialog.locator('.record-option').count(), MUSIC_TRACKS.length);
      await page.screenshot({ path: `${out}/${name}-library-desktop.png` });
      await page.keyboard.press('Escape');
      await dialog.waitFor({ state: 'detached' });
      await page.waitForFunction(() =>
        document.activeElement?.classList.contains('record-library-button'),
      );
      assert.equal(
        await trigger.evaluate((el) => el === document.activeElement),
        true,
        'Return focus to collection trigger',
      );
      assert.ok(await page.locator('.record-credit a[href="/audio/CREDITS.txt"]').count());
    });
    for (const width of [320, 390, 820]) {
      await run(
        `library-select-${width}`,
        { width, height: width === 820 ? 1024 : 844 },
        async (page) => {
          await openLibrary(page);
          const dialog = page.getByRole('dialog');
          await dialog.getByRole('button', { name: 'Jazz', exact: true }).click();
          assert.equal(await dialog.locator('.record-option').count(), 2);
          const bounds = await dialog.evaluate((el) => {
            const rect = el.getBoundingClientRect();
            return {
              left: rect.left,
              right: rect.right,
              width: el.clientWidth,
              scroll: el.scrollWidth,
              cards: [...el.querySelectorAll('.record-option')].map((card) => {
                const r = card.getBoundingClientRect();
                return { x: r.x, right: r.right, width: r.width, height: r.height };
              }),
            };
          });
          assert.ok(bounds.left >= 0 && bounds.right <= width && bounds.scroll <= bounds.width + 1);
          assert.ok(
            bounds.cards.every(
              (card) =>
                card.x >= bounds.left &&
                card.right <= bounds.right &&
                card.width > 90 &&
                card.height > 44,
            ),
          );
          await page.screenshot({ path: `${out}/${name}-library-${width}.png` });
          const choice = dialog.getByRole('button', {
            name: 'Escoltar Local Forecast',
            exact: true,
          });
          await choice.focus();
          await choice.press('Enter');
          await dialog.waitFor({ state: 'detached' });
          await playing(page, 'jazz-forecast');
          await page
            .locator('.record-now-info h3')
            .getByText('Local Forecast', { exact: true })
            .waitFor();
          await page.evaluate(() => scrollTo(0, 0));
          await page.screenshot({ path: `${out}/${name}-player-${width}.png`, fullPage: true });
          await openLibrary(page);
          assert.equal(
            await page.locator('.record-option[aria-pressed="true"]').getAttribute('aria-label'),
            'Escoltar Local Forecast',
          );
          await page.keyboard.press('Escape');
          await page.getByRole('button', { name: 'Pausar música', exact: true }).click();
          assert.equal(await page.locator('audio').evaluate((el) => el.paused), true);
        },
      );
    }
    await run('shared-pause-resume', { width: 390, height: 844 }, async (page) => {
      await page.getByRole('button', { name: 'Reproduir', exact: true }).click();
      await playing(page);
      await page.getByRole('slider', { name: 'Volum de l’àudio' }).fill('0.37');
      await page.evaluate(() => {
        window.__musicElement = document.querySelector('audio[data-study-audio]');
        window.__musicElement.currentTime = 24;
      });
      const header = page.locator('.music-header-control');
      await header.click();
      const pausedAt = await page.locator('audio').evaluate((el) => el.currentTime);
      assert.ok(pausedAt >= 24 && pausedAt < 28);
      assert.match(await header.getAttribute('aria-label'), /^Reprendre música:/);
      await page
        .locator('.bottom-nav')
        .getByRole('button', { name: 'Continguts', exact: true })
        .click();
      await page.getByRole('heading', { name: 'Continguts', exact: true }).waitFor();
      assert.equal(
        await page.locator('audio').evaluate((el) => el === window.__musicElement && el.paused),
        true,
      );
      assert.ok(
        Math.abs((await page.locator('audio').evaluate((el) => el.currentTime)) - pausedAt) < 0.1,
      );
      await header.click();
      await playing(page);
      await page.waitForFunction(
        (at) => document.querySelector('audio').currentTime > at + 0.2,
        pausedAt,
      );
      assert.equal(
        await page
          .locator('audio')
          .evaluate((el) => el === window.__musicElement && Math.abs(el.volume - 0.37) < 0.01),
        true,
      );
      await page.evaluate(() => {
        location.hash = 'study';
      });
      await page.getByRole('button', { name: 'Pausar música', exact: true }).click();
      assert.match(await header.getAttribute('aria-label'), /^Reprendre música:/);
      for (let i = 0; i < 3; i++) {
        await header.click();
        await playing(page);
        await header.click();
        assert.equal(
          await page.locator('audio').evaluate((el) => el === window.__musicElement && el.paused),
          true,
        );
      }
      await page.screenshot({ path: `${out}/${name}-header-paused.png` });
    });
    await run('disc-selection-and-transport', { width: 390, height: 844 }, async (page) => {
      // The persistent header can also start music before the study controls are used.
      await page.locator('.music-header-control').click();
      await playing(page);
      const title = await page.locator('.record-now-info h3').innerText();
      await page.evaluate(() => {
        window.__selectedDisc = document.querySelector('audio');
        window.__selectedDisc.currentTime = 20;
      });
      await openLibrary(page);
      await page.getByRole('button', { name: `Escoltar ${title}`, exact: true }).click();
      await playing(page);
      assert.equal(
        await page
          .locator('audio')
          .evaluate((el) => el === window.__selectedDisc && el.currentTime >= 20),
        true,
        'Selecting the current disc does not restart it',
      );
      const oldSource = await page.locator('audio').getAttribute('src');
      await page.getByRole('button', { name: 'Pausar música', exact: true }).click();
      await page.getByRole('button', { name: 'Cançó següent', exact: true }).click();
      assert.equal(
        await page.locator('audio').count(),
        0,
        'Skipping while paused does not start sound',
      );
      await page.locator('.music-header-control').click();
      await playing(page);
      assert.notEqual(await page.locator('audio').getAttribute('src'), oldSource);
      await page.getByRole('button', { name: 'Cançó anterior', exact: true }).click();
      await playing(page);
      assert.equal(await page.locator('audio').getAttribute('src'), oldSource);
      await page.getByRole('button', { name: 'Cançó següent', exact: true }).click();
      await page.getByRole('button', { name: 'Cançó següent', exact: true }).click();
      await page.getByRole('button', { name: 'Cançó anterior', exact: true }).click();
      await playing(page);
      assert.equal(
        await page.locator('audio').count(),
        1,
        'Rapid transport actions leave one player',
      );
    });
    await run('playlist-and-motion', { width: 1440, height: 900 }, async (page) => {
      await openLibrary(page);
      await page.getByRole('button', { name: 'Escoltar Local Forecast', exact: true }).click();
      await playing(page, 'jazz-forecast');
      await page.emulateMedia({ reducedMotion: 'no-preference' });
      const art = page.locator('.player-record > .vinyl-surface');
      assert.equal(await art.evaluate((el) => getComputedStyle(el).animationPlayState), 'running');
      await page.evaluate(() => {
        const audio = document.querySelector('audio');
        audio.currentTime = audio.duration - 0.15;
      });
      await playing(page, 'jazz-shuffle');
      await page
        .locator('.record-now-info h3')
        .getByText('George Street Shuffle', { exact: true })
        .waitFor();
      await page.locator('.music-header-control').click();
      assert.equal(await art.evaluate((el) => getComputedStyle(el).animationPlayState), 'paused');
      await page.emulateMedia({ reducedMotion: 'reduce' });
      assert.equal(await art.evaluate((el) => getComputedStyle(el).animationName), 'none');
      await page.screenshot({ path: `${out}/${name}-player-desktop.png` });
    });
    await run('cancel-loading-and-retry', { width: 390, height: 844 }, async (page) => {
      let release;
      const gate = new Promise((resolve) => {
        release = resolve;
      });
      let observed;
      const requested = new Promise((resolve) => {
        observed = resolve;
      });
      mediaFault = async () => {
        observed();
        await gate;
        return null;
      };
      // A unique URL avoids the native media cache shared by some WebKit builds.
      await page.evaluate(() => {
        const NativeAudio = window.Audio;
        window.Audio = class extends NativeAudio {
          constructor(src) {
            super(`${src}?slow=${crypto.randomUUID()}`);
          }
        };
      });
      try {
        await page.getByRole('button', { name: 'Reproduir', exact: true }).click();
        await bounded(requested);
        await page.getByRole('button', { name: 'Aturar la càrrega', exact: true }).waitFor();
        await page.locator('.music-header-control').click();
        assert.equal(
          await page.locator('.music-header-control').getAttribute('data-music-state'),
          'paused',
        );
        release();
        mediaFault = null;
        assert.equal(await page.locator('audio').evaluate((el) => el.paused), true);
        await page.locator('.music-header-control').click();
        await playing(page);
        assert.equal(
          await page.locator('.toast.error').count(),
          0,
          'Cancellation is not a playback error',
        );
      } finally {
        release();
        mediaFault = null;
      }
    });
    await run('failed-audio-recovery', { width: 390, height: 844 }, async (page) => {
      mediaFault = () => new Response('Local test failure', { status: 503 });
      await page.evaluate(() => {
        const NativeAudio = window.Audio;
        window.Audio = class extends NativeAudio {
          constructor(src) {
            super(`${src}?retry=${crypto.randomUUID()}`);
          }
        };
      });
      await page.getByRole('button', { name: 'Reproduir', exact: true }).click();
      await page.locator('.toast.error').waitFor();
      assert.equal(await page.locator('audio').count(), 0);
      assert.equal(
        await page.locator('.music-header-control').getAttribute('data-music-state'),
        'idle',
      );
      mediaFault = null;
      await page.locator('.music-header-control').click();
      await playing(page);
    });
    await run('short-landscape', { width: 844, height: 390 }, async (page) => {
      await openLibrary(page);
      const dialog = page.getByRole('dialog');
      await dialog.getByRole('button', { name: 'Clàssica', exact: true }).click();
      const last = dialog.locator('.record-option').last();
      await last.scrollIntoViewIfNeeded();
      const close = dialog.getByRole('button', { name: 'Tancar', exact: true });
      const rect = await close.boundingBox();
      assert.ok(rect.y >= 0 && rect.y + rect.height < 390, 'Sticky close control remains visible');
      await page.screenshot({ path: `${out}/${name}-library-landscape.png` });
      await last.click();
      await playing(page);
    });
    for (const width of [320, 390, 1440]) {
      await run(`focus-${width}`, { width, height: 900 }, async (page) => {
        const mediaRequests = [];
        page.on('request', (request) => {
          if (/\/audio\/.*\.(mp3|ogg)/.test(request.url())) mediaRequests.push(request.url());
        });
        assert.equal(await page.locator('audio').count(), 0);
        await openLibrary(page);
        const dialog = page.getByRole('dialog');
        await dialog.getByRole('button', { name: 'Focus', exact: true }).click();
        assert.equal(await dialog.locator('.record-option').count(), 8);
        await dialog
          .getByText('Ambient llarg, textures contínues i pols suau. Sense lletra.')
          .waitFor();
        await dialog.getByRole('searchbox').fill('percussio');
        assert.equal(await dialog.locator('.record-option').count(), 2);
        await dialog.getByRole('searchbox').fill('');
        assert.deepEqual(mediaRequests, [], 'Opening/filtering discs does not request audio');
        const rect = await dialog.evaluate((el) => ({
          width: el.clientWidth,
          scroll: el.scrollWidth,
        }));
        assert.ok(rect.scroll <= rect.width + 1, 'Focus cards fit the dialog');
        await page.screenshot({ path: `${out}/${name}-focus-library-${width}.png` });
        const focus = MUSIC_TRACKS.filter((track) => track.genre === 'focus');
        for (const track of focus) {
          if (!(await page.getByRole('dialog').count())) await openLibrary(page);
          await page.getByRole('button', { name: `Escoltar ${track.title}`, exact: true }).click();
          await playing(page, track.id);
          const seconds = track.duration.split(':').reduce((m, s) => m * 60 + Number(s), 0);
          assert.ok(
            Math.abs((await page.locator('audio').evaluate((el) => el.duration)) - seconds) < 5,
            'Full recording, not a preview',
          );
          await page
            .locator('.record-now-info .record-texture')
            .getByText(track.subtitle, { exact: true })
            .waitFor();
          await page.locator('.music-header-control').click();
          assert.equal(await page.locator('audio').evaluate((el) => el.paused), true);
        }
        await page.locator('.music-header-control').click();
        await playing(page, focus.at(-1).id);
        await page.evaluate(() => {
          const audio = document.querySelector('audio');
          audio.currentTime = audio.duration - 0.15;
        });
        await playing(page, focus[0].id);
        await page.locator('.music-header-control').click();
        await page.screenshot({ path: `${out}/${name}-focus-player-${width}.png` });
        await openLibrary(page);
        assert.equal(
          await page.locator('.record-option[aria-pressed="true"]').getAttribute('aria-label'),
          `Escoltar ${focus[0].title}`,
        );
      });
    }
  } finally {
    await browser.close();
    await fixture.close();
  }
}
if (results.some((result) => !result.passed)) process.exitCode = 1;
console.log(
  `${results.filter((result) => result.passed).length}/${results.length} music scenarios passed`,
);
