import { body, one, rows, run, fail, str, hash, limit, integer, json } from './utils.js';
import { searchText } from '../shared/search.js';

const uuid = (value) => {
  if (typeof value !== 'string' || !/^[a-f\d]{8}-(?:[a-f\d]{4}-){3}[a-f\d]{12}$/i.test(value))
    fail(400, 'Identificador del missatge invàlid.');
  return value;
};
const text = (value, max) => {
  const v = str(value, max, true).normalize('NFC');
  if (/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(v))
    fail(400, 'El text conté caràcters no admesos.');
  return v;
};
const canonical = (v) => v.normalize('NFKC').trim().replace(/\s+/g, ' ');
export async function discussionRoom(env, user, roomId) {
  const room = await one(
    env,
    'SELECT o.*,g.name AS group_name FROM offerings o JOIN groups g ON g.id=o.group_id WHERE o.id=?',
    roomId,
  );
  if (
    !room ||
    !(
      user.role === 'admin' ||
      (user.role === 'delegate' && user.group_id === room.group_id) ||
      (await one(
        env,
        'SELECT user_id FROM enrollments WHERE user_id=? AND offering_id=?',
        user.id,
        roomId,
      ))
    )
  )
    fail(403, 'Aquest espai no correspon a les teves assignatures.');
  return room;
}
const manager = (user, room) =>
  user.role === 'admin' || (user.role === 'delegate' && user.group_id === room.group_id);
