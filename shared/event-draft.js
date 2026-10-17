import { EVENT_KINDS } from './agenda.js';

const time = (value) => value === '' || /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value);
function day(value) {
  if (value === '') return true;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(value + 'T12:00:00Z');
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

// Browser storage can contain drafts from older versions or partially damaged
// values. Recover editable fields only; defaults supply any invalid fields.
export function recoverEventDraft(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const draft = {};
  for (const [key, limit] of [
    ['title', 150],
    ['body', 6000],
    ['room', 120],
  ])
    if (typeof value[key] === 'string') draft[key] = value[key].slice(0, limit);
  for (const key of ['subject_id', 'offering_id'])
    if (typeof value[key] === 'string' && value[key].length <= 100) draft[key] = value[key];
  for (const [key, validate] of [
    ['date', day],
    ['start', time],
    ['end', time],
  ])
    if (typeof value[key] === 'string' && validate(value[key])) draft[key] = value[key];
  if (draft.end && (!draft.start || draft.end <= draft.start)) draft.end = '';
  if (
    typeof value.kind === 'string' &&
    Object.prototype.hasOwnProperty.call(EVENT_KINDS, value.kind)
  )
    draft.kind = value.kind;
  if (['private', 'shared'].includes(value.visibility)) draft.visibility = value.visibility;
  if (['class', 'offering'].includes(value.audience_kind))
    draft.audience_kind = value.audience_kind;
  return Object.keys(draft).length ? draft : null;
}
