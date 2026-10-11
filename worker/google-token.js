import { createRemoteJWKSet, jwtVerify } from 'jose';
import { equal, fail } from './utils.js';
const keys = createRemoteJWKSet(new URL('https://www.googleapis.com/oauth2/v3/certs'), {
  timeoutDuration: 8000,
});
export function googlePicture(value) {
  if (typeof value !== 'string' || value.length > 2048) return '';
  try {
    const url = new URL(value);
    return url.protocol === 'https:' &&
      !url.username &&
      !url.password &&
      !url.port &&
      url.hostname.endsWith('.googleusercontent.com')
      ? url.href
      : '';
  } catch {
    return '';
  }
}
const text = (value, max) => (typeof value === 'string' ? value.trim().slice(0, max) : '');
function profileFields(p) {
  const givenName = text(p.given_name, 128),
    familyName = text(p.family_name, 128);
  return {
    givenName,
    familyName,
    name: text(p.name, 256) || [givenName, familyName].filter(Boolean).join(' ').slice(0, 256),
    picture: googlePicture(p.picture),
  };
}
export async function verifyGoogleToken(token, config, nonce, keySet = keys) {
  if (typeof token !== 'string' || token.length > 20000)
    fail(401, 'No s’ha pogut verificar Google.');
  const { payload: p } = await jwtVerify(token, keySet, {
    algorithms: ['RS256'],
    issuer: ['https://accounts.google.com', 'accounts.google.com'],
    audience: config.clientId,
    requiredClaims: ['sub', 'iss', 'aud', 'exp', 'iat', 'nonce', 'email', 'email_verified'],
    clockTolerance: 5,
    maxTokenAge: '10 minutes',
  });
  if (
    typeof p.sub !== 'string' ||
    !/^[\x21-\x7e]{1,255}$/.test(p.sub) ||
    typeof p.nonce !== 'string' ||
    !equal(p.nonce, nonce) ||
    p.email_verified !== true ||
    (p.azp !== undefined && p.azp !== config.clientId) ||
    (Array.isArray(p.aud) && p.aud.length > 1 && p.azp !== config.clientId)
  )
    fail(401, 'No s’ha pogut verificar Google.');
  const email = text(p.email, 255).toLowerCase();
  if (
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
    email.length > 254 ||
    email.endsWith('@guest.lanet.invalid')
  )
    fail(401, 'Google no ha facilitat un correu verificat vàlid.');
  const fields = profileFields(p);
  return {
    sub: p.sub,
    email,
    domain: text(p.hd, 253).toLowerCase(),
    ...fields,
    name: fields.name || email.split('@')[0],
  };
}
export async function completeGoogleProfile(profile, tokens, providerFetch = fetch) {
  if (!tokens.access_token || (profile.givenName && profile.familyName && profile.picture))
    return profile;
  let data;
  try {
    const response = await providerFetch('https://openidconnect.googleapis.com/v1/userinfo', {
      headers: { Authorization: `Bearer ${tokens.access_token}`, Accept: 'application/json' },
      signal: AbortSignal.timeout(8000),
      redirect: 'manual',
    });
    if (!response.ok) return profile;
    data = await response.json();
  } catch {
    return profile;
  }
  if (data.sub !== profile.sub) fail(401, 'No s’ha pogut verificar el perfil de Google.');
  const fields = profileFields(data);
  return {
    ...profile,
    givenName: profile.givenName || fields.givenName,
    familyName: profile.familyName || fields.familyName,
    picture: profile.picture || fields.picture,
    name: fields.name || profile.name,
  };
}
export async function exchangeGoogleCode(code, flow, config, providerFetch = fetch) {
  const response = await providerFetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
    body: new URLSearchParams({
      code,
      client_id: config.clientId,
      client_secret: config.clientSecret,
      redirect_uri: flow.redirect_uri,
      grant_type: 'authorization_code',
      code_verifier: flow.verifier,
    }),
    signal: AbortSignal.timeout(10000),
    redirect: 'manual',
  });
  if (!response.ok) fail(401, 'Google no ha pogut completar l’accés.');
  const data = await response.json();
  return { id_token: data.id_token, access_token: data.access_token };
}
