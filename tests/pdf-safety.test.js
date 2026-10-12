import test from 'node:test';
import assert from 'node:assert/strict';
import { PDFDocument, PDFName, PDFString, rgb } from 'pdf-lib';
import { PDFiumLibrary } from '@hyzyla/pdfium';
import { decode } from 'fast-png';
import { inspectPdf, inspectPdfStructure, MAX_PDF_PAGES } from '../worker/pdf-inspection.js';
import { safePdf, PDF_SAFETY_POLICY } from '../worker/pdf-safety.js';
import { upload, fileResponse, ensureFileSafety, fileStatements } from '../worker/files.js';
import { HttpError } from '../worker/utils.js';
import { testEnvironment } from './helpers/d1.js';
import { pngFixture } from './helpers/media-fixtures.js';

async function fixture({ pages = 1, edit, compressed = true } = {}) {
  const doc = await PDFDocument.create();
  for (let i = 0; i < pages; i++) {
    const page = doc.addPage([200, 250]);
    page.drawText(`Apunt ${i + 1}`, { x: 20, y: 220, size: 12 });
    page.drawRectangle({ x: 20, y: 30, width: 50, height: 50, color: rgb(1, 0, 0) });
  }
  await edit?.(doc);
  return doc.save({ useObjectStreams: compressed });
}

async function withLibrary(t) {
  const library = await PDFiumLibrary.init();
  t.after(() => library.destroy());
  return library;
}

test('PDF: genuine classic and compressed PDFs pass; forged wrappers and broken references fail', async () => {
  for (const compressed of [false, true])
    assert.equal(await inspectPdfStructure(await fixture({ compressed })), 1);
  for (const bytes of [
    Buffer.from('%PDF-1.4\nalert(1)\n%%EOF'),
    Buffer.from('%PDF-1.4\n<script>alert(1)</script>\nstartxref\n0\n%%EOF'),
    Buffer.concat([await fixture(), Buffer.from('\nalert(1)')]),
    await fixture({ edit: (doc) => doc.catalog.set(PDFName.of('Missing'), doc.context.nextRef()) }),
  ])
    await assert.rejects(inspectPdfStructure(bytes));
});

test('PDF: active dictionaries are rejected even in object streams, escaped names and unused objects', async () => {
  for (const compressed of [false, true]) {
    for (const name of [
      'JavaScript',
      'Launch',
      'EmbeddedFile',
      'RichMedia',
      'XFA',
      'AA',
      'OpenAction',
    ]) {
      const bytes = await fixture({
        compressed,
        edit(doc) {
          doc.context.register(
            doc.context.obj({ S: PDFName.of(name), JS: PDFString.of('alert(1)') }),
          );
        },
      });
      await assert.rejects(inspectPdfStructure(bytes), (e) => e.status === 400);
    }
  }
  const bytes = await fixture({
    compressed: false,
    edit(doc) {
      doc.catalog.set(PDFName.of('JS'), PDFString.of('alert(1)'));
    },
  });
  const escaped = Buffer.from(bytes).toString('latin1').replace('/JS ', '/#4aS');
  // The replacement has the same length, so the xref remains valid.
  await assert.rejects(
    inspectPdfStructure(Buffer.from(escaped, 'latin1')),
    (e) => e.status === 400,
  );
  await assert.rejects(
    inspectPdfStructure(await fixture({ pages: MAX_PDF_PAGES + 1 })),
    (e) => e.status === 413,
  );
});