async function threadFor(env, user, id) {
  const thread = await one(
    env,
    'SELECT t.*,u.name AS author,n.title AS note_title FROM subject_threads t JOIN users u ON u.id=t.author_id LEFT JOIN notes n ON n.id=t.note_id WHERE t.id=?',
    id,
  );
  if (!thread || thread.deleted) fail(404, 'Aquest dubte ja no està disponible.');
  const room = await discussionRoom(env, user, thread.offering_id);
  return { thread, room };
}
function publicThread(t, user, room) {
  const { request_hash: _hash, search_text: _search, ...value } = t;
  return { ...value, can_manage: t.author_id === user.id || manager(user, room) };
}
async function insert(env, table, query, args, requestId, user, requestHash) {
  try {
    await run(env, query, ...args);
  } catch (e) {
    if (String(e.message).includes('discussion_duplicate'))
      fail(409, 'Ja has enviat aquest missatge fa poc. Revisa el fil.');
    throw e;
  }
  const saved = await one(
    env,
    `SELECT id,author_id,request_hash FROM ${table} WHERE id=?`,
    requestId,
  );
  if (!saved || saved.author_id !== user.id || saved.request_hash !== requestHash)
    fail(409, 'Aquest enviament ja existeix amb un altre contingut.');
  return json({ id: requestId }, 201);
}
export async function discussionsRoute(request, env, user, path) {
  const url = new URL(request.url),
    parts = path.split('/').slice(3),
    threadId = parts[0],
    action = parts[1];
  if (path === '/api/discussions/rooms' && request.method === 'GET') {
    const subject = str(url.searchParams.get('subject'), 60, true);
    return json({
      rooms: await rows(
        env,
        `SELECT o.id,o.subject_id,o.variant,o.teacher,o.group_id,g.name AS group_name FROM offerings o JOIN groups g ON g.id=o.group_id WHERE o.subject_id=? AND (?='admin' OR (?='delegate' AND o.group_id=?) OR EXISTS(SELECT 1 FROM enrollments e WHERE e.user_id=? AND e.offering_id=o.id)) ORDER BY g.name,o.variant,o.teacher`,
        subject,
        user.role,
        user.role,
        user.group_id,
        user.id,
      ),
    });
  }
  if (!threadId && request.method === 'GET') {
    const room = await discussionRoom(env, user, str(url.searchParams.get('room'), 100, true));
    const before = url.searchParams.get('before'),
      cursor = before ? integer(before, 1, Number.MAX_SAFE_INTEGER) : Number.MAX_SAFE_INTEGER;
    const terms = searchText(str(url.searchParams.get('q'), 100))
      .split(' ')
      .filter(Boolean)
      .slice(0, 8);
    const state = url.searchParams.get('state') || 'all';
    if (!['all', 'open', 'resolved'].includes(state)) fail(400, 'Filtre de dubtes invàlid.');
    const searchSql = terms.map(() => " AND t.search_text LIKE ? ESCAPE '\\'").join('');
    const patterns = terms.map((t) => '%' + t.replace(/[\\%_]/g, '\\$&') + '%');
    const items = await rows(
      env,
      `SELECT t.rowid AS sequence,t.id,t.offering_id,t.author_id,t.title,t.body,t.note_id,t.resolved,t.created_at,u.name AS author,n.title AS note_title,(SELECT COUNT(*) FROM subject_replies r WHERE r.thread_id=t.id AND r.deleted=0) AS replies FROM subject_threads t JOIN users u ON u.id=t.author_id LEFT JOIN notes n ON n.id=t.note_id WHERE t.offering_id=? AND t.deleted=0 AND t.rowid<? AND (?='all' OR t.resolved=?) ${searchSql} ORDER BY t.rowid DESC LIMIT 31`,
      room.id,
      cursor,
      state,
      Number(state === 'resolved'),
      ...patterns,
    );
    return json({
      items: items.slice(0, 30).map((t) => publicThread(t, user, room)),
      next: items.length > 30 ? items[29].sequence : null,
    });
  }
  if (!threadId && request.method === 'POST') {
    const b = await body(request),
      room = await discussionRoom(env, user, str(b.offering_id, 100, true));
    const requestId = uuid(b.id),
      title = text(b.title, 120),
      content = text(b.body, 4000),
      noteId = b.note_id ? str(b.note_id, 100, true) : null;
    const linked = noteId
      ? await one(
          env,
          "SELECT id,title FROM notes WHERE id=? AND subject_id=? AND status='published'",
          noteId,
          room.subject_id,
        )
      : null;
    if (noteId && !linked) fail(400, 'Tria un material publicat d’aquesta assignatura.');
    const requestHash = await hash(
      JSON.stringify([room.id, canonical(title), canonical(content), noteId]),
    );
    const previous = await one(
      env,
      'SELECT author_id,request_hash FROM subject_threads WHERE id=?',
      requestId,
    );
    if (previous) {
      if (previous.author_id !== user.id || previous.request_hash !== requestHash)
        fail(409, 'L’enviament existent té un altre contingut.');
      return json({ id: requestId });
    }
    await limit(env, request, `discussion-thread:${user.id}`, 6, 60, true);
    await limit(env, request, `discussion-thread-hour:${user.id}`, 30, 3600, true);
    return insert(
      env,
      'subject_threads',
      'INSERT OR IGNORE INTO subject_threads(id,offering_id,author_id,title,body,note_id,request_hash,search_text) VALUES(?,?,?,?,?,?,?,?)',
      [
        requestId,
        room.id,
        user.id,
        title,
        content,
        noteId,
        requestHash,
        searchText([title, content, linked?.title, user.name].join(' ')),
      ],
      requestId,
      user,
      requestHash,
    );
  }
  const { thread, room } = await threadFor(env, user, threadId);
  if (!action && request.method === 'GET') {
    const cursor = url.searchParams.has('before')
      ? integer(url.searchParams.get('before'), 1, Number.MAX_SAFE_INTEGER)
      : Number.MAX_SAFE_INTEGER;
    const replies = await rows(
      env,
      'SELECT r.rowid AS sequence,r.id,r.author_id,r.body,r.deleted,r.created_at,u.name AS author FROM subject_replies r JOIN users u ON u.id=r.author_id WHERE r.thread_id=? AND r.rowid<? ORDER BY r.rowid DESC LIMIT 51',
      thread.id,
      cursor,
    );
    return json({
      thread: publicThread(thread, user, room),
      room,
      replies: replies
        .slice(0, 50)
        .reverse()
        .map((r) => ({ ...r, can_manage: r.author_id === user.id || manager(user, room) })),
      next: replies.length > 50 ? replies[49].sequence : null,
    });
  }
  if (action === 'reply' && request.method === 'POST') {
    const b = await body(request),
      requestId = uuid(b.id),
      content = text(b.body, 4000),
      requestHash = await hash(JSON.stringify([thread.id, canonical(content)]));
    const previous = await one(
      env,
      'SELECT author_id,request_hash FROM subject_replies WHERE id=?',
      requestId,
    );
    if (previous) {
      if (previous.author_id !== user.id || previous.request_hash !== requestHash)
        fail(409, 'L’enviament existent té un altre contingut.');
      return json({ id: requestId });
    }
    if (thread.resolved) fail(409, 'El dubte està resolt. El seu autor el pot reobrir.');
    await limit(env, request, `discussion-reply:${user.id}`, 15, 60, true);
    await limit(env, request, `discussion-reply-hour:${user.id}`, 100, 3600, true);
    return insert(
      env,
      'subject_replies',
      'INSERT OR IGNORE INTO subject_replies(id,thread_id,author_id,body,request_hash) SELECT ?,?,?,?,? WHERE EXISTS(SELECT 1 FROM subject_threads WHERE id=? AND resolved=0 AND deleted=0)',
      [requestId, thread.id, user.id, content, requestHash, thread.id],
      requestId,
      user,
      requestHash,
    );
  }
  if (action === 'report' && request.method === 'POST') {
    const b = await body(request);
    await limit(env, request, `discussion-report:${user.id}`, 5, 60, true);
    await limit(env, request, `discussion-report-day:${user.id}`, 20, 86400, true);
    await run(
      env,
      "INSERT INTO reports(id,user_id,type,target_id,reason) SELECT ?,?,'discussion',?,? WHERE NOT EXISTS(SELECT 1 FROM reports WHERE user_id=? AND type='discussion' AND target_id=? AND resolved=0)",
      crypto.randomUUID(),
      user.id,
      thread.id,
      text(b.reason, 1000),
      user.id,
      thread.id,
    );
    return json({ ok: true });
  }
  if (action === 'resolve' && request.method === 'POST') {
    if (thread.author_id !== user.id && !manager(user, room))
      fail(403, 'Només l’autor o el delegat pot resoldre el dubte.');
    const b = await body(request);
    if (typeof b.resolved !== 'boolean') fail(400, 'Indica si està resolt.');
    await run(
      env,
      'UPDATE subject_threads SET resolved=? WHERE id=?',
      Number(b.resolved),
      thread.id,
    );
    return json({ ok: true });
  }
  if (request.method === 'DELETE') {
    const replyId = action === 'reply' ? parts[2] : null;
    const target = replyId
      ? await one(
          env,
          'SELECT author_id FROM subject_replies WHERE id=? AND thread_id=?',
          replyId,
          thread.id,
        )
      : thread;
    if (!target) fail(404, 'El missatge no existeix.');
    if (target.author_id !== user.id && !manager(user, room))
      fail(403, 'No pots retirar aquest missatge.');
    if (replyId) await run(env, "UPDATE subject_replies SET deleted=1,body='' WHERE id=?", replyId);
    else if (!action)
      await run(
        env,
        "UPDATE subject_threads SET deleted=1,title='Dubte retirat',body='',search_text='' WHERE id=?",
        thread.id,
      );
    else fail(404, 'Acció no disponible.');
    return json({ ok: true });
  }
  fail(405, 'Mètode no disponible.');
}
