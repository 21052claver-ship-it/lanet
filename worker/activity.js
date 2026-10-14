import {
  ACTIVITY_AREAS,
  ACTIVITY_INTERVAL,
  ACTIVE_WINDOW,
  isActivityAdmin,
  activityDayOffset,
} from '../shared/activity.js';
import { madridDay } from '../shared/domain.js';
import { one, rows, run, sql, fail, day, str, choice } from './utils.js';

export async function recordActivity(env, user, area, kind = 'pulse', now = Date.now()) {
  choice(area, Object.keys(ACTIVITY_AREAS));
  choice(kind, ['pulse', 'action', 'error']);
  // The WHERE is authoritative across concurrent requests, tabs and Worker isolates.
  // A skipped sample causes no table/index/aggregate writes. No read-before-write race.
  const counter = { pulse: 'pulses', action: 'actions', error: 'errors' }[kind];
  const stamp = kind + '_at';
  return run(
    env,
    `INSERT INTO activity_daily(day,user_id,first_seen,last_seen,page,area,${stamp},${counter})
    VALUES(?,?,?,?,?,?,?,1) ON CONFLICT(day,user_id) DO UPDATE SET
      last_seen=MAX(activity_daily.last_seen,excluded.last_seen),
      page=(CASE WHEN ?='pulse' THEN excluded.page ELSE activity_daily.page END),
      area=excluded.area, ${stamp}=excluded.${stamp}, ${counter}=activity_daily.${counter}+1
    WHERE activity_daily.${stamp}<=?`,
    madridDay(new Date(now)),
    user.id,
    now,
    now,
    area,
    area,
    now,
    kind,
    now - ACTIVITY_INTERVAL,
  );
}

export async function activityDashboard(request, env, user, now = Date.now()) {
  if (!isActivityAdmin(user)) fail(403, 'Aquest dashboard és privat.');
  if (request.method !== 'GET') fail(405, 'Mètode no vàlid.');
  const params = new URL(request.url).searchParams;
  const today = madridDay(new Date(now));
  const days = Number(params.get('days') || 30);
  if (![7, 30, 90, 365].includes(days)) fail(400, 'Tria un període vàlid.');
  const selected = day(params.get('day') || today);
  if (selected > today || selected < activityDayOffset(today, -34))
    fail(400, 'El detall personal es conserva durant 35 dies.');
  const after = str(params.get('after') || '', 100);
  const since = activityDayOffset(today, 1 - days);
  const activeWhere = `d.last_seen>=? AND u.disabled=0 AND u.google_sub IS NOT NULL
    AND NOT EXISTS(SELECT 1 FROM activity_daily n WHERE n.day=? AND n.user_id=d.user_id AND n.last_seen>d.last_seen)`;
  const [daily, areas, inventory, active, activeTotal, people, metadata] = await Promise.all([
    rows(env, 'SELECT * FROM activity_days WHERE day>=? AND day<=? ORDER BY day', since, today),
    rows(
      env,
      'SELECT area,SUM(pulses) pulses,SUM(actions) actions,SUM(errors) errors FROM activity_areas WHERE day>=? AND day<=? GROUP BY area',
      since,
      today,
    ),
    one(env, 'SELECT users,enabled,files,file_bytes FROM activity_inventory WHERE id=1'),
    rows(
      env,
      `SELECT d.user_id,u.name,u.email,u.group_id,d.page,d.last_seen FROM activity_daily d JOIN users u ON u.id=d.user_id WHERE ${activeWhere} ORDER BY d.last_seen DESC,d.user_id LIMIT 50`,
      now - ACTIVE_WINDOW,
      today,
    ),
    one(
      env,
      `SELECT COUNT(*) total FROM activity_daily d JOIN users u ON u.id=d.user_id WHERE ${activeWhere}`,
      now - ACTIVE_WINDOW,
      today,
    ),
    rows(
      env,
      `SELECT d.user_id,u.name,u.email,u.group_id,d.first_seen,d.last_seen,d.page,d.pulses,d.actions,d.errors
      FROM activity_daily d JOIN users u ON u.id=d.user_id WHERE d.day=? AND d.user_id>? ORDER BY d.user_id LIMIT 51`,
      selected,
      after,
    ),
    rows(
      env,
      "SELECT key,value FROM settings WHERE key IN('activity_started_at','data_maintenance_status')",
    ),
  ]);
  const settings = Object.fromEntries(metadata.map((row) => [row.key, row.value]));
  const next = people.length > 50 ? people[49].user_id : null;
  return {
    generated_at: now,
    today,
    selected_day: selected,
    days,
    started_at: settings.activity_started_at,
    maintenance: settings.data_maintenance_status
      ? JSON.parse(settings.data_maintenance_status)
      : null,
    policy: {
      sample_seconds: ACTIVITY_INTERVAL / 1000,
      active_seconds: ACTIVE_WINDOW / 1000,
      detail_days: 35,
      aggregate_days: 400,
    },
    daily,
    areas,
    inventory,
    active,
    active_total: activeTotal.total,
    people: people.slice(0, 50),
    next,
  };
}

// Called by the shared, leased maintenance pass. Deletes are bounded and indexed.
// Aggregates survive detail expiry; no historical activity is fabricated.
export async function cleanActivity(env, now = Date.now()) {
  const today = madridDay(new Date(now));
  await env.DB.batch([
    sql(
      env,
      'DELETE FROM activity_daily WHERE (day,user_id) IN(SELECT day,user_id FROM activity_daily WHERE day<? LIMIT 1000)',
      activityDayOffset(today, -34),
    ),
    sql(env, 'DELETE FROM activity_days WHERE day<?', activityDayOffset(today, -399)),
    sql(env, 'DELETE FROM activity_areas WHERE day<?', activityDayOffset(today, -399)),
    sql(
      env,
      'DELETE FROM sessions WHERE hash IN(SELECT hash FROM sessions WHERE expires<=? LIMIT 500)',
      now,
    ),
    sql(
      env,
      'DELETE FROM google_auth_flows WHERE state_hash IN(SELECT state_hash FROM google_auth_flows WHERE expires<=? LIMIT 500)',
      now,
    ),
  ]);
}
