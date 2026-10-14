import { ACTIVITY_AREAS, ACTIVITY_INTERVAL, ACTIVE_WINDOW } from './activity.js';

// Kept independent of React to test idle/hidden/failure behavior with a fake clock.
export function createActivityReporter({ send, visible, page, now = Date.now }) {
  let interactedAt = now(),
    sentAt = -Infinity,
    pending = false,
    stopped = false;
  return {
    interact() {
      interactedAt = now();
    },
    stop() {
      stopped = true;
    },
    async tick() {
      const time = now();
      if (
        stopped ||
        pending ||
        !visible() ||
        time - interactedAt >= ACTIVE_WINDOW ||
        time - sentAt < ACTIVITY_INTERVAL ||
        !Object.hasOwn(ACTIVITY_AREAS, page())
      )
        return;
      // Also bound retries after network errors. Never build a queue in browser storage.
      sentAt = time;
      pending = true;
      try {
        await send({ page: page() });
      } catch {
        /* Next normal sample retries. */
      } finally {
        pending = false;
      }
    },
  };
}
