import { one, run, id, HttpError } from './utils.js';
import { MAX_FILE_BYTES } from './file-validation.js';

const DAILY_BYTES = 300 * 1024 * 1024;
function rejectUpload(seconds, blocked = false, message) {
  const error = new HttpError(
    429,
    message ||
      (blocked
        ? `Les pujades estan bloquejades temporalment per activitat inusual. Torna-ho a provar d’aquí a ${Math.ceil(seconds / 60)} minuts. Pots continuar utilitzant La Net.`
        : 'Tens massa pujades en curs o adjunts sense publicar. Publica els que tens o espera uns segons.'),
  );
  error.code = blocked ? 'upload_blocked' : 'upload_capacity';
  error.retryAfter = Math.max(1, Math.ceil(seconds));
  throw error;
}
async function block(env, userId) {
  return one(
    env,
    `UPDATE upload_guards SET
    blocked_until=unixepoch()+(CASE WHEN last_strike<unixepoch()-86400 OR strikes=0 THEN 900 WHEN strikes=1 THEN 3600 ELSE 86400 END),
    strikes=(CASE WHEN last_strike<unixepoch()-86400 THEN 1 ELSE strikes+1 END),last_strike=unixepoch()
    WHERE user_id=? AND blocked_until<=unixepoch() RETURNING blocked_until,unixepoch() AS now`,
    userId,
  );
}
export async function beginUpload(request, env, user) {
  const previous = await one(
    env,
    'SELECT blocked_until,unixepoch() AS now FROM upload_guards WHERE user_id=?',
    user.id,
  );
  if (previous?.blocked_until > previous?.now)
    rejectUpload(previous.blocked_until - previous.now, true);
  const state = await one(
    env,
    `INSERT INTO upload_guards(user_id,minute_start,minute_count,hour_start,hour_count,day_start,day_count)
    VALUES(?,unixepoch(),1,unixepoch(),1,unixepoch(),1)
    ON CONFLICT(user_id) DO UPDATE SET
    minute_count=(CASE WHEN minute_start<=unixepoch()-60 THEN 1 ELSE minute_count+1 END),
    minute_start=(CASE WHEN minute_start<=unixepoch()-60 THEN unixepoch() ELSE minute_start END),
    hour_count=(CASE WHEN hour_start<=unixepoch()-3600 THEN 1 ELSE hour_count+1 END),
    hour_start=(CASE WHEN hour_start<=unixepoch()-3600 THEN unixepoch() ELSE hour_start END),
    day_count=(CASE WHEN day_start<=unixepoch()-86400 THEN 1 ELSE day_count+1 END),
    day_bytes=(CASE WHEN day_start<=unixepoch()-86400 THEN 0 ELSE day_bytes END),
    day_start=(CASE WHEN day_start<=unixepoch()-86400 THEN unixepoch() ELSE day_start END)
    RETURNING *,unixepoch() AS now`,
    user.id,
  );
  if (state.blocked_until > state.now) rejectUpload(state.blocked_until - state.now, true);
  if (state.minute_count > 20 || state.hour_count > 60 || state.day_count > 180) {
    const blocked = await block(env, user.id);
    rejectUpload(blocked ? blocked.blocked_until - blocked.now : 900, true);
  }
  if (state.day_bytes + MAX_FILE_BYTES > DAILY_BYTES)
    rejectUpload(
      state.day_start + 86400 - state.now,
      false,
      'Has arribat al límit diari de 300 MB de pujades. Podràs tornar a pujar fitxers quan es renovi el límit.',
    );
  const purpose = request.headers.get('X-Upload-Purpose') === 'banner' ? 'banner' : 'content';
  const lease = id();
  // Reserve the maximum, not the client-declared Content-Length. Forged or
  // absent length headers cannot bypass parallel byte and draft quotas.
  await run(env, 'DELETE FROM upload_leases WHERE expires<=unixepoch()');
  const result = await run(
    env,
    `INSERT INTO upload_leases(id,user_id,purpose,reserved_bytes,expires)
    SELECT ?,?,?,?,unixepoch()+120 WHERE
    (SELECT blocked_until FROM upload_guards WHERE user_id=?)<=unixepoch()
    AND (SELECT count(*) FROM upload_leases WHERE user_id=?)<3
    AND (SELECT count(*) FROM files WHERE owner_id=? AND upload_expires_at IS NOT NULL AND deleting_at IS NULL AND note_id IS NULL AND plus_id IS NULL AND proposal_id IS NULL AND id NOT IN(SELECT file_id FROM current_banner_files))
      +(SELECT count(*) FROM upload_leases WHERE user_id=?)<24
    AND (?!='banner' OR (SELECT count(*) FROM files WHERE owner_id=? AND upload_purpose='banner' AND deleting_at IS NULL AND id NOT IN(SELECT file_id FROM current_banner_files))
      +(SELECT count(*) FROM upload_leases WHERE user_id=? AND purpose='banner')<3)
    AND (SELECT day_bytes FROM upload_guards WHERE user_id=?)+(SELECT COALESCE(sum(reserved_bytes),0) FROM upload_leases WHERE user_id=?)+?<=?`,
    lease,
    user.id,
    purpose,
    MAX_FILE_BYTES,
    user.id,
    user.id,
    user.id,
    user.id,
    purpose,
    user.id,
    user.id,
    user.id,
    user.id,
    MAX_FILE_BYTES,
    DAILY_BYTES,
  );
  if (!result.meta?.changes) rejectUpload(30);
  return { id: lease, purpose };
}
export async function finishUpload(env, user, lease, bytes = 0, invalid = false) {
  // Release and account together. Stored bytes and rejected streamed bytes both count.
  await env.DB.batch([
    env.DB.prepare(
      'UPDATE upload_guards SET day_bytes=day_bytes+? WHERE user_id=? AND EXISTS(SELECT 1 FROM upload_leases WHERE id=?)',
    ).bind(bytes, user.id, lease.id),
    env.DB.prepare('DELETE FROM upload_leases WHERE id=?').bind(lease.id),
  ]);
  if (invalid) {
    const result = await one(
      env,
      `UPDATE upload_guards SET
      invalid_count=(CASE WHEN invalid_start<=unixepoch()-600 THEN 1 ELSE invalid_count+1 END),
      invalid_start=(CASE WHEN invalid_start<=unixepoch()-600 THEN unixepoch() ELSE invalid_start END)
      WHERE user_id=? RETURNING invalid_count`,
      user.id,
    );
    if (result.invalid_count >= 5) await block(env, user.id);
  }
}
