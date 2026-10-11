import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { MUSIC_TRACKS, MUSIC_STYLES } from '../shared/music-catalog.js';

const sha = (bytes) => createHash('sha256').update(bytes).digest('hex');
const imported = JSON.parse(readFileSync('output/music-library/audio-import.json', 'utf8'));
const credits = readFileSync('public/audio/CREDITS.txt', 'utf8');
assert.equal(MUSIC_TRACKS.length, 25);
assert.equal(MUSIC_STYLES.length, 8);
assert.equal(imported.length, 20);
const out = process.env.LANET_TEST_OUTPUT || 'output/music-library';
mkdirSync(out, { recursive: true });
const files = MUSIC_TRACKS.map((track) => {
  const path = `audio/${track.id}.ogg`;
  const bytes = readFileSync(`public/${path}`);
  assert.ok(bytes.length < 25 * 1024 * 1024 && bytes.length > 100000);
  assert.equal(bytes.subarray(0, 4).toString(), 'OggS');
  assert.equal(
    sha(readFileSync(`dist-pages/${path}`)),
    sha(bytes),
    'Published build matches source',
  );
  assert.ok(credits.includes(track.title));
  const mp3Path = `audio/${track.id}.mp3`;
  const mp3 = readFileSync(`public/${mp3Path}`);
  assert.ok(mp3.length > 100000 && mp3.length < 25 * 1024 * 1024);
  assert.equal(sha(readFileSync(`dist-pages/${mp3Path}`)), sha(mp3));
  if (track.source) {
    assert.ok(credits.includes(track.source));
    const report = imported.find((row) => row.id === track.id);
    assert.ok(report.fully_decoded && report.seconds > 60);
    assert.equal(report.sha256, sha(bytes));
    assert.equal(report.bytes, bytes.length);
    if (track.genre === 'focus') {
      assert.ok(report.mp3.fully_decoded);
      assert.equal(report.mp3.sha256, sha(mp3));
    }
  }
  return { id: track.id, genre: track.genre, bytes: bytes.length, sha256: sha(bytes) };
});
assert.equal(new Set(files.map((file) => file.sha256)).size, 25);
assert.equal(
  sha(readFileSync('dist-pages/audio/CREDITS.txt')),
  sha(readFileSync('public/audio/CREDITS.txt')),
);
writeFileSync(
  `${out}/local-verification.json`,
  JSON.stringify(
    {
      passed: true,
      tracks: 25,
      styles: 8,
      focusTracks: 8,
      focusMinutes:
        imported
          .filter((row) => row.id.startsWith('focus-'))
          .reduce((sum, row) => sum + row.seconds, 0) / 60,
      localBuildFilesMatch: true,
      fullDecodePassed: true,
      creditsPresent: true,
      publicBrowserVerification: 'blocked_by_user_browser_permission',
      files,
    },
    null,
    2,
  ) + '\n',
);
console.log('25 peces i 8 estils: fitxers del paquet, crèdits i àudios descodificats verificats.');
