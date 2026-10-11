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
  const modeNames = {
    number: 'Números',
    split: 'Entre dos',
    corner: 'Cantonades',
    street: 'Files de 3',
    six: 'Files de 6',
    trio: 'Zona del 0',
    'first-four': 'Zona del 0',
  };
  const place = async (p, id) => {
    const b = TABLE_BETS.find((b) => b.id === id);
    if (modeNames[b.kind])
      await p
        .getByRole('button', {
          name: b.numbers[0] === 0 && b.kind !== 'number' ? 'Zona del 0' : modeNames[b.kind],
          exact: true,
        })
        .click();
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
      'All 157 placements are reachable and preserve independent chip amounts',
      { width: 1440, height: 1000 },
      async (p) => {
        const colors = await p.evaluate(() =>
          ['number:0', 'number:1', 'number:2'].map(
            (id) =>
              getComputedStyle(document.querySelector(`[data-bet-id="${id}"]`)).backgroundColor,
          ),
        );
        assert.equal(new Set(colors).size, 3, 'Zero, red and black retain distinct table colors');
        for (const b of TABLE_BETS) await place(p, b.id);
        await p.locator('.tapet-ticket summary').click();
        assert.equal(await p.locator('.tapet-ticket li').count(), 157);
        assert.ok((await p.locator('.tapet-total').innerText()).includes('157 pastissos'));
        await p.locator('.tapet-ticket summary').click();
        await p.getByRole('button', { name: 'Cantonades', exact: true }).click();
        await p.screenshot({ path: `${out}/${engine}-desktop-corners.png`, fullPage: true });
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
        await p.getByRole('button', { name: 'Entre dos', exact: true }).click();
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
        await p.getByRole('button', { name: 'Entre dos', exact: true }).focus();
        await p.keyboard.press('Enter');
        const b = p.locator('[data-bet-id="split:1-2"]');
        await b.focus();
        await b.press('Enter');
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
  } finally {
    await browser.close();
  }
}
console.log(`${results.length} chip table scenarios verified.`);
