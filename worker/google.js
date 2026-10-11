import { legacyGoogleGuest, session, sessionToken } from './auth.js';
import { body, fail, hash, id, isGuestUser, json, limit, one, run } from './utils.js';
import { googleConfig } from './google-config.js';
import { completeGoogleProfile, exchangeGoogleCode, verifyGoogleToken } from './google-token.js';

const random = () =>
  btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(32))))
    .replaceAll('+', '-')
    .replaceAll('/', '_')
    .replaceAll('=', '');
const cookieValue = (request) =>
  request.headers.get('Cookie')?.match(/(?:^|;\s*)lanet_google_state=([\w-]{43})(?:;|$)/)?.[1];
const cookie = (value, secure, maxAge) =>
  `lanet_google_state=${value}; HttpOnly; Path=/api/auth/google; SameSite=Lax; Max-Age=${maxAge}${secure ? '; Secure' : ''}`;
function redirect(config, result, cookies = []) {
  const headers = new Headers({
    Location: `${config.origin}/?auth_result=${result}#schedule`,
    'Cache-Control': 'no-store',
    'Referrer-Policy': 'no-referrer',
    'X-Content-Type-Options': 'nosniff',
  });
  headers.append('Set-Cookie', cookie('', config.origin.startsWith('https:'), 0));
  for (const value of cookies) headers.append('Set-Cookie', value);
  return new Response(null, { status: 303, headers });
}
class GoogleAccountError extends Error {}
const conflict = (code) => {
  throw new GoogleAccountError(code);
};
export async function googleUser(env, profile, target, config) {
  const linked = await one(env, 'SELECT * FROM users WHERE google_sub=?', profile.sub);
  const existing = await one(env, 'SELECT * FROM users WHERE email=?', profile.email);
  if (linked) {
    if (linked.disabled) conflict('disabled');
    if (existing && existing.id !== linked.id) conflict('already_linked');
    return one(
      env,
      'UPDATE users SET email=?,name=?,given_name=?,family_name=?,avatar_url=?,password_enabled=0 WHERE id=? AND google_sub=? AND disabled=0 RETURNING *',
      profile.email,
      profile.name,
      profile.givenName,
      profile.familyName,
      profile.picture,
      linked.id,
      profile.sub,
    );
  }
  // A verified Workspace identity is authoritative for the exact school email.
  // Preserve old account IDs and roles without retaining a password login path.
  if (
    profile.domain !== config.allowedDomain ||
    profile.email.split('@')[1] !== config.allowedDomain
  )
    conflict('school_only');
  const account = existing || target;
  if (account) {
    if (account.disabled) conflict('disabled');
    if (account.google_sub) conflict('already_linked');
    if (!isGuestUser(account) && account.email.toLowerCase() !== profile.email)
      conflict('different_email');
    const updated = await one(
      env,
      'UPDATE users SET google_sub=?,email=?,name=?,given_name=?,family_name=?,avatar_url=?,password_enabled=0 WHERE id=? AND google_sub IS NULL AND disabled=0 RETURNING *',
      profile.sub,
      profile.email,
      profile.name,
      profile.givenName,
      profile.familyName,
      profile.picture,
      account.id,
    );
    if (!updated) conflict('already_linked');
    // AFTER triggers credit the welcome gift after UPDATE RETURNING is evaluated.
    return one(env, 'SELECT * FROM users WHERE id=?', updated.id);
  }
  const uid = id();
  const group = await one(
    env,
    "SELECT id FROM groups ORDER BY CASE WHEN id='2B' THEN 0 ELSE 1 END,id LIMIT 1",
  );
  await run(
    env,
    'INSERT INTO users(id,email,name,password_hash,salt,google_sub,given_name,family_name,avatar_url,password_enabled,group_id) VALUES(?,?,?,?,?,?,?,?,?,0,?)',
    uid,
    profile.email,
    profile.name,
    await hash(random()),
    random(),
    profile.sub,
    profile.givenName,
    profile.familyName,
    profile.picture,
    group?.id || null,
  );
  return one(env, 'SELECT * FROM users WHERE id=?', uid);
}

