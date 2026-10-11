import { useEffect, useRef, useState } from 'react';
import { StudyAudio, LOFI_TRACKS } from './audio';
import { adjacentTrackId } from '../shared/music-catalog';

// One player survives page navigation. Its state is shared by the page and the header.
export function useStudyAudio({ preferences, savePreferences, notify }) {
  const audio = useRef(null);
  if (!audio.current) audio.current = new StudyAudio();
  const [audioType, setAudioType] = useState(() =>
    LOFI_TRACKS.some((track) => track.id === preferences?.lofi) ? preferences.lofi : 'window',
  );
  const [audioState, setAudioState] = useState('idle');
  const [volume, updateVolume] = useState(() =>
    audio.current.safeVolume(preferences?.volume ?? 0.3),
  );
  const selection = useRef(audioType);
  const gain = useRef(volume);
  useEffect(() => {
    const player = audio.current;
    player.onStateChange = setAudioState;
    player.onTrackChange = (id) => {
      selection.current = id;
      setAudioType(id);
    };
    player.onError = (error) => notify(error.message, 'error');
    return () => {
      player.onStateChange = null;
      player.onTrackChange = null;
      player.onError = null;
      player.stop();
    };
  }, [notify]);
  const play = (id) =>
    audio.current.play(id, gain.current).catch((error) => notify(error.message, 'error'));
  const toggleMusic = () => {
    if (['playing', 'loading'].includes(audio.current.state)) audio.current.pause();
    else play(selection.current);
  };
  const selectTrack = (id, { autoplay = true } = {}) => {
    if (!LOFI_TRACKS.some((track) => track.id === id)) return;
    const changed = selection.current !== id;
    selection.current = id;
    setAudioType(id);
    if (changed) savePreferences({ lofi: id }).catch(() => {});
    if (autoplay) play(id);
    else if (changed) audio.current.stop();
  };
  const skipTrack = (direction) =>
    selectTrack(adjacentTrackId(selection.current, direction), {
      autoplay: ['playing', 'loading'].includes(audio.current.state),
    });
  const setVolume = (value) => {
    gain.current = audio.current.safeVolume(value);
    updateVolume(gain.current);
    audio.current.volume(gain.current);
  };
  return {
    audioType,
    audioState,
    playing: audioState === 'playing',
    loading: audioState === 'loading',
    volume,
    setVolume,
    toggleMusic,
    selectTrack,
    skipTrack,
  };
}
