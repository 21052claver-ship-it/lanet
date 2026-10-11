// The retired La Net address must not expose an older authentication policy.
// This Worker deliberately has no database/file bindings or OAuth routes.
const destination = 'https://lanet.pages.dev/';
export default {
  fetch(request) {
    const path = new URL(request.url).pathname;
    const headers = {
      'Cache-Control': 'no-store',
      'Referrer-Policy': 'no-referrer',
      'X-Content-Type-Options': 'nosniff',
    };
    if (path === '/api' || path.startsWith('/api/'))
      return Response.json(
        {
          error: 'Aquesta adreça de La Net s’ha traslladat. Entra amb Google a la nova web.',
          url: destination,
        },
        { status: 410, headers },
      );
    return new Response(null, { status: 308, headers: { ...headers, Location: destination } });
  },
};
