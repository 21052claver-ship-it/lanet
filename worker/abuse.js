import { body, hash, HttpError, limit, one, rateWindow, run } from './utils.js';

const nowSeconds = () => Math.floor(Date.now() / 1000);
const blockKey = async (uid) => `abuse:block:${await hash(uid)}`;
function paused(seconds) {
  const error = new HttpError(
    429,
    `Les accions estan en pausa per activitat repetida inusual. Espera ${seconds} segons. Pots continuar consultant La Net o tancar sessió.`,
  );
  error.code = 'abuse_blocked';
  error.retryAfter = Math.max(1, seconds);
  return error;
}

export async function edgeGuard(request, env) {
  // Generous shared-network ceiling; the stricter budgets are per account.
  if (env.DB && new URL(request.url).pathname !== '/api/auth/logout')
    await limit(env, request, 'edge-api', 6000, 60);
}

export async function accountGuard(request, env, user) {
  const path = new URL(request.url).pathname;
  if (request.method === 'GET') {
    await limit(env, request, `read:${user.id}`, 600, 60, true);
    if (path === '/api/bootstrap') await limit(env, request, `bootstrap:${user.id}`, 120, 60, true);
    return;
  }
  const block = await one(
    env,
    'SELECT expires FROM rate_limits WHERE key=?',
    await blockKey(user.id),
  );
  if (block?.expires > nowSeconds()) throw paused(block.expires - nowSeconds());
  await limit(env, request, `write-burst:${user.id}`, 60, 10, true);
  await limit(env, request, `write:${user.id}`, 240, 60, true);
  if (
    /^\/api\/(notes|pluses|proposals|events|announcements|library)$/.test(path) &&
    request.method === 'POST'
  ) {
    await limit(env, request, `publish:${user.id}`, 10, 60, true);
    await limit(env, request, `publish-hour:${user.id}`, 60, 3600, true);
  }
  if (path === '/api/banner') {
    await limit(env, request, `banner:${user.id}`, 6, 60, true);
    await limit(env, request, `banner-hour:${user.id}`, 30, 3600, true);
  }
  if (path === '/api/reports') {
    await limit(env, request, `report:${user.id}`, 5, 60, true);
    await limit(env, request, `report-day:${user.id}`, 20, 86400, true);
  }
  if (path === '/api/bakery/claim') await limit(env, request, `claim:${user.id}`, 10, 60, true);
  if (path === '/api/focus/complete') await limit(env, request, `focus:${user.id}`, 6, 60, true);
}

function canonical(value) {
  if (typeof value === 'string') return value.normalize('NFKC').trim().replace(/\s+/g, ' ');
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === 'object')
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((key) => [key, canonical(value[key])]),
    );
  return value;
}

const publicationFields = {
  notes: ['title', 'body', 'summary', 'subject_id', 'topic', 'term', 'price', 'status', 'files'],
  pluses: ['title', 'body', 'date', 'start', 'end', 'place', 'conditions', 'url', 'subjects'],
  events: [
    'title',
    'body',
    'date',
    'start',
    'end',
    'kind',
    'subject_id',
    'offering_id',
    'group_id',
    'room',
    'visibility',
  ],
  proposals: ['title', 'body', 'files'],
  announcements: ['title', 'body', 'group_id', 'pinned'],
  reports: ['type', 'target_id', 'reason'],
};

function publicationContent(path, value) {
  // Unused client fields (e.g. a random nonce) must not bypass duplicate detection.
  const fields = publicationFields[path.split('/').pop()];
  return Object.fromEntries(
    fields
      .filter((key) => Object.hasOwn(value, key))
      .map((key) => [
        key,
        key === 'subjects' && Array.isArray(value[key])
          ? value[key].map((subject) => ({
              subject_id: subject?.subject_id,
              bonus: subject?.bonus,
            }))
          : key === 'files' && Array.isArray(value[key])
            ? value[key].map((file) => ({
                id: typeof file === 'string' ? file : file?.id,
                preview: !!file?.preview,
              }))
            : value[key],
      ]),
  );
}

export async function reservePublication(request, env, user) {
  const path = new URL(request.url).pathname;
  if (
    request.method !== 'POST' ||
    !/^\/api\/(notes|pluses|proposals|events|announcements|reports)$/.test(path)
  )
    return null;
  const value = await body(request);
  const key = `spam:${await hash(`${user.id}:${path}:${JSON.stringify(canonical(publicationContent(path, value)))}`)}`;
  const now = nowSeconds();
  const reservation = await one(
    env,
    `INSERT INTO rate_limits(key,count,expires) VALUES(?,1,?)
     ON CONFLICT(key) DO UPDATE SET count=1,expires=excluded.expires
     WHERE rate_limits.expires<=? RETURNING key`,
    key,
    now + 600,
    now,
  );
  if (!reservation) {
    const error = new HttpError(
      409,
      'Ja has enviat aquest contingut fa poc. Revisa la llista abans de tornar-lo a publicar.',
    );
    error.code = 'duplicate_content';
    throw error;
  }
  return { key, expires: now + 600 };
}

export async function releasePublication(env, key) {
  if (key)
    await run(env, 'DELETE FROM rate_limits WHERE key=? AND expires=?', key.key, key.expires);
}

export async function recordAbuse(env, user, error) {
  if (
    !user ||
    error.code === 'abuse_blocked' ||
    !(
      [403, 404, 413].includes(error.status) ||
      ['rate_limited', 'duplicate_content'].includes(error.code)
    )
  )
    return;
  const failures = await rateWindow(env, `abuse:violations:${user.id}`, 60);
  if (failures.count < 8) return;
  const now = nowSeconds();
  // Concurrent failures can install only one block, never extend an active one.
  await one(
    env,
    `INSERT INTO rate_limits(key,count,expires) VALUES(?,1,?)
     ON CONFLICT(key) DO UPDATE SET
       count=CASE WHEN rate_limits.expires<=? THEN 1 ELSE MIN(rate_limits.count+1,3) END,
       expires=?+CASE WHEN rate_limits.expires<=? THEN 60 WHEN rate_limits.count=1 THEN 300 ELSE 900 END
     WHERE rate_limits.expires<=? RETURNING count,expires`,
    await blockKey(user.id),
    now + 60,
    now - 86400,
    now,
    now - 86400,
    now,
  );
}

export async function cleanAbuseState(env) {
  const gate = await rateWindow(env, 'abuse:housekeeping', 3600);
  if (gate.count !== 1) return;
  const now = nowSeconds();
  await run(
    env,
    `DELETE FROM rate_limits WHERE expires<=?
    AND (key NOT LIKE 'abuse:block:%' OR expires<=?)`,
    now,
    now - 86400,
  );
}
