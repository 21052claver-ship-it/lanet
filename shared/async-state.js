// A read started before/during a write cannot replace the state after that write.
export function createDataSync({ read, apply }) {
  let version = 0;
  let writes = 0;
  return {
    beginWrite() {
      writes++;
      version++;
    },
    endWrite() {
      writes--;
      version++;
    },
    async refresh() {
      const request = ++version;
      const result = await read();
      if (request === version && writes === 0) apply(result);
      return result;
    },
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
