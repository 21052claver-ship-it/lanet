import VerifiedImage from './components/VerifiedImage';
import React, { useRef, useState } from 'react';
import { upload } from './api';
import { uploadQueue } from '../shared/upload-queue';
import { Button, Field, FormError, IconButton } from './ui';
import {
  Paperclip,
  X,
  CaretUp,
  CaretDown,
  ImageSquare,
  FilePdf,
  VideoCamera,
  FileText,
} from '@phosphor-icons/react';
export function useSubmit(onDone) {
  const pending = useRef(false);
  const [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  const submit = (fn) => async (e) => {
    e?.preventDefault();
    if (pending.current) return;
    pending.current = true;
    setBusy(true);
    setError('');
    try {
      await fn(e);
      onDone?.();
    } catch (err) {
      setError(err.message);
    } finally {
      pending.current = false;
      setBusy(false);
    }
  };
  return { busy, error, submit, setError };
}
export function Attachments({
  files,
  setFiles,
  imagesOnly = false,
  previews = false,
  onBusyChange,
}) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  const [progress, setProgress] = useState({ completed: 0, total: 0 });
  async function select(e) {
    const input = e.target;
    setBusy(true);
    onBusyChange?.(true);
    setError('');
    try {
      if (files.length + input.files.length > 12)
        throw new Error('Pots adjuntar fins a 12 fitxers.');
      const selected = Array.from(input.files);
      for (const file of selected) {
        if (imagesOnly && !file.type.startsWith('image/'))
          throw new Error('Tria una imatge PNG, JPG, WebP o GIF.');
        const video = /\.(mp4|m4v|webm)$/i.test(file.name);
        if (file.size > (video && !imagesOnly ? 25 : 10) * 1024 * 1024)
          throw new Error(
            video && !imagesOnly
              ? 'Cada vídeo pot ocupar com a màxim 25 MB.'
              : 'Cada fitxer pot ocupar com a màxim 10 MB.',
          );
      }
      setProgress({ completed: 0, total: selected.length });
      const results = await uploadQueue(selected, upload, {
        onProgress: ({ completed, total, results }) => {
          setProgress({ completed, total });
          setFiles([
            ...files,
            ...results.filter((r) => r?.status === 'fulfilled').map((r) => r.value),
          ]);
        },
      });
      const failures = results.filter((r) => r.status === 'rejected');
      if (failures.length)
        setError(failures.map((r) => `${selected[r.index].name}: ${r.reason.message}`).join(' '));
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
      onBusyChange?.(false);
      input.value = '';
    }
  }
  function move(i, d) {
    const next = [...files],
      j = i + d;
    if (j < 0 || j >= next.length) return;
    [next[i], next[j]] = [next[j], next[i]];
    setFiles(next);
  }
  return (
    <div className="attachment-editor">
      <label className={`upload-button ${busy ? 'disabled' : ''}`}>
        <Paperclip size={19} />
        {busy
          ? `Pujant i comprovant ${progress.completed}/${progress.total}…`
          : imagesOnly
            ? 'Afegir imatge'
            : 'Afegir fotos, vídeo o documents'}
        <input
          type="file"
          multiple={!imagesOnly}
          accept={
            imagesOnly
              ? 'image/png,image/jpeg,image/webp,image/gif'
              : '.png,.jpg,.jpeg,.webp,.gif,.mp4,.m4v,.webm,.pdf,.txt,.docx,.odt,.pptx,.xlsx'
          }
          onChange={select}
          disabled={busy}
        />
      </label>
      <small>
        {imagesOnly
          ? 'Fins a 10 MB per imatge.'
          : 'Fotos, vídeo MP4/WebM, PDF i documents combinables. Fins a 25 MB per vídeo, 10 MB per document i 12 adjunts.'}
      </small>
      <small>
        Les imatges es comproven abans de publicar-les. Els GIF i altres animacions es desen com a
        imatge fixa.
      </small>
      <FormError error={error} />
      <div className="attachment-list">
        {files.map((f, i) => (
          <div className="attachment-item" key={f.id}>
            {f.mime?.startsWith('image/') ? (
              <VerifiedImage src={`/api/files/${f.id}`} alt={f.name} />
            ) : f.mime?.startsWith('video/') ? (
              <VideoCamera size={26} />
            ) : f.mime === 'application/pdf' ? (
              <FilePdf size={26} />
            ) : (
              <FileText size={26} />
            )}
            <span>
              <strong>{f.name || 'Imatge adjunta'}</strong>
              <small>{f.size ? Math.ceil(f.size / 1024) + ' KB' : ''}</small>
            </span>
            {previews && (
              <label className="preview-checkbox">
                <input
                  type="checkbox"
                  disabled={busy}
                  checked={!!f.preview}
                  onChange={(e) =>
                    setFiles(
                      files.map((x) => (x.id === f.id ? { ...x, preview: e.target.checked } : x)),
                    )
                  }
                />
                Mostra gratuïta
              </label>
            )}
            <IconButton
              label="Moure abans"
              disabled={busy || i === 0}
              onClick={() => move(i, -1)}
              type="button"
            >
              <CaretUp size={16} />
            </IconButton>
            <IconButton
              label="Moure després"
              disabled={busy || i === files.length - 1}
              onClick={() => move(i, 1)}
              type="button"
            >
              <CaretDown size={16} />
            </IconButton>
            <IconButton
              label="Treure adjunt"
              type="button"
              disabled={busy}
              onClick={() => setFiles(files.filter((x) => x.id !== f.id))}
            >
              <X size={17} />
            </IconButton>
          </div>
        ))}
      </div>
    </div>
  );
}
