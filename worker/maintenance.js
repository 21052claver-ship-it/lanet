import { one, run } from './utils.js';
import { cleanAbuseState } from './abuse.js';
import { cleanActivity } from './activity.js';
import { queueUnusedFiles, drainFileDeletions } from './file-lifecycle.js';

export async function maintainData(env, now = Date.now()) {
  // One durable lease across all users/tabs/isolates. Polling bootstrap does not
  // repeatedly scan files or contact R2. A failed pass can retry after a minute.
  const lease = await one(
    env,
    `INSERT INTO settings(key,value) VALUES('data_maintenance_until',?)
    ON CONFLICT(key) DO UPDATE SET value=excluded.value WHERE CAST(settings.value AS INTEGER)<=?
    RETURNING key`,
    String(now + 60000),
    now,
  );
  if (!lease) return;
  await cleanAbuseState(env);
  await cleanActivity(env, now);
  await queueUnusedFiles(env);
  const files = await drainFileDeletions(env);
  await run(
    env,
    `INSERT INTO settings(key,value) VALUES('data_maintenance_status',?)
    ON CONFLICT(key) DO UPDATE SET value=excluded.value`,
    JSON.stringify({ last_success: now, pending_files: files.remaining }),
  );
}
