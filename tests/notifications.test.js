import test from 'node:test';
import assert from 'node:assert/strict';
import { acknowledgeNotifications, notificationSummary } from '../shared/notifications.js';

test('bell separates unread notices from review tasks using the same scoped permissions', () => {
  const data = {
    user: { id: 'u', role: 'student' },
    delegation: { managedUnits: ['tech1'] },
    agendaNotifications: [
      { id: 'one', read_at: null },
      { id: 'two', read_at: 'already-read' },
    ],
    agendaProposals: [
      { id: 'pending', visibility: 'shared', review_status: 'pending', review_units: ['tech1'] },
      { id: 'other', visibility: 'shared', review_status: 'pending', review_units: ['social'] },
      { id: 'resolved', visibility: 'shared', review_status: 'returned', review_units: ['tech1'] },
    ],
  };
  assert.deepEqual(notificationSummary(data), {
    unread: 1,
    pending: 1,
    badge: '2',
    hasNotices: true,
    label: '1 notificació sense llegir i 1 proposta per validar',
  });
  assert.equal(notificationSummary({ ...data, user: { role: 'admin' } }).pending, 2);
  assert.equal(notificationSummary({ ...data, agendaNotificationsMoreUnread: true }).badge, '2+');
  assert.equal(notificationSummary({ user: { role: 'student' } }).hasNotices, false);
});

test('confirmed reads preserve concurrent arrivals and previous timestamps without mutating source data', () => {
  const data = {
    agendaNotifications: [
      { id: 'selected', read_at: null },
      { id: 'arrival', read_at: null },
      { id: 'previous', read_at: 'previous-time' },
    ],
    agendaNotificationsMoreUnread: true,
  };
  const next = acknowledgeNotifications(data, {
    ids: ['selected', 'previous'],
    read_at: 'confirmed-time',
  });
  assert.equal(next.agendaNotifications[0].read_at, 'confirmed-time');
  assert.equal(next.agendaNotifications[1].read_at, null);
  assert.equal(next.agendaNotifications[2].read_at, 'previous-time');
  assert.equal(data.agendaNotifications[0].read_at, null);
  assert.equal(next.agendaNotificationsMoreUnread, true);
});
