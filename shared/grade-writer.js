// One queue for the signed-in session, including navigation between pages.
export function createGradeWriter({ getGrade, save, onChange }) {
  let queue = Promise.resolve(),
    pending = 0,
    version = 0;
  const desired = new Map(),
    failed = new Map();
  let history = [];
  const snapshot = () => ({
    busy: pending > 0,
    failed: [...failed.values()].map(({ id, grade }) => ({ id, grade })),
    canUndo: pending === 0 && failed.size === 0 && history.length > 0,
  });
  const emit = () => onChange?.(snapshot());
  function write(input, { remember = true, undoToken = null, force = false } = {}) {
    const entries = [...new Map(input.map((entry) => [entry.id, entry])).values()].filter(
      (entry) =>
        force ||
        failed.has(entry.id) ||
        (desired.has(entry.id) ? desired.get(entry.id).grade : getGrade(entry.id)) !== entry.grade,
    );
    if (!entries.length) {
      if (undoToken !== null) {
        history = history.filter((item) => item.token !== undoToken);
        emit();
      }
      return Promise.resolve(true);
    }
    const ticket = ++version;
    for (const entry of entries) {
      desired.set(entry.id, { grade: entry.grade, ticket });
      failed.delete(entry.id);
    }
    pending++;
    emit();
    const job = queue.then(async () => {
      const previous = entries.map((entry) => ({
        id: entry.id,
        grade: getGrade(entry.id) ?? null,
      }));
      try {
        await save(entries);
        if (remember) history.push({ token: ticket, entries: previous });
        if (undoToken !== null) history = history.filter((item) => item.token !== undoToken);
        for (const entry of entries) {
          if (desired.get(entry.id)?.ticket === ticket) {
            desired.delete(entry.id);
            failed.delete(entry.id);
          }
        }
        return true;
      } catch {
        for (const entry of entries) {
          if (desired.get(entry.id)?.ticket === ticket)
            failed.set(entry.id, { ...entry, remember, undoToken });
        }
        return false;
      } finally {
        pending--;
        emit();
      }
    });
    queue = job;
    return job;
  }
  return {
    write,
    snapshot,
    undo() {
      if (!snapshot().canUndo) return Promise.resolve(false);
      const previous = history[history.length - 1];
      return write(previous.entries, { remember: false, undoToken: previous.token });
    },
    retry() {
      const groups = new Map();
      for (const entry of failed.values()) {
        const key = `${entry.remember}:${entry.undoToken}`;
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key).push(entry);
      }
      return Promise.all(
        [...groups.values()].map((entries) =>
          write(
            entries.map(({ id, grade }) => ({ id, grade })),
            { remember: entries[0].remember, undoToken: entries[0].undoToken, force: true },
          ),
        ),
      );
    },
    reconcile(ids) {
      for (const id of failed.keys())
        if (!ids.has(id)) {
          failed.delete(id);
          desired.delete(id);
        }
      history = history.filter((item) => item.entries.every((entry) => ids.has(entry.id)));
      emit();
    },
  };
}
