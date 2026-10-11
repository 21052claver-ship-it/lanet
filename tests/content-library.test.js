import test from 'node:test';
import assert from 'node:assert/strict';
import { testEnvironment } from './helpers/d1.js';
import { emptyLibrary, validateLibrary, libraryUrl } from '../shared/content-library.js';
import { CONTENT_REFERENCES } from '../shared/content-catalogue.js';
import { libraryRoute } from '../worker/library.js';
import app from '../worker/index.js';

const sample = (patch = {}) => ({
  ...emptyLibrary('formula', 'phy'),
  title: 'Moviment rectilini',
  topic: 'Cinemàtica',
  summary: 'Velocitat i acceleració constants.',
  source: 'Bibliografia de física del centre',
  url: 'https://example.edu/physics',
  formulas: [
    {
      label: 'Velocitat',
      expression: 'v = v₀ + a·t',
      explanation: 'Acceleració constant; t en segons, v en m/s i a en m/s².',
    },
  ],
  ...patch,
});
function fixture() {
  const { db, env } = testEnvironment();
  db.exec(
    "INSERT INTO groups(id,name) VALUES('library-other','Altre grup'); INSERT INTO users(id,email,name,password_hash,salt,google_sub,role,group_id) VALUES('lib-student','lib-student@fje.edu','Estudiant','x','x','lib-student','student','2B'),('lib-delegate','lib-delegate@fje.edu','Delegada','x','x','lib-delegate','delegate','2B'),('lib-admin','lib-admin@fje.edu','Administrador','x','x','lib-admin','admin','2B'),('lib-other','lib-other@fje.edu','Altre delegat','x','x','lib-other','delegate','library-other');",
  );
  const users = Object.fromEntries(
    ['student', 'delegate', 'admin', 'other'].map((r) => [
      r,
      db.prepare('SELECT * FROM users WHERE id=?').get('lib-' + r),
    ]),
  );
  const request = async (role, path = '', value, method = value === undefined ? 'GET' : 'POST') => {
    const route = '/api/library' + path;
    return (
      await libraryRoute(
        new Request('https://lanet.example' + route, {
          method,
          ...(value !== undefined
            ? { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(value) }
            : {}),
        }),
        env,
        users[role],
        route,
      )
    ).json();
  };
  return { db, env, users, request };
}
const status = (expected) => (e) => e.status === expected;

