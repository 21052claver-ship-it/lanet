import assert from 'node:assert/strict';
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve, extname, sep } from 'node:path';
import { chromium, firefox, webkit } from 'playwright';
import { browserFixture } from '../tests/helpers/browser-fixture.mjs';
const out = process.env.LANET_TEST_OUTPUT || 'output/focus/browser';
const assets = resolve(process.env.LANET_FOCUS_ASSETS || 'dist');
mkdirSync(out, { recursive: true });
const results = [];
const types = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.woff2': 'font/woff2',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.ogg': 'audio/ogg',
  '.mp3': 'audio/mpeg',
};
async function assetOverride(request) {
  const url = new URL(request.url),
    path = resolve(assets, '.' + (url.pathname === '/' ? '/index.html' : url.pathname));
  if (!path.startsWith(assets + sep) || !existsSync(path)) return;
  return new Response(readFileSync(path), {
    headers: { 'Content-Type': types[extname(path)] || 'application/octet-stream' },
  });
}
for (const engine of (process.env.LANET_BROWSER_ENGINES || 'chromium,firefox,webkit').split(',')) {
  const browser = await { chromium, firefox, webkit }[engine].launch();
  async function run(name, width, fn, { height = 900, timer = null, queue = null } = {}) {
    if (process.env.LANET_FOCUS_CHECK && process.env.LANET_FOCUS_CHECK !== name) return;
    const f = await browserFixture({ beforeAsset: assetOverride });
    f.db.exec("INSERT INTO focus_settings VALUES('browser',1,1,2,2);");
    const context = await browser.newContext({
      viewport: { width, height },
      reducedMotion: 'reduce',
    });
    await context.route('**/*', (r) =>
      new URL(r.request().url()).origin === f.base ? r.continue() : r.abort(),
    );
    await context.addCookies([{ name: 'lanet_session', value: f.token, url: f.base }]);
    await context.addInitScript(
      ({ timer, queue }) => {
        if (queue && !localStorage.getItem('lanet.focusQueue.browser'))
          localStorage.setItem('lanet.focusQueue.browser', JSON.stringify(queue));
        if (timer && !localStorage.getItem('lanet.timer.browser'))
          localStorage.setItem(
            'lanet.timer.browser',
            JSON.stringify({ ...timer, end: Date.now() + timer.until }),
          );
        window.focusSound = { starts: 0, peak: 0 };
        const Native = window.AudioContext || window.webkitAudioContext;
        window.focusSound.nativeAvailable = !!Native;
        if (Native) {
          class Probe extends Native {
            createOscillator() {
              const v = super.createOscillator(),
                start = v.start.bind(v);
              v.start = (...args) => {
                window.focusSound.starts++;
                return start(...args);
              };
              return v;
            }
            createGain() {
              const g = super.createGain(),
                connect = g.connect.bind(g);
              g.connect = (dest, ...args) => {
                if (dest === this.destination) {
                  if (!this.probe) {
                    this.probe = this.createAnalyser();
                    this.probe.fftSize = 512;
                    this.probe.connect(dest);
                    const samples = new Float32Array(512);
                    const sample = () => {
                      if (this.state === 'closed') return;
                      this.probe.getFloatTimeDomainData(samples);
                      const peak = Math.max(...samples.map((v) => Math.abs(v)));
                      if (Number.isFinite(peak))
                        window.focusSound.peak = Math.max(window.focusSound.peak, peak);
                      requestAnimationFrame(sample);
                    };
                    requestAnimationFrame(sample);
                  }
                  return connect(this.probe, ...args);
                }
                return connect(dest, ...args);
              };
              return g;
            }
          }
          window.AudioContext = Probe;
        }
      },
      { timer, queue },
    );
    const p = await context.newPage();
    p.setDefaultTimeout(12000);
    const errors = [];
    p.on('pageerror', (e) => errors.push(e.message));
    try {
      await p.goto(f.base + '/#study');
      await p.getByRole('heading', { name: 'Estudi', exact: true }).waitFor();
      await fn(p, f, context);
      assert.deepEqual(errors, []);
      assert.ok(
        await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1),
        'No horizontal overflow',
      );
      await p.screenshot({ path: `${out}/${engine}-${name}-${width}.png`, fullPage: true });
      results.push({
        engine,
        name,
        width,
        height,
        passed: true,
        audio: await p.evaluate(() => ({
          available: window.focusSound.nativeAvailable,
          peak: window.focusSound.peak,
          starts: window.focusSound.starts,
        })),
      });
      console.log(`${engine}: ${name} ${width} passed`);
    } catch (e) {
      results.push({ engine, name, width, height, passed: false, error: e.message, errors });
      await p.screenshot({ path: `${out}/${engine}-${name}-${width}-failed.png`, fullPage: true });
      throw e;
    } finally {
      writeFileSync(
        out + '/results.json',
        JSON.stringify({ localOnly: true, physicalDevicesTested: false, results }, null, 2),
      );
      await context.close();
      await f.close();
    }
  }
  try {
    for (const [width, height] of [
      [320, 800],
      [390, 844],
      [820, 950],
      [1440, 950],
      [740, 390],
    ])
      await run(
        'focus-options-keyboard',
        width,
        async (p) => {
          const entry = p.getByRole('button', { name: 'Mode focus', exact: true });
          await entry.click();
          const dialog = p.getByRole('dialog', { name: 'Mode focus', exact: true });
          await dialog.waitFor();
          await p.screenshot({ path: `${out}/${engine}-focus-entry-${width}.png` });
          assert.equal(await p.evaluate(() => document.querySelector('.app-shell').inert), true);
          await dialog.locator('summary').click();
          await dialog.getByRole('tab', { name: 'Nit', exact: true }).click();
          await dialog.getByRole('tab', { name: 'Digital', exact: true }).click();
          await dialog
            .getByRole('checkbox', { name: 'Mostrar controls de música', exact: true })
            .check();
          const audioAvailable = await p.evaluate(() => window.focusSound.nativeAvailable);
          if (audioAvailable) {
            await dialog.getByRole('button', { name: 'Provar el so', exact: true }).click();
            await p.waitForFunction(() => window.focusSound.peak > 0.001);
            assert.ok((await p.evaluate(() => window.focusSound.starts)) >= 3);
          } else {
            assert.equal(
              await dialog.getByRole('button', { name: 'Provar el so', exact: true }).isDisabled(),
              true,
            );
            await dialog
              .getByText('El navegador no permet aquesta alarma.', { exact: true })
              .waitFor();
          }
          await p.screenshot({ path: `${out}/${engine}-focus-night-${width}.png`, fullPage: true });
          const exit = dialog.getByRole('button', { name: 'Sortir del mode focus', exact: true });
          await exit.click();
          await dialog.waitFor({ state: 'hidden' });
          assert.equal(await p.evaluate(() => document.querySelector('.app-shell').inert), false);
          await entry.click();
          await dialog.waitFor();
          assert.ok((await dialog.getAttribute('class')).includes('theme-night'));
          assert.equal(await dialog.locator('svg.timer-ring').count(), 0);
          await p.keyboard.press('Escape');
          await dialog.waitFor({ state: 'hidden' });
          await entry.waitFor();
          await p.reload();
          await entry.click();
          await dialog.waitFor();
          assert.ok((await dialog.getAttribute('class')).includes('theme-night'));
          await dialog.getByRole('button', { name: 'Sortir del mode focus', exact: true }).click();
        },
        { height },
      );
    await run(
      'auto-transition-pause-navigation',
      390,
      async (p, f) => {
        await p.locator('.study-continuity summary').click();
        const audioAvailable = await p.evaluate(() => window.focusSound.nativeAvailable);
        if (audioAvailable) {
          await p.getByRole('button', { name: 'Provar el so', exact: true }).click();
          await p.waitForFunction(() => window.focusSound.peak > 0.001);
        }
        await p.getByRole('status').filter({ hasText: 'Descans' }).first().waitFor();
        await p.getByRole('button', { name: 'Pausar', exact: true }).waitFor();
        if (audioAvailable) await p.waitForFunction(() => window.focusSound.starts >= 6);
        await p.locator('.study-record summary').filter({ hasText: '1 sessions' }).waitFor();
        assert.equal(
          f.db.prepare("SELECT COUNT(*) n FROM focus_sessions WHERE id='boundary-session'").get().n,
          1,
        );
        const stored = await p.evaluate(() =>
          JSON.parse(localStorage.getItem('lanet.timer.browser')),
        );
        assert.equal(stored.phase, 'rest');
        assert.equal(stored.running, true);
        await p.getByRole('button', { name: 'Mode focus', exact: true }).click();
        await p
          .getByRole('dialog', { name: 'Mode focus' })
          .getByRole('button', { name: 'Pausar', exact: true })
          .click();
        const paused = await p.evaluate(
          () => JSON.parse(localStorage.getItem('lanet.timer.browser')).remaining,
        );
        await p.waitForTimeout(1300);
        assert.equal(
          await p.evaluate(() => JSON.parse(localStorage.getItem('lanet.timer.browser')).remaining),
          paused,
        );
        await p.getByRole('button', { name: 'Sortir del mode focus', exact: true }).click();
        await p.reload();
        await p
          .locator('.focus-panel')
          .getByRole('button', { name: /^(Comença|Continuar)$/ })
          .click();
        assert.equal(
          f.db.prepare("SELECT COUNT(*) n FROM focus_sessions WHERE id='boundary-session'").get().n,
          1,
        );
      },
      {
        timer: {
          phase: 'work',
          round: 1,
          running: true,
          until: 4500,
          remaining: 60,
          sessionId: 'boundary-session',
          workMinutes: 1,
        },
      },
    );
    await run(
      'offline-completion-recovery',
      390,
      async (p, f) => {
        let attempts = 0;
        await p.route('**/api/focus/complete', async (r) => {
          attempts++;
          if (attempts === 1)
            await r.fulfill({ status: 503, json: { error: 'Connexió local interrompuda.' } });
          else await r.continue();
        });
        await p.waitForResponse(
          (r) => r.url().endsWith('/api/focus/complete') && r.status() === 503,
        );
        await p.getByText(/sessions pendents de sincronitzar/).waitFor();
        assert.equal(attempts, 1);
        await p.evaluate(() => window.dispatchEvent(new Event('online')));
        await p.getByText(/sessions pendents de sincronitzar/).waitFor({ state: 'hidden' });
        assert.equal(
          f.db.prepare("SELECT COUNT(*) n FROM focus_sessions WHERE id='offline-session'").get().n,
          1,
        );
        assert.equal(attempts, 2);
      },
      {
        timer: {
          phase: 'work',
          round: 1,
          running: true,
          until: 3500,
          remaining: 60,
          sessionId: 'offline-session',
          workMinutes: 1,
        },
      },
    );
    await run(
      'invalid-queued-session-does-not-block',
      390,
      async (p, f) => {
        await p.getByText(/4 sessions no s’han pogut sincronitzar/).waitFor();
        await p.waitForFunction(
          () => JSON.parse(localStorage.getItem('lanet.focusQueue.browser')).length === 0,
        );
        assert.equal(
          f.db.prepare("SELECT COUNT(*) n FROM focus_sessions WHERE id='valid-after-corrupt'").get()
            .n,
          1,
        );
        const saved = await p.evaluate(() =>
          JSON.parse(localStorage.getItem('lanet.focusRejected.browser')),
        );
        assert.equal(saved.length, 4);
        assert.equal(saved[0].session.id.length, 101);
        assert.equal(saved[1].session.task.length, 201);
        assert.equal(saved[2].session.day, '2999-01-01');
        assert.equal(saved[3].session.subject_id, 'obsolete-subject');
        const downloadPromise = p.waitForEvent('download');
        await p.getByRole('button', { name: 'Descarregar sessions', exact: true }).click();
        assert.equal((await downloadPromise).suggestedFilename(), 'sessions-estudi-pendents.json');
        await p.reload();
        await p.getByText(/4 sessions no s’han pogut sincronitzar/).waitFor();
        assert.equal(f.db.prepare('SELECT COUNT(*) n FROM focus_sessions').get().n, 1);
      },
      {
        queue: [
          { id: 'x'.repeat(101), minutes: 1, task: '' },
          { id: 'invalid-task', minutes: 1, task: 'x'.repeat(201) },
          { id: 'invalid-day', minutes: 1, task: '', day: '2999-01-01' },
          { id: 'invalid-subject', minutes: 1, task: '', subject_id: 'obsolete-subject' },
          { id: 'valid-after-corrupt', minutes: 1, task: '' },
        ],
      },
    );
    await run(
      'break-continues-to-work',
      390,
      async (p) => {
        await p.getByRole('status').filter({ hasText: 'Concentració' }).first().waitFor();
        const stored = await p.evaluate(() =>
          JSON.parse(localStorage.getItem('lanet.timer.browser')),
        );
        assert.equal(stored.running, true);
        assert.equal(stored.round, 3);
        assert.ok(stored.sessionId);
        assert.equal(stored.workMinutes, 1);
        await p.getByRole('button', { name: 'Pausar', exact: true }).click();
      },
      {
        timer: {
          phase: 'long',
          round: 2,
          running: true,
          until: 2500,
          remaining: 120,
          sessionId: null,
          workMinutes: null,
        },
      },
    );
    await run(
      'muted-boundary-keeps-audio-ready',
      390,
      async (p) => {
        await p.locator('.study-continuity summary').click();
        const available = await p.evaluate(() => window.focusSound.nativeAvailable);
        if (available) {
          await p.getByRole('button', { name: 'Provar el so', exact: true }).click();
          await p.waitForFunction(() => window.focusSound.starts >= 3);
        }
        await p.getByRole('slider', { name: 'Volum de l’alarma', exact: true }).press('Home');
        await p.getByRole('status').filter({ hasText: 'Descans' }).first().waitFor();
        await p.getByRole('button', { name: 'Pausar', exact: true }).waitFor();
        const stored = await p.evaluate(() =>
          JSON.parse(localStorage.getItem('lanet.focusOptions.browser')),
        );
        assert.equal(stored.alarmVolume, 0);
        if (available) {
          assert.equal(await p.evaluate(() => window.focusSound.starts), 3);
          await p.getByText('So preparat', { exact: true }).waitFor();
        }
      },
      {
        timer: {
          phase: 'work',
          round: 1,
          running: true,
          until: 4500,
          remaining: 60,
          sessionId: 'muted-session',
          workMinutes: 1,
        },
      },
    );
  } finally {
    await browser.close();
  }
}
console.log(`${results.length} focus journeys passed.`);
