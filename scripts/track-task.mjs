import { readFileSync, writeFileSync, appendFileSync, existsSync, statSync } from 'node:fs';
import { resolve, relative, isAbsolute } from 'node:path';
import { execFileSync } from 'node:child_process';
const [action, id, summary, ...evidence] = process.argv.slice(2);
const path = 'docs/SEGUIMENT.json';
const plan = JSON.parse(readFileSync(path, 'utf8'));
const task = plan.tasks.find((t) => t.id === id);
if (!task || !['start', 'review', 'done'].includes(action))
  throw new Error('Acció o tasca invàlida.');
if (action === 'start') {
  if (plan.tasks.some((t) => ['active', 'review'].includes(t.status)))
    throw new Error('Ja hi ha feina activa.');
  if (
    task.status !== 'pending' ||
    task.depends_on.some((dep) => plan.tasks.find((t) => t.id === dep).status !== 'verified')
  )
    throw new Error('Dependències pendents.');
  task.status = 'active';
} else if (action === 'review') {
  if (task.status !== 'active') throw new Error('La tasca no està en curs.');
  task.status = 'review';
} else {
  if (!['active', 'review'].includes(task.status) || !summary || !evidence.length)
    throw new Error('Cal feina activa, resum i evidències.');
  // Reject missing or out-of-workspace evidence before changing the log or plan.
  for (const path of evidence) {
    const full = resolve(path),
      part = relative(process.cwd(), full);
    if (
      !part ||
      part.startsWith('..') ||
      isAbsolute(part) ||
      !existsSync(full) ||
      !statSync(full).isFile()
    )
      throw new Error(`Evidència absent o fora del projecte: ${path}.`);
  }
  const history = readFileSync('docs/HISTORIAL-CANVIS.md', 'utf8');
  const n = Math.max(0, ...[...history.matchAll(/### H(\d+) /g)].map((m) => Number(m[1]))) + 1;
  task.status = 'verified';
  task.evidence = evidence;
  task.change_log_id = `H${String(n).padStart(3, '0')}`;
  const date = new Intl.DateTimeFormat('ca-ES', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Europe/Madrid',
  }).format(new Date());
  appendFileSync(
    'docs/HISTORIAL-CANVIS.md',
    `\n### ${task.change_log_id} ${task.title}\n\n**${date} · ${id}.** ${summary}\n\nEvidències: ${evidence.map((p) => `[${p}](../${p})`).join(', ')}.\n`,
  );
}
writeFileSync(path, JSON.stringify(plan, null, 2) + '\n');
execFileSync(process.execPath, ['scripts/check-plan.mjs', '--write'], {
  stdio: 'inherit',
  windowsHide: true,
});
