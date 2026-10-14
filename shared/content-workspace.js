import { matchesSearch } from './search.js';
export function materialTopic(value) {
  return typeof value === 'string' ? value.normalize('NFC').trim().replace(/\s+/g, ' ') : '';
}
export function materialTopics(notes) {
  const counts = new Map();
  for (const n of notes) {
    const topic = materialTopic(n.topic);
    counts.set(topic, (counts.get(topic) || 0) + 1);
  }
  return [...counts].sort(([a], [b]) => (a === '' ? 1 : b === '' ? -1 : a.localeCompare(b, 'ca')));
}
export function filterMaterials(
  notes,
  { subjects, tab, userId, query, topic = null, term = 'all', subjectName = () => '' },
) {
  return notes.filter(
    (n) =>
      (subjects === null || subjects.includes(n.subject_id)) &&
      (tab === 'saved'
        ? n.saved
        : tab === 'mine'
          ? n.author_id === userId
          : n.status === 'published') &&
      (topic === null || materialTopic(n.topic) === topic) &&
      (term === 'all' || (term === 'none' ? !n.term : Number(n.term) === Number(term))) &&
      matchesSearch(query, n.title, n.summary, n.author, n.topic, subjectName(n.subject_id)),
  );
}
