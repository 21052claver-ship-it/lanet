import { addDays } from './domain.js';

export const EVENT_KINDS = {
  exam: 'Examen',
  test: 'Prova',
  task: 'Tasca',
  deadline: 'Lliurament',
  reminder: 'Recordatori',
  event: 'Activitat',
};
export const eventKind = (event) => event.display_kind || event.kind;
export function eventSubjectIds(event) {
  return [...new Set([event?.subject_id, ...(event?.subject_ids || [])].filter(Boolean))];
}
export function agendaListItems(events, date, today, showCompleted = false) {
  const until = addDays(date, 90);
  return events.filter(
    (e) =>
      (e.date >= date && e.date <= until) ||
      (eventKind(e) === 'task' && e.date < today && (showCompleted || !e.done)),
  );
}
export const eventLabel = (event) => EVENT_KINDS[eventKind(event)] || 'Data';
export function eventOrigin(event) {
  if (event.visibility === 'shared' && event.review_status === 'pending')
    return 'Pendent de validació';
  if (event.visibility === 'shared' && event.reviewer) return `Validat per ${event.reviewer}`;
  return event.source_key?.startsWith('plus:')
    ? 'Plus afegit a l’agenda'
    : event.visibility === 'private'
      ? 'Personal · només tu'
      : 'Compartit amb el grup';
}
