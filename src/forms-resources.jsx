import VerifiedImage from './components/VerifiedImage';
import React, { useState, useEffect } from 'react';
import Select from './components/Select';
import { PlusToGrades } from './components/CourseGrades';
import { BONUS_TYPES, bonusMaximum, bonusLabel } from '../shared/course-grades';
import AssessmentEditor from './components/AssessmentEditor';
import { prepareActivitySlots } from '../shared/grade-activities';
import { clientId } from '../shared/client-id';
import {
  assessmentType,
  assessmentDefinition,
  equalActiveAssessmentWeights,
} from '../shared/assessments';
import VideoAttachment from './components/VideoAttachment';
import PdfAttachment from './components/PdfAttachment';
import { PrivateGrade, GradePrivacyToggle } from './components/GradePrivacy';
import { distributeWeights } from '../shared/weights';
import {
  Cake,
  LockSimple,
  DownloadSimple,
  NotePencil,
  Trash,
  Flag,
  CalendarPlus,
  ArrowSquareOut,
  Plus,
  Check,
  Eye,
  FilePdf,
} from '@phosphor-icons/react';
import { useApp } from './context';
import { api } from './api';
import {
  Field,
  Button,
  FormError,
  FormFooter,
  SubjectChip,
  RichText,
  LikeButton,
  SaveButton,
  IconButton,
} from './ui';
import { useSubmit, Attachments } from './form-utils';
import {
  numberLabel,
  weightedGrades,
  neededGrade,
  parseGrade,
  dateLabel,
  safeLink,
  madridDay,
} from '../shared/domain';
export function NoteForm({ item }) {
  const { data, enrolled, close, mutate, open, notify } = useApp();
  const [f, setF] = useState({
      title: '',
      subject_id: data.preferences?.notesSubjects?.[0] || enrolled[0]?.id || data.subjects[0]?.id,
      body: '',
      summary: '',
      price: 0,
      ...item,
    }),
    [files, setFiles] = useState(item.files || []),
    [preview, setPreview] = useState(false),
    [uploading, setUploading] = useState(false);
  const { busy, error, submit } = useSubmit();
  const [loading, setLoading] = useState(!!item.id && !item.body),
    [loadError, setLoadError] = useState(''),
    [loadAttempt, setLoadAttempt] = useState(0);
  useEffect(() => {
    if (!item.id || item.body) return;
    let active = true;
    setLoading(true);
    setLoadError('');
    api(`/notes/${item.id}`)
      .then((n) => {
        if (active) {
          setF((f) => ({ ...f, body: n.body }));
          setFiles(n.files);
        }
      })
      .catch((e) => active && setLoadError(e.message))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [item.id, loadAttempt]);
  const update = (k, v) => setF((x) => ({ ...x, [k]: v }));
  return (
    <form
      onSubmit={submit((e) => {
        if (uploading) throw new Error('Espera que acabin de pujar els fitxers.');
        if (loading || loadError)
          throw new Error('Espera que es carreguin els apunts abans de desar.');
        const draft = e.nativeEvent.submitter?.value === 'draft';
        return mutate(
          '/notes' + (item.id ? '/' + item.id : ''),
          {
            ...f,
            files,
            status: draft ? 'draft' : 'published',
          },
          undefined,
          () => {
            notify(draft ? 'Esborrany desat.' : 'Apunts publicats. Gràcies per compartir!');
            close();
          },
        );
      })}
    >
      <fieldset className="note-editor-fields" disabled={loading || !!loadError || busy}>
        <div className="form-grid">
          <Field label="Títol">
            <input
              value={f.title}
              onChange={(e) => update('title', e.target.value)}
              maxLength={120}
              required
            />
          </Field>
          <Field label="Assignatura">
            <Select value={f.subject_id} onChange={(e) => update('subject_id', e.target.value)}>
              {data.subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.short}
                </option>
              ))}
            </Select>
          </Field>
        </div>
        <Field
          label="Text dels apunts"
          hint="Pots combinar text, fotos, vídeo, PDF i documents. # crea un títol; - crea una llista."
        >
          <textarea
            disabled={loading || !!loadError}
            rows={9}
            value={f.body}
            onChange={(e) => update('body', e.target.value)}
            maxLength={50000}
            placeholder="Escriu el que t’ha ajudat a entendre el tema…"
          />
        </Field>
        <Attachments
          files={files}
          setFiles={setFiles}
          previews={f.price > 0}
          onBusyChange={setUploading}
        />
        <div className="form-grid">
          <Field label="Resum públic" hint="La mostra que es veu abans d’obrir o comprar.">
            <textarea
              disabled={loading}
              rows={2}
              value={f.summary}
              onChange={(e) => update('summary', e.target.value)}
              maxLength={300}
              placeholder="Si queda buit, es faran servir les primeres línies."
            />
          </Field>
          <Field
            label="Preu opcional en pastissos"
            hint="0: gratuït. La publicació sencera té un únic preu."
          >
            <input
              type="number"
              min="0"
              max="10000"
              step="1"
              value={f.price}
              onChange={(e) => update('price', Number(e.target.value))}
              required
            />
          </Field>
        </div>
        <Button type="button" onClick={() => setPreview(!preview)}>
          <Eye size={18} />
          {preview ? 'Tancar previsualització' : 'Previsualitzar'}
        </Button>
        {preview && (
          <div className="editor-preview">
            <h2>{f.title || 'Els teus apunts'}</h2>
            <RichText text={f.body} />
            {files
              .filter((f) => f.mime?.startsWith('image/'))
              .map((f) => (
                <VerifiedImage key={f.id} src={`/api/files/${f.id}`} alt={f.name} />
              ))}
          </div>
        )}
      </fieldset>
      {loading && (
        <p className="muted" role="status">
          Carregant el contingut dels apunts…
        </p>
      )}
      <FormError error={loadError || error} />
      {loadError && (
        <Button type="button" onClick={() => setLoadAttempt((n) => n + 1)}>
          Tornar a carregar
        </Button>
      )}
      <div className="form-footer">
        {item.id && (
          <Button
            type="button"
            variant="danger"
            onClick={() => open('delete', { resource: 'notes', id: item.id, title: item.title })}
          >
            <Trash size={17} />
            Retirar
          </Button>
        )}
        <Button type="button" variant="ghost" onClick={close}>
          Cancel·lar
        </Button>
        <Button
          type="submit"
          value="draft"
          busy={busy || uploading}
          disabled={loading || !!loadError}
        >
          Desar esborrany
        </Button>
        <Button
          type="submit"
          value="publish"
          variant="primary"
          busy={busy || uploading}
          disabled={loading || !!loadError}
        >
          {item.id ? 'Desar i publicar' : 'Publicar apunts'}
        </Button>
      </div>
    </form>
  );
}
export function Reader({ item }) {
  const { data, subject, mutate, open, refresh, notify } = useApp();
  const base = data.notes.find((n) => n.id === item.id) || item;
  const [content, setContent] = useState(null),
    [loadError, setLoadError] = useState(''),
    [loadAttempt, setLoadAttempt] = useState(0);
  const n = {
    ...base,
    body: base.unlocked ? content?.body || '' : '',
    files: content?.files || base.files,
  };
  const [busy, setBusy] = useState(false),
    [imageIndex, setImageIndex] = useState(0);
  useEffect(() => {
    if (!n.unlocked) return;
    let timer,
      disposed = false;
    const start = async () => {
      clearTimeout(timer);
      if (document.visibilityState !== 'visible') return;
      try {
        const full = await api(`/notes/${n.id}`);
        if (!disposed) {
          setContent(full);
          setLoadError('');
        }
        if (!disposed)
          timer = setTimeout(
            () =>
              api(`/notes/${n.id}/consult`, { method: 'POST', body: {} })
                .then(refresh)
                .catch(() => {}),
            10500,
          );
      } catch (e) {
        if (!disposed) setLoadError(e.message);
      }
    };
    start();
    document.addEventListener('visibilitychange', start);
    return () => {
      disposed = true;
      clearTimeout(timer);
      document.removeEventListener('visibilitychange', start);
    };
  }, [n.id, n.unlocked, loadAttempt]);
  async function unlock() {
    setBusy(true);
    try {
      await mutate(
        `/notes/${n.id}/unlock`,
        { price: n.price },
        'Apunts desbloquejats. Els pastissos s’han enviat a l’autor.',
      );
    } catch {
    } finally {
      setBusy(false);
    }
  }
  const photos = n.files.filter((f) => f.mime?.startsWith('image/') && f.accessible),
    videos = n.files.filter((f) => f.mime?.startsWith('video/') && f.accessible),
    documents = n.files.filter(
      (f) => !f.mime?.startsWith('image/') && !f.mime?.startsWith('video/') && f.accessible,
    );
  return (
    <div className="reader">
      <div className="reader-meta">
        <SubjectChip subject={subject(n.subject_id)} />
        <span>{n.author}</span>
        <span className="meta-right">
          {n.price > 0 ? (
            <>
              <Cake size={17} />
              {n.price} pastissos
            </>
          ) : (
            'Compartit gratuïtament'
          )}
        </span>
      </div>
      {n.unlocked ? (
        <>
          {loadError ? (
            <>
              <FormError error={loadError} />
              <Button onClick={() => setLoadAttempt((n) => n + 1)}>Tornar a carregar</Button>
            </>
          ) : content ? (
            <RichText text={n.body} />
          ) : (
            <p className="muted" role="status">
              Carregant els apunts…
            </p>
          )}
        </>
      ) : (
        <div className="locked-note">
          <LockSimple size={29} />
          <h3>Una mostra abans de decidir</h3>
          <p>{n.summary}</p>
          <Button
            variant="primary"
            onClick={unlock}
            busy={busy}
            disabled={data.user.balance < n.price}
          >
            <Cake size={19} />
            Desbloquejar per {n.price} pastissos
          </Button>
          {data.user.balance < n.price && (
            <p className="muted">
              Et falten {n.price - data.user.balance} pastissos. Pots guanyar-ne a la Pastisseria o
              compartint recursos.
            </p>
          )}
          <small>El preu és per tots els apunts. Els pastissos passen a l’autor.</small>
        </div>
      )}
      {photos.length > 0 && (
        <div className="reader-gallery">
          <a
            href={`/api/files/${photos[imageIndex]?.id || photos[0].id}`}
            target="_blank"
            rel="noreferrer"
          >
            <VerifiedImage
              src={`/api/files/${photos[imageIndex]?.id || photos[0].id}`}
              alt={photos[imageIndex]?.name || n.title}
            />
          </a>
          {photos.length > 1 && (
            <div className="gallery-thumbs">
              {photos.map((f, i) => (
                <button
                  className={i === imageIndex ? 'active' : ''}
                  aria-pressed={i === imageIndex}
                  aria-label={'Veure foto ' + (i + 1) + ': ' + f.name}
                  key={f.id}
                  onClick={() => setImageIndex(i)}
                >
                  <VerifiedImage src={`/api/files/${f.id}`} alt={`Foto ${i + 1}`} />
                </button>
              ))}
            </div>
          )}
          <small>Fes clic a la imatge per obrir-la amb tota la resolució.</small>
        </div>
      )}
      {videos.map((file) => (
        <VideoAttachment key={file.id} file={file} />
      ))}
      {documents.map((f) =>
        f.mime === 'application/pdf' ? (
          <PdfAttachment key={f.id} file={f} />
        ) : (
          <div className="reader-document" key={f.id}>
            <div>
              <span>
                <FilePdf size={20} />
                {f.name}
              </span>
              <a className="button" href={`/api/files/${f.id}?download=1`}>
                <DownloadSimple size={17} />
                Descarregar
              </a>
            </div>
          </div>
        ),
      )}
      {n.status === 'published' && (
        <div className="reader-actions">
          <LikeButton item={n} resource="notes" />
          <SaveButton item={n} resource="notes" />
          <span className="muted">Donar les gràcies és gratuït</span>
          {n.author_id === data.user.id && (
            <Button onClick={() => open('note', n)}>
              <NotePencil size={18} />
              Editar
            </Button>
          )}
          <IconButton
            label="Informar d’un problema"
            onClick={() => open('report', { type: 'note', target_id: n.id })}
          >
            <Flag size={18} />
          </IconButton>
        </div>
      )}
    </div>
  );
}
export function PlusForm({ item }) {
  const { data, close, mutate, open } = useApp();
  const [f, setF] = useState({
      title: '',
      body: '',
      date: madridDay(),
      start: '',
      end: '',
      place: '',
      conditions: '',
      url: '',
      ...item,
    }),
    [subjects, setSubjects] = useState(
      item.subjects
        ? item.subjects.map((subject) => ({
            ...subject,
            bonus:
              bonusMaximum(subject.bonus) === null ? '' : bonusLabel(bonusMaximum(subject.bonus)),
          }))
        : [{ subject_id: data.subjects[0]?.id, bonus: bonusLabel(0.25) }],
    );
  const { busy, error, submit } = useSubmit(close);
  const update = (k, v) => setF((x) => ({ ...x, [k]: v }));
  return (
    <form
      onSubmit={submit(() =>
        mutate(
          '/pluses' + (item.id ? '/' + item.id : ''),
          { ...f, subjects },
          'Plus acadèmic publicat.',
        ),
      )}
    >
      <Field label="Nom de l’activitat">
        <input
          value={f.title}
          maxLength={120}
          required
          onChange={(e) => update('title', e.target.value)}
        />
      </Field>
      <Field label="De què tracta?">
        <textarea
          rows={4}
          value={f.body}
          required
          maxLength={6000}
          onChange={(e) => update('body', e.target.value)}
        />
      </Field>
      <div className="form-grid three">
        <Field label="Data">
          <input
            type="date"
            value={f.date}
            onChange={(e) => update('date', e.target.value)}
            required
          />
        </Field>
        <Field label="Hora d’inici">
          <input
            type="time"
            value={f.start || ''}
            onChange={(e) => update('start', e.target.value)}
          />
        </Field>
        <Field label="Hora final">
          <input type="time" value={f.end || ''} onChange={(e) => update('end', e.target.value)} />
        </Field>
      </div>
      <Field label="Lloc">
        <input
          value={f.place}
          required
          maxLength={160}
          onChange={(e) => update('place', e.target.value)}
        />
      </Field>
      <fieldset className="plus-subject-editor">
        <legend>Assignatures i plus indicat</legend>
        {subjects.map((s, i) => (
          <div className="form-grid bonus-row" key={i}>
            <Select
              aria-label={`Assignatura ${i + 1}`}
              value={s.subject_id}
              onChange={(e) =>
                setSubjects(
                  subjects.map((x, j) => (j === i ? { ...x, subject_id: e.target.value } : x)),
                )
              }
            >
              {data.subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.short}
                </option>
              ))}
            </Select>
            <Select
              aria-label={`Plus de l’assignatura ${i + 1}`}
              value={s.bonus}
              required
              onChange={(e) =>
                setSubjects(subjects.map((x, j) => (j === i ? { ...x, bonus: e.target.value } : x)))
              }
            >
              <option value="" disabled>
                Tria el màxim del plus
              </option>
              {BONUS_TYPES.map((type) => (
                <option key={type.capacity} value={bonusLabel(type.maximum)}>
                  {type.label}
                </option>
              ))}
            </Select>
            <IconButton
              type="button"
              label="Treure assignatura"
              disabled={subjects.length === 1}
              onClick={() => setSubjects(subjects.filter((_, j) => j !== i))}
            >
              <Trash size={17} />
            </IconButton>
          </div>
        ))}
        <Button
          type="button"
          onClick={() =>
            setSubjects([
              ...subjects,
              {
                subject_id:
                  data.subjects.find((s) => !subjects.some((x) => x.subject_id === s.id))?.id ||
                  data.subjects[0].id,
                bonus: bonusLabel(0.25),
              },
            ])
          }
        >
          <Plus size={17} />
          Una altra assignatura
        </Button>
      </fieldset>
      <Field
        label="Condicions"
        hint="Aquesta informació la comparteix un estudiant. No s’afegeix automàticament a les notes."
      >
        <textarea
          rows={2}
          value={f.conditions}
          maxLength={2000}
          onChange={(e) => update('conditions', e.target.value)}
        />
      </Field>
      <Field label="Enllaç d’informació o inscripció">
        <input
          type="url"
          value={f.url}
          onChange={(e) => update('url', e.target.value)}
          placeholder="https://…"
        />
      </Field>
      <FormError error={error} />
      <FormFooter busy={busy} onCancel={close} label="Publicar plus">
        {item.id && (
          <Button
            type="button"
            variant="danger"
            onClick={() => open('delete', { resource: 'pluses', id: item.id, title: item.title })}
          >
            Retirar
          </Button>
        )}
      </FormFooter>
    </form>
  );
}
export function PlusDetail({ item }) {
  const { data, subject, mutate, open } = useApp();
  const p = data.pluses.find((p) => p.id === item.id) || item;
  const { busy, error, submit } = useSubmit();
  const added = data.events.some((e) => e.source_key === `plus:${p.id}:${data.user.id}`);
  return (
    <div>
      <div className="card-tags">
        {p.subjects.map((s) => (
          <SubjectChip key={s.subject_id} subject={subject(s.subject_id)} />
        ))}
      </div>
      <div className="plus-detail-date">
        {dateLabel(p.date, { weekday: 'long', day: 'numeric', month: 'long' })} ·{' '}
        {p.start || 'Hora per confirmar'}
        {p.end ? ' — ' + p.end : ''}
        <p>{p.place}</p>
      </div>
      <RichText text={p.body} />
      <div className="plus-bonus">
        {p.subjects.map((s) => (
          <strong key={s.subject_id}>
            {s.bonus} <span>en {subject(s.subject_id)?.short}</span>
          </strong>
        ))}
      </div>
      <h3>Condicions</h3>
      <RichText text={p.conditions || 'L’autor no ha indicat condicions addicionals.'} />
      <p className="muted small">
        Plus indicat per {p.author}. Confirma amb el professor com es compta abans d’afegir-lo a les
        teves notes.
      </p>
      <PlusToGrades plus={p} />
      <div className="row-actions">
        {p.url && safeLink(p.url) && (
          <a className="button" href={safeLink(p.url)} target="_blank" rel="noreferrer">
            Més informació
            <ArrowSquareOut size={18} />
          </a>
        )}
        <Button
          busy={busy}
          disabled={added}
          onClick={submit(() =>
            mutate(`/pluses/${p.id}/calendar`, {}, 'Activitat afegida al teu calendari privat.'),
          )}
        >
          {added ? <Check size={18} /> : <CalendarPlus size={18} />}{' '}
          {added ? 'Ja és al teu calendari' : 'Afegir al meu calendari'}
        </Button>
      </div>
      <FormError error={error} />
      <div className="reader-actions">
        <LikeButton item={p} resource="pluses" />
        <SaveButton item={p} resource="pluses" />
        {p.author_id === data.user.id && <Button onClick={() => open('plus', p)}>Editar</Button>}
        <IconButton
          label="Informar d’un problema"
          onClick={() => open('report', { type: 'plus', target_id: p.id })}
        >
          <Flag size={18} />
        </IconButton>
      </div>
    </div>
  );
}
export function GradeSheetForm({ item }) {
  const { data, close, mutate, hideGrades } = useApp();
  const [editingGrade, setEditingGrade] = useState(null);
  const [privateDrafts, setPrivateDrafts] = useState({});
  const [entries, setEntries] = useState(() =>
    prepareActivitySlots(
      data.grades
        .filter((r) => r.subject_id === item.subject_id && r.term === item.term)
        .map((r) => ({
          ...r,
          assessment_type: assessmentType(r),
          category: assessmentDefinition(assessmentType(r)).category,
          raw: r.grade === null ? '' : String(r.grade).replace('.', ','),
        })),
      clientId,
    ),
  );
  const { busy, error, submit } = useSubmit(close);
  const sum = entries.reduce((s, r) => s + Number(r.weight), 0);
  let lastActive = -1;
  for (let index = entries.length - 1; index >= 0; index--) {
    if (Number(entries[index].weight) > 0 || entries[index].raw !== '') {
      lastActive = index;
      break;
    }
  }
  function distributeActive() {
    setEntries(equalActiveAssessmentWeights(entries));
  }
  function update(i, k, v) {
    setEntries((e) => e.map((r, j) => (i === j ? { ...r, [k]: v } : r)));
  }
  return (
    <form
      onSubmit={submit(() =>
        mutate(
          '/grades/sheet',
          { ...item, entries: entries.map((e) => ({ ...e, grade: parseGrade(e.raw) })) },
          'Full personalitzat desat.',
        ),
      )}
    >
      <p className="muted">
        {data.subjects.find((s) => s.id === item.subject_id)?.name} ·{' '}
        {['', '1r', '2n', '3r'][item.term]} trimestre. Els canvis són només teus; es conserven les
        notes.
      </p>
      <GradePrivacyToggle />
      {hideGrades && (
        <p className="grade-privacy-note">
          Notes desades ocultes. Escriu una nova nota per afegir-la o substituir-la; Suprimir buida
          la casella. El formulari conserva les notes que no editis.
        </p>
      )}
      <div className="weights-overview">
        <div className="section-heading">
          <strong>Pes total del trimestre</strong>
          <strong
            className={Math.abs(sum - 100) > 0.001 ? 'negative' : 'positive'}
            aria-live="polite"
          >
            {numberLabel(sum, Number.isInteger(sum) ? 0 : 2)} / 100%
          </strong>
        </div>
        <div
          className="weights-progress"
          role="meter"
          aria-label="Pes total"
          aria-valuenow={Math.min(100, sum)}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <span style={{ width: Math.max(0, Math.min(100, sum)) + '%' }} />
        </div>
        <p>
          {Math.abs(sum - 100) < 0.001
            ? 'Tot repartit. Ja pots desar.'
            : sum < 100
              ? `Falten ${numberLabel(100 - sum, 2)}% per repartir.`
              : `Sobren ${numberLabel(sum - 100, 2)}%. Redueix o ajusta els pesos.`}
        </p>
        <div className="weight-tools">
          <Button type="button" disabled={!entries.length} onClick={distributeActive}>
            Repartir igual
          </Button>
          <Button
            type="button"
            disabled={!entries.length || sum <= 0}
            onClick={() => setEntries(distributeWeights(entries, true))}
          >
            Ajustar proporcionalment al 100%
          </Button>
          {lastActive >= 0 && sum < 100 && (
            <Button
              type="button"
              onClick={() =>
                update(
                  lastActive,
                  'weight',
                  Math.round((Number(entries[lastActive].weight) + 100 - sum) * 100) / 100,
                )
              }
            >
              Completar l’última prova activa
            </Button>
          )}
        </div>
      </div>
      <AssessmentEditor
        entries={entries}
        onChange={setEntries}
        disabled={busy}
        activitySlots
        focusActivity={item.activity_index}
        renderGrade={(r, i) => (
          <input
            aria-label={`Nota de ${r.title}`}
            inputMode="decimal"
            autoComplete="off"
            value={hideGrades ? (editingGrade === r.id ? (privateDrafts[r.id] ?? '') : '') : r.raw}
            onFocus={(e) => {
              setEditingGrade(r.id);
              e.target.select();
            }}
            onBlur={() => setEditingGrade(null)}
            onChange={(e) => {
              setPrivateDrafts((d) => ({ ...d, [r.id]: e.target.value }));
              update(i, 'raw', e.target.value);
            }}
            onKeyDown={(e) => {
              if (hideGrades && ['Backspace', 'Delete'].includes(e.key) && !e.currentTarget.value) {
                setPrivateDrafts((d) => ({ ...d, [r.id]: '' }));
                update(i, 'raw', '');
              }
            }}
            placeholder={hideGrades ? (r.raw === '' ? 'Afegir' : '•••') : '—'}
          />
        )}
      />
      <FormError error={error} />
      <FormFooter
        busy={busy}
        disabled={!entries.length || Math.abs(sum - 100) > 0.001}
        onCancel={close}
        label="Desar proves i pesos"
      />
    </form>
  );
}
export function GoalForm({ item }) {
  const { data, close, mutate, hideGrades } = useApp();
  const [target, setTarget] = useState(
    data.goals.find((g) => g.subject_id === item.subject_id && g.term === item.term)?.target || 8,
  );
  const { busy, error, submit } = useSubmit(close);
  const rows = data.grades.filter((r) => r.subject_id === item.subject_id && r.term === item.term),
    summary = weightedGrades(rows),
    needed = neededGrade(rows, Number(target));
  return (
    <form onSubmit={submit(() => mutate('/grades/goal', { ...item, target }, 'Objectiu desat.'))}>
      <GradePrivacyToggle />
      <Field label="Objectiu de mitjana">
        <input
          type="number"
          min="0"
          max="10"
          step=".1"
          value={target}
          onChange={(e) => setTarget(e.target.value)}
          required
        />
      </Field>
      <div className="goal-preview">
        <span>Mitjana amb les proves avaluades</span>
        <strong>
          <PrivateGrade>{numberLabel(summary.mean)}</PrivateGrade>
        </strong>
        <small>{summary.evaluated}% del trimestre avaluat</small>
        <p>
          {hideGrades ? (
            'La previsió està oculta mentre el mode discret és actiu. Pots continuar ajustant l’objectiu.'
          ) : needed === null ? (
            'Totes les proves ja estan avaluades.'
          ) : needed > 10 ? (
            'Amb els pesos actuals, l’objectiu supera la nota màxima possible de les proves pendents.'
          ) : needed <= 0 ? (
            'Amb les notes actuals ja tens prou aportació per assolir l’objectiu.'
          ) : (
            <>
              Necessites aproximadament <strong>{numberLabel(needed)}</strong> de mitjana en el{' '}
              {100 - summary.evaluated}% pendent.
            </>
          )}
        </p>
      </div>
      <FormError error={error} />
      <FormFooter busy={busy} onCancel={close} />
    </form>
  );
}
export function RestoreForm({ item }) {
  const { close, mutate } = useApp();
  const { busy, error, submit } = useSubmit(close);
  return (
    <form onSubmit={submit(() => mutate('/grades/restore', item, 'Plantilla recuperada.'))}>
      <p>
        Es recuperaran els noms, dates i pesos actuals del delegat. Es conservaran les notes de les
        proves que es puguin relacionar amb la plantilla.
      </p>
      <p className="muted">
        Les activitats personals que no tinguin equivalent es conservaran amb pes 0%. Podràs
        revisar-les i tornar a assignar-los pes.
      </p>
      <FormError error={error} />
      <FormFooter busy={busy} onCancel={close} label="Recuperar plantilla" />
    </form>
  );
}
export { default as BannerForm } from './components/BannerComposer';
