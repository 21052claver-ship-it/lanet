export const EVENT_KINDS = {
  exam: 'Examen',
  test: 'Prova',
  task: 'Tasca',
  deadline: 'Lliurament',
  reminder: 'Recordatori',
  event: 'Activitat',
};
export const eventKind = (event) => event.display_kind || event.kind;
export const eventLabel = (event) => EVENT_KINDS[eventKind(event)] || 'Data';
export function eventOrigin(event) {
  return event.source_key?.startsWith('plus:')
    ? 'Plus afegit a l’agenda'
    : event.visibility === 'private'
      ? 'Personal · només tu'
      : 'Compartit amb el grup';
}
