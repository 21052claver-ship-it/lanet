import { addDays, dateLabel, timeMinutes } from './domain.js';
import { mergeAdjacentSlots, slotTeacher } from './official-schedule.js';

export function scheduleDate(date, dates) {
  return dates.slice(0, 5).includes(date) ? date : dates[0];
}

export function weekRangeLabel(dates) {
  const first = dates[0],
    last = dates[4];
  return first.slice(0, 7) === last.slice(0, 7)
    ? `${Number(first.slice(8))}–${dateLabel(last, { day: 'numeric', month: 'long', year: 'numeric' })}`
    : `${dateLabel(first, { day: 'numeric', month: 'short', year: 'numeric' })} – ${dateLabel(last, { day: 'numeric', month: 'short', year: 'numeric' })}`;
}

// All intervals in one connected overlap group share the same column count.
// Rechecking only direct neighbours gives different widths and overlapping cards.
export function eventColumns(events) {
  const entries = events
    .map((event) => ({
      event,
      start: timeMinutes(event.start),
      end: event.end ? timeMinutes(event.end) : timeMinutes(event.start) + 60,
    }))
    .sort(
      (a, b) =>
        a.start - b.start || b.end - a.end || String(a.event.id).localeCompare(String(b.event.id)),
    );
  const result = [];
  let group = [],
    lanes = [],
    until = -Infinity;
  const flush = () => {
    result.push(...group.map((entry) => ({ ...entry, total: lanes.length })));
    group = [];
    lanes = [];
    until = -Infinity;
  };
  for (const entry of entries) {
    if (entry.start >= until) flush();
    let lane = lanes.findIndex((end) => end <= entry.start);
    if (lane < 0) lane = lanes.length;
    lanes[lane] = entry.end;
    until = Math.max(until, entry.end);
    group.push({ ...entry, lane });
  }
  flush();
  return result;
}

export function weekClassEvents(dates, slots, offerings, subjects) {
  const offers = new Map(offerings.map((o) => [o.id, o]));
  const courses = new Map(subjects.map((s) => [s.id, s]));
  return mergeAdjacentSlots(slots)
    .filter((slot) => dates[slot.day])
    .map((slot) => {
      const offering = offers.get(slot.offering_id),
        subject = courses.get(offering?.subject_id);
      return {
        id: `class-${slot.id}-${dates[slot.day]}`,
        title: subject?.name || subject?.short || 'Classe',
        date: dates[slot.day],
        start: slot.start,
        end: slot.end,
        body: [...new Set([slotTeacher(slot, offering), slot.note].filter(Boolean))].join('\n'),
        room: slot.room || '',
        visibility: 'private',
      };
    });
}

export function calendarICS(events, now = new Date()) {
  const escape = (value) =>
    String(value || '')
      .replaceAll('\\', '\\\\')
      .replace(/\r\n?|\n/g, '\\n')
      .replaceAll(',', '\\,')
      .replaceAll(';', '\\;');
  const stamp = now
    .toISOString()
    .replace(/[-:]/g, '')
    .replace(/\.\d+Z/, 'Z');
  const compact = (date) => date.replaceAll('-', '');
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//La Net//Calendari//CA',
    'CALSCALE:GREGORIAN',
    'X-WR-TIMEZONE:Europe/Madrid',
    'BEGIN:VTIMEZONE',
    'TZID:Europe/Madrid',
    'BEGIN:DAYLIGHT',
    'DTSTART:19700329T020000',
    'RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=-1SU',
    'TZOFFSETFROM:+0100',
    'TZOFFSETTO:+0200',
    'END:DAYLIGHT',
    'BEGIN:STANDARD',
    'DTSTART:19701025T030000',
    'RRULE:FREQ=YEARLY;BYMONTH=10;BYDAY=-1SU',
    'TZOFFSETFROM:+0200',
    'TZOFFSETTO:+0100',
    'END:STANDARD',
    'END:VTIMEZONE',
  ];
  for (const event of events) {
    const date = compact(event.date);
    lines.push(
      'BEGIN:VEVENT',
      `UID:${escape(event.id)}@lanet`,
      `DTSTAMP:${stamp}`,
      event.start
        ? `DTSTART;TZID=Europe/Madrid:${date}T${event.start.replace(':', '')}00`
        : `DTSTART;VALUE=DATE:${date}`,
      ...(event.start && event.end
        ? [`DTEND;TZID=Europe/Madrid:${date}T${event.end.replace(':', '')}00`]
        : !event.start
          ? [`DTEND;VALUE=DATE:${compact(addDays(event.date, 1))}`]
          : []),
      `SUMMARY:${escape(event.title)}`,
      `DESCRIPTION:${escape(event.body)}`,
      `LOCATION:${escape(event.room)}`,
      `CLASS:${event.visibility === 'private' ? 'PRIVATE' : 'PUBLIC'}`,
      'END:VEVENT',
    );
  }
  lines.push('END:VCALENDAR');
  const encoder = new TextEncoder();
  return (
    lines
      .map((line) => {
        const parts = [];
        let part = '',
          bytes = 0;
        for (const character of line) {
          const size = encoder.encode(character).length;
          if (bytes + size > 75) {
            parts.push(part);
            part = ' ';
            bytes = 1;
          }
          part += character;
          bytes += size;
        }
        return [...parts, part].join('\r\n');
      })
      .join('\r\n') + '\r\n'
  );
}
