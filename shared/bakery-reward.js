export function bakeryRewardPolicy(value) {
  try {
    const policy = typeof value === 'string' ? JSON.parse(value) : value;
    if (
      policy?.mode === 'test' &&
      policy.intervalSeconds === 60 &&
      /^[a-z0-9][a-z0-9-]{3,79}$/.test(policy.campaign || '')
    )
      return { mode: 'test', intervalSeconds: 60, campaign: policy.campaign };
  } catch {
    /* An invalid setting keeps the normal daily policy. */
  }
  return { mode: 'daily' };
}

export function bakeryRewardState(policy, now, { dailyClaimed = false, lastClaimAt = null } = {}) {
  const nextClaimAt =
    policy.mode === 'test'
      ? lastClaimAt === null
        ? now
        : lastClaimAt + policy.intervalSeconds * 1000
      : null;
  return {
    mode: policy.mode,
    intervalSeconds: policy.mode === 'test' ? policy.intervalSeconds : null,
    serverNow: now,
    nextClaimAt,
    available: policy.mode === 'test' ? now >= nextClaimAt : !dailyClaimed,
  };
}

export function bakeryRemainingSeconds(reward, elapsed = 0) {
  if (reward?.mode !== 'test' || reward.nextClaimAt === null) return 0;
  return Math.max(
    0,
    Math.ceil((reward.nextClaimAt - reward.serverNow - Math.max(0, elapsed)) / 1000),
  );
}

export function bakeryCountdown(seconds) {
  return `${Math.floor(seconds / 60)
    .toString()
    .padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`;
}
