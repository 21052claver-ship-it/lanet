import { HttpError, fail } from './utils.js';
import { readLimited, MAX_IMAGE_BYTES, validateFile } from './file-validation.js';

export const PDF_SAFETY_POLICY = 'lanet-pdf-v1';

export async function safePdf(env, bytes) {
  if (!env.MEDIA_SAFETY)
    fail(503, 'La comprovació de PDF no està disponible. Torna-ho a provar més tard.');
  let response;
  try {
    response = await env.MEDIA_SAFETY.fetch(
      new Request('https://media.internal/inspect-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/pdf' },
        body: bytes,
        signal: AbortSignal.timeout(180000),
      }),
    );
  } catch {
    fail(503, 'No s’ha pogut comprovar el PDF. Torna-ho a provar més tard.');
  }
  if (!response.ok) {
    const result = await response.json().catch(() => null);
    const error = new HttpError(
      [400, 413, 422].includes(response.status) ? response.status : 503,
      typeof result?.error === 'string' && result.error.length < 400
        ? result.error
        : 'No s’ha pogut comprovar el PDF. Torna-ho a provar més tard.',
    );
    if (result?.code === 'image_blocked') error.code = 'image_blocked';
    throw error;
  }
  if (
    response.headers.get('X-LaNet-Safety') !== PDF_SAFETY_POLICY ||
    response.headers.get('Content-Type') !== 'application/pdf'
  )
    fail(503, 'La comprovació del PDF no s’ha completat. Torna-ho a provar.');
  const normalized = await readLimited(response.body, MAX_IMAGE_BYTES);
  validateFile(normalized, 'document.pdf');
  return normalized;
}
