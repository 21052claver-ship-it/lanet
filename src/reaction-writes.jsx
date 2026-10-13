import { useRef, useState } from 'react';
import { api } from './api';
import { createReactionWriter, reactionKey } from '../shared/reaction-writer';

export function useReactionWrites(data, setData, sync, notify) {
  const latest = useRef(data);
  latest.current = data;
  const [pending, setPending] = useState(new Set());
  const writer = useRef(null);
  if (!writer.current)
    writer.current = createReactionWriter({
      getItem: (resource, id) => latest.current[resource]?.find((item) => item.id === id),
      update: (resource, id, change) =>
        setData((current) => {
          const next = {
            ...current,
            [resource]: current[resource].map((item) => (item.id === id ? change(item) : item)),
          };
          latest.current = next;
          return next;
        }),
      sync,
      onPending: setPending,
      onError: (error) => notify(error.message, 'error'),
      write: async (path, body) => {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 15000);
        try {
          return await api(path, { method: 'POST', body, signal: controller.signal });
        } catch (error) {
          if (controller.signal.aborted)
            throw new Error(
              'No hem pogut confirmar el canvi. Comprova la connexió; tornarem a sincronitzar l’estat.',
            );
          throw error;
        } finally {
          clearTimeout(timeout);
        }
      },
    });
  return {
    toggle: writer.current.toggle,
    isPending: (resource, id, action) => pending.has(reactionKey(resource, id, action)),
  };
}
