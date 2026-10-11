import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, existsSync, statSync, mkdirSync } from 'node:fs';
import { resolve, relative, isAbsolute } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const read = (path) => readFileSync(resolve(root, path), 'utf8');
const plan = JSON.parse(read('docs/SEGUIMENT.json'));
const history = read('docs/HISTORIAL-CANVIS.md');
const args = process.argv.slice(2);
assert.ok(
  args.every((arg) => arg === '--write'),
  'Únic argument admès: --write.',
);
assert.equal(plan.schema_version, 1, 'Versió de registre no compatible.');
assert.equal(plan.max_active_tasks, 1, 'El límit de feina activa ha de ser 1.');
const labels = {
  pending: 'Pendent',
  active: 'En curs',
  review: 'En revisió',
  verified: 'Verificat',
};
function index(items, kind) {
  const map = new Map();
  for (const item of items) {
    assert.ok(typeof item.id === 'string' && item.id, `${kind} sense ID.`);
    assert.ok(!map.has(item.id), `ID duplicat: ${item.id}.`);
    map.set(item.id, item);
  }
  assert.ok(map.size, `Falten elements de ${kind}.`);
  return map;
}
const requirements = index(plan.requirements, 'requisit');
const phases = index(plan.phases, 'fase');
const tasks = index(plan.tasks, 'tasca');
function acyclic(map, kind) {
  const visited = new Set(),
    visiting = new Set();
  function visit(id) {
    assert.ok(map.has(id), `Dependència inexistent de ${kind}: ${id}.`);
    assert.ok(!visiting.has(id), `Cicle de dependències de ${kind}: ${id}.`);
    if (visited.has(id)) return;
    visiting.add(id);
    for (const dep of map.get(id).depends_on) visit(dep);
    visiting.delete(id);
    visited.add(id);
  }
  for (const id of map.keys()) visit(id);
}
for (const phase of phases.values()) {
  assert.ok(Array.isArray(phase.depends_on), `Falten dependències: ${phase.id}.`);
  assert.ok(
    plan.tasks.some((t) => t.phase === phase.id),
    `Fase sense tasques: ${phase.id}.`,
  );
}
acyclic(phases, 'fase');
const active = plan.tasks.filter((t) => ['active', 'review'].includes(t.status));
assert.ok(
  active.length <= plan.max_active_tasks,
  `Solapament: ${active.map((t) => t.id).join(', ')}.`,
);
function verifiedPhase(id) {
  return plan.tasks.filter((t) => t.phase === id).every((t) => t.status === 'verified');
}
function workspaceFile(path) {
  const full = resolve(root, path);
  const part = relative(root, full);
  assert.ok(
    part && !part.startsWith('..') && !isAbsolute(part),
    `Evidència fora del projecte: ${path}.`,
  );
  assert.ok(
    existsSync(full) && statSync(full).isFile(),
    `Evidència absent o no és fitxer: ${path}.`,
  );
}
const covered = new Set();
for (const task of tasks.values()) {
  assert.ok(phases.has(task.phase), `Fase inexistent a ${task.id}.`);
  assert.ok(Object.hasOwn(labels, task.status), `Estat invàlid a ${task.id}.`);
  assert.ok(Array.isArray(task.depends_on), `Falten dependències a ${task.id}.`);
  assert.equal(
    new Set(task.depends_on).size,
    task.depends_on.length,
    `Dependència duplicada a ${task.id}.`,
  );
  assert.ok(
    typeof task.acceptance === 'string' && task.acceptance.trim(),
    `Falta criteri a ${task.id}.`,
  );
  for (const field of ['requirements', 'files', 'checks'])
    assert.ok(Array.isArray(task[field]) && task[field].length, `Falta ${field} a ${task.id}.`);
  for (const req of task.requirements) {
    assert.ok(requirements.has(req), `Requisit inexistent ${req} a ${task.id}.`);
    covered.add(req);
  }
  for (const dep of task.depends_on)
    assert.ok(tasks.has(dep), `Dependència inexistent ${dep} a ${task.id}.`);
  if (task.status !== 'pending') {
    for (const dep of task.depends_on)
      assert.equal(
        tasks.get(dep).status,
        'verified',
        `${task.id} començada abans de verificar ${dep}.`,
      );
    for (const dep of phases.get(task.phase).depends_on)
      assert.ok(verifiedPhase(dep), `${task.id} començada abans de verificar la fase ${dep}.`);
  }
  if (task.status === 'verified') {
    assert.ok(
      Array.isArray(task.evidence) && task.evidence.length,
      `Tasca verificada sense evidència: ${task.id}.`,
    );
    for (const path of task.evidence) workspaceFile(path);
    assert.ok(
      task.change_log_id && history.includes(`### ${task.change_log_id} `),
      `Falta entrada d’historial a ${task.id}.`,
    );
  }
}
acyclic(tasks, 'tasca');
for (const req of requirements.keys()) assert.ok(covered.has(req), `Requisit sense tasca: ${req}.`);
const ready = plan.tasks.filter(
  (t) =>
    t.status === 'pending' &&
    t.depends_on.every((dep) => tasks.get(dep).status === 'verified') &&
    phases.get(t.phase).depends_on.every(verifiedPhase),
);
const done = plan.tasks.filter((t) => t.status === 'verified').length;
const lines = [
  '# Checklist de la revisió de La Net',
  '',
  'Generada des de [SEGUIMENT.json](SEGUIMENT.json). No s’edita a mà. Especificació: [pla mestre](PLA-MESTRE.md). Canvis fets: [historial](HISTORIAL-CANVIS.md).',
  '',
  `**${done}/${plan.tasks.length} tasques verificades · ${requirements.size} requisits · ${phases.size} fases · límit d’una tasca activa.**`,
  '',
  'Les tasques verificades de preparació no equivalen a millores de producte implementades.',
  '',
  `Tasca activa: **${active.length ? active[0].id + ' — ' + active[0].title : 'cap'}**.`,
  '',
  `Següent tasca preparada: **${ready.length ? ready[0].id + ' — ' + ready[0].title : 'cap'}**.`,
  '',
];
for (const phase of phases.values()) {
  lines.push(`## ${phase.id} ${phase.title}`, '');
  for (const task of plan.tasks.filter((t) => t.phase === phase.id)) {
    lines.push(
      `- [${task.status === 'verified' ? 'x' : ' '}] **${task.id}** ${task.title} — ${labels[task.status]}.`,
    );
  }
  lines.push('');
}
lines.push(
  'Cada tasca inclou fitxers previstos, criteri d’acceptació, comprovacions i evidències al registre. Per actualitzar: canviar el registre, afegir l’entrada d’historial en verificar i executar `npm run plan:sync` i `npm run plan:check`.',
  '',
);
const checklist = lines.join('\n');
const checklistPath = resolve(root, 'docs/CHECKLIST.md');
if (args.includes('--write')) writeFileSync(checklistPath, checklist);
assert.ok(existsSync(checklistPath), 'Falta la checklist; executa npm run plan:sync.');
assert.equal(
  readFileSync(checklistPath, 'utf8').replaceAll('\r\n', '\n'),
  checklist,
  'Checklist desactualitzada; executa npm run plan:sync.',
);
const report = {
  checked_at: new Date().toISOString(),
  timezone: plan.timezone,
  requirements: requirements.size,
  phases: phases.size,
  tasks: tasks.size,
  verified: done,
  active: active.map((t) => t.id),
  next_ready: ready.map((t) => t.id),
  checks: [
    'unique_ids',
    'requirements_covered',
    'dependencies_exist',
    'no_cycles',
    'one_active_task',
    'dependencies_verified_before_start',
    'verified_tasks_have_files_and_history',
    'checklist_current',
  ],
};
mkdirSync(resolve(root, 'output/planning'), { recursive: true });
writeFileSync(
  resolve(root, 'output/planning/seguiment-result.json'),
  JSON.stringify(report, null, 2) + '\n',
);
console.log(
  `Pla coherent: ${requirements.size} requisits, ${phases.size} fases, ${tasks.size} tasques, ${done} verificades, ${active.length} actives.`,
);
console.log(`Següent tasca preparada: ${ready[0]?.id || 'cap'}.`);
