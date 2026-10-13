import { rows, one, sql, fail, publicUser, str } from './utils.js';
import { madridDay, nextBid, slotConflicts } from '../shared/domain.js';
import { readPreferences } from '../shared/preferences.js';
import { publicBanner, BANNER_SLOTS } from '../shared/banner.js';
import { googleAvailable } from './google-config.js';
import { bakeryRewardPolicy } from '../shared/bakery-reward.js';
import { bakeryStatus } from './bakery.js';
import { expirePredictions } from './predictions.js';
import {
  SCHEDULE_VERSION,
  SCHEDULE_SOURCE,
  SCHOOL_PERIODS,
  SCHOOL_BREAKS,
  OFFICIAL_ROUTES,
  curriculumIssues,
} from '../shared/official-schedule.js';
export async function catalog(env) {
  const [subjects, groups, offerings, slots, templates] = await Promise.all([
    rows(env, 'SELECT * FROM subjects ORDER BY rowid'),
    rows(env, 'SELECT * FROM groups ORDER BY name'),
    rows(env, 'SELECT * FROM offerings'),
    rows(env, 'SELECT * FROM slots'),
    rows(env, 'SELECT * FROM templates ORDER BY term,position'),
  ]);
  return {
    subjects,
    groups,
    offerings,
    slots,
    templates,
    schoolSchedule: offerings.some((o) => o.active === 1 && o.schedule_version === SCHEDULE_VERSION)
      ? {
          version: SCHEDULE_VERSION,
          source: SCHEDULE_SOURCE,
          periods: SCHOOL_PERIODS,
          breaks: SCHOOL_BREAKS,
        }
      : null,
  };
}
export async function canReadNote(env, user, note) {
  return (
    !!note &&
    (note.author_id === user.id ||
      user.role === 'admin' ||
      (note.status !== 'draft' &&
        ((note.status === 'published' && note.price === 0) ||
          !!(await one(
            env,
            'SELECT user_id FROM unlocks WHERE user_id=? AND note_id=?',
            user.id,
            note.id,
          )))))
  );
}
export async function noteFiles(env, user, note, unlocked) {
  const files = await rows(
    env,
    'SELECT id,name,mime,size,preview,position FROM files WHERE note_id=? ORDER BY position',
    note.id,
  );
  return files.map((f) => ({ ...f, accessible: unlocked || !!f.preview }));
}
export async function bootstrap(env, user) {
  const expired = await expirePredictions(env);
  if (expired.meta?.changes)
    user = {
      ...user,
      balance: (await one(env, 'SELECT balance FROM users WHERE id=?', user.id)).balance,
    };
  const cat = await catalog(env);
  const [
    enrollments,
    events,
    notes,
    pluses,
    grades,
    goals,
    proposals,
    announcements,
    wallet,
    focus,
    study,
    banners,
    daily,
    settings,
    preferences,
    gradeBonuses,
    courseSettings,
    pau,
  ] = await Promise.all([
    rows(env, 'SELECT * FROM enrollments WHERE user_id=?', user.id),
    rows(
      env,
      `SELECT e.*,u.name AS author,COALESCE(ep.done,0) AS done FROM events e JOIN users u ON u.id=e.owner_id LEFT JOIN event_progress ep ON ep.event_id=e.id AND ep.user_id=? WHERE (e.visibility='private' AND e.owner_id=?) OR (e.visibility='shared' AND (e.group_id IS NULL OR e.group_id=?) AND (e.offering_id IS NULL OR e.offering_id IN(SELECT offering_id FROM enrollments WHERE user_id=?))) ORDER BY e.date,e.start`,
      user.id,
      user.id,
      user.group_id,
      user.id,
    ),
    rows(
      env,
      `SELECT n.id,n.author_id,n.subject_id,n.title,n.summary,n.price,n.status,n.created_at,(length(trim(n.body))>0) AS has_text,u.name AS author,(SELECT COUNT(*) FROM likes WHERE type='note' AND target_id=n.id AND active=1) AS likes,COALESCE((SELECT active FROM likes WHERE user_id=? AND type='note' AND target_id=n.id),0) AS liked,EXISTS(SELECT 1 FROM saves WHERE user_id=? AND type='note' AND target_id=n.id) AS saved,EXISTS(SELECT 1 FROM unlocks WHERE user_id=? AND note_id=n.id) AS purchased FROM notes n JOIN users u ON u.id=n.author_id WHERE n.status='published' OR n.author_id=? OR EXISTS(SELECT 1 FROM unlocks WHERE user_id=? AND note_id=n.id) ORDER BY n.created_at DESC`,
      user.id,
      user.id,
      user.id,
      user.id,
      user.id,
    ),
    rows(
      env,
      `SELECT p.*,u.name AS author,(SELECT COUNT(*) FROM likes WHERE type='plus' AND target_id=p.id AND active=1) AS likes,COALESCE((SELECT active FROM likes WHERE user_id=? AND type='plus' AND target_id=p.id),0) AS liked,EXISTS(SELECT 1 FROM saves WHERE user_id=? AND type='plus' AND target_id=p.id) AS saved FROM pluses p JOIN users u ON u.id=p.author_id WHERE p.status='published' OR p.author_id=? ORDER BY p.date`,
      user.id,
      user.id,
      user.id,
    ),
    rows(env, 'SELECT * FROM grade_entries WHERE user_id=? ORDER BY position', user.id),
    rows(env, 'SELECT * FROM grade_goals WHERE user_id=?', user.id),
    rows(
      env,
      `SELECT p.*,u.name AS author,(SELECT COUNT(*) FROM votes WHERE proposal_id=p.id) AS votes,EXISTS(SELECT 1 FROM votes WHERE proposal_id=p.id AND user_id=?) AS voted FROM proposals p JOIN users u ON u.id=p.author_id ORDER BY p.created_at DESC`,
      user.id,
    ),
    rows(
      env,
      'SELECT a.*,u.name AS author FROM announcements a JOIN users u ON u.id=a.author_id WHERE a.group_id IS NULL OR a.group_id=? ORDER BY a.pinned DESC,a.created_at DESC',
      user.group_id,
    ),
    rows(env, 'SELECT * FROM ledger WHERE user_id=? ORDER BY rowid DESC LIMIT 150', user.id),
    one(env, 'SELECT * FROM focus_settings WHERE user_id=?', user.id),
    rows(
      env,
      'SELECT * FROM focus_sessions WHERE user_id=? ORDER BY created_at DESC LIMIT 100',
      user.id,
    ),
    rows(
      env,
      'SELECT b.*,u.name AS author FROM banners b JOIN users u ON u.id=b.author_id WHERE b.archived=0 AND b.rowid=(SELECT MAX(current.rowid) FROM banners current WHERE current.archived=0 AND current.slot=b.slot) ORDER BY b.slot',
    ),
    one(env, 'SELECT day FROM daily_claims WHERE user_id=? AND day=?', user.id, madridDay()),
    rows(env, 'SELECT * FROM settings'),
    one(env, 'SELECT value FROM user_preferences WHERE user_id=?', user.id),
    rows(env, 'SELECT * FROM grade_bonuses WHERE user_id=? ORDER BY created_at,id', user.id),
    rows(env, 'SELECT * FROM grade_course_settings WHERE user_id=?', user.id),
    one(env, 'SELECT value,revision FROM pau_simulations WHERE user_id=?', user.id),
  ]);
  const [attachments, bonuses, proposalFiles] = await Promise.all([
    rows(
      env,
      'SELECT id,name,mime,size,note_id,preview,position FROM files WHERE note_id IS NOT NULL',
    ),
    rows(env, 'SELECT * FROM plus_subjects'),
    rows(env, 'SELECT id,proposal_id FROM files WHERE proposal_id IS NOT NULL'),
  ]);
  const settingsObject = Object.fromEntries(settings.map((s) => [s.key, s.value]));
  const bakeryReward = await bakeryStatus(
    env,
    user,
    bakeryRewardPolicy(settingsObject.bakery_reward_policy),
    Date.now(),
    !!daily,
  );
  return {
    user: publicUser(user),
    gradeBonuses,
    courseSettings,
    pau: pau
      ? { value: JSON.parse(pau.value), revision: pau.revision }
      : { value: null, revision: 0 },
    preferences: readPreferences(
      preferences?.value,
      cat.subjects.map((s) => s.id),
    ),
    ...cat,
    enrollments,
    events,
    notes: notes.map((n) => {
      const unlocked =
        n.price === 0 || n.author_id === user.id || !!n.purchased || user.role === 'admin';
      return {
        ...n,
        body: '',
        unlocked,
        files: attachments
          .filter((f) => f.note_id === n.id)
          .map((f) => ({ ...f, accessible: unlocked || !!f.preview })),
      };
    }),
    pluses: pluses.map((p) => ({ ...p, subjects: bonuses.filter((b) => b.plus_id === p.id) })),
    grades,
    goals,
    proposals: proposals.map((p) => ({
      ...p,
      files: proposalFiles.filter((f) => f.proposal_id === p.id),
    })),
    announcements,
    wallet,
    focus: focus || { work: 25, rest: 5, long_rest: 15, rounds: 4 },
    study,
    banner: publicBanner(banners.find((b) => b.slot === 1)),
    minBid: nextBid(banners.find((b) => b.slot === 1)),
    bannerSlots: BANNER_SLOTS.map((slot) => {
      const banner = banners.find((b) => b.slot === slot);
      return { slot, banner: publicBanner(banner), minBid: nextBid(banner) };
    }),
    dailyClaimed: !bakeryReward.available,
    bakeryReward,
    today: madridDay(),
    settings: settingsObject,
    auth: { google: googleAvailable(env) },
  };
}
export async function configure(env, user, b) {
  const group = str(b.group_id, 60, true);
  const route = OFFICIAL_ROUTES.find((r) => r.id === group);
  if (!route || b.path !== route.path) fail(400, 'Tria un dels tres itineraris oficials.');
  const path = route.path;
  if (user.role === 'delegate' && group !== user.group_id)
    fail(403, 'L’administrador ha d’assignar-te un altre grup abans que el puguis gestionar.');
  if (!(await one(env, 'SELECT id FROM groups WHERE id=?', group)))
    fail(400, 'El grup no existeix.');
  if (!Array.isArray(b.offerings) || b.offerings.length < 5 || b.offerings.length > 20)
    fail(400, 'Tria les assignatures del curs.');
  const cat = await catalog(env);
  const issues = curriculumIssues(cat, group, b.offerings);
  if (issues.length) fail(400, issues.join(' '));
  const selected = b.offerings.map((oid) => cat.offerings.find((o) => o.id === oid));
  if (new Set(selected.map((o) => o.subject_id)).size !== selected.length)
    fail(400, 'Tria una sola variant de cada assignatura.');
  if (slotConflicts(selected, cat.slots).length)
    fail(400, 'Dues assignatures coincideixen a la mateixa hora. Tria una alternativa.');
  const batch = [
    sql(
      env,
      'UPDATE users SET group_id=?,path=?,configured=1,schedule_version=? WHERE id=?',
      group,
      path,
      SCHEDULE_VERSION,
      user.id,
    ),
    sql(env, 'DELETE FROM enrollments WHERE user_id=?', user.id),
    ...selected.map((o) =>
      sql(env, 'INSERT INTO enrollments(user_id,offering_id) VALUES(?,?)', user.id, o.id),
    ),
  ];
  const existing = new Set(
    (
      await rows(env, 'SELECT DISTINCT subject_id,term FROM grade_entries WHERE user_id=?', user.id)
    ).map((r) => `${r.subject_id}:${r.term}`),
  );
  for (const o of selected)
    for (const t of cat.templates.filter(
      (t) => t.offering_id === o.id && !existing.has(`${o.subject_id}:${t.term}`),
    )) {
      batch.push(
        sql(
          env,
          'INSERT OR IGNORE INTO grade_entries(id,user_id,subject_id,term,category,title,date,weight,position,template_id,assessment_type) VALUES(?,?,?,?,?,?,?,?,?,?,?)',
          `${user.id}:${o.subject_id}:${t.id}`,
          user.id,
          o.subject_id,
          t.term,
          t.category,
          t.title,
          t.date,
          t.weight,
          t.position,
          t.id,
          t.assessment_type,
        ),
      );
    }
  await env.DB.batch(batch);
  return { ok: true };
}
