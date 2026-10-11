import { rows, run, one } from './utils.js';

// Marking and unlinking happen inside D1 before any R2 operation. A failed
// delete cannot make the old image readable or attachable again.
export async function queueUnusedFiles(env) {
  await run(
    env,
    `INSERT OR IGNORE INTO file_deletions(file_id,object_key,original_object_key)
    SELECT f.id,f.object_key,f.original_object_key FROM files f
    WHERE f.deleting_at IS NULL AND f.note_id IS NULL AND f.plus_id IS NULL AND f.proposal_id IS NULL
    AND f.id NOT IN(SELECT file_id FROM current_banner_files)
    AND (EXISTS(SELECT 1 FROM banners WHERE file_id=f.id)
      OR f.upload_expires_at<=unixepoch())`,
  );
}

export async function drainFileDeletions(env, maximum = 12) {
  const pending = await rows(
    env,
    'SELECT * FROM file_deletions WHERE retry_at<=unixepoch() ORDER BY queued_at,file_id LIMIT ?',
    maximum,
  );
  let deleted = 0;
  for (const file of pending) {
    try {
      await env.FILES.delete(file.object_key);
      if (file.original_object_key && file.original_object_key !== file.object_key)
        await env.FILES.delete(file.original_object_key);
      await env.DB.batch([
        env.DB.prepare('DELETE FROM file_deletions WHERE file_id=?').bind(file.file_id),
        env.DB.prepare('DELETE FROM files WHERE id=? AND deleting_at IS NOT NULL').bind(
          file.file_id,
        ),
      ]);
      deleted++;
    } catch {
      // Only keys and counts are retained, never a copy of image bytes.
      await run(
        env,
        'UPDATE file_deletions SET attempts=attempts+1,retry_at=unixepoch()+MIN(3600,30*(1 << MIN(attempts,6))) WHERE file_id=?',
        file.file_id,
      );
    }
  }
  // A worker can stop after R2.put but before the metadata commit. Record the
  // key before writing bytes, and remove only abandoned, unreferenced keys.
  await run(env, 'DELETE FROM unclaimed_uploads WHERE object_key IN(SELECT object_key FROM files)');
  const abandoned = await rows(
    env,
    'SELECT object_key FROM unclaimed_uploads WHERE created_at<unixepoch()-300 LIMIT ?',
    maximum,
  );
  for (const file of abandoned) {
    try {
      await env.FILES.delete(file.object_key);
      await run(env, 'DELETE FROM unclaimed_uploads WHERE object_key=?', file.object_key);
    } catch {
      /* Keep the durable key for the next cleanup. */
    }
  }
  return { deleted, remaining: (await one(env, 'SELECT count(*) n FROM file_deletions')).n };
}
