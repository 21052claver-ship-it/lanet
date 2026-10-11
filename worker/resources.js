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
  author,
  privileged,
  requireManager,
  body,
} from './utils.js';
import { madridDay, safeLink } from '../shared/domain.js';
import { canReadNote, noteFiles } from './data.js';
import { fileStatements } from './files.js';
import { bonusMaximum, bonusLabel } from '../shared/course-grades.js';
export async function resourceRoute(request, env, user, path) {
  const match = path.match(
    /^\/api\/(notes|pluses|events|proposals|announcements)(?:\/([^/]+))?(?:\/(like|save|consult|unlock|vote|calendar|progress))?$/,
  );
  if (!match) return null;
  const [, resource, rid, action] = match;
  const table = {
    notes: 'notes',
    pluses: 'pluses',
    events: 'events',
    proposals: 'proposals',
    announcements: 'announcements',
  }[resource];
  const record = rid ? await one(env, `SELECT * FROM ${table} WHERE id=?`, rid) : null;
  if (rid && !record) fail(404, 'Aquest contingut ja no està disponible.');
  if (action) {
    if (request.method !== 'POST') fail(405, 'Mètode no vàlid.');
    if (action === 'progress' && resource === 'events') {
      const visible =
        record.visibility === 'private'
          ? record.owner_id === user.id
          : (!record.group_id || record.group_id === user.group_id) &&
            (!record.offering_id ||
              !!(await one(
                env,
                'SELECT user_id FROM enrollments WHERE user_id=? AND offering_id=?',
                user.id,
                record.offering_id,
              )));
      if (!visible) fail(403, 'Aquesta tasca no et correspon.');
      if ((record.display_kind || record.kind) !== 'task')
        fail(400, 'Només es poden completar tasques.');
      const b = await body(request);
      if (typeof b.done !== 'boolean') fail(400, 'Indica si la tasca està feta.');
      await run(
        env,
        'INSERT INTO event_progress(user_id,event_id,done) VALUES(?,?,?) ON CONFLICT(user_id,event_id) DO UPDATE SET done=excluded.done',
        user.id,
        rid,
        b.done,
      );
      return { ok: true };
    }
    if (resource === 'notes' && record.status === 'draft' && record.author_id !== user.id)
      fail(403, 'Aquest esborrany és privat.');
    if (['like', 'save'].includes(action)) {
      if (!['notes', 'pluses'].includes(resource) || record.status !== 'published')
        fail(400, 'Aquest contingut no es pot valorar.');
      const type = resource === 'notes' ? 'note' : 'plus';
      const b = await body(request);
      const active = b.active ? 1 : 0;
      if (action === 'save') {
        if (active)
          await run(
            env,
            'INSERT OR IGNORE INTO saves(user_id,type,target_id) VALUES(?,?,?)',
            user.id,
            type,
            rid,
          );
        else
          await run(
            env,
            'DELETE FROM saves WHERE user_id=? AND type=? AND target_id=?',
            user.id,
            type,
            rid,
          );
      } else
        await env.DB.batch([
          sql(
            env,
            'INSERT INTO likes(user_id,type,target_id,active) VALUES(?,?,?,?) ON CONFLICT(user_id,type,target_id) DO UPDATE SET active=excluded.active',
            user.id,
            type,
            rid,
            active,
          ),
          sql(
            env,
            'INSERT OR IGNORE INTO contribution_rewards(id,author_id,day,reason) SELECT ?,?,?,? WHERE ?!=? AND EXISTS(SELECT 1 FROM likes WHERE user_id=? AND type=? AND target_id=? AND active=1)',
            `like:${type}:${rid}:${user.id}`,
            record.author_id,
            madridDay(),
            resource === 'notes' ? 'Apunts: agraïment rebut' : 'Plus: agraïment rebut',
            user.id,
            record.author_id,
            user.id,
            type,
            rid,
          ),
        ]);
      return { ok: true };
    }
    if (action === 'unlock' && resource === 'notes') {
      if (record.author_id === user.id || record.price === 0) return { ok: true };
      const b = await body(request);
      if (Number(b.price) !== record.price)
        fail(409, 'El preu ha canviat. Revisa’l abans de comprar.');
      await run(
        env,
        'INSERT OR IGNORE INTO unlocks(user_id,note_id,price,day) VALUES(?,?,?,?)',
        user.id,
        rid,
        record.price,
        madridDay(),
      );
      return { ok: true };
    }
    if (action === 'consult' && resource === 'notes') {
      if (!(await canReadNote(env, user, record)))
        fail(403, 'Primer has de desbloquejar els apunts.');
      if (user.id === record.author_id || record.status !== 'published') return { ok: true };
      const reading = await one(
        env,
        'SELECT started FROM reading_sessions WHERE user_id=? AND note_id=?',
        user.id,
        rid,
      );
      if (!reading || Date.now() - reading.started < 10000)
        fail(400, 'La consulta compta després de llegir els apunts durant uns segons.');
      await env.DB.batch([
        sql(
          env,
          'INSERT OR IGNORE INTO consultations(user_id,note_id,day) VALUES(?,?,?)',
          user.id,
          rid,
          madridDay(),
        ),
        sql(
          env,
          `INSERT OR IGNORE INTO contribution_rewards(id,author_id,day,reason) SELECT 'views:'||?||':'||CAST(COUNT(*)/5 AS INTEGER),?,?, 'Apunts: 5 consultes úniques' FROM consultations WHERE note_id=? HAVING COUNT(*)>=5`,
          rid,
          record.author_id,
          madridDay(),
          rid,
        ),
      ]);
      return { ok: true };
    }
    if (action === 'vote' && resource === 'proposals') {
      const b = await body(request);
      if (b.active)
        await run(
          env,
          'INSERT OR IGNORE INTO votes(user_id,proposal_id) VALUES(?,?)',
          user.id,
          rid,
        );
      else await run(env, 'DELETE FROM votes WHERE user_id=? AND proposal_id=?', user.id, rid);
      return { ok: true };
    }
    if (action === 'calendar' && resource === 'pluses') {
      await run(
        env,
        `INSERT OR IGNORE INTO events(id,owner_id,title,kind,date,start,end,room,body,visibility,source_key) VALUES(?,?,?,'event',?,?,?,?,?,'private',?)`,
        id(),
        user.id,
        record.title,
        record.date,
        record.start,
        record.end,
        record.place,
        record.body,
        `plus:${rid}:${user.id}`,
      );
      return { ok: true };
    }
    fail(404, 'Aquesta acció no existeix.');
  }
  if (request.method === 'GET') {
    if (resource === 'notes' && record) {
      const unlocked = await canReadNote(env, user, record);
      if (record.status !== 'published' && !unlocked)
        fail(403, 'Aquests apunts no estan disponibles.');
      if (unlocked)
        await run(
          env,
          'INSERT INTO reading_sessions(user_id,note_id,started) VALUES(?,?,?) ON CONFLICT(user_id,note_id) DO UPDATE SET started=excluded.started',
          user.id,
          rid,
          Date.now(),
        );
      return {
        ...record,
        body: unlocked ? record.body : '',
        unlocked,
        files: await noteFiles(env, user, record, unlocked),
      };
    }
    fail(404, 'Consulta aquesta informació des de la plataforma.');
  }
  if (request.method === 'DELETE') {
    if (resource === 'events') {
      if (
        record.owner_id !== user.id &&
        !(
          privileged(user) &&
          record.visibility === 'shared' &&
          (user.role === 'admin' || record.group_id === user.group_id)
        )
      )
        fail(403, 'No pots eliminar aquest esdeveniment.');
    } else if (resource === 'announcements') {
      requireManager(user);
      if (user.role !== 'admin' && record.group_id && record.group_id !== user.group_id)
        fail(403, 'Aquest avís és d’un altre grup.');
    } else author(user, record);
    if (resource === 'notes' || resource === 'pluses')
      await run(env, `UPDATE ${table} SET status='archived' WHERE id=?`, rid);
    else await run(env, `DELETE FROM ${table} WHERE id=?`, rid);
    return { ok: true };
  }
  const b = await body(request),
    key = rid || id();
  if (resource === 'notes') {
    if (record) author(user, record);
    const price = integer(b.price ?? 0, 0, 10000);
    if (
      record &&
      price !== record.price &&
      (await one(env, 'SELECT user_id FROM unlocks WHERE note_id=? LIMIT 1', key))
    )
      fail(409, 'Aquests apunts ja tenen compradors. Conserva el preu o publica una nova versió.');
    const title = str(b.title, 120, true),
      content = str(b.body, 50000),
      summary = str(b.summary || content.slice(0, 180), 300),
      status = choice(b.status || 'published', ['published', 'draft']);
    if (!content && (!b.files || !b.files.length))
      fail(400, 'Escriu el contingut o adjunta algun fitxer.');
    if (!(await one(env, 'SELECT id FROM subjects WHERE id=?', b.subject_id)))
      fail(400, 'Tria una assignatura.');
    if (
      record &&
      status === 'draft' &&
      (await one(env, 'SELECT user_id FROM unlocks WHERE note_id=? LIMIT 1', key))
    )
      fail(
        409,
        'Aquests apunts ja tenen compradors. Pots retirar-los, però no convertir-los en esborrany.',
      );
    const files = await fileStatements(env, user, b.files || [], 'note_id', key);
    const statement = record
      ? sql(
          env,
          'UPDATE notes SET title=?,subject_id=?,body=?,summary=?,price=?,status=? WHERE id=?',
          title,
          b.subject_id,
          content,
          summary,
          price,
          status,
          key,
        )
      : sql(
          env,
          'INSERT INTO notes(id,author_id,subject_id,title,body,summary,price,status) VALUES(?,?,?,?,?,?,?,?)',
          key,
          user.id,
          b.subject_id,
          title,
          content,
          summary,
          price,
          status,
        );
    await env.DB.batch([statement, ...files]);
    return { id: key };
  }
  if (resource === 'pluses') {
    if (record) author(user, record);
    if (!Array.isArray(b.subjects) || !b.subjects.length || b.subjects.length > 15)
      fail(400, 'Indica almenys una assignatura i el plus corresponent.');
    for (const s of b.subjects)
      if (!(await one(env, 'SELECT id FROM subjects WHERE id=?', s.subject_id)))
        fail(400, 'L’assignatura no existeix.');
    if (b.subjects.some((s) => bonusMaximum(s.bonus) === null))
      fail(400, 'Els plusos només poden ser de 0,25 o 0,50 punts.');
    const start = time(b.start),
      end = time(b.end);
    if (end && start && end <= start) fail(400, 'L’hora final ha de ser posterior a l’inici.');
    const values = [
      str(b.title, 120, true),
      str(b.body, 6000, true),
      day(b.date),
      start,
      end,
      str(b.place, 160, true),
      str(b.conditions, 2000),
      b.url ? safeLink(b.url) || fail(400, 'L’enllaç ha de començar amb https://.') : '',
    ];
    const batch = [
      record
        ? sql(
            env,
            "UPDATE pluses SET title=?,body=?,date=?,start=?,end=?,place=?,conditions=?,url=?,status='published' WHERE id=?",
            ...values,
            key,
          )
        : sql(
            env,
            'INSERT INTO pluses(id,author_id,title,body,date,start,end,place,conditions,url) VALUES(?,?,?,?,?,?,?,?,?,?)',
            key,
            user.id,
            ...values,
          ),
      sql(env, 'DELETE FROM plus_subjects WHERE plus_id=?', key),
      ...[...new Map(b.subjects.map((s) => [s.subject_id, s])).values()].map((s) =>
        sql(
          env,
          'INSERT INTO plus_subjects(plus_id,subject_id,bonus) VALUES(?,?,?)',
          key,
          s.subject_id,
          bonusLabel(bonusMaximum(s.bonus)),
        ),
      ),
    ];
    await env.DB.batch(batch);
    return { id: key };
  }
  if (resource === 'events') {
    const visibility = choice(b.visibility || 'private', ['private', 'shared']);
    if (visibility === 'shared') {
      requireManager(user);
      if (user.role !== 'admin' && b.group_id && b.group_id !== user.group_id)
        fail(403, 'Només pots publicar per al teu grup.');
    }
    if (
      record &&
      record.owner_id !== user.id &&
      !(
        privileged(user) &&
        record.visibility === 'shared' &&
        (user.role === 'admin' || record.group_id === user.group_id)
      )
    )
      fail(403, 'No pots editar aquest esdeveniment.');
    if (record && record.visibility === 'private' && record.owner_id !== user.id)
      fail(403, 'Aquest esdeveniment és privat.');
    const start = time(b.start),
      end = time(b.end);
    if (end && start && end <= start) fail(400, 'L’hora final ha de ser posterior a l’inici.');
    const displayKind = choice(b.kind, ['exam', 'test', 'task', 'deadline', 'reminder', 'event']);
    const values = [
      str(b.title, 150, true),
      { test: 'exam', task: 'reminder' }[displayKind] || displayKind,
      day(b.date),
      start,
      end,
      b.subject_id || null,
      b.offering_id || null,
      visibility === 'shared' ? b.group_id || user.group_id : null,
      str(b.room, 120),
      str(b.body, 6000),
      visibility,
      displayKind,
    ];
    if (b.offering_id) {
      const o = await one(env, 'SELECT * FROM offerings WHERE id=?', b.offering_id);
      if (
        !o ||
        o.subject_id !== b.subject_id ||
        (visibility === 'shared' && o.group_id !== (b.group_id || user.group_id))
      )
        fail(400, 'La variant no correspon a l’assignatura o grup.');
    }
    if (record)
      await run(
        env,
        'UPDATE events SET title=?,kind=?,date=?,start=?,end=?,subject_id=?,offering_id=?,group_id=?,room=?,body=?,visibility=?,display_kind=? WHERE id=?',
        ...values,
        key,
      );
    else
      await run(
        env,
        'INSERT INTO events(id,owner_id,title,kind,date,start,end,subject_id,offering_id,group_id,room,body,visibility,display_kind) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)',
        key,
        user.id,
        ...values,
      );
    return { id: key };
  }
  if (resource === 'proposals') {
    if (record && !('title' in b) && ('status' in b || 'response' in b)) {
      requireManager(user);
      await run(
        env,
        'UPDATE proposals SET status=?,response=? WHERE id=?',
        choice(b.status || record.status, ['Proposat', 'En estudi', 'Planificat', 'Fet']),
        str(b.response ?? record.response, 3000),
        key,
      );
      return { id: key };
    }
    if (record) author(user, record);
    const files = await fileStatements(env, user, b.files || [], 'proposal_id', key);
    const statement = record
      ? sql(
          env,
          'UPDATE proposals SET title=?,body=? WHERE id=?',
          str(b.title, 120, true),
          str(b.body, 4000, true),
          key,
        )
      : sql(
          env,
          'INSERT INTO proposals(id,author_id,title,body) VALUES(?,?,?,?)',
          key,
          user.id,
          str(b.title, 120, true),
          str(b.body, 4000, true),
        );
    await env.DB.batch([statement, ...files]);
    return { id: key };
  }
  if (resource === 'announcements') {
    requireManager(user);
    const group = b.group_id || null;
    if (user.role !== 'admin' && group && group !== user.group_id)
      fail(403, 'Aquest grup no et correspon.');
    if (record && user.role !== 'admin' && record.group_id && record.group_id !== user.group_id)
      fail(403, 'Aquest avís és d’un altre grup.');
    if (record)
      await run(
        env,
        'UPDATE announcements SET title=?,body=?,group_id=?,pinned=? WHERE id=?',
        str(b.title, 150, true),
        str(b.body, 6000, true),
        group,
        b.pinned ? 1 : 0,
        key,
      );
    else
      await run(
        env,
        'INSERT INTO announcements(id,author_id,title,body,group_id,pinned) VALUES(?,?,?,?,?,?)',
        key,
        user.id,
        str(b.title, 150, true),
        str(b.body, 6000, true),
        group,
        b.pinned ? 1 : 0,
      );
    return { id: key };
  }
  fail(404, 'L’apartat no existeix.');
}
