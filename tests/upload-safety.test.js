import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { testEnvironment } from './helpers/d1.js';
import { pngFixture, webpFixture } from './helpers/media-fixtures.js';
import { validateFile, safeFileName, readLimited } from '../worker/file-validation.js';
import { upload, fileResponse, fileStatements, ensureFileSafety } from '../worker/files.js';
import media, {
  inspectImage,
  moderationVerdict,
  stripWebpMetadata,
  deadline,
} from '../worker/media-safety.js';
import { safeImage } from '../worker/image-safety.js';

const user = { id: 'u', role: 'student' };
function pdfFixture() {
  let text = '%PDF-1.4\n';
  const offsets = [0];
  for (const [i, object] of [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] >>',
  ].entries()) {
    offsets.push(Buffer.byteLength(text));
    text += `${i + 1} 0 obj\n${object}\nendobj\n`;
  }
  const start = Buffer.byteLength(text);
  text += 'xref\n0 4\n0000000000 65535 f \n';
  text += offsets
    .slice(1)
    .map((n) => String(n).padStart(10, '0') + ' 00000 n \n')
    .join('');
  return Buffer.from(text + `trailer\n<< /Size 4 /Root 1 0 R >>\nstartxref\n${start}\n%%EOF\n`);
}
const safe = { sexual_content: false, nudity: false, graphic_violence: false, uncertain: false };
const request = (bytes, name = 'imatge.png', type = 'image/png') =>
  new Request('https://lanet.test/api/files', {
    method: 'POST',
    headers: { 'X-File-Name': encodeURIComponent(name), 'Content-Type': type },
    body: bytes,
  });
function setup(t, verdict = safe) {
  const { db, env } = testEnvironment();
  t.after(() => db.close());
  db.exec(
    "INSERT INTO users(id,email,name,password_hash,salt) VALUES('u','u@fje.edu','Usuari','x','x'),('other','other@fje.edu','Altre','x','x')",
  );
  const objects = new Map();
  let calls = 0;
  env.FILES = {
    async put(k, b) {
      objects.set(k, Uint8Array.from(b));
    },
    async delete(k) {
      objects.delete(k);
    },
    async get(k, options) {
      const b = objects.get(k);
      return b
        ? {
            body: new Blob([
              options?.range
                ? b.slice(options.range.offset, options.range.offset + options.range.length)
                : b,
            ]).stream(),
          }
        : null;
    },
  };
  env.MEDIA_SAFETY = {
    async fetch() {
      calls++;
      if (verdict === 'offline') throw new Error('provider secret must not leak');
      if (verdict === 'blocked')
        return Response.json(
          { error: 'Imatge rebutjada.', code: 'image_blocked' },
          { status: 422 },
        );
      if (verdict === 'uncertain')
        return Response.json({ error: 'Imatge incerta.' }, { status: 422 });
      return new Response(webpFixture, {
        headers: { 'Content-Type': 'image/webp', 'X-LaNet-Safety': 'lanet-image-v1' },
      });
    },
  };
  return { db, env, objects, calls: () => calls };
}
function legacy(
  ctx,
  { name = 'antiga.png', mime = 'image/png', bytes = pngFixture(), note = null } = {},
) {
  ctx.objects.set('legacy/original', bytes);
  ctx.db
    .prepare(
      'INSERT INTO files(id,owner_id,name,mime,size,object_key,note_id) VALUES(?,?,?,?,?,?,?)',
    )
    .run('old', 'u', name, mime, bytes.length, 'legacy/original', note);
  return ctx.db.prepare("SELECT * FROM files WHERE id='old'").get();
}
function imageBindings(result = safe) {
  let calls = 0,
    options;
  return {
    calls: () => calls,
    options: () => options,
    IMAGES: {
      async info() {
        return { format: 'image/png', width: 256, height: 256 };
      },
      input() {
        return {
          transform() {
            return this;
          },
          async output(o) {
            options = o;
            return { response: () => new Response(webpFixture) };
          },
        };
      },
    },
    AI: {
      async run() {
        calls++;
        return { response: result };
      },
    },
  };
}

