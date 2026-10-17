import React from 'react';
import { ArrowRight } from '@phosphor-icons/react';
import { useApp } from '../context';
import { SubjectChip, Empty } from '../ui';
import { eventKind, eventLabel, eventOrigin, eventSubjectIds } from '../../shared/agenda';
import { dateLabel } from '../../shared/domain';
export default function AgendaList({ events, onSelect }) {
  const { data, subject, taskWrites } = useApp();
  const dates = [...new Set(events.map((e) => e.date))].sort();
  return (
    <div className="agenda-list">
      {!events.length && (
        <Empty
          title="L’agenda està al dia"
          body="No hi ha dates amb aquests filtres. Pots afegir una tasca, una prova o una activitat."
        />
      )}
      {dates.map((date) => {
        const overdue =
          date < data.today &&
          events.some((e) => e.date === date && eventKind(e) === 'task' && !taskWrites.isDone(e));
        return (
          <section key={date} className={'agenda-day ' + (overdue ? 'overdue' : '')}>
            <h2>
              {date === data.today
                ? 'Avui'
                : dateLabel(date, { weekday: 'long', day: 'numeric', month: 'long' })}
              {overdue && <small> · pendent</small>}
            </h2>
            {events
              .filter((e) => e.date === date)
              .map((event) => (
                <article
                  key={event.id}
                  className={
                    'agenda-row ' +
                    (eventKind(event) === 'task' ? 'task-row ' : '') +
                    (event.done ? 'completed' : '')
                  }
                >
                  {eventKind(event) === 'task' ? (
                    <label className="agenda-task-check">
                      <input
                        type="checkbox"
                        checked={taskWrites.isDone(event)}
                        disabled={taskWrites.isPending(event)}
                        aria-busy={taskWrites.isPending(event)}
                        aria-label={'Marcar com a feta: ' + event.title}
                        onChange={(e) => taskWrites.setDone(event, e.target.checked)}
                      />
                    </label>
                  ) : (
                    <span className={'agenda-kind kind-' + eventKind(event)}>
                      {eventLabel(event)}
                    </span>
                  )}
                  <button className="agenda-row-main" onClick={() => onSelect(event)}>
                    <strong>{event.title}</strong>
                    <span>
                      {eventSubjectIds(event).map((id) => (
                        <SubjectChip key={id} subject={subject(id)} />
                      ))}
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
        );
      })}
    </div>
  );
}
