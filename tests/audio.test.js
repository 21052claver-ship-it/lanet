import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { StudyAudio, LOFI_TRACKS } from '../src/audio.js';
import { MUSIC_STYLES, adjacentTrackId } from '../shared/music-catalog.js';
import { preferencesPatch } from '../shared/preferences.js';
import { createHash } from 'node:crypto';

class MediaDouble {
  constructor(src) {
    this.src = src;
    this.currentTime = 0;
    this.ended = false;
    this.paused = true;
    this.listeners = new Map();
    this.ready = new Promise((resolve, reject) => {
      this.resolve = resolve;
      this.reject = reject;
    });
  }
  play() {
    this.paused = false;
    return this.ready;
  }
  pause() {
    this.paused = true;
  }
  load() {
    this.loaded = true;
  }
  remove() {
    this.removed = true;
  }
  removeAttribute(name) {
    if (name === 'src') this.src = '';
  }
  addEventListener(name, callback) {
    this.listeners.set(name, callback);
  }
  removeEventListener(name, callback) {
    if (this.listeners.get(name) === callback) this.listeners.delete(name);
  }
}
function engine(t) {
  const elements = [];
  const audio = new StudyAudio((src) => {
    const element = new MediaDouble(src);
    elements.push(element);
    return element;
  });
  t.after(() => audio.stop());
  return { audio, elements };
}
test('browsers without MP3 decoding use the available Vorbis track', async (t) => {
  const { audio, elements } = engine(t);
  const create = audio.createAudio;
  audio.createAudio = (src) => {
    const element = create(src);
    element.canPlayType = (type) => (type.includes('vorbis') ? 'probably' : '');
    return element;
  };
  const started = audio.play('window');
  assert.equal(elements[0].src, '/audio/window.ogg');
  elements[0].resolve();
  assert.equal(await started, true);
  audio.pause();
  assert.equal(await audio.play('window'), true);
  assert.equal(elements.length, 1);
});
test('25 local tracks across eight styles have unique audio, valid containers and licences', () => {
  assert.equal(new Set(LOFI_TRACKS.map((track) => track.id)).size, 25);
  assert.equal(MUSIC_STYLES.length, 8);
  const hashes = new Set();
  for (const track of LOFI_TRACKS) {
    const bytes = readFileSync(new URL(`../public${track.src}`, import.meta.url));
    assert.ok(bytes.subarray(0, 3).toString() === 'ID3' || bytes[0] === 255);
    const ogg = readFileSync(new URL(`../public${track.oggSrc}`, import.meta.url));
    assert.equal(ogg.subarray(0, 4).toString(), 'OggS');
    assert.ok(bytes.length > 100000 && bytes.length < 25 * 1024 * 1024);
    hashes.add(createHash('sha256').update(bytes).digest('hex'));
    assert.ok(MUSIC_STYLES.some((style) => style.id === track.genre));
    assert.ok(track.author && track.license && track.licenseUrl.startsWith('https://'));
    assert.equal(preferencesPatch({ lofi: track.id }, []).lofi, track.id);
  }
  assert.equal(hashes.size, 25);
  const credits = readFileSync(new URL('../public/audio/CREDITS.txt', import.meta.url), 'utf8');
  for (const track of LOFI_TRACKS.filter((track) => track.source)) {
    assert.ok(credits.includes(track.title));
    assert.ok(credits.includes(track.source));
  }
  assert.match(
    readFileSync(new URL('../public/audio/LICENSE.txt', import.meta.url), 'utf8'),
    /CC0/,
  );
});
test('stop cancels pending playback and releases the media source', async (t) => {
  const { audio, elements } = engine(t);
  const pending = audio.play('window');
  audio.stop();
  elements[0].resolve();
  assert.equal(await pending, false);
  assert.equal(audio.element, null);
  assert.ok(elements[0].paused && elements[0].loaded && elements[0].removed);
  assert.equal(elements[0].src, '');
});
test('rapid changes keep only the newest track active', async (t) => {
  const { audio, elements } = engine(t);
  const first = audio.play('library');
  const last = audio.play('night');
  elements[1].resolve();
  assert.equal(await last, true);
  elements[0].resolve();
  assert.equal(await first, false);
  assert.equal(audio.element, elements[1]);
  assert.ok(elements[0].removed);
  assert.equal(elements[1].loop, false);
});

test('playlists wrap within their style and previous returns the last track', () => {
  assert.equal(adjacentTrackId('jazz-forecast'), 'jazz-shuffle');
  assert.equal(adjacentTrackId('jazz-shuffle'), 'jazz-forecast');
  assert.equal(adjacentTrackId('jazz-forecast', -1), 'jazz-shuffle');
  assert.equal(adjacentTrackId('garden'), 'window');
  const focus = LOFI_TRACKS.filter((track) => track.genre === 'focus');
  assert.equal(focus.length, 8);
  assert.equal(adjacentTrackId(focus.at(-1).id), focus[0].id);
  assert.equal(adjacentTrackId(focus[0].id, -1), focus.at(-1).id);
  for (const track of focus) {
    assert.ok(focus.some((candidate) => candidate.id === adjacentTrackId(track.id)));
  }
});

test('ending a song advances once, retains volume and releases old audio', async (t) => {
  const { audio, elements } = engine(t);
  const changes = [];
  audio.onTrackChange = (id) => changes.push(id);
  const started = audio.play('jazz-forecast', 0.42);
  elements[0].resolve();
  await started;
  const ended = elements[0].listeners.get('ended');
  ended();
  assert.equal(elements[1].src, '/audio/jazz-shuffle.mp3');
  assert.equal(elements[1].volume, 0.42);
  assert.ok(elements[0].removed);
  elements[1].resolve();
  await Promise.resolve();
  assert.deepEqual(changes, ['jazz-forecast', 'jazz-shuffle']);
  ended();
  assert.equal(elements.length, 2, 'Late ended events cannot replace the new track');
});

