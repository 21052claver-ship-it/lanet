import { pbkdf2Sync, createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { SUBJECTS, WEIGHTS, DEMO_GRADES } from '../shared/catalog.js';
import { PERIODS, madridDay, monday, addDays } from '../shared/domain.js';
import { defaultAssessments } from '../shared/assessments.js';
const q = (v) =>
  v === null ? 'NULL' : typeof v === 'number' ? String(v) : `'${String(v).replaceAll("'", "''")}'`;
const statements = [];
let guard = "NOT EXISTS(SELECT 1 FROM settings WHERE key='catalog_initialized')";
const insert = (table, obj) =>
  statements.push(
    `INSERT OR IGNORE INTO ${table}(${Object.keys(obj).join(',')}) SELECT ${Object.values(obj).map(q).join(',')} WHERE ${guard};`,
  );
insert('settings', { key: 'school_name', value: 'Institut · La Net' });
for (const group of ['2A', '2B']) {
  insert('groups', { id: group, name: `2n de batxillerat ${group.slice(1)}` });
  for (const [sid, name, short, color, path, teacher, slots] of SUBJECTS) {
    insert('subjects', { id: sid, name, short, color, path });
    const oid = `${group}-${sid}`;
    insert('offerings', {
      id: oid,
      subject_id: sid,
      group_id: group,
      teacher,
      variant: 'Grup principal',
      path,
    });
    for (const [d, p] of slots)
      insert('slots', {
        id: `${oid}-${d}-${p}`,
        offering_id: oid,
        day: d,
        start: PERIODS[p],
        end:
          String(Number(PERIODS[p].slice(0, 2)) + 1).padStart(2, '0') + ':' + PERIODS[p].slice(3),
        room: sid === 'phy' ? 'B12' : sid === 'chem' ? 'Laboratori' : 'A03',
      });
    for (let term = 1; term <= 3; term++)
      for (const [i, assessment] of defaultAssessments(WEIGHTS[sid]).entries())
        insert('templates', {
          id: `${oid}-${term}-${i}`,
          offering_id: oid,
          term,
          category: assessment.category,
          assessment_type: assessment.assessment_type,
          title: assessment.title,
          date: null,
          weight: assessment.weight,
          position: i,
        });
  }
}
mkdirSync('.wrangler', { recursive: true });
statements.push("INSERT OR IGNORE INTO settings(key,value) VALUES('catalog_initialized','true');");
writeFileSync('.wrangler/catalog.sql', statements.join('\n'));
function execute(file) {
  const result = spawnSync(
    process.execPath,
    [
      'node_modules/wrangler/bin/wrangler.js',
      '--config',
      'wrangler.local.jsonc',
      'd1',
      'execute',
      'DB',
      '--local',
      '--file',
      file,
    ],
    { encoding: 'utf8', windowsHide: true, maxBuffer: 8 * 1024 * 1024 },
  );
  if (result.status !== 0) {
    console.error(result.stderr || result.stdout);
    process.exit(result.status || 1);
  }
  console.log(`Dades carregades: ${file}`);
}
execute('.wrangler/catalog.sql');
if (!readFileSync('.dev.vars', 'utf8').includes('DEMO_MODE=true')) {
  console.log('Catàleg inicialitzat; les dades de demostració estan desactivades.');
  process.exit(0);
}
statements.length = 0;
guard = '1';
const hash = (t) => createHash('sha256').update(t).digest('hex');
for (const [uid, email, name, role] of [
  ['julia', 'julia@lanet.local', 'Júlia Vidal', 'student'],
  ['laia', 'laia@lanet.local', 'Laia Soler', 'delegate'],
  ['admin', 'admin@lanet.local', 'Administració', 'admin'],
]) {
  const salt = `lanet-local-${uid}`;
  insert('users', {
    id: uid,
    email,
    name,
    role,
    group_id: '2B',
    configured: 1,
    salt,
    password_hash: pbkdf2Sync('LaNet.Local2026!', salt, 100000, 32, 'sha256').toString('hex'),
  });
  insert('ledger', {
    id: `welcome-${uid}`,
    user_id: uid,
    amount: 24,
    reason: 'Benvinguda de demostració',
    ref: `welcome-${uid}`,
    day: madridDay(),
  });
  for (const sid of Object.keys(DEMO_GRADES)) {
    guard = `NOT EXISTS(SELECT 1 FROM settings WHERE key='demo_initialized:${uid}')`;
    insert('enrollments', { user_id: uid, offering_id: `2B-${sid}` });
    for (let term = 1; term <= 3; term++)
      for (const [i, assessment] of defaultAssessments(WEIGHTS[sid]).entries())
        insert('grade_entries', {
          id: `${uid}-${sid}-${term}-${i}`,
          user_id: uid,
          subject_id: sid,
          term,
          category: assessment.category,
          assessment_type: assessment.assessment_type,
          title: assessment.title,
          grade: uid === 'julia' && term === 1 && i < 3 ? DEMO_GRADES[sid][i] : null,
          weight: assessment.weight,
          position: i,
          template_id: `2B-${sid}-${term}-${i}`,
        });
  }
  guard = '1';
  insert('settings', { key: `demo_initialized:${uid}`, value: 'true' });
}
insert('invitations', {
  hash: hash('LANET-2026'),
  label: 'Invitació local',
  group_id: '2B',
  expires: Date.now() + 365 * 86400000,
  max_uses: 1000,
});
const next = addDays(monday(), 7);
for (const [eid, title, sid, offset, start, room] of [
  ['exam-phy', 'Camp elèctric i potencial', 'phy', 1, '08:00', 'B12'],
  ['exam-math', 'Derivades i optimització', 'math', 2, '12:30', 'A03'],
  ['exam-cat', 'Comentari de text', 'cat', 4, '12:30', 'A03'],
])
  insert('events', {
    id: eid,
    owner_id: 'laia',
    title,
    kind: 'exam',
    date: addDays(next, offset),
    start,
    end: String(Number(start.slice(0, 2)) + 1).padStart(2, '0') + ':' + start.slice(3),
    subject_id: sid,
    offering_id: `2B-${sid}`,
    group_id: '2B',
    room,
    body: 'Repassa els apunts del tema i porta el material habitual. Publicat per la delegada del grup.',
    visibility: 'shared',
  });
for (const [nid, sid, title, body, price] of [
  [
    'n1',
    'math',
    'Derivades, pas a pas',
    'Una derivada descriu com canvia una funció.\n\nRegles essencials\n• Constant: f′(x) = 0\n• Potència: (xⁿ)′ = n·xⁿ⁻¹\n• Producte: (fg)′ = f′g + fg′\n\nExemple: f(x) = x³ − 2x. Aleshores f′(x) = 3x² − 2.\n\nPer trobar màxims i mínims, resol f′(x) = 0 i comprova el signe abans i després del punt.',
    0,
  ],
  [
    'n2',
    'phy',
    'Camp elèctric: esquema i fórmules',
    'El camp elèctric és la força per unitat de càrrega: E = F/q.\n\nUna càrrega puntual genera E = kQ/r². El potencial és V = kQ/r.\n\nRecorda: el camp és vectorial; el potencial és escalar. El treball del camp entre dos punts depèn de la diferència de potencial.',
    0,
  ],
  [
    'n3',
    'chem',
    'Equilibri químic · guia d’exercicis',
    'La constant d’equilibri relaciona les concentracions dels productes i dels reactius.\n\n1. Escriu la reacció ajustada.\n2. Construeix la taula inicial, variació i equilibri.\n3. Substitueix a Kc.\n4. Comprova que les concentracions siguin positives.\n\nInclou exercicis resolts sobre el principi de Le Chatelier.',
    5,
  ],
  [
    'n4',
    'phil',
    'Descartes en una pàgina',
    'Dubte metòdic → cogito → criteri d’evidència → existència de Déu → realitat externa.\n\nRes cogitans: substància pensant. Res extensa: substància material.\n\nAl comentari de text, distingeix la idea principal del fragment i la seva relació amb el sistema filosòfic.',
    0,
  ],
])
  insert('notes', {
    id: nid,
    author_id: 'laia',
    subject_id: sid,
    title,
    body,
    summary: body.slice(0, 145),
    price,
  });
for (const [pid, title, offset, place, sids] of [
  [
    'p1',
    'Una mirada al cel: nit d’astronomia',
    8,
    'Observatori del centre',
    [['phy', '+0,25 punts']],
  ],
  [
    'p2',
    'Ciència i sostenibilitat',
    10,
    'Auditori municipal',
    [
      ['chem', '+0,20 punts'],
      ['bio', '+0,20 punts'],
    ],
  ],
  [
    'p3',
    'Pensar la intel·ligència artificial',
    12,
    'Biblioteca del centre',
    [['phil', '+0,25 punts']],
  ],
]) {
  insert('pluses', {
    id: pid,
    author_id: 'laia',
    title,
    body: 'Una activitat oberta a estudiants de batxillerat. Comparteix la teva experiència amb el grup i consulta les condicions de l’assignatura.',
    date: addDays(madridDay(), offset),
    start: '17:30',
    end: '19:00',
    place,
    conditions:
      'Cal assistir a l’activitat i entregar una reflexió breu. Confirma el plus amb el teu professor abans de comptar-lo.',
  });
  for (const [sid, bonus] of sids)
    insert('plus_subjects', { plus_id: pid, subject_id: sid, bonus });
}
insert('announcements', {
  id: 'a1',
  author_id: 'laia',
  title: 'Física: recorda l’aula B12',
  body: 'La classe de Física es fa a l’aula B12. Trobareu el canvi també a l’horari del grup.',
  group_id: '2B',
  pinned: 1,
});
insert('announcements', {
  id: 'a2',
  author_id: 'laia',
  title: 'Construïm La Net entre tots',
  body: 'Tens una idea per estudiar millor? Publica-la a Propostes i vota les que t’ajudarien més.',
  group_id: null,
  pinned: 0,
});
insert('proposals', {
  id: 'pr1',
  author_id: 'laia',
  title: 'Exportar el calendari d’exàmens',
  body: 'Poder afegir les dates al calendari del mòbil.',
  status: 'Fet',
  response: 'Ja pots descarregar el calendari en format .ics des d’Horari i calendari.',
});
insert('proposals', {
  id: 'pr2',
  author_id: 'julia',
  title: 'Grups per preparar la selectivitat',
  body: 'Un espai per trobar companys que vulguin repassar la mateixa assignatura.',
  status: 'En estudi',
  response: 'Estem recollint les preferències dels grups.',
});
writeFileSync('.wrangler/demo.sql', statements.join('\n'));
execute('.wrangler/demo.sql');
console.log('La Net local inicialitzada. Les dades existents s’han conservat.');
