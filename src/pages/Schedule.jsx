import React, { useState } from 'react';
import Select from '../components/Select';
import AgendaList from '../components/AgendaList';
import SchoolCalendar from '../components/SchoolCalendar';
import OptionsMenu from '../components/OptionsMenu';
import { EVENT_KINDS, eventKind, eventLabel, eventOrigin } from '../../shared/agenda';
import {
  CaretLeft,
  CaretRight,
  Plus,
  Export,
  LockSimple,
  Clock,
  CalendarDots,
  NotePencil,
  ArrowRight,
  CalendarCheck,
  PushPin,
  Trash,
} from '@phosphor-icons/react';
import { useApp } from '../context';
import { PageTitle, Button, IconButton, Tabs, SubjectChip, Empty, RichText, Modal } from '../ui';
import WeekTimeline from './WeekTimeline';
import {
  DAYS,
  DAYS_SHORT,
  weekDates,
  addDays,
  dateLabel,
  monday,
  scheduleBounds,
  eventOutsideSchedule,
} from '../../shared/domain';
import { download } from '../api';
import { readLocalJSON, writeLocalJSON } from '../../shared/local-state';
import { ReferenceArt, Avatar } from '../art';
import { useCompactLayout } from '../responsive';
import {
  OFFICIAL_ROUTES,
  SCHEDULE_VERSION,
  curriculumIssues,
  schoolScheduleBounds,
} from '../../shared/official-schedule';
function EventDetailContainer({ compact, title, onClose, children }) {
  return compact ? (
    <Modal open title={title} onClose={onClose}>
      {children}
    </Modal>
  ) : (
    children
  );
}
function exportEvents(events) {
  const esc = (s) =>
    String(s || '')
      .replaceAll('\\', '\\\\')
      .replaceAll('\n', '\\n')
      .replaceAll(',', '\\,')
      .replaceAll(';', '\\;');
  const stamp = new Date()
    .toISOString()
    .replace(/[-:]/g, '')
    .replace(/\.\d+Z/, 'Z');
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
  for (const e of events) {
    const date = e.date.replaceAll('-', '');
    lines.push(
      'BEGIN:VEVENT',
      `UID:${e.id}@lanet`,
      `DTSTAMP:${stamp}`,
      e.start
        ? `DTSTART;TZID=Europe/Madrid:${date}T${e.start.replace(':', '')}00`
        : `DTSTART;VALUE=DATE:${date}`,
      e.end
        ? `DTEND;TZID=Europe/Madrid:${date}T${e.end.replace(':', '')}00`
        : !e.start
          ? `DTEND;VALUE=DATE:${addDays(e.date, 1).replaceAll('-', '')}`
          : '',
      `SUMMARY:${esc(e.title)}`,
      `DESCRIPTION:${esc(e.body)}`,
      `LOCATION:${esc(e.room)}`,
      `CLASS:${e.visibility === 'private' ? 'PRIVATE' : 'PUBLIC'}`,
      'END:VEVENT',
    );
  }
  lines.push('END:VCALENDAR');
  download(
    'la-net-calendari.ics',
    lines.filter(Boolean).join('\r\n'),
    'text/calendar;charset=utf-8',
  );
}
export default function Schedule() {
  const { data, subject, enrolled, go, open, setSubjectFilter, mutate, notify } = useApp();
  const compact = useCompactLayout();
  const [monthDay, setMonthDay] = useState(data.today);
  const prefKey = `lanet.calendar.${data.user.id}`;
  const saved = readLocalJSON(prefKey, {}) || {};
  const [view, setView] = useState(
      ['schedule', 'calendar'].includes(saved.view) ? saved.view : 'schedule',
    ),
    [scale, setScale] = useState(
      ['list', 'week', 'month'].includes(saved.scale) ? saved.scale : 'list',
    ),
    [filterKind, setFilterKind] = useState(
      ['all', ...Object.keys(EVENT_KINDS)].includes(saved.filterKind)
        ? saved.filterKind
        : saved.examOnly
          ? 'exam'
          : 'all',
    ),
    [filterSubject, setFilterSubject] = useState(
      data.subjects.some((s) => s.id === saved.filterSubject) ? saved.filterSubject : 'all',
    ),
    [showCompleted, setShowCompleted] = useState(false),
    [date, setDate] = useState(data.today),
    [selected, setSelected] = useState(null);
  function preference(k, v) {
    const remembered = writeLocalJSON(prefKey, { view, scale, filterKind, filterSubject, [k]: v });
    if (!remembered)
      notify(
        'Vista actualitzada. El navegador no ha pogut recordar aquesta preferència.',
        'warning',
      );
    ({
      view: setView,
      scale: setScale,
      filterKind: setFilterKind,
      filterSubject: setFilterSubject,
    })[k](v);
  }
  const dates = weekDates(date),
    chosenIds = data.enrollments.map((e) => e.offering_id);
  const slots = data.slots.filter((s) => chosenIds.includes(s.offering_id));
  const route = OFFICIAL_ROUTES.find((r) => r.id === data.user.group_id);
  const needsReview =
    data.schoolSchedule &&
    (data.user.schedule_version !== SCHEDULE_VERSION ||
      curriculumIssues(data, data.user.group_id, chosenIds).length > 0);
  const examOnly = filterKind === 'exam';
  const events = data.events.filter(
    (e) =>
      view === 'schedule' ||
      ((filterKind === 'all' ||
        (filterKind === 'exam'
          ? ['exam', 'test'].includes(eventKind(e))
          : eventKind(e) === filterKind)) &&
        (filterSubject === 'all' || e.subject_id === filterSubject) &&
        (showCompleted || !e.done)),
  );
  const listEvents = events.filter(
    (e) =>
      (e.date >= date && e.date <= addDays(date, 90)) ||
      (eventKind(e) === 'task' && !e.done && e.date < data.today),
  );
  const weekEvents = events.filter((e) => dates.includes(e.date));
  const selectedEvent = data.events.find((e) => e.id === selected);
  const selectedSubject = subject(selectedEvent?.subject_id);
  function openEventForm(type, item) {
    if (compact) setSelected(null);
    open(type, item);
  }
  const upcoming = data.events
    .filter((e) => e.date >= data.today && !e.done)
    .sort((a, b) => (a.date + (a.start || '')).localeCompare(b.date + (b.start || '')))
    .slice(0, 5);
  const bounds = schoolScheduleBounds(slots, data.schoolSchedule) || scheduleBounds(slots);
  const outsideEvents = weekEvents.filter((e) => eventOutsideSchedule(e, dates, bounds));
  const monthStart = date.slice(0, 7) + '-01';
  const monthDates = Array.from({ length: 42 }, (_, i) => addDays(monday(monthStart), i));
  const isMonth = view === 'calendar' && scale === 'month';
  const visibleMonthDay = monthDay.slice(0, 7) === date.slice(0, 7) ? monthDay : monthStart;
  function move(n) {
    if (isMonth) {
      const d = new Date(monthStart + 'T12:00:00Z');
      d.setUTCMonth(d.getUTCMonth() + n);
      setDate(d.toISOString().slice(0, 10));
    } else setDate(addDays(date, n * 7));
  }
  function eventCard(e, small = false) {
    const eventSubject = subject(e.subject_id);
    const subjectName = ['math', 'smath', 'cast'].includes(eventSubject?.id)
      ? eventSubject.name
      : eventSubject?.short;
    const description = [
      eventLabel(e),
      eventSubject?.name,
      e.start ? `${e.start}${e.end ? '–' + e.end : ''}` : 'Tot el dia',
      e.title,
    ]
      .filter(Boolean)
      .join(' · ');
    return (
      <button
        key={e.id}
        className={`event-card ${e.kind} ${selected === e.id ? 'selected' : ''} ${small ? 'compact' : ''}`}
        onClick={() => setSelected(e.id)}
        aria-label={description}
        title={description}
        style={{ '--subject': subject(e.subject_id)?.color || '#EEE6F4' }}
      >
        <span className="event-kind">
          <span className="event-badge">
            {e.visibility === 'private' && <LockSimple size={12} />} {eventLabel(e)}
          </span>
        </span>
        <strong>{subjectName || e.title}</strong>
        {subjectName && <span className="event-title">{e.title}</span>}
        {!small && (
          <small className="event-time">
            {e.start ? `${e.start}${e.end ? '–' + e.end : ''}` : 'Tot el dia'}
          </small>
        )}
      </button>
    );
  }
  return (
    <>
      <PageTitle
        title={view === 'schedule' ? 'El teu horari' : 'La teva agenda'}
        subtitle={
          view === 'schedule'
            ? `${route?.label || 'El meu curs'}${route ? ` · Grup ${route.id.slice(1)}` : ''} · 2026–2027`
            : 'Exàmens, proves, tasques, lliuraments i activitats en un sol lloc'
        }
      >
        <Button variant="primary" onClick={() => open('event', { date })}>
          <Plus size={18} />
          Afegir a l’agenda
        </Button>
      </PageTitle>
      {needsReview && view === 'schedule' && (
        <div className="schedule-review-notice" role="status">
          <div>
            <strong>Ja tenim l’horari oficial</strong>
            <span>
              Confirma l’itinerari, les optatives i el professorat per actualitzar el teu horari.
            </span>
          </div>
          <Button onClick={() => open('configure')} variant="primary">
            Revisar el meu horari <ArrowRight size={17} />
          </Button>
        </div>
      )}
      <div className="calendar-toolbar">
        <Tabs
          label="Horari o agenda"
          items={[
            ['schedule', 'Horari', Clock],
            ['calendar', 'Agenda', CalendarDots],
          ]}
          value={view}
          onChange={(v) => preference('view', v)}
        />
        <div className="calendar-navigation-row">
          <div className="date-navigation">
            <IconButton label="Anterior" onClick={() => move(-1)}>
              <CaretLeft size={18} />
            </IconButton>
            <strong>
              {isMonth
                ? dateLabel(monthStart, { month: 'long', year: 'numeric' })
                : `${Number(dates[0].slice(8))}–${dateLabel(dates[4], { day: 'numeric', month: 'long' })}`}
            </strong>
            <IconButton label="Següent" onClick={() => move(1)}>
              <CaretRight size={18} />
            </IconButton>
            <button className="text-button" onClick={() => setDate(data.today)}>
              Avui
            </button>
          </div>
          {view === 'calendar' && (
            <div className="calendar-options">
              <Tabs
                label="Vista de l’agenda"
                items={[
                  ['list', 'Llista'],
                  ['week', 'Setmana'],
                  ['month', 'Mes'],
                ]}
                value={scale}
                onChange={(v) => preference('scale', v)}
              />
            </div>
          )}
          <OptionsMenu label="Opcions de l’horari i l’agenda">
            <Button variant="ghost" onClick={() => exportEvents(events)}>
              <Export size={18} /> Exportar el calendari
            </Button>
            <Button variant="ghost" onClick={() => open('configure')}>
              <ReferenceArt name="gear" size={23} /> Personalitzar el curs
            </Button>
          </OptionsMenu>
        </div>
      </div>
      {view === 'calendar' && <SchoolCalendar />}
      {view === 'calendar' && (
        <div className="agenda-filters">
          <Select
            aria-label="Tipus de dates"
            value={filterKind}
            onChange={(e) => preference('filterKind', e.target.value)}
          >
            <option value="all">Tots els tipus</option>
            {Object.entries(EVENT_KINDS).map(([id, label]) => (
              <option key={id} value={id}>
                {id === 'exam' ? 'Exàmens i proves' : label}
              </option>
            ))}
          </Select>
          <Select
            aria-label="Assignatura de l’agenda"
            value={filterSubject}
            onChange={(e) => preference('filterSubject', e.target.value)}
          >
            <option value="all">Totes les assignatures</option>
            {enrolled.map((s) => (
              <option key={s.id} value={s.id}>
                {s.short}
              </option>
            ))}
          </Select>
          <label className="preference-check">
            <input
              type="checkbox"
              checked={showCompleted}
              onChange={(e) => setShowCompleted(e.target.checked)}
            />
            Incloure tasques fetes
          </label>
        </div>
      )}
      <div className="schedule-layout">
        <section className="schedule-main panel">
          {!data.user.configured && view === 'schedule' ? (
            <Empty
              title="Preparem el teu horari"
              body="Tria el grup, l’itinerari i les assignatures."
            >
              <Button variant="primary" onClick={() => open('configure')}>
                Configurar curs
              </Button>
            </Empty>
          ) : view === 'calendar' && scale === 'list' ? (
            <AgendaList events={listEvents} onSelect={(e) => setSelected(e.id)} />
          ) : isMonth ? (
            <>
              <div className="month-grid" aria-label="Calendari mensual">
                {DAYS_SHORT.map((d) => (
                  <div className="month-day-label" key={d}>
                    {d}
                  </div>
                ))}
                {monthDates.map((d) => (
                  <div
                    className={`month-cell ${d.slice(0, 7) !== date.slice(0, 7) ? 'outside' : ''} ${d === data.today ? 'today' : ''}`}
                    key={d}
                  >
                    <button
                      className="day-number"
                      aria-pressed={compact ? d === visibleMonthDay : undefined}
                      aria-label={`${compact ? 'Veure' : 'Afegir una data a'} ${dateLabel(d, { weekday: 'long', day: 'numeric', month: 'long' })}`}
                      onClick={() => {
                        if (compact) {
                          setMonthDay(d);
                          if (d.slice(0, 7) !== date.slice(0, 7)) setDate(d);
                        } else open('event', { date: d });
                      }}
                    >
                      {Number(d.slice(8))}
                      {events.some((e) => e.date === d) && (
                        <span className="month-event-dot" aria-hidden="true" />
                      )}
                    </button>
                    {events.filter((e) => e.date === d).map((e) => eventCard(e, true))}
                    {!examOnly && (
                      <small className="class-count">
                        {slots.filter(
                          (s) => s.day === (new Date(d + 'T12:00:00Z').getUTCDay() + 6) % 7,
                        ).length || ''}
                        {slots.some(
                          (s) => s.day === (new Date(d + 'T12:00:00Z').getUTCDay() + 6) % 7,
                        )
                          ? ' classes'
                          : ''}
                      </small>
                    )}
                  </div>
                ))}
              </div>
              <section className="month-day-agenda" aria-label="Agenda del dia seleccionat">
                <h3>
                  {dateLabel(visibleMonthDay, { weekday: 'long', day: 'numeric', month: 'long' })}
                </h3>
                <AgendaList
                  events={events.filter((e) => e.date === visibleMonthDay)}
                  onSelect={(e) => setSelected(e.id)}
                />
                <Button onClick={() => open('event', { date: visibleMonthDay })}>
                  <Plus size={18} />
                  Afegir aquest dia
                </Button>
              </section>
            </>
          ) : view === 'calendar' && examOnly ? (
            <div
              className="exam-week"
              style={{
                '--exam-days': weekEvents.some((e) => dates.slice(5).includes(e.date)) ? 7 : 5,
              }}
            >
              {(weekEvents.some((e) => dates.slice(5).includes(e.date))
                ? dates
                : dates.slice(0, 5)
              ).map((d, i) => (
                <div className={`exam-day ${d === data.today ? 'today' : ''}`} key={d}>
                  <div className="week-heading">
                    <span>{DAYS_SHORT[i]}</span>
                    <strong>{Number(d.slice(8))}</strong>
                  </div>
                  <div className="exam-day-events">
                    {weekEvents.filter((e) => e.date === d).map((e) => eventCard(e))}
                    {!weekEvents.some((e) => e.date === d) && (
                      <span className="no-exam">Sense exàmens</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <WeekTimeline
              dates={dates}
              slots={slots}
              events={weekEvents}
              context={view === 'calendar'}
              eventCard={eventCard}
            />
          )}
          {!isMonth &&
            !(view === 'calendar' && (examOnly || scale === 'list')) &&
            outsideEvents.length > 0 && (
              <div className="outside-events">
                <h3>Fora de les franges de classe</h3>
                {outsideEvents.map((e) => (
                  <div key={e.id}>
                    <small>
                      {dateLabel(e.date, { weekday: 'long', day: 'numeric', month: 'short' })}
                    </small>
                    {eventCard(e)}
                  </div>
                ))}
              </div>
            )}
        </section>
        <aside className="schedule-aside">
          {selectedEvent ? (
            <EventDetailContainer
              compact={compact}
              title={eventLabel(selectedEvent)}
              onClose={() => setSelected(null)}
            >
              <div className="panel detail-panel schedule-event-detail">
                <h2 className="selection-heading">{eventLabel(selectedEvent)}</h2>
                <SubjectChip
                  subject={selectedSubject}
                  label={
                    ['math', 'smath'].includes(selectedSubject?.id)
                      ? selectedSubject.name
                      : undefined
                  }
                />
                <h3 className="selected-event-title">{selectedEvent.title}</h3>
                <p className="muted">{eventOrigin(selectedEvent)}</p>
                {eventKind(selectedEvent) === 'task' && (
                  <Button
                    onClick={() =>
                      mutate('/events/' + selectedEvent.id + '/progress', {
                        done: !selectedEvent.done,
                      }).catch(() => {})
                    }
                  >
                    {selectedEvent.done ? 'Tornar a marcar pendent' : 'Marcar com a feta'}
                  </Button>
                )}
                {selectedEvent.source_key?.startsWith('plus:') &&
                  data.pluses.find((p) => p.id === selectedEvent.source_key.split(':')[1]) && (
                    <Button
                      onClick={() =>
                        openEventForm(
                          'plusDetail',
                          data.pluses.find((p) => p.id === selectedEvent.source_key.split(':')[1]),
                        )
                      }
                    >
                      Veure el plus d’origen
                    </Button>
                  )}
                <ul className="detail-list">
                  <li>
                    <CalendarCheck size={19} />
                    {dateLabel(selectedEvent.date, {
                      weekday: 'long',
                      day: 'numeric',
                      month: 'long',
                    })}
                  </li>
                  <li>
                    <Clock size={19} />
                    {selectedEvent.start
                      ? `${selectedEvent.start}${selectedEvent.end ? ' — ' + selectedEvent.end : ''}`
                      : 'Tot el dia'}
                    {selectedEvent.room ? ` · ${selectedEvent.room}` : ''}
                  </li>
                </ul>
                {selectedEvent.body && (
                  <section className="selected-event-body">
                    <h4>{selectedEvent.kind === 'exam' ? 'Temari' : 'Detalls'}</h4>
                    <RichText text={selectedEvent.body} />
                  </section>
                )}
                <div className="selected-event-author">
                  <Avatar name={selectedEvent.author} tiny />
                  <span>
                    {selectedEvent.author}
                    <small>
                      {selectedEvent.visibility === 'private' ? (
                        <>
                          <LockSimple size={14} /> Privat · només tu
                        </>
                      ) : (
                        'Compartit amb el grup'
                      )}
                    </small>
                  </span>
                </div>
                {selectedEvent.subject_id && (
                  <Button
                    variant="primary"
                    onClick={() => {
                      setSubjectFilter(selectedEvent.subject_id);
                      go('notes');
                    }}
                  >
                    <ReferenceArt name="grades" size={29} />
                    Veure continguts
                  </Button>
                )}
                {(selectedEvent.owner_id === data.user.id ||
                  (data.user.role !== 'student' && selectedEvent.visibility === 'shared')) && (
                  <div className="row-actions">
                    <Button onClick={() => openEventForm('event', selectedEvent)}>
                      <NotePencil size={17} />
                      Editar
                    </Button>
                    <IconButton
                      label="Eliminar data"
                      onClick={() =>
                        openEventForm('delete', {
                          resource: 'events',
                          id: selectedEvent.id,
                          title: selectedEvent.title,
                        })
                      }
                    >
                      <Trash size={19} />
                    </IconButton>
                  </div>
                )}
                <button className="text-button" onClick={() => setSelected(null)}>
                  Tornar a les properes dates
                </button>
              </div>
            </EventDetailContainer>
          ) : (
            <>
              <div className="panel upcoming-panel">
                <h2>
                  Properes dates <span>{upcoming.length}</span>
                </h2>
                {upcoming.length ? (
                  upcoming.slice(0, 3).map((e) => (
                    <button
                      className="upcoming-item"
                      key={e.id}
                      onClick={() => {
                        setSelected(e.id);
                        setDate(e.date);
                      }}
                    >
                      <span
                        className="date-square"
                        style={{ background: subject(e.subject_id)?.color }}
                      >
                        <small>{dateLabel(e.date, { month: 'short' })}</small>
                        <strong>{Number(e.date.slice(8))}</strong>
                      </span>
                      <span>
                        <strong>{e.title}</strong>
                        <small>
                          {eventLabel(e)} · {subject(e.subject_id)?.short || e.start || 'Personal'}
                        </small>
                      </span>
                    </button>
                  ))
                ) : (
                  <p className="muted">No tens dates pendents.</p>
                )}
                {upcoming.length > 3 && (
                  <button
                    className="text-button upcoming-more"
                    onClick={() => {
                      preference('view', 'calendar');
                      setDate(upcoming[0].date);
                    }}
                  >
                    Veure més dates <ArrowRight size={15} />
                  </button>
                )}
              </div>
              <details className="notice-panel schedule-notices">
                <summary>
                  Avisos del grup <span>{data.announcements.length}</span>
                </summary>
                {data.announcements.slice(0, 1).map((a) => (
                  <div key={a.id}>
                    <span className="notice-icon">
                      <ReferenceArt name="megaphone" size={29} />
                    </span>
                    <strong>{a.title}</strong>
                    <p>{a.body}</p>
                  </div>
                ))}
                <button className="text-button" onClick={() => go('community')}>
                  Veure tots els avisos <ArrowRight size={15} />
                </button>
              </details>
            </>
          )}
        </aside>
      </div>
    </>
  );
}
