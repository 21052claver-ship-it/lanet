import {
  json,
  HttpError,
  fail,
  body,
  str,
  id,
  one,
  rows,
  run,
  sql,
  num,
  integer,
  choice,
  day,
} from './utils.js';
import {
  edgeGuard,
  accountGuard,
  reservePublication,
  releasePublication,
  recordAbuse,
} from './abuse.js';
import { authRoute, authenticate } from './auth.js';
import { googleRoute } from './google.js';
import { allowedRequestOrigin } from './origin.js';
import { withSecurityHeaders } from './security.js';
import { bootstrap, catalog, configure } from './data.js';
import { upload, fileResponse, ensureFileSafety, discardUpload } from './files.js';
import { drainFileDeletions } from './file-lifecycle.js';
import { maintainData } from './maintenance.js';
import { activityDashboard, recordActivity } from './activity.js';
import { activityArea, ACTIVITY_AREAS } from '../shared/activity.js';
import { resourceRoute } from './resources.js';
import { gradeRoute } from './grades.js';
import { adminRoute } from './admin.js';
import { madridDay, nextBid } from '../shared/domain.js';
import { preferenceStatement } from './preferences.js';
import { pauRoute } from './pau.js';
import { libraryRoute } from './library.js';
import { rouletteRoute } from './roulette.js';
import { claimBakeryCake } from './bakery.js';
import { predictionsRoute } from './predictions.js';
import { agendaRoute } from './agenda.js';
async function api(request, env, ctx, security) {
  const url = new URL(request.url),
    path = url.pathname;
  if (!['GET', 'POST', 'PUT', 'DELETE'].includes(request.method))
    fail(405, 'Aquest mètode no està disponible.');
  if (request.method !== 'GET') {
    if (!allowedRequestOrigin(request, env))
      fail(403, 'L’origen de la petició no està autoritzat.');
  }
  await edgeGuard(request, env);
  if (path === '/api/health') return json({ ok: true });
  if (path.startsWith('/api/auth/')) {
    if (path.startsWith('/api/auth/google/')) {
      if (request.method !== (path.endsWith('/callback') ? 'GET' : 'POST'))
        fail(405, 'Mètode no vàlid.');
      return googleRoute(request, env, path);
    }
    const gets = ['/api/auth/status', '/api/auth/me'];
    if (gets.includes(path) ? request.method !== 'GET' : request.method !== 'POST')
      fail(405, 'Mètode no vàlid.');
    return authRoute(request, env, path);
  }
  const user = await authenticate(request, env);
  security.user = user;
  await accountGuard(request, env, user);
  if (path === '/api/admin/analytics') return json(await activityDashboard(request, env, user));
  if (path === '/api/activity') {
    if (request.method !== 'POST') fail(405, 'Mètode no vàlid.');
    const value = await body(request);
    if (Object.keys(value).some((key) => key !== 'page'))
      fail(400, 'Dades d’activitat no vàlides.');
    const page = choice(value.page, Object.keys(ACTIVITY_AREAS));
    await recordActivity(env, user, page);
    return json({ ok: true });
  }
  security.publication = await reservePublication(request, env, user);
  if (path === '/api/bootstrap') {
    const cleanup = maintainData(env).catch(() => {});
    if (ctx?.waitUntil) ctx.waitUntil(cleanup);
    else await cleanup;
  }
  if (request.method === 'GET') {
    if (path === '/api/bootstrap') return json(await bootstrap(env, user));
    if (path === '/api/catalog') return json(await catalog(env));
    if (path.startsWith('/api/files/')) return fileResponse(request, env, user, path.split('/')[3]);
  }
  if (path === '/api/pau') return pauRoute(request, env, user);
  if (path === '/api/roulette') return rouletteRoute(request, env, user);
  if (path === '/api/predictions' || path.startsWith('/api/predictions/'))
    return predictionsRoute(request, env, user, path);
  if (path.startsWith('/api/library')) {
    const result = await libraryRoute(request, env, user, path);
    if (result) return result;
    fail(404, 'No s’ha trobat el recurs.');
  }
  if (path === '/api/profile' && request.method === 'POST') {
    const b = await body(request);
    const identity = [
      'name',
      'given_name',
      'family_name',
      'email',
      'avatar_url',
      'google_sub',
      'password_enabled',
    ];
    if (identity.some((key) => Object.hasOwn(b, key)))
      fail(403, 'El nom, els cognoms i la foto provenen de Google i no es poden editar a La Net.');
    if (b.preferences !== undefined)
      await (await preferenceStatement(env, user, b.preferences)).run();
    return json({ ok: true });
  }
  if (path === '/api/preferences' && request.method === 'POST') {
    await (await preferenceStatement(env, user, await body(request))).run();
    return json({ ok: true });
  }
  if (path === '/api/configure' && request.method === 'POST')
    return json(await configure(env, user, await body(request)));
  if (path.startsWith('/api/events') || path.startsWith('/api/agenda/')) {
    const result = await agendaRoute(request, env, user, path);
    if (result !== null) return json(result);
    fail(404, 'No s’ha trobat aquesta data.');
  }
  if (path === '/api/files' && request.method === 'POST') {
    return json(await upload(request, env, user, ctx), 201);
  }
  if (path.startsWith('/api/files/') && request.method === 'DELETE')
    return json(await discardUpload(env, user, path.split('/')[3]));
  if (path === '/api/bakery/claim' && request.method === 'POST') {
    return json(await claimBakeryCake(env, user));
  }
  if (path === '/api/banner' && request.method === 'POST') {
    const b = await body(request);
    if (b.anonymous !== undefined && typeof b.anonymous !== 'boolean')
      fail(400, 'Tria si vols publicar amb el teu nom o anònimament.');
    if (b.slot !== undefined && typeof b.slot !== 'number')
      fail(400, 'Tria un espai d’anunci vàlid.');
    const slot = integer(b.slot ?? 1, 1, 3);
    const current = await one(
      env,
      'SELECT * FROM banners WHERE archived=0 AND slot=? ORDER BY rowid DESC LIMIT 1',
      slot,
    );
    if ((b.previous_id || null) !== (current?.id || null))
      fail(409, 'Algú ha canviat el missatge. Revisa el nou preu.');
    const amount = integer(b.amount, nextBid(current), 100000);
    const title = str(b.title, 80);
    if (!title && !b.file_id) fail(400, 'Escriu un missatge o tria una imatge per al cartell.');
    if (b.file_id) {
      const f = await one(env, 'SELECT * FROM files WHERE id=? AND owner_id=?', b.file_id, user.id);
      if (
        !f ||
        f.deleting_at != null ||
        !f.mime.startsWith('image/') ||
        f.note_id ||
        f.proposal_id ||
        f.plus_id
      )
        fail(400, 'Tria una imatge pròpia per al missatge.');
      await ensureFileSafety(env, f);
    }
    const color = choice(b.color || 'peach', ['peach', 'sage', 'lavender', 'blue']);
    await run(
      env,
      'INSERT INTO banners(id,author_id,title,body,color,amount,previous_id,file_id,day,anonymous,slot) VALUES(?,?,?,?,?,?,?,?,?,?,?)',
      id(),
      user.id,
      title,
      str(b.body, 180),
      color,
      amount,
      current?.id || null,
      b.file_id || null,
      madridDay(),
      b.anonymous === true,
      slot,
    );
    // The INSERT trigger already revoked and detached obsolete images.
    // Storage failures leave a durable retry, never a failed/duplicated bid.
    await drainFileDeletions(env).catch(() => {});
    return json({ ok: true });
  }
  if (path === '/api/focus/settings' && request.method === 'POST') {
    const b = await body(request);
    await run(
      env,
      'INSERT INTO focus_settings(user_id,work,rest,long_rest,rounds) VALUES(?,?,?,?,?) ON CONFLICT(user_id) DO UPDATE SET work=excluded.work,rest=excluded.rest,long_rest=excluded.long_rest,rounds=excluded.rounds',
      user.id,
      integer(b.work, 1, 120),
      integer(b.rest, 1, 60),
      integer(b.long_rest, 1, 60),
      integer(b.rounds, 1, 12),
    );
    return json({ ok: true });
  }
  if (path === '/api/focus/complete' && request.method === 'POST') {
    const b = await body(request);
    const completedDay = b.day === undefined ? madridDay() : day(b.day);
    if (completedDay > madridDay()) fail(400, 'Una sessió d’estudi no pot ser d’un dia futur.');
    if (
      b.subject_id &&
      !(await one(env, 'SELECT id FROM subjects WHERE id=?', str(b.subject_id, 100, true)))
    )
      fail(400, 'L’assignatura d’aquesta sessió ja no està disponible.');
    await run(
      env,
      'INSERT OR IGNORE INTO focus_sessions(id,user_id,subject_id,task,minutes,day) VALUES(?,?,?,?,?,?)',
      str(b.id, 100, true),
      user.id,
      b.subject_id || null,
      str(b.task, 200),
      integer(b.minutes, 1, 120),
      completedDay,
    );
    return json({ ok: true });
  }
  if (path === '/api/reports' && request.method === 'POST') {
    const b = await body(request);
    const type = choice(b.type, ['note', 'plus', 'proposal', 'banner']);
    const table = { note: 'notes', plus: 'pluses', proposal: 'proposals', banner: 'banners' }[type];
    if (!(await one(env, `SELECT id FROM ${table} WHERE id=?`, b.target_id)))
      fail(404, 'El contingut no existeix.');
    await run(
      env,
      'INSERT INTO reports(id,user_id,type,target_id,reason) VALUES(?,?,?,?,?)',
      id(),
      user.id,
      type,
      b.target_id,
      str(b.reason, 1000, true),
    );
    return json({ ok: true });
  }
  if (
    (path.startsWith('/api/grades') && request.method !== 'POST') ||
    (path.startsWith('/api/admin/') && request.method !== 'POST')
  )
    fail(405, 'Mètode no vàlid.');
  for (const router of [adminRoute, resourceRoute, gradeRoute]) {
    const result = await router(request, env, user, path);
    if (result !== null) return json(result);
  }
  fail(404, 'No s’ha trobat aquesta pàgina.');
}
async function applicationResponse(request, env, ctx, security) {
  const pathname = new URL(request.url).pathname;
  if (!pathname.startsWith('/api/')) {
    const response = await env.ASSETS.fetch(request);
    if (response.headers.get('Content-Type')?.includes('text/html')) {
      if (pathname.startsWith('/assets/') || pathname === '/startup.js')
        return new Response('Aquest recurs ja no està disponible. Torna a obrir La Net.', {
          status: 404,
          headers: { 'Content-Type': 'text/plain;charset=UTF-8', 'Cache-Control': 'no-store' },
        });
      const headers = new Headers(response.headers);
      headers.set('Cache-Control', 'no-store');
      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers,
      });
    }
    return response;
  }
  try {
    return await api(request, env, ctx, security);
  } catch (error) {
    await releasePublication(env, security.publication).catch(() => {});
    await recordAbuse(env, security.user, error).catch(() => {
      console.error(JSON.stringify({ event: 'abuse_record_failed' }));
    });
    if (error instanceof HttpError)
      return json(
        {
          error: error.message,
          ...(error.code ? { code: error.code } : {}),
          ...(error.retryAfter ? { retry_after: error.retryAfter } : {}),
        },
        error.status,
        error.retryAfter ? { 'Retry-After': String(error.retryAfter) } : {},
      );
    const message = String(error?.message || '');
    if (message.includes('file_retired'))
      return json(
        { error: 'Aquesta imatge s’ha retirat. Tria’n una de nova.', code: 'file_retired' },
        409,
      );
    if (message.includes('users.balance') || message.includes('insufficient_balance'))
      return json(
        {
          error: 'No tens prou pastissos per completar aquesta acció.',
          code: 'insufficient_balance',
        },
        409,
      );
    if (message.includes('bid_changed'))
      return json(
        { error: 'El missatge ha canviat mentre feies l’oferta. Torna a revisar el preu.' },
        409,
      );
    if (message.includes('bid_low'))
      return json({ error: 'L’oferta ha de ser almenys el doble del valor actual.' }, 409);
    if (message.includes('purchase_invalid'))
      return json({ error: 'La compra ha canviat. Revisa els apunts.' }, 409);
    if (message.includes('grade_bonus_limit'))
      return json(
        { error: 'Ja has reservat el màxim: dos plusos de 0,25 o un de 0,50 per assignatura.' },
        409,
      );
    if (message.includes('UNIQUE constraint failed: grade_bonuses.user_id'))
      return json({ error: 'Aquest plus ja és a les teves notes d’aquesta assignatura.' }, 409);
    if (message.includes('UNIQUE constraint failed: users.email'))
      return json({ error: 'Aquest correu ja té un compte.' }, 409);
    if (message.includes('invitations.uses'))
      return json({ error: 'Aquesta invitació ja s’ha utilitzat.' }, 409);
    if (message.includes('recovery_used'))
      return json({ error: 'Aquest codi de recuperació ja s’ha utilitzat.' }, 400);
    if (message.includes('settings.key'))
      return json({ error: 'El centre ja s’ha configurat.' }, 409);
    if (message.includes('FOREIGN KEY constraint'))
      return json({ error: 'Una de les dades seleccionades ja no està disponible.' }, 400);
    console.error(
      JSON.stringify({
        event: 'api_error',
        path: new URL(request.url).pathname,
        error: new URL(request.url).pathname.startsWith('/api/auth/google/')
          ? 'google_auth_failed'
          : message.replace(/\b[\w.+-]+@[\w.-]+\b/g, '[email]'),
      }),
    );
    return json({ error: 'No s’ha pogut completar l’acció. Torna-ho a provar.' }, 500);
  }
}
export default {
  async fetch(request, env, ctx) {
    const security = {};
    const response = await applicationResponse(request, env, ctx, security);
    const path = new URL(request.url).pathname;
    const area = activityArea(path);
    if (
      security.user &&
      request.method !== 'GET' &&
      area &&
      path !== '/api/admin/analytics' &&
      (response.ok || [400, 409, 413, 422, 500].includes(response.status))
    ) {
      // Telemetry failure must never turn a committed user action into an error/retry.
      const recorded = recordActivity(
        env,
        security.user,
        area,
        response.ok ? 'action' : 'error',
      ).catch(() => {});
      if (ctx?.waitUntil) ctx.waitUntil(recorded);
      else await recorded;
    }
    return withSecurityHeaders(response, request);
  },
};
