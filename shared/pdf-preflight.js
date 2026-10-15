// Bounded container checks, not an antivirus verdict or a complete PDF parser.
const read = (bytes, start, end) =>
  String.fromCharCode(...bytes.subarray(start, Math.min(end, bytes.length)));
const space = '[\\x00\\t\\n\\f\\r ]';
export function hasPdfCrossReference(bytes) {
  if (!/^%PDF-(?:1\.[0-7]|2\.0)(?:\r\n|\r|\n)/.test(read(bytes, 0, 16))) return false;
  const tailStart = Math.max(0, bytes.length - 4096);
  const closing = read(bytes, tailStart, bytes.length).match(
    new RegExp(
      '(?:^|[\\r\\n])startxref' + space + '+(\\d{1,10})' + space + '+%%EOF' + space + '*$',
    ),
  );
  if (!closing) return false;
  const offset = Number(closing[1]);
  if (!Number.isSafeInteger(offset) || offset < 9 || offset >= tailStart + closing.index)
    return false;
  const head = read(bytes, offset, offset + 4096);
  if (head.startsWith('xref')) {
    const section = head.match(
      new RegExp(
        '^xref' +
          space +
          '+(\\d+)' +
          space +
          '+(\\d+)' +
          space +
          '+(\\d{10})' +
          space +
          '(\\d{5})' +
          space +
          '([nf])(?:[\\r\\n]| [\\r\\n])',
      ),
    );
    if (
      !section ||
      Number(section[2]) < 1 ||
      Number(section[1]) + Number(section[2]) > 100000 ||
      Number(section[4]) > 65535
    )
      return false;
    if (section[5] === 'n') {
      const position = Number(section[3]);
      if (
        !new RegExp(
          '^' +
            Number(section[1]) +
            space +
            '+' +
            Number(section[4]) +
            space +
            '+obj(?:' +
            space +
            '|[<\\[/(])',
        ).test(read(bytes, position, position + 64))
      )
        return false;
    }
    return true;
  }
  // PDF 1.5+ may use an xref stream. Only its bounded dictionary is inspected.
  const dictionary = head
    .split(/\bstream(?:\r\n|\r|\n)/, 1)[0]
    .replace(/#([\da-f]{2})/gi, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
  return (
    new RegExp('^\\d+' + space + '+\\d+' + space + '+obj' + space + '*<<').test(dictionary) &&
    /\/Type[\x00\t\n\f\r ]*\/XRef(?:[\x00\t\n\f\r /<>\[\]()])/.test(dictionary)
  );
}
