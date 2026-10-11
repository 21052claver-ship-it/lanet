import React, { useEffect, useRef, useState } from 'react';
import { DownloadSimple, VideoCamera } from '@phosphor-icons/react';
export default function VideoAttachment({ file }) {
  const ref = useRef(null),
    [error, setError] = useState(false);
  useEffect(() => {
    const video = ref.current;
    if (video) {
      video.src = '/api/files/' + file.id;
      video.load();
    }
    return () => {
      if (video) {
        video.pause();
        video.removeAttribute('src');
        video.load();
      }
    };
  }, [file.id]);
  return (
    <figure className="reader-video">
      <video
        ref={ref}
        src={'/api/files/' + file.id}
        controls
        playsInline
        preload="metadata"
        onError={() => setError(true)}
        aria-label={file.name}
      />
      <figcaption>
        <span>
          <VideoCamera size={20} />
          {file.name}
        </span>
        <a className="button" href={'/api/files/' + file.id + '?download=1'}>
          <DownloadSimple size={17} />
          Descarregar vídeo
        </a>
      </figcaption>
      {error && (
        <p className="form-error">
          Aquest navegador no pot reproduir la codificació del vídeo. Pots descarregar-lo per
          obrir-lo al teu dispositiu.
        </p>
      )}
    </figure>
  );
}
