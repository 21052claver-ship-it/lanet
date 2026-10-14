export const HISTORY_YEARS = [2022, 2023, 2024, 2025, 2026];
const validMark = (value) =>
  value === null || (Number.isFinite(value) && value >= 5 && value <= 14);
export function validatePauHistory(data) {
  if (
    data?.schema !== 1 ||
    JSON.stringify(data.years) !== JSON.stringify(HISTORY_YEARS) ||
    data.route !== 'PAU/CFGS' ||
    data.session !== 'juny' ||
    !data.degrees ||
    Array.isArray(data.degrees) ||
    Object.keys(data.degrees).length < 500
  )
    throw new Error('Format de l’històric no vàlid.');
  for (const key of ['history-2021-2025', 'cutoffs-2026-first', 'cutoffs-2026-latest']) {
    const source = data.sources?.[key];
    if (
      !source ||
      new URL(source.url).origin !== 'https://universitats.gencat.cat' ||
      !/^[a-f0-9]{64}$/.test(source.sha256) ||
      !Number.isInteger(source.pages) ||
      source.pages < 1
    )
      throw new Error('Font de l’històric no vàlida.');
  }
  for (const [code, record] of Object.entries(data.degrees)) {
    if (
      !/^\d{5}$/.test(code) ||
      !record.name ||
      !record.university ||
      !['first', 'latest'].every(
        (kind) =>
          Array.isArray(record[kind]) && record[kind].length === 5 && record[kind].every(validMark),
      ) ||
      !Array.isArray(record.pages) ||
      record.pages.length !== 3
    )
      throw new Error('Sèrie de l’històric no vàlida.');
    for (const [index, key] of [
      'history-2021-2025',
      'cutoffs-2026-first',
      'cutoffs-2026-latest',
    ].entries()) {
      const page = record.pages[index];
      if (page !== null && (!Number.isInteger(page) || page < 1 || page > data.sources[key].pages))
        throw new Error('Pàgina de l’històric no vàlida.');
    }
    if (
      ((record.first.slice(0, 4).some((v) => v !== null) ||
        record.latest.slice(0, 4).some((v) => v !== null)) &&
        record.pages[0] === null) ||
      (record.first[4] !== null && record.pages[1] === null) ||
      (record.latest[4] !== null && record.pages[2] === null)
    )
      throw new Error('Falta la procedència de la dada.');
  }
  return data;
}

export function historicalStats(values) {
  const known = values.filter((value) => typeof value === 'number' && Number.isFinite(value));
  const millis = known.map((value) => Math.round(value * 1000));
  return {
    count: known.length,
    mean: known.length
      ? Math.round(millis.reduce((sum, n) => sum + n, 0) / known.length) / 1000
      : null,
    min: known.length ? Math.min(...known) : null,
    max: known.length ? Math.max(...known) : null,
    delta:
      values[0] != null && values.at(-1) != null
        ? (Math.round(values.at(-1) * 1000) - Math.round(values[0] * 1000)) / 1000
        : null,
  };
}
export function historySegments(values) {
  const segments = [];
  values.forEach((value, index) => {
    if (value === null) return;
    if (index === 0 || values[index - 1] === null) segments.push([]);
    segments.at(-1).push({ index, value });
  });
  return segments;
}
export function historySource(data, code, index, kind) {
  const record = data.degrees[code];
  if (!record || record[kind]?.[index] == null) return null;
  const source = index < 4 ? 'history-2021-2025' : `cutoffs-2026-${kind}`;
  const page = record.pages[index < 4 ? 0 : kind === 'first' ? 1 : 2];
  return page ? data.sources[source].url + '#page=' + page : null;
}

// Exact name + university + municipality only. This discovers other official
// codes for a separate comparison; it never claims equivalence or joins years.
export function historicalAlternatives(data, degree) {
  const normalize = (text) =>
    String(text || '')
      .normalize('NFC')
      .replace(/\s+/g, ' ')
      .trim()
      .toLocaleLowerCase('ca');
  const suffix = degree.campus ? ` (${degree.campus})` : '';
  const name =
    suffix && degree.name.endsWith(suffix) ? degree.name.slice(0, -suffix.length) : degree.name;
  return Object.entries(data.degrees)
    .filter(
      ([code, record]) =>
        code !== degree.code &&
        record.pages[0] !== null &&
        normalize(record.name) === normalize(name) &&
        normalize(record.university) === normalize(degree.university) &&
        normalize(record.town) === normalize(degree.campus),
    )
    .map(([code, record]) => ({
      code,
      name: record.name,
      university: record.university,
      campus: record.town,
    }));
}

// A single static fetch per page session, shared by degree detail and comparisons.
// Failure resets the promise so an explicit retry works. No D1/R2 or persistent queue.
export function createPauHistoryLoader(fetchData = globalThis.fetch, timeoutMs = 20000) {
  let cached;
  return () => {
    if (!cached) {
      const controller = new AbortController();
      const deadline = setTimeout(() => controller.abort(), timeoutMs);
      cached = Promise.resolve()
        .then(() =>
          fetchData('/data/pau-history.json', { signal: controller.signal, cache: 'no-cache' }),
        )
        .then(async (response) => {
          if (!response.ok) throw new Error('Històric no disponible.');
          return validatePauHistory(await response.json());
        })
        .catch((error) => {
          cached = null;
          throw error;
        })
        .finally(() => clearTimeout(deadline));
    }
    return cached;
  };
}
