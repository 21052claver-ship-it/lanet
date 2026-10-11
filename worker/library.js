import { rows, one, sql, fail, id, requireManager, privileged, body, json } from './utils.js';
import { validateLibrary, LibraryError } from '../shared/content-library.js';
import { CONTENT_REFERENCES } from '../shared/content-catalogue.js';
function revision(value) {
  if (!Number.isSafeInteger(value) || value < 1) fail(400, 'Falta una revisió vàlida.');
  return value;
}
export async function libraryRoute(request, env, user, path) {
  const match = path.match(/^\/api\/library(?:\/([a-z0-9-]+))?(?:\/(review))?$/i);
  if (!match) return null;
  const [, rid, review] = match;
  const manager = privileged(user);
  if (request.method === 'GET' && !rid) {
    const records = user.group_id
      ? await rows(
          env,
          `SELECT c.*,u.name AS reviewer FROM content_library c LEFT JOIN users u ON u.id=c.reviewed_by WHERE c.group_id=? ${manager ? '' : 'AND c.published IS NOT NULL'} ORDER BY c.updated_at DESC,c.id`,
          user.group_id,
        )
      : [];
    const items = records
      .filter((r) => r.published)
      .map((r) => ({
        ...JSON.parse(r.published),
        id: r.id,
        origin: 'reviewed',
        reviewer: r.reviewer,
        reviewed_at: r.reviewed_at,
      }));
    const editorial = manager
      ? records.map((r) => ({
          id: r.id,
          value: JSON.parse(r.draft),
          published: r.published ? JSON.parse(r.published) : null,
          state: r.state,
          revision: r.revision,
          updated_at: r.updated_at,
          reviewer: r.reviewer,
          reviewed_at: r.reviewed_at,
        }))
      : [];
    const history =
      manager && user.group_id
        ? await rows(
            env,
            'SELECT h.entry_id,h.revision,h.action,h.created_at,u.name AS actor FROM content_library_history h JOIN content_library c ON c.id=h.entry_id JOIN users u ON u.id=h.actor_id WHERE c.group_id=? ORDER BY h.created_at DESC,h.revision DESC LIMIT 200',
            user.group_id,
          )
        : [];
    return json({ items: [...items, ...CONTENT_REFERENCES], editorial, history, manager });
  }
  requireManager(user);
  if (!user.group_id) fail(400, 'Configura el teu grup abans de gestionar la biblioteca.');
  if (
    (!rid && request.method !== 'POST') ||
    (rid && !review && request.method !== 'PUT') ||
    (review && request.method !== 'POST')
  )
    fail(405, 'Mètode no vàlid.');
  const b = await body(request);
  if (
    Object.keys(b).some(
      (k) => !(review ? ['revision', 'decision'] : ['revision', 'value', 'action']).includes(k),
    )
  )
    fail(400, 'La petició conté camps no admesos.');
  const record = rid
    ? await one(env, 'SELECT * FROM content_library WHERE id=? AND group_id=?', rid, user.group_id)
    : null;
  if (rid && !record) fail(404, 'Aquest recurs no està disponible al teu grup.');
  if (record && revision(b.revision) !== record.revision)
    fail(
      409,
      'Algú ha canviat el recurs. Tanca i torna a obrir l’editor per carregar l’última versió.',
    );
  const operation = id(),
    entryId = rid || id();
  let action, statements;
  if (review) {
    action = b.decision;
    if (!['approve', 'return', 'withdraw'].includes(action))
      fail(400, 'Tria una decisió de revisió.');
    if ((action === 'approve' || action === 'return') && record.state !== 'pending')
      fail(409, 'Només es poden revisar versions pendents.');
    if (action === 'withdraw' && !record.published) fail(409, 'Aquest recurs no està publicat.');
    const change =
      action === 'approve'
        ? "published=draft,state='published',reviewed_by=?,reviewed_at=strftime('%Y-%m-%dT%H:%M:%fZ','now'),"
        : action === 'withdraw'
          ? "published=NULL,state='draft',reviewed_by=NULL,reviewed_at=NULL,"
          : "state='draft',";
    const args = action === 'approve' ? [user.id] : [];
    statements = [
      sql(
        env,
        `UPDATE content_library SET ${change} revision=revision+1,updated_by=?,updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now'),last_operation=? WHERE id=? AND revision=?`,
        ...args,
        user.id,
        operation,
        entryId,
        record.revision,
      ),
    ];
  } else {
    if (!['draft', 'submit'].includes(b.action)) fail(400, 'Desa l’esborrany o envia’l a revisió.');
    let value;
    try {
      value = validateLibrary(
        b.value,
        (await rows(env, 'SELECT id FROM subjects')).map((s) => s.id),
      );
    } catch (e) {
      if (e instanceof LibraryError) fail(400, e.message);
      throw e;
    }
    if (record && value.kind !== JSON.parse(record.draft).kind)
      fail(400, 'No es pot canviar el tipus d’un recurs.');
    const state = b.action === 'submit' ? 'pending' : 'draft';
    action = record ? (b.action === 'submit' ? 'submit' : 'draft') : 'create';
    statements = [
      record
        ? sql(
            env,
            "UPDATE content_library SET draft=?,state=?,revision=revision+1,updated_by=?,updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now'),last_operation=? WHERE id=? AND revision=?",
            JSON.stringify(value),
            state,
            user.id,
            operation,
            entryId,
            record.revision,
          )
        : sql(
            env,
            'INSERT INTO content_library(id,group_id,draft,state,created_by,updated_by,last_operation) VALUES(?,?,?,?,?,?,?)',
            entryId,
            user.group_id,
            JSON.stringify(value),
            state,
            user.id,
            user.id,
            operation,
          ),
    ];
  }
  statements.push(
    sql(
      env,
      'INSERT INTO content_library_history(id,entry_id,revision,actor_id,action) SELECT ?,id,revision,?,? FROM content_library WHERE id=? AND last_operation=?',
      id(),
      user.id,
      action,
      entryId,
      operation,
    ),
  );
  const result = await env.DB.batch(statements);
  if (!result[0].meta.changes) fail(409, 'El recurs ha canviat. Torna a carregar l’última versió.');
  return json({ ok: true, id: entryId, revision: record ? record.revision + 1 : 1 });
}
