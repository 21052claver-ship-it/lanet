import React from 'react';
import rig from '../baker-rig.json';

export function BakerRigDefs({ id }) {
  return (
    <defs>
      <filter id={`${id}-clean`} colorInterpolationFilters="sRGB">
        <feComponentTransfer>
          <feFuncA type="linear" slope="1.18" intercept="-0.14" />
        </feComponentTransfer>
      </filter>
      <image
        id={id}
        href={rig.src}
        width={rig.width}
        height={rig.height}
        filter={`url(#${id}-clean)`}
      />
    </defs>
  );
}
export function BakerPart({ part, atlas, x, y, width, height, className }) {
  return (
    <svg
      x={x}
      y={y}
      width={width}
      height={height}
      viewBox={rig.parts[part].join(' ')}
      data-baker-part={part}
      className={className}
      overflow="hidden"
    >
      <use href={`#${atlas}`} />
    </svg>
  );
}
// Shared cake artwork for the counter and the balance flight. No character rig.
export default function CounterCake({ atlas, visible }) {
  return (
    <g className={`bakery-counter-cake ${visible ? 'is-visible' : ''}`}>
      <BakerPart part="cake" atlas={atlas} x={794} y={554} width={124} height={94} />
      <circle className="baker-cake-origin" cx="856" cy="601" r="1" opacity="0" />
    </g>
  );
}
