import React, { useEffect, useRef, useState } from 'react';
import {
  CaretLeft,
  CaretRight,
  MagnifyingGlassPlus,
  MagnifyingGlassMinus,
  DownloadSimple,
} from '@phosphor-icons/react';
import workerUrl from 'pdfjs-dist/legacy/build/pdf.worker.min.mjs?url';
import { IconButton } from '../ui';
export default function PdfAttachment({ file }) {
  const canvas = useRef(null),
    wrap = useRef(null);
  const [doc, setDoc] = useState(null),
    [page, setPage] = useState(1),
    [zoom, setZoom] = useState(1),
    [width, setWidth] = useState(600),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(true),
    [text, setText] = useState('');
  useEffect(() => {
    setDoc(null);
    setError('');
    setBusy(true);
    setText('');
    setZoom(1);
    let alive = true,
      task;
    import('pdfjs-dist/legacy/build/pdf.mjs')
      .then((pdf) => {
        if (!alive) return;
        pdf.GlobalWorkerOptions.workerSrc = workerUrl;
        task = pdf.getDocument({
          url: '/api/files/' + file.id,
          isEvalSupported: false,
          enableXfa: false,
          maxImageSize: 24_000_000,
          canvasMaxAreaInBytes: 32_000_000,
          useSystemFonts: true,
          disableWorkerRendering: true,
        });
        return task.promise.then((value) => {
          if (alive) {
            setDoc(value);
            setPage(1);
          }
        });
      })
      .catch(() => {
        if (alive) {
          setError('No hem pogut previsualitzar el PDF. Pots descarregar-lo.');
          setBusy(false);
        }
      });
    return () => {
      alive = false;
      task?.destroy().catch(() => {});
    };
  }, [file.id]);
  useEffect(() => {
    const observer = new ResizeObserver(([entry]) =>
      setWidth(Math.max(160, entry.contentRect.width - 24)),
    );
    if (wrap.current) observer.observe(wrap.current);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    if (!doc) return;
    let alive = true,
      rendering;
    setBusy(true);
    doc
      .getPage(page)
      .then(async (pdfPage) => {
        if (!alive) return;
        const original = pdfPage.getViewport({ scale: 1 });
        const viewport = pdfPage.getViewport({ scale: (width / original.width) * zoom });
        if (
          ![viewport.width, viewport.height].every((n) => Number.isFinite(n) && n > 0 && n <= 8192)
        )
          throw new Error('La pàgina supera els límits de previsualització.');
        const pixelRatio = Math.min(
            devicePixelRatio || 1,
            2,
            8192 / viewport.width,
            8192 / viewport.height,
            Math.sqrt(8_000_000 / (viewport.width * viewport.height)),
          ),
          target = canvas.current;
        target.width = Math.max(1, Math.floor(viewport.width * pixelRatio));
        target.height = Math.max(1, Math.floor(viewport.height * pixelRatio));
        target.style.width = viewport.width + 'px';
        target.style.height = viewport.height + 'px';
        rendering = pdfPage.render({
          canvas: target,
          canvasContext: target.getContext('2d'),
          viewport,
          transform: pixelRatio === 1 ? undefined : [pixelRatio, 0, 0, pixelRatio, 0, 0],
        });
        await rendering.promise;
        if (alive) {
          setBusy(false);
          const content = await pdfPage.getTextContent();
          if (alive) setText(content.items.map((item) => item.str || '').join(' '));
        }
      })
      .catch((e) => {
        if (alive && e.name !== 'RenderingCancelledException') {
          setError('El PDF no es pot mostrar. Pots descarregar-lo.');
          setBusy(false);
        }
      });
    return () => {
      alive = false;
      rendering?.cancel();
    };
  }, [doc, page, width, zoom]);
  return (
    <section className="pdf-preview" aria-label={'PDF: ' + file.name}>
      <div className="pdf-toolbar">
        <strong>{file.name}</strong>
        <span>
          <IconButton
            label="Pàgina anterior del PDF"
            disabled={page <= 1 || busy}
            onClick={() => setPage(page - 1)}
          >
            <CaretLeft size={19} />
          </IconButton>
          <span aria-live="polite">
            {page} / {doc?.numPages || '…'}
          </span>
          <IconButton
            label="Pàgina següent del PDF"
            disabled={!doc || page >= doc.numPages || busy}
            onClick={() => setPage(page + 1)}
          >
            <CaretRight size={19} />
          </IconButton>
        </span>
        <span>
          <IconButton
            label="Reduir PDF"
            disabled={zoom <= 1 || busy}
            onClick={() => setZoom(zoom - 0.5)}
          >
            <MagnifyingGlassMinus size={19} />
          </IconButton>
          <IconButton
            label="Ampliar PDF"
            disabled={zoom >= 2 || busy}
            onClick={() => setZoom(zoom + 0.5)}
          >
            <MagnifyingGlassPlus size={19} />
          </IconButton>
          <a className="button" href={'/api/files/' + file.id + '?download=1'}>
            <DownloadSimple size={18} />
            PDF
          </a>
        </span>
      </div>
      {busy && !error && (
        <p className="muted" role="status">
          Carregant la pàgina…
        </p>
      )}
      {error && <p className="form-error">{error}</p>}
      <div ref={wrap} className="pdf-canvas-wrap">
        <canvas ref={canvas} aria-label={file.name + ', pàgina ' + page} />
        <p className="sr-only">{text}</p>
      </div>
    </section>
  );
}
