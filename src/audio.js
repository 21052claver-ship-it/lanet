import { MUSIC_TRACKS, adjacentTrackId } from '../shared/music-catalog.js';

export const LOFI_TRACKS = MUSIC_TRACKS.map((track) => ({
  ...track,
  src: `/audio/${track.id}.mp3`,
  oggSrc: `/audio/${track.id}.ogg`,
}));

// Some native WebKit decoders advance after a seek while play() stays pending.
// Observe real playback progress, and release every observer on pause/stop.
function playbackProgress(element) {
  let position = element.currentTime;
  let finish;
  const promise = new Promise((resolve) => (finish = resolve));
  const reset = () => (position = element.currentTime);
  const clear = () => {
    element.removeEventListener('timeupdate', advance);
    element.removeEventListener('seeking', reset);
    element.removeEventListener('seeked', reset);
  };
  const advance = () => {
    if (
      !element.paused &&
      !element.seeking &&
      element.readyState >= 2 &&
      element.currentTime > position + 0.05
    ) {
      clear();
      finish(true);
    }
  };
  element.addEventListener('timeupdate', advance);
  element.addEventListener('seeking', reset);
  element.addEventListener('seeked', reset);
  return {
    promise,
    clear,
    cancel: () => {
      clear();
      finish(false);
    },
  };
}

export class StudyAudio {
  constructor(
    createAudio = (src) => {
      const element = new Audio(src);
      element.hidden = true;
      element.dataset.studyAudio = '';
      document.body.append(element);
      return element;
    },
  ) {
    this.createAudio = createAudio;
    this.element = null;
    this.generation = 0;
    this.request = 0;
    this.trackId = null;
    this.state = 'idle';
    this.onError = null;
    this.onTrackChange = null;
    this.onStateChange = null;
    this.cancelStart = null;
  }
  async play(type, volume = 0.3) {
    const track = LOFI_TRACKS.find((item) => item.id === type) || LOFI_TRACKS[0];
    if (this.element && this.trackId === track.id && !this.element.ended) {
      if (this.state === 'playing') {
        this.volume(volume);
        return true;
      }
      return this.start(this.element, volume);
    }
    this.stop();
    const generation = this.generation;
    const element = this.createAudio(track.src);
    if (
      element.canPlayType &&
      !element.canPlayType('audio/mpeg') &&
      element.canPlayType('audio/ogg; codecs="vorbis"')
    )
      element.src = track.oggSrc;
    this.element = element;
    this.trackId = track.id;
    element.loop = false;
    element.preload = 'auto';
    this.errorHandler = () => {
      if (generation !== this.generation) return;
      // During loading, play() rejects and owns recovery/cleanup.
      if (this.state === 'loading') return;
      if (
        [3, 4].includes(element.error?.code) &&
        element.src.endsWith('.mp3') &&
        element.canPlayType?.('audio/ogg; codecs="vorbis"')
      ) {
        element.src = track.oggSrc;
        this.start(element, element.volume).catch((error) => this.onError?.(error));
        return;
      }
      this.stop();
      this.onError?.(new Error('No s’ha pogut carregar la música. Torna-ho a provar.'));
    };
    element.addEventListener('error', this.errorHandler);
    this.endHandler = () => {
      if (generation !== this.generation || this.state !== 'playing') return;
      this.play(adjacentTrackId(track.id), element.volume).catch((error) => this.onError?.(error));
    };
    element.addEventListener('ended', this.endHandler);
    this.onTrackChange?.(track.id);
    return this.start(element, volume);
  }
  async start(element, volume) {
    this.cancelStart?.();
    const generation = this.generation;
    const request = ++this.request;
    element.volume = this.safeVolume(volume);
    this.setState('loading');
    const progress = playbackProgress(element);
    this.cancelStart = progress.cancel;
    try {
      const played = await Promise.race([element.play().then(() => true), progress.promise]);
      const started =
        played &&
        generation === this.generation &&
        request === this.request &&
        this.element === element;
      if (started) this.setState('playing');
      return started;
    } catch (error) {
      if (generation !== this.generation || request !== this.request) return false;
      const track = LOFI_TRACKS.find((item) => item.id === this.trackId);
      if (
        error.name === 'NotSupportedError' &&
        track &&
        element.src.endsWith('.mp3') &&
        element.canPlayType?.('audio/ogg; codecs="vorbis"')
      ) {
        element.src = track.oggSrc;
        return this.start(element, volume);
      }
      this.stop();
      throw new Error(
        error.name === 'NotAllowedError'
          ? 'Prem Reproduir per permetre la reproducció de música.'
          : 'No s’ha pogut reproduir la música. Torna-ho a provar.',
      );
    } finally {
      progress.clear();
      if (this.cancelStart === progress.cancel) this.cancelStart = null;
    }
  }
  setState(state) {
    this.state = state;
    this.onStateChange?.(state);
  }
  pause() {
    this.request++;
    this.cancelStart?.();
    if (!this.element) return;
    this.element.pause();
    this.setState('paused');
  }
  safeVolume(value) {
    return Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : 0.3;
  }
  volume(value) {
    if (this.element) this.element.volume = this.safeVolume(value);
  }
  stop() {
    this.generation++;
    this.request++;
    this.cancelStart?.();
    if (this.element) {
      this.element.removeEventListener('error', this.errorHandler);
      this.element.removeEventListener('ended', this.endHandler);
      this.element.pause();
      this.element.removeAttribute('src');
      this.element.load();
      this.element.remove?.();
    }
    this.element = null;
    this.trackId = null;
    this.setState('idle');
  }
}
