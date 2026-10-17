import { createServer } from 'node:http';
import { readFileSync, statSync } from 'node:fs';
import { resolve, extname, sep } from 'node:path';
import { randomUUID, createHash } from 'node:crypto';
import { testEnvironment } from './d1.js';
import app from '../../worker/index.js';
import { madridDay } from '../../shared/domain.js';
import { byteRange } from '../../shared/byte-range.js';

function pdfFixture() {
  const content = 'BT /F1 18 Tf 50 750 Td (La Net local PDF compatibility check) Tj ET';
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
    `<< /Length ${content.length} >>\nstream\n${content}\nendstream`,
  ];
  let text = '%PDF-1.4\n';
  const offsets = [0];
  objects.forEach((o, i) => {
    offsets.push(Buffer.byteLength(text));
    text += `${i + 1} 0 obj\n${o}\nendobj\n`;
  });
  const offset = Buffer.byteLength(text);
  text +=
    'xref\n0 6\n0000000000 65535 f \n' +
    offsets
      .slice(1)
      .map((o) => String(o).padStart(10, '0') + ' 00000 n \n')
      .join('') +
    `trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${offset}\n%%EOF`;
  return Buffer.from(text);
}

// Only isolated in-memory data and compiled local assets are served. No provider
// account or production service is contacted by this fixture.
export async function browserFixture({ beforeAsset, mediaSafety } = {}) {
  const { db, env } = testEnvironment();
  const token = randomUUID();
  db.prepare(
    "INSERT INTO users(id,email,name,password_hash,salt,google_sub,group_id,configured) VALUES('browser','browser@fje.edu','Usuari de prova local','unusable','fixture','local-browser-sub','2B',1)",
  ).run();
  db.prepare(
    "INSERT INTO sessions(hash,user_id,expires,auth_provider) VALUES(?,'browser',?,'google')",
  ).run(createHash('sha256').update(token).digest('hex'), Date.now() + 3600000);
  const offerings = db
    .prepare(
      "SELECT id,subject_id FROM offerings WHERE subject_id IN('math','phy','chem','cat','eng','hist','phil') GROUP BY subject_id",
    )
    .all();
  for (const o of offerings) {
    db.prepare("INSERT INTO enrollments(user_id,offering_id) VALUES('browser',?)").run(o.id);
    for (let term = 1; term <= 3; term++)
      for (const [position, title, type, weight] of [
        [0, 'Parcial 1', 'partial1', 25],
        [1, 'Parcial 2', 'partial2', 25],
        [2, 'Trimestral', 'term', 50],
      ])
        db.prepare(
          "INSERT INTO grade_entries(id,user_id,subject_id,term,category,title,weight,position,assessment_type,grade) VALUES(?,'browser',?,?,'exam',?,?,?,?,?)",
        ).run(
          `${o.subject_id}-${term}-${position}`,
          o.subject_id,
          term,
          title,
          weight,
          position,
          type,
          position === 0 ? 7.4 : null,
        );
  }
  db.prepare(
    "INSERT INTO events(id,owner_id,title,kind,date,subject_id,visibility) VALUES('browser-exam','browser','Examen local de compatibilitat','exam',?,'math','private')",
  ).run(madridDay());
  db.exec(
    "INSERT INTO notes(id,author_id,subject_id,title,body,summary) VALUES('browser-note','browser','math','PDF de prova local','Text de prova segur: <img src=x onerror=alert(1)>','Un recurs de prova amb PDF.'); INSERT INTO pluses(id,author_id,title,body,date,place) VALUES('browser-plus','browser','Activitat local','Una activitat per comprovar el disseny.','2026-10-20','Aula de proves'); INSERT INTO plus_subjects(plus_id,subject_id,bonus) VALUES('browser-plus','math','+0,5'); INSERT INTO proposals(id,author_id,title,body) VALUES('browser-proposal','browser','Una idea local','Proposta fictícia per a la revisió.');",
  );
  const pdf = pdfFixture();
  const files = new Map([['fixture/pdf', pdf]]);
  db.prepare(
    "INSERT INTO files(id,owner_id,name,mime,size,object_key,note_id,preview) VALUES('browser-pdf','browser','prova-local.pdf','application/pdf',?,'fixture/pdf','browser-note',1)",
  ).run(pdf.length);
  env.FILES = {
    async get(key, options) {
      const data = files.get(key);
      return data
        ? {
            body: options?.range
              ? data.subarray(options.range.offset, options.range.offset + options.range.length)
              : data,
          }
        : null;
    },
    async put(key, data) {
      files.set(key, data);
    },
    async delete(key) {
      files.delete(key);
    },
  };
  if (mediaSafety) env.MEDIA_SAFETY = mediaSafety;
  const root = resolve('dist-pages');
  const types = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'text/javascript',
    '.mjs': 'text/javascript',
    '.css': 'text/css',
    '.svg': 'image/svg+xml',
    '.png': 'image/png',
    '.webp': 'image/webp',
    '.ogg': 'audio/ogg',
    '.mp3': 'audio/mpeg',
    '.woff2': 'font/woff2',
    '.json': 'application/json',
    '.txt': 'text/plain',
  };
  env.ASSETS = {
    async fetch(request) {
      const url = new URL(request.url);
      const path = resolve(
        root,
        '.' + decodeURIComponent(url.pathname === '/' ? '/index.html' : url.pathname),
      );
      if (!path.startsWith(root + sep) || /\/_/.test(url.pathname))
        return new Response(null, { status: 404 });
      // Server-side fault injection also covers native WebKit media requests,
      // which can bypass Playwright's page-level interception on Windows.
      const overridden = await beforeAsset?.(request);
      if (overridden) return overridden;
      let bytes;
      try {
        if (!statSync(path).isFile()) throw new Error();
        bytes = readFileSync(path);
      } catch {
        return new Response(null, { status: 404 });
      }
      const range = request.headers.has('Range')
        ? byteRange(request.headers.get('Range'), bytes.length)
        : null;
      return new Response(range ? bytes.subarray(range.offset, range.end + 1) : bytes, {
        status: range ? 206 : 200,
        headers: {
          'Content-Type': types[extname(path)] || 'application/octet-stream',
          'Accept-Ranges': 'bytes',
          'Content-Length': String(range?.length || bytes.length),
          ...(range
            ? { 'Content-Range': `bytes ${range.offset}-${range.end}/${bytes.length}` }
            : {}),
        },
      });
    },
  };
  let base;
  const server = createServer(async (req, res) => {
    try {
      const chunks = [];
      for await (const chunk of req) chunks.push(chunk);
      const bytes = Buffer.concat(chunks);
      const request = new Request(base + req.url, {
        method: req.method,
        headers: req.headers,
        ...(bytes.length ? { body: bytes } : {}),
      });
      const response = await app.fetch(request, env, {});
      res.statusCode = response.status;
      for (const [key, value] of response.headers)
        if (key !== 'set-cookie') res.setHeader(key, value);
      const cookies = response.headers.getSetCookie();
      if (cookies.length) res.setHeader('Set-Cookie', cookies);
      res.end(Buffer.from(await response.arrayBuffer()));
    } catch (error) {
      res.statusCode = 500;
      res.end(String(error.message));
    }
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  base = `http://127.0.0.1:${server.address().port}`;
  env.GOOGLE_REDIRECT_URI = base + '/api/auth/google/callback';
  return {
    base,
    token,
    db,
    files,
    close: async () => {
      await new Promise((resolve) => server.close(resolve));
      db.close();
    },
  };
}
