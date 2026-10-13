const fields = { like: ['liked', 'likes'], save: ['saved'], vote: ['voted', 'votes'] };
export function reactionKey(resource, id, action) {
  if (!(
    (['notes', 'pluses'].includes(resource) && ['like', 'save'].includes(action)) ||
    (resource === 'proposals' && action === 'vote')
  ))
    throw new Error('Reacció no vàlida.');
  return `${resource}/${id}/${action}`;
}
function patch(item, action, active) {
  const [flag, count] = fields[action];
  const next = { ...item, [flag]: active };
  if (count)
    next[count] = Math.max(0, Number(item[count] || 0) + Number(active) - Number(!!item[flag]));
  return next;
}
function confirm(item, action, result) {
  const [flag, count] = fields[action],
    value = result?.reaction;
  if (!value || ![true, false, 0, 1].includes(value[flag])) return item;
  const next = { ...item, [flag]: !!value[flag] };
  if (count && Number.isInteger(value[count]) && value[count] >= 0) next[count] = value[count];
  return next;
}
// Shared by every view in the signed-in session. Only the affected fields change.
export function createReactionWriter({ getItem, update, sync, write, onPending, onError }) {
  const pending = new Set();
  let reconcile = false;
  return {
    isPending: (resource, id, action) => pending.has(reactionKey(resource, id, action)),
    async toggle(resource, id, action) {
      const key = reactionKey(resource, id, action),
        item = getItem(resource, id);
      if (pending.has(key) || !item) return false;
      const previous = !!item[fields[action][0]];
      pending.add(key);
      sync.beginWrite();
      onPending?.(new Set(pending));
      update(resource, id, (current) => patch(current, action, !previous));
      let failed = false;
      try {
        const result = await write('/' + key, { active: !previous });
        update(resource, id, (current) => confirm(current, action, result));
      } catch (error) {
        failed = true;
        reconcile = true;
        update(resource, id, (current) => patch(current, action, previous));
        onError?.(error);
      } finally {
        sync.endWrite();
        pending.delete(key);
        onPending?.(new Set(pending));
      }
      // A lost POST response may still have committed. Reconcile without holding the button.
      if (reconcile && pending.size === 0) {
        reconcile = false;
        void sync.refresh().catch(() => {});
      }
      return !failed;
    },
  };
}
