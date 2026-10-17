import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calendarSession,
  communityLocation,
  communityURL,
} from '../shared/workspace-navigation.js';

test('community and delegate links round-trip while keeping unrelated subject context', () => {
  const href = 'http://localhost/?subject=math&contents=formula#community';
  const state = { tab: 'delegates', delegates: 'published' };
  const url = communityURL(href, state);
  assert.deepEqual(communityLocation(url), state);
  assert.equal(url.searchParams.get('subject'), 'math');
  assert.equal(url.searchParams.get('contents'), 'formula');
  assert.equal(url.hash, '#community');
  const notices = communityURL(url, { tab: 'notices', delegates: 'contacts' });
  assert.equal(notices.searchParams.has('community'), false);
  assert.equal(notices.searchParams.has('delegates'), false);
  assert.deepEqual(communityLocation('http://localhost/?community=unknown&delegates=other'), {
    tab: 'notices',
    delegates: 'pending',
  });
});

test('calendar context survives a same-day return and expires on a new day', () => {
  const value = { today: '2026-10-17', date: '2026-11-03', showCompleted: true };
  assert.deepEqual(calendarSession(value, value.today), value);
  assert.deepEqual(calendarSession(value, '2026-10-18'), {
    today: '2026-10-18',
    date: '2026-10-18',
    showCompleted: false,
  });
  assert.equal(
    calendarSession({ ...value, showCompleted: 'false' }, value.today).showCompleted,
    false,
  );
});

test('damaged session data cannot navigate the calendar to an invalid date', () => {
  const today = '2026-10-17';
  for (const date of ['2026-02-30', '2026-13-01', 'hello', {}, null])
    assert.deepEqual(calendarSession({ today, date, showCompleted: true }, today), {
      today,
      date: today,
      showCompleted: false,
    });
  for (const value of [null, [], 'bad', 0]) assert.equal(calendarSession(value, today).date, today);
});
