// Bound concurrency, retain original ordering, and preserve successful uploads
// when another file is rejected. The caller can publish incremental progress.
export async function uploadQueue(items, send, { concurrency = 3, onProgress } = {}) {
  if (!Number.isInteger(concurrency) || concurrency < 1 || concurrency > 3)
    throw new Error('Upload concurrency must be between one and three.');
  const list = Array.from(items),
    results = new Array(list.length);
  let next = 0,
    completed = 0;
  async function worker() {
    while (next < list.length) {
      const index = next++;
      try {
        results[index] = { status: 'fulfilled', value: await send(list[index]), index };
      } catch (reason) {
        results[index] = { status: 'rejected', reason, index };
      }
      completed++;
      onProgress?.({ completed, total: list.length, results: [...results] });
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, list.length) }, worker));
  return results;
}