test('Content library validates formulas, source, subject, kind and bounded structured text', () => {
  assert.deepEqual(validateLibrary(sample(), ['phy']), sample());
  for (const patch of [
    { subject_ids: [] },
    { subject_ids: ['fake'] },
    { subject_ids: ['phy', 'phy'] },
    { source: '' },
    { topic: '' },
    { title: 'a'.repeat(101) },
    { reviewed_by: 'fake' },
    { formulas: [{ label: 'A', expression: 'v=t', explanation: '' }] },
    { formulas: Array(25).fill(sample().formulas[0]) },
    { formulas: [{ ...sample().formulas[0], html: '<b>x</b>' }] },
    { summary: 'a\u0000b' },
  ])
    assert.throws(() => validateLibrary(sample(patch), ['phy']));
  assert.throws(() => validateLibrary(sample({ kind: 'tool' }), ['phy']));
  assert.throws(() => validateLibrary(sample({ url: '', formulas: [] }), ['phy']));
  assert.equal(validateLibrary(sample({ url: '' }), ['phy']).url, '');
  assert.equal(
    validateLibrary(
      {
        ...emptyLibrary('tool'),
        title: 'Eina',
        topic: 'General',
        summary: 'Ajuda',
        source: 'Editor',
        url: 'https://example.edu/tool',
      },
      ['phy'],
    ).subject_ids.length,
    0,
  );
});
test('Content library allows only public HTTPS links without credentials, ports or local IPs', () => {
  for (const url of [
    'javascript:alert(1)',
    'data:text/html,x',
    'http://example.edu',
    'https://a:b@example.edu',
    'https://example.edu:8443',
    'https://localhost',
    'https://127.0.0.1',
    'https://2130706433',
    'https://0x7f000001',
    'https://[::1]/',
    'https://test.local',
    'https://test.internal',
    '/relative',
    'https://example.edu\u0000',
  ])
    assert.throws(() => libraryUrl(url));
  assert.equal(libraryUrl('https://example.edu/a?q=1#part'), 'https://example.edu/a?q=1#part');
});
test('Content catalogue contains identifiable primary sources without fictional delegate approvals', () => {
  assert.equal(new Set(CONTENT_REFERENCES.map((r) => r.id)).size, CONTENT_REFERENCES.length);
  assert.equal(CONTENT_REFERENCES.filter((r) => r.kind === 'formula').length, 5);
  assert.equal(CONTENT_REFERENCES.filter((r) => r.kind === 'tool').length, 7);
  for (const ref of CONTENT_REFERENCES) {
    const { kind, title, subject_ids, topic, summary, url, source, formulas } = ref;
    validateLibrary({ kind, title, subject_ids, topic, summary, url, source, formulas }, [
      'math',
      'smath',
      'phy',
      'chem',
      'bio',
      'cat',
      'cast',
      'eng',
    ]);
    assert.equal(ref.origin, 'reference');
    assert.equal(ref.reviewer, undefined);
    assert.equal(ref.checked_on, '2026-10-11');
  }
});
test('Content library: students cannot write or review; other groups cannot access drafts', async () => {
  const f = fixture();
  try {
    const created = await f.request('delegate', '', { value: sample(), action: 'draft' });
    const own = await f.request('delegate');
    assert.equal(own.editorial.length, 1);
    for (const role of ['student', 'other']) {
      const response = await f.request(role);
      assert.equal(response.editorial.length, 0);
      assert.equal(response.history.length, 0);
      assert.ok(!JSON.stringify(response).includes(created.id));
    }
    await assert.rejects(
      () => f.request('student', '', { value: sample(), action: 'submit' }),
      status(403),
    );
    await assert.rejects(
      () => f.request('student', `/${created.id}/review`, { revision: 1, decision: 'approve' }),
      status(403),
    );
    await assert.rejects(
      () =>
        f.request(
          'other',
          `/${created.id}`,
          { revision: 1, value: sample(), action: 'draft' },
          'PUT',
        ),
      status(404),
    );
    await assert.rejects(
      () => f.request('other', `/${created.id}/review`, { revision: 1, decision: 'approve' }),
      status(404),
    );
  } finally {
    f.db.close();
  }
});
test('Content library: explicit review publishes a snapshot, identifies reviewer and records actions', async () => {
  const f = fixture();
  try {
    const { id } = await f.request('delegate', '', { value: sample(), action: 'draft' });
    await assert.rejects(
      () => f.request('admin', `/${id}/review`, { revision: 1, decision: 'approve' }),
      status(409),
    );
    await f.request(
      'delegate',
      `/${id}`,
      { revision: 1, value: sample(), action: 'submit' },
      'PUT',
    );
    assert.ok(!(await f.request('student')).items.some((r) => r.id === id));
    await f.request('admin', `/${id}/review`, { revision: 2, decision: 'approve' });
    const published = (await f.request('student')).items.find((r) => r.id === id);
    assert.equal(published.origin, 'reviewed');
    assert.equal(published.reviewer, 'Administrador');
    assert.ok(published.reviewed_at);
    assert.equal(published.formulas[0].expression, 'v = v₀ + a·t');
    assert.deepEqual(
      (await f.request('delegate')).history.filter((h) => h.entry_id === id).map((h) => h.action),
      ['approve', 'submit', 'create'],
    );
    assert.ok(!(await f.request('other')).items.some((r) => r.id === id));
  } finally {
    f.db.close();
  }
});
test('Content library: pending edits do not overwrite publication, returned drafts and withdrawal preserve history', async () => {
  const f = fixture();
  try {
    const { id } = await f.request('delegate', '', { value: sample(), action: 'submit' });
    await f.request('delegate', `/${id}/review`, { revision: 1, decision: 'approve' });
    await f.request(
      'delegate',
      `/${id}`,
      { revision: 2, value: sample({ title: 'Nova edició' }), action: 'submit' },
      'PUT',
    );
    assert.equal((await f.request('student')).items.find((r) => r.id === id).title, sample().title);
    await f.request('admin', `/${id}/review`, { revision: 3, decision: 'return' });
    assert.equal((await f.request('student')).items.find((r) => r.id === id).title, sample().title);
    await f.request(
      'delegate',
      `/${id}`,
      { revision: 4, value: sample({ title: 'Nova edició corregida' }), action: 'submit' },
      'PUT',
    );
    await f.request('admin', `/${id}/review`, { revision: 5, decision: 'approve' });
    assert.equal(
      (await f.request('student')).items.find((r) => r.id === id).title,
      'Nova edició corregida',
    );
    await f.request('admin', `/${id}/review`, { revision: 6, decision: 'withdraw' });
    assert.ok(!(await f.request('student')).items.some((r) => r.id === id));
    const row = (await f.request('delegate')).editorial.find((r) => r.id === id);
    assert.equal(row.state, 'draft');
    assert.equal(row.value.title, 'Nova edició corregida');
    assert.equal(row.published, null);
    assert.equal((await f.request('delegate')).history.length, 7);
  } finally {
    f.db.close();
  }
});
test('Content library: stale writes, forged metadata, kind switches and invalid transitions are rejected', async () => {
  const f = fixture();
  try {
    const { id } = await f.request('delegate', '', { value: sample(), action: 'submit' });
    await assert.rejects(
      () => f.request('delegate', `/${id}/review`, { revision: 0, decision: 'approve' }),
      status(400),
    );
    await assert.rejects(
      () =>
        f.request(
          'delegate',
          `/${id}`,
          { revision: 1, value: sample(), action: 'published' },
          'PUT',
        ),
      status(400),
    );
    await assert.rejects(
      () =>
        f.request(
          'delegate',
          `/${id}`,
          { revision: 1, value: sample({ kind: 'tool', formulas: [] }), action: 'draft' },
          'PUT',
        ),
      status(400),
    );
    await assert.rejects(
      () =>
        f.request('delegate', `/${id}/review`, {
          revision: 1,
          decision: 'approve',
          reviewed_by: 'other',
        }),
      status(400),
    );
    await f.request('admin', `/${id}/review`, { revision: 1, decision: 'approve' });
    await assert.rejects(
      () =>
        f.request(
          'delegate',
          `/${id}`,
          { revision: 1, value: sample({ title: 'Stale' }), action: 'draft' },
          'PUT',
        ),
      status(409),
    );
    assert.equal((await f.request('student')).items.find((r) => r.id === id).title, sample().title);
    assert.equal((await f.request('delegate')).history.length, 2);
    await assert.rejects(() => f.request('delegate', `/${id}`, {}), status(405));
    await assert.rejects(() => f.request('delegate', '', {}, 'DELETE'), status(405));
  } finally {
    f.db.close();
  }
});
test('Content library: compare-and-swap also rejects a write that becomes stale after the initial read', async () => {
  const f = fixture();
  try {
    const { id } = await f.request('delegate', '', { value: sample(), action: 'draft' });
    const batch = f.env.DB.batch.bind(f.env.DB);
    f.env.DB.batch = async (statements) => {
      f.db.prepare('UPDATE content_library SET revision=revision+1 WHERE id=?').run(id);
      return batch(statements);
    };
    await assert.rejects(
      () =>
        f.request(
          'delegate',
          `/${id}`,
          { revision: 1, value: sample({ title: 'Lost write' }), action: 'draft' },
          'PUT',
        ),
      status(409),
    );
    assert.equal(
      f.db.prepare('SELECT draft FROM content_library WHERE id=?').get(id).draft,
      JSON.stringify(sample()),
    );
    assert.equal((await f.request('delegate')).history.length, 1);
  } finally {
    f.db.close();
  }
});
test('Content library: outer API requires authentication and checks origin before mutation', async () => {
  const { db, env } = testEnvironment();
  try {
    assert.equal(
      (await app.fetch(new Request('https://lanet.example/api/library'), env)).status,
      401,
    );
    assert.equal(
      (
        await app.fetch(
          new Request('https://lanet.example/api/library', {
            method: 'POST',
            headers: { Origin: 'https://evil.example', 'Content-Type': 'application/json' },
            body: '{}',
          }),
          env,
        )
      ).status,
      403,
    );
  } finally {
    db.close();
  }
});
