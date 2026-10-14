import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import {
  HISTORY_YEARS,
  validatePauHistory,
  historicalStats,
  historySegments,
  historySource,
  historicalAlternatives,
  createPauHistoryLoader,
} from '../shared/pau-history.js';
const history = JSON.parse(readFileSync('public/data/pau-history.json', 'utf8'));
const catalogue = JSON.parse(readFileSync('public/data/pau.json', 'utf8'));

test('History: official source hashes, full audited coverage and five comparable June years', () => {
  assert.equal(validatePauHistory(history), history);
  assert.deepEqual(history.years, [2022, 2023, 2024, 2025, 2026]);
  assert.equal(history.route, 'PAU/CFGS');
  const audit = JSON.parse(readFileSync('tests/fixtures/pau/history-audit.json', 'utf8'));
  assert.equal(audit.sourceRows, 561);
  assert.equal(audit.allTextCodesMatched, true);
  assert.equal(audit.matchedCurrentHistoricalCodes, 526);
  assert.equal(audit.newCurrentCodes.length, 34);
  assert.equal(Object.keys(history.degrees).length, 595);
  for (const [key, source] of Object.entries(history.sources)) {
    assert.equal(new URL(source.url).hostname, 'universitats.gencat.cat');
    assert.equal(
      createHash('sha256')
        .update(readFileSync(`tests/fixtures/pau/sources/${key}.pdf`))
        .digest('hex'),
      source.sha256,
    );
  }
});

test('History: known official rows keep first/final separate and current catalogue exactly intact', () => {
  assert.deepEqual(history.degrees['11033'].first, [9.498, 9.314, 9.636, 9.348, 9.34]);
  assert.deepEqual(history.degrees['11033'].latest, [9.246, 8.972, 9.54, 9.194, 9.228]);
  for (const degree of catalogue.degrees) {
    assert.equal(history.degrees[degree.code].first[4], degree.firstCutoff ?? null);
    assert.equal(history.degrees[degree.code].latest[4], degree.cutoff ?? null);
  }
});

test('History: absent years and rounds stay null, new codes get no invented predecessors', () => {
  assert.deepEqual(history.degrees['11119'].first.slice(0, 4), [null, null, null, null]);
  assert.equal(history.degrees['11102'].latest[4], null);
  assert.equal(history.degrees['11102'].first[4], 5);
  assert.equal(historySource(history, '11102', 4, 'latest'), null);
  assert.equal(historicalStats(history.degrees['11119'].first).count, 1);
  assert.equal(historicalStats(history.degrees['11119'].first).delta, null);
});

test('History: averages use decimal thousandths and only available observations', () => {
  assert.deepEqual(historicalStats([null, null, null, null, null]), {
    count: 0,
    mean: null,
    min: null,
    max: null,
    delta: null,
  });
  assert.deepEqual(historicalStats([5, 6, null, 7, 8]), {
    count: 4,
    mean: 6.5,
    min: 5,
    max: 8,
    delta: 3,
  });
  assert.equal(historicalStats([9.498, 9.314, 9.636, 9.348, 9.34]).mean, 9.427);
  assert.equal(historicalStats([9.498, 9.314, 9.636, 9.348, 9.34]).delta, -0.158);
  assert.equal(historicalStats([5, 5.001, null, null, null]).mean, 5.001);
});

test('History: a missing year breaks the line instead of interpolating over it', () => {
  assert.deepEqual(historySegments([5, 6, null, 7, 8]), [
    [
      { index: 0, value: 5 },
      { index: 1, value: 6 },
    ],
    [
      { index: 3, value: 7 },
      { index: 4, value: 8 },
    ],
  ]);
  assert.deepEqual(historySegments([null, null, null, null, 9]), [[{ index: 4, value: 9 }]]);
});

test('History: page links correspond to the right year and assignment', () => {
  assert.equal(
    historySource(history, '11033', 0, 'first'),
    history.sources['history-2021-2025'].url + '#page=1',
  );
  assert.equal(
    historySource(history, '11033', 4, 'latest'),
    history.sources['cutoffs-2026-latest'].url + '#page=1',
  );
  assert.equal(
    historySource(history, '11119', 4, 'first'),
    history.sources['cutoffs-2026-first'].url + '#page=6',
  );
});

test('History: other codes require exact title/university/town and remain separate series', () => {
  const degree = catalogue.degrees.find((degree) => degree.code === '11119');
  assert.ok(historicalAlternatives(history, degree).some((item) => item.code === '11020'));
  assert.deepEqual(historicalAlternatives(history, { ...degree, university: 'UPC' }), []);
  assert.deepEqual(historicalAlternatives(history, { ...degree, campus: 'Girona' }), []);
  assert.deepEqual(
    historicalAlternatives(history, { ...degree, name: 'Física i Matemàtiques (Barcelona)' }),
    [],
  );
  assert.deepEqual(history.degrees['11119'].first.slice(0, 4), [null, null, null, null]);
});

test('History: loader shares one request, is cached, and makes explicit retry after failure possible', async () => {
  let calls = 0,
    fail = true;
  const load = createPauHistoryLoader(async (url, options) => {
    assert.equal(url, '/data/pau-history.json');
    assert.equal(options.cache, 'no-cache');
    calls++;
    return { ok: !fail, json: async () => structuredClone(history) };
  });
  const first = load();
  assert.equal(load(), first);
  await assert.rejects(first, /disponible/);
  fail = false;
  assert.equal((await load()).years.length, 5);
  await Promise.all([load(), load()]);
  assert.equal(calls, 2);
});

test('History: public HTTP headers revalidate the provisional catalogue after publication', () => {
  assert.match(
    readFileSync('public/_headers', 'utf8'),
    /\/data\/pau-history\.json\s+Cache-Control: public, max-age=0, must-revalidate/,
  );
});

test('History: invalid source/data are rejected instead of silently misplotting', () => {
  for (const edit of [
    (data) => data.years.splice(0, 1),
    (data) => {
      data.degrees['11033'].first[0] = 0;
    },
    (data) => {
      data.sources['history-2021-2025'].url = 'https://evil.example/data.pdf';
    },
    (data) => {
      data.degrees['11033'].pages[0] = 99;
    },
    (data) => {
      data.degrees['11033'].first[0] = '9.498';
    },
  ]) {
    const bad = structuredClone(history);
    edit(bad);
    assert.throws(() => validatePauHistory(bad));
  }
});

test('History: timeout aborts a stalled request and allows a later retry', async () => {
  let attempts = 0;
  const load = createPauHistoryLoader((url, { signal }) => {
    attempts++;
    if (attempts > 1) return Promise.resolve({ ok: true, json: async () => history });
    return new Promise((resolve, reject) =>
      signal.addEventListener('abort', () => reject(new Error('aborted'))),
    );
  }, 10);
  await assert.rejects(load(), /aborted/);
  assert.equal((await load()).years.length, 5);
});
