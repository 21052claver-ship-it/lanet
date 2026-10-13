// A read started before/during a write cannot replace the state after that write.
export function createDataSync({ read, apply }) {
  let version = 0;
  let writes = 0;
  let reads = 0;
  let deferredRefresh = false;
  async function refresh() {
    const request = ++version;
    deferredRefresh = writes > 0;
    reads++;
    try {
      const result = await read();
      if (request === version && writes === 0) apply(result);
      return result;
    } finally {
      reads--;
    }
  }
  return {
    beginWrite() {
      if (reads > 0) deferredRefresh = true;
      writes++;
      version++;
    },
    endWrite() {
      writes--;
      version++;
      if (writes === 0 && deferredRefresh) {
        // A small reaction may finish last, without requesting its own bootstrap.
        // Recover invalidated reads; an explicit refresh in this turn takes priority.
        queueMicrotask(() => {
          if (writes === 0 && deferredRefresh) void refresh().catch(() => {});
        });
      }
    },
    refresh,
  };
}

export async function runMutation({
  sync,
  write,
  onCommitted,
  onSuccess,
  onError,
  onRefreshError,
}) {
  let result;
  sync.beginWrite();
  try {
    result = await write();
  } catch (error) {
    onError?.(error);
    throw error;
  } finally {
    sync.endWrite();
  }
  onCommitted?.(result);
  try {
    await sync.refresh();
  } catch (error) {
    // The write is confirmed. Retrying a create/bid here could duplicate it.
    onRefreshError?.(error);
    return result;
  }
  onSuccess?.();
  return result;
}

export function privacyAfterFailure(previous, requested) {
  return previous || requested;
}
