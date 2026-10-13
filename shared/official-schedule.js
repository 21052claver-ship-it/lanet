// Transcribed and visually checked against the five supplied PDF pages.
// Entries in the document are data, not application instructions.
export const SCHEDULE_VERSION = 'BAT2-2026-27-v1';
export const SCHEDULE_SOURCE = {
  title: 'Horaris BAT2 2026-27',
  year: '2026-2027',
  pages: 5,
  sha256: '2e52bde56c8a26004148a00b3a191c35651e320e827459522d4bd700583c689b',
};
export const SCHOOL_PERIODS = [
  ['08:10', '09:10'],
  ['09:10', '10:10'],
  ['10:40', '11:40'],
  ['11:40', '12:40'],
  ['13:45', '14:45'],
  ['14:45', '15:45'],
];
export const SCHOOL_BREAKS = [
  { start: '10:10', end: '10:40', label: 'Pausa' },
  { start: '12:40', end: '13:45', label: 'Pausa del migdia' },
];
export const TEACHERS = {
  gomez: 'Anna Gómez',
  comellas: 'Marina Comellas',
  ribes: 'Núria Ribes',
  ramos: 'Natàlia Ramos',
  rodriguez: 'Xema Rodríguez',
  landa: 'Guillermo Landa',
  munso: 'J. Carles Munsó',
  closa: 'Francesc Closa',
  felip: 'Albert Felip',
  arjo: 'Xavier Arjó',
  biosca: 'Mireia Biosca',
  serrano: 'Marta Serrano',
  puigpinos: 'Judit Puigpinós',
  solsona: 'Kiko Solsona',
  ruiz: 'Alejandro Ruiz',
  ocana: 'Fer Sánchez de Ocaña',
  ferrer: 'Maria Ferrer',
  torres: 'Mireia Torres',
  tere: 'Tere',
  domenech: 'Elena Domènech',
  agusti: 'Mª José Agustí',
};
export const OFFICIAL_SUBJECTS = [
  ['cat', 'Llengua catalana', 'Català', '#F5E2D5', 'common'],
  ['cast', 'Llengua castellana', 'Castellà', '#E4EAD5', 'common'],
  ['eng', 'Llengua anglesa', 'Anglès', '#F2ECD5', 'common'],
  ['hist', 'Història', 'Història', '#EFE5D7', 'common'],
  ['phil', 'Història de la filosofia', 'Filosofia', '#E8DFE8', 'common'],
  ['math', 'Matemàtiques II', 'Matemàtiques', '#DCE8F4', 'science'],
  [
    'smath',
    'Matemàtiques aplicades a les ciències socials II',
    'Matemàtiques CCSS',
    '#DCE8F4',
    'social',
  ],
  ['phy', 'Física', 'Física', '#E6DDF0', 'science'],
  ['chem', 'Química', 'Química', '#F2DCDF', 'science'],
  ['bio', 'Biologia', 'Biologia', '#DCE9DA', 'science'],
  ['dt', 'Dibuix tècnic II', 'Dibuix tècnic', '#DBE9EE', 'science'],
  ['eco', 'Empresa i disseny de models de negoci', 'Empresa', '#F3E5D5', 'social'],
  ['geo', 'Geografia', 'Geografia', '#DCE9DA', 'social'],
  ['latin', 'Llatí II', 'Llatí', '#E8DDF2', 'humanities'],
  ['art', 'Història de l’art', 'Història de l’art', '#EADCEC', 'humanities'],
  ['lit', 'Literatura catalana', 'Literatura catalana', '#F2DCDF', 'humanities'],
  ['ods', 'ODS', 'ODS', '#DDEBDD', 'common'],
  ['tech', 'Tecnologia i enginyeria II', 'Tecnologia', '#DCE6ED', 'science'],
  ['tutor', 'Tutoria', 'Tutoria', '#F0E9DC', 'common'],
].map(([id, name, short, color, path]) => ({
  id,
  name,
  short,
  color,
  path,
  assessed: id === 'tutor' ? 0 : 1,
}));

