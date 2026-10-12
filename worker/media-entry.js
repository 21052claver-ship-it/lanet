import media, { inspectCachedImage } from './media-safety.js';
import { PDFiumLibrary } from '@hyzyla/pdfium';
import wasm from '@hyzyla/pdfium/pdfium.wasm';
import { inspectPdf } from './pdf-inspection.js';
import { PDF_SAFETY_POLICY } from './pdf-safety.js';
import { readLimited, MAX_IMAGE_BYTES } from './file-validation.js';
import { HttpError, json, fail } from './utils.js';

// Serialize PDF work so concurrent uploads cannot exhaust the Wasm heap.
let pending = Promise.resolve();
export default {
  async fetch(request, env, ctx) {
    if (new URL(request.url).pathname !== '/inspect-pdf') return media.fetch(request, env, ctx);
    const job = pending.then(async () => {
      let library;
      try {
        if (request.method !== 'POST' || request.headers.get('Content-Type') !== 'application/pdf')
          fail(400, 'Format de PDF no admès.');
        const bytes = await readLimited(request.body, MAX_IMAGE_BYTES, { timeoutMs: 60000 });
        library = await PDFiumLibrary.init({
          instantiateWasm(imports, success) {
            const instance = new WebAssembly.Instance(wasm, imports);
            success(instance, wasm);
            return instance.exports;
          },
        });
        const normalized = await inspectPdf(bytes, env, ctx, library, inspectCachedImage);
        return new Response(normalized, {
          headers: {
            'Content-Type': 'application/pdf',
            'Cache-Control': 'no-store',
            'X-LaNet-Safety': PDF_SAFETY_POLICY,
            'X-Content-Type-Options': 'nosniff',
          },
        });
      } catch (error) {
        return json(
          {
            error:
              error instanceof HttpError
                ? error.message
                : 'La comprovació de PDF no està disponible.',
            ...(error.code === 'image_blocked' ? { code: 'image_blocked' } : {}),
          },
          error instanceof HttpError ? error.status : 503,
        );
      } finally {
        library?.destroy();
      }
    });
    pending = job.then(
      () => {},
      () => {},
    );
    return job;
  },
};
