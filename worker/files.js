import { one, rows, run, sql, fail, id, limit } from './utils.js';
import { canReadNote } from './data.js';
import { byteRange } from '../shared/byte-range.js';
import {
  MAX_FILE_BYTES,
  readLimited,
  safeFileName,
  validateFile,
  SAFE_MIMES,
} from './file-validation.js';
import { safeImage, IMAGE_SAFETY_POLICY } from './image-safety.js';
import { beginUpload, finishUpload } from './upload-guard.js';
import { drainFileDeletions, queueUnusedFiles } from './file-lifecycle.js';
const FILE_POLICY = 'lanet-file-v1';
const PDF_POLICY = 'lanet-pdf-v1';
const filePolicy = (mime) => (mime === 'application/pdf' ? PDF_POLICY : FILE_POLICY);
const imageName = (name) => name.slice(0, name.lastIndexOf('.')).slice(0, 140) + '.webp';
export async function upload(request, env, user, ctx) {
  await queueUnusedFiles(env);
  const lease = await beginUpload(request, env, user);
  const cleanup = drainFileDeletions(env).catch(() => {});
  if (ctx?.waitUntil) ctx.waitUntil(cleanup);
  else await cleanup;
  let received = 0;
  let invalid = false;
  try {
    if (Number(request.headers.get('Content-Length')) > MAX_FILE_BYTES)
      fail(413, 'El límit és de 25 MB per vídeo i 10 MB per als altres fitxers.');
    let name = safeFileName(request.headers.get('X-File-Name'));
    let bytes = await readLimited(request.body, MAX_FILE_BYTES, {
      timeoutMs: 60000,
      onBytes: (n) => {
        received = n;
      },
    });
    let { mime, image } = validateFile(bytes, name);
    if (image) {
      bytes = await safeImage(env, bytes, mime);
      mime = 'image/webp';
      name = imageName(name);
    }
    const size = bytes.length;
    const fid = id(),
      key = `${user.id}/${fid}`;
    await run(env, 'INSERT INTO unclaimed_uploads(object_key) VALUES(?)', key);
    try {
      await env.FILES.put(key, bytes, { httpMetadata: { contentType: mime } });
      await run(
        env,
        "INSERT INTO files(id,owner_id,name,mime,size,object_key,safety_state,safety_policy,safety_checked_at,upload_purpose,upload_expires_at) SELECT ?,?,?,?,?,?,?,?,?,?,unixepoch()+(CASE WHEN ?='banner' THEN 1800 ELSE 86400 END) WHERE EXISTS(SELECT 1 FROM upload_leases WHERE id=? AND expires>unixepoch())",
        fid,
        user.id,
        name,
        mime,
        size,
        key,
        image ? 'approved' : 'validated',
        image ? IMAGE_SAFETY_POLICY : filePolicy(mime),
        new Date().toISOString(),
        lease.purpose,
        lease.purpose,
        lease.id,
      );
      if (!(await one(env, 'SELECT id FROM files WHERE id=?', fid)))
        fail(408, 'La pujada ha caducat. Torna-ho a provar.');
      await run(env, 'DELETE FROM unclaimed_uploads WHERE object_key=?', key);
    } catch (error) {
      // The staging key remains durable if R2 is unavailable during rollback.
      try {
        if (!(await one(env, 'SELECT id FROM files WHERE object_key=?', key))) {
          await env.FILES.delete(key);
          await run(env, 'DELETE FROM unclaimed_uploads WHERE object_key=?', key);
        }
      } catch {
        /* Cleanup retries abandoned keys without losing the original error. */
      }
      throw error;
    }
    return { id: fid, name, mime, size, accessible: true, image_checked: image };
  } catch (error) {
    invalid = [400, 413].includes(error.status) || error.code === 'image_blocked';
    throw error;
  } finally {
    await finishUpload(env, user, lease, received, invalid);
  }
}

