import React, { useState } from 'react';
import { ImageSquare } from '@phosphor-icons/react';

// A refused/temporarily unavailable attachment must not leave a broken-image icon.
export default function VerifiedImage({ src, alt, className = '', ...props }) {
  const [failedSource, setFailedSource] = useState(null);
  if (failedSource === src)
    return (
      <span
        className={`${className} image-unavailable`}
        role="img"
        aria-label="Imatge no disponible. Pot estar pendent de comprovació o no haver superat el filtre."
        title="Imatge no disponible. Torna-ho a provar més tard o tria una altra imatge."
      >
        <ImageSquare size={22} aria-hidden="true" />
        <span>Imatge no disponible</span>
      </span>
    );
  return (
    <img
      {...props}
      src={src}
      alt={alt}
      className={className}
      onError={() => setFailedSource(src)}
    />
  );
}
