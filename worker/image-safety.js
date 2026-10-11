import { HttpError, fail } from './utils.js';
import { readLimited, MAX_IMAGE_BYTES, validateFile } from './file-validation.js';
export const IMAGE_SAFETY_POLICY = 'lanet-image-v1';
export async function safeImage(env, bytes, mime) {
  if (!env.MEDIA_SAFETY)
    fail(503, 'La comprovació d’imatges no està disponible. Torna-ho a provar més tard.');
  let response;
  try {
    response = await env.MEDIA_SAFETY.fetch(
      new Request('https://media.internal/inspect', {
        method: 'POST',
        headers: { 'Content-Type': mime },
        body: bytes,
        signal: AbortSignal.timeout(45000),
      }),
    );
  } catch {
    fail(503, 'No s’ha pogut comprovar la imatge. Torna-ho a provar més tard.');
  }
  if (!response.ok) {
    let result;
    try {
      result = await response.json();
    } catch {
      /* Closed by default. */
    }
    const status = [400, 413, 422].includes(response.status) ? response.status : 503;
    const error = new HttpError(
      status,
      typeof result?.error === 'string' && result.error.length < 400
        ? result.error
        : 'No s’ha pogut comprovar la imatge. Torna-ho a provar més tard.',
    );
    if (result?.code === 'image_blocked') error.code = 'image_blocked';
    throw error;
  }
  if (
    response.headers.get('X-LaNet-Safety') !== IMAGE_SAFETY_POLICY ||
    response.headers.get('Content-Type') !== 'image/webp'
  )
    fail(503, 'La comprovació de la imatge no s’ha completat. Torna-ho a provar.');
  const normalized = await readLimited(response.body, MAX_IMAGE_BYTES);
  validateFile(normalized, 'imatge.webp');
  return normalized;
}