test('PDF: every page reaches image moderation and only page pixels enter the saved PDF', async (t) => {
  const library = await withLibrary(t);
  const source = await fixture({
    pages: 2,
    async edit(doc) {
      doc.setTitle('private metadata');
      await doc.embedPng(pngFixture(10, 10)); // An unused image must not survive.
    },
  });
  const images = [];
  const normalized = await inspectPdf(source, {}, null, library, async (bytes, mime) => {
    assert.equal(mime, 'image/png');
    const image = decode(bytes);
    assert.ok(image.width > 200 && image.height > 250);
    assert.ok(image.data.some((value) => value < 100)); // Actual page content, not a blank thumbnail.
    images.push(bytes);
  });
  assert.equal(images.length, 2);
  const out = await PDFDocument.load(normalized);
  assert.equal(out.getPageCount(), 2);
  assert.equal(out.getTitle(), undefined);
  assert.equal(
    out.context
      .enumerateIndirectObjects()
      .filter(([, obj]) => obj.dict?.get(PDFName.of('Subtype')) === PDFName.of('Image')).length,
    2,
  ); // Exactly one opaque page image per page; the unused image is gone.
  assert.deepEqual(out.getPages()[0].getSize(), { width: 200, height: 250 });
});

test('PDF: rejection on a later page, uncertainty and moderation outages never return approved bytes', async (t) => {
  const library = await withLibrary(t);
  const source = await fixture({ pages: 2 });
  for (const status of [422, 503]) {
    let calls = 0;
    await assert.rejects(
      inspectPdf(source, {}, null, library, async () => {
        if (++calls === 2) {
          const error = new HttpError(status, 'rebutjat');
          if (status === 422) error.code = 'image_blocked';
          throw error;
        }
      }),
      (e) => e.status === status,
    );
    assert.equal(calls, 2);
  }
  await assert.rejects(
    inspectPdf(Buffer.from('%PDF-1.4\nalert(1)\n%%EOF'), {}, null, library, () => {
      assert.fail('malformed PDFs must not reach moderation');
    }),
    (e) => e.status === 400,
  );
});

test('PDF: empty documents and oversized page geometry cannot receive approval', async (t) => {
  const library = await withLibrary(t);
  const empty = await PDFDocument.create();
  await assert.rejects(
    inspectPdf(await empty.save({ addDefaultPage: false }), {}, null, library, () => {
      assert.fail('empty PDF must not reach moderation');
    }),
    (e) => e.status === 400,
  );
  const huge = await fixture({
    edit(doc) {
      doc.getPage(0).setSize(20000, 20000);
    },
  });
  await assert.rejects(
    inspectPdf(huge, {}, null, library, () => {
      assert.fail('oversized PDF must not reach moderation');
    }),
    (e) => e.status === 400,
  );
});

test('PDF gateway: absent services, forged approvals, bad output and blocked responses fail closed', async () => {
  const source = await fixture();
  await assert.rejects(safePdf({}, source), (e) => e.status === 503);
  for (const response of [
    new Response(source, { headers: { 'Content-Type': 'application/pdf' } }),
    new Response('alert(1)', {
      headers: { 'Content-Type': 'application/pdf', 'X-LaNet-Safety': PDF_SAFETY_POLICY },
    }),
    Response.json({ error: 'blocked', code: 'image_blocked' }, { status: 422 }),
  ])
    await assert.rejects(safePdf({ MEDIA_SAFETY: { fetch: async () => response } }, source));
});

async function setup(t, failure = null) {
  const { db, env } = testEnvironment();
  t.after(() => db.close());
  db.exec(
    "INSERT INTO users(id,email,name,password_hash,salt) VALUES('u','u@fje.edu','Usuari','x','x')",
  );
  const objects = new Map();
  const normalized = await fixture();
  let calls = 0;
  env.FILES = {
    async put(key, bytes) {
      objects.set(key, Uint8Array.from(bytes));
    },
    async delete(key) {
      objects.delete(key);
    },
    async get(key, options) {
      const bytes = objects.get(key);
      const range = options?.range;
      return bytes
        ? {
            body: new Blob([
              range ? bytes.slice(range.offset, range.offset + range.length) : bytes,
            ]).stream(),
          }
        : null;
    },
  };
  env.MEDIA_SAFETY = {
    async fetch(request) {
      calls++;
      assert.equal(new URL(request.url).pathname, '/inspect-pdf');
      if (failure === 'offline') throw new Error('private provider error');
      if (failure === 'blocked')
        return Response.json({ error: 'blocked', code: 'image_blocked' }, { status: 422 });
      return new Response(normalized, {
        headers: { 'Content-Type': 'application/pdf', 'X-LaNet-Safety': PDF_SAFETY_POLICY },
      });
    },
  };
  return { db, env, objects, normalized, calls: () => calls };
}
const user = { id: 'u', role: 'student' };
const uploadRequest = (bytes) =>
  new Request('https://lanet.test/api/files', {
    method: 'POST',
    headers: {
      'X-File-Name': 'apunt.pdf',
      'Content-Type': 'application/javascript',
      'X-Moderation-Approved': 'true',
    },
    body: bytes,
  });