test('Uploads: extension and full container reject scripts, SVG, forged headers and trailing payloads', async (t) => {
  const c = setup(t);
  for (const [bytes, name] of [
    [pngFixture(), 'attack.js'],
    [pngFixture(), 'attack.js.png'],
    [pngFixture(), 'attack.svg'],
    [Buffer.from('alert(1)'), 'photo.png'],
    [Buffer.from([137, 80, 78, 71, 10, 60, 115, 99, 114, 105, 112, 116]), 'photo.png'],
    [Buffer.concat([pngFixture(), Buffer.from('<script>alert(1)</script>')]), 'photo.png'],
    [pngFixture(), 'photo.jpg'],
    [Buffer.from('GIF89aalert(1)'), 'photo.gif'],
    [Buffer.from('PKscript'), 'file.docx'],
  ]) {
    await assert.rejects(
      upload(request(bytes, name, 'image/png'), c.env, user),
      (e) => e.status === 400,
      name,
    );
    // Each vector tests format validation independently. Repeated abuse and
    // its account-wide block have dedicated retention/guard tests.
    c.db.prepare("DELETE FROM upload_guards WHERE user_id='u'").run();
  }
  assert.equal(c.calls(), 0);
  assert.equal(c.objects.size, 0);
  assert.equal(c.db.prepare('SELECT count(*) n FROM files').get().n, 0);
});

test('Uploads: client MIME and moderation flags cannot change the validated, rebuilt result', async (t) => {
  const c = setup(t);
  const r = request(pngFixture(), 'foto.PNG', 'application/javascript');
  r.headers.set('X-Moderation-Approved', 'true');
  const file = await upload(r, c.env, user);
  assert.equal(file.mime, 'image/webp');
  assert.equal(file.name, 'foto.webp');
  assert.equal(file.image_checked, true);
  assert.equal(c.calls(), 1);
  const row = c.db.prepare('SELECT * FROM files').get();
  assert.equal(row.safety_state, 'approved');
  assert.equal(row.safety_policy, 'lanet-image-v1');
  assert.deepEqual(c.objects.get(row.object_key), Uint8Array.from(webpFixture));
});

test('Uploads: filename controls, invalid encoding and executable double extensions cannot evade validation', () => {
  for (const n of ['bad%xy', 'evil.php.png', 'file.mjs', 'photo.png.', '<script>.HTML', ''])
    assert.throws(() => safeFileName(n));
  assert.equal(safeFileName(encodeURIComponent('../Foto\u202e.png')), '.._Foto_.png');
  for (const ext of ['constructor', '__proto__', 'toString'])
    assert.throws(
      () => validateFile(pngFixture(), `imatge.${ext}`),
      (e) => e.status === 400,
    );
  const large = pngFixture();
  large.writeUInt32BE(10001, 16);
  assert.throws(
    () => validateFile(large, 'photo.png'),
    (e) => e.status === 413,
  );
  for (const bytes of [Buffer.from([0xff, 0xfe]), Buffer.from([65, 0, 66])])
    assert.throws(() => validateFile(bytes, 'text.txt'));
  assert.throws(() => validateFile(Buffer.from('%PDF-1.4\nalert(1)'), 'document.pdf'));
  const bad = Buffer.from(webpFixture);
  bad[4] = 1;
  assert.throws(() => validateFile(bad, 'photo.webp'));
});

test('Uploads: missing Content-Length cannot bypass streaming limits', async () => {
  let cancelled = false;
  const stream = new ReadableStream({
    start(c) {
      c.enqueue(new Uint8Array(4));
      c.enqueue(new Uint8Array(5));
    },
    cancel() {
      cancelled = true;
    },
  });
  await assert.rejects(readLimited(stream, 8), (e) => e.status === 413);
  assert.equal(cancelled, true);
  await assert.rejects(readLimited(new Blob([]).stream()), (e) => e.status === 400);
});

test('Moderation: flags, uncertainty, refusals and malformed outputs always fail closed', () => {
  assert.equal(moderationVerdict({ response: safe }), 'approved');
  assert.equal(moderationVerdict({ response: JSON.stringify(safe) }), 'approved');
  for (const category of ['sexual_content', 'nudity', 'graphic_violence'])
    assert.equal(moderationVerdict({ response: { ...safe, [category]: true } }), 'blocked');
  assert.equal(moderationVerdict({ response: { ...safe, uncertain: true } }), 'uncertain');
  for (const response of [
    'safe',
    '```json\n{}\n```',
    null,
    [],
    { ...safe, nudity: 'false' },
    { ...safe, extra: false },
    { sexual_content: false },
  ])
    assert.equal(moderationVerdict({ response }), 'unavailable');
});

