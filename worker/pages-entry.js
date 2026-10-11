import app from './index.js';
import { withSecurityHeaders } from './security.js';

// Preview URLs must not become extra authentication or data entry points.
export default {
  async fetch(request, env, ctx) {
    let canonical;
    try {
      canonical = new URL(env.PUBLIC_ORIGIN);
      if (
        canonical.protocol !== 'https:' ||
        canonical.username ||
        canonical.password ||
        canonical.search ||
        canonical.hash ||
        canonical.pathname !== '/'
      )
        throw new Error('Invalid public origin');
    } catch {
      return withSecurityHeaders(
        new Response('La Net encara s’està configurant.', {
          status: 503,
          headers: { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' },
        }),
        request,
      );
    }
    const current = new URL(request.url);
    if (current.origin !== canonical.origin) {
      const headers = { 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer' };
      if (current.pathname === '/api' || current.pathname.startsWith('/api/'))
        return withSecurityHeaders(
          new Response('Obre La Net des de la seva adreça habitual.', {
            status: 421,
            headers,
          }),
          request,
        );
      return withSecurityHeaders(
        new Response(null, { status: 308, headers: { ...headers, Location: canonical.href } }),
        request,
      );
    }
    return app.fetch(request, env, ctx);
  },
};
