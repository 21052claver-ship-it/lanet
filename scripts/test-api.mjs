import { spawn, spawnSync } from 'node:child_process';
import { mkdirSync, writeFileSync, readFileSync, readdirSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { resolve } from 'node:path';
import { parse } from 'jsonc-parser';
import { randomUUID, createHash } from 'node:crypto';
import assert from 'node:assert/strict';
import { emptyPau } from '../shared/pau.js';
const state = `output/api-tests/${Date.now()}`;
mkdirSync(state, { recursive: true });
const wrangler = 'node_modules/wrangler/bin/wrangler.js';
const testConfig = parse(readFileSync('wrangler.local.jsonc', 'utf8'));
testConfig.main = resolve('worker/entry.ts');
testConfig.assets.directory = resolve('dist');
testConfig.d1_databases[0].migrations_dir = resolve('migrations');
testConfig.services = [{ binding: 'MEDIA_SAFETY', service: 'lanet-isolated-media-fixture' }];
writeFileSync(state + '/app.jsonc', JSON.stringify(testConfig));
writeFileSync(
  state + '/media.jsonc',
  JSON.stringify({
    name: 'lanet-isolated-media-fixture',
    main: resolve('tests/helpers/media-service-fixture.js'),
    compatibility_date: '2026-10-08',
    workers_dev: false,
    preview_urls: false,
  }),
);
function cli(args) {
  const r = spawnSync(
    process.execPath,
    [wrangler, '--config', 'wrangler.local.jsonc', ...args, '--persist-to', state],
    {
      encoding: 'utf8',
      windowsHide: true,
      maxBuffer: 8 * 1024 * 1024,
    },
  );
  if (r.status !== 0) throw new Error(r.stderr || r.stdout);
}
cli(['d1', 'migrations', 'apply', 'DB', '--local']);
// Isolated, pre-verified Google sessions exercise the application API. The actual
// signed provider callback, verification and migration are covered separately.
const fixtureTokens = Object.fromEntries(
  [
    'admin',
    'a',
    'b',
    'board',
    'welcome',
    'roulette',
    'predictionA',
    'predictionB',
    'predictionResolver',
    'formats',
    'retention',
    ...Array.from({ length: 5 }, (_, i) => 'reader' + i),
  ].map((key) => [key, randomUUID()]),
);
const legacyToken = randomUUID();
const fixtures = Object.entries(fixtureTokens).map(([key, token]) => {
  const role = key === 'admin' ? 'admin' : 'student';
  const name = key === 'a' ? 'Estudiant A' : key === 'b' ? 'Estudiant B' : 'Google ' + key;
  const digest = createHash('sha256').update(token).digest('hex');
  // Spend the real welcome grant in fixtures that exercise zero-balance rules.
  // A separate untouched account below verifies the actual initial balance.
  const spendWelcome = [
    'welcome',
    'roulette',
    'predictionA',
    'predictionB',
    'predictionResolver',
  ].includes(key)
    ? ''
    : `INSERT INTO ledger(id,user_id,amount,reason,ref,day) VALUES('fixture-spend-${key}','${key}',-5,'Fixture: benvinguda gastada','fixture-spend-${key}','2026-10-11');`;
  return `INSERT INTO users(id,email,name,password_hash,salt,role,group_id,google_sub,given_name,family_name,avatar_url,password_enabled) VALUES('${key}','${key}@fje.edu','${name}','unusable','salt','${role}','2B','google-api-${key}','Estudiant','${key.toUpperCase()}','',0);${spendWelcome}INSERT INTO sessions(hash,user_id,expires,auth_provider) VALUES('${digest}','${key}',${Date.now() + 3600000},'google');`;
});
fixtures.push(
  `INSERT INTO sessions(hash,user_id,expires) VALUES('${createHash('sha256').update(legacyToken).digest('hex')}','admin',${Date.now() + 3600000});`,
);
fixtures.push(
  ...['tech1', 'tech2', 'science', 'social'].map(
    (unit) =>
      `INSERT INTO delegation_members(unit_id,email,name,position) VALUES('${unit}','admin@fje.edu','Representant local de prova','delegate');`,
  ),
  "INSERT INTO ledger(id,user_id,amount,reason,ref,day) VALUES('test-start','admin',10000,'Prova','test-start','2026-10-08'),('board-start','board',24,'Prova','board-start','2026-10-08');",
  "INSERT INTO ledger(id,user_id,amount,reason,ref,day) VALUES('retention-start','retention',1000,'Prova','retention-start','2026-10-11');",
);
// A closed market is prepared only in the isolated fixture, with its actual
// stake-debit triggers. Restoring the immutable-rule guard happens before startup.
const closedPrediction = randomUUID(),
  predictionMigration = readFileSync('migrations/0022_predictions.sql', 'utf8');
const marketGuard = predictionMigration.match(
  /CREATE TRIGGER prediction_market_guard[\s\S]*?\nEND;/,
)?.[0];
assert.ok(marketGuard);
fixtures.push(`INSERT INTO prediction_markets(id,creator_id,request_id,resolver_id,title,option_a,option_b,rules,closes_at,resolve_by) VALUES('${closedPrediction}','predictionA','${randomUUID()}','predictionResolver','Predicció local ja tancada','Equip A','Equip B','Segons el marcador oficial. Empat: retornar tot.',unixepoch()+600,unixepoch()+605400);
INSERT INTO prediction_actions(id,market_id,actor_id,request_id,kind,reason) VALUES('${randomUUID()}','${closedPrediction}','predictionResolver','${randomUUID()}','accept','');
INSERT INTO prediction_bets(id,market_id,user_id,request_id,choice,stake,day) VALUES('${randomUUID()}','${closedPrediction}','predictionA','${randomUUID()}','A',2,'2026-10-11'),('${randomUUID()}','${closedPrediction}','predictionB','${randomUUID()}','B',3,'2026-10-11');
DROP TRIGGER prediction_market_guard;
UPDATE prediction_markets SET closes_at=unixepoch()-60,resolve_by=unixepoch()+604740 WHERE id='${closedPrediction}';
${marketGuard}`);
writeFileSync(state + '/fixtures.sql', fixtures.join('\n'));
cli(['d1', 'execute', 'DB', '--local', '--file', state + '/fixtures.sql']);
let logs = '';
const server = spawn(
  process.execPath,
  [
    wrangler,
    '--config',
    state + '/app.jsonc',
    '--config',
    state + '/media.jsonc',
    'dev',
    '--local',
    '--port',
    '8791',
    '--var',
    'GOOGLE_CLIENT_ID:integration-test.apps.googleusercontent.com',
    '--var',
    'GOOGLE_CLIENT_SECRET:isolated-api-test-not-a-real-secret',
    '--var',
    'GOOGLE_REDIRECT_URI:http://127.0.0.1:8791/api/auth/google/callback',
    '--persist-to',
    state,
  ],
  { windowsHide: true, stdio: 'pipe' },
);
server.stdout.on('data', (b) => {
  logs = (logs + b.toString()).slice(-30000);
});
server.stderr.on('data', (b) => {
  logs = (logs + b.toString()).slice(-30000);
});
const base = 'http://127.0.0.1:8791';
const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
function client(token = '') {
  let cookie = token ? 'lanet_session=' + token : '';
  return {
    async request(path, data, expected = 200, method = data === undefined ? 'GET' : 'POST') {
      const r = await fetch(base + '/api' + path, {
        method,
        headers: { 'Content-Type': 'application/json', Cookie: cookie, Origin: base },
        body: data === undefined ? undefined : JSON.stringify(data),
      });
      const next = r.headers.get('Set-Cookie');
      if (next) {
        assert.match(next, /HttpOnly/);
        assert.match(next, /SameSite=Lax/);
        cookie = next.split(';')[0];
      }
      const result = await r.json();
      assert.equal(r.headers.get('X-Content-Type-Options'), 'nosniff');
      assert.equal(r.headers.get('X-Frame-Options'), 'DENY');
      assert.ok(r.headers.get('Content-Security-Policy')?.includes("frame-ancestors 'none'"));
      assert.ok(r.headers.get('Cache-Control')?.includes('no-store'));
      assert.ok(
        (Array.isArray(expected) ? expected : [expected]).includes(r.status),
        `${method} ${path}: status ${r.status} ${JSON.stringify(result)}`,
      );
      return { ...result, _status: r.status };
    },
    async file(
      file,
      name = 'document.txt',
      expected = 201,
      contentType = 'application/octet-stream',
    ) {
      const r = await fetch(base + '/api/files', {
        method: 'POST',
        headers: {
          Cookie: cookie,
          Origin: base,
          'Content-Type': contentType,
          'X-File-Name': encodeURIComponent(name),
        },
        body: file,
      });
      assert.equal(r.status, expected);
      return r.json();
    },
    async readFile(id, expected = 200, range) {
      const r = await fetch(base + '/api/files/' + id, {
        headers: { Cookie: cookie, ...(range ? { Range: range } : {}) },
      });
      assert.equal(r.status, expected);
      return r;
    },
  };
}
let passed = 0;
const databaseDirectory = resolve(state, 'v3/d1/miniflare-D1DatabaseObject');
const databaseFiles = readdirSync(databaseDirectory).filter((name) =>
  /^[a-f0-9]{64}\.sqlite$/.test(name),
);
assert.equal(databaseFiles.length, 1, 'Exactly one isolated application database');
const fixtureDatabase = new DatabaseSync(resolve(databaseDirectory, databaseFiles[0]));
fixtureDatabase.exec('PRAGMA busy_timeout=5000');
const resetRequestBudgets = () => fixtureDatabase.exec('DELETE FROM rate_limits');
const check = (label, fn) =>
  Promise.resolve()
    // Independent scenarios share data, but must not inherit failed-request
    // budgets. Real guards remain enabled within each scenario and have their
    // own regressions; upload quarantine is intentionally preserved separately.
    .then(resetRequestBudgets)
    .then(fn)
    .then(() => {
      passed++;
      console.log(`✓ ${label}`);
    });
try {
  for (let attempt = 0; attempt < 80; attempt++) {
    try {
      if ((await fetch(base + '/api/health')).ok) break;
    } catch {}
    if (attempt === 79) throw new Error('El servidor de proves no s’ha iniciat.');
    await pause(250);
  }
  const anon = client(),
    admin = client(fixtureTokens.admin),
    a = client(fixtureTokens.a),
    b = client(fixtureTokens.b);
  await check('Accés anònim bloquejat', () => anon.request('/bootstrap', undefined, 401));
  await check(
    'Benvinguda: cinc pastissos reals al moneder sense repetir en recarregar',
    async () => {
      const welcome = client(fixtureTokens.welcome);
      for (let i = 0; i < 3; i++) {
        const data = await welcome.request('/bootstrap');
        assert.equal(data.user.balance, 5);
        assert.equal(data.wallet.filter((row) => row.ref === 'welcome-welcome').length, 1);
      }
    },
  );
  await check('Google: configuracio, PKCE i cancel·lacio amb estat i cookie reals', async () => {
    assert.equal((await anon.request('/auth/status')).google, true);
    const started = await fetch(base + '/api/auth/google/start', {
      method: 'POST',
      headers: { Origin: base, 'Content-Type': 'application/json' },
      body: JSON.stringify({ intent: 'login' }),
    });
    assert.equal(started.status, 200);
    const cookie = started.headers.get('Set-Cookie');
    assert.match(cookie, /HttpOnly/);
    const url = new URL((await started.json()).url);
    assert.equal(url.searchParams.get('code_challenge_method'), 'S256');
    assert.equal(url.searchParams.get('hd'), 'fje.edu');
    assert.equal(url.searchParams.get('scope'), 'openid email profile');
    const callback =
      base +
      '/api/auth/google/callback?state=' +
      url.searchParams.get('state') +
      '&error=access_denied';
    const result = await fetch(callback, {
      headers: { Cookie: cookie.split(';')[0] },
      redirect: 'manual',
    });
    assert.equal(result.status, 303);
    assert.equal(
      new URL(result.headers.get('Location')).searchParams.get('auth_result'),
      'cancelled',
    );
    assert.equal(result.headers.get('Referrer-Policy'), 'no-referrer');
    const replay = await fetch(callback, {
      headers: { Cookie: cookie.split(';')[0] },
      redirect: 'manual',
    });
    assert.equal(
      new URL(replay.headers.get('Location')).searchParams.get('auth_result'),
      'expired',
    );
  });
  await check('Google: metodes incorrectes i origen aliè rebutjats', async () => {
    assert.equal((await fetch(base + '/api/auth/google/start')).status, 405);
    assert.equal(
      (
        await fetch(base + '/api/auth/google/callback', {
          method: 'POST',
          headers: { Origin: base },
        })
      ).status,
      405,
    );
    assert.equal(
      (
        await fetch(base + '/api/auth/google/start', {
          method: 'POST',
          headers: { Origin: 'https://attacker.example' },
          body: '{"intent":"login"}',
        })
      ).status,
      403,
    );
    assert.equal(
      (
        await fetch(base + '/api/auth/google/start', {
          method: 'POST',
          headers: { Origin: base },
          body: '{"intent":"link"}',
        })
      ).status,
      400,
    );
  });
  await check('Google unic: accessos antics tancats i sessio anterior rebutjada', async () => {
    const status = await anon.request('/auth/status');
    assert.equal(status.auth_method, 'google');
    assert.equal(status.guest, false);
    assert.equal(status.demo, false);
    for (const route of ['login', 'register', 'guest', 'reset', 'bootstrap', 'password'])
      await anon.request('/auth/' + route, {}, 403);
    await client(legacyToken).request('/bootstrap', undefined, 401);
    await client(legacyToken).request('/auth/logout', {});
  });
  let aUser, bUser;
  await check('Sessions Google aillades i identitat protegida', async () => {
    aUser = (await a.request('/auth/me')).user;
    bUser = (await b.request('/auth/me')).user;
    assert.equal(aUser.role, 'student');
    assert.equal(aUser.google_connected, true);
    assert.equal(aUser.identity_locked, true);
    assert.equal(aUser.has_password, false);
    assert.equal(aUser.google_sub, undefined);
  });
  const assessedSubjects = ['cat', 'cast', 'eng', 'hist', 'phil', 'math', 'phy', 'dt', 'ods'];
  const offerings = [...assessedSubjects.map((s) => '2B-' + s), '2B-tutor-puigpinos'];
  await check('Perfil: identitat immutable i preferencies editables', async () => {
    for (const key of ['name', 'given_name', 'family_name', 'email', 'avatar_url', 'google_sub'])
      await b.request('/profile', { [key]: 'Modified', preferences: { volume: 0.99 } }, 403);
    await b.request('/preferences', { volume: 0.37 });
    const d = await b.request('/bootstrap');
    assert.equal(d.user.name, bUser.name);
    assert.equal(d.user.given_name, 'Estudiant');
    assert.equal(d.user.family_name, 'B');
    assert.equal(d.preferences.volume, 0.37);
    assert.equal(d.user.has_password, false);
    assert.equal(d.user.google_connected, true);
    assert.equal(d.user.identity_locked, true);
    assert.equal(d.user.google_sub, undefined);
    assert.equal(d.user.password_enabled, undefined);
  });
  await check('Curs personalitzat i plantilles completes', async () => {
    await a.request('/configure', { group_id: '2B', path: 'science', offerings });
    const d = await a.request('/bootstrap');
    assert.equal(d.enrollments.length, 10);
    assert.equal(d.grades.length, 324);
    assert.ok(d.grades.every((g) => g.grade === null));
    assert.ok(d.grades.every((g) => g.category !== 'participation'));
    for (const subject of assessedSubjects)
      for (const term of [1, 2, 3]) {
        const entries = d.grades.filter((g) => g.subject_id === subject && g.term === term);
        assert.equal(entries.length, 12);
        assert.equal(
          entries.reduce((sum, entry) => sum + entry.weight, 0),
          100,
        );
        for (const type of ['partial1', 'partial2', 'term'])
          assert.equal(entries.filter((entry) => entry.assessment_type === type).length, 1);
        for (const type of ['writing', 'assignment', 'presentation'])
          assert.equal(entries.filter((entry) => entry.assessment_type === type).length, 3);
      }
  });
  await b.request('/configure', { group_id: '2B', path: 'science', offerings });
  await check('Variants incompatibles rebutjades', () =>
    a.request(
      '/configure',
      { group_id: '2B', path: 'science', offerings: [...offerings, '2B-bio'] },
      400,
    ),
  );
  const initial = await a.request('/bootstrap');
  await check('Notes privades i nota zero vàlida', async () => {
    await a.request('/grades/batch', { entries: [{ id: initial.grades[0].id, grade: 0 }] });
    assert.equal(
      (await a.request('/bootstrap')).grades.find((g) => g.id === initial.grades[0].id).grade,
      0,
    );
    assert.ok(!(await b.request('/bootstrap')).grades.some((g) => g.user_id === aUser.id));
    await b.request('/grades/batch', { entries: [{ id: initial.grades[0].id, grade: 10 }] }, 403);
  });
  await check(
    'Mode discret privat, notes intactes i preferències parcials concurrents',
    async () => {
      assert.equal((await b.request('/bootstrap')).preferences.hideGrades, false);
      await Promise.all([
        a.request('/preferences', { hideGrades: true }),
        a.request('/preferences', { volume: 0.41 }),
        a.request('/preferences', { lofi: 'jazz-forecast' }),
        a.request('/preferences', { notesSubjects: ['math', 'phy'] }),
      ]);
      const d = await a.request('/bootstrap');
      assert.equal(d.preferences.hideGrades, true);
      assert.equal(d.preferences.volume, 0.41);
      assert.equal(d.preferences.lofi, 'jazz-forecast');
      assert.deepEqual(d.preferences.notesSubjects, ['math', 'phy']);
      assert.equal(d.grades.find((g) => g.id === initial.grades[0].id).grade, 0);
      assert.equal((await b.request('/bootstrap')).preferences.hideGrades, false);
      await a.request('/preferences', { hideGrades: 'true' }, 400);
      await a.request('/preferences', { hideGrades: false });
      assert.equal((await a.request('/bootstrap')).preferences.hideGrades, false);
    },
  );
  await check(
    'Avaluació personal: tres exàmens, activitats opcionals, zero i pesos persistents',
    async () => {
      const before = await a.request('/bootstrap'),
        other = await b.request('/bootstrap');
      const entries = before.grades
        .filter((row) => row.subject_id === 'math' && row.term === 1)
        .map((row) => ({ ...row }));
      entries.find((row) => row.assessment_type === 'partial1').grade = 8.25;
      const term = entries.find((row) => row.assessment_type === 'term');
      term.grade = 0;
      term.weight -= 10;
      const writing = entries.find((row) => row.assessment_type === 'writing');
      writing.grade = 7.5;
      writing.weight = 10;
      writing.title = 'Redacció sobre el llibre';
      await a.request('/grades/sheet', { subject_id: 'math', term: 1, entries });
      const after = (await a.request('/bootstrap')).grades.filter(
        (row) => row.subject_id === 'math' && row.term === 1,
      );
      assert.equal(after.length, 12);
      assert.equal(
        after.reduce((sum, row) => sum + row.weight, 0),
        100,
      );
      assert.equal(after.find((row) => row.assessment_type === 'term').grade, 0);
      assert.equal(after.find((row) => row.id === writing.id).grade, 7.5);
      assert.equal(after.find((row) => row.id === writing.id).assessment_type, 'writing');
      assert.deepEqual(after.map((row) => row.id).sort(), entries.map((row) => row.id).sort());
      assert.deepEqual((await b.request('/bootstrap')).grades, other.grades);
    },
  );
  await check(
    'Tipus invàlids i participació rebutjats sense modificar notes o plantilles',
    async () => {
      const before = await a.request('/bootstrap');
      const entries = before.grades.filter((row) => row.subject_id === 'math' && row.term === 1);
      for (const patch of [
        { category: 'participation', assessment_type: 'other_activity' },
        { category: 'exam', assessment_type: 'writing' },
        { assessment_type: 'fake' },
      ])
        await a.request(
          '/grades/sheet',
          {
            subject_id: 'math',
            term: 1,
            entries: entries.map((row, i) => (i === 0 ? { ...row, ...patch } : row)),
          },
          400,
        );
      await b.request('/admin/templates', { offering_id: '2B-math', term: 1, entries }, 403);
      assert.deepEqual((await a.request('/bootstrap')).grades, before.grades);
    },
  );
  await check(
    'Plantilla del delegat coherent i recuperació conservant zeros i activitats personals',
    async () => {
      const before = await a.request('/bootstrap'),
        other = await b.request('/bootstrap');
      const entries = before.grades.filter((row) => row.subject_id === 'math' && row.term === 1);
      await a.request('/grades/sheet', {
        subject_id: 'math',
        term: 1,
        entries: [
          ...entries,
          {
            title: 'Activitat personal anterior',
            category: 'activity',
            assessment_type: 'other_activity',
            grade: 9,
            date: '2026-10-12',
            weight: 0,
          },
        ],
      });
      const custom = (await a.request('/bootstrap')).grades.find(
        (row) => row.title === 'Activitat personal anterior',
      );
      const templates = (await admin.request('/bootstrap')).templates.filter(
        (row) => row.offering_id === '2B-math' && row.term === 1,
      );
      await admin.request('/admin/templates', {
        offering_id: '2B-math',
        term: 1,
        entries: templates,
      });
      await a.request('/grades/restore', { subject_id: 'math', term: 1 });
      const after = (await a.request('/bootstrap')).grades.filter(
        (row) => row.subject_id === 'math' && row.term === 1,
      );
      assert.equal(after.find((row) => row.assessment_type === 'partial1').grade, 8.25);
      assert.equal(after.find((row) => row.assessment_type === 'term').grade, 0);
      assert.equal(after.find((row) => row.id === custom.id).grade, 9);
      assert.equal(after.find((row) => row.id === custom.id).date, '2026-10-12');
      assert.equal(after.find((row) => row.id === custom.id).weight, 0);
      assert.equal(
        after.reduce((sum, row) => sum + row.weight, 0),
        100,
      );
      assert.deepEqual((await b.request('/bootstrap')).grades, other.grades);
    },
  );
  await check('Pesos obligatoris del 100%', () =>
    a.request(
      '/grades/sheet',
      {
        subject_id: 'math',
        term: 1,
        entries: [{ title: 'Prova', category: 'exam', grade: null, weight: 50 }],
      },
      400,
    ),
  );
  let event;
  await check('Propostes públiques pendents i dates privades protegides', async () => {
    const current = await a.request('/bootstrap');
    const offering = current.offerings.find(
      (o) => o.subject_id === 'math' && current.enrollments.some((e) => e.offering_id === o.id),
    );
    assert.ok(offering);
    const proposal = await a.request('/events', {
      title: 'Proposta pública pendent',
      kind: 'exam',
      date: '2026-10-15',
      visibility: 'shared',
      subject_id: 'math',
      offering_id: offering.id,
      audience_kind: 'offering',
    });
    assert.equal(proposal.status, 'pending');
    assert.ok(!(await b.request('/bootstrap')).events.some((e) => e.id === proposal.id));
    await a.request(
      '/events/' + proposal.id + '/review',
      { decision: 'approve', revision: 1, confirmed: true },
      403,
    );
    await a.request('/events/' + proposal.id, {}, 200, 'DELETE');
    event = await a.request('/events', {
      title: 'Recordatori privat',
      kind: 'reminder',
      date: '2026-10-15',
      visibility: 'private',
    });
    assert.ok(!(await b.request('/bootstrap')).events.some((e) => e.id === event.id));
    // A private identifier is deliberately hidden from other accounts.
    await b.request('/events/' + event.id, {}, 404, 'DELETE');
    assert.ok((await a.request('/bootstrap')).events.some((e) => e.id === event.id));
  });
  await check('Un únic pastís diari amb dotze peticions paral·leles', async () => {
    const results = await Promise.all(
      Array.from({ length: 12 }, () => a.request('/bakery/claim', {}, [200, 429])),
    );
    assert.equal(results.filter((r) => r.claimed).length, 1);
    assert.ok(results.filter((r) => r._status === 429).every((r) => r.code === 'rate_limited'));
    assert.equal((await a.request('/bootstrap')).user.balance, 1);
  });
  await check(
    'Repte retirat: GET i POST no generen recompenses ni alteren el moneder',
    async () => {
      const before = await a.request('/bootstrap');
      await a.request('/bakery/challenge', undefined, 404);
      await a.request('/bakery/challenge', { answer: '12' }, 404);
      const after = await a.request('/bootstrap');
      assert.equal(after.user.balance, before.user.balance);
      assert.deepEqual(after.wallet, before.wallet);
      assert.equal('challengeClaimed' in after, false);
    },
  );
  let plus;
  await check('Plus multiassignatura i calendari sense duplicats', async () => {
    plus = await a.request('/pluses', {
      title: 'Prova científica',
      body: 'Activitat compartida',
      date: '2026-11-10',
      place: 'Biblioteca',
      subjects: [
        { subject_id: 'phy', bonus: '+0,25' },
        { subject_id: 'dt', bonus: '+0,50' },
      ],
    });
    await b.request(`/pluses/${plus.id}/calendar`, {});
    await b.request(`/pluses/${plus.id}/calendar`, {});
    assert.equal(
      (await b.request('/bootstrap')).events.filter(
        (e) => e.source_key === `plus:${plus.id}:${bUser.id}`,
      ).length,
      1,
    );
  });
  await check('Likes gratuïts, recompensa única i sense autorecompensa', async () => {
    await b.request(`/pluses/${plus.id}/like`, { active: true });
    await b.request(`/pluses/${plus.id}/like`, { active: false });
    await b.request(`/pluses/${plus.id}/like`, { active: true });
    await a.request(`/pluses/${plus.id}/like`, { active: true });
    assert.equal((await a.request('/bootstrap')).user.balance, 2);
    assert.equal((await b.request('/bootstrap')).user.balance, 0);
    await b.request(`/pluses/${plus.id}/like`, undefined, 405);
  });
  await check('Plusos finals: dos de 0,25, correcció privada, zero i pendent', async () => {
    const first = await a.request('/grades/bonus', {
      subject_id: 'phy',
      plus_id: plus.id,
      maximum: 0.25,
      grade: 0.23,
    });
    const second = await a.request('/grades/bonus', {
      subject_id: 'phy',
      title: 'Presentació',
      maximum: 0.25,
    });
    await a.request('/grades/bonus', { subject_id: 'phy', title: 'Un tercer', maximum: 0.25 }, 409);
    await a.request(
      '/grades/batch',
      {
        entries: [
          { id: first.id, grade: 0.24 },
          { id: second.id, grade: 0.26 },
        ],
      },
      400,
    );
    assert.equal(
      (await a.request('/bootstrap')).gradeBonuses.find((row) => row.id === first.id).grade,
      0.23,
    );
    await a.request('/grades/batch', {
      entries: [
        { id: first.id, grade: 0 },
        { id: second.id, grade: 0.24 },
      ],
    });
    assert.equal(
      (await a.request('/bootstrap')).gradeBonuses.find((row) => row.id === first.id).grade,
      0,
    );
    assert.ok(!(await b.request('/bootstrap')).gradeBonuses.some((row) => row.id === first.id));
    await b.request('/grades/batch', { entries: [{ id: first.id, grade: 0.2 }] }, 403);
    await b.request('/grades/bonus/remove', { id: first.id }, 403);
    for (const bonus of [first, second]) await a.request('/grades/bonus/remove', { id: bonus.id });
    assert.ok((await a.request('/bootstrap')).pluses.some((row) => row.id === plus.id));
  });
  await check('Un plus de 0,50 ocupa els dos espais i limita la nota corregida', async () => {
    const bonus = await a.request('/grades/bonus', {
      subject_id: 'dt',
      plus_id: plus.id,
      maximum: 0.5,
      grade: 0.45,
    });
    await a.request('/grades/bonus', { subject_id: 'dt', title: 'Un altre', maximum: 0.25 }, 409);
    await a.request('/grades/batch', { entries: [{ id: bonus.id, grade: 0.51 }] }, 400);
    assert.equal(
      (await a.request('/bootstrap')).gradeBonuses.find((row) => row.id === bonus.id).grade,
      0.45,
    );
    await a.request('/grades/batch', { entries: [{ id: bonus.id, grade: null }] });
    assert.equal(
      (await a.request('/bootstrap')).gradeBonuses.find((row) => row.id === bonus.id).grade,
      null,
    );
    await a.request('/grades/bonus/remove', { id: bonus.id });
  });
  await check('Pesos anuals acumulatius per assignatura, privats i amb suma 100%', async () => {
    const setting = {
      subject_id: 'math',
      equal_terms: false,
      limit_to_ten: true,
      weights: [16.67, 33.33, 50],
    };
    await a.request('/grades/course', setting);
    await a.request('/grades/course', { ...setting, weights: [16, 33, 50] }, 400);
    assert.equal(
      (await a.request('/bootstrap')).courseSettings.find((row) => row.subject_id === 'math')
        .term3_weight,
      50,
    );
    assert.deepEqual((await b.request('/bootstrap')).courseSettings, []);
  });
  let note, file;
  await check('Adjunts persistents i publicació amb múltiples formats', async () => {
    file = await a.file('Text adjunt de prova');
    note = await a.request('/notes', {
      title: 'Apunts privats amb preu',
      subject_id: 'math',
      body: 'Contingut complet reservat al comprador',
      summary: 'Mostra pública',
      price: 2,
      files: [file],
    });
    await b.readFile(file.id, 403);
    assert.equal((await b.request('/bootstrap')).notes.find((n) => n.id === note.id).body, '');
  });
  await check('Una compra sense saldo no transfereix res', async () => {
    await b.request(`/notes/${note.id}/unlock`, { price: 2 }, 409);
    assert.equal((await a.request('/bootstrap')).user.balance, 2);
  });
  await b.request('/bakery/claim', {});
  let free = await b.request('/notes', {
    title: 'Apunts gratuïts',
    subject_id: 'math',
    body: 'Text complet',
    price: 0,
    files: [],
  });
  await a.request(`/notes/${free.id}/like`, { active: true });
  await check('Compra atòmica i idempotent', async () => {
    await Promise.all([
      b.request(`/notes/${note.id}/unlock`, { price: 2 }),
      b.request(`/notes/${note.id}/unlock`, { price: 2 }),
    ]);
    assert.equal((await b.request('/bootstrap')).user.balance, 0);
    assert.equal((await a.request('/bootstrap')).user.balance, 4);
    assert.equal(
      (await b.request(`/notes/${note.id}`)).body,
      'Contingut complet reservat al comprador',
    );
    assert.equal(await (await b.readFile(file.id)).text(), 'Text adjunt de prova');
  });
  await check('Els apunts comprats es conserven després de retirar-los', async () => {
    await a.request('/notes/' + note.id, {}, 200, 'DELETE');
    assert.ok((await b.request('/bootstrap')).notes.find((n) => n.id === note.id).unlocked);
    await b.readFile(file.id);
  });
  await check('Els fitxers d’altres persones no es poden vincular a una publicació', async () => {
    await b.request(
      '/notes',
      { title: 'Fitxer robat', subject_id: 'math', body: 'Prova', price: 0, files: [file] },
      403,
    );
    assert.ok(!(await b.request('/bootstrap')).notes.some((n) => n.title === 'Fitxer robat'));
  });
  let proposal;
  await check('Propostes globals, edició pròpia i vot únic', async () => {
    proposal = await a.request('/proposals', {
      title: 'Idea de prova',
      body: 'Millorar el calendari',
      files: [],
    });
    await a.request('/proposals/' + proposal.id, {
      title: 'Idea editada',
      body: 'Millorar el calendari',
      status: 'Proposat',
      files: [],
    });
    await b.request(`/proposals/${proposal.id}/vote`, { active: true });
    await b.request(`/proposals/${proposal.id}/vote`, { active: true });
    assert.equal(
      (await b.request('/bootstrap')).proposals.find((p) => p.id === proposal.id).votes,
      1,
    );
    await a.request('/proposals/' + proposal.id, { status: 'Fet' }, 403);
  });
  await check(
    'Cartell permanent: un client antic no el pot ocultar ni perdre altres preferències',
    async () => {
      const before = await admin.request('/bootstrap');
      await admin.request('/preferences', {
        showBoard: false,
        hideGrades: true,
        notesSubjects: ['math'],
      });
      await admin.request('/preferences', { density: 'comfortable' });
      const after = await admin.request('/bootstrap');
      assert.equal(after.preferences.showBoard, true);
      assert.equal(after.preferences.hideGrades, true);
      assert.deepEqual(after.preferences.notesSubjects, ['math']);
      assert.equal(after.preferences.density, 'comfortable');
      assert.deepEqual(after.enrollments, before.enrollments);
      assert.deepEqual(after.grades, before.grades);
      assert.deepEqual(after.wallet, before.wallet);
      assert.equal(after.user.balance, before.user.balance);
    },
  );
  await check(
    'Primera oferta d’1 pastís: imports invàlids, concurrència i cobrament únic',
    async () => {
      const before = await admin.request('/bootstrap');
      assert.equal(before.banner, null);
      assert.equal(before.minBid, 1);
      for (const amount of [-1, 0, 0.5, 1.5]) {
        resetRequestBudgets();
        await admin.request('/banner', { title: 'Invàlid', amount, previous_id: null }, 400);
      }
      const invalid = await admin.request('/bootstrap');
      assert.equal(invalid.banner, null);
      assert.deepEqual(invalid.wallet, before.wallet);
      assert.equal(invalid.user.balance, before.user.balance);
      const outcomes = await Promise.all(
        Array.from({ length: 2 }, () =>
          admin.request(
            '/banner',
            { title: 'Primer cartell', amount: 1, previous_id: null },
            [200, 409],
          ),
        ),
      );
      assert.equal(outcomes.filter((r) => r._status === 200).length, 1);
      const after = await admin.request('/bootstrap');
      assert.equal(after.banner.amount, 1);
      assert.equal(after.minBid, 2);
      assert.equal(after.user.balance, before.user.balance - 1);
      assert.equal(after.wallet.length, before.wallet.length + 1);
      await admin.request(
        '/banner',
        { title: 'Massa baix', amount: 1, previous_id: after.banner.id },
        400,
      );
      assert.deepEqual((await admin.request('/bootstrap')).wallet, after.wallet);
    },
  );
  await check('Oferta del bàner amb saldo real i doble mínim', async () => {
    const current = (await admin.request('/bootstrap')).banner;
    await a.request(
      '/banner',
      { title: 'Sense saldo', body: '', color: 'peach', amount: 10, previous_id: current.id },
      409,
    );
    const before = await admin.request('/bootstrap');
    const outcomes = await Promise.all(
      Array.from({ length: 2 }, () =>
        admin.request(
          '/banner',
          {
            title: 'Missatge de prova',
            body: 'Hola',
            color: 'sage',
            amount: 10,
            previous_id: current?.id || null,
          },
          [200, 409],
        ),
      ),
    );
    assert.equal(outcomes.filter((r) => r._status === 200).length, 1);
    const after = await admin.request('/bootstrap');
    assert.equal(after.user.balance, before.user.balance - 10);
    assert.equal(after.wallet.length, before.wallet.length + 1);
    assert.equal(after.banner.anonymous, false);
    assert.equal(after.banner.author, before.user.name);
    assert.equal('author_id' in after.banner, false);
    await admin.request(
      '/banner',
      {
        title: 'Oferta massa baixa',
        body: '',
        color: 'sage',
        amount: 11,
        previous_id: (await admin.request('/bootstrap')).banner.id,
      },
      400,
    );
  });
  await check('Cartell només amb imatge, sense títol, permisos i cobrament únic', async () => {
    const guest = client(fixtureTokens.board);
    const before = await guest.request('/bootstrap');
    const png = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jXioAAAAASUVORK5CYII=',
      'base64',
    );
    const photo = await guest.file(png, 'retall.png');
    const offer = {
      title: '',
      body: 'Una imatge de prova',
      color: 'peach',
      amount: before.minBid,
      previous_id: before.banner.id,
    };
    await guest.request('/banner', offer, 400);
    await b.request('/banner', { ...offer, file_id: photo.id }, 400);
    const outcomes = await Promise.all(
      Array.from({ length: 2 }, () =>
        guest.request('/banner', { ...offer, file_id: photo.id }, [200, 409]),
      ),
    );
    assert.equal(outcomes.filter((r) => r._status === 200).length, 1);
    const after = await guest.request('/bootstrap');
    assert.equal(after.banner.title, '');
    assert.equal(after.banner.file_id, photo.id);
    assert.equal(after.banner.body, offer.body);
    assert.equal(after.user.balance, before.user.balance - offer.amount);
    assert.equal(after.wallet.length, before.wallet.length + 1);
    assert.equal((await b.readFile(photo.id)).headers.get('Content-Type'), 'image/webp');
    await guest.request(
      '/banner',
      { ...offer, title: 'X'.repeat(81), amount: after.minBid, previous_id: after.banner.id },
      400,
    );
  });
  await check(
    'L’opció d’anonimat rebutja valors ambigus sense cobrar ni canviar el cartell',
    async () => {
      const before = await admin.request('/bootstrap');
      for (const anonymous of ['true', 'false', 0, 1, null, {}, []]) {
        resetRequestBudgets();
        await admin.request(
          '/banner',
          {
            title: 'No es publica',
            amount: before.minBid,
            previous_id: before.banner.id,
            anonymous,
          },
          400,
        );
      }
      const after = await admin.request('/bootstrap');
      assert.equal(after.banner.id, before.banner.id);
      assert.equal(after.user.balance, before.user.balance);
      assert.deepEqual(after.wallet, before.wallet);
    },
  );
  await check(
    'Anunci anònim persistent entre comptes, sense identitat i amb cobrament únic',
    async () => {
      const before = await admin.request('/bootstrap');
      const offer = {
        title: 'Un missatge anònim',
        body: '',
        amount: before.minBid,
        previous_id: before.banner.id,
        anonymous: true,
      };
      const outcomes = await Promise.all(
        Array.from({ length: 2 }, () => admin.request('/banner', offer, [200, 409])),
      );
      assert.equal(outcomes.filter((r) => r._status === 200).length, 1);
      const after = await admin.request('/bootstrap');
      assert.equal(after.user.balance, before.user.balance - offer.amount);
      assert.equal(after.wallet.length, before.wallet.length + 1);
      for (const reader of [admin, a, b]) {
        const banner = (await reader.request('/bootstrap')).banner;
        assert.equal(banner.id, after.banner.id);
        assert.equal(banner.anonymous, true);
        assert.equal(banner.author, null);
        assert.equal('author_id' in banner, false);
        assert.equal(JSON.stringify(banner).includes(before.user.name), false);
      }
    },
  );
  await check(
    'Amb nom o anònim en text, imatge i combinació; fitxer anònim amb nom neutre',
    async () => {
      const png = Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jXioAAAAASUVORK5CYII=',
        'base64',
      );
      for (const anonymous of [false, true]) {
        for (const format of ['text', 'image', 'mixed']) {
          const before = await admin.request('/bootstrap');
          const fileId =
            format === 'text' ? null : (await admin.file(png, 'Admin de proves.png')).id;
          await admin.request('/banner', {
            title: format === 'image' ? '' : 'Missatge al centre',
            body: 'Contingut de prova',
            file_id: fileId,
            amount: before.minBid,
            previous_id: before.banner.id,
            anonymous,
          });
          const after = await admin.request('/bootstrap');
          const banner = (await b.request('/bootstrap')).banner;
          assert.equal(banner.anonymous, anonymous);
          assert.equal(banner.author, anonymous ? null : before.user.name);
          assert.equal('author_id' in banner, false);
          assert.equal(banner.id, after.banner.id);
          assert.equal(banner.file_id, fileId);
          assert.equal(after.user.balance, before.user.balance - before.minBid);
          if (fileId) {
            const disposition = (await b.readFile(fileId)).headers.get('Content-Disposition');
            assert.equal(disposition.includes('cartell.webp'), anonymous);
            assert.equal(
              disposition.includes(encodeURIComponent('Admin de proves.webp')),
              !anonymous,
            );
          }
        }
      }
    },
  );
  await check('L’estudiant no pot entrar a administració ni simular un origen aliè', async () => {
    await a.request('/admin', undefined, 403);
    const r = await fetch(base + '/api/bakery/claim', {
      method: 'POST',
      headers: { Origin: 'https://another.example', 'Content-Type': 'application/json' },
      body: '{}',
    });
    assert.equal(r.status, 403);
  });
  await check('Configuració de Pastisdoro persistent', async () => {
    await a.request('/focus/settings', { work: 30, rest: 7, long_rest: 20, rounds: 3 });
    assert.equal((await a.request('/bootstrap')).focus.work, 30);
  });
  await check('Cinc lectures reals i úniques generen un pastís, les recàrregues no', async () => {
    const readers = [];
    for (let i = 0; i < 5; i++) {
      const c = client(fixtureTokens['reader' + i]);
      readers.push(c);
    }
    await Promise.all(readers.map((c) => c.request(`/notes/${free.id}`)));
    await readers[0].request(`/notes/${free.id}/consult`, {}, 400);
    await pause(10600);
    await Promise.all(readers.map((c) => c.request(`/notes/${free.id}/consult`, {})));
    await Promise.all(readers.map((c) => c.request(`/notes/${free.id}/consult`, {})));
    assert.equal((await b.request('/bootstrap')).user.balance, 1);
  });
  await check('Formats executables rebutjats i cap codi de contrasenya disponible', async () => {
    await client(fixtureTokens.formats).file(
      '<svg><script>alert(1)</script></svg>',
      'malicious.svg',
      400,
    );
    await admin.request('/admin/invitations', { label: 'Obsolete', group_id: '2B' }, 403);
    await admin.request('/admin/recovery', { user_id: bUser.id }, 403);
  });
  await check(
    'HTTP manipulat: JavaScript, dobles extensions i PNG amb codi afegit rebutjats',
    async () => {
      const png = Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jXioAAAAASUVORK5CYII=',
        'base64',
      );
      for (const [bytes, name] of [
        [png, 'atac.js'],
        [png, 'atac.js.png'],
        [Buffer.from('globalThis.attack=true'), 'foto.png'],
        [Buffer.concat([png, Buffer.from('<script>alert(1)</script>')]), 'foto.png'],
      ])
        await client(fixtureTokens.formats).file(bytes, name, 400, 'image/png');
    },
  );
  await check(
    'Content-Type fals no altera la imatge reconstruïda ni les capçaleres segures',
    async () => {
      const png = Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jXioAAAAASUVORK5CYII=',
        'base64',
      );
      const f = await a.file(png, 'foto.png', 201, 'application/javascript');
      assert.equal(f.name, 'foto.webp');
      assert.equal(f.image_checked, true);
      const r = await a.readFile(f.id);
      assert.equal(r.headers.get('Content-Type'), 'image/webp');
      assert.equal(r.headers.get('X-Content-Type-Options'), 'nosniff');
      assert.equal(r.headers.get('Cross-Origin-Resource-Policy'), 'same-origin');
      assert.match(r.headers.get('Content-Security-Policy'), /sandbox/);
    },
  );
  await check('Vídeo amb permisos, rangs de reproducció i signatura real del format', async () => {
    const bytes = Buffer.concat([
      Buffer.from([0, 0, 0, 24]),
      Buffer.from('ftypisom'),
      Buffer.alloc(4),
      Buffer.from('isommp42'),
      Buffer.from([0, 0, 0, 8]),
      Buffer.from('moov'),
      Buffer.from([0, 0, 0, 24]),
      Buffer.from('mdat'),
      Buffer.alloc(16),
    ]);
    const video = await a.file(bytes, 'prova.mp4');
    assert.equal(video.mime, 'video/mp4');
    await b.readFile(video.id, 403, 'bytes=0-7');
    const part = await a.readFile(video.id, 206, 'bytes=4-11');
    assert.equal(part.headers.get('Content-Range'), `bytes 4-11/${bytes.length}`);
    assert.equal(part.headers.get('Content-Length'), '8');
    assert.equal(await part.text(), 'ftypisom');
    const suffix = await a.readFile(video.id, 206, 'bytes=-4');
    assert.equal((await suffix.arrayBuffer()).byteLength, 4);
    await a.readFile(video.id, 416, 'bytes=999999-');
    await a.file('<html>not video</html>', 'false.mp4', 400);
    await a.request('/notes', {
      title: 'Vídeo compartit de prova',
      subject_id: 'math',
      body: '',
      files: [video],
      price: 0,
      status: 'published',
    });
    assert.equal(
      (await b.readFile(video.id, 206, 'bytes=0-7')).headers.get('Content-Type'),
      'video/mp4',
    );
  });
  await check(
    'Tres espais independents: ofertes simultànies, mínims, anonimat i aïllament',
    async () => {
      const before = await admin.request('/bootstrap');
      assert.equal(before.bannerSlots.length, 3);
      assert.deepEqual(
        before.bannerSlots.map((s) => s.slot),
        [1, 2, 3],
      );
      for (const s of before.bannerSlots.slice(1)) {
        assert.equal(s.banner, null);
        assert.equal(s.minBid, 1);
      }
      for (const slot of [0, 4, 1.5, '2'])
        await admin.request('/banner', { slot, title: 'Invàlid', amount: 1 }, 400);
      resetRequestBudgets();
      const outcomes = await Promise.all(
        [2, 3].map((slot) =>
          admin.request('/banner', {
            slot,
            title: `Espai ${slot}`,
            amount: 1,
            previous_id: null,
            anonymous: slot === 3,
          }),
        ),
      );
      assert.ok(outcomes.every((o) => o._status === 200));
      const after = await admin.request('/bootstrap');
      assert.equal(after.user.balance, before.user.balance - 2);
      assert.deepEqual(after.banner, before.banner);
      assert.equal(after.minBid, before.minBid);
      for (const s of after.bannerSlots.slice(1)) {
        assert.equal(s.banner.slot, s.slot);
        assert.equal(s.minBid, 2);
      }
      const second = after.bannerSlots[1],
        third = after.bannerSlots[2];
      assert.equal(third.banner.author, null);
      assert.equal('author_id' in third.banner, false);
      const raced = await Promise.all(
        Array.from({ length: 2 }, () =>
          admin.request(
            '/banner',
            { slot: 2, title: 'Substitució', amount: 2, previous_id: second.banner.id },
            [200, 409],
          ),
        ),
      );
      assert.equal(raced.filter((o) => o._status === 200).length, 1);
      await admin.request(
        '/banner',
        { slot: 3, title: 'Referència aliena', amount: 4, previous_id: second.banner.id },
        409,
      );
      const final = await admin.request('/bootstrap');
      assert.equal(final.user.balance, after.user.balance - 2);
      assert.deepEqual(final.bannerSlots[2], third);
      assert.deepEqual(final.banner, before.banner);
      const reader = await b.request('/bootstrap');
      assert.equal(reader.bannerSlots[2].banner.author, null);
    },
  );
  await check(
    'CSRF sense Origin i noms de fitxer malformats rebutjats de manera controlada',
    async () => {
      for (const headers of [
        { 'Sec-Fetch-Site': 'cross-site' },
        { 'Sec-Fetch-Site': 'same-site' },
        { Referer: 'https://foreign.example/' },
      ]) {
        const r = await fetch(base + '/api/preferences', {
          method: 'POST',
          headers: {
            ...headers,
            Cookie: 'lanet_session=' + fixtureTokens.a,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ density: 'comfortable' }),
        });
        assert.equal(r.status, 403);
        assert.equal(r.headers.get('X-Frame-Options'), 'DENY');
      }
      const badName = await fetch(base + '/api/files', {
        method: 'POST',
        headers: {
          Cookie: 'lanet_session=' + fixtureTokens.a,
          Origin: base,
          'X-File-Name': '%E0%A4%A',
          'Content-Type': 'text/plain',
        },
        body: 'fixture',
      });
      assert.equal(badName.status, 400);
    },
  );
  await check('PAU privada: desar i carregar només la simulació pròpia', async () => {
    const initial = await a.request('/pau');
    assert.equal(initial.revision, 0);
    await anon.request('/pau', undefined, 401);
    const value = { ...emptyPau(), average: 8.25, general: 7.5 };
    const saved = await a.request('/pau', { value, revision: 0 }, 200, 'PUT');
    assert.equal(saved.revision, 1);
    assert.equal((await a.request('/bootstrap')).pau.value.average, 8.25);
    assert.equal((await b.request('/pau')).value, null);
    assert.equal((await b.request('/bootstrap')).pau.value, null);
  });
  await check(
    'PAU: revisió concurrent i peticions manipulades no sobreescriuen notes',
    async () => {
      const value = { ...emptyPau(), average: 9, general: 8 };
      await a.request('/pau', { value, revision: 0 }, 409, 'PUT');
      await a.request('/pau', { value: { ...value, owner_id: bUser.id }, revision: 1 }, 400, 'PUT');
      await a.request('/pau', { value: { ...value, average: 20 }, revision: 1 }, 400, 'PUT');
      await a.request(
        '/pau',
        { value: { ...value, subjects: [{ id: 'math', grade: 10, year: 2027 }] }, revision: 1 },
        400,
        'PUT',
      );
      await a.request('/pau', { value, revision: 1 }, 200, 'PUT');
      assert.equal((await a.request('/pau')).revision, 2);
      await a.request('/pau', {}, 405);
    },
  );
  await check(
    'Continguts: esborranys privats, permisos i revisió explícita amb D1 local',
    async () => {
      const value = {
        kind: 'formula',
        title: 'Formulari API local',
        subject_ids: ['math'],
        topic: 'Derivades',
        summary: 'Recurs editorial de prova.',
        source: 'Bibliografia de prova',
        url: 'https://example.edu/math',
        formulas: [
          {
            label: 'Potència',
            expression: '(xⁿ)′ = n·xⁿ⁻¹',
            explanation: 'n enter positiu; derivada respecte de x.',
          },
        ],
      };
      await anon.request('/library', undefined, 401);
      await a.request('/library', { value, action: 'submit' }, 403);
      const created = await admin.request('/library', { value, action: 'submit' });
      assert.ok(!(await a.request('/library')).items.some((r) => r.id === created.id));
      assert.equal((await a.request('/library')).editorial.length, 0);
      await a.request(`/library/${created.id}/review`, { revision: 1, decision: 'approve' }, 403);
      await admin.request(`/library/${created.id}/review`, { revision: 1, decision: 'approve' });
      assert.equal(
        (await b.request('/library')).items.find((r) => r.id === created.id).title,
        value.title,
      );
    },
  );
  await check(
    'Continguts: edició pendent, revisions concurrents i retirada sense perdre historial',
    async () => {
      const list = await admin.request('/library');
      const entry = list.editorial.find((e) => e.value.title === 'Formulari API local');
      const value = { ...entry.value, title: 'Formulari API nou' };
      await admin.request(
        `/library/${entry.id}`,
        { value, action: 'submit', revision: entry.revision },
        200,
        'PUT',
      );
      assert.equal(
        (await a.request('/library')).items.find((r) => r.id === entry.id).title,
        entry.value.title,
      );
      await admin.request(
        `/library/${entry.id}/review`,
        { revision: entry.revision, decision: 'approve' },
        409,
      );
      await admin.request(`/library/${entry.id}/review`, {
        revision: entry.revision + 1,
        decision: 'approve',
      });
      assert.equal(
        (await a.request('/library')).items.find((r) => r.id === entry.id).title,
        value.title,
      );
      await admin.request(`/library/${entry.id}/review`, {
        revision: entry.revision + 2,
        decision: 'withdraw',
      });
      assert.ok(!(await a.request('/library')).items.some((r) => r.id === entry.id));
      assert.equal(
        (await admin.request('/library')).history.filter((h) => h.entry_id === entry.id).length,
        5,
      );
    },
  );
  await check(
    'Ruleta: sessió, validació, resultat de servidor i liquidació idempotent',
    async () => {
      const player = client(fixtureTokens.roulette);
      await anon.request('/roulette', undefined, 401);
      const before = await player.request('/roulette');
      const bet = { request_id: randomUUID(), kind: 'number', number: 0, stake: 1 };
      for (const patch of [
        { stake: '1' },
        { stake: 1.5 },
        { stake: 0 },
        { stake: 1001 },
        { number: 37 },
        { result: 0 },
        { payout: 1000 },
        { user_id: 'a' },
      ])
        await player.request('/roulette', { ...bet, ...patch }, 400);
      const result = await player.request('/roulette', bet);
      assert.equal(result.spin.payout, result.spin.result === 0 ? 36 : 0);
      assert.equal(result.balance, before.balance + result.spin.payout - 1);
      assert.deepEqual((await player.request('/roulette', bet)).spin, result.spin);
      await player.request('/roulette', { ...bet, stake: 2 }, 409);
      assert.equal((await player.request('/roulette')).spins.length, 1);
      assert.equal((await a.request('/roulette')).spins.length, 0);
    },
  );
  await check(
    'Ruleta: còpies simultànies cobren una sola vegada i saldo insuficient es conserva',
    async () => {
      const player = client(fixtureTokens.roulette),
        before = await player.request('/roulette');
      const bet = { request_id: randomUUID(), kind: 'red', number: null, stake: 1 };
      const results = await Promise.all(
        Array.from({ length: 8 }, () => player.request('/roulette', bet)),
      );
      for (const result of results) assert.deepEqual(result.spin, results[0].spin);
      const after = await player.request('/roulette');
      assert.equal(after.spins.length, 2);
      assert.equal(after.balance, before.balance + results[0].spin.payout - 1);
      await player.request('/roulette', { ...bet, request_id: randomUUID(), stake: 1000 }, 409);
      assert.equal((await player.request('/roulette')).balance, after.balance);
    },
  );
  const predictionA = client(fixtureTokens.predictionA),
    predictionB = client(fixtureTokens.predictionB),
    predictionResolver = client(fixtureTokens.predictionResolver);
  let predictionMarket;
  await check('Prediccions: accés autenticat, creació i regles immutables', async () => {
    await anon.request('/predictions', undefined, 401);
    const value = {
      request_id: randomUUID(),
      title: 'Guanyarà A el concurs local?',
      option_a: 'Equip A',
      option_b: 'Equip B',
      rules: 'Segons el marcador oficial. En cas d’empat, retornar el pot.',
      resolver_id: 'predictionResolver',
      closes_at: Math.floor(Date.now() / 1000) + 600,
    };
    const first = await predictionA.request('/predictions', value);
    predictionMarket = first.market;
    assert.equal(predictionMarket.state, 'pending');
    assert.equal((await predictionA.request('/predictions', value)).market.id, predictionMarket.id);
    await predictionA.request(
      '/predictions',
      { ...value, request_id: randomUUID(), creator_id: 'admin' },
      400,
    );
    await predictionA.request(
      '/predictions',
      { ...value, title: 'Una pregunta diferent de l’original' },
      409,
    );
  });
  await check(
    'Prediccions: acceptació del responsable, conflicte d’interès i termini',
    async () => {
      const path = `/predictions/${predictionMarket.id}`;
      await predictionA.request(
        path + '/bets',
        { request_id: randomUUID(), choice: 'A', stake: 1 },
        409,
      );
      await predictionA.request(
        path + '/actions',
        { request_id: randomUUID(), kind: 'accept' },
        409,
      );
      await predictionResolver.request(path + '/actions', {
        request_id: randomUUID(),
        kind: 'accept',
      });
      await predictionResolver.request(
        path + '/bets',
        { request_id: randomUUID(), choice: 'A', stake: 1 },
        409,
      );
      await predictionResolver.request(
        path + '/actions',
        {
          request_id: randomUUID(),
          kind: 'resolve',
          choice: 'A',
          reason: 'Resultat verificat al marcador oficial.',
        },
        409,
      );
    },
  );
  await check('Prediccions: apostes concurrents idempotents, saldo i costat únic', async () => {
    const path = `/predictions/${predictionMarket.id}/bets`,
      value = { request_id: randomUUID(), choice: 'A', stake: 1 };
    const replies = await Promise.all(
      Array.from({ length: 8 }, () => predictionA.request(path, value)),
    );
    assert.ok(replies.every((r) => r.market.own_stake === 1));
    await predictionA.request(path, { ...value, stake: 2 }, 409);
    await predictionA.request(path, { request_id: randomUUID(), choice: 'B', stake: 1 }, 409);
    await predictionA.request(path, { request_id: randomUUID(), choice: 'A', stake: 1000 }, 409);
    await predictionB.request(path, { request_id: randomUUID(), choice: 'B', stake: 1 });
    assert.equal(
      (await predictionA.request('/predictions/' + predictionMarket.id)).market.total_a,
      1,
    );
  });
  await check('Prediccions: anul·lació atòmica retorna tot i no permet nous càrrecs', async () => {
    const path = '/predictions/' + predictionMarket.id;
    const action = {
      request_id: randomUUID(),
      kind: 'cancel',
      reason: 'Concurs anul·lat segons la font oficial.',
    };
    await predictionA.request(path + '/actions', action, 409);
    const result = await predictionResolver.request(path + '/actions', action);
    assert.equal(result.market.state, 'cancelled');
    await predictionResolver.request(path + '/actions', action);
    assert.equal((await predictionA.request(path)).market.own_payout, 1);
    assert.equal((await predictionA.request('/bootstrap')).user.balance, 3);
    assert.equal((await predictionB.request('/bootstrap')).user.balance, 2);
    await predictionB.request(
      path + '/bets',
      { request_id: randomUUID(), choice: 'B', stake: 1 },
      409,
    );
  });
  await check(
    'Prediccions: liquidació D1 real amb funcions de finestra i reintent únic',
    async () => {
      const path = '/predictions/' + closedPrediction,
        action = {
          request_id: randomUUID(),
          kind: 'resolve',
          choice: 'A',
          reason: 'L’equip A ha guanyat segons el marcador oficial.',
        };
      await predictionA.request(path + '/actions', action, 409);
      await predictionResolver.request(path + '/actions', action);
      await predictionResolver.request(path + '/actions', action);
      const winner = await predictionA.request(path),
        loser = await predictionB.request(path);
      assert.equal(winner.market.own_payout, 5);
      assert.equal(loser.market.own_payout, 0);
      assert.equal(winner.balance, 8);
      assert.equal(loser.balance, 2);
      await predictionResolver.request(path + '/actions', { ...action, choice: 'B' }, 409);
    },
  );
  await check('Prediccions: directori segur, filtres personals i dades privades', async () => {
    const list = await predictionResolver.request('/predictions?filter=mine');
    assert.ok(list.markets.some((m) => m.id === closedPrediction));
    const people = (await predictionA.request('/predictions/people?q=prediction')).people;
    assert.ok(people.every((p) => Object.keys(p).sort().join(',') === 'id,name'));
    const detail = JSON.stringify(await predictionB.request('/predictions/' + closedPrediction));
    assert.ok(!detail.includes('request_id'));
    assert.ok(!detail.includes('@fje.edu'));
    assert.ok(!detail.includes('password_hash'));
  });
  await check('Desactivar un compte Google revoca sessions i sortir es idempotent', async () => {
    await admin.request('/admin/users', { user_id: bUser.id, role: 'student', disabled: true });
    await b.request('/bootstrap', undefined, 401);
    await b.request('/auth/logout', {});
    await b.request('/auth/logout', {});
    await anon.request('/auth/logout', {});
  });
  const retention = client(fixtureTokens.retention),
    formats = client(fixtureTokens.formats);
  const adPng = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jXioAAAAASUVORK5CYII=',
    'base64',
  );
  async function ad(slot, file_id) {
    const space = (await retention.request('/bootstrap')).bannerSlots.find((s) => s.slot === slot);
    return retention.request('/banner', {
      slot,
      file_id,
      title: file_id ? '' : 'Anunci de substitució',
      amount: space.minBid,
      previous_id: space.banner?.id || null,
    });
  }
  await check(
    'Retenció: la mateixa imatge als dos espais es conserva fins a l’última substitució',
    async () => {
      const photo = await retention.file(adPng, 'cartell.png');
      await ad(2, photo.id);
      await ad(3, photo.id);
      await ad(2, null);
      await retention.readFile(photo.id);
      await ad(3, null);
      await retention.readFile(photo.id, 404);
      const before = (await retention.request('/bootstrap')).user.balance;
      const space = (await retention.request('/bootstrap')).bannerSlots[2];
      await retention.request(
        '/banner',
        {
          slot: 3,
          file_id: photo.id,
          title: '',
          amount: space.minBid,
          previous_id: space.banner.id,
        },
        400,
      );
      assert.equal((await retention.request('/bootstrap')).user.balance, before);
    },
  );
  await check(
    'Retenció: ofertes concurrents eliminen l’anterior sense duplicar càrrecs',
    async () => {
      const photo = await retention.file(adPng, 'cartell.png');
      await ad(2, photo.id);
      const before = await retention.request('/bootstrap'),
        space = before.bannerSlots[1];
      const outcomes = await Promise.all(
        [1, 2].map(() =>
          retention.request(
            '/banner',
            { slot: 2, title: 'Nou cartell', amount: space.minBid, previous_id: space.banner.id },
            [200, 409],
          ),
        ),
      );
      assert.equal(outcomes.filter((o) => o._status === 200).length, 1);
      await retention.readFile(photo.id, 404);
      assert.equal(
        (await retention.request('/bootstrap')).user.balance,
        before.user.balance - space.minBid,
      );
    },
  );
  await check(
    'Retenció: cancel·lar esborrany elimina el fitxer propi i protegeix els publicats',
    async () => {
      const photo = await retention.file(adPng, 'esborrany.png');
      await a.request('/files/' + photo.id, {}, 200, 'DELETE');
      await retention.readFile(photo.id);
      await retention.request('/files/' + photo.id, {}, 200, 'DELETE');
      await retention.readFile(photo.id, 404);
      const live = await retention.file(adPng, 'vigent.png');
      await ad(3, live.id);
      await retention.request('/files/' + live.id, {}, 409, 'DELETE');
      await retention.readFile(live.id);
    },
  );
  await check(
    'Abús: cinc fitxers invàlids bloquegen pujades amb Retry-After, mantenint l’accés a La Net',
    async () => {
      const response = await fetch(base + '/api/files', {
        method: 'POST',
        headers: {
          Cookie: 'lanet_session=' + fixtureTokens.formats,
          Origin: base,
          'X-File-Name': 'nova.png',
          'CF-Connecting-IP': 'different-ip',
        },
        body: adPng,
      });
      assert.equal(response.status, 429);
      assert.ok(Number(response.headers.get('Retry-After')) > 0);
      const result = await response.json();
      assert.equal(result.code, 'upload_blocked');
      assert.ok(result.retry_after > 0);
      await formats.request('/bootstrap');
      await formats.request('/profile', { preferences: { density: 'comfortable' } });
    },
  );
  writeFileSync(
    state + '/result.json',
    JSON.stringify(
      { passed, date: new Date().toISOString(), isolatedState: state, target: base },
      null,
      2,
    ),
  );
  console.log(`\n${passed} fluxos d’API verificats amb D1 i R2 locals reals.`);
} catch (error) {
  console.error(error.stack);
  writeFileSync(state + '/server.log', logs);
  process.exitCode = 1;
} finally {
  fixtureDatabase.close();
  if (process.platform === 'win32' && server.pid) {
    spawnSync('taskkill', ['/PID', String(server.pid), '/T', '/F'], {
      windowsHide: true,
      stdio: 'ignore',
    });
  } else server.kill();
}
