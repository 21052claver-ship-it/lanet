export function allowedOrigin(origin, requestUrl, env) {
  if (!origin || origin === new URL(requestUrl).origin) return true;
  if (env.DEMO_MODE !== 'true') return false;
  if (/^http:\/\/(127\.0\.0\.1|localhost):(?:5173|8787)$/.test(origin)) return true;
  return (
    /^http:\/\/(127\.0\.0\.1|localhost):\d{1,5}$/.test(env.DEV_ORIGIN || '') &&
    origin === env.DEV_ORIGIN
  );
}

export function allowedRequestOrigin(request, env) {
  const origin = request.headers.get('Origin');
  if (origin) return allowedOrigin(origin, request.url, env);
  // Requests from older clients without Fetch Metadata remain compatible.
  // A missing Origin must never bypass a browser's explicit cross-site signal.
  if (['cross-site', 'same-site'].includes(request.headers.get('Sec-Fetch-Site'))) return false;
  const referer = request.headers.get('Referer');
  if (referer) {
    try {
      return allowedOrigin(new URL(referer).origin, request.url, env);
    } catch {
      return false;
    }
  }
  return true;
}
