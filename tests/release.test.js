import test from 'node:test';
import assert from 'node:assert/strict';
import { releaseNotes, validateRelease } from '../scripts/release-utils.mjs';
const sha = 'a'.repeat(40);
const valid = {
  login: '21052claver-ship-it',
  remote: 'https://github.com/21052claver-ship-it/lanet.git',
  branch: 'main',
  dirty: '',
  localSha: sha,
  remoteSha: sha,
  version: '0.2.0',
  lockVersion: '0.2.0',
  run: { headSha: sha, status: 'completed', conclusion: 'success' },
};
test('Release: exigeix compte, main, codi remot exacte, arbre net, lock i CI verda', () => {
  assert.doesNotThrow(() => validateRelease(valid));
  for (const change of [
    { login: 'other' },
    { remote: 'https://github.com/other/lanet.git' },
    { branch: 'feature' },
    { dirty: ' M src/App.jsx' },
    { remoteSha: 'b'.repeat(40) },
    { lockVersion: '0.1.0' },
    { run: { ...valid.run, headSha: 'b'.repeat(40) } },
    { run: { ...valid.run, status: 'in_progress' } },
    { run: { ...valid.run, conclusion: 'failure' } },
  ])
    assert.throws(() => validateRelease({ ...valid, ...change }));
});
test('Release: notes de la versió exacta i rebuig de notes absents/versió amb arguments', () => {
  const log =
    '# Versions\n\n## [0.2.0] - 2026-10-12\n\n### Millores\n- Menú mòbil\n\n## [0.1.0] - 2026-10-11\n\n- Base';
  assert.match(releaseNotes(log, '0.2.0'), /Menú mòbil/);
  assert.ok(!releaseNotes(log, '0.2.0').includes('Base'));
  assert.throws(() => releaseNotes(log, '0.3.0'));
  assert.throws(() => releaseNotes(log, '0.2.0 --force'));
});
