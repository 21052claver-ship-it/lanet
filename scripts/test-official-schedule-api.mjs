// Real local workerd/D1 migration and API check. No production resources or accounts.
import { spawn, spawnSync } from 'node:child_process';
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { randomUUID, createHash } from 'node:crypto';
import assert from 'node:assert/strict';
import { parse } from 'jsonc-parser';
import {
  OFFICIAL_ROUTES,
  OFFICIAL_OFFERINGS,
  SCHEDULE_VERSION,
  SCHOOL_PERIODS,
} from '../shared/official-schedule.js';

const out = process.env.LANET_API_TEST_OUTPUT || 'output/official-schedule';
const state = `${out}/d1-${Date.now()}`;
mkdirSync(state, { recursive: true });
const config = parse(readFileSync('wrangler.local.jsonc', 'utf8'));
config.main = resolve('worker/entry.ts');
config.assets.directory = resolve('dist');
config.d1_databases[0].migrations_dir = resolve('migrations');
delete config.services;
config.vars = {
  ...config.vars,
  GOOGLE_CLIENT_ID: 'local-timetable.apps.googleusercontent.com',
  GOOGLE_CLIENT_SECRET: 'local-test-only',
  GOOGLE_REDIRECT_URI: 'http://127.0.0.1:8792/api/auth/google/callback',
};
const configPath = state + '/app.jsonc';
writeFileSync(configPath, JSON.stringify(config));
const wrangler = resolve('node_modules/wrangler/bin/wrangler.js');
function cli(args) {
  const r = spawnSync(
    process.execPath,
    [wrangler, '--config', configPath, ...args, '--persist-to', state],
    {
      encoding: 'utf8',
      windowsHide: true,
      maxBuffer: 8 * 1024 * 1024,
      input: 'y\n',
      env: { ...process.env, WRANGLER_WRITE_LOGS: 'false' },
    },
  );
  writeFileSync(state + '/d1.log', (r.stdout || '') + (r.stderr || ''), { flag: 'a' });
  assert.equal(r.status, 0, 'Local D1 command must succeed; see ' + state + '/d1.log');
}
cli(['d1', 'migrations', 'apply', 'DB', '--local']);
const tokens = Object.fromEntries(
  ['2A', '2B', '2C', 'delegate', 'admin'].map((g) => [g, randomUUID()]),
);
const fixtures = Object.entries(tokens).map(([g, token]) => {
  const hash = createHash('sha256').update(token).digest('hex');
  return `INSERT INTO users(id,email,name,password_hash,salt,google_sub,group_id,role) VALUES('${g}','timetable-${g}@fje.edu','Prova horari ${g}','unused','fixture','local-${g}','2A','${g === 'admin' ? 'admin' : g === 'delegate' ? 'delegate' : 'student'}');
  INSERT INTO sessions(hash,user_id,expires,auth_provider) VALUES('${hash}','${g}',${Date.now() + 3600000},'google');
  INSERT INTO enrollments VALUES('${g}','2A-math');
  INSERT INTO grade_entries(id,user_id,subject_id,term,category,title,grade,weight,position) VALUES('kept-${g}','${g}','math',1,'exam','Nota existent',8.6,37,0);`;
});
fixtures.push(
  "INSERT INTO delegation_members(email,unit_id,name,position) VALUES('timetable-delegate@fje.edu','science','Delegat local de prova','delegate');",
);
writeFileSync(state + '/fixtures.sql', fixtures.join('\n'));
cli(['d1', 'execute', 'DB', '--local', '--file', state + '/fixtures.sql']);
const server = spawn(
  process.execPath,
  [wrangler, '--config', configPath, 'dev', '--local', '--port', '8792', '--persist-to', state],
  {
    windowsHide: true,
    stdio: ['pipe', 'pipe', 'pipe'],
    env: { ...process.env, WRANGLER_WRITE_LOGS: 'false' },
  },
);
let logs = '';
for (const pipe of [server.stdout, server.stderr])
  pipe.on('data', (chunk) => {
    logs = (logs + chunk.toString()).slice(-30000);
  });
