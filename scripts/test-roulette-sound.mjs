import { chromium, firefox, webkit } from 'playwright';
import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { browserFixture } from '../tests/helpers/browser-fixture.mjs';
import { roulettePayout, ticketStake } from '../shared/roulette.js';

const out = 'output/roulette-sound';
mkdirSync(out, { recursive: true });
const results = [];
const skipped = [];
for (const [engine, launcher] of Object.entries({ chromium, firefox, webkit })) {
  if (
    process.env.LANET_BROWSER_ENGINES &&
    !process.env.LANET_BROWSER_ENGINES.split(',').includes(engine)
  )
    continue;
  const browser = await launcher.launch();
  for (const scenario of [
    'win-music',
    'mute-exit',
    'hidden',
    'unsupported',
    'blocked',
    'prefix',
    'recovery',
  ]) {
    const f = await browserFixture();
    const context = await browser.newContext({
      viewport: {
        width: scenario === 'win-music' ? 1280 : 390,
        height: scenario === 'win-music' ? 720 : 844,
      },
      reducedMotion: ['unsupported', 'blocked', 'prefix', 'recovery'].includes(scenario)
        ? 'reduce'
        : 'no-preference',
    });
    await context.addCookies([{ name: 'lanet_session', value: f.token, url: f.base }]);
    await context.route('**/*', (route) =>
      new URL(route.request().url()).origin === f.base ? route.continue() : route.abort(),
    );
    await context.route('**/api/roulette', async (route) => {
      if (route.request().method() === 'POST') {
        const bet = route.request().postDataJSON();
        if (bet.bets)
          f.db
            .prepare(
              "INSERT INTO roulette_tickets(id,user_id,request_id,bets,stake,result,payout,day) VALUES(?,'browser',?,?,?,?,?,?)",
            )
            .run(
              bet.request_id,
              bet.request_id,
              JSON.stringify(bet.bets),
              ticketStake(bet),
              1,
              roulettePayout(bet, 1),
              '2026-10-13',
            );
        else
          f.db
            .prepare(
              "INSERT INTO roulette_spins(id,user_id,request_id,stake,kind,number,result,payout,day) VALUES(?,'browser',?,?,?,?,?,?,?)",
            )
            .run(
              bet.request_id,
              bet.request_id,
              bet.stake,
              bet.kind,
              bet.number,
              1,
              roulettePayout(bet, 1),
              '2026-10-13',
            );
      }
      await route.continue();
    });
    const recoveryId = randomUUID();
    await context.addInitScript(
      ({ scenario, recoveryId }) => {
        window.soundProbe = {
          contexts: [],
          starts: [],
          closed: 0,
          peak: 0,
          lastPeak: 0,
          active: 0,
        };
        if (scenario === 'recovery')
          localStorage.setItem(
            'lanet.roulette.pending.browser',
            JSON.stringify({ kind: 'red', number: null, stake: 1, request_id: recoveryId }),
          );
        const NativeAudio = window.AudioContext || window.webkitAudioContext;
        window.soundProbe.nativeAvailable = !!NativeAudio;
        if (scenario === 'unsupported' || !NativeAudio) {
          window.AudioContext = undefined;
          window.webkitAudioContext = undefined;
          return;
        }
        function Instrumented(options) {
          const ctx = new NativeAudio(options);
          window.soundProbe.contexts.push(ctx);
          if (scenario === 'blocked') {
            Object.defineProperty(ctx, 'state', { get: () => 'suspended' });
            ctx.resume = () =>
              Promise.reject(new DOMException('Fixture denied audio', 'NotAllowedError'));
          }
          const analyser = ctx.createAnalyser();
          analyser.fftSize = 256;
          const samples = new Float32Array(analyser.fftSize);
          const sample = setInterval(() => {
            analyser.getFloatTimeDomainData(samples);
            const peak = Math.max(...samples.map(Math.abs));
            window.soundProbe.lastPeak = peak;
            window.soundProbe.peak = Math.max(window.soundProbe.peak, peak);
          }, 8);
          const gainFactory = ctx.createGain.bind(ctx);
          ctx.createGain = () => {
            const gain = gainFactory(),
              connect = gain.connect.bind(gain);
            gain.connect = (target, ...args) => {
              if (target === ctx.destination) {
                connect(analyser);
                analyser.connect(target);
                return target;
              }
              return connect(target, ...args);
            };
            return gain;
          };
          for (const kind of ['createOscillator', 'createBufferSource']) {
            const factory = ctx[kind].bind(ctx);
            ctx[kind] = () => {
              const node = factory(),
                start = node.start.bind(node);
              let frequency = 0;
              if (node.frequency) {
                const setFrequency = node.frequency.setValueAtTime.bind(node.frequency);
                node.frequency.setValueAtTime = (value, at) => {
                  frequency = value;
                  return setFrequency(value, at);
                };
              }
              node.start = (at) => {
                window.soundProbe.starts.push({
                  at,
                  frequency,
                  time: performance.now(),
                });
                window.soundProbe.active++;
                node.addEventListener('ended', () => window.soundProbe.active--, { once: true });
                return start(at);
              };
              return node;
            };
          }
          const close = ctx.close.bind(ctx);
          ctx.close = () => {
            window.soundProbe.closed++;
            clearInterval(sample);
            return close();
          };
          return ctx;
        }
        if (scenario === 'prefix') {
          window.AudioContext = undefined;
          window.webkitAudioContext = Instrumented;
        } else window.AudioContext = Instrumented;
      },
      { scenario, recoveryId },
    );
    const page = await context.newPage(),
      errors = [];
    page.setDefaultTimeout(15000);
    page.on('pageerror', (error) => errors.push(error.message));
    const open = async () => {
      await page.goto(f.base + '/#bakery');
      await page.getByRole('button', { name: 'Entrar a la pastisseria', exact: true }).click();
      await page
        .getByRole('button', { name: 'Aixecar la catifa de la pastisseria', exact: true })
        .click();
      await page.locator('.casino-room').waitFor();
      await page.waitForFunction(
        () =>
          !document.querySelector('.casino-bet-controls')?.disabled ||
          !!document.querySelector('.casino-pending'),
      );
    };
    const probe = () =>
      page.evaluate(() => ({
        count: window.soundProbe.contexts.length,
        starts: window.soundProbe.starts,
        closed: window.soundProbe.closed,
        peak: window.soundProbe.peak,
        active: window.soundProbe.active,
      }));
    try {
      await open();
      if (
        scenario !== 'unsupported' &&
        !(await page.evaluate(() => window.soundProbe.nativeAvailable))
      ) {
        assert.equal(await page.locator('.casino-sound-toggle').isDisabled(), true);
        skipped.push({
          engine,
          scenario,
          reason:
            'Native Web Audio unavailable in this runtime; unsupported scenario verifies graceful fallback',
        });
        console.log(`${engine} ${scenario} SKIP (no native Web Audio)`);
        continue;
      }
      assert.equal((await probe()).count, 0, 'Opening a room never starts audio');
      if (scenario === 'unsupported')
        assert.equal(await page.locator('.casino-sound-toggle').isDisabled(), true);
      if (scenario === 'recovery') {
        await page.getByRole('button', { name: 'Recuperar aposta', exact: true }).click();
        await page.locator('.roulette-result.has-result').waitFor();
        assert.equal(
          (await probe()).starts.length,
          0,
          'Recovering a previous bet never replays sound',
        );
      } else {
        if (scenario === 'win-music') {
          await page.evaluate(() => {
            const audio = document.createElement('audio');
            audio.id = 'sound-test-music';
            audio.src = '/audio/acoustic-lemon.mp3';
            audio.volume = 0.07;
            document.body.append(audio);
            const button = document.createElement('button');
            button.textContent = 'Prova música local';
            button.style.cssText = 'position:fixed;bottom:5px;right:5px;z-index:1000';
            button.onclick = () => {
              audio.play().catch(() => {});
              button.remove();
            };
            document.body.append(button);
          });
          await page.getByRole('button', { name: 'Prova música local', exact: true }).click();
          await page.waitForFunction(
            () => document.getElementById('sound-test-music').currentTime > 0,
          );
        }
        await page.locator('[data-bet-id^="red:"]').click();
        if (!['unsupported', 'blocked'].includes(scenario)) {
          await page.waitForFunction(() => window.soundProbe.peak > 0.00001);
          assert.ok((await probe()).peak < 0.25, 'Cues remain quiet with generous headroom');
          assert.equal((await probe()).count, 1, 'A single audio context is reused');
        }
        await page.getByRole('button', { name: 'Fer girar la ruleta', exact: true }).click();
        if (['win-music', 'mute-exit', 'hidden'].includes(scenario)) {
          await page.locator('.roulette-device.is-spinning').waitFor();
          await page.waitForFunction(() => window.soundProbe.starts.length > 20);
          const rolling = await probe();
          assert.ok(rolling.active <= 96, 'Scheduling has a fixed upper bound');
          if (scenario === 'mute-exit') {
            await page
              .getByRole('button', { name: 'Silenciar sons de la ruleta', exact: true })
              .click();
            await page.waitForFunction(() => window.soundProbe.active === 0);
          } else if (scenario === 'hidden') {
            await page.evaluate(() => {
              Object.defineProperty(document, 'hidden', { configurable: true, get: () => true });
              document.dispatchEvent(new Event('visibilitychange'));
            });
            await page.waitForFunction(() => window.soundProbe.active === 0);
          }
          await page.locator('.roulette-award.is-profit').waitFor();
          assert.equal(
            await page.locator('.cake-balance strong').textContent(),
            '4',
            'Reward remains held during the animation',
          );
          assert.equal(
            (await probe()).starts.filter((s) => Math.abs(s.frequency - 987.77) < 0.05).length,
            0,
            'Reward chime cannot anticipate delivery',
          );
          await page.waitForFunction(
            () => document.querySelector('.cake-balance strong')?.textContent === '6',
          );
          if (scenario === 'win-music') {
            await page.waitForFunction(() =>
              window.soundProbe.starts.some((s) => Math.abs(s.frequency - 987.77) < 0.05),
            );
            const music = await page
              .locator('#sound-test-music')
              .evaluate((e) => ({ paused: e.paused, volume: e.volume, time: e.currentTime }));
            assert.ok(
              !music.paused && music.time > 5 && music.volume === 0.07,
              'Effects never stop, seek or alter music',
            );
          } else
            assert.equal(
              (await probe()).starts.length,
              rolling.starts.length,
              'Mute/hidden tab cancels future cues and reward',
            );
        } else {
          await page.locator('.roulette-result.has-result').waitFor();
          if (['unsupported', 'blocked'].includes(scenario))
            assert.equal((await probe()).starts.length, 0);
        }
        if (scenario === 'mute-exit') {
          await page.reload();
          await page.getByRole('button', { name: 'Entrar a la pastisseria', exact: true }).click();
          await page
            .getByRole('button', { name: 'Aixecar la catifa de la pastisseria', exact: true })
            .click();
          await page
            .getByRole('button', { name: 'Activar sons de la ruleta', exact: true })
            .waitFor();
          await page.locator('[data-bet-id^="red:"]').click();
          assert.equal((await probe()).count, 0, 'Mute preference survives a reload');
          await page
            .getByRole('button', { name: 'Activar sons de la ruleta', exact: true })
            .click();
          await page.locator('[data-bet-id^="black:"]').click();
          await page.waitForFunction(() => window.soundProbe.peak > 0.00001);
          await page.getByRole('button', { name: 'Tornar al forn', exact: true }).click();
          await page.waitForFunction(
            () => window.soundProbe.closed === 1 && window.soundProbe.active === 0,
          );
        }
      }
      assert.deepEqual(errors, []);
      await page.screenshot({ path: `${out}/${engine}-${scenario}.png` });
      results.push({ engine, scenario, passed: true, probe: await probe() });
      console.log(`${engine} ${scenario} OK`);
    } catch (error) {
      results.push({
        engine,
        scenario,
        passed: false,
        error: error.message,
        stack: error.stack,
        errors,
        probe: await probe(),
      });
      await page.screenshot({ path: `${out}/${engine}-${scenario}-failed.png` });
      console.error(`${engine} ${scenario}: ${error.message}`);
    } finally {
      await context.close();
      await f.close();
      writeFileSync(
        `${out}/results.json`,
        JSON.stringify({ localOnly: true, results, skipped }, null, 2),
      );
    }
  }
  await browser.close();
}
assert.ok(
  results.every((r) => r.passed),
  'Roulette sound scenarios failed',
);
