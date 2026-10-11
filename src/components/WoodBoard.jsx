import VerifiedImage from './VerifiedImage';
import React, { useEffect, useRef } from 'react';
import { Megaphone, PencilSimple } from '@phosphor-icons/react';
import { useApp } from '../context';
import { bannerValue } from '../../shared/domain';
import { Button, RichText } from '../ui';
import { bannerMode, cropRect, bannerSpaces } from '../../shared/banner';

export function WoodMessage({
  title,
  fileId,
  author,
  anonymous = false,
  mode,
  imageDraft,
  imageAlt,
  compact = false,
}) {
  const format = mode || bannerMode({ title, file_id: fileId });
  const label = useRef(null);
  useEffect(() => {
    if (!label.current) return;
    const element = label.current,
      box = element.parentElement;
    let active = true;
    function fit() {
      if (!active || !box.clientWidth) return;
      let size = Number(getComputedStyle(box).getPropertyValue('--board-font-max')) || 26;
      element.style.fontSize = `${size}px`;
      while (
        size > 12 &&
        (element.scrollHeight > box.clientHeight || element.scrollWidth > box.clientWidth)
      ) {
        size -= 0.5;
        element.style.fontSize = `${size}px`;
      }
    }
    const observer = new ResizeObserver(fit);
    observer.observe(box);
    fit();
    document.fonts.ready.then(fit);
    return () => {
      active = false;
      observer.disconnect();
    };
  }, [title, format, compact]);
  const source = imageDraft?.url || (fileId ? `/api/files/${fileId}` : null);
  const region =
    imageDraft &&
    (imageDraft.fit === 'contain'
      ? { x: 0, y: 0, width: imageDraft.width, height: imageDraft.height }
      : cropRect(imageDraft.width, imageDraft.height, imageDraft.crop));
  return (
    <span className={`wood-message wood-format-${format} ${compact ? 'wood-compact' : ''}`}>
      <svg
        className="wood-grain"
        viewBox="0 0 272 56"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <path d="M-8 8C35 3 49 12 91 8S160 4 212 9S252 8 282 4M-8 15C36 10 59 19 102 15S169 10 218 16S254 15 281 11M-8 28C28 23 59 31 105 27S171 23 215 28S261 27 281 23M-8 40C38 35 76 44 116 39S169 35 217 40S252 40 281 35M-8 49C33 44 67 53 111 48S181 43 222 49S259 48 282 44" />
        <path d="M179 18c16-5 47-4 50 1s-25 8-46 5s-14-5-4-6Zm6 2c11-3 31-2 31 0s-20 4-31 0Z" />
      </svg>
      {format !== 'text' && source && (
        <span className="wood-image-window">
          {imageDraft ? (
            <svg
              className="wood-photo"
              viewBox={`${region.x} ${region.y} ${region.width} ${region.height}`}
              preserveAspectRatio="xMidYMid meet"
              role="img"
              aria-label={imageAlt || 'Previsualització del retall'}
            >
              <image href={source} width={imageDraft.width} height={imageDraft.height} />
            </svg>
          ) : (
            <VerifiedImage
              className="wood-photo"
              src={source}
              alt={
                imageAlt ||
                (anonymous
                  ? 'Imatge d’un anunci anònim'
                  : `Imatge de l’anunci${author ? ` de ${author}` : ''}`)
              }
            />
          )}
        </span>
      )}
      {format !== 'image' && (
        <span className="wood-copy">
          <strong ref={label}>{title || 'Espai disponible'}</strong>
        </span>
      )}
      {format === 'image' && !source && (
        <span className="wood-copy wood-placeholder">
          <ImagePlaceholder />
        </span>
      )}
    </span>
  );
}

function ImagePlaceholder() {
  return (
    <>
      <Megaphone size={20} aria-hidden="true" />
      <span>La teva imatge</span>
    </>
  );
}

export function BoardDetail({ item = {} }) {
  const { data: appData, open } = useApp();
  const space = bannerSpaces(appData).find((s) => s.slot === (item.slot || 1));
  const data = { ...appData, banner: space.banner, minBid: space.minBid };
  return (
    <div className="board-detail">
      <strong>Espai {space.slot} de 3</strong>
      <span className="board-attribution">
        {data.banner
          ? data.banner.anonymous
            ? 'Anunci anònim'
            : `Anunci de ${data.banner.author}`
          : 'Un petit espai per a la comunitat'}
      </span>
      {(!data.banner || data.banner.title) && (
        <h3>{data.banner?.title || 'Aquí hi cap la teva idea'}</h3>
      )}
      {data.banner?.body ? (
        <RichText text={data.banner.body} />
      ) : (
        !data.banner && (
          <p>
            Comparteix un missatge o una foto amb el centre. Apareixerà discretament a la barra
            superior.
          </p>
        )
      )}
      {data.banner?.file_id && (
        <VerifiedImage
          className="board-detail-photo"
          src={`/api/files/${data.banner.file_id}`}
          alt={data.banner.body || 'Imatge de l’anunci'}
        />
      )}
      <p className="muted small">
        {data.banner
          ? `Valor actual: ${bannerValue(data.banner)} ${bannerValue(data.banner) === 1 ? 'pastís' : 'pastissos'}. `
          : ''}
        Oferta des de {data.minBid} {data.minBid === 1 ? 'pastís' : 'pastissos'}.
      </p>
      <div className="row-actions">
        <Button variant="primary" onClick={() => open('banner', { slot: space.slot })}>
          <PencilSimple size={18} />
          Proposa un missatge
        </Button>
      </div>
    </div>
  );
}

export default function WoodBoard() {
  const { data: appData, open } = useApp();
  return (
    <aside className="global-board" aria-label="Tres espais d’anuncis de la comunitat">
      {bannerSpaces(appData).map((space) => {
        const data = { banner: space.banner };
        return (
          <button
            key={space.slot}
            type="button"
            className="board-trigger"
            aria-label={`Espai ${space.slot} de 3. ${
              data.banner
                ? data.banner.title
                  ? `Veure l’anunci: ${data.banner.title}`
                  : data.banner.anonymous
                    ? 'Veure l’anunci anònim amb imatge'
                    : `Veure l’anunci amb imatge de ${data.banner.author}`
                : 'Disponible. Publica un anunci des d’un pastís'
            }`}
            aria-haspopup="dialog"
            title={`Espai ${space.slot}: ${data.banner?.title || 'Disponible'}`}
            onClick={() => open('board', { slot: space.slot })}
          >
            <WoodMessage
              title={data.banner?.title || (!data.banner ? `Espai ${space.slot} disponible` : '')}
              fileId={data.banner?.file_id}
              author={data.banner?.author}
              anonymous={data.banner?.anonymous}
              imageAlt={data.banner?.body}
            />
            <span className="board-mobile-icon" aria-hidden="true">
              <Megaphone size={20} />
            </span>
          </button>
        );
      })}
    </aside>
  );
}