test('PDF upload: stores only the inspected replacement with the new policy', async (t) => {
  const c = await setup(t);
  const file = await upload(uploadRequest(await fixture({ pages: 2 })), c.env, user);
  const row = c.db.prepare('SELECT * FROM files').get();
  assert.equal(file.mime, 'application/pdf');
  assert.equal(row.safety_policy, PDF_SAFETY_POLICY);
  assert.deepEqual(c.objects.get(row.object_key), c.normalized);
  assert.equal(c.calls(), 1);
});

for (const failure of ['blocked', 'offline'])
  test(`PDF upload: ${failure} leaves no stored document`, async (t) => {
    const c = await setup(t, failure);
    await assert.rejects(
      upload(uploadRequest(await fixture()), c.env, user),
      (e) => e.status === (failure === 'blocked' ? 422 : 503),
    );
    assert.equal(c.objects.size, 0);
    assert.equal(c.db.prepare('SELECT count(*) n FROM files').get().n, 0);
  });

async function legacy(c) {
  const source = await fixture({ pages: 2 });
  c.objects.set('old/original', source);
  c.db
    .prepare(
      "INSERT INTO files(id,owner_id,name,mime,size,object_key,safety_state,safety_policy) VALUES('old','u','apunt.pdf','application/pdf',?,'old/original','validated','lanet-file-v1')",
    )
    .run(source.length);
  return c.db.prepare("SELECT * FROM files WHERE id='old'").get();
}

test('PDF legacy: old validated files are rechecked after authorization; ranges use the replacement', async (t) => {
  const c = await setup(t);
  await legacy(c);
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
  const response = await fileResponse(
    new Request('https://lanet.test/api/files/old?download', { headers: { Range: 'bytes=0-7' } }),
    c.env,
    user,
    'old',
  );
  assert.equal(response.status, 206);
  assert.deepEqual(new Uint8Array(await response.arrayBuffer()), c.normalized.slice(0, 8));
  const row = c.db.prepare("SELECT * FROM files WHERE id='old'").get();
  assert.equal(row.safety_policy, PDF_SAFETY_POLICY);
  assert.equal(row.original_object_key, 'old/original');
  assert.notEqual(row.object_key, 'old/original');
  await ensureFileSafety(c.env, row);
  assert.equal(c.calls(), 1);
});

test('PDF legacy: blocked documents cannot be attached or downloaded; outages remain retryable', async (t) => {
  for (const failure of ['blocked', 'offline']) {
    const c = await setup(t, failure);
    const row = await legacy(c);
    await assert.rejects(ensureFileSafety(c.env, row));
    assert.equal(
      c.db.prepare("SELECT safety_state FROM files WHERE id='old'").get().safety_state,
      failure === 'blocked' ? 'blocked' : 'validated',
    );
    if (failure === 'blocked') {
      await assert.rejects(
        fileStatements(c.env, user, ['old'], 'note_id', 'note'),
        (e) => e.status === 422,
      );
      await assert.rejects(
        fileResponse(new Request('https://lanet.test/api/files/old?download'), c.env, user, 'old'),
        (e) => e.status === 422,
      );
      assert.equal(c.calls(), 1);
    }
    assert.equal(c.objects.size, 1);
  }
});