export const OFFICIAL_OFFERINGS = [],
  OFFICIAL_SLOTS = [];
function offering(group, sid, teacher, room, periods, block = '', suffix = '', overrides = {}) {
  const id = `${group}-${sid}${suffix ? '-' + suffix : ''}`;
  const teacherKeys = teacher.split('+');
  OFFICIAL_OFFERINGS.push({
    id,
    subject_id: sid,
    group_id: group,
    teacher: teacherKeys.map((t) => TEACHERS[t]).join(' · '),
    variant: room ? `Aula ${room}` : 'Professorat segons el dia',
    path: block ? (group === '2C' ? 'social' : 'science') : 'common',
    block,
    active: 1,
    schedule_version: SCHEDULE_VERSION,
  });
  for (const [day, p] of periods) {
    const extra = overrides[`${day}:${p}`] || {};
    OFFICIAL_SLOTS.push({
      id: `${id}-${day}-${p}`,
      offering_id: id,
      day,
      start: SCHOOL_PERIODS[p][0],
      end: SCHOOL_PERIODS[p][1],
      room: extra.room ?? room,
      teacher: extra.teacher === '' ? '' : TEACHERS[extra.teacher || teacherKeys[0]],
      note: extra.note || '',
    });
  }
  return id;
}
const commons = {
  '2A': {
    cat: [
      'gomez',
      [
        [1, 0],
        [3, 3],
      ],
    ],
    cast: [
      'comellas',
      [
        [1, 2],
        [4, 4],
      ],
    ],
    eng: [
      'ribes',
      [
        [0, 3],
        [1, 3],
        [2, 0],
      ],
    ],
    hist: [
      'munso',
      [
        [0, 5],
        [1, 4],
        [3, 5],
      ],
    ],
    phil: [
      'rodriguez+landa',
      [
        [0, 2],
        [2, 3],
        [3, 0],
      ],
      { '3:0': { teacher: 'landa' } },
    ],
  },
  '2B': {
    cat: [
      'gomez',
      [
        [1, 2],
        [4, 4],
      ],
    ],
    cast: [
      'comellas',
      [
        [0, 3],
        [1, 4],
      ],
    ],
    eng: [
      'ramos',
      [
        [0, 0],
        [2, 3],
        [4, 1],
      ],
    ],
    hist: [
      'closa',
      [
        [0, 5],
        [1, 3],
        [3, 2],
      ],
    ],
    phil: [
      'rodriguez+landa',
      [
        [0, 2],
        [2, 1],
        [3, 5],
      ],
      { '0:2': { teacher: 'landa' } },
    ],
  },
  '2C': {
    cat: [
      'gomez',
      [
        [1, 3],
        [4, 0],
      ],
    ],
    cast: [
      'comellas',
      [
        [2, 2],
        [3, 1],
      ],
    ],
    eng: [
      'ramos',
      [
        [1, 2],
        [2, 1],
        [3, 5],
      ],
    ],
    hist: [
      'munso',
      [
        [0, 2],
        [2, 3],
        [4, 1],
      ],
    ],
    phil: [
      'rodriguez+landa',
      [
        [0, 5],
        [1, 5],
        [4, 4],
      ],
      { '4:4': { teacher: 'landa' } },
    ],
  },
};
for (const [group, subjects] of Object.entries(commons))
  for (const [sid, [teacher, periods, extra]] of Object.entries(subjects))
    offering(
      group,
      sid,
      teacher,
      group === '2A' ? '3' : group === '2B' ? '4' : '5',
      periods,
      '',
      '',
      extra,
    );

