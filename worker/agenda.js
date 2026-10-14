import { rows, one, sql, run, fail, id, str, day, time, choice, body, hash } from './utils.js';
import {
  DELEGATION_UNITS,
  userUnit,
  equivalentOfferings,
  eventConflicts,
  duplicateIdentity,
} from '../shared/delegation.js';
import { NOTIFICATION_LIMIT } from '../shared/notifications.js';

export const NOTIFICATION_QUERY = `WITH unread AS MATERIALIZED (
  SELECT * FROM agenda_notifications WHERE user_id=? AND read_at IS NULL
  ORDER BY created_at DESC,id LIMIT ?
)
SELECT * FROM (
  SELECT * FROM unread
  UNION ALL
  SELECT * FROM (
    SELECT * FROM agenda_notifications WHERE user_id=? AND read_at IS NOT NULL
    ORDER BY created_at DESC,id LIMIT MAX(0,?-(SELECT COUNT(*) FROM unread))
  )
) ORDER BY (read_at IS NOT NULL),created_at DESC,id`;

export async function delegationData(env, user, cat, enrollments) {
  const members = await rows(
    env,
    'SELECT email,unit_id,name,position FROM delegation_members WHERE active=1 ORDER BY unit_id,position,email',
  );
  return {
    units: DELEGATION_UNITS,
    members,
    unit: userUnit(enrollments, cat.offerings)?.id || null,
    managedUnits:
      user.role === 'admin'
        ? DELEGATION_UNITS.map((u) => u.id)
        : members
            .filter((m) => m.email.toLowerCase() === user.email.toLowerCase())
            .map((m) => m.unit_id),
  };
}
async function context(env, user) {
  const [offerings, slots, enrollments] = await Promise.all([
    rows(env, 'SELECT * FROM offerings'),
    rows(env, 'SELECT * FROM slots'),
    rows(env, 'SELECT * FROM enrollments WHERE user_id=?', user.id),
  ]);
  return {
    offerings,
    slots,
    enrollments,
    delegation: await delegationData(env, user, { offerings }, enrollments),
  };
}
export async function agendaRecords(env, user, ctx, eventId = null) {
  const records = await rows(
    env,
    `SELECT e.*,u.name AS author,COALESCE(p.done,0) AS done,r.name AS reviewer,
    (SELECT json_group_array(offering_id) FROM event_targets WHERE event_id=e.id) AS targets_json,
    (SELECT json_group_array(unit_id) FROM event_review_units WHERE event_id=e.id) AS units_json FROM events e
    JOIN users u ON u.id=e.owner_id LEFT JOIN users r ON r.id=e.reviewed_by
    LEFT JOIN event_progress p ON p.event_id=e.id AND p.user_id=?
    WHERE (? IS NULL OR e.id=?) AND (e.owner_id=? OR (e.visibility='shared' AND e.review_status IN('pending','approved') AND
    (?='admin' OR EXISTS(SELECT 1 FROM event_review_units ru WHERE ru.event_id=e.id AND ru.unit_id IN(SELECT value FROM json_each(?))) OR
    (e.review_status='approved' AND ((e.audience_kind='class' AND e.unit_id=?) OR
    (e.audience_kind='offering' AND EXISTS(SELECT 1 FROM event_targets t JOIN enrollments n ON n.offering_id=t.offering_id WHERE t.event_id=e.id AND n.user_id=?)) OR
    (e.audience_kind='group' AND (e.group_id IS NULL OR e.group_id=?) AND (e.offering_id IS NULL OR e.offering_id IN(SELECT offering_id FROM enrollments WHERE user_id=?))))))))
    ORDER BY e.date,e.start,e.id`,
    user.id,
    eventId,
    eventId,
    user.id,
    user.role,
    JSON.stringify(ctx.delegation.managedUnits),
    ctx.delegation.unit,
    user.id,
    user.group_id,
    user.id,
  );
  return records
    .map(({ targets_json, units_json, ...e }) => ({
      ...e,
      targets: JSON.parse(targets_json),
      review_units: JSON.parse(units_json),
    }))
    .filter((e) => {
      if (e.owner_id === user.id) return true;
      if (e.visibility !== 'shared') return false;
      if (
        user.role === 'admin' ||
        e.review_units.some((u) => ctx.delegation.managedUnits.includes(u))
      )
        return true;
      if (e.review_status !== 'approved') return false;
      if (e.audience_kind === 'class') return e.unit_id === ctx.delegation.unit;
      if (e.audience_kind === 'offering')
        return e.targets.some((t) => ctx.enrollments.some((n) => n.offering_id === t));
      return (
        (!e.group_id || e.group_id === user.group_id) &&
        (!e.offering_id || ctx.enrollments.some((n) => n.offering_id === e.offering_id))
      );
    });
}
export async function agendaBootstrap(env, user, cat, enrollments) {
  const delegation = await delegationData(env, user, cat, enrollments);
  const records = await agendaRecords(env, user, { enrollments, delegation });
  // Read unseen notices first: a newer read history must never hide an old unread notice.
  // One SQL snapshot prevents a concurrent read acknowledgment from duplicating rows.
  // The CTE and its count are bounded; both branches use the existing user/date index.
  const notifications = await rows(
    env,
    NOTIFICATION_QUERY,
    user.id,
    NOTIFICATION_LIMIT + 1,
    user.id,
    NOTIFICATION_LIMIT,
  );
  return {
    delegation,
    events: records.filter((e) => e.review_status === 'approved'),
    agendaProposals: records.filter(
      (e) => e.visibility === 'shared' && e.review_status !== 'approved',
    ),
    agendaNotifications: notifications.slice(0, NOTIFICATION_LIMIT),
    agendaNotificationsMoreUnread: notifications.length > NOTIFICATION_LIMIT,
  };
}
function manageable(user, e, ctx) {
  return (
    user.role === 'admin' || e.review_units?.some((u) => ctx.delegation.managedUnits.includes(u))
  );
}
async function candidate(env, user, b, ctx, record) {
  const visibility = choice(b.visibility || 'private', ['private', 'shared']);
  const start = time(b.start),
    end = time(b.end);
  if (end && (!start || end <= start)) fail(400, 'L’hora final ha de ser posterior a l’inici.');
  const kind = choice(b.kind, ['exam', 'test', 'task', 'deadline', 'reminder', 'event']);
  const subject = b.subject_id
    ? await one(env, 'SELECT id FROM subjects WHERE id=?', b.subject_id)
    : null;
  if (b.subject_id && !subject) fail(400, 'L’assignatura no existeix.');
  if (visibility === 'shared' && !subject) fail(400, 'Tria l’assignatura de la proposta pública.');
  const offering = ctx.offerings.find((o) => o.id === b.offering_id && o.active !== 0);
  if (b.offering_id && (!offering || offering.subject_id !== b.subject_id))
    fail(400, 'La variant no correspon a l’assignatura.');
  const audience =
    visibility === 'private'
      ? 'group'
      : choice(b.audience_kind || (offering ? 'offering' : 'class'), ['class', 'offering']);
  if (
    visibility === 'shared' &&
    (!subject ||
      !ctx.enrollments.some(
        (e) => ctx.offerings.find((o) => o.id === e.offering_id)?.subject_id === subject.id,
      )) &&
    user.role !== 'admin'
  )
    fail(403, 'Només pots proposar dates de les assignatures que curses.');
  const missingOffering = audience === 'offering' && !offering;
  const unselectedOffering =
    offering &&
    !ctx.enrollments.some((e) => e.offering_id === offering.id) &&
    user.role !== 'admin';
  if (visibility === 'shared' && (missingOffering || unselectedOffering))
    fail(403, 'Tria una variant que cursis per compartir aquesta data.');
  const unit =
    visibility === 'shared' && audience === 'class'
      ? user.role === 'admin'
        ? b.unit_id || ctx.delegation.unit
        : ctx.delegation.unit
      : null;
  if (
    visibility === 'shared' &&
    audience === 'class' &&
    !DELEGATION_UNITS.some((u) => u.id === unit)
  )
    fail(
      400,
      'Confirma la teva tutoria a Personalitzar el curs abans de proposar una data de classe.',
    );
  const targets =
    audience === 'offering' ? equivalentOfferings(offering, ctx.offerings, ctx.slots) : [];
  const units =
    visibility === 'private'
      ? []
      : unit
        ? [unit]
        : DELEGATION_UNITS.filter(
            (u) =>
              targets.some((t) =>
                u.groups.includes(ctx.offerings.find((o) => o.id === t)?.group_id),
              ) ||
              (u.id === 'science' &&
                offering.subject_id === 'bio' &&
                offering.block === 'elective'),
          ).map((u) => u.id);
  if (visibility === 'shared' && !ctx.delegation.members.some((m) => units.includes(m.unit_id)))
    fail(409, 'Encara no hi ha delegats assignats a aquest àmbit. Pots desar-ho com a privat.');
  return {
    id: record?.id || null,
    title: str(b.title, 150, true),
    kind,
    display_kind: kind,
    date: day(b.date),
    start,
    end,
    subject_id: subject?.id || null,
    offering_id: offering?.id || null,
    group_id: visibility === 'shared' ? offering?.group_id || user.group_id : null,
    room: str(b.room, 120),
    body: str(b.body, 6000),
    visibility,
    audience_kind: audience,
    unit_id: unit,
    targets,
    review_units: units,
  };
}
async function conflicts(env, user, e) {
  const records = await rows(
    env,
    `SELECT * FROM events WHERE date=? AND review_status IN('pending','approved') AND
    ((visibility='private' AND owner_id=?) OR visibility='shared')`,
    e.date,
    user.id,
  );
  const [targets, enrolled, offerings] = await Promise.all([
    rows(
      env,
      "SELECT t.* FROM event_targets t JOIN events e ON e.id=t.event_id WHERE e.date=? AND e.review_status IN('pending','approved')",
      e.date,
    ),
    rows(env, 'SELECT offering_id FROM enrollments WHERE user_id=?', user.id),
    rows(env, 'SELECT * FROM offerings'),
  ]);
  const ownUnit = userUnit(enrolled, offerings)?.id;
  const related = records.filter((r) => {
    if (e.visibility === 'private')
      return (
        r.owner_id === user.id ||
        (r.review_status === 'approved' &&
          ((r.audience_kind === 'class' && r.unit_id === ownUnit) ||
            (r.audience_kind === 'offering' &&
              targets.some(
                (t) => t.event_id === r.id && enrolled.some((n) => n.offering_id === t.offering_id),
              )) ||
            (r.audience_kind === 'group' &&
              (!r.group_id || r.group_id === user.group_id) &&
              (!r.offering_id || enrolled.some((n) => n.offering_id === r.offering_id)))))
      );
    if (r.visibility === 'private') return false;
    if (r.audience_kind === 'group') return !r.group_id || r.group_id === e.group_id;
    if (e.unit_id && r.unit_id) return e.unit_id === r.unit_id;
    if (e.targets.length && r.audience_kind === 'offering')
      return targets.some((t) => t.event_id === r.id && e.targets.includes(t.offering_id));
    return (
      e.review_units.includes(r.unit_id) ||
      (r.unit_id == null && e.unit_id && r.group_id === e.group_id)
    );
  });
  const items = eventConflicts(e, related);
  return {
    items,
    token: await hash(JSON.stringify(items.map((c) => [c.id, c.revision, c.type]).sort())),
  };
}
function checkConflicts(check, b) {
  if (check.items.some((c) => c.type === 'duplicate'))
    fail(
      409,
      'Aquesta data ja està agendada o pendent de revisió. Revisa el duplicat abans de continuar.',
    );
  if (check.items.length && b.conflicts_token !== check.token)
    fail(
      409,
      'Hi ha coincidències d’horari. Revisa els avisos actualitzats i confirma que vols continuar.',
    );
}
function history(env, eid, actor, action, operation, note = '') {
  return sql(
    env,
    `INSERT INTO event_review_history(id,event_id,actor_id,action,revision,note)
    SELECT ?,id,?,?,revision,? FROM events WHERE id=? AND last_operation=?`,
    id(),
    actor,
    action,
    note,
    eid,
    operation,
  );
}
async function handleAgenda(request, env, user, path) {
  if (path === '/api/agenda/notifications/read' && request.method === 'POST') {
    const b = await body(request);
    if (
      !Array.isArray(b.ids) ||
      b.ids.length > NOTIFICATION_LIMIT ||
      b.ids.some((v) => typeof v !== 'string' || !v.length || v.length > 128)
    )
      fail(400, 'Tria els avisos que has llegit.');
    const ids = [...new Set(b.ids)],
      read_at = new Date().toISOString();
    if (ids.length)
      await run(
        env,
        'UPDATE agenda_notifications SET read_at=? WHERE user_id=? AND read_at IS NULL AND id IN(SELECT value FROM json_each(?))',
        read_at,
        user.id,
        JSON.stringify(ids),
      );
    return { ok: true, ids, read_at };
  }
  if (
    path !== '/api/agenda/preview' &&
    !/^\/api\/events(?:\/[^/]+(?:\/(review|progress))?)?$/.test(path)
  )
    return null;
  const ctx = await context(env, user);
  if (path === '/api/agenda/preview') {
    if (request.method !== 'POST') fail(405, 'Mètode no vàlid.');
    const b = await body(request);
    const reviewing = b.review_id
      ? (await agendaRecords(env, user, ctx, b.review_id)).find(
          (e) => e.id === b.review_id && manageable(user, e, ctx) && e.visibility === 'shared',
        )
      : null;
    if (b.review_id && !reviewing) fail(403, 'Aquesta revisió no et correspon.');
    const e = reviewing
      ? { ...reviewing, kind: reviewing.display_kind || reviewing.kind }
      : await candidate(env, user, b, ctx, b.id ? { id: b.id } : null);
    const check = await conflicts(env, user, e);
    return {
      conflicts: check.items,
      conflicts_token: check.token,
      reviewers: ctx.delegation.members.filter((m) => e.review_units.includes(m.unit_id)),
      targets: e.targets,
      review_units: e.review_units,
    };
  }
  const [, rid, action] = path.match(/^\/api\/events(?:\/([^/]+)(?:\/(review|progress))?)?$/);
  const record = rid ? (await agendaRecords(env, user, ctx, rid)).find((e) => e.id === rid) : null;
  if (rid && !record) fail(404, 'Aquesta data no està disponible.');
  if (action === 'progress') {
    if (request.method !== 'POST') fail(405, 'Mètode no vàlid.');
    if (record.review_status !== 'approved' || record.display_kind !== 'task')
      fail(400, 'Només es poden completar tasques publicades.');
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
  if (action === 'review') {
    if (request.method !== 'POST') fail(405, 'Mètode no vàlid.');
    if (!manageable(user, record, ctx) || record.visibility !== 'shared')
      fail(403, 'Aquesta proposta correspon als delegats d’un altre àmbit.');
    const b = await body(request),
      decision = choice(b.decision, ['approve', 'return', 'withdraw']);
    if (b.revision !== record.revision)
      fail(409, 'La proposta ha canviat. Actualitza el panell i revisa-la de nou.');
    if (
      decision === 'withdraw'
        ? record.review_status !== 'approved'
        : record.review_status !== 'pending'
    )
      fail(409, 'Aquesta proposta ja s’ha resolt.');
    const note = str(b.note, 1000, decision !== 'approve');
    if (decision === 'approve') {
      if (b.confirmed !== true) fail(400, 'Confirma que la data i el contingut són correctes.');
      checkConflicts(
        await conflicts(env, user, { ...record, kind: record.display_kind || record.kind }),
        b,
      );
    }
    const status = { approve: 'approved', return: 'returned', withdraw: 'withdrawn' }[decision],
      operation = id();
    const result = await env.DB.batch([
      sql(
        env,
        "UPDATE events SET review_status=?,revision=revision+1,reviewed_by=?,reviewed_at=strftime('%Y-%m-%dT%H:%M:%fZ','now'),review_note=?,last_operation=? WHERE id=? AND revision=? AND review_status=?",
        status,
        user.id,
        note,
        operation,
        rid,
        b.revision,
        record.review_status,
      ),
      history(env, rid, user.id, decision, operation, note),
      sql(
        env,
        `INSERT INTO agenda_notifications(id,user_id,event_id,title,body) SELECT ?,owner_id,id,?,? FROM events WHERE id=? AND last_operation=?`,
        id(),
        decision === 'approve'
          ? 'Proposta aprovada'
          : decision === 'return'
            ? 'Cal revisar la proposta'
            : 'Data retirada',
        record.title + (note ? ' · ' + note : ''),
        rid,
        operation,
      ),
    ]);
    if (!result[0].meta.changes) fail(409, 'Un altre delegat ja ha resolt aquesta proposta.');
    return { ok: true, status };
  }
  if (request.method === 'DELETE') {
    if (record.owner_id !== user.id)
      fail(403, 'Retira la data des del panell de delegats, indicant-ne el motiu.');
    if (record.visibility === 'private') await run(env, 'DELETE FROM events WHERE id=?', rid);
    else {
      const operation = id();
      const result = await env.DB.batch([
        sql(
          env,
          "UPDATE events SET review_status='withdrawn',revision=revision+1,last_operation=? WHERE id=? AND revision=?",
          operation,
          rid,
          record.revision,
        ),
        history(env, rid, user.id, 'withdraw', operation),
      ]);
      if (!result[0].meta.changes)
        fail(409, 'La proposta ha canviat. Actualitza-la abans de retirar-la.');
    }
    return { ok: true };
  }
  if (request.method !== 'POST') fail(405, 'Mètode no vàlid.');
  const b = await body(request);
  if (record && record.owner_id !== user.id)
    fail(403, 'Retorna la proposta a l’autor amb els canvis que cal fer.');
  if (record && b.revision !== record.revision)
    fail(409, 'La data ha canviat. Torna a obrir-la abans de desar.');
  const e = await candidate(env, user, b, ctx, record),
    check = await conflicts(env, user, e);
  checkConflicts(check, b);
  const key = rid || id(),
    operation = id(),
    status = e.visibility === 'shared' ? 'pending' : 'approved';
  const dedupeScope =
    e.visibility === 'shared'
      ? await hash(JSON.stringify([e.audience_kind, e.unit_id, e.targets.slice().sort()]))
      : null;
  const identity = e.visibility === 'shared' ? duplicateIdentity(e) : null;
  const dedupe =
    e.visibility === 'shared'
      ? await hash(
          JSON.stringify([
            e.audience_kind,
            e.unit_id,
            e.targets.sort(),
            e.subject_id,
            e.date,
            e.start,
            e.end,
            ['exam', 'test'].includes(e.kind) ? 'exam' : e.kind,
            ['exam', 'test'].includes(e.kind) ? '' : e.title.toLowerCase().trim(),
          ]),
        )
      : null;
  const values = [
    e.title,
    { test: 'exam', task: 'reminder' }[e.kind] || e.kind,
    e.date,
    e.start,
    e.end,
    e.subject_id,
    e.offering_id,
    e.group_id,
    e.room,
    e.body,
    e.visibility,
    e.kind,
    status,
    e.audience_kind,
    e.unit_id,
    operation,
    dedupe,
    dedupeScope,
    identity,
  ];
  const change = record
    ? sql(
        env,
        `UPDATE events SET title=?,kind=?,date=?,start=?,end=?,subject_id=?,offering_id=?,group_id=?,room=?,body=?,visibility=?,display_kind=?,review_status=?,audience_kind=?,unit_id=?,last_operation=?,dedupe_key=?,dedupe_scope=?,dedupe_identity=?,revision=revision+1,reviewed_by=NULL,reviewed_at=NULL,review_note='' WHERE id=? AND revision=?`,
        ...values,
        key,
        b.revision,
      )
    : sql(
        env,
        'INSERT INTO events(title,kind,date,start,end,subject_id,offering_id,group_id,room,body,visibility,display_kind,review_status,audience_kind,unit_id,last_operation,dedupe_key,dedupe_scope,dedupe_identity,id,owner_id) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)',
        ...values,
        key,
        user.id,
      );
  try {
    const result = await env.DB.batch([
      change,
      sql(
        env,
        'DELETE FROM event_targets WHERE event_id=? AND EXISTS(SELECT 1 FROM events WHERE id=? AND last_operation=?)',
        key,
        key,
        operation,
      ),
      sql(
        env,
        'DELETE FROM event_review_units WHERE event_id=? AND EXISTS(SELECT 1 FROM events WHERE id=? AND last_operation=?)',
        key,
        key,
        operation,
      ),
      ...e.targets.map((t) =>
        sql(
          env,
          'INSERT INTO event_targets SELECT id,? FROM events WHERE id=? AND last_operation=?',
          t,
          key,
          operation,
        ),
      ),
      ...e.review_units.map((u) =>
        sql(
          env,
          'INSERT INTO event_review_units SELECT id,? FROM events WHERE id=? AND last_operation=?',
          u,
          key,
          operation,
        ),
      ),
      history(env, key, user.id, status === 'pending' ? 'submit' : 'save', operation),
    ]);
    if (!result[0].meta.changes) fail(409, 'La data ha canviat. Torna a obrir-la.');
  } catch (error) {
    if (
      String(error.message).includes('events.dedupe_key') ||
      String(error.message).includes('agenda_duplicate')
    )
      fail(409, 'Ja hi ha una proposta igual. Revisa l’agenda i els pendents.');
    throw error;
  }
  return { id: key, status };
}
export async function agendaRoute(request, env, user, path) {
  try {
    return await handleAgenda(request, env, user, path);
  } catch (error) {
    if (
      String(error.message).includes('agenda_duplicate') ||
      String(error.message).includes('events.dedupe_key')
    )
      fail(409, 'Ja hi ha una proposta igual. Revisa l’agenda i els pendents.');
    throw error;
  }
}
