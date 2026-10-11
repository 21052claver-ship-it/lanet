import React, { useId, useState } from 'react';
import shell from '../design/pantalles-v1/01-horari.png';
import community from '../design/pantalles-v2/comunitat-propostes-sidebar.png';
import pluses from '../design/pantalles-v2/plusos-cards.png';
import notes from '../design/pantalles-v2/apunts-formats.png';
import study from '../design/pantalles-v1/05-estudi.png';
import bakery from '../design/pantalles-v1/07-pastisseria.png';
import transparentArt from './transparent-art.json';

// Legacy viewports keep the approved artwork intact. Selected icons use separate
// transparent assets; labels, dates, balances and actions remain live React UI.
const sheets = {
  shell: [shell, 1586, 992],
  community: [community, 1584, 993],
  pluses: [pluses, 1585, 992],
  notes: [notes, 1586, 992],
  study: [study, 1586, 992],
  bakery: [bakery, 1586, 992],
};
export const ART = {
  brand: ['shell', 23, 25, 178, 61],
  schedule: ['community', 23, 147, 46, 48],
  notes: ['shell', 23, 222, 45, 49],
  pluses: ['shell', 20, 298, 49, 50],
  grades: ['shell', 24, 368, 44, 52],
  study: ['shell', 17, 442, 55, 47],
  community: ['shell', 17, 516, 55, 50],
  bakery: ['shell', 17, 589, 54, 56],
  gear: ['shell', 23, 892, 34, 37],
  cake: ['shell', 1177, 31, 43, 48],
  bell: ['shell', 1296, 37, 31, 37],
  grid: ['shell', 267, 39, 28, 30],
  bulb: ['community', 27, 738, 37, 48],
  megaphone: ['community', 312, 408, 58, 61],
  document: ['community', 316, 584, 50, 52],
  notebook: ['community', 304, 799, 125, 112],
  'focus-cake': ['study', 309, 265, 84, 84],
  music: ['study', 1025, 609, 34, 40],
  rain: ['study', 1045, 672, 108, 87],
  telescope: ['pluses', 435, 449, 133, 125],
  flask: ['pluses', 876, 450, 91, 116],
  books: ['pluses', 1314, 461, 118, 102],
  'cake-large': ['bakery', 1224, 227, 84, 82],
  'bakery-exterior': ['bakery', 266, 240, 889, 700],
  'bakery-mobile': ['bakery', 266, 240, 889, 580],
  'avatar-julia': ['community', 1342, 23, 62, 62],
  'avatar-pau': ['notes', 507, 529, 37, 38],
  'avatar-aina': ['pluses', 297, 826, 43, 44],
  'avatar-mariona': ['pluses', 730, 827, 43, 44],
  'avatar-arnau': ['pluses', 1160, 826, 45, 45],
};

const transparentAliases = { bakery: 'cake', 'cake-large': 'cake' };

export function ReferenceArt({
  name,
  size = 40,
  originalSize = false,
  className = '',
  style,
  ...props
}) {
  const maskId = useId();
  if (name === 'pau')
    return (
      <img
        src="/pau-mark.svg"
        width={size}
        height={size}
        className={`reference-art art-pau has-alpha ${className}`}
        style={style}
        alt=""
        aria-hidden="true"
        {...props}
      />
    );
  const art = ART[name];
  if (!art) return null;
  const [sheet, x, y, width, height] = art;
  const [url, sheetWidth, sheetHeight] = sheets[sheet];
  const alphaArt = transparentArt[transparentAliases[name] || name];
  const renderedSize = originalSize ? width : size;
  return (
    <svg
      className={`reference-art art-${name} ${alphaArt ? 'has-alpha' : ''} ${className}`}
      viewBox={alphaArt ? alphaArt.viewBox.join(' ') : `${x} ${y} ${width} ${height}`}
      width={renderedSize}
      height={(renderedSize * height) / width}
      aria-hidden="true"
      focusable="false"
      style={style}
      {...props}
    >
      {name === 'bakery-exterior' && (
        <>
          <defs>
            <mask
              id={maskId}
              maskUnits="userSpaceOnUse"
              x="0"
              y="0"
              width={sheetWidth}
              height={sheetHeight}
            >
              <rect width={sheetWidth} height={sheetHeight} fill="white" />
              <rect x="603" y="819" width="224" height="36" rx="18" fill="black" />
              <rect x="541" y="851" width="341" height="77" rx="22" fill="black" />
            </mask>
          </defs>
          <rect x={x} y={y} width={width} height={height} fill="#e9eee3" />
        </>
      )}
      <image
        href={alphaArt ? alphaArt.src : url}
        x="0"
        y="0"
        width={alphaArt ? alphaArt.width : sheetWidth}
        height={alphaArt ? alphaArt.height : sheetHeight}
        mask={name === 'bakery-exterior' ? `url(#${maskId})` : undefined}
      />
    </svg>
  );
}

export function Brand({ className = '', ...props }) {
  return (
    <a className={`brand ${className}`} {...props}>
      <ReferenceArt name="brand" size={178} />
      <span className="sr-only">La Net</span>
    </a>
  );
}

const portraits = {
  'Júlia Vidal': 'julia',
  'Pau Riera': 'pau',
  'Aina Martí': 'aina',
  'Mariona Pujol': 'mariona',
  'Arnau Costa': 'arnau',
};
export function Avatar({ name = '', tiny = false, src = '' }) {
  const portrait = portraits[name];
  const [failed, setFailed] = useState('');
  const photo = src && src !== failed;
  return (
    <span
      className={`avatar ${tiny ? 'tiny' : ''} ${photo ? 'has-photo' : portrait ? 'has-portrait' : ''}`}
      aria-hidden="true"
    >
      {photo ? (
        <img src={src} alt="" referrerPolicy="no-referrer" onError={() => setFailed(src)} />
      ) : portrait ? (
        <ReferenceArt name={`avatar-${portrait}`} size={tiny ? 34 : 58} />
      ) : (
        name
          .trim()
          .split(/\s+/)
          .map((part) => part[0])
          .slice(0, 2)
          .join('')
      )}
    </span>
  );
}

export function ActivityArt({ subjectId }) {
  const name = subjectId === 'chem' ? 'flask' : subjectId === 'phy' ? 'telescope' : 'books';
  return <ReferenceArt name={name} size={136} className="activity-art" />;
}
