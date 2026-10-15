import { canManageEvent } from './delegation.js';

export const NOTIFICATION_LIMIT = 100;

export function notificationSummary(data) {
  const unread = (data.agendaNotifications || []).filter((n) => !n.read_at).length;
  const pending = (data.agendaProposals || []).filter(
    (e) => e.review_status === 'pending' && canManageEvent(data.user, e, data.delegation),
  ).length;
  const count = unread + pending;
  const more = !!data.agendaNotificationsMoreUnread;
  return {
    unread,
    pending,
    badge: more ? `${count}+` : String(count),
    label: more
      ? `Com a mínim ${count + 1} avisos pendents`
      : `${unread} ${unread === 1 ? 'notificació' : 'notificacions'} sense llegir i ${pending} ${pending === 1 ? 'proposta' : 'propostes'} per validar`,
    hasNotices: count > 0 || more,
  };
}

// Apply only the IDs acknowledged by the server, preserving arrivals during the request.
export function acknowledgeNotifications(data, { ids, read_at }) {
  const selected = new Set(ids);
  return {
    ...data,
    agendaNotifications: (data.agendaNotifications || []).map((n) =>
      selected.has(n.id) && !n.read_at ? { ...n, read_at } : n,
    ),
  };
}
