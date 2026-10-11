import assert from 'node:assert/strict';
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { MUSIC_TRACKS } from '../shared/music-catalog.js';
const sha = (bytes) => createHash('sha256').update(bytes).digest('hex');
const entries = readdirSync('dist-pages', { recursive: true, withFileTypes: true }).filter((e) =>
  e.isFile(),
);
const paths = entries.map((e) => `${e.parentPath}/${e.name}`);
const forbidden = /\.(sql|sqlite|db|pem|key)$|(^|[\\/])\.env|client_secret/i;
assert.ok(
  !paths.some((p) => forbidden.test(p)),
  'Private or database file present in public build',
);
let textFiles = 0;
for (const e of entries)
  if (/\.(js|mjs|html|json|txt|map)$/.test(e.name)) {
    const data = readFileSync(`${e.parentPath}/${e.name}`, 'utf8');
    assert.ok(
      !/GOCSPX-[\w-]{15,}|-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/.test(data),
      'Credential pattern present in build',
    );
    textFiles++;
  }
const decoded = JSON.parse(readFileSync('output/security-compat/mp3-verification.json', 'utf8'));
for (const track of MUSIC_TRACKS) {
  const path = `audio/${track.id}.mp3`;
  const source = readFileSync(`public/${path}`),
    built = readFileSync(`dist-pages/${path}`);
  const r = decoded.find((d) => d.id === track.id);
  const [m, s] = track.duration.split(':').map(Number);
  assert.ok(r.fully_decoded && Math.abs(r.seconds - (m * 60 + s)) < 5);
  assert.equal(sha(source), r.sha256);
  assert.equal(sha(source), sha(built));
  assert.ok(source.length < 25 * 1024 * 1024);
}
assert.equal(
  readFileSync('dist-pages/audio/CREDITS.txt', 'utf8'),
  readFileSync('public/audio/CREDITS.txt', 'utf8'),
);
writeFileSync(
  'output/security-compat/build-verification.json',
  JSON.stringify(
    {
      passed: true,
      privateBuildFilesFound: 0,
      credentialPatternsFound: 0,
      textFilesChecked: textFiles,
      mp3Tracks: decoded.length,
      completeAudio: true,
      sourceMatchesBuild: true,
      creditsPresent: true,
      publicBrowserVerification: 'pending_browser_permission',
    },
    null,
    2,
  ) + '\n',
);
console.log(`Build privacy checks and ${MUSIC_TRACKS.length} complete MP3 assets passed.`);