test('stop prevents an ended event from restarting a playlist', async (t) => {
  const { audio, elements } = engine(t);
  const started = audio.play('piano-twilight');
  elements[0].resolve();
  await started;
  const ended = elements[0].listeners.get('ended');
  audio.stop();
  ended();
  assert.equal(elements.length, 1);
  assert.equal(audio.element, null);
});

test('a failed playlist transition reports the error and leaves no live media', async (t) => {
  const { audio, elements } = engine(t);
  const errors = [];
  audio.onError = (error) => errors.push(error.message);
  const started = audio.play('electronic-wallpaper');
  elements[0].resolve();
  await started;
  elements[0].listeners.get('ended')();
  elements[1].reject(new Error('offline'));
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(errors.length, 1);
  assert.equal(audio.element, null);
});
test('blocked playback cleans up, permits retry and bounds volume', async (t) => {
  const { audio, elements } = engine(t);
  const blocked = audio.play('cafe');
  elements[0].reject(Object.assign(new Error(), { name: 'NotAllowedError' }));
  await assert.rejects(blocked, /Prem Reproduir/);
  assert.equal(audio.element, null);
  const retry = audio.play('garden', 4);
  elements[1].resolve();
  assert.equal(await retry, true);
  assert.equal(elements[1].volume, 1);
  audio.volume(-3);
  assert.equal(elements[1].volume, 0);
  audio.volume(NaN);
  assert.equal(elements[1].volume, 0.3);
});
test('a late media error notifies once and stops playback', async (t) => {
  const { audio, elements } = engine(t);
  let errors = 0;
  audio.onError = () => errors++;
  const pending = audio.play('window');
  elements[0].resolve();
  await pending;
  const error = elements[0].listeners.get('error');
  error();
  error();
  assert.equal(errors, 1);
  assert.equal(audio.element, null);
});

test('pause and resume retain the same media, position and updated volume', async (t) => {
  const { audio, elements } = engine(t);
  const states = [];
  audio.onStateChange = (state) => states.push(state);
  const started = audio.play('piano-evening', 0.42);
  elements[0].resolve();
  await started;
  elements[0].currentTime = 37.5;
  audio.pause();
  assert.equal(audio.state, 'paused');
  assert.equal(elements[0].currentTime, 37.5);
  assert.equal(elements[0].src, '/audio/piano-evening.mp3');
  assert.ok(elements[0].paused && !elements[0].loaded && !elements[0].removed);
  audio.volume(0.6);
  assert.equal(await audio.play('piano-evening', 0.6), true);
  assert.equal(elements.length, 1);
  assert.equal(audio.element.currentTime, 37.5);
  assert.equal(audio.element.volume, 0.6);
  assert.equal(audio.element.paused, false);
  assert.deepEqual(states, ['idle', 'loading', 'playing', 'paused', 'loading', 'playing']);
});

test('pause during loading cancels that request without releasing the selected disc', async (t) => {
  const { audio, elements } = engine(t);
  const pending = audio.play('night');
  audio.pause();
  elements[0].resolve();
  assert.equal(await pending, false);
  assert.equal(audio.state, 'paused');
  assert.equal(audio.element, elements[0]);
  assert.ok(elements[0].paused);
  assert.equal(await audio.play('night'), true);
  assert.equal(elements.length, 1);
});

test('a fast pause/resume only commits the newest play request', async (t) => {
  const { audio, elements } = engine(t);
  const first = audio.play('garden');
  audio.pause();
  const last = audio.play('garden');
  elements[0].resolve();
  assert.equal(await first, false);
  assert.equal(await last, true);
  assert.equal(audio.state, 'playing');
  assert.equal(elements.length, 1);
});

test('switching from a paused disc releases it and starts only the selected disc', async (t) => {
  const { audio, elements } = engine(t);
  const first = audio.play('cafe');
  elements[0].resolve();
  await first;
  elements[0].currentTime = 29;
  audio.pause();
  const next = audio.play('jazz-forecast');
  elements[1].resolve();
  await next;
  assert.equal(audio.trackId, 'jazz-forecast');
  assert.equal(audio.state, 'playing');
  assert.ok(elements[0].removed && elements[0].paused);
  assert.equal(elements[1].currentTime, 0);
});

test('paused playback ignores queued ended events and resumes the same style sequence', async (t) => {
  const { audio, elements } = engine(t);
  const first = audio.play('jazz-forecast');
  elements[0].resolve();
  await first;
  const ended = elements[0].listeners.get('ended');
  audio.pause();
  ended();
  assert.equal(elements.length, 1);
  await audio.play('jazz-forecast');
  ended();
  assert.equal(elements.length, 2);
  assert.equal(elements[1].src, '/audio/jazz-shuffle.mp3');
  elements[1].resolve();
  await Promise.resolve();
  assert.equal(audio.state, 'playing');
});

test('a resume failure cleans up and permits a new gesture to retry', async (t) => {
  const { audio, elements } = engine(t);
  const first = audio.play('window');
  elements[0].resolve();
  await first;
  audio.pause();
  elements[0].play = () => Promise.reject(Object.assign(new Error(), { name: 'NotAllowedError' }));
  await assert.rejects(audio.play('window'), /Prem Reproduir/);
  assert.equal(audio.state, 'idle');
  assert.equal(audio.element, null);
  const retry = audio.play('window');
  elements[1].resolve();
  assert.equal(await retry, true);
});
