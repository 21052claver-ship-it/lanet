import { assessmentInput } from './assessment-input.js';
import {
  rows,
  one,
  sql,
  run,
  fail,
  id,
  str,
  num,
  integer,
  choice,
  day,
  time,
  requireManager,
  requireAdmin,
  body,
} from './utils.js';
export async function adminRoute(request, env, user, path) {
  if (!path.startsWith('/api/admin')) return null;
  requireManager(user);
  if (path === '/api/admin' && request.method === 'GET') {
    const admin = user.role === 'admin';
    return {
      users: admin
        ? await rows(
            env,
            'SELECT id,name,email,role,group_id,disabled,balance FROM users ORDER BY name',
          )
        : [],
      reports: await rows(
        env,
        `SELECT r.*,u.name AS author FROM reports r JOIN users u ON u.id=r.user_id WHERE resolved=0 AND (r.type!='discussion' OR ?='admin' OR EXISTS(SELECT 1 FROM subject_threads t JOIN offerings o ON o.id=t.offering_id WHERE t.id=r.target_id AND o.group_id=?)) ORDER BY r.created_at DESC`,
        user.role,
        user.group_id,
      ),
    };
  }
  const b = await body(request);
  if (path === '/api/admin/invitations' || path === '/api/admin/recovery')
    fail(403, 'Els comptes accedeixen amb Google; no s’utilitzen codis ni contrasenyes de La Net.');
  if (path === '/api/admin/users') {
    requireAdmin(user);
    if (b.user_id === user.id) fail(400, 'No pots desactivar ni canviar el teu propi rol.');
    const target = await one(env, 'SELECT * FROM users WHERE id=?', b.user_id);
    if (!target) fail(404, 'Aquest compte no existeix.');
    const role = choice(b.role || target.role, ['student', 'delegate', 'admin']);
    await env.DB.batch([
      sql(
        env,
        'UPDATE users SET role=?,disabled=? WHERE id=?',
        role,
        b.disabled ? 1 : 0,
        b.user_id,
      ),
      sql(env, 'DELETE FROM sessions WHERE user_id=?', b.user_id),
    ]);
    return { ok: true };
  }
  if (path === '/api/admin/settings') {
    requireAdmin(user);
    await run(
      env,
      "INSERT INTO settings(key,value) VALUES('school_name',?) ON CONFLICT(key) DO UPDATE SET value=excluded.value",
      str(b.school_name, 100, true),
    );
    return { ok: true };
  }
  if (path === '/api/admin/groups') {
    requireAdmin(user);
    const key = b.id || id();
    await run(
      env,
      'INSERT INTO groups(id,name) VALUES(?,?) ON CONFLICT(id) DO UPDATE SET name=excluded.name',
      key,
      str(b.name, 100, true),
    );
    return { id: key };
  }
  if (path === '/api/admin/subjects') {
    requireAdmin(user);
    const key = b.id || id();
    const color = /^#[0-9a-fA-F]{6}$/.test(b.color) ? b.color : '#DCE8F4';
    await run(
      env,
      'INSERT INTO subjects(id,name,short,color,path) VALUES(?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET name=excluded.name,short=excluded.short,color=excluded.color,path=excluded.path',
      key,
      str(b.name, 100, true),
      str(b.short, 40, true),
      color,
      choice(b.path, ['common', 'science', 'social', 'humanities']),
    );
    return { id: key };
  }
  if (path === '/api/admin/offerings') {
    if (user.role !== 'admin' && b.group_id !== user.group_id)
      fail(403, 'Només pots editar variants del teu grup.');
    const current = b.id ? await one(env, 'SELECT * FROM offerings WHERE id=?', b.id) : null;
    if (current && user.role !== 'admin' && current.group_id !== user.group_id)
      fail(403, 'Aquesta variant és d’un altre grup.');
    const key = b.id || id();
    if (!Array.isArray(b.slots) || !b.slots.length || b.slots.length > 12)
      fail(400, 'Indica les franges de classe.');
    const previousSlots = current
      ? await rows(env, 'SELECT * FROM slots WHERE offering_id=?', key)
      : [];
    // Older forms omit per-slot metadata. Inherit only from this offering;
    // null follows its general teacher, while an empty teacher means personal work.
    const slots = b.slots.map((s) => {
      if (!s || typeof s !== 'object' || Array.isArray(s))
        fail(400, 'Revisa les dades de la franja.');
      if (s.teacher !== undefined && s.teacher !== null && typeof s.teacher !== 'string')
        fail(400, 'Indica un nom de professor vàlid.');
      if (s.note !== undefined && typeof s.note !== 'string')
        fail(400, 'La indicació de la franja ha de ser text.');
      const previous =
        previousSlots.find((p) => p.id === s.id) ||
        previousSlots.find((p) => p.day === s.day && p.start === s.start && p.end === s.end);
      let teacher =
        s.teacher === undefined
          ? (previous?.teacher ?? null)
          : s.teacher === null
            ? null
            : str(s.teacher, 100);
      if (s.teacher_mode !== undefined) {
        const mode = choice(s.teacher_mode, ['general', 'custom', 'personal']);
        teacher = mode === 'general' ? null : mode === 'personal' ? '' : str(s.teacher, 100, true);
      }
      return {
        id: previous?.id || id(),
        day: integer(s.day, 0, 6),
        start: time(s.start),
        end: time(s.end),
        room: str(s.room, 80),
        teacher,
        note:
          (s.note === undefined ? previous?.note || '' : str(s.note, 200)) ||
          (teacher === '' ? 'Treball personal' : ''),
      };
    });
    if (slots.some((s) => !s.start || !s.end || s.end <= s.start))
      fail(400, 'Revisa les hores de classe.');
    if (
      new Set(slots.map((s) => s.id)).size !== slots.length ||
      slots.some((s, i) =>
        slots
          .slice(i + 1)
          .some((other) => s.day === other.day && s.start < other.end && other.start < s.end),
      )
    )
      fail(400, 'Les franges de la mateixa assignatura no es poden solapar.');
    await env.DB.batch([
      sql(
        env,
        'INSERT INTO offerings(id,subject_id,group_id,teacher,variant,path) VALUES(?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET subject_id=excluded.subject_id,group_id=excluded.group_id,teacher=excluded.teacher,variant=excluded.variant,path=excluded.path',
        key,
        b.subject_id,
        b.group_id,
        str(b.teacher, 100, true),
        str(b.variant, 100),
        choice(b.path, ['common', 'science', 'social', 'humanities']),
      ),
      sql(env, 'DELETE FROM slots WHERE offering_id=?', key),
      ...slots.map((s) =>
        sql(
          env,
          'INSERT INTO slots(id,offering_id,day,start,end,room,teacher,note) VALUES(?,?,?,?,?,?,?,?)',
          s.id,
          key,
          s.day,
          s.start,
          s.end,
          s.room,
          s.teacher,
          s.note,
        ),
      ),
    ]);
    return { id: key };
  }
  if (path === '/api/admin/templates') {
    const o = await one(env, 'SELECT * FROM offerings WHERE id=?', b.offering_id);
    if (!o || (user.role !== 'admin' && o.group_id !== user.group_id))
      fail(403, 'Aquesta variant no et correspon.');
    const term = integer(b.term, 1, 3);
    if (!Array.isArray(b.entries) || !b.entries.length || b.entries.length > 200)
      fail(400, 'Afegeix les proves del trimestre.');
    const entries = b.entries.map((e, i) => ({
      id: e.id || `${o.id}-${term}-${i}`,
      title: str(e.title, 100, true),
      ...assessmentInput(e),
      weight: num(e.weight, 0, 100),
      date: e.date ? day(e.date) : null,
      position: i,
    }));
    if (Math.abs(entries.reduce((s, e) => s + e.weight, 0) - 100) > 0.001)
      fail(400, 'Els pesos han de sumar el 100%.');
    await env.DB.batch([
      sql(env, 'DELETE FROM templates WHERE offering_id=? AND term=?', o.id, term),
      ...entries.map((e) =>
        sql(
          env,
          'INSERT INTO templates(id,offering_id,term,category,title,date,weight,position,assessment_type) VALUES(?,?,?,?,?,?,?,?,?)',
          e.id,
          o.id,
          term,
          e.category,
          e.title,
          e.date,
          e.weight,
          e.position,
          e.assessment_type,
        ),
      ),
    ]);
    return { ok: true };
  }
  if (path === '/api/admin/reports') {
    const report = await one(env, 'SELECT * FROM reports WHERE id=?', b.id);
    if (report?.type === 'discussion' && user.role !== 'admin') {
      const room = await one(env, 'SELECT o.group_id FROM subject_threads t JOIN offerings o ON o.id=t.offering_id WHERE t.id=?', report.target_id);
      if (!room || room.group_id !== user.group_id) fail(403, 'Aquest informe correspon a un altre grup.');
    }
    await run(env, 'UPDATE reports SET resolved=1 WHERE id=?', b.id);
    return { ok: true };
  }
  fail(404, 'L’acció de gestió no existeix.');
}
