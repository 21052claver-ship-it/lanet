export const GOOGLE_CALLBACK = '/api/auth/google/callback';
export function googleConfig(env) {
  const clientId = typeof env.GOOGLE_CLIENT_ID === 'string' ? env.GOOGLE_CLIENT_ID.trim() : '';
  const clientSecret =
    typeof env.GOOGLE_CLIENT_SECRET === 'string' ? env.GOOGLE_CLIENT_SECRET.trim() : '';
  const allowedDomain = (env.GOOGLE_ALLOWED_DOMAIN || 'fje.edu').trim().toLowerCase();
  if (
    !clientId ||
    !clientSecret ||
    !/^[\w-]+\.apps\.googleusercontent\.com$/.test(clientId) ||
    !/^[a-z0-9]+(?:[.-][a-z0-9]+)+$/.test(allowedDomain)
  )
    return null;
  try {
    const uri = new URL(env.GOOGLE_REDIRECT_URI);
    const local = ['127.0.0.1', 'localhost', '[::1]'].includes(uri.hostname);
    if (
      (uri.protocol !== 'https:' && !(local && uri.protocol === 'http:')) ||
      uri.username ||
      uri.password ||
      uri.search ||
      uri.hash ||
      uri.pathname !== GOOGLE_CALLBACK
    )
      return null;
    return { clientId, clientSecret, redirectUri: uri.href, origin: uri.origin, allowedDomain };
  } catch {
    return null;
  }
}
export const googleAvailable = (env) => !!googleConfig(env);