test('Moderation: only rebuilt static image pixels reach AI and storage', async () => {
  const e = imageBindings();
  const out = await inspectImage(pngFixture(), 'image/png', e);
  assert.deepEqual(out, Uint8Array.from(webpFixture));
  assert.equal(e.calls(), 1);
  assert.deepEqual(e.options(), { format: 'image/webp', quality: 90, anim: false });
  const injected = Buffer.from(webpFixture);
  const payload = Buffer.from('<script>alert(1)</script>');
  const exif = Buffer.alloc(8 + payload.length + (payload.length % 2));
  exif.write('EXIF');
  exif.writeUInt32LE(payload.length, 4);
  payload.copy(exif, 8);
  const poly = Buffer.concat([injected, exif]);
  poly.writeUInt32LE(poly.length - 8, 4);
  assert.deepEqual(stripWebpMetadata(poly), Uint8Array.from(webpFixture));
});

test('Moderation: decoder failures, oversized decoded dimensions and absent services prevent AI approval', async () => {
  const e = imageBindings();
  e.IMAGES.info = async () => ({ format: 'image/png', width: 10000, height: 10000 });
  await assert.rejects(inspectImage(pngFixture(), 'image/png', e), (x) => x.status === 413);
  assert.equal(e.calls(), 0);
  e.IMAGES.info = async () => {
    throw new Error('decoder failed');
  };
  await assert.rejects(inspectImage(pngFixture(), 'image/png', e), (x) => x.status === 422);
  assert.equal(e.calls(), 0);
  await assert.rejects(inspectImage(pngFixture(), 'image/png', {}), (x) => x.status === 503);
  await assert.rejects(safeImage({}, pngFixture(), 'image/png'), (x) => x.status === 503);
  await assert.rejects(deadline(new Promise(() => {}), 2), /timeout/);
});

test('Moderation: real handler contract distinguishes blocked, uncertain, unavailable and approved', async () => {
  for (const [result, status] of [
    [safe, 200],
    [{ ...safe, nudity: true }, 422],
    [{ ...safe, uncertain: true }, 422],
    ['not JSON', 503],
  ]) {
    const e = imageBindings(result);
    const response = await media.fetch(
      new Request('https://internal/inspect', {
        method: 'POST',
        headers: { 'Content-Type': 'image/png' },
        body: pngFixture(),
      }),
      e,
    );
    assert.equal(response.status, status);
    if (status === 200) assert.equal(response.headers.get('X-LaNet-Safety'), 'lanet-image-v1');
    else if (result.nudity) assert.equal((await response.json()).code, 'image_blocked');
  }
});

for (const verdict of ['blocked', 'uncertain', 'offline'])
  test(`Uploads: ${verdict} moderation leaves neither published rows nor R2 files`, async (t) => {
    const c = setup(t, verdict);
    await assert.rejects(
      upload(request(pngFixture()), c.env, user),
      (e) => e.status === (verdict === 'offline' ? 503 : 422),
    );
    assert.equal(c.db.prepare('SELECT count(*) n FROM files').get().n, 0);
    assert.equal(c.objects.size, 0);
  });

test('Uploads: an invalid service response or forged approval header cannot release a file', async (t) => {
  const c = setup(t);
  for (const response of [
    () => new Response(webpFixture, { headers: { 'Content-Type': 'image/webp' } }),
    () =>
      new Response('<script>alert(1)</script>', {
        headers: { 'Content-Type': 'image/webp', 'X-LaNet-Safety': 'lanet-image-v1' },
      }),
  ]) {
    c.env.MEDIA_SAFETY.fetch = async () => response();
    await assert.rejects(upload(request(pngFixture()), c.env, user));
    assert.equal(c.objects.size, 0);
  }
});

test('Legacy: authorize first, rebuild once, preserve original and serve safe bytes for direct/range/download access', async (t) => {
  const c = setup(t);
  legacy(c);
  await assert.rejects(
    fileResponse(
      new Request('https://lanet.test/api/files/old'),
      c.env,
      { id: 'other', role: 'student' },
      'old',
    ),
    (e) => e.status === 403,
  );
  assert.equal(c.calls(), 0);
  const r = await fileResponse(new Request('https://lanet.test/api/files/old'), c.env, user, 'old');
  assert.equal(r.headers.get('Content-Type'), 'image/webp');
  assert.equal(r.headers.get('X-Content-Type-Options'), 'nosniff');
  assert.equal(r.headers.get('Cross-Origin-Resource-Policy'), 'same-origin');
  assert.match(r.headers.get('Content-Security-Policy'), /sandbox/);
  assert.deepEqual(new Uint8Array(await r.arrayBuffer()), Uint8Array.from(webpFixture));
  assert.ok(c.objects.has('legacy/original'));
  const fresh = c.db.prepare("SELECT * FROM files WHERE id='old'").get();
  assert.equal(fresh.original_object_key, 'legacy/original');
  assert.notEqual(fresh.object_key, 'legacy/original');
  const part = await fileResponse(
    new Request('https://lanet.test/api/files/old?download', { headers: { Range: 'bytes=0-3' } }),
    c.env,
    user,
    'old',
  );
  assert.equal(part.status, 206);
  assert.match(part.headers.get('Content-Disposition'), /^attachment/);
  assert.equal(await part.text(), 'RIFF');
  assert.equal(c.calls(), 1);
});

