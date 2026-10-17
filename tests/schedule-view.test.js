import test from 'node:test';
import assert from 'node:assert/strict';
import {
  eventColumns,
  scheduleDate,
  weekRangeLabel,
  weekClassEvents,
  calendarICS,
} from '../shared/schedule-view.js';
import { weekDates, addDays } from '../shared/domain.js';

test('connected overlaps keep a consistent column count without covering a neighbour', () => {
  const events = [
    ['a', '08:10', '09:10'],
    ['b', '08:40', '10:10'],
    ['c', '09:10', '10:10'],
    ['d', '09:25', '09:40'],
    ['separate', '11:00', '12:00'],
  ].map(([id, start, end]) => ({ id, start, end }));
  const before = structuredClone(events),
    layout = eventColumns(events);
  assert.deepEqual(events, before);
  assert.deepEqual(
    layout.map((e) => e.total),
    [3, 3, 3, 3, 1],
  );
  for (const a of layout)
    for (const b of layout)
      if (a !== b && a.start < b.end && b.start < a.end) {
        assert.ok(
          (a.lane + 1) / a.total <= b.lane / b.total || (b.lane + 1) / b.total <= a.lane / a.total,
          'Overlapping times must use disjoint columns',
        );
      }
});
test('adjacent intervals reuse a column and input order does not alter equal-start layout', () => {
  const events = [
    { id: 'b', start: '09:00', end: '10:00' },
    { id: 'a', start: '09:00', end: '10:00' },
    { id: 'c', start: '10:00' },
  ];
  assert.deepEqual(eventColumns(events), eventColumns([...events].reverse()));
  const last = eventColumns(events).at(-1);
  assert.equal(last.lane, 0);
  assert.equal(last.total, 1);
  assert.equal(last.end, 660);
  assert.deepEqual(eventColumns([]), []);
});
test('a long connected series keeps only the peak concurrent column count', () => {
  const events = Array.from({ length: 180 }, (_, i) => {
    const m = 480 + i * 3;
    const time = (m) =>
      `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
    return { id: String(i), start: time(m), end: time(m + 6) };
  });
  const layout = eventColumns(events);
  assert.equal(layout.length, 180);
  assert.ok(layout.every((e) => e.total === 2));
});
test('selected dates remain in the visible school week and range labels include month/year boundaries', () => {
  const dates = weekDates('2026-10-15');
  assert.equal(scheduleDate('2026-10-13', dates), '2026-10-13');
  assert.equal(scheduleDate('2026-10-18', dates), '2026-10-12');
  assert.match(weekRangeLabel(dates), /12–16.*octubre.*2026/);
  const year = weekRangeLabel(weekDates('2026-12-30'));
  assert.match(year, /2026/);
  assert.match(year, /2027/);
  assert.match(year, /des/);
  assert.match(year, /gen/);
});
test('weekly class export preserves actual days, individual teachers, merged hours and private UIDs', () => {
  const dates = weekDates('2026-10-15'),
    slots = [
      { id: 'm1', offering_id: 'math', day: 4, start: '08:10', end: '09:10', room: 'Trias' },
      { id: 'm2', offering_id: 'math', day: 4, start: '09:10', end: '10:10', room: 'Trias' },
      {
        id: 'l1',
        offering_id: 'lit',
        day: 0,
        start: '10:40',
        end: '11:40',
        teacher: 'Professora A',
        room: '4',
      },
      {
        id: 'l2',
        offering_id: 'lit',
        day: 1,
        start: '10:40',
        end: '11:40',
        teacher: 'Professora B',
        room: '5',
      },
      {
        id: 'personal',
        offering_id: 'latin',
        day: 0,
        start: '08:10',
        end: '09:10',
        teacher: '',
        note: 'Treball personal · Llatí online',
      },
    ];
  const offers = [
      { id: 'math', subject_id: 'math', teacher: 'Professor C' },
      { id: 'lit', subject_id: 'lit', teacher: 'General' },
      { id: 'latin', subject_id: 'latin', teacher: 'General' },
    ],
    subjects = [
      { id: 'math', name: 'Matemàtiques II' },
      { id: 'lit', name: 'Literatura catalana' },
      { id: 'latin', name: 'Llatí' },
    ];
  const result = weekClassEvents(dates, slots, offers, subjects);
  assert.equal(result.length, 4);
  const math = result.find((e) => e.title === 'Matemàtiques II');
  assert.equal(math.date, dates[4]);
  assert.equal(math.end, '10:10');
  assert.equal(math.room, 'Trias');
  assert.deepEqual(
    result.filter((e) => e.title === 'Literatura catalana').map((e) => e.body),
    ['Professora A', 'Professora B'],
  );
  assert.equal(result.find((e) => e.title === 'Llatí').body, 'Treball personal · Llatí online');
  assert.ok(result.every((e) => e.visibility === 'private'));
  const next = weekClassEvents(
    dates.map((d) => addDays(d, 7)),
    slots,
    offers,
    subjects,
  );
  assert.ok(result.every((e, i) => e.id !== next[i].id));
  assert.equal(slots[0].end, '09:10');
});
test('calendar export uses Madrid times and exclusive all-day ends with escaped folded UTF-8 lines', () => {
  const title = 'Química, literatura; \\ apunts ' + 'à📚'.repeat(80);
  const ics = calendarICS(
    [
      {
        id: 'timed',
        date: '2026-10-15',
        start: '08:10',
        end: '10:10',
        title,
        body: 'Primera\r\nSegona',
        visibility: 'private',
      },
      { id: 'day', date: '2026-12-31', title: 'Tot el dia', visibility: 'shared' },
    ],
    new Date('2026-10-15T06:00:00Z'),
  );
  const unfolded = ics.replace(/\r\n /g, '');
  assert.match(unfolded, /DTSTART;TZID=Europe\/Madrid:20261015T081000/);
  assert.match(unfolded, /DTEND;TZID=Europe\/Madrid:20261015T101000/);
  assert.match(unfolded, /DTEND;VALUE=DATE:20270101/);
  assert.ok(unfolded.includes('DESCRIPTION:Primera\\nSegona'));
  assert.ok(unfolded.includes('SUMMARY:Química\\, literatura\\; \\\\ apunts '));
  assert.ok(ics.split('\r\n').every((line) => new TextEncoder().encode(line).length <= 75));
  assert.ok(!ics.includes('\uFFFD'));
  assert.match(ics, /CLASS:PRIVATE/);
  assert.match(ics, /CLASS:PUBLIC/);
  assert.ok(ics.endsWith('END:VCALENDAR\r\n'));
});