const base = 'http://127.0.0.1:8792';
const results = [];
let completed = false;
async function request(g, path, payload, status = 200) {
  const response = await fetch(base + '/api' + path, {
    method: payload ? 'POST' : 'GET',
    headers: {
      Origin: base,
      Cookie: 'lanet_session=' + tokens[g],
      'Content-Type': 'application/json',
    },
    ...(payload ? { body: JSON.stringify(payload) } : {}),
  });
  const body = await response.json();
  assert.equal(response.status, status, path + ': ' + JSON.stringify(body));
  return body;
}
const idsFor = (route) => {
  const offers = OFFICIAL_OFFERINGS.filter((o) => o.group_id === route.id);
  return [
    ...offers.filter((o) => !o.block).map((o) => o.id),
    ...route.blocks.map((b) => offers.find((o) => o.block === b.id).id),
  ];
};
try {
  for (let attempt = 0; attempt < 100; attempt++) {
    try {
      if ((await fetch(base + '/api/health')).ok) break;
    } catch {}
    if (attempt === 99) throw new Error('Local timetable API did not start.');
    await new Promise((r) => setTimeout(r, 200));
  }
  for (const route of OFFICIAL_ROUTES) {
    const ids = idsFor(route),
      body = { group_id: route.id, path: route.path, offerings: ids };
    await request(route.id, '/configure', body);
    const saved = await request(route.id, '/bootstrap');
    assert.equal(saved.user.group_id, route.id);
    assert.equal(saved.user.schedule_version, SCHEDULE_VERSION);
    assert.deepEqual(new Set(saved.enrollments.map((e) => e.offering_id)), new Set(ids));
    const slots = saved.slots.filter((s) => ids.includes(s.offering_id));
    assert.equal(slots.length, 30);
    for (let day = 0; day < 5; day++)
      assert.deepEqual(
        slots
          .filter((s) => s.day === day)
          .sort((a, b) => a.start.localeCompare(b.start))
          .map((s) => [s.start, s.end]),
        SCHOOL_PERIODS,
      );
    assert.equal(saved.grades.find((r) => r.id === 'kept-' + route.id).grade, 8.6);
    assert.ok(!saved.grades.some((r) => r.subject_id === 'tutor'));
    await request(route.id, '/configure', { ...body, offerings: ids.slice(1) }, 400);
    await request(route.id, '/configure', { ...body, offerings: [...ids, ids[0]] }, 400);
    await request(route.id, '/configure', { ...body, path: 'humanities' }, 400);
    const after = await request(route.id, '/bootstrap');
    assert.deepEqual(after.enrollments, saved.enrollments);
    assert.deepEqual(after.grades, saved.grades);
    results.push({
      group: route.id,
      saved: true,
      hourlySlots: slots.length,
      badRequestsRejected: 3,
      personalGradesPreserved: true,
    });
    console.log(
      route.id + ': real local D1 migration, configuration, persistence and rejection checks OK',
    );
  }
  await request(
    'delegate',
    '/configure',
    { group_id: '2B', path: 'science', offerings: idsFor(OFFICIAL_ROUTES[1]) },
    403,
  );
  console.log('Delegate group restriction preserved.');
  const proposal = {
    title: 'Examen API local',
    kind: 'exam',
    date: '2026-11-03',
    start: '09:10',
    end: '10:10',
    subject_id: 'math',
    visibility: 'shared',
    audience_kind: 'class',
  };
  const preview = await request('2A', '/agenda/preview', proposal);
  assert.equal(preview.reviewers.length, 1);
  const submitted = await request('2A', '/events', proposal);
  assert.equal(submitted.status, 'pending');
  const pending = await request('delegate', '/bootstrap');
  assert.ok(pending.agendaProposals.some((e) => e.id === submitted.id));
  assert.ok(
    !(await request('2B', '/bootstrap')).agendaProposals.some((e) => e.id === submitted.id),
  );
  await request('2A', '/events', { ...proposal, title: 'Títol duplicat' }, 409);
  await request('delegate', '/events/' + submitted.id + '/review', {
    revision: 1,
    decision: 'approve',
    confirmed: true,
  });
  const published = await request('2A', '/bootstrap');
  assert.ok(published.events.some((e) => e.id === submitted.id));
  assert.equal(published.agendaNotifications.length, 1);
  await request(
    'delegate',
    '/events/' + submitted.id + '/review',
    { revision: 1, decision: 'approve', confirmed: true },
    409,
  );
  const privateDate = await request('2A', '/events', {
    ...proposal,
    title: 'Data privada API',
    date: '2026-11-04',
    visibility: 'private',
  });
  assert.ok(!(await request('delegate', '/bootstrap')).events.some((e) => e.id === privateDate.id));
  results.push({
    agenda: true,
    proposals: true,
    duplicateBlocked: true,
    scopedReview: true,
    privateDatesProtected: true,
    persistentNotifications: true,
  });
  console.log(
    'Agenda: proposals, scoped review, duplicates, privacy and notifications on real local D1 OK.',
  );
  const cat = await request('admin', '/catalog');
  for (const id of ['2A-phil', '2C-lit', '2C-latin']) {
    const offering = cat.offerings.find((o) => o.id === id);
    const slots = cat.slots.filter((s) => s.offering_id === id);
    await request('admin', '/admin/offerings', {
      ...offering,
      slots: slots.map(({ id, day, start, end, room }) => ({ id, day, start, end, room })),
    });
    const after = await request('admin', '/catalog');
    assert.deepEqual(
      after.slots.filter((s) => s.offering_id === id).sort((a, b) => a.id.localeCompare(b.id)),
      slots.sort((a, b) => a.id.localeCompare(b.id)),
    );
  }
  console.log(
    'Management: per-day teachers, personal work and IDs preserved by old payloads on real local D1.',
  );
  completed = true;
} finally {
  writeFileSync(state + '/server.log', logs);
  writeFileSync(
    `${out}/api-results.json`,
    JSON.stringify(
      { localOnly: true, publicSiteVisited: false, state, results, passed: completed },
      null,
      2,
    ) + '\n',
  );
  if (process.platform === 'win32' && server.pid)
    spawnSync('taskkill', ['/PID', String(server.pid), '/T', '/F'], {
      windowsHide: true,
      stdio: 'ignore',
    });
  else server.kill();
}