test('Legacy: blocked images cannot be read or attached, including owner/admin and downloads', async (t) => {
  const c = setup(t, 'blocked');
  legacy(c);
  await assert.rejects(
    fileResponse(new Request('https://lanet.test/api/files/old'), c.env, user, 'old'),
    (e) => e.status === 422,
  );
  assert.equal(
    c.db.prepare("SELECT safety_state FROM files WHERE id='old'").get().safety_state,
    'blocked',
  );
  for (const u of [user, { id: 'other', role: 'admin' }])
    await assert.rejects(
      fileResponse(new Request('https://lanet.test/api/files/old?download'), c.env, u, 'old'),
      (e) => e.status === 422,
    );
  await assert.rejects(
    fileStatements(c.env, user, ['old'], 'note_id', 'note'),
    (e) => e.status === 422,
  );
  assert.equal(c.calls(), 1);
  assert.ok(c.objects.has('legacy/original'));
});

test('Legacy: temporary moderation outage is retryable and cannot mark an image approved', async (t) => {
  const c = setup(t, 'offline');
  const f = legacy(c);
  await assert.rejects(ensureFileSafety(c.env, f), (e) => e.status === 503);
  assert.equal(
    c.db.prepare("SELECT safety_state FROM files WHERE id='old'").get().safety_state,
    'legacy',
  );
  assert.equal(c.objects.size, 1);
});

test('Legacy: concurrent checks keep one normalized file and never delete the original', async (t) => {
  const c = setup(t);
  const f = legacy(c);
  await Promise.all([ensureFileSafety(c.env, f), ensureFileSafety(c.env, f)]);
  assert.equal(c.objects.size, 2);
  assert.ok(c.objects.has('legacy/original'));
});

test('Database: attachment and banner guards reject unmoderated images before charging', async (t) => {
  const c = setup(t);
  legacy(c);
  c.db.exec(
    "INSERT INTO notes(id,author_id,subject_id,title,body) VALUES('n','u','math','Apunt','Text')",
  );
  assert.throws(() => c.db.exec("UPDATE files SET note_id='n' WHERE id='old'"), /verificada/);
  const balance = c.db.prepare("SELECT balance FROM users WHERE id='u'").get().balance;
  assert.throws(
    () =>
      c.db.exec(
        "INSERT INTO banners(id,author_id,title,body,color,amount,file_id,day) VALUES('b','u','','','#fff',1,'old','2026-10-11')",
      ),
    /verificada/,
  );
  assert.equal(c.db.prepare("SELECT balance FROM users WHERE id='u'").get().balance, balance);
  assert.equal(c.db.prepare('SELECT count(*) n FROM banners').get().n, 0);
});

test('Text resembling JavaScript stays an inert attachment with nosniff and sandbox', async (t) => {
  const c = setup(t);
  const f = await upload(
    request(
      Buffer.from('globalThis.uploadExecuted=true;'),
      'script-example.txt',
      'text/javascript',
    ),
    c.env,
    user,
  );
  const r = await fileResponse(
    new Request(`https://lanet.test/api/files/${f.id}`),
    c.env,
    user,
    f.id,
  );
  assert.equal(r.headers.get('Content-Type'), 'text/plain');
  assert.match(r.headers.get('Content-Disposition'), /^attachment/);
  assert.equal(r.headers.get('X-Content-Type-Options'), 'nosniff');
  assert.match(r.headers.get('Content-Security-Policy'), /default-src 'none'/);
  assert.equal(c.calls(), 0);
});