// Provider dependencies can be injected in unit tests; runtime endpoints and keys stay fixed.
export function createGoogleRoute({
  exchange = exchangeGoogleCode,
  verify = verifyGoogleToken,
  report = (event) => console.warn('lanet.google.failure', JSON.stringify(event)),
} = {}) {
  return async (request, env, path) => {
    const config = googleConfig(env);
    if (!config)
      fail(503, 'L’accés amb Google no està disponible ara mateix. Torna-ho a provar més tard.');
    if (path === '/api/auth/google/start') {
      if (new URL(request.headers.get('Origin') || request.url).origin !== config.origin)
        fail(
          503,
          'L’adreça actual no coincideix amb la configuració de Google. Obre La Net des de la seva adreça habitual.',
        );
      await limit(env, request, 'google-start', 12);
      const b = await body(request);
      if (b.intent !== 'login') fail(400, 'Inicia sessió amb Google per continuar.');
      const target = await legacyGoogleGuest(request, env);
      const state = random(),
        binding = random(),
        nonce = random(),
        verifier = random();
      await run(env, 'DELETE FROM google_auth_flows WHERE expires<=?', Date.now());
      await run(
        env,
        'INSERT INTO google_auth_flows(state_hash,binding_hash,nonce,verifier,redirect_uri,user_id,session_hash,expires) VALUES(?,?,?,?,?,?,?,?)',
        await hash(state),
        await hash(binding),
        nonce,
        verifier,
        config.redirectUri,
        target?.id || null,
        target ? await hash(sessionToken(request)) : null,
        Date.now() + 600000,
      );
      const digest = new Uint8Array(
        await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier)),
      );
      const challenge = btoa(String.fromCharCode(...digest))
        .replaceAll('+', '-')
        .replaceAll('/', '_')
        .replaceAll('=', '');
      const url = new URL('https://accounts.google.com/o/oauth2/v2/auth');
      url.search = new URLSearchParams({
        client_id: config.clientId,
        redirect_uri: config.redirectUri,
        response_type: 'code',
        scope: 'openid email profile',
        state,
        nonce,
        code_challenge: challenge,
        code_challenge_method: 'S256',
        prompt: 'select_account',
        hd: config.allowedDomain,
      }).toString();
      return json({ url: url.href }, 200, {
        'Set-Cookie': cookie(binding, config.origin.startsWith('https:'), 600),
      });
    }
    if (path !== '/api/auth/google/callback') fail(404, 'Aquest accés no existeix.');
    const params = new URL(request.url).searchParams;
    const state = params.get('state'),
      binding = cookieValue(request);
    if (
      !/^[\w-]{43}$/.test(state || '') ||
      !binding ||
      ['state', 'code', 'error', 'iss'].some((k) => params.getAll(k).length > 1)
    )
      return redirect(config, 'expired');
    // DELETE RETURNING consumes exactly once, also across concurrent callbacks.
    const flow = await one(
      env,
      'DELETE FROM google_auth_flows WHERE state_hash=? AND binding_hash=? AND expires>? AND redirect_uri=? RETURNING *',
      await hash(state),
      await hash(binding),
      Date.now(),
      config.redirectUri,
    );
    if (!flow) return redirect(config, 'expired');
    let stage = 'session_check';
    try {
      let target = null;
      if (flow.user_id) {
        try {
          target = await legacyGoogleGuest(request, env);
        } catch (error) {
          if (error.status === 401) return redirect(config, 'session_changed');
          throw error;
        }
        if (
          !target ||
          target.id !== flow.user_id ||
          (await hash(sessionToken(request))) !== flow.session_hash
        )
          return redirect(config, 'session_changed');
      }
      if (params.has('error'))
        return redirect(
          config,
          params.get('error') === 'access_denied' ? 'cancelled' : 'unavailable',
        );
      if (
        params.has('iss') &&
        !['https://accounts.google.com', 'accounts.google.com'].includes(params.get('iss'))
      )
        return redirect(config, 'invalid');
      const code = params.get('code');
      if (!code || code.length > 4096) return redirect(config, 'invalid');
      stage = 'exchange';
      const tokens = await exchange(code, flow, config);
      stage = 'verify';
      const verified = await verify(tokens.id_token, config, flow.nonce);
      stage = 'profile';
      const profile = await completeGoogleProfile(verified, tokens);
      stage = 'account';
      const user = await googleUser(env, profile, target, config);
      stage = 'session';
      if (target) {
        if (user.id === target.id)
          await run(env, 'DELETE FROM sessions WHERE user_id=?', target.id);
        else await run(env, 'DELETE FROM sessions WHERE hash=?', flow.session_hash);
      }
      const result = await session(user, request, env);
      return redirect(config, 'connected', [result.headers.get('Set-Cookie')]);
    } catch (error) {
      const result = error instanceof GoogleAccountError ? error.message : 'invalid';
      // Opt-in diagnostics contain fixed stages/codes only, never provider data or error text.
      if (env.GOOGLE_AUTH_DIAGNOSTICS === 'true') {
        const codes = new Set([
          'ERR_JWKS_TIMEOUT',
          'ERR_JWKS_NO_MATCHING_KEY',
          'ERR_JWT_EXPIRED',
          'ERR_JWT_CLAIM_VALIDATION_FAILED',
          'ERR_JWS_SIGNATURE_VERIFICATION_FAILED',
          'ERR_JOSE_ALG_NOT_ALLOWED',
          'ERR_JWS_INVALID',
          'ERR_JWT_INVALID',
          'ERR_JWK_INVALID',
          'ERR_JWKS_INVALID',
          'ERR_JOSE_NOT_SUPPORTED',
        ]);
        const code = codes.has(error.code)
          ? error.code
          : error instanceof TypeError
            ? 'TypeError'
            : 'unexpected';
        report({ stage, result, code });
      }
      return redirect(config, result);
    }
  };
}
export const googleRoute = createGoogleRoute();
