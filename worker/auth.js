import { one, run, fail, json, id, hash, publicUser, isGuestUser } from './utils.js';
import { googleAvailable } from './google-config.js';

export const sessionToken = (request) =>
  request.headers.get('Cookie')?.match(/(?:^|;\s*)lanet_session=([^;]+)/)?.[1];

export async function authenticate(request, env) {
  const token = sessionToken(request);
  if (!token) fail(401, 'Inicia sessió amb Google per continuar.');
  const user = await one(
    env,
    "SELECT u.* FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.hash=? AND s.expires>? AND s.auth_provider='google' AND u.google_sub IS NOT NULL AND u.disabled=0",
    await hash(token),
    Date.now(),
  );
  if (!user) fail(401, 'Torna a iniciar sessió amb Google per continuar.');
  return user;
}

// Old guest cookies can preserve an existing workspace during verified OAuth only.
// This helper never authenticates a request or gives access to application data.
export async function legacyGoogleGuest(request, env) {
  const token = sessionToken(request);
  if (!token) return null;
  const user = await one(
    env,
    "SELECT u.* FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.hash=? AND s.expires>? AND s.auth_provider='legacy' AND u.google_sub IS NULL AND u.disabled=0",
    await hash(token),
    Date.now(),
  );
  return user && isGuestUser(user) ? user : null;
}

// Called only after Google identity verification, never by a local sign-in route.
export async function session(user, request, env) {
  if (!user.google_sub || user.disabled) fail(401, 'Cal verificar el compte amb Google.');
  const token = id() + id();
  await run(
    env,
    "INSERT INTO sessions(hash,user_id,expires,auth_provider) VALUES(?,?,?,'google')",
    await hash(token),
    user.id,
    Date.now() + 7 * 86400000,
  );
  return json({ user: publicUser(user) }, 200, {
    'Set-Cookie': `lanet_session=${token}; HttpOnly; Path=/; SameSite=Lax; Max-Age=604800${new URL(request.url).protocol === 'https:' ? '; Secure' : ''}`,
  });
}

export async function authRoute(request, env, path) {
  if (path === '/api/auth/status') {
    let authenticated = false;
    try {
      await authenticate(request, env);
      authenticated = true;
    } catch (error) {
      if (error.status !== 401) throw error;
    }
    return json({
      initialized: !!(await one(env, "SELECT id FROM users WHERE role='admin' LIMIT 1")),
      authenticated,
      auth_method: 'google',
      demo: false,
      guest: false,
      google: googleAvailable(env),
      school:
        (await one(env, "SELECT value FROM settings WHERE key='school_name'"))?.value ||
        env.SCHOOL_NAME,
    });
  }
  // Clearing expired and pre-migration cookies must work without authentication.
  if (path === '/api/auth/logout') {
    const token = sessionToken(request);
    if (token) await run(env, 'DELETE FROM sessions WHERE hash=?', await hash(token));
    return json({ ok: true }, 200, {
      'Set-Cookie': `lanet_session=; HttpOnly; Path=/; SameSite=Lax; Max-Age=0${new URL(request.url).protocol === 'https:' ? '; Secure' : ''}`,
    });
  }
  if (path === '/api/auth/me') return json({ user: publicUser(await authenticate(request, env)) });
  if (
    ['login', 'register', 'guest', 'reset', 'bootstrap', 'password'].some(
      (route) => path === `/api/auth/${route}`,
    )
  )
    fail(403, 'La Net només permet iniciar sessió amb Google.');
  fail(404, 'Aquest accés no existeix.');
}
