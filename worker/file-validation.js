import { fail } from './utils.js';
import { hasPdfCrossReference } from '../shared/pdf-preflight.js';

export const MAX_FILE_BYTES = 25 * 1024 * 1024;
export const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
export const MAX_IMAGE_PIXELS = 24_000_000;
export const MAX_IMAGE_SIDE = 10000;
const decoder = new TextDecoder('utf-8', { fatal: true });
const ascii = (b, a, z) => String.fromCharCode(...b.subarray(a, z));
const invalid = () => fail(400, 'El contingut del fitxer no correspon al format o està malmès.');
const view = (bytes) => new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
const imageMimes = {
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  webp: 'image/webp',
  gif: 'image/gif',
};
export const SAFE_MIMES = new Set([
  ...Object.values(imageMimes),
  'application/pdf',
  'video/mp4',
  'video/webm',
  'text/plain',
  'application/octet-stream',
]);

export function safeFileName(value) {
  let decoded;
  try {
    decoded = decodeURIComponent(value || '');
  } catch {
    invalid();
  }
  const name = decoded
    .normalize('NFC')
    .replace(/[\\/\x00-\x1f\x7f-\x9f\u202a-\u202e\u2066-\u2069]/g, '_')
    .trim();
  if (!name || name.length > 150 || /[. ]$/.test(name) || name.includes(':'))
    fail(400, 'El nom del fitxer no és vàlid.');
  // Reject dangerous names even when accompanied by a forged image header.
  if (
    /(?:^|\.)(?:js|mjs|cjs|jsx|ts|tsx|html?|xhtml|svg|php\d*|phtml|asp|aspx|exe|dll|com|scr|msi|msp|hta|lnk|url|jar|vbs|vbe|wsf|wsh|reg|bat|cmd|ps1|sh|wasm)(?:\.|$)/i.test(
      name,
    )
  )
    fail(400, 'No es poden pujar fitxers executables, scripts, HTML ni SVG.');
  return name;
}

export async function readLimited(stream, max = MAX_FILE_BYTES, { timeoutMs = 0, onBytes } = {}) {
  const reader = stream?.getReader();
  if (!reader) fail(400, 'Falta el fitxer.');
  const chunks = [];
  let size = 0;
  let timer;
  let timedOut = false;
  if (timeoutMs)
    timer = setTimeout(() => {
      timedOut = true;
      reader.cancel().catch(() => {});
    }, timeoutMs);
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (timedOut) fail(408, 'La pujada triga massa. Comprova la connexió i torna-ho a provar.');
      if (done) break;
      size += value.byteLength;
      onBytes?.(size);
      if (size > max) {
        await reader.cancel();
        fail(413, 'El fitxer supera el límit de mida.');
      }
      chunks.push(value);
    }
    if (!size) fail(400, 'El fitxer és buit.');
    const bytes = new Uint8Array(size);
    let offset = 0;
    for (const c of chunks) {
      bytes.set(c, offset);
      offset += c.length;
    }
    return bytes;
  } finally {
    clearTimeout(timer);
  }
}

export function checkDimensions(width, height) {
  if (
    !Number.isInteger(width) ||
    !Number.isInteger(height) ||
    width < 1 ||
    height < 1 ||
    width > MAX_IMAGE_SIDE ||
    height > MAX_IMAGE_SIDE ||
    width * height > MAX_IMAGE_PIXELS
  )
    fail(413, 'La imatge és massa gran: màxim 24 megapíxels i 10.000 píxels per costat.');
}

function png(bytes) {
  if (ascii(bytes, 0, 8) !== '\x89PNG\r\n\x1a\n') invalid();
  const v = view(bytes);
  let p = 8,
    data = false,
    header = false;
  while (p + 12 <= bytes.length) {
    const length = v.getUint32(p),
      type = ascii(bytes, p + 4, p + 8);
    if (p + 12 + length > bytes.length || !/^[a-zA-Z]{4}$/.test(type)) invalid();
    if (!header) {
      if (type !== 'IHDR' || length !== 13) invalid();
      checkDimensions(v.getUint32(p + 8), v.getUint32(p + 12));
      header = true;
    } else if (type === 'IHDR') invalid();
    if (type === 'IDAT' && length) data = true;
    p += length + 12;
    if (type === 'IEND') {
      if (length || p !== bytes.length || !data) invalid();
      return;
    }
  }
  invalid();
}

function jpeg(bytes) {
  if (
    bytes.length < 10 ||
    bytes[0] !== 255 ||
    bytes[1] !== 216 ||
    bytes.at(-2) !== 255 ||
    bytes.at(-1) !== 217
  )
    invalid();
  const v = view(bytes);
  let p = 2,
    frame = false;
  while (p + 4 <= bytes.length) {
    if (bytes[p++] !== 255) invalid();
    while (bytes[p] === 255) p++;
    const marker = bytes[p++];
    if (marker === 0xda) {
      if (!frame) invalid();
      return;
    } // Entropy data is checked by the image decoder.
    if (marker === 0xd9 || marker === 0 || marker === 0xd8 || (marker >= 0xd0 && marker <= 0xd7))
      invalid();
    const length = v.getUint16(p);
    if (length < 2 || p + length > bytes.length) invalid();
    if ([0xc0, 0xc1, 0xc2].includes(marker)) {
      if (frame || length < 8) invalid();
      checkDimensions(v.getUint16(p + 5), v.getUint16(p + 3));
      frame = true;
    }
    p += length;
  }
  invalid();
}

