import { one, run, id } from './utils.js';
import { madridDay } from '../shared/domain.js';
import { bakeryRewardPolicy, bakeryRewardState } from '../shared/bakery-reward.js';

export async function readBakeryPolicy(env) {
  const setting = await one(env, "SELECT value FROM settings WHERE key='bakery_reward_policy'");
  return bakeryRewardPolicy(setting?.value);
}

export async function bakeryStatus(env, user, policy, now = Date.now(), dailyClaimed = false) {
  const latest =
    policy.mode === 'test'
      ? await one(
          env,
          'SELECT MAX(claimed_at) AS last FROM bakery_test_claims WHERE user_id=? AND campaign=?',
          user.id,
          policy.campaign,
        )
      : null;
  return bakeryRewardState(policy, now, { dailyClaimed, lastClaimAt: latest?.last ?? null });
}

// The interval and time originate on the server. The write predicate and credit
// trigger execute in one SQLite transaction, including concurrent requests.
export async function claimBakeryCake(env, user, now = Date.now()) {
  const policy = await readBakeryPolicy(env);
  const result =
    policy.mode === 'test'
      ? await run(
          env,
          `INSERT INTO bakery_test_claims(id,user_id,campaign,claimed_at,day)
        SELECT ?,?,?,?,? WHERE NOT EXISTS(
          SELECT 1 FROM bakery_test_claims WHERE user_id=? AND campaign=? AND claimed_at>?
        )`,
          id(),
          user.id,
          policy.campaign,
          now,
          madridDay(new Date(now)),
          user.id,
          policy.campaign,
          now - policy.intervalSeconds * 1000,
        )
      : await run(
          env,
          'INSERT OR IGNORE INTO daily_claims(user_id,day) VALUES(?,?)',
          user.id,
          madridDay(new Date(now)),
        );
  return {
    claimed: result.meta.changes > 0,
    balance: (await one(env, 'SELECT balance FROM users WHERE id=?', user.id)).balance,
    bakeryReward: await bakeryStatus(env, user, policy, now, true),
  };
}
