import React, { useState } from 'react';
import { CalendarDots, Export, ArrowSquareOut } from '@phosphor-icons/react';
import { useApp } from '../context';
import { Button } from '../ui';
import { download } from '../api';
import { dateLabel } from '../../shared/domain';
import { SCHOOL_DATES, schoolCalendarICS } from '../../shared/student-guide';
import '../student-guide.css';

export default function SchoolCalendar({ onlyAdmission = false }) {
  const { data } = useApp();
  const [past, setPast] = useState(false);
  const all = SCHOOL_DATES.filter((event) => !onlyAdmission || ['pau', 'pap'].includes(event.kind));
  const next = all.find((event) => event.end >= data.today);
  const events = all.filter((event) => past || event.end >= data.today);
  return (
    <details className="school-calendar panel">
      <summary>
        <CalendarDots size={23} />
        <span>
          <strong>
            {onlyAdmission ? 'Calendari PAU i PAP 2027' : 'Calendari del centre · 2026–2027'}
          </strong>
          <small>
            {next
              ? `Proper: ${next.title} · ${dateLabel(next.start)}`
              : 'Consulta totes les dates del curs'}
          </small>
        </span>
      </summary>
      <div className="school-calendar-content">
        <div className="school-calendar-tools">
          <label>
            <input
              type="checkbox"
              checked={past}
              onChange={(event) => setPast(event.target.checked)}
            />{' '}
            Incloure dates passades
          </label>
          <Button
            onClick={() =>
              download(
                'la-net-curs-2026-27.ics',
                schoolCalendarICS(all),
                'text/calendar;charset=utf-8',
              )
            }
          >
            <Export size={17} /> Exportar dates del curs
          </Button>
        </div>
        <div className="school-date-grid">
          {events.map((event) => (
            <article key={event.id} className={`school-date ${event.kind}`}>
              <span className="school-date-category">
                {
                  {
                    term: 'Avaluació',
                    research: 'Treball de Recerca',
                    activity: 'Activitat',
                    pau: 'PAU',
                    pap: 'PAP',
                  }[event.kind]
                }
              </span>
              <h3>{event.title}</h3>
              <p>
                <time dateTime={event.start}>
                  {dateLabel(event.start, { day: 'numeric', month: 'long', year: 'numeric' })}
                </time>
                {event.end !== event.start && (
                  <>
                    {' '}
                    —{' '}
                    <time dateTime={event.end}>
                      {dateLabel(event.end, { day: 'numeric', month: 'long', year: 'numeric' })}
                    </time>
                  </>
                )}
              </p>
              {event.source && (
                <a href={event.source} target="_blank" rel="noreferrer">
                  Calendari oficial <ArrowSquareOut size={14} />
                </a>
              )}
            </article>
          ))}
        </div>
        {!events.length && (
          <p className="muted">No queden dates pendents. Pots consultar les passades.</p>
        )}
        <p className="assessment-hint">
          Font: presentació BAT2 del centre. Dates PAU/PAP contrastades amb Canal Universitats el
          13/10/2026. Els horaris PAU 2027 estan pendents de publicació. Els períodes de trimestrals
          no indiquen el dia de cada assignatura.
        </p>
      </div>
    </details>
  );
}