test('Migration: existing file metadata and references are preserved and marked legacy', () => {
  const db = new DatabaseSync(':memory:');
  db.exec(
    "CREATE TABLE files(id TEXT PRIMARY KEY,owner_id TEXT,name TEXT,mime TEXT,size INTEGER,object_key TEXT,note_id TEXT,plus_id TEXT,proposal_id TEXT);CREATE TABLE banners(id TEXT,file_id TEXT);INSERT INTO files VALUES('f','u','original.png','image/png',100,'unchanged','n',NULL,NULL)",
  );
  try {
    db.exec(readFileSync('migrations/0017_file_safety.sql', 'utf8'));
    const r = db.prepare('SELECT * FROM files').get();
    assert.equal(r.object_key, 'unchanged');
    assert.equal(r.note_id, 'n');
    assert.equal(r.safety_state, 'legacy');
    assert.equal(r.safety_policy, null);
  } finally {
    db.close();
  }
});

test('PDF: forged containers and alternate-stream/executable names never reach R2', async (t) => {
  const c = setup(t);
  for (const [bytes, name] of [
    [Buffer.from('%PDF-1.4\nalert(1)\n%%EOF'), 'fals.pdf'],
    [
      Buffer.from(
        pdfFixture()
          .toString()
          .replace(/startxref\n\d+/, 'startxref\n0'),
      ),
      'offset.pdf',
    ],
    [Buffer.concat([pdfFixture(), Buffer.from('MZpayload')]), 'final.pdf'],
    [pdfFixture(), 'apunts.pdf:payload'],
    [pdfFixture(), 'apunts.scr.pdf'],
    [pdfFixture(), 'apunts.hta.pdf'],
    [pdfFixture(), 'apunts.lnk.pdf'],
  ]) {
    await assert.rejects(
      upload(request(bytes, name, 'application/pdf'), c.env, user),
      (e) => e.status === 400,
    );
    c.db.prepare("DELETE FROM upload_guards WHERE user_id='u'").run();
  }
  assert.equal(c.objects.size, 0);
  assert.equal(c.db.prepare('SELECT count(*) n FROM files').get().n, 0);
});

test('PDF: valid PDF is checked once and old policy is rechecked before ranges/downloads', async (t) => {
  const c = setup(t);
  const file = await upload(
    request(pdfFixture(), 'Apunts de química.pdf', 'text/html'),
    c.env,
    user,
  );
  assert.equal(file.mime, 'application/pdf');
  assert.equal(c.calls(), 0);
  assert.equal(
    c.db.prepare('SELECT safety_policy FROM files WHERE id=?').get(file.id).safety_policy,
    'lanet-pdf-v1',
  );
  const originalGet = c.env.FILES.get;
  let reads = 0;
  c.env.FILES.get = (...args) => {
    reads++;
    return originalGet(...args);
  };
  const cached = await fileResponse(
    new Request('https://lanet.test/api/files/' + file.id),
    c.env,
    user,
    file.id,
  );
  assert.match(cached.headers.get('Content-Disposition'), /^attachment/);
  assert.equal(reads, 1, 'A current PDF reads only its response bytes, without rescanning');
  c.db.prepare("UPDATE files SET safety_policy='lanet-file-v1' WHERE id=?").run(file.id);
  const response = await fileResponse(
    new Request('https://lanet.test/api/files/' + file.id + '?download', {
      headers: { Range: 'bytes=0-3' },
    }),
    c.env,
    user,
    file.id,
  );
  assert.equal(response.status, 206);
  assert.match(response.headers.get('Content-Disposition'), /^attachment/);
  assert.equal(await response.text(), '%PDF');
  assert.equal(
    c.db.prepare('SELECT safety_policy FROM files WHERE id=?').get(file.id).safety_policy,
    'lanet-pdf-v1',
  );
  c.db.prepare("UPDATE files SET safety_policy='lanet-file-v1' WHERE id=?").run(file.id);
  c.objects.set(
    c.db.prepare('SELECT object_key FROM files WHERE id=?').get(file.id).object_key,
    Buffer.from('%PDF-1.4\nfals\n%%EOF'),
  );
  await assert.rejects(
    fileResponse(
      new Request('https://lanet.test/api/files/' + file.id + '?download'),
      c.env,
      user,
      file.id,
    ),
    (e) => e.status === 400,
  );
  assert.equal(
    c.db.prepare('SELECT safety_state FROM files WHERE id=?').get(file.id).safety_state,
    'blocked',
  );
});

test('PDF: existing official local PDF fixtures remain accepted', () => {
  for (const name of [
    'weights-2027.pdf',
    'weights-2026.pdf',
    'history-2021-2025.pdf',
    'cutoffs-2026-latest.pdf',
    'cutoffs-2026-first.pdf',
  ])
    assert.equal(
      validateFile(readFileSync('tests/fixtures/pau/sources/' + name), name).mime,
      'application/pdf',
    );
});
