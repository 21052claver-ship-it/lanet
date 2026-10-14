import React, { useState } from 'react';
import { useApp } from '../context';
import { Tabs } from '../ui';
import { DAYS, DAYS_SHORT, timeMinutes, scheduleBounds, dateLabel } from '../../shared/domain';
import {
  mergeAdjacentSlots,
  slotTeacher,
  schoolScheduleBounds,
} from '../../shared/official-schedule';

function label(minutes) {
  return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
}
function eventLanes(events) {
  const lanes = [];
  const result = events.map((event) => {
    const start = timeMinutes(event.start);
    const end = event.end ? timeMinutes(event.end) : start + 60;
    let lane = lanes.findIndex((until) => until <= start);
    if (lane < 0) lane = lanes.length;
    lanes[lane] = end;
    return { event, start, end, lane };
  });
  return result.map((entry) => ({
    ...entry,
    total:
      Math.max(
        ...result.filter((r) => r.start < entry.end && entry.start < r.end).map((r) => r.lane),
      ) + 1,
  }));
}
export default function WeekTimeline({ dates, slots, events, context, eventCard }) {
  const { data, subject, open } = useApp();
  const [day, setDay] = useState(() => Math.max(0, dates.slice(0, 5).indexOf(data.today)));
  const bounds = schoolScheduleBounds(slots, data.schoolSchedule) || scheduleBounds(slots);
  const mergedSlots = mergeAdjacentSlots(slots);
  const breaks = data.schoolSchedule?.breaks || [];
  const range = bounds.end - bounds.start;
  const percent = (minutes) => `${((minutes - bounds.start) / range) * 100}%`;
  const position = (start, end) => ({
    top: `calc(${percent(Math.max(bounds.start, start))} + 3px)`,
    height: `calc(${((Math.min(bounds.end, end) - Math.max(bounds.start, start)) / range) * 100}% - 6px)`,
  });
  const ticks = [
    ...new Set([
      bounds.start,
      bounds.end,
      ...breaks.flatMap((b) => [timeMinutes(b.start), timeMinutes(b.end)]),
      ...(slots.some((s) => s.day < 5)
        ? []
        : Array.from({ length: Math.ceil(range / 60) }, (_, i) => bounds.start + i * 60)),
      ...slots.filter((s) => s.day < 5).flatMap((s) => [timeMinutes(s.start), timeMinutes(s.end)]),
    ]),
  ]
    .filter((n) => n >= bounds.start && n <= bounds.end)
    .sort((a, b) => a - b);
  const visibleLabels = ticks.filter((n, i) => !i || n - ticks[i - 1] >= 25);
  const hasAllDayEvents = events.some(
    (event) => !event.start && dates.slice(0, 5).includes(event.date),
  );
  return (
    <>
      <Tabs
        className="timetable-days"
        label="Dia de l’horari"
        value={String(day)}
        onChange={(value) => setDay(Number(value))}
        items={dates
          .slice(0, 5)
          .map((d, i) => [String(i), `${DAYS_SHORT[i]} ${Number(d.slice(8))}`])}
      />
      <div
        className={`timetable timeline-mode ${context ? 'context-classes' : ''}`}
        style={{ '--timeline-minutes': range }}
      >
        <div className="time-heading">Hora</div>
        {dates.slice(0, 5).map((d, i) => (
          <div
            key={d}
            data-current={i === day}
            className={`week-heading ${d === data.today ? 'today' : ''}`}
          >
            <span>{DAYS_SHORT[i]}</span>
            <strong>{Number(d.slice(8))}</strong>
          </div>
        ))}
        {hasAllDayEvents && (
          <>
            <div className="all-day-label">Tot el dia</div>
            {dates.slice(0, 5).map((d, i) => (
              <div
                data-current={i === day}
                className={`all-day-cell ${d === data.today ? 'today-col' : ''}`}
                key={'all' + d}
              >
                {events.filter((e) => e.date === d && !e.start).map((e) => eventCard(e, true))}
              </div>
            ))}
          </>
        )}
        <div className="timeline-axis">
          {visibleLabels.map((n) => (
            <span key={n} style={{ top: percent(n) }}>
              {label(n)}
            </span>
          ))}
        </div>
        {dates.slice(0, 5).map((d, dayIndex) => {
          const dailySlots = mergedSlots.filter((s) => s.day === dayIndex);
          const dailyEvents = events
            .filter(
              (e) =>
                e.date === d &&
                e.start &&
                timeMinutes(e.start) < bounds.end &&
                (e.end ? timeMinutes(e.end) : timeMinutes(e.start) + 60) > bounds.start,
            )
            .sort((a, b) => a.start.localeCompare(b.start));
          const dailyBreaks = breaks.filter(
            (b) =>
              dailySlots.some((s) => s.end <= b.start) &&
              dailySlots.some((s) => s.start >= b.end) &&
              !dailySlots.some((s) => s.start < b.end && s.end > b.start),
          );
          return (
            <div
              key={d}
              data-current={dayIndex === day}
              className={`timeline-day ${d === data.today ? 'today-col' : ''}`}
              aria-label={dateLabel(d, { weekday: 'long', day: 'numeric', month: 'long' })}
            >
              {ticks.map((n) => (
                <span className="timeline-line" key={n} style={{ top: percent(n) }} />
              ))}
              {dailyBreaks.map((b) => (
                <div
                  key={b.start}
                  className="timeline-break"
                  style={position(timeMinutes(b.start), timeMinutes(b.end))}
                  aria-label={`${b.start}–${b.end} · ${b.label}`}
                >
                  <span className={dayIndex === 2 ? '' : 'day-break-label'}>
                    {b.start}–{b.end} · {b.label}
                  </span>
                </div>
              ))}
              {dailySlots.map((slot) => {
                const offering = data.offerings.find((o) => o.id === slot.offering_id);
                const s = subject(offering?.subject_id);
                const underExam = dailyEvents.some(
                  (e) =>
                    e.kind === 'exam' &&
                    timeMinutes(e.start) < timeMinutes(slot.end) &&
                    (e.end ? timeMinutes(e.end) : timeMinutes(e.start) + 60) >
                      timeMinutes(slot.start),
                );
                return (
                  <button
                    key={slot.id}
                    className={`class-card timeline-class ${underExam ? 'behind-exam' : ''}`}
                    style={{
                      ...position(timeMinutes(slot.start), timeMinutes(slot.end)),
                      background: s?.color,
                      '--subject': s?.color,
                    }}
                    aria-label={`${s?.name || s?.short}, ${slot.start} a ${slot.end}, ${slotTeacher(slot, offering) || slot.note || ''}, aula ${slot.room || 'sense especificar'}`}
                    onClick={() => open('class', { subject: s, offering, slot, date: d })}
                  >
                    <strong>{s?.short || s?.name}</strong>
                    <small>
                      {slot.room ? `Aula ${slot.room}` : ''} · {slot.start}
                    </small>
                    <span className="class-teacher">
                      {slotTeacher(slot, offering) || slot.note}
                    </span>
                  </button>
                );
              })}
              {eventLanes(dailyEvents).map(({ event, start, end, lane, total }) => (
                <div
                  key={event.id}
                  className="timeline-event"
                  style={{
                    ...position(start, end),
                    left: `calc(${(lane * 100) / total}% + 4px)`,
                    width: `calc(${100 / total}% - 8px)`,
                  }}
                >
                  {eventCard(event, true)}
                </div>
              ))}
            </div>
          );
        })}
      </div>
      {slots.some((s) => s.day >= 5) && (
        <div className="outside-events">
          <h3>Classes de cap de setmana</h3>
          {slots
            .filter((s) => s.day >= 5)
            .map((slot) => {
              const offering = data.offerings.find((o) => o.id === slot.offering_id);
              const s = subject(offering?.subject_id);
              return (
                <button
                  className="button"
                  key={slot.id}
                  onClick={() =>
                    open('class', { subject: s, offering, slot, date: dates[slot.day] })
                  }
                >
                  {DAYS[slot.day]} · {slot.start}–{slot.end} · {s?.short}
                </button>
              );
            })}
        </div>
      )}
    </>
  );
}
