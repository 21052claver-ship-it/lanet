// One Google request owns the button until navigation, failure or a BFCache return.
export function createGoogleSession({ request, navigate, onChange, timeoutMs = 15000 }) {
  let controller = null;
  let revision = 0;
  let disposed = false;
  return {
    get pending() {
      return !!controller;
    },
    async start() {
      if (controller || disposed) return false;
      const own = new AbortController();
      controller = own;
      const generation = ++revision;
      onChange({ busy: true, error: '' });
      const timeout = setTimeout(
        () => own.abort(new DOMException('Google request timed out', 'TimeoutError')),
        timeoutMs,
      );
      try {
        const { url } = await request('/auth/google/start', {
          method: 'POST',
          body: { intent: 'login' },
          signal: own.signal,
        });
        if (disposed || revision !== generation) return false;
        if (own.signal.aborted) throw new Error('Google request aborted');
        let destination;
        try {
          destination = new URL(url);
        } catch {
          throw new Error('No s’ha pogut obrir Google. Torna-ho a provar.');
        }
        if (
          destination.origin !== 'https://accounts.google.com' ||
          destination.pathname !== '/o/oauth2/v2/auth' ||
          destination.username ||
          destination.password ||
          destination.hash
        )
          throw new Error('No s’ha pogut obrir Google. Torna-ho a provar.');
        navigate(destination.href);
        return true;
      } catch (error) {
        if (!disposed && revision === generation) {
          controller = null;
          onChange({
            busy: false,
            error: own.signal.aborted
              ? 'La connexió està trigant massa. Torna-ho a provar.'
              : error.message || 'No s’ha pogut obrir Google. Torna-ho a provar.',
          });
        }
        return false;
      } finally {
        clearTimeout(timeout);
      }
    },
    reset() {
      ++revision;
      controller?.abort();
      controller = null;
      if (!disposed) onChange({ busy: false, error: '' });
    },
    dispose() {
      disposed = true;
      ++revision;
      controller?.abort();
      controller = null;
    },
  };
}
