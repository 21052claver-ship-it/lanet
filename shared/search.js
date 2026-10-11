// Search display metadata without requiring accents, repeated whitespace or
// a particular apostrophe style. Paid note bodies never enter this index.
export function searchText(value) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLocaleLowerCase('ca')
    .replace(/[’‘`]/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

export function matchesSearch(query, ...fields) {
  const terms = searchText(query).split(' ').filter(Boolean);
  const text = fields.map(searchText).join(' ');
  return terms.every((term) => text.includes(term));
}
