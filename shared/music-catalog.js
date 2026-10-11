import originals from './lofi-tracks.json' with { type: 'json' };
import additions from './music-tracks.json' with { type: 'json' };

export const MUSIC_STYLES = [
  { id: 'lofi', label: 'Lo-fi' },
  {
    id: 'focus',
    label: 'Focus',
    description: 'Ambient llarg, textures contínues i pols suau. Sense lletra.',
  },
  { id: 'piano', label: 'Piano' },
  { id: 'jazz', label: 'Jazz' },
  { id: 'acoustic', label: 'Acústica' },
  { id: 'ambient', label: 'Ambient' },
  { id: 'electronic', label: 'Electrònica' },
  { id: 'classical', label: 'Clàssica' },
];
export const MUSIC_TRACKS = [
  ...originals.map((track) => ({
    ...track,
    genre: 'lofi',
    author: 'La Net',
    license: 'CC0 1.0',
    licenseUrl: 'https://creativecommons.org/publicdomain/zero/1.0/',
    duration: `${Math.floor(5760 / track.bpm / 60)}:${String(Math.round(5760 / track.bpm) % 60).padStart(2, '0')}`,
  })),
  ...additions,
];
export const MUSIC_TRACK_IDS = MUSIC_TRACKS.map((track) => track.id);

export function adjacentTrackId(id, direction = 1) {
  const current = MUSIC_TRACKS.find((track) => track.id === id) || MUSIC_TRACKS[0];
  const playlist = MUSIC_TRACKS.filter((track) => track.genre === current.genre);
  const index = playlist.findIndex((track) => track.id === current.id);
  return playlist[(index + (direction < 0 ? -1 : 1) + playlist.length) % playlist.length].id;
}
