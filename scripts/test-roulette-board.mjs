import assert from 'node:assert/strict';
import { chromium, firefox, webkit } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';
import { browserFixture } from '../tests/helpers/browser-fixture.mjs';
import { TABLE_BETS, roulettePayout } from '../shared/roulette.js';
const out = process.env.LANET_TEST_OUTPUT || 'output/roulette-board/browser';
mkdirSync(out, { recursive: true });
const results = [];
for (const [engine, launcher] of Object.entries({ chromium, firefox, webkit })) {
  if (
    process.env.LANET_BROWSER_ENGINES &&
    !process.env.LANET_BROWSER_ENGINES.split(',').includes(engine)
  )
    continue;
  const browser = await launcher.launch({ headless: true });
  async function run(label, size, fn, { motion = false } = {}) {
    if (process.env.LANET_TEST_CASE && !label.includes(process.env.LANET_TEST_CASE)) return;
    const f = await browserFixture();
    f.db.exec(
      "INSERT INTO ledger(id,user_id,amount,reason,ref,day) VALUES('fund','browser',995,'Local fixture','fund','2026-10-12')",
    );
    const context = await browser.newContext({
      viewport: size,
      hasTouch: size.width < 1000,
      reducedMotion: motion ? 'no-preference' : 'reduce',
    });
    await context.route('**/*', (r) =>
      new URL(r.request().url()).origin === f.base ? r.continue() : r.abort(),
    );
    await context.addCookies([{ name: 'lanet_session', value: f.token, url: f.base }]);
    const p = await context.newPage();
    p.setDefaultTimeout(12000);
    const errors = [];
    p.on('pageerror', (e) => errors.push(e.message));
    async function enter() {
      await p.getByRole('button', { name: 'Entrar a la pastisseria', exact: true }).click();
      await p.getByRole('heading', { name: 'El forn de La Net', exact: true }).waitFor();
      await p
        .getByRole('button', { name: 'Aixecar la catifa de la pastisseria', exact: true })
        .click();
      await p.getByRole('heading', { name: 'La sala secreta', exact: true }).waitFor();
      await p.waitForFunction(
        () =>
          document.querySelector('.casino-pending') ||
          !document.querySelector('.casino-bet-controls')?.disabled,
      );
    }
    try {
      await p.goto(f.base + '/#bakery');
      await enter();
      await fn(p, f, enter);
      assert.deepEqual(errors, []);
      assert.ok(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
      results.push({ engine, label, ...size, motion, passed: true });
      console.log(`✓ ${engine}: ${label}`);
    } catch (e) {
      results.push({ engine, label, ...size, passed: false, error: e.message, errors });
      await p.screenshot({ path: `${out}/${engine}-failure.png`, fullPage: true });
      throw e;
    } finally {
      writeFileSync(
        `${out}/results.json`,
        JSON.stringify(
          { localOnly: true, publicSiteVisited: false, physicalDevice: false, results },
          null,
          2,
        ) + '\n',
      );
      await context.close();
      await f.close();
    }
  }
  const place = async (p, id) => {
    await p.locator(`[data-bet-id="${id}"]`).click();
  };
  const spin = async (p, f) => {
    await p.getByRole('button', { name: 'Fer girar la ruleta', exact: true }).click();
    await p.locator('.roulette-result.has-result').waitFor();
    const row = f.db.prepare('SELECT * FROM roulette_tickets ORDER BY rowid DESC LIMIT 1').get();
    assert.ok(row);
    assert.equal(row.payout, roulettePayout({ bets: JSON.parse(row.bets) }, row.result));
    const net = f.db.prepare('SELECT SUM(payout-stake) n FROM roulette_tickets').get().n;
    assert.equal(
      f.db.prepare("SELECT balance FROM users WHERE id='browser'").get().balance,
      1000 + net,
    );
    assert.equal(
      await p.locator('.roulette-device').getAttribute('data-result'),
      String(row.result),
    );
    return row;
  };
  try {
    await run(
      'Responsive transition keeps all hit areas disjoint',
      { width: 1104, height: 1000 },
      async (p) => {
        for (const width of [768, 1024, 1100, 1104, 1120, 1140, 1144, 1200, 1440]) {
          await p.setViewportSize({ width, height: 1000 });
          assert.ok(
            await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1),
            `${width}px: page overflow`,
          );
          const targets = await p.locator('[data-bet-id]').evaluateAll((items) =>
            items.map((e) => {
              const r = e.getBoundingClientRect();
              return {
                id: e.dataset.betId,
                left: r.left,
                top: r.top,
                right: r.right,
                bottom: r.bottom,
                width: r.width,
                height: r.height,
              };
            }),
          );
          for (let i = 0; i < targets.length; i++) {
            const a = targets[i];
            assert.ok(a.width >= 23.9 && a.height >= 23.9, `${width}px: ${a.id} too small`);
            for (const b of targets.slice(i + 1)) {
              const x = Math.min(a.right, b.right) - Math.max(a.left, b.left);
              const y = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
              assert.ok(x <= 0.75 || y <= 0.75, `${width}px: ${a.id} overlaps ${b.id}`);
            }
          }
        }
      },
    );
    await run(
      'All 157 placements are reachable and preserve independent chip amounts',
      { width: 1440, height: 1000 },
      async (p) => {
        assert.equal(await p.locator('.tapet-modes').count(), 0);
        assert.equal(await p.locator('[data-bet-id]').count(), 157);
        await p
          .locator('.tapet-container')
          .screenshot({ path: `${out}/${engine}-desktop-empty.png` });
        const colors = await p.evaluate(() =>
          [0, 1, 2].map(
            (n) => getComputedStyle(document.querySelector(`[data-number="${n}"]`)).backgroundColor,
          ),
        );
        assert.equal(new Set(colors).size, 3, 'Zero, red and black retain distinct table colors');
        for (const b of TABLE_BETS) await place(p, b.id);
        await p.locator('.tapet-ticket summary').click();
        assert.equal(await p.locator('.tapet-ticket li').count(), 157);
        assert.ok((await p.locator('.tapet-total').innerText()).includes('157 pastissos'));
        await p.locator('.tapet-ticket summary').click();
        await p
          .locator('.tapet-container')
          .screenshot({ path: `${out}/${engine}-desktop-complete.png` });
        await p.getByRole('button', { name: 'Retirar totes', exact: true }).click();
        assert.equal(await p.locator('.tapet-ticket').count(), 0);
        assert.equal(
          await p.getByRole('button', { name: 'Fer girar la ruleta', exact: true }).isDisabled(),
          true,
        );
      },
    );
    await run(
      '320px touch split, corner, two rows, undo, remove and single settlement',
      { width: 320, height: 740 },
      async (p, f) => {
        await place(p, 'number:17');
        await place(p, 'split:17-20');
        await place(p, 'corner:17-18-20-21');
        await place(p, 'six:16-17-18-19-20-21');
        await p.getByRole('button', { name: 'Desfer', exact: true }).click();
        assert.ok((await p.locator('.tapet-total').innerText()).includes('3 pastissos'));
        await place(p, 'six:16-17-18-19-20-21');
        await p.locator('.tapet-ticket summary').click();
        await p.getByRole('button', { name: 'Retirar Número 17', exact: true }).click();
        assert.equal(await p.locator('.tapet-ticket li').count(), 3);
        await p.screenshot({ path: `${out}/${engine}-320-splits.png`, fullPage: true });
        const row = await spin(p, f);
        assert.equal(row.stake, 3);
        assert.equal(JSON.parse(row.bets).length, 3);
        assert.equal(f.db.prepare('SELECT COUNT(*) n FROM roulette_tickets').get().n, 1);
        assert.ok((await p.locator('.tapet-total').innerText()).includes('0 pastissos'));
        assert.equal(
          await p.getByRole('button', { name: 'Desfer', exact: true }).isDisabled(),
          true,
        );
        await p.locator('.roulette-history > summary').click();
        await p.locator('.roulette-ticket-result').first().locator('summary').click();
        assert.equal(
          await p.locator('.roulette-ticket-result').first().getByRole('listitem').count(),
          3,
        );
        assert.equal(await p.locator('.roulette-history li').count(), 1);
      },
    );
    await run(
      '390px chip denominations, limits and clear',
      { width: 390, height: 844 },
      async (p) => {
        await p.getByRole('button', { name: '100 pastissos per fitxa', exact: true }).click();
        for (let i = 0; i < 10; i++) await place(p, 'number:0');
        await place(p, 'number:1');
        assert.ok((await p.locator('.tapet-total').innerText()).includes('1000 pastissos'));
        assert.ok(await p.getByText(/No hi caben més fitxes/).isVisible());
        await p.getByRole('button', { name: 'Desfer', exact: true }).click();
        await p.locator('.tapet-ticket summary').click();
        await p.getByRole('button', { name: 'Retirar una fitxa de Número 0', exact: true }).click();
        assert.ok((await p.locator('.tapet-total').innerText()).includes('800 pastissos'));
        await p.getByRole('button', { name: 'Retirar totes', exact: true }).click();
        await place(p, 'trio:0-1-2');
        await p.screenshot({ path: `${out}/${engine}-390-zero.png`, fullPage: true });
      },
    );
    await run(
      'Lost committed multi-bet response reloads and recovers only once',
      { width: 390, height: 844 },
      async (p, f, enter) => {
        await place(p, 'split:0-3');
        await place(p, 'corner:1-2-4-5');
        let drop = true;
        await p.route('**/api/roulette', async (r) => {
          if (r.request().method() === 'POST' && drop) {
            drop = false;
            await r.fetch();
            await r.abort();
          } else await r.continue();
        });
        await p.getByRole('button', { name: 'Fer girar la ruleta', exact: true }).click();
        await p.getByRole('button', { name: 'Recuperar aposta', exact: true }).waitFor();
        await p.waitForFunction(() => !document.querySelector('.casino-pending button').disabled);
        assert.equal(f.db.prepare('SELECT COUNT(*) n FROM roulette_tickets').get().n, 1);
        const id = f.db.prepare('SELECT request_id FROM roulette_tickets').get().request_id;
        await p.reload();
        await enter();
        await p.getByRole('button', { name: 'Recuperar aposta', exact: true }).click();
        await p.locator('.roulette-result.has-result').waitFor();
        assert.equal(f.db.prepare('SELECT COUNT(*) n FROM roulette_tickets').get().n, 1);
        assert.equal(f.db.prepare('SELECT request_id FROM roulette_tickets').get().request_id, id);
        assert.equal(
          await p.evaluate(() => localStorage.getItem('lanet.roulette.pending.browser')),
          null,
        );
      },
    );
    await run(
      'Keyboard split and real animation lock all placement controls',
      { width: 1440, height: 900 },
      async (p, f) => {
        const b = p.locator('[data-bet-id="split:1-2"]');
        await b.focus();
        await b.press('Enter');
        await b.press('ArrowRight');
        assert.notEqual(await p.evaluate(() => document.activeElement.dataset.betId), 'split:1-2');
        await p.keyboard.press('Home');
        assert.equal(await p.evaluate(() => document.activeElement.dataset.betId), 'number:0');
        await p.keyboard.press('End');
        assert.equal(await p.evaluate(() => document.activeElement.dataset.betId), 'number:36');
        await p.getByRole('button', { name: 'Fer girar la ruleta', exact: true }).click();
        await p.locator('.roulette-device.is-spinning').waitFor();
        assert.equal(await b.isDisabled(), true);
        assert.equal(
          await p.getByRole('button', { name: 'Desfer', exact: true }).isDisabled(),
          true,
        );
        await p.locator('.roulette-result.has-result').waitFor();
        assert.equal(f.db.prepare('SELECT COUNT(*) n FROM roulette_tickets').get().n, 1);
      },
      { motion: true },
    );
    for (const width of [320, 390, 1440]) {
      await run(
        `Direct cell boundaries and all 157 hit targets at ${width}px`,
        { width, height: 950 },
        async (p) => {
          const tap = async (id, numbers) => {
            await p
              .locator(`[data-bet-id="${id}"]`)
              .evaluate((e) => e.scrollIntoView({ block: 'center' }));
            const cells = await Promise.all(
              numbers.map((n) => p.locator(`[data-number="${n}"]`).boundingBox()),
            );
            const x = cells.reduce((s, c) => s + c.x + c.width / 2, 0) / cells.length;
            const y = cells.reduce((s, c) => s + c.y + c.height / 2, 0) / cells.length;
            if (width < 1000) await p.touchscreen.tap(x, y);
            else await p.mouse.click(x, y);
            assert.equal(await p.locator(`[data-bet-id="${id}"] .tapet-chip`).innerText(), '1');
            assert.equal(await p.locator('.tapet-chip').count(), 1);
            await p.getByRole('button', { name: 'Retirar totes', exact: true }).click();
          };
          await tap('split:1-2', [1, 2]);
          await tap('split:1-4', [1, 4]);
          await tap('corner:1-2-4-5', [1, 2, 4, 5]);
          for (const b of TABLE_BETS) {
            const target = p.locator(`[data-bet-id="${b.id}"]`);
            await target.evaluate((e) => e.scrollIntoView({ block: 'center' }));
            const box = await target.boundingBox();
            assert.ok(box.width >= 23.9 && box.height >= 23.9, `${b.id}: touch area too small`);
            const hit = await p.evaluate(
              ({ x, y }) =>
                document.elementFromPoint(x, y)?.closest('[data-bet-id]')?.dataset.betId,
              { x: box.x + box.width / 2, y: box.y + box.height / 2 },
            );
            assert.equal(hit, b.id, `${b.id}: another position intercepts its centre`);
            if (width < 1000)
              await p.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2);
            else await target.click();
          }
          assert.equal(await p.locator('.tapet-chip').count(), 157);
          assert.ok((await p.locator('.tapet-total').innerText()).includes('157 pastissos'));
          await p
            .locator('.tapet-container')
            .screenshot({ path: `${out}/${engine}-${width}-all-targets.png` });
        },
      );
    }
  } finally {
    await browser.close();
  }
}
console.log(`${results.length} chip table scenarios verified.`);
