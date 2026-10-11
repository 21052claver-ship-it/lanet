import { readFileSync, writeFileSync } from 'node:fs';
const path = 'docs/SEGUIMENT.json';
const plan = JSON.parse(readFileSync(path, 'utf8'));
if (plan.requirements.some((r) => r.id === 'R45')) throw new Error('Fase ja registrada.');
plan.requirements.push({
  id: 'R45',
  description:
    'Google com a única entrada; identitat de Google sincronitzada i no editable, sense perdre dades existents.',
});
plan.phases.push({
  id: 'F32',
  title: 'Accés exclusiu amb Google i identitat protegida',
  depends_on: ['F31'],
});
const tasks = [
  [
    'T32-01',
    'Auditar accessos, planificar i preservar les dades',
    ['T31-02'],
    ['docs/PLA-GOOGLE-UNIC.md', 'backups/', 'output/google-only/'],
    'Pla seqüencial, política de migració segura i còpia local abans de tocar autenticació.',
  ],
  [
    'T32-02',
    'Aplicar Google únic al servidor i sincronitzar la identitat',
    ['T32-01'],
    ['worker/', 'migrations/', 'tests/google-auth.test.js', 'tests/auth-policy.test.js'],
    'Accessos antics rebutjats; només sessions Google; identitat immutable via API, migració per correu verificat del centre i dades conservades.',
  ],
  [
    'T32-03',
    'Simplificar entrada, perfil i administració',
    ['T32-02'],
    ['src/', 'tests/auth-session.test.js', 'wrangler.jsonc', 'wrangler.local.jsonc'],
    'Una sola acció de login; perfil sense camps editables d’identitat; preferències operatives, sense invitacions ni recuperació de contrasenya.',
  ],
  [
    'T32-04',
    'Verificar, migrar, publicar i lliurar',
    ['T32-03'],
    ['scripts/test-api.mjs', 'docs/', 'output/google-only/', 'exports/'],
    'Suite, API amb D1/R2, tipus i lint correctes; còpia remota, migració conservadora, entrada Google real i comprovació visual mòbil/escriptori; paquet complet verificat.',
  ],
];
for (const [id, title, depends_on, files, acceptance] of tasks)
  plan.tasks.push({
    id,
    phase: 'F32',
    title,
    status: 'pending',
    requirements: ['R45'],
    depends_on,
    files,
    acceptance,
    checks: [acceptance],
    evidence: [],
    change_log_id: null,
  });
writeFileSync(path, JSON.stringify(plan, null, 2) + '\n');
