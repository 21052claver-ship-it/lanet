export class LibraryError extends Error {}
const invalid = (message) => {
  throw new LibraryError(message);
};
export function libraryText(value, max, label, required = true) {
  if (typeof value !== 'string') invalid(`Revisa ${label}.`);
  const text = value.trim();
  if (
    (required && !text) ||
    text.length > max ||
    /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/u.test(text)
  )
    invalid(`${label}: ${required ? 'cal text i ' : ''}un màxim de ${max} caràcters.`);
  return text;
}
export function libraryUrl(value, required = true) {
  const text = libraryText(value, 1800, 'l’enllaç', required);
  if (!text) return '';
  let url;
  try {
    url = new URL(text);
  } catch {
    invalid('Escriu un enllaç HTTPS complet.');
  }
  if (
    url.protocol !== 'https:' ||
    url.username ||
    url.password ||
    url.port ||
    !url.hostname.includes('.') ||
    /^(localhost|.*\.local|.*\.internal)$/i.test(url.hostname) ||
    /^(?:\d+\.){3}\d+$/.test(url.hostname) ||
    url.hostname.startsWith('[')
  )
    invalid('Utilitza un enllaç HTTPS públic, sense credencials ni ports.');
  return url.href;
}
export function validateLibrary(value, subjectIds) {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    invalid('Revisa les dades del recurs.');
  const keys = ['kind', 'title', 'subject_ids', 'topic', 'summary', 'url', 'source', 'formulas'];
  if (Object.keys(value).some((key) => !keys.includes(key)))
    invalid('El recurs conté camps no admesos.');
  if (!['formula', 'tool'].includes(value.kind)) invalid('Tria el tipus de recurs.');
  if (
    !Array.isArray(value.subject_ids) ||
    value.subject_ids.length > 10 ||
    new Set(value.subject_ids).size !== value.subject_ids.length ||
    value.subject_ids.some((s) => !subjectIds.includes(s)) ||
    (value.kind === 'formula' && value.subject_ids.length !== 1)
  )
    invalid('Tria una assignatura vàlida per al formulari.');
  if (
    !Array.isArray(value.formulas) ||
    value.formulas.length > 24 ||
    (value.kind === 'tool' && value.formulas.length)
  )
    invalid('Pots incloure fins a 24 fórmules.');
  const formulas = value.formulas.map((f) => {
    if (
      !f ||
      typeof f !== 'object' ||
      Array.isArray(f) ||
      Object.keys(f).some((k) => !['label', 'expression', 'explanation'].includes(k))
    )
      invalid('Revisa el format de les fórmules.');
    return {
      label: libraryText(f.label, 100, 'el nom de la fórmula'),
      expression: libraryText(f.expression, 500, 'la fórmula'),
      explanation: libraryText(f.explanation, 1000, 'l’explicació'),
    };
  });
  const url = libraryUrl(value.url, value.kind === 'tool' || !formulas.length);
  return {
    kind: value.kind,
    title: libraryText(value.title, 100, 'el títol'),
    subject_ids: [...value.subject_ids],
    topic: libraryText(value.topic, 80, 'el tema'),
    summary: libraryText(value.summary, 600, 'el resum'),
    url,
    source: libraryText(value.source, 160, 'la font'),
    formulas,
  };
}
export const emptyLibrary = (kind, subject = '') => ({
  kind,
  title: '',
  subject_ids: subject ? [subject] : [],
  topic: '',
  summary: '',
  url: '',
  source: '',
  formulas: [],
});
