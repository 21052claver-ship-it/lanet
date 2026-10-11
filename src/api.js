export async function api(path, options = {}) {
  const { timeoutMs = 20000, ...requestOptions } = options;
  const read = !requestOptions.method || requestOptions.method === 'GET';
  const controller = read && !requestOptions.signal ? new AbortController() : null;
  const deadline = controller ? setTimeout(() => controller.abort(), timeoutMs) : null;
  try {
    const response = await fetch('/api' + path, {
      credentials: 'same-origin',
      ...requestOptions,
      ...(controller ? { signal: controller.signal } : {}),
      headers: {
        ...(options.body instanceof Blob ? {} : { 'Content-Type': 'application/json' }),
        ...options.headers,
      },
      body:
        options.body === undefined
          ? undefined
          : options.body instanceof Blob
            ? options.body
            : JSON.stringify(options.body),
    });
    let result;
    try {
      result = await response.json();
    } catch {
      throw new Error('No s’ha pogut connectar amb La Net.');
    }
    if (!response.ok) {
      const error = new Error(result.error || 'No s’ha pogut completar l’acció.');
      error.status = response.status;
      if (typeof result.code === 'string') error.code = result.code;
      if (Number.isFinite(result.retry_after)) error.retryAfter = result.retry_after;
      if (response.status === 401) window.dispatchEvent(new Event('lanet:sessionexpired'));
      throw error;
    }
    return result;
  } catch (error) {
    if (controller?.signal.aborted)
      throw new Error('La connexió triga massa. Comprova la connexió i torna a obrir La Net.');
    throw error;
  } finally {
    if (deadline !== null) clearTimeout(deadline);
  }
}
export async function upload(file, purpose = 'content') {
  return api('/files', {
    method: 'POST',
    headers: {
      'X-File-Name': encodeURIComponent(file.name),
      'X-Upload-Purpose': purpose,
      'Content-Type': file.type || 'application/octet-stream',
    },
    body: file,
  });
}
export function download(name, text, type = 'text/plain') {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.hidden = true;
  a.tabIndex = -1;
  document.body.append(a);
  a.click();
  // Keep the attached link and blob alive while Safari begins the download.
  setTimeout(() => {
    a.remove();
    URL.revokeObjectURL(url);
  }, 10000);
}
