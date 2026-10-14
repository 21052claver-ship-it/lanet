import { useEffect, useRef } from 'react';
import { api } from './api';
import { createActivityReporter } from '../shared/activity-reporter';

export function useActivity(userId, page) {
  const currentPage = useRef(page);
  const lastInteraction = useRef(Date.now());
  currentPage.current = page;
  useEffect(() => {
    lastInteraction.current = Date.now();
    let controller;
    const reporter = createActivityReporter({
      send: async (body) => {
        controller = new AbortController();
        const deadline = setTimeout(() => controller?.abort(), 20000);
        try {
          return await api('/activity', { method: 'POST', body, signal: controller.signal });
        } finally {
          clearTimeout(deadline);
          controller = null;
        }
      },
      visible: () => document.visibilityState === 'visible',
      page: () => currentPage.current,
    });
    const interact = () => {
      lastInteraction.current = Date.now();
      reporter.interact();
      reporter.tick();
    };
    const visibility = () => reporter.tick();
    const interval = setInterval(() => reporter.tick(), 30000);
    for (const event of ['pointerdown', 'keydown', 'scroll'])
      window.addEventListener(event, interact, { passive: true });
    document.addEventListener('visibilitychange', visibility);
    reporter.tick();
    return () => {
      reporter.stop();
      controller?.abort();
      clearInterval(interval);
      for (const event of ['pointerdown', 'keydown', 'scroll'])
        window.removeEventListener(event, interact);
      document.removeEventListener('visibilitychange', visibility);
    };
  }, [userId]);
  return lastInteraction;
}
