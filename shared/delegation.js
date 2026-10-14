// Public scope metadata only. Names and verified school emails live in D1.
export const DELEGATION_UNITS = [
  { id: 'tech1', label: 'Tecnològic 1', tutor: 'comellas', groups: ['2A', '2B'] },
  { id: 'tech2', label: 'Tecnològic 2', tutor: 'ocana', groups: ['2A', '2B'] },
  { id: 'science', label: 'Científic', tutor: 'puigpinos', groups: ['2A'] },
  { id: 'social', label: 'Social i Humanístic', tutor: 'closa', groups: ['2C'] },
];
export function userUnit(enrollments, offerings) {
  const tutor = offerings.find(
    (o) => o.subject_id === 'tutor' && enrollments.some((e) => e.offering_id === o.id),
  );
  return DELEGATION_UNITS.find((u) => tutor?.id.endsWith('-' + u.tutor)) || null;
}
export function equivalentOfferings(offering, offerings, slots) {
  const signature = (o) =>
    slots
      .filter((s) => s.offering_id === o.id)
      .map((s) => [s.day, s.start, s.end, s.room, s.teacher].join('|'))
      .sort()
      .join(';');
  const key = signature(offering);
  return offerings
    .filter(
      (o) =>
        o.active !== 0 &&
        o.subject_id === offering.subject_id &&
        o.block === offering.block &&
        o.teacher === offering.teacher &&
        signature(o) === key,
    )
    .map((o) => o.id);
}
export const normalizedAgendaTitle = (t) =>
  String(t || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
export const duplicateIdentity = (e) =>
  ['exam', 'test'].includes(e.display_kind || e.kind)
    ? 'exam'
    : (e.display_kind || e.kind) + ':' + normalizedAgendaTitle(e.title);
export function eventConflicts(candidate, records) {
  const minutes = (t) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3));
  const overlaps = (e) =>
    !candidate.start ||
    !e.start ||
    (minutes(candidate.start) < (e.end ? minutes(e.end) : minutes(e.start) + 60) &&
      minutes(e.start) < (candidate.end ? minutes(candidate.end) : minutes(candidate.start) + 60));
  const normal = normalizedAgendaTitle;
  const exam = (e) => ['exam', 'test'].includes(e.display_kind || e.kind);
  return records
    .filter((e) => e.id !== candidate.id && e.date === candidate.date && overlaps(e))
    .map((e) => ({
      id: e.id,
      title: e.title,
      date: e.date,
      start: e.start,
      end: e.end,
      subject_id: e.subject_id,
      revision: e.revision || 1,
      type:
        e.subject_id === candidate.subject_id &&
        ((exam(e) && exam(candidate)) ||
          (normal(e.title) === normal(candidate.title) &&
            (e.display_kind || e.kind) === candidate.kind))
          ? 'duplicate'
          : 'overlap',
    }))
    .filter(
      (c) =>
        c.type === 'duplicate' ||
        (candidate.start && c.start) ||
        (exam(candidate) && exam(records.find((e) => e.id === c.id))),
    );
}
export const canManageEvent = (user, event, delegation) =>
  user.role === 'admin' ||
  (event.visibility === 'shared' &&
    event.review_units?.some((u) => delegation?.managedUnits?.includes(u)));
