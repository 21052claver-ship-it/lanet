import test from 'node:test';
import assert from 'node:assert/strict';
import { testEnvironment } from './helpers/d1.js';
import { claimBakeryCake, readBakeryPolicy, bakeryStatus } from '../worker/bakery.js';
import {
  bakeryRewardPolicy,
  bakeryRewardState,
  bakeryRemainingSeconds,
  bakeryCountdown,
} from '../shared/bakery-reward.js';
const policy = { mode: 'test', intervalSeconds: 60, campaign: 'test-2026-10-11-minute-v1' };
const now = Date.parse('2026-10-11T18:00:00Z');
function fixture() {
  const { db, env } = testEnvironment();
  db.exec(
    "INSERT INTO users(id,email,name,password_hash,salt,google_sub) VALUES('cake','cake@fje.edu','Local','x','x','cake'),('other','cake-other@fje.edu','Altre','x','x','other')",
  );
  const user = db.prepare("SELECT * FROM users WHERE id='cake'").get();
  const set = (value = policy) =>
    db
      .prepare(
        "INSERT INTO settings(key,value) VALUES('bakery_reward_policy',?) ON CONFLICT(key) DO UPDATE SET value=excluded.value",
      )
      .run(JSON.stringify(value));
  return { db, env, user, set };
}
test('Only a valid explicit minute policy activates test rewards', () => {
  for (const value of [
    null,
    'bad',
    {},
    { ...policy, intervalSeconds: 0 },
    { ...policy, intervalSeconds: 1 },
    { ...policy, campaign: 'invalid!' },
  ])
    assert.deepEqual(bakeryRewardPolicy(value), { mode: 'daily' });
  assert.deepEqual(bakeryRewardPolicy(JSON.stringify(policy)), policy);
  const state = bakeryRewardState(policy, now, { lastClaimAt: now - 1 });
  assert.equal(bakeryRemainingSeconds(state), 60);
  assert.equal(bakeryRemainingSeconds(state, 59998), 1);
  assert.equal(bakeryRemainingSeconds(state, 59999), 0);
  assert.equal(bakeryCountdown(60), '01:00');
  assert.equal(bakeryCountdown(9), '00:09');
});
test('Daily policy remains one per Madrid day and preserves existing claims', async () => {
  const { db, env, user } = fixture();
  assert.equal((await claimBakeryCake(env, user, now)).claimed, true);
  assert.equal((await claimBakeryCake(env, user, now + 60000)).claimed, false);
  assert.equal((await claimBakeryCake(env, user, now + 86400000)).claimed, true);
  assert.equal(
    db.prepare("SELECT balance FROM users WHERE id='cake'").get().balance,
    user.balance + 2,
  );
  assert.equal(db.prepare('SELECT count(*) n FROM daily_claims').get().n, 2);
});
test('Enabling the campaign resets availability without altering daily history or earnings', async () => {
  const { db, env, user, set } = fixture();
  await claimBakeryCake(env, user, now);
  set();
  assert.equal((await bakeryStatus(env, user, await readBakeryPolicy(env), now)).available, true);
  const first = await claimBakeryCake(env, user, now);
  assert.equal(first.claimed, true);
  assert.equal(first.balance, user.balance + 2);
  assert.equal(first.bakeryReward.nextClaimAt, now + 60000);
  assert.equal(db.prepare('SELECT count(*) n FROM daily_claims').get().n, 1);
  assert.equal(db.prepare("SELECT count(*) n FROM ledger WHERE user_id='cake'").get().n, 3);
  set();
  assert.equal((await claimBakeryCake(env, user, now + 1)).claimed, false);
});
test('Twelve concurrent requests credit once and the next exact 60-second boundary credits once', async () => {
  const { db, env, user, set } = fixture();
  set();
  const first = await Promise.all(
    Array.from({ length: 12 }, () => claimBakeryCake(env, user, now)),
  );
  assert.equal(first.filter((r) => r.claimed).length, 1);
  assert.equal((await claimBakeryCake(env, user, now + 59999)).claimed, false);
  const next = await Promise.all(
    Array.from({ length: 12 }, () => claimBakeryCake(env, user, now + 60000)),
  );
  assert.equal(next.filter((r) => r.claimed).length, 1);
  assert.equal(
    db.prepare("SELECT balance FROM users WHERE id='cake'").get().balance,
    user.balance + 2,
  );
  assert.equal(db.prepare('SELECT count(*) n FROM bakery_test_claims').get().n, 2);
});
test('Accounts are isolated, rollback is atomic, and returning to daily cannot reset its previous claim', async () => {
  const { db, env, user, set } = fixture();
  await claimBakeryCake(env, user, now);
  set();
  await claimBakeryCake(env, user, now);
  const other = db.prepare("SELECT * FROM users WHERE id='other'").get();
  assert.equal((await bakeryStatus(env, other, policy, now)).available, true);
  assert.equal((await claimBakeryCake(env, other, now)).claimed, true);
  db.exec(
    "CREATE TRIGGER fail_test_credit BEFORE INSERT ON ledger WHEN NEW.ref LIKE 'bakery-test:%' BEGIN SELECT RAISE(ABORT,'forced_rollback'); END",
  );
  await assert.rejects(claimBakeryCake(env, user, now + 60000), /forced_rollback/);
  assert.equal(
    db.prepare("SELECT count(*) n FROM bakery_test_claims WHERE user_id='cake'").get().n,
    1,
  );
  assert.equal(
    db.prepare("SELECT balance FROM users WHERE id='cake'").get().balance,
    user.balance + 2,
  );
  set({ mode: 'daily' });
  assert.equal((await claimBakeryCake(env, user, now + 60000)).claimed, false);
});
