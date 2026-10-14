// Preserve the order of user intent when requests have different network delays.
// Pending patches share one write, with the latest value for each field winning.
export function createPreferenceWriter(write) {
  let queued = null;
  let writing = false;
  async function drain() {
    if (writing) return;
    writing = true;
    while (queued) {
      const batch = queued;
      queued = null;
      try {
        const result = await write(batch.patch);
        for (const waiter of batch.waiters) waiter.resolve({ result, patch: batch.patch });
      } catch (error) {
        for (const waiter of batch.waiters) waiter.reject(error);
      }
    }
    writing = false;
  }
  return (patch) =>
    new Promise((resolve, reject) => {
      if (!queued) queued = { patch: {}, waiters: [] };
      Object.assign(queued.patch, patch);
      queued.waiters.push({ resolve, reject });
      void drain();
    });
}