function webp(bytes) {
  if (bytes.length < 20 || ascii(bytes, 0, 4) !== 'RIFF' || ascii(bytes, 8, 12) !== 'WEBP')
    invalid();
  const v = view(bytes);
  if (v.getUint32(4, true) + 8 !== bytes.length) invalid();
  let p = 12,
    image = false;
  while (p + 8 <= bytes.length) {
    const kind = ascii(bytes, p, p + 4),
      length = v.getUint32(p + 4, true);
    if (['VP8 ', 'VP8L', 'ANMF'].includes(kind) && length) image = true;
    p += 8 + length + (length % 2);
    if (p > bytes.length) invalid();
  }
  if (p !== bytes.length || !image) invalid();
}

function office(bytes, ext) {
  // Read the ZIP directory without executing or inflating entries.
  const v = view(bytes);
  if (bytes.length < 22 || v.getUint32(0, true) !== 0x04034b50) invalid();
  let end = bytes.length - 22;
  while (end >= Math.max(0, bytes.length - 65557) && v.getUint32(end, true) !== 0x06054b50) end--;
  if (end < Math.max(0, bytes.length - 65557)) invalid();
  if (
    end + 22 + v.getUint16(end + 20, true) !== bytes.length ||
    v.getUint16(end + 4, true) ||
    v.getUint16(end + 6, true)
  )
    invalid();
  const count = v.getUint16(end + 10, true),
    directory = v.getUint32(end + 16, true);
  if (!count || count > 2000 || directory + v.getUint32(end + 12, true) !== end) invalid();
  let p = directory,
    expanded = 0;
  const names = new Set();
  for (let i = 0; i < count; i++) {
    if (p + 46 > end || v.getUint32(p, true) !== 0x02014b50 || v.getUint16(p + 8, true) & 1)
      invalid();
    const n = v.getUint16(p + 28, true),
      extra = v.getUint16(p + 30, true),
      comment = v.getUint16(p + 32, true);
    if (p + 46 + n + extra + comment > end) invalid();
    let name;
    try {
      name = decoder.decode(bytes.subarray(p + 46, p + 46 + n));
    } catch {
      invalid();
    }
    if (
      name.includes('..') ||
      name.includes('\\') ||
      name.startsWith('/') ||
      /vbaProject\.bin$/i.test(name) ||
      names.has(name)
    )
      invalid();
    names.add(name);
    expanded += v.getUint32(p + 24, true);
    if (expanded > 100 * 1024 * 1024) invalid();
    const local = v.getUint32(p + 42, true);
    if (local + 30 > directory || v.getUint32(local, true) !== 0x04034b50) invalid();
    p += 46 + n + extra + comment;
  }
  const required = {
    docx: ['[Content_Types].xml', 'word/document.xml'],
    xlsx: ['[Content_Types].xml', 'xl/workbook.xml'],
    pptx: ['[Content_Types].xml', 'ppt/presentation.xml'],
    odt: ['mimetype', 'content.xml'],
  }[ext];
  if (p !== end || required.some((n) => !names.has(n))) invalid();
}

export function validateFile(bytes, name) {
  const ext = name.split('.').at(-1).toLowerCase();
  const imageMime = Object.hasOwn(imageMimes, ext) ? imageMimes[ext] : null;
  let mime;
  if (imageMime) {
    if (bytes.length > MAX_IMAGE_BYTES) fail(413, 'El límit d’una imatge és de 10 MB.');
    if (ext === 'png') png(bytes);
    else if (ext === 'jpg' || ext === 'jpeg') jpeg(bytes);
    else if (ext === 'webp') webp(bytes);
    else {
      if (
        bytes.length < 14 ||
        !['GIF87a', 'GIF89a'].includes(ascii(bytes, 0, 6)) ||
        bytes.at(-1) !== 0x3b
      )
        invalid();
      const v = view(bytes);
      checkDimensions(v.getUint16(6, true), v.getUint16(8, true));
    }
    mime = imageMime;
  } else if (ext === 'pdf') {
    if (!hasPdfCrossReference(bytes)) invalid();
    mime = 'application/pdf';
  } else if (ext === 'txt') {
    try {
      decoder.decode(bytes);
    } catch {
      invalid();
    }
    if (bytes.some((b) => b === 0)) invalid();
    mime = 'text/plain';
  } else if (['docx', 'odt', 'pptx', 'xlsx'].includes(ext)) {
    office(bytes, ext);
    mime = 'application/octet-stream';
  } else if (ext === 'mp4' || ext === 'm4v') {
    const v = view(bytes),
      kinds = new Set();
    let p = 0;
    while (p + 8 <= bytes.length) {
      const length = v.getUint32(p),
        kind = ascii(bytes, p + 4, p + 8);
      if (length < 8 || p + length > bytes.length) invalid();
      if (
        p === 0 &&
        (kind !== 'ftyp' ||
          length < 16 ||
          !['isom', 'iso2', 'avc1', 'mp41', 'mp42', 'M4V ', 'MSNV', 'dash'].includes(
            ascii(bytes, p + 8, p + 12),
          ))
      )
        invalid();
      kinds.add(kind);
      p += length;
    }
    if (p !== bytes.length || !kinds.has('moov') || !kinds.has('mdat')) invalid();
    mime = 'video/mp4';
  } else if (ext === 'webm') {
    if (
      bytes.length < 16 ||
      ascii(bytes, 0, 4) !== '\x1a\x45\xdf\xa3' ||
      !ascii(bytes, 0, Math.min(4096, bytes.length)).includes('webm')
    )
      invalid();
    mime = 'video/webm';
  } else
    fail(400, 'Formats admesos: PNG, JPG, WebP, GIF, MP4, WebM, PDF, TXT, DOCX, ODT, PPTX i XLSX.');
  if (!mime.startsWith('video/') && bytes.length > MAX_IMAGE_BYTES)
    fail(413, 'El límit d’aquest format és de 10 MB.');
  return { mime, image: !!imageMime };
}
