export const CONTENT_SECURITY_POLICY =
  "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' blob: data: https://*.googleusercontent.com; font-src 'self'; connect-src 'self'; media-src 'self' blob:; worker-src 'self' blob:; frame-src 'self' blob:; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'";

// Pages _headers only covers static assets; generated responses need these too.
export function withSecurityHeaders(response, request) {
  const headers = new Headers(response.headers);
  const defaults = {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
    'Content-Security-Policy': CONTENT_SECURITY_POLICY,
  };
  for (const [name, value] of Object.entries(defaults))
    if (!headers.has(name)) headers.set(name, value);
  if (new URL(request.url).protocol === 'https:')
    headers.set('Strict-Transport-Security', 'max-age=31536000');
  if (
    new URL(request.url).pathname.startsWith('/api/') &&
    !headers.get('Cache-Control')?.includes('no-store')
  )
    headers.set('Cache-Control', 'no-store');
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}