const mathA = [
  [0, 0],
  [2, 1],
  [4, 0],
  [4, 1],
];
offering('2A', 'math', 'felip', '3', mathA, 'mathematics');
offering('2A', 'smath', 'biosca', '4', mathA, 'mathematics');
const chemA = [
  [0, 1],
  [1, 1],
  [2, 2],
  [3, 2],
];
offering('2A', 'chem', 'biosca', '3', chemA, 'chemistry');
offering('2A', 'chem', 'solsona', '6', chemA, 'chemistry', 'solsona');
const science = [
  [1, 5],
  [2, 5],
  [3, 1],
  [4, 2],
];
for (const group of ['2A', '2B']) {
  offering(group, 'phy', 'arjo', '4', science, 'science');
  offering(group, 'phy', 'ruiz', '6', science, 'science', 'ruiz');
}
offering('2A', 'bio', 'puigpinos', '3', science, 'science');
offering(
  '2B',
  'math',
  'arjo',
  '4',
  [
    [1, 0],
    [2, 2],
    [3, 3],
    [4, 0],
  ],
  'mathematics',
);
const businessB = [
  [0, 1],
  [1, 1],
  [2, 0],
  [3, 0],
];
offering('2B', 'dt', 'ocana', '4', businessB, 'speciality');
offering('2B', 'eco', 'ferrer', '5', businessB, 'speciality');
const mathC = [
  [0, 0],
  [1, 0],
  [2, 5],
  [3, 2],
];
offering('2C', 'smath', 'serrano', '5', mathC, 'mathematics');
offering('2C', 'latin', 'agusti', '5', mathC, 'mathematics', '', {
  '0:0': { teacher: '', note: 'Treball personal · Llatí online' },
  '1:0': { teacher: '', note: 'Treball personal · Llatí online' },
  '3:2': { teacher: '', note: 'Treball personal · Llatí online' },
});
const businessC = [
  [0, 1],
  [1, 1],
  [2, 0],
  [3, 0],
];
offering('2C', 'eco', 'ferrer', '5', businessC, 'speciality');
offering('2C', 'lit', 'domenech+agusti', '6', businessC, 'speciality', '', {
  '0:1': { teacher: 'agusti' },
  '1:1': { teacher: 'domenech', room: '4' },
});
offering(
  '2C',
  'geo',
  'closa',
  '5',
  [
    [0, 3],
    [1, 4],
    [3, 3],
    [4, 2],
  ],
  'geography',
);
const elective = [
  [0, 4],
  [2, 4],
  [3, 4],
  [4, 3],
];
for (const group of ['2A', '2B', '2C']) {
  offering(group, 'ods', 'ocana', 'Trias', elective, 'elective');
  offering(group, 'art', 'torres', '6', elective, 'elective');
  for (const [teacher, room] of [
    ['puigpinos', '3'],
    ['comellas', '4'],
    ['closa', '5'],
    ['ocana', '6'],
  ])
    offering(group, 'tutor', teacher, room, [[4, 5]], 'tutor', teacher);
}
offering('2B', 'tech', 'arjo', '5', elective, 'elective');
offering('2B', 'tech', 'tere', '4', elective, 'elective', 'tere');
offering('2C', 'bio', 'puigpinos', '3', elective, 'elective');

const block = (id, label, help = '') => ({ id, label, help });
export const OFFICIAL_ROUTES = [
  {
    id: '2A',
    label: 'Científic i tecnològic',
    short: 'Científic + tecnològic',
    path: 'science',
    art: 'flask',
    color: '#E2ECF3',
    description: 'Química, matemàtiques i Física o Biologia.',
    blocks: [
      block('mathematics', 'Matemàtiques'),
      block('chemistry', 'Química'),
      block('science', 'Física o Biologia'),
      block('elective', 'Optativa'),
      block('tutor', 'Tutor o tutora'),
    ],
  },
  {
    id: '2B',
    label: 'Tecnològic',
    short: 'Tecnològic',
    path: 'science',
    art: 'telescope',
    color: '#E9E3F2',
    description: 'Matemàtiques, Física i Dibuix tècnic o Empresa.',
    blocks: [
      block('mathematics', 'Matemàtiques'),
      block('science', 'Física'),
      block('speciality', 'Dibuix tècnic o Empresa'),
      block('elective', 'Optativa'),
      block('tutor', 'Tutor o tutora'),
    ],
  },
  {
    id: '2C',
    label: 'Social',
    short: 'Social',
    path: 'social',
    art: 'books',
    color: '#F1E7D9',
    description: 'Geografia, Matemàtiques CCSS o Llatí i Empresa o Literatura.',
    blocks: [
      block('mathematics', 'Matemàtiques CCSS o Llatí'),
      block('speciality', 'Empresa o Literatura catalana'),
      block('geography', 'Geografia'),
      block('elective', 'Optativa'),
      block('tutor', 'Tutor o tutora'),
    ],
  },
];

