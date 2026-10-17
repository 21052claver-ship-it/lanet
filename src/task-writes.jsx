import { useRef, useState } from 'react';

// Every entry point shares the same pending write and confirmed personal state.
export function useTaskWrites(mutate, setData) {
  const pending = useRef(new Set());
  const [drafts, setDrafts] = useState({});
  async function setDone(event, done) {
    if (pending.current.has(event.id)) return;
    pending.current.add(event.id);
    setDrafts((current) => ({ ...current, [event.id]: done }));
    try {
      await mutate('/events/' + event.id + '/progress', { done }, undefined, () =>
        setData((current) => ({
          ...current,
          events: current.events.map((e) => (e.id === event.id ? { ...e, done: Number(done) } : e)),
        })),
      );
    } catch {
      // mutate reports the error; removing the draft restores the saved value.
    } finally {
      pending.current.delete(event.id);
      setDrafts((current) => {
        const next = { ...current };
        delete next[event.id];
        return next;
      });
    }
  }
  const hasDraft = (event) => Object.prototype.hasOwnProperty.call(drafts, event.id);
  return {
    setDone,
    isPending: hasDraft,
    isDone: (event) => (hasDraft(event) ? drafts[event.id] : !!event.done),
  };
}
