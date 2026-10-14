import React, { useRef, useState } from 'react';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  SpeakerHigh,
  SpeakerSlash,
  MagnifyingGlass,
  X,
  Check,
  ArrowRight,
  SpinnerGap,
  VinylRecord,
} from '@phosphor-icons/react';
import { useApp } from '../context';
import { useTimer } from '../timer';
import { Button, IconButton, Modal } from '../ui';
import { ReferenceArt } from '../art';
import { LOFI_TRACKS } from '../audio';
import { MUSIC_STYLES } from '../../shared/music-catalog';
import RecordArt from './RecordArt';

export default function MusicPlayer() {
  const { savePreferences } = useApp();
  const {
    audioType,
    audioState,
    playing,
    loading,
    volume,
    setVolume,
    toggleMusic,
    selectTrack,
    skipTrack,
  } = useTimer();
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [musicStyle, setMusicStyle] = useState('all');
  const [query, setQuery] = useState('');
  const currentTrack = LOFI_TRACKS.find((track) => track.id === audioType) || LOFI_TRACKS[0];
  const currentStyle = MUSIC_STYLES.find((style) => style.id === currentTrack.genre);
  const selectedStyle = MUSIC_STYLES.find((style) => style.id === musicStyle);
  const normalize = (text) =>
    text
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase();
  const search = normalize(query.trim());
  const visibleTracks = LOFI_TRACKS.filter(
    (track) =>
      (musicStyle === 'all' || track.genre === musicStyle) &&
      normalize(
        `${track.title} ${track.subtitle} ${track.author} ${MUSIC_STYLES.find((style) => style.id === track.genre)?.label || ''}`,
      ).includes(search),
  );
  const requestedVolume = useRef(volume);
  const persistVolume = (event) => {
    const value = Number(event.currentTarget.value);
    if (requestedVolume.current === value) return;
    requestedVolume.current = value;
    savePreferences({ volume: value }).catch(() => {
      // A failed save can be tried again on blur, without duplicating successes.
      if (requestedVolume.current === value) requestedVolume.current = null;
    });
  };
  return (
    <section className="panel sound-panel record-player">
      <div className="section-heading">
        <h2>
          <ReferenceArt name="music" size={29} />
          Música per estudiar
        </h2>
      </div>
      <div className="record-now-playing">
        <RecordArt track={currentTrack} spinning={playing} className="player-record" />
        <div className="record-now-info">
          <span className="record-status" role="status">
            {loading
              ? 'Carregant…'
              : playing
                ? 'Sonant ara'
                : audioState === 'paused'
                  ? 'En pausa'
                  : 'El teu disc'}
          </span>
          <h3>{currentTrack.title}</h3>
          <p>
            {currentStyle.label} <span aria-hidden="true">·</span> {currentTrack.duration}
          </p>
          {currentTrack.genre === 'focus' && (
            <p className="record-texture">{currentTrack.subtitle}</p>
          )}
        </div>
      </div>
      <div className="record-transport" aria-label="Controls de música">
        <IconButton label="Cançó anterior" onClick={() => skipTrack(-1)}>
          <SkipBack size={21} weight="fill" />
        </IconButton>
        <Button
          className="record-play-button"
          onClick={toggleMusic}
          aria-pressed={playing || loading}
        >
          {loading ? (
            <SpinnerGap className="spin" size={21} />
          ) : playing ? (
            <Pause size={21} weight="fill" />
          ) : (
            <Play size={21} weight="fill" />
          )}
          {loading
            ? 'Aturar la càrrega'
            : playing
              ? 'Pausar música'
              : audioState === 'paused'
                ? 'Reprendre'
                : 'Reproduir'}
        </Button>
        <IconButton label="Cançó següent" onClick={() => skipTrack(1)}>
          <SkipForward size={21} weight="fill" />
        </IconButton>
      </div>
      <label className="record-volume">
        {volume === 0 ? <SpeakerSlash size={21} /> : <SpeakerHigh size={21} />}
        <input
          type="range"
          min="0"
          max="1"
          step=".01"
          value={volume}
          style={{ '--volume': `${volume * 100}%` }}
          aria-label="Volum de l’àudio"
          aria-valuetext={`${Math.round(volume * 100)} %`}
          onChange={(event) => setVolume(Number(event.target.value))}
          onPointerUp={persistVolume}
          onKeyUp={persistVolume}
          onBlur={persistVolume}
        />
        <span aria-hidden="true">{Math.round(volume * 100)} %</span>
      </label>
      <button
        type="button"
        className="record-library-button"
        aria-haspopup="dialog"
        aria-expanded={libraryOpen}
        onClick={() => setLibraryOpen(true)}
      >
        <VinylRecord size={26} weight="duotone" />
        <span>
          <strong>Tria un disc</strong>
          <small>
            {LOFI_TRACKS.length} peces · {MUSIC_STYLES.length} estils
          </small>
        </span>
        <ArrowRight size={20} />
      </button>
      <p className="record-sequence">La següent peça del mateix estil sona automàticament.</p>
      <p className="music-attribution record-credit">
        {currentTrack.author} ·{' '}
        <a href={currentTrack.licenseUrl} target="_blank" rel="noreferrer">
          {currentTrack.license}
        </a>
        {currentTrack.source && (
          <>
            {' '}
            ·{' '}
            <a href={currentTrack.source} target="_blank" rel="noreferrer">
              Font
            </a>
          </>
        )}
        {' · '}
        <a href="/audio/CREDITS.txt" target="_blank" rel="noreferrer">
          Crèdits
        </a>
      </p>
      {libraryOpen && (
        <Modal
          open
          onClose={() => setLibraryOpen(false)}
          title="La teva col·lecció de discos"
          description="Tria un disc per escoltar-lo. Pots canviar de secció i controlar la música des de la barra superior."
          wide
        >
          <div className="record-library">
            <div className="record-search">
              <MagnifyingGlass size={21} aria-hidden="true" />
              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Cerca un disc o un artista"
                aria-label="Cerca un disc o un artista"
              />
              {query && (
                <IconButton label="Esborrar la cerca" onClick={() => setQuery('')}>
                  <X size={18} />
                </IconButton>
              )}
            </div>
            <div className="music-style-filters" role="group" aria-label="Filtrar música per estil">
              {[{ id: 'all', label: 'Tot' }, ...MUSIC_STYLES].map((style) => (
                <button
                  key={style.id}
                  type="button"
                  aria-pressed={musicStyle === style.id}
                  onClick={() => setMusicStyle(style.id)}
                >
                  {style.label}
                </button>
              ))}
            </div>
            <p className="record-results" role="status">
              {visibleTracks.length} {visibleTracks.length === 1 ? 'disc' : 'discos'}
            </p>
            {selectedStyle?.description && (
              <p className="record-style-description">{selectedStyle.description}</p>
            )}
            <div className="record-grid" role="group" aria-label="Discos disponibles">
              {visibleTracks.map((track) => {
                const selected = audioType === track.id;
                const style = MUSIC_STYLES.find((item) => item.id === track.genre);
                return (
                  <button
                    key={track.id}
                    type="button"
                    className="record-option"
                    aria-pressed={selected}
                    aria-label={`Escoltar ${track.title}`}
                    onClick={() => {
                      selectTrack(track.id);
                      setLibraryOpen(false);
                    }}
                  >
                    <span className="record-option-art">
                      <RecordArt track={track} spinning={selected && playing} />
                      <span className="record-option-action">
                        {selected ? (
                          <Check size={17} weight="bold" />
                        ) : (
                          <Play size={16} weight="fill" />
                        )}
                      </span>
                    </span>
                    <strong>{track.title}</strong>
                    {track.genre === 'focus' && (
                      <span className="record-option-texture">{track.subtitle}</span>
                    )}
                    <span className="record-option-meta">
                      {style.label} · {track.duration}
                    </span>
                    <span className="record-option-artist">
                      {selected ? (playing ? 'Sonant ara' : 'Seleccionat') : track.author}
                    </span>
                  </button>
                );
              })}
            </div>
            {!visibleTracks.length && (
              <div className="record-empty">
                <VinylRecord size={40} weight="duotone" aria-hidden="true" />
                <p>No hem trobat cap disc.</p>
                <Button
                  onClick={() => {
                    setQuery('');
                    setMusicStyle('all');
                  }}
                >
                  Veure tots els discos
                </Button>
              </div>
            )}
          </div>
        </Modal>
      )}
    </section>
  );
}