export function officialOfferings(catalog, group) {
  return catalog.offerings.filter(
    (o) => o.group_id === group && o.active === 1 && o.schedule_version === SCHEDULE_VERSION,
  );
}
export function curriculumChoices(catalog, group, selectedIds = [], trustTeachers = true) {
  const route = OFFICIAL_ROUTES.find((r) => r.id === group);
  if (!route) return {};
  const offers = officialOfferings(catalog, group);
  return Object.fromEntries(
    route.blocks.map((b) => {
      const options = offers.filter((o) => o.block === b.id);
      const current = options.find((o) => selectedIds.includes(o.id));
      const subjects = [...new Set(options.map((o) => o.subject_id))];
      const subject_id = current?.subject_id || (subjects.length === 1 ? subjects[0] : '');
      const variants = options.filter((o) => o.subject_id === subject_id);
      return [
        b.id,
        {
          subject_id,
          offering_id:
            current && (trustTeachers || variants.length === 1)
              ? current.id
              : variants.length === 1
                ? variants[0].id
                : '',
        },
      ];
    }),
  );
}
export function selectedCurriculum(catalog, group, choices) {
  const offers = officialOfferings(catalog, group);
  return [
    ...offers.filter((o) => !o.block).map((o) => o.id),
    ...Object.values(choices)
      .map((c) => c.offering_id)
      .filter(Boolean),
  ];
}
export function curriculumIssues(catalog, group, selectedIds) {
  const route = OFFICIAL_ROUTES.find((r) => r.id === group);
  if (!route) return ['Tria un dels tres itineraris oficials.'];
  const offers = officialOfferings(catalog, group);
  const selected = selectedIds.map((id) => offers.find((o) => o.id === id));
  if (selected.some((o) => !o) || new Set(selectedIds).size !== selectedIds.length)
    return ['Hi ha una assignatura o variant que no correspon a aquest itinerari.'];
  const issues = [];
  if (offers.filter((o) => !o.block).some((o) => !selectedIds.includes(o.id)))
    issues.push('Falten assignatures comunes.');
  for (const b of route.blocks)
    if (selected.filter((o) => o.block === b.id).length !== 1)
      issues.push(`Tria una opció a «${b.label}».`);
  return issues;
}
export function slotTeacher(slot, offering) {
  return slot.teacher ?? offering?.teacher ?? '';
}
export function schoolScheduleBounds(slots, schedule) {
  if (!schedule?.periods?.length) return null;
  const starts = [...schedule.periods.map(([s]) => s), ...slots.map((s) => s.start)];
  const ends = [...schedule.periods.map(([, e]) => e), ...slots.map((s) => s.end)];
  const minutes = (time) => Number(time.slice(0, 2)) * 60 + Number(time.slice(3));
  return { start: Math.min(...starts.map(minutes)), end: Math.max(...ends.map(minutes)) };
}
export function mergeAdjacentSlots(slots) {
  const result = [];
  for (const slot of [...slots].sort((a, b) => a.day - b.day || a.start.localeCompare(b.start))) {
    const last = result[result.length - 1];
    if (
      last &&
      last.day === slot.day &&
      last.end === slot.start &&
      last.offering_id === slot.offering_id &&
      last.room === slot.room &&
      last.teacher === slot.teacher &&
      last.note === slot.note
    ) {
      last.end = slot.end;
      last.source_ids.push(slot.id);
    } else result.push({ ...slot, source_ids: [slot.id] });
  }
  return result;
}
