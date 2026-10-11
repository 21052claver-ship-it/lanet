export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}
export const fail = (status, message) => {
  throw new HttpError(status, message);
};
export const id = () => crypto.randomUUID();
export const sql = (env, query, ...args) => {
  if (
    args.some(
      (v) => v === undefined || (v !== null && !['string', 'number', 'boolean'].includes(typeof v)),
    )
  )
    fail(400, 'Falta una dada vàlida per completar l’acció.');
  return env.DB.prepare(query).bind(...args.map((v) => (typeof v === 'boolean' ? Number(v) : v)));
};
export const rows = async (env, query, ...args) => (await sql(env, query, ...args).all()).results;
export const one = (env, query, ...args) => sql(env, query, ...args).first();
export const run = (env, query, ...args) => sql(env, query, ...args).run();
export function json(value, status = 200, headers = {}) {
  return new Response(JSON.stringify(value), {
    status,
    headers: {
      'Content-Type': 'application/json;charset=UTF-8',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
      ...headers,
    },
  });
}
export async function body(request) {
  const size = Number(request.headers.get('Content-Length'));
  if (size > 131072) fail(413, 'El text és massa llarg.');
  const reader = request.body?.getReader();
  const chunks = [];
  let length = 0;
  if (reader)
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > 131072) {
        await reader.cancel();
        fail(413, 'El text és massa llarg.');
      }
      chunks.push(value);
    }
  const bytes = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.length;
  }
  const text = new TextDecoder().decode(bytes);
  try {
    const value = JSON.parse(text);
    if (value === null || typeof value !== 'object' || Array.isArray(value))
      fail(400, 'Les dades han de formar un objecte.');
    return value;
  } catch {
    fail(400, 'Les dades no tenen un format vàlid.');
  }
}
export function str(value, max = 300, required = false) {
  const text = typeof value === 'string' ? value.trim() : '';
  if ((required && !text) || text.length > max)
    fail(
      400,
      required && !text
        ? 'Falta un camp obligatori.'
        : `El text ha de tenir com a màxim ${max} caràcters.`,
    );
  return text;
}
export function num(value, min, max) {
  if (!['number', 'string'].includes(typeof value) || (typeof value === 'string' && !value.trim()))
    fail(400, 'Escriu un valor numèric.');
  const n = Number(value);
  if (!Number.isFinite(n) || n < min || n > max)
    fail(400, `El valor ha d’estar entre ${min} i ${max}.`);
  return n;
}
export function integer(value, min, max) {
  const n = num(value, min, max);
  if (!Number.isInteger(n)) fail(400, 'Aquest valor ha de ser un nombre enter.');
  return n;
}
export function choice(value, values) {
  if (!values.includes(value)) fail(400, 'L’opció no és vàlida.');
  return value;
}
export function day(value) {
  const text = str(value, 10, true);
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(text) ||
    !Number.isFinite(new Date(text + 'T12:00:00Z').getTime()) ||
    new Date(text + 'T12:00:00Z').toISOString().slice(0, 10) !== text
  )
    fail(400, 'La data no és vàlida.');
  return text;
}
export function time(value) {
  if (!value) return null;
  const t = str(value, 5);
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(t)) fail(400, 'L’hora no és vàlida.');
  return t;
}
export function privileged(user) {
  return user.role === 'admin' || user.role === 'delegate';
}
export function requireManager(user) {
  if (!privileged(user)) fail(403, 'Aquesta acció és per als delegats i administradors.');
}
export function requireAdmin(user) {
  if (user.role !== 'admin') fail(403, 'Aquesta acció és per als administradors.');
}
export function author(user, record) {
  if (!record) fail(404, 'No s’ha trobat el contingut.');
  if (record.author_id !== user.id && user.role !== 'admin')
    fail(403, 'Només l’autor pot modificar aquest contingut.');
}
export const isGuestUser = (user) =>
  user.id.startsWith('guest:') && user.email.endsWith('@guest.lanet.invalid');
export function publicUser(user) {
  const { password_hash, salt, google_sub, password_enabled, ...safe } = user;
  return {
    ...safe,
    google_connected: !!google_sub,
    has_password: false,
    identity_locked: true,
    is_guest: isGuestUser(user),
  };
}
export async function hash(value) {
  const buffer = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return Array.from(new Uint8Array(buffer), (b) => b.toString(16).padStart(2, '0')).join('');
}
export async function passwordHash(password, salt) {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveBits'],
  );
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: new TextEncoder().encode(salt), iterations: 100000, hash: 'SHA-256' },
    key,
    256,
  );
  return Array.from(new Uint8Array(bits), (b) => b.toString(16).padStart(2, '0')).join('');
}
export function equal(a, b) {
  let result = a.length ^ b.length;
  for (let i = 0; i < Math.max(a.length, b.length); i++)
    result |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  return result === 0;
}
export function validatePassword(value) {
  const p = typeof value === 'string' ? value : '';
  if (p.length < 10 || p.length > 128)
    fail(400, 'La contrasenya ha de tenir entre 10 i 128 caràcters.');
  return p;
}
export async function limit(env, request, scope, max = 20, seconds = 900) {
  const ip = request.headers.get('CF-Connecting-IP') || 'local';
  const window = Math.floor(Date.now() / 1000 / seconds);
  const key = await hash(`${scope}:${ip}:${window}`);
  const row = await one(
    env,
    'INSERT INTO rate_limits(key,count,expires) VALUES(?,1,?) ON CONFLICT(key) DO UPDATE SET count=count+1 RETURNING count',
    key,
    (window + 1) * seconds,
  );
  if (row.count > max) fail(429, 'Massa intents. Torna-ho a provar més tard.');
}
