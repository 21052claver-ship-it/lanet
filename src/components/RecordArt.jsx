import React from 'react';
import {
  SunHorizon,
  Books,
  Coffee,
  Moon,
  Leaf,
  PianoKeys,
  MusicNotes,
  Guitar,
  Waveform,
  Lightning,
  Planet,
} from '@phosphor-icons/react';

const TRACK_ICONS = { window: SunHorizon, library: Books, cafe: Coffee, night: Moon, garden: Leaf };
const STYLE_ICONS = {
  lofi: Coffee,
  piano: PianoKeys,
  jazz: MusicNotes,
  acoustic: Guitar,
  ambient: Waveform,
  electronic: Lightning,
  classical: PianoKeys,
  focus: Planet,
};

export default function RecordArt({ track, spinning = false, className = '' }) {
  const Icon = TRACK_ICONS[track.id] || STYLE_ICONS[track.genre] || MusicNotes;
  return (
    <span
      className={`vinyl-record ${className}`}
      style={{ '--record-label': track.color }}
      data-playing={spinning}
      aria-hidden="true"
    >
      <span className="vinyl-surface">
        <span className="vinyl-label">
          <Icon weight="duotone" />
        </span>
      </span>
    </span>
  );
}
