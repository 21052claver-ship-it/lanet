import { madridDay, addDays } from '../shared/domain.js';

export const betaPublisher = 'beta-2026-publisher';
const disclaimer =
  'MOSTRA BETA · Dades fictícies per provar La Net. No és una convocatòria real ni compta per a la nota.';
const q = (v) =>
  v === null
    ? 'NULL'
    : typeof v === 'number'
      ? String(v)
      : "'" + String(v).replaceAll("'", "''") + "'";

// Fixed identifiers make a retry safe. Existing dates, personal data and progress are never overwritten.
export function betaContentSql(day = madridDay()) {
  const statements = [];
  const insert = (table, row) =>
    statements.push(
      `INSERT OR IGNORE INTO ${table}(${Object.keys(row).join(',')}) VALUES(${Object.values(row).map(q).join(',')});`,
    );
  insert('users', {
    id: betaPublisher,
    email: 'beta-content@lanet.invalid',
    name: 'La Net · Mostra beta',
    password_hash: 'NO_LOGIN',
    salt: 'NO_LOGIN',
    disabled: 1,
    password_enabled: 0,
  });
  const schoolDays = [];
  for (let i = 0; schoolDays.length < 15; i++) {
    const date = addDays(day, i);
    if (![0, 6].includes(new Date(date + 'T12:00:00Z').getUTCDay())) schoolDays.push(date);
  }
  const subjects = [
    [
      'math',
      'Derivades i optimització',
      'Deriva x³ − 2x i localitza els punts crítics. Explica el signe de la derivada a cada interval.',
    ],
    [
      'cat',
      'Comentari de text',
      'Llegeix un article breu. Identifica la tesi, dos arguments i els connectors. Escriu una síntesi de 80 paraules.',
    ],
    [
      'eng',
      'Writing: opinion essay',
      'Write 150 words about studying with technology. Use an introduction, two arguments and a conclusion.',
    ],
    [
      'phy',
      'Camp elèctric',
      'Dibuixa el camp de dues càrregues. Distingeix E = F/q del potencial V = kQ/r i comprova les unitats.',
    ],
    [
      'hist',
      'Anàlisi de fonts històriques',
      'Classifica una font com a primària o secundària. Identifica autor, context, destinatari i idea principal.',
    ],
    [
      'chem',
      'Equilibri químic',
      'Ajusta la reacció, escriu Kc i prepara una taula inicial–variació–equilibri. Justifica cada pas.',
    ],
    [
      'cast',
      'Sintaxis y argumentación',
      'Localiza las proposiciones de una oración compuesta. Identifica sus nexos y explica la función de cada una.',
    ],
    [
      'phil',
      'Descartes i el dubte metòdic',
      'Relaciona dubte metòdic, cogito i criteri d’evidència. Distingeix res cogitans i res extensa.',
    ],
  ];
  subjects.forEach(([sid, topic, exercise], i) => {
    for (const [type, offset, title] of [
      ['exam', i + 3, `Parcial · ${topic}`],
      ['task', i, `Deures · ${topic}`],
    ]) {
      insert('events', {
        id: `beta-2026-${type}-${sid}`,
        owner_id: betaPublisher,
        title: `[Beta] ${title}`,
        kind: type === 'task' ? 'deadline' : 'exam',
        display_kind: type,
        date: schoolDays[offset],
        start: type === 'task' ? '18:00' : '09:00',
        end: type === 'task' ? '18:30' : '10:00',
        subject_id: sid,
        offering_id: null,
        group_id: null,
        room: type === 'task' ? '' : 'Aula de mostra',
        body: `${disclaimer}\n\n${exercise}`,
        visibility: 'shared',
        source_key: `beta-2026-${type}-${sid}`,
      });
    }
    insert('notes', {
      id: `beta-2026-note-${sid}`,
      author_id: betaPublisher,
      subject_id: sid,
      title: `[Beta] Guia de repàs · ${topic}`,
      summary: 'Apunt gratuït de mostra amb una proposta de repàs i autoavaluació.',
      body: `${disclaimer}\n\nObjectiu\nRepassar: ${topic}.\n\nPràctica\n${exercise}\n\nMètode de repàs\n1. Escriu què recordes sense mirar els apunts.\n2. Comprova els conceptes i corregeix els errors.\n3. Resol un exemple nou i explica’l amb les teves paraules.\n\nAutoavaluació\nPuc explicar el concepte? Puc resoldre l’exercici sense ajuda? Quina pregunta faré a classe?`,
      price: 0,
    });
  });
  for (const [i, title, sid, place] of [
    [0, 'Taller de debat i argumentació', 'cat', 'Biblioteca · mostra'],
    [1, 'Observació del cel', 'phy', 'Observatori · mostra'],
    [2, 'English conversation club', 'eng', 'Aula de llengües · mostra'],
    [3, 'Ciència i sostenibilitat', 'chem', 'Laboratori · mostra'],
    [4, 'Cafè filosòfic', 'phil', 'Biblioteca · mostra'],
    [5, 'Ruta per les fonts històriques', 'hist', 'Museu · mostra'],
  ]) {
    const id = `beta-2026-plus-${i}`;
    insert('pluses', {
      id,
      author_id: betaPublisher,
      title: `[Beta] ${title}`,
      body: `${disclaimer}\n\nExemple d’activitat per explorar el detall, desar-la i provar els filtres d’assignatures.`,
      date: schoolDays[i + 2],
      start: '17:00',
      end: '18:30',
      place,
      conditions:
        'Simulació: assistència i reflexió de 150 paraules. El plus és fictici; no s’afegeix cap punt a les notes.',
    });
    insert('plus_subjects', { plus_id: id, subject_id: sid, bonus: '+0,25 punts · mostra' });
  }
  [
    'Organitzar un grup de repàs',
    'Compartir resums abans dels parcials',
    'Proposar una tarda d’estudi',
  ].forEach((title, i) =>
    insert('proposals', {
      id: `beta-2026-proposal-${i}`,
      author_id: betaPublisher,
      title: `[Beta] ${title}`,
      body: `${disclaimer}\n\nExemple per provar les propostes i els vots. Pots crear també la teva proposta real, explicant què t’ajudaria a estudiar millor.`,
      status: 'Proposat',
    }),
  );
  insert('announcements', {
    id: 'beta-2026-welcome',
    author_id: betaPublisher,
    title: 'Benvinguts a la beta de La Net',
    body: 'Els elements [Beta] són exemples ficticis: dates, activitats i plusos no són oficials. Prova l’agenda, marca deures, consulta apunts gratuïts i comparteix suggeriments. Les teves dades personals són independents d’aquestes mostres.',
    group_id: null,
    pinned: 1,
  });
  return statements.join('\n');
}

// Run once with the content, guarded by a marker so a retry cannot clear a tester’s new bid.
export const betaBoardResetSql = `UPDATE banners SET archived=1 WHERE archived=0 AND NOT EXISTS(SELECT 1 FROM settings WHERE key='beta-2026-board-reset');
INSERT OR IGNORE INTO settings(key,value) VALUES('beta-2026-board-reset','2026-10-11');`;
