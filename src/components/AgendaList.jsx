import React, { useRef, useState } from 'react';
import { ArrowRight } from '@phosphor-icons/react';
import { useApp } from '../context';
import { SubjectChip, Empty } from '../ui';
import { eventKind, eventLabel, eventOrigin } from '../../shared/agenda';
import { dateLabel } from '../../shared/domain';
export default function AgendaList({ events, onSelect }) {
  const { data, subject, mutate } = useApp();
  const pending = useRef(new Set()),
    [busy, setBusy] = useState([]);
  async function complete(event, done) {
    if (pending.current.has(event.id)) return;
    pending.current.add(event.id);
    setBusy([...pending.current]);
    try {
      await mutate('/events/' + event.id + '/progress', { done });
    } catch {
    } finally {
      pending.current.delete(event.id);
      setBusy([...pending.current]);
    }
  }
  const dates = [...new Set(events.map((e) => e.date))].sort();
  return (
    <div className="agenda-list">
      {!events.length && (
        <Empty
          title="L’agenda està al dia"
          body="No hi ha dates amb aquests filtres. Pots afegir una tasca, una prova o una activitat."
        />
      )}
      {dates.map((date) => (
        <section key={date} className={'agenda-day ' + (date < data.today ? 'overdue' : '')}>
          <h2>
            {date === data.today
              ? 'Avui'
              : dateLabel(date, { weekday: 'long', day: 'numeric', month: 'long' })}
            {date < data.today && <small> · pendent</small>}
          </h2>
          {events
            .filter((e) => e.date === date)
            .map((event) => (
              <article key={event.id} className={'agenda-row ' + (event.done ? 'completed' : '')}>
                {eventKind(event) === 'task' ? (
                  <input
                    type="checkbox"
                    checked={!!event.done}
                    disabled={busy.includes(event.id)}
                    aria-label={'Marcar com a feta: ' + event.title}
                    onChange={(e) => complete(event, e.target.checked)}
                  />
                ) : (
                  <span className={'agenda-kind kind-' + eventKind(event)}>
                    {eventLabel(event)}
                  </span>
                )}
                <button className="agenda-row-main" onClick={() => onSelect(event)}>
                  <strong>{event.title}</strong>
                  <span>
                    <SubjectChip subject={subject(event.subject_id)} />
                    <small>
                      {event.start || 'Tot el dia'}
                      {event.room ? ' · ' + event.room : ''}
                    </small>
                  </span>
                  <small>
                    {eventOrigin(event)}
                    {eventKind(event) === 'task' ? ' · Tasca' : ''}
                  </small>
                </button>
                <button
                  className="icon-button"
                  aria-label={'Detalls de ' + event.title}
                  onClick={() => onSelect(event)}
                >
                  <ArrowRight size={19} />
                </button>
              </article>
            ))}
        </section>
      ))}
    </div>
  );
}
