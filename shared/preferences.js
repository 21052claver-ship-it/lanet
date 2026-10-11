import { MUSIC_TRACK_IDS } from './music-catalog.js';

export const DEFAULT_PREFERENCES = Object.freeze({
  notesSubjects: null,
  plusSubjects: null,
  density: 'compact',
  sidebarCollapsed: false,
  showBoard: true,
  hideGrades: false,
  lofi: 'window',
  volume: 0.3,
});
export function preferencesPatch(patch, subjectIds) {
  if (!patch || typeof patch !== 'object' || Array.isArray(patch))
    throw new Error('Preferències no vàlides.');
  const result = {};
  for (const [key, value] of Object.entries(patch)) {
    if (!(key in DEFAULT_PREFERENCES)) throw new Error('Preferència desconeguda.');
    if (['notesSubjects', 'plusSubjects'].includes(key)) {
      if (value === null) result[key] = null;
      else {
        if (
          !Array.isArray(value) ||
          value.length > 30 ||
          value.some((id) => typeof id !== 'string' || !subjectIds.includes(id))
        )
          throw new Error('Tria assignatures del catàleg.');
        result[key] = [...new Set(value)];
      }
    } else if (['sidebarCollapsed', 'showBoard', 'hideGrades'].includes(key)) {
      if (typeof value !== 'boolean') throw new Error('Preferència de visibilitat no vàlida.');
      // Legacy clients and saved preferences may still send showBoard: false.
      // Keep their other preferences while enforcing the permanent community board.
      result[key] = key === 'showBoard' ? true : value;
    } else if (key === 'density') {
      if (!['compact', 'comfortable'].includes(value)) throw new Error('Densitat no vàlida.');
      result[key] = value;
    } else if (key === 'lofi') {
      if (!MUSIC_TRACK_IDS.includes(value)) throw new Error('Música no vàlida.');
      result[key] = value;
    } else if (key === 'volume') {
      if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value > 1)
        throw new Error('Volum no vàlid.');
      result[key] = value;
    }
  }
  return result;
}
export function readPreferences(raw, subjectIds) {
  try {
    return { ...DEFAULT_PREFERENCES, ...preferencesPatch(JSON.parse(raw || '{}'), subjectIds) };
  } catch {
    return { ...DEFAULT_PREFERENCES };
  }
}
