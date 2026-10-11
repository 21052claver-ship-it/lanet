import React, { useEffect, useId, useRef, useState } from 'react';
import {
  ImageSquare,
  ArrowsOut,
  Minus,
  Plus,
  ArrowCounterClockwise,
  X,
} from '@phosphor-icons/react';
import { Button, FormError, IconButton } from '../ui';
import {
  DEFAULT_CROP,
  MAX_CROP_ZOOM,
  cropRect,
  cropFromRect,
  moveCrop,
  resizeCrop,
  zoomCrop,
} from '../../shared/banner';

export default function BannerImageEditor({
  value,
  onChange,
  disabled,
  hidden,
  onBusyChange,
  preview,
}) {
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [box, setBox] = useState({ width: 0, height: 0 });
  const overview = useRef(null),
    input = useRef(null),
    drag = useRef(null);
  const generation = useRef(0),
    urls = useRef(new Set());
  const helpId = useId();
  useEffect(
    () => () => {
      generation.current++;
      urls.current.forEach((url) => URL.revokeObjectURL(url));
      urls.current.clear();
    },
    [],
  );
  useEffect(() => {
    if (!overview.current) return;
    const observer = new ResizeObserver(([entry]) =>
      setBox({ width: entry.contentRect.width, height: entry.contentRect.height }),
    );
    observer.observe(overview.current);
    return () => observer.disconnect();
  }, [!!value, hidden]);

  async function select(file) {
    if (!file || disabled || loading) return;
    setError('');
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
      setError('Per retallar-la, tria una imatge PNG, JPG o WebP.');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError('La imatge pot ocupar com a màxim 10 MB.');
      return;
    }
    const current = ++generation.current;
    setLoading(true);
    onBusyChange(true);
    const url = URL.createObjectURL(file);
    urls.current.add(url);
    try {
      const image = new Image();
      image.src = url;
      await image.decode();
      if (current !== generation.current) return;
      if (
        !image.naturalWidth ||
        !image.naturalHeight ||
        image.naturalWidth * image.naturalHeight > 40000000
      )
        throw new Error('Tria una imatge de fins a 40 megapíxels.');
      onChange({
        url,
        image,
        name: file.name,
        width: image.naturalWidth,
        height: image.naturalHeight,
        crop: { ...DEFAULT_CROP },
        fit: 'crop',
      });
      if (value?.url) {
        URL.revokeObjectURL(value.url);
        urls.current.delete(value.url);
      }
    } catch {
      if (current === generation.current)
        setError(
          'No s’ha pogut llegir la imatge. Tria un PNG, JPG o WebP vàlid de fins a 40 megapíxels.',
        );
      URL.revokeObjectURL(url);
      urls.current.delete(url);
    } finally {
      if (current === generation.current) {
        setLoading(false);
        onBusyChange(false);
      }
    }
  }
  function remove() {
    if (disabled || loading) return;
    if (value?.url) {
      URL.revokeObjectURL(value.url);
      urls.current.delete(value.url);
    }
    onChange(null);
    input.current?.focus();
  }
  const scale =
    value && box.width && box.height
      ? Math.min((box.width - 32) / value.width, (box.height - 32) / value.height)
      : 0;
  const space = value
    ? { width: value.width * scale, height: value.height * scale }
    : { width: 0, height: 0 };
  const rect = value ? cropRect(value.width, value.height, value.crop) : null;
  const point = (event) => {
    const bounds = overview.current.getBoundingClientRect();
    return {
      x:
        (event.clientX -
          bounds.left -
          overview.current.clientLeft -
          (box.width - space.width) / 2) /
        scale,
      y:
        (event.clientY -
          bounds.top -
          overview.current.clientTop -
          (box.height - space.height) / 2) /
        scale,
    };
  };
  function pointerDown(event) {
    if (!value || disabled || loading || value.fit === 'contain' || !scale || event.button !== 0)
      return;
    event.preventDefault();
    overview.current.focus({ preventScroll: true });
    const corner = event.target.closest('[data-corner]')?.dataset.corner;
    let crop = value.crop;
    if (!corner && !event.target.closest('.crop-selection')) {
      const p = point(event);
      crop = cropFromRect(value.width, value.height, {
        ...rect,
        x: p.x - rect.width / 2,
        y: p.y - rect.height / 2,
      });
      onChange({ ...value, crop });
    }
    drag.current = { corner, crop, x: event.clientX, y: event.clientY, scale };
    event.currentTarget.setPointerCapture(event.pointerId);
  }
  function pointerMove(event) {
    if (!drag.current || disabled) return;
    const start = drag.current;
    const crop = start.corner
      ? resizeCrop(value.width, value.height, start.crop, start.corner, point(event))
      : moveCrop(
          value.width,
          value.height,
          start.crop,
          (event.clientX - start.x) / start.scale,
          (event.clientY - start.y) / start.scale,
        );
    onChange({ ...value, crop });
  }
  function pointerUp(event) {
    drag.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId))
      event.currentTarget.releasePointerCapture(event.pointerId);
  }
  function zoom(next) {
    onChange({
      ...value,
      fit: 'crop',
      crop: zoomCrop(value.width, value.height, value.crop, next),
    });
  }
  function keys(event) {
    if (!value || disabled || loading || value.fit === 'contain') return;
    const delta = event.shiftKey ? 0.05 : 0.01;
    const moves = {
      ArrowLeft: [-delta * value.width, 0],
      ArrowRight: [delta * value.width, 0],
      ArrowUp: [0, -delta * value.height],
      ArrowDown: [0, delta * value.height],
    };
    if (moves[event.key]) {
      event.preventDefault();
      onChange({
        ...value,
        crop: moveCrop(value.width, value.height, value.crop, ...moves[event.key]),
      });
    } else if (['+', '=', '-'].includes(event.key)) {
      event.preventDefault();
      zoom(value.crop.zoom + (event.key === '-' ? -0.1 : 0.1));
    } else if (event.key === 'Home') {
      event.preventDefault();
      onChange({ ...value, crop: { ...DEFAULT_CROP } });
    }
  }
  return (
    <section
      className="banner-image-editor"
      hidden={hidden}
      aria-label="Imatge del cartell"
      aria-busy={loading}
    >
      <div className="banner-image-heading">
        <label className={`banner-image-pick ${loading ? 'disabled' : ''}`}>
          <ImageSquare size={20} />
          {loading ? 'Llegint imatge…' : value ? 'Canviar imatge' : 'Tria una imatge'}
          <input
            ref={input}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            disabled={disabled || loading}
            onChange={(event) => {
              select(event.target.files[0]);
              event.target.value = '';
            }}
          />
        </label>
        {value && (
          <IconButton
            type="button"
            label="Treure imatge del cartell"
            disabled={disabled || loading}
            onClick={remove}
          >
            <X size={18} />
          </IconButton>
        )}
      </div>
      <FormError error={error} />
      {!value ? (
        <div
          className="banner-image-drop"
          onDragOver={(event) => event.preventDefault()}
          onDrop={(event) => {
            event.preventDefault();
            select(event.dataTransfer.files[0]);
          }}
        >
          <ImageSquare size={40} weight="duotone" />
          <strong>La teva foto, tot el cartell</strong>
          <span>Tria-la a dalt o arrossega-la aquí.</span>
          <small>PNG, JPG o WebP · Fins a 10 MB</small>
        </div>
      ) : (
        <>
          <div className="crop-fit-options" aria-label="Enquadrament de la imatge">
            <Button
              type="button"
              aria-pressed={value.fit !== 'contain'}
              disabled={disabled}
              onClick={() => onChange({ ...value, fit: 'crop' })}
            >
              <ArrowsOut size={17} /> Omplir cartell
            </Button>
            <Button
              type="button"
              aria-pressed={value.fit === 'contain'}
              disabled={disabled}
              onClick={() => onChange({ ...value, fit: 'contain' })}
            >
              Imatge sencera
            </Button>
          </div>
          <div
            ref={overview}
            className={`crop-overview ${value.fit === 'contain' ? 'show-whole-image' : ''}`}
            tabIndex={disabled ? -1 : 0}
            role="group"
            aria-label="Retall visual de la imatge"
            aria-describedby={helpId}
            onKeyDown={keys}
            onPointerDown={pointerDown}
            onPointerMove={pointerMove}
            onPointerUp={pointerUp}
            onPointerCancel={pointerUp}
          >
            <div
              className="crop-image-space"
              style={{
                width: space.width,
                height: space.height,
                left: (box.width - space.width) / 2,
                top: (box.height - space.height) / 2,
              }}
            >
              <img src={value.url} alt="Foto completa per ajustar el retall" draggable={false} />
              {value.fit !== 'contain' && rect && (
                <div
                  className="crop-selection"
                  style={{
                    left: `${(rect.x / value.width) * 100}%`,
                    top: `${(rect.y / value.height) * 100}%`,
                    width: `${(rect.width / value.width) * 100}%`,
                    height: `${(rect.height / value.height) * 100}%`,
                  }}
                >
                  <span className="crop-grid" aria-hidden="true" />
                  {['nw', 'ne', 'sw', 'se'].map((corner) => (
                    <span
                      key={corner}
                      className={`crop-corner corner-${corner}`}
                      data-corner={corner}
                      aria-hidden="true"
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
          {preview}
          <small id={helpId} className="crop-help">
            {value.fit === 'contain'
              ? 'Es veurà tota la foto, amb fusta a l’espai lliure.'
              : 'Arrossega el requadre o les cantonades. Fletxes per moure · +/− per ampliar · Inici per restablir.'}
          </small>
          {value.fit !== 'contain' && (
            <div className="crop-zoom">
              <IconButton
                type="button"
                label="Allunyar retall"
                disabled={disabled || value.crop.zoom <= 1}
                onClick={() => zoom(value.crop.zoom - 0.1)}
              >
                <Minus size={17} />
              </IconButton>
              <label>
                <span>
                  Zoom <strong>{Math.round(value.crop.zoom * 100)}%</strong>
                </span>
                <input
                  type="range"
                  aria-label="Ampliació del retall"
                  min="100"
                  max={MAX_CROP_ZOOM * 100}
                  step="1"
                  value={Math.round(value.crop.zoom * 100)}
                  disabled={disabled}
                  onChange={(event) => zoom(Number(event.target.value) / 100)}
                />
              </label>
              <IconButton
                type="button"
                label="Apropar retall"
                disabled={disabled || value.crop.zoom >= MAX_CROP_ZOOM}
                onClick={() => zoom(value.crop.zoom + 0.1)}
              >
                <Plus size={17} />
              </IconButton>
              <Button
                type="button"
                disabled={disabled}
                onClick={() => onChange({ ...value, crop: { ...DEFAULT_CROP } })}
              >
                <ArrowCounterClockwise size={16} /> Restablir
              </Button>
            </div>
          )}
          <small className="crop-file-name">
            {value.name} · {value.width} × {value.height} px
          </small>
        </>
      )}
      {!value && preview}
    </section>
  );
}
