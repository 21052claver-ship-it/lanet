import { PDFDocument, PDFDict, PDFArray, PDFName, PDFRef, PDFStream } from 'pdf-lib';
import { encode } from 'fast-png';
import { HttpError, fail } from './utils.js';
import { MAX_IMAGE_BYTES, validateFile } from './file-validation.js';

export const MAX_PDF_PAGES = 40;
const MAX_OBJECTS = 20000;
const MAX_PIXELS = 32_000_000;
const SIDE = 1600;
const invalid = () => fail(400, 'El PDF està malmès, xifrat o no es pot comprovar completament.');
const active = () => fail(400, 'No es poden pujar PDF amb scripts, adjunts o contingut actiu.');
const forbidden = new Set([
  'JS',
  'JavaScript',
  'AA',
  'OpenAction',
  'Launch',
  'SubmitForm',
  'ImportData',
  'GoToR',
  'GoToE',
  'URI',
  'RichMedia',
  'RichMediaContent',
  'RichMediaSettings',
  'Movie',
  'Sound',
  'Rendition',
  'EmbeddedFiles',
  'EmbeddedFile',
  'Filespec',
  'EF',
  'AF',
  'XFA',
  'AcroForm',
  'OCProperties',
  'Collection',
  'Encrypt',
]);

// Parse names/dictionaries, including escaped names and compressed object streams.
// Searching the original bytes alone misses both of those cases.
export async function inspectPdfStructure(bytes) {
  validateFile(bytes, 'document.pdf');
  const tail = new TextDecoder('latin1').decode(bytes.subarray(Math.max(0, bytes.length - 1024)));
  const ending = /startxref\s+(\d+)\s+%%EOF\s*$/.exec(tail);
  if (!ending) invalid();
  const offset = Number(ending[1]);
  if (!Number.isSafeInteger(offset) || offset < 8 || offset >= bytes.length) invalid();
  const xref = new TextDecoder('latin1').decode(bytes.subarray(offset, offset + 256));
  if (!/^xref\s/.test(xref) && !/^\d+\s+\d+\s+obj\s*<</.test(xref)) invalid();
  const doc = await PDFDocument.load(bytes, {
    throwOnInvalidObject: true,
    updateMetadata: false,
  });
  if (doc.isEncrypted) invalid();
  const objects = doc.context.enumerateIndirectObjects();
  if (objects.length > MAX_OBJECTS) fail(413, 'El PDF té massa objectes per comprovar-lo.');
  const seen = new Set();
  let visited = 0;
  const visit = (object, depth = 0) => {
    if (depth > 100 || ++visited > MAX_OBJECTS * 10) invalid();
    if (object instanceof PDFRef) {
      const resolved = doc.context.lookup(object);
      if (!resolved) invalid();
      return visit(resolved, depth + 1);
    }
    if (seen.has(object)) return;
    seen.add(object);
    if (object instanceof PDFName && forbidden.has(object.decodeText())) active();
    if (object instanceof PDFStream) visit(object.dict, depth + 1);
    else if (object instanceof PDFDict) {
      for (const [key, value] of object.entries()) {
        visit(key, depth + 1);
        visit(value, depth + 1);
      }
    } else if (object instanceof PDFArray) {
      for (let i = 0; i < object.size(); i++) visit(object.get(i), depth + 1);
    }
  };
  for (const [, object] of objects) visit(object);
  const pages = doc.getPageCount();
  if (!pages) invalid();
  if (pages > MAX_PDF_PAGES) fail(413, `El PDF pot tenir fins a ${MAX_PDF_PAGES} pàgines.`);
  return pages;
}

// Only approved page pixels enter the new PDF. Hidden images, old revisions,
// metadata and arbitrary payloads from the input are never copied or served.
export async function inspectPdf(bytes, env, ctx, library, inspectImage) {
  let document;
  const started = Date.now();
  try {
    const pageCount = await inspectPdfStructure(bytes);
    document = await library.loadDocument(bytes);
    if (document.getPageCount() !== pageCount) invalid();
    const output = await PDFDocument.create();
    let pixels = 0,
      encodedBytes = 0;
    for (const page of document.pages()) {
      try {
        if (Date.now() - started > 150000)
          fail(503, 'La comprovació del PDF triga massa. Torna-ho a provar.');
        const { originalWidth: width, originalHeight: height } = page.getOriginalSize();
        if (![width, height].every((n) => Number.isFinite(n) && n >= 1 && n <= 14400)) invalid();
        const scale = Math.min(2, SIDE / Math.max(width, height));
        const w = Math.floor(Math.floor(width) * scale),
          h = Math.floor(Math.floor(height) * scale);
        if (!w || !h || (pixels += w * h) > MAX_PIXELS)
          fail(413, 'El PDF és massa gran per comprovar totes les pàgines.');
        const image = await page.render({
          scale,
          renderFormFields: false,
          render: ({ width, height, data }) => encode({ width, height, data, channels: 4 }),
        });
        if ((encodedBytes += image.data.length) > MAX_IMAGE_BYTES)
          fail(413, 'El PDF comprovat supera el límit de 10 MB.');
        await inspectImage(image.data, 'image/png', env, ctx);
        const embedded = await output.embedPng(image.data);
        await embedded.embed(); // Keep compressed streams, release each page's decoded pixels.
        output.addPage([width, height]).drawImage(embedded, { x: 0, y: 0, width, height });
      } finally {
        page.close();
      }
    }
    const normalized = await output.save();
    validateFile(normalized, 'document.pdf');
    return normalized;
  } catch (error) {
    if (error instanceof HttpError) throw error;
    invalid();
  } finally {
    document?.destroy();
  }
}