export async function ensureFileSafety(env, f) {
  if (f.deleting_at != null) fail(410, 'Aquesta imatge s’ha retirat i ja no està disponible.');
  const image = f.mime?.startsWith('image/');
  if (f.safety_state === 'blocked')
    fail(422, 'Aquest adjunt no es pot mostrar perquè no ha superat la comprovació de seguretat.');
  if (
    image &&
    f.safety_state === 'approved' &&
    f.safety_policy === IMAGE_SAFETY_POLICY &&
    f.mime === 'image/webp'
  )
    return f;
  if (
    !image &&
    f.safety_state === 'validated' &&
    f.safety_policy === filePolicy(f.mime) &&
    SAFE_MIMES.has(f.mime)
  )
    return f;
  // Never trust legacy metadata. Authorize before calling this function.
  let replacement;
  try {
    const original = await env.FILES.get(f.object_key);
    if (!original) fail(404, 'El fitxer no està disponible.');
    let bytes = await readLimited(
      original.body instanceof ReadableStream ? original.body : new Blob([original.body]).stream(),
    );
    const name = safeFileName(encodeURIComponent(f.name));
    const validated = validateFile(bytes, name);
    if (validated.mime !== f.mime || validated.image !== image)
      fail(400, 'El format de l’adjunt no és vàlid.');
    if (image) {
      bytes = await safeImage(env, bytes, f.mime);
      replacement = `${f.owner_id}/${id()}`;
      await env.FILES.put(replacement, bytes, { httpMetadata: { contentType: 'image/webp' } });
    }
    const result = await run(
      env,
      `UPDATE files SET name=?,mime=?,size=?,object_key=?,safety_state=?,safety_policy=?,safety_checked_at=?,original_object_key=? WHERE id=? AND object_key=? AND safety_state=? AND safety_policy IS ? AND deleting_at IS NULL`,
      image ? imageName(name) : name,
      image ? 'image/webp' : f.mime,
      bytes.length,
      replacement || f.object_key,
      image ? 'approved' : 'validated',
      image ? IMAGE_SAFETY_POLICY : filePolicy(f.mime),
      new Date().toISOString(),
      image ? f.original_object_key || f.object_key : null,
      f.id,
      f.object_key,
      f.safety_state,
      f.safety_policy ?? null,
    );
    if (!result.meta?.changes && replacement) {
      await env.FILES.delete(replacement);
      replacement = undefined;
    }
    const fresh = await one(env, 'SELECT * FROM files WHERE id=?', f.id);
    if (
      !fresh ||
      fresh.deleting_at != null ||
      (image
        ? !(
            fresh.mime === 'image/webp' &&
            fresh.safety_state === 'approved' &&
            fresh.safety_policy === IMAGE_SAFETY_POLICY
          )
        : !(fresh.safety_state === 'validated' && fresh.safety_policy === filePolicy(fresh.mime)))
    )
      fail(409, 'L’adjunt està canviant. Torna-ho a provar.');
    return fresh;
  } catch (e) {
    if (replacement) await env.FILES.delete(replacement);
    if ([400, 413].includes(e.status) || e.code === 'image_blocked')
      await run(
        env,
        "UPDATE files SET safety_state='blocked',safety_checked_at=? WHERE id=? AND object_key=?",
        new Date().toISOString(),
        f.id,
        f.object_key,
      );
    throw e;
  }
}
export async function fileStatements(env, user, list, column, target) {
  if (!Array.isArray(list) || list.length > 12) fail(400, 'Pots adjuntar fins a 12 fitxers.');
  if (!['note_id', 'plus_id', 'proposal_id'].includes(column)) fail(400, 'Destinació no vàlida.');
  for (const item of list) {
    const f = await one(
      env,
      'SELECT * FROM files WHERE id=?',
      typeof item === 'string' ? item : item.id,
    );
    if (
      !f ||
      f.deleting_at != null ||
      (f.owner_id !== user.id && !(user.role === 'admin' && f[column] === target)) ||
      (f.note_id && f.note_id !== target) ||
      (f.plus_id && f.plus_id !== target) ||
      (f.proposal_id && f.proposal_id !== target)
    )
      fail(403, 'Aquest fitxer no et pertany o ja està associat a un altre contingut.');
    if (await one(env, 'SELECT id FROM banners WHERE file_id=?', f.id))
      fail(
        400,
        'Aquesta imatge ja forma part d’un missatge públic. Puja una còpia per als apunts.',
      );
    await ensureFileSafety(env, f);
  }
  const current = await rows(env, `SELECT id FROM files WHERE ${column}=?`, target);
  const ids = list.map((f) => (typeof f === 'string' ? f : f.id));
  const batch = current
    .filter((f) => !ids.includes(f.id))
    .map((f) => sql(env, `UPDATE files SET ${column}=NULL WHERE id=?`, f.id));
  list.forEach((f, i) =>
    batch.push(
      sql(
        env,
        `UPDATE files SET ${column}=?,position=?,preview=? WHERE id=?`,
        target,
        i,
        f.preview ? 1 : 0,
        typeof f === 'string' ? f : f.id,
      ),
    ),
  );
  return batch;
}
export async function fileResponse(request, env, user, fid) {
  let f = await one(env, 'SELECT * FROM files WHERE id=?', fid);
  if (!f) fail(404, 'El fitxer no existeix.');
  if (f.deleting_at != null) fail(410, 'Aquesta imatge s’ha retirat i ja no està disponible.');
  let allowed = f.owner_id === user.id || user.role === 'admin';
  if (f.note_id) {
    const n = await one(env, 'SELECT * FROM notes WHERE id=?', f.note_id);
    allowed ||= (await canReadNote(env, user, n)) || (!!f.preview && n.status === 'published');
  }
  if (f.plus_id)
    allowed ||= !!(await one(
      env,
      "SELECT id FROM pluses WHERE id=? AND status='published'",
      f.plus_id,
    ));
  if (f.proposal_id)
    allowed ||= !!(await one(env, 'SELECT id FROM proposals WHERE id=?', f.proposal_id));
  const banner = await one(
    env,
    'SELECT anonymous FROM banners WHERE file_id=? AND file_id IN(SELECT file_id FROM current_banner_files) ORDER BY rowid DESC LIMIT 1',
    fid,
  );
  if (banner) allowed = true;
  if (!allowed) fail(403, 'Aquest fitxer és privat o cal desbloquejar els apunts.');
  if (
    f.safety_state === 'legacy' ||
    (f.mime === 'application/pdf' && f.safety_policy !== PDF_POLICY)
  )
    await limit(env, request, `legacy-file-check:${user.id}`, 30, 60, true);
  f = await ensureFileSafety(env, f);
  let range;
  try {
    range = byteRange(request.headers.get('Range'), f.size);
  } catch {
    return new Response(null, {
      status: 416,
      headers: {
        'Content-Range': `bytes */${f.size}`,
        'Accept-Ranges': 'bytes',
        'Cache-Control': 'private, no-store',
      },
    });
  }
  const object = await env.FILES.get(
    f.object_key,
    range ? { range: { offset: range.offset, length: range.length } } : undefined,
  );
  if (!object) fail(404, 'El fitxer no està disponible.');
  const inline =
    ['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'video/mp4', 'video/webm'].includes(
      f.mime,
    ) && !new URL(request.url).searchParams.has('download');
  const filename = banner?.anonymous
    ? `cartell.${{ 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp', 'image/gif': 'gif' }[f.mime] || 'img'}`
    : f.name;
  return new Response(object.body, {
    status: range ? 206 : 200,
    headers: {
      'Content-Type': SAFE_MIMES.has(f.mime) ? f.mime : 'application/octet-stream',
      'Content-Length': String(range?.length ?? f.size),
      'Accept-Ranges': 'bytes',
      ...(range ? { 'Content-Range': `bytes ${range.offset}-${range.end}/${f.size}` } : {}),
      'Content-Disposition': `${inline ? 'inline' : 'attachment'}; filename*=UTF-8''${encodeURIComponent(filename)}`,
      'Cache-Control': 'private, no-store',
      'X-Content-Type-Options': 'nosniff',
      'Cross-Origin-Resource-Policy': 'same-origin',
      'Referrer-Policy': 'no-referrer',
      'X-Frame-Options': 'SAMEORIGIN',
      'Content-Security-Policy':
        "sandbox; default-src 'none'; style-src 'unsafe-inline'; frame-ancestors 'self'",
    },
  });
}

export async function discardUpload(env, user, fid) {
  const file = await one(env, 'SELECT id FROM files WHERE id=? AND owner_id=?', fid, user.id);
  if (!file) return { ok: true };
  await run(
    env,
    `INSERT OR IGNORE INTO file_deletions(file_id,object_key,original_object_key)
    SELECT id,object_key,original_object_key FROM files WHERE id=? AND owner_id=?
    AND note_id IS NULL AND plus_id IS NULL AND proposal_id IS NULL
    AND id NOT IN(SELECT file_id FROM current_banner_files)`,
    fid,
    user.id,
  );
  if (!(await one(env, 'SELECT file_id FROM file_deletions WHERE file_id=?', fid)))
    fail(409, 'Aquest fitxer ja està publicat i no és un esborrany.');
  await drainFileDeletions(env);
  return { ok: true };
}
