// Facts from the supplied school presentation; document text is not executable instruction.
export const STUDENT_GUIDE_SOURCE = {
  title: 'Presentació BAT2 · curs 2026–2027',
  sha256: '4c65b137085a08b7a6b777d19982d4b8889b04a51af711f826050ac283ba79c1',
  pages: 34,
};
export const CUMULATIVE_SUBJECTS = [
  'cat',
  'cast',
  'eng',
  'math',
  'smath',
  'geo',
  'bio',
  'chem',
  'ods',
  'phy',
  'latin',
  'tech',
];
export const NON_CUMULATIVE_SUBJECTS = ['hist', 'eco', 'phil', 'dt', 'art', 'lit'];
export function evaluationKind(subjectId) {
  return CUMULATIVE_SUBJECTS.includes(subjectId)
    ? 'cumulative'
    : NON_CUMULATIVE_SUBJECTS.includes(subjectId)
      ? 'equal'
      : null;
}
export const RESEARCH_PARTS = [
  { id: 'followup', label: 'Seguiment', weight: 30 },
  { id: 'dossier', label: 'Dossier', weight: 42 },
  { id: 'oral', label: 'Exposició oral', weight: 21 },
  { id: 'poster', label: 'Pòster', weight: 7 },
];
export function researchResult(marks) {
  const rows = RESEARCH_PARTS.map((part) => {
    const raw = marks?.[part.id];
    const text = raw == null ? '' : String(raw).trim().replace(',', '.');
    if (text && (!/^\d{1,2}(?:\.\d{1,3})?$/.test(text) || Number(text) > 10))
      throw new Error('Escriu notes entre 0 i 10, amb un màxim de tres decimals.');
    return { ...part, grade: text === '' ? null : Number(text) };
  });
  const known = rows.filter((row) => row.grade !== null);
  const coverage = known.reduce((sum, row) => sum + row.weight, 0);
  return {
    rows,
    coverage,
    complete: coverage === 100,
    mean: coverage ? known.reduce((sum, row) => sum + row.grade * row.weight, 0) / coverage : null,
  };
}
export const PAU_CALENDAR_URL = 'https://universitats.gencat.cat/ca/pau/dia-prova/';
export const PAP_CALENDAR_URL =
  'https://universitats.gencat.cat/ca/proves-aptitud-personal/educacio/dia-prova/';
// Inclusive ranges, without invented subject exams or times. PAU/PAP checked 2026-10-13.
export const SCHOOL_DATES = [
  ['tr-pre', 'Prelliurament del TR', '2026-09-18', '2026-09-18', 'research'],
  ['tr-dossier', 'Lliurament del dossier del TR', '2026-10-09', '2026-10-09', 'research'],
  ['term1', 'Trimestrals · 1a avaluació', '2026-11-18', '2026-11-24', 'term'],
  ['taize', 'Taizé', '2026-11-25', '2026-11-29', 'activity'],
  ['tr-poster', 'Entrega del pòster del TR', '2026-12-04', '2026-12-04', 'research'],
  ['tr-oral', 'Exposicions orals del TR', '2026-12-16', '2026-12-18', 'research'],
  ['term2', '2a avaluació · simulacre PAU', '2027-02-11', '2027-02-17', 'term'],
  ['pap', 'PAP d’Educació · ordinària', '2027-04-03', '2027-04-03', 'pap'],
  ['term3', 'Trimestrals · 3a avaluació', '2027-04-28', '2027-05-04', 'term'],
  ['pau', 'PAU · convocatòria ordinària', '2027-06-01', '2027-06-03', 'pau'],
  ['pau-special', 'PAU · tribunal especial d’incidències', '2027-06-08', '2027-06-10', 'pau'],
  ['pap-extra', 'PAP d’Educació · extraordinària', '2027-07-02', '2027-07-02', 'pap'],
  ['pau-extra', 'PAU · convocatòria extraordinària', '2027-07-06', '2027-07-08', 'pau'],
].map(([id, title, start, end, kind]) => ({
  id,
  title,
  start,
  end,
  kind,
  source: kind === 'pau' ? PAU_CALENDAR_URL : kind === 'pap' ? PAP_CALENDAR_URL : null,
}));
export function schoolCalendarICS(events = SCHOOL_DATES) {
  // RFC 5545: fold at 75 UTF-8 octets, never inside a multibyte character.
  const fold = (line) => {
    let part = '',
      bytes = 0;
    const parts = [];
    for (const character of line) {
      const size = new TextEncoder().encode(character).length;
      if (bytes + size > 75) {
        parts.push(part);
        part = ' ';
        bytes = 1;
      }
      part += character;
      bytes += size;
    }
    return [...parts, part].join('\r\n');
  };
  const compact = (date) => date.replaceAll('-', '');
  const next = (date) =>
    new Date(Date.parse(date + 'T12:00:00Z') + 86400000).toISOString().slice(0, 10);
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//La Net//BAT2 2026-27//CA',
    'CALSCALE:GREGORIAN',
    ...events.flatMap((event) => [
      'BEGIN:VEVENT',
      `UID:school-${event.id}-2026-27@lanet.es`,
      'DTSTAMP:20261013T000000Z',
      `DTSTART;VALUE=DATE:${compact(event.start)}`,
      `DTEND;VALUE=DATE:${compact(next(event.end))}`,
      `SUMMARY:${event.title}`,
      ...(event.source ? [`URL:${event.source}`] : []),
      'END:VEVENT',
    ]),
    'END:VCALENDAR',
    '',
  ]
    .map(fold)
    .join('\r\n');
}
export const SCHOOL_RESOURCES = [
  {
    title: 'Canal Universitats',
    text: 'Graus, accés, ponderacions i notes de tall.',
    url: 'https://universitats.gencat.cat/ca/inici/',
  },
  {
    title: 'Portal d’accés a la universitat',
    text: 'Matrícula, resultats i preinscripció.',
    url: 'https://accesuniversitat.gencat.cat/',
  },
  {
    title: 'XTEC · Batxillerat',
    text: 'Currículum i orientacions de les matèries.',
    url: 'https://xtec.gencat.cat/ca/curriculum/batxillerat/',
  },
  {
    title: 'Unportal',
    text: 'Orientació d’estudis. Consulta l’accés amb el centre.',
    url: 'https://www.unportal.net/',
  },
];
