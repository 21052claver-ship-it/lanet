// Isolated test double. Never imported by the application or deployed configuration.
// Actual decoding and model reachability are checked separately with the provider.
import { validateFile, readLimited } from '../../worker/file-validation.js';
export default {
  async fetch(request) {
    try {
      const bytes = await readLimited(request.body);
      validateFile(bytes, 'fixture.png');
      const webp = Uint8Array.from(
        atob('UklGRiIAAABXRUJQVlA4IBYAAAAwAQCdASoBAAEADsD+JaQAA3AAAAAA'),
        (c) => c.charCodeAt(0),
      );
      return new Response(webp, {
        headers: { 'Content-Type': 'image/webp', 'X-LaNet-Safety': 'lanet-image-v1' },
      });
    } catch {
      return Response.json({ error: 'Invalid isolated image fixture' }, { status: 400 });
    }
  },
};
