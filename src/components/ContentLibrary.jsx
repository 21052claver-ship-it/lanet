import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ArrowSquareOut,
  CheckCircle,
  Clock,
  Function as FunctionIcon,
  MagnifyingGlass,
  NotePencil,
  Plus,
  ShieldCheck,
  Toolbox,
  Trash,
} from '@phosphor-icons/react';
import { useApp } from '../context';
import { api } from '../api';
import { Button, Empty, Field, FormError, Modal, SubjectChip, SubjectMark } from '../ui';
import Select from './Select';
import { emptyLibrary, validateLibrary, libraryUrl } from '../../shared/content-library';
import { matchesSearch } from '../../shared/search';

const statusLabel = { draft: 'Esborrany', pending: 'Pendent de revisió', published: 'Publicat' };
const actionLabel = {
  create: 'Creat',
  draft: 'Esborrany desat',
  submit: 'Enviat a revisió',
  approve: 'Aprovat i publicat',
  return: 'Retornat a esborrany',
  withdraw: 'Publicació retirada',
};
const stamp = (value) =>
  new Intl.DateTimeFormat('ca', { dateStyle: 'medium', timeZone: 'Europe/Madrid' }).format(
    new Date(value),
  );

export default function ContentLibrary({ kind }) {
  const { data, subject, notify, enrolled } = useApp();
  const [library, setLibrary] = useState(null),
    [error, setError] = useState(''),
    [loading, setLoading] = useState(true);
  const [query, setQuery] = useState(''),
    [selected, setSelected] = useState('mine'),
    [topic, setTopic] = useState('all'),
    [editorial, setEditorial] = useState(false),
    [detail, setDetail] = useState(null),
    [editor, setEditor] = useState(null),
    [limit, setLimit] = useState(12);
  const generation = useRef(0);
  const load = useCallback(async () => {
    const ticket = ++generation.current;
    try {
      const result = await api('/library');
      if (ticket === generation.current) {
        setLibrary(result);
        setError('');
      }
    } catch (e) {
      if (ticket === generation.current) setError(e.message);
    } finally {
      if (ticket === generation.current) setLoading(false);
    }
  }, []);
  useEffect(() => {
    load();
    const update = () => {
      if (document.visibilityState === 'visible') load();
    };
    const timer = setInterval(update, 30000);
    window.addEventListener('focus', update);
    return () => {
      generation.current++;
      clearInterval(timer);
      window.removeEventListener('focus', update);
    };
  }, [load]);
  const manager = library?.manager && ['delegate', 'admin'].includes(data.user.role);
  const reviewing = !!(manager && editorial);
  const source = reviewing
    ? (library?.editorial || [])
        .filter((e) => e.value.kind === kind)
        .map((e) => ({ ...e.value, entry: e, id: e.id }))
    : (library?.items || []).filter((e) => e.kind === kind);
  const mine =
    data.preferences?.notesSubjects ??
    (enrolled.length ? enrolled : data.subjects).map((s) => s.id);
  const bySubject = source.filter(
    (e) =>
      selected === 'all' ||
      !e.subject_ids.length ||
      e.subject_ids.some((s) => (selected === 'mine' ? mine.includes(s) : s === selected)),
  );
  const topics = [...new Set(bySubject.map((e) => e.topic))].sort((a, b) =>
    a.localeCompare(b, 'ca'),
  );
  const filtered = bySubject.filter(
    (e) =>
      (topic === 'all' || e.topic === topic) &&
      matchesSearch(
        query,
        e.title,
        e.topic,
        e.summary,
        e.source,
        ...e.subject_ids.map((id) => subject(id)?.name || ''),
        ...e.formulas.flatMap((f) => [f.label, f.expression, f.explanation]),
      ),
  );
  function filter(fn) {
    fn();
    setLimit(12);
  }
  async function saved(message) {
    setEditor(null);
    notify(message);
    await load();
  }
  return (
    <>
      <div className="library-heading">
        <div>
          <h2>{kind === 'formula' ? 'Formularis de fórmules' : 'Eines i webs d’ajuda'}</h2>
          <p>
            {kind === 'formula'
              ? 'Per assignatura i tema, amb fonts identificades i formularis revisats del teu grup.'
              : 'Calculadores, simulacions i recursos de llengua per tenir a mà.'}
          </p>
        </div>
        {manager && (
          <div className="library-manage">
            <Button
              aria-pressed={reviewing}
              onClick={() =>
                filter(() => {
                  setEditorial(!editorial);
                  setTopic('all');
                })
              }
            >
              <ShieldCheck size={18} />
              {reviewing ? 'Veure biblioteca' : 'Revisió del grup'}
              {(library?.editorial || []).some(
                (e) => e.value.kind === kind && e.state === 'pending',
              ) && <span className="library-dot" aria-label="Hi ha revisions pendents" />}
            </Button>
            {reviewing && (
              <Button
                variant="primary"
                onClick={() =>
                  setEditor({
                    value: emptyLibrary(kind, kind === 'formula' ? data.subjects[0]?.id : ''),
                  })
                }
              >
                <Plus size={18} />
                {kind === 'formula' ? 'Nou formulari' : 'Nova eina'}
              </Button>
            )}
          </div>
        )}
      </div>
      <div className="library-filters">
        <label className="search-field">
          <MagnifyingGlass size={19} />
          <input
            aria-label="Cercar a la biblioteca"
            placeholder={kind === 'formula' ? 'Cerca fórmules o temes' : 'Cerca una eina o web'}
            value={query}
            onChange={(e) => filter(() => setQuery(e.target.value))}
          />
        </label>
        <Select
          aria-label="Assignatura de la biblioteca"
          value={selected}
          onChange={(e) =>
            filter(() => {
              setSelected(e.target.value);
              setTopic('all');
            })
          }
        >
          <option value="mine">Les meves assignatures</option>
          <option value="all">Totes les assignatures</option>
          {data.subjects.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </Select>
        <Select
          aria-label="Tema de la biblioteca"
          value={topic}
          onChange={(e) => filter(() => setTopic(e.target.value))}
        >
          <option value="all">Tots els temes</option>
          {topics.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </Select>
      </div>
      {error && (
        <div className="library-load-error" role="alert">
          <span>
            {library ? 'No hem pogut actualitzar la biblioteca. ' : ''}
            {error}
          </span>
          <Button onClick={load}>Tornar-ho a provar</Button>
        </div>
      )}
      {loading ? (
        <p role="status">Carregant la biblioteca…</p>
      ) : (
        <>
          <div className="library-caption">
            <p aria-live="polite">
              {filtered.length} {filtered.length === 1 ? 'recurs' : 'recursos'}
              {reviewing ? ' · Gestió del teu grup' : ''}
            </p>
            <span>
              {reviewing
                ? 'Desar → enviar a revisió → aprovar'
                : kind === 'formula'
                  ? 'Fonts educatives i revisió del centre'
                  : 'Els enllaços s’obren en una altra pestanya'}
            </span>
          </div>
          {!!filtered.length && (
            <div className="library-grid">
              {filtered.slice(0, limit).map((item) => (
                <article className="library-card panel" key={item.id}>
                  <div className="library-card-top">
                    <SubjectMark subject={subject(item.subject_ids[0])} />
                    <span>{item.topic}</span>
                  </div>
                  <button
                    className="card-title-button"
                    onClick={() => (reviewing ? setEditor(item.entry) : setDetail(item))}
                  >
                    <h3>{item.title}</h3>
                  </button>
                  <p className="card-description">{item.summary}</p>
                  <div className="library-subjects">
                    {item.subject_ids.map((id) => (
                      <SubjectChip key={id} subject={subject(id)} />
                    ))}
                    {!item.subject_ids.length && <span className="badge">General</span>}
                  </div>
                  <footer>
                    <div className="library-provenance">
                      {reviewing ? (
                        <>
                          <Clock size={16} />
                          {statusLabel[item.entry.state]}
                          {item.entry.published && item.entry.state !== 'published' && (
                            <small>La versió anterior continua publicada</small>
                          )}
                        </>
                      ) : item.origin === 'reviewed' ? (
                        <>
                          <ShieldCheck size={16} />
                          <span>Revisat per {item.reviewer}</span>
                        </>
                      ) : (
                        <>
                          <ArrowSquareOut size={16} />
                          <span>{item.source}</span>
                        </>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      aria-label={`${reviewing ? 'Editar' : 'Consultar'} ${item.title}`}
                      onClick={() => (reviewing ? setEditor(item.entry) : setDetail(item))}
                    >
                      {reviewing ? (
                        <NotePencil size={18} />
                      ) : kind === 'formula' ? (
                        <FunctionIcon size={18} />
                      ) : (
                        <Toolbox size={18} />
                      )}
                      <span>{reviewing ? 'Editar' : 'Consultar'}</span>
                    </Button>
                  </footer>
                </article>
              ))}
            </div>
          )}
          {!filtered.length && (!error || library) && (
            <Empty
              title={reviewing ? 'Cap recurs en aquesta vista' : 'No hem trobat recursos'}
              body={
                reviewing
                  ? 'Crea un recurs del grup o revisa els filtres. Els alumnes només veuen les versions aprovades.'
                  : 'Prova una altra assignatura, un altre tema o una cerca més curta.'
              }
            >
              <Button
                onClick={() => {
                  setQuery('');
                  setSelected('all');
                  setTopic('all');
                }}
              >
                Netejar filtres
              </Button>
            </Empty>
          )}
          {filtered.length > limit && (
            <div className="library-more">
              <Button onClick={() => setLimit((n) => n + 12)}>Mostrar més recursos</Button>
            </div>
          )}
        </>
      )}
      {detail && (
        <Modal open wide title={detail.title} onClose={() => setDetail(null)}>
          <LibraryReading value={detail} metadata={detail} />
        </Modal>
      )}
      {editor && manager && (
        <LibraryEditor
          key={editor.id || 'new'}
          item={editor}
          history={(library?.history || []).filter((h) => h.entry_id === editor.id)}
          onClose={() => setEditor(null)}
          onSaved={saved}
        />
      )}
    </>
  );
}

function LibraryReading({ value, metadata }) {
  const { subject } = useApp();
  let link = '';
  try {
    link = libraryUrl(value.url, false);
  } catch {
    /* Invalid draft URLs are never rendered as links. */
  }
  return (
    <div className="library-reading">
      <div className="library-subjects">
        {value.subject_ids.map((id) => (
          <SubjectChip key={id} subject={subject(id)} />
        ))}
        <span className="badge">{value.topic}</span>
      </div>
      <p>{value.summary}</p>
      {metadata?.origin === 'reviewed' && (
        <p className="library-review-stamp">
          <ShieldCheck size={19} />
          Revisat per {metadata.reviewer} · {stamp(metadata.reviewed_at)}
        </p>
      )}
      {metadata?.origin === 'reference' && (
        <p className="library-source-note">
          Font educativa externa · {value.source}
          {value.language &&
            ` · ${{ ca: 'Català', en: 'Anglès', es: 'Castellà', multi: 'Diversos idiomes' }[value.language] || value.language}`}
          . Enllaç comprovat el {stamp(value.checked_on + 'T12:00:00Z')}.
        </p>
      )}
      {value.formulas.map((f, i) => (
        <section className="formula-block" key={i}>
          <h3>{f.label}</h3>
          <div className="formula-expression">{f.expression}</div>
          <p>{f.explanation}</p>
        </section>
      ))}
      <div className="library-source">
        <strong>Font: {value.source}</strong>
        {link && (
          <a className="button" href={link} target="_blank" rel="noopener noreferrer">
            {value.kind === 'formula' ? 'Obrir la font original' : 'Obrir l’eina o web'}
            <ArrowSquareOut size={18} />
            <span className="sr-only"> (s’obre en una altra pestanya)</span>
          </a>
        )}
      </div>
    </div>
  );
}

function LibraryEditor({ item, history, onClose, onSaved }) {
  const { data } = useApp();
  const [value, setValue] = useState(item.value),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false),
    [preview, setPreview] = useState(false),
    [previous, setPrevious] = useState(false);
  const pending = useRef(false);
  const dirty = JSON.stringify(value) !== JSON.stringify(item.value);
  useEffect(() => {
    if (!dirty) return;
    const warn = (e) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);
  function close() {
    if (pending.current) return;
    if (!dirty || window.confirm('Vols tancar sense desar els canvis?')) onClose();
  }
  const update = (key, v) => setValue((old) => ({ ...old, [key]: v }));
  const formula = (index, key, v) =>
    update(
      'formulas',
      value.formulas.map((f, i) => (i === index ? { ...f, [key]: v } : f)),
    );
  async function write(action, review = false) {
    if (pending.current) return;
    setError('');
    if (review && dirty) {
      setError('Desa i envia els canvis a revisió abans de prendre una decisió.');
      return;
    }
    if (
      action === 'withdraw' &&
      !window.confirm('Vols retirar la versió publicada? L’esborrany i l’historial es conservaran.')
    )
      return;
    try {
      const content = review
        ? null
        : validateLibrary(
            value,
            data.subjects.map((s) => s.id),
          );
      pending.current = true;
      setBusy(true);
      await api(item.id ? `/library/${item.id}${review ? '/review' : ''}` : '/library', {
        method: review || !item.id ? 'POST' : 'PUT',
        body: review
          ? { revision: item.revision, decision: action }
          : { ...(item.id ? { revision: item.revision } : {}), value: content, action },
      });
      await onSaved(
        review
          ? actionLabel[action]
          : 'Recurs desat' + (action === 'submit' ? ' i enviat a revisió.' : '.'),
      );
    } catch (e) {
      setError(e.message);
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }
  const kind = value.kind;
  return (
    <Modal
      open
      wide
      title={
        item.id
          ? 'Gestionar recurs'
          : kind === 'formula'
            ? 'Nou formulari de fórmules'
            : 'Nova eina o web'
      }
      onClose={close}
    >
      <div className="library-editor">
        <p className="library-editor-state">
          <ShieldCheck size={18} />
          {item.id ? statusLabel[item.state] : 'Nou esborrany'} · Només per als delegats i
          administradors del grup.
        </p>
        {item.published && (
          <p className="library-source-note">
            {item.state === 'published'
              ? 'Les edicions quedaran pendents d’una nova revisió.'
              : 'La versió aprovada continua visible mentre es prepara aquesta edició.'}
          </p>
        )}
        <div className="library-editor-views">
          <Button
            aria-pressed={!preview && !previous}
            onClick={() => {
              setPreview(false);
              setPrevious(false);
            }}
          >
            Editar
          </Button>
          <Button
            aria-pressed={preview && !previous}
            onClick={() => {
              setPreview(true);
              setPrevious(false);
            }}
          >
            Previsualitzar
          </Button>
          {item.published && (
            <Button
              aria-pressed={previous}
              onClick={() => {
                setPrevious(true);
                setPreview(true);
              }}
            >
              Versió publicada
            </Button>
          )}
        </div>
        {preview ? (
          <LibraryReading value={previous ? item.published : value} />
        ) : (
          <fieldset disabled={busy} className="library-fields">
            <Field label="Títol del recurs">
              <input
                value={value.title}
                maxLength={100}
                onChange={(e) => update('title', e.target.value)}
              />
            </Field>
            <div className="library-form-row">
              <Field label="Assignatura del recurs">
                <Select
                  value={value.subject_ids[0] || ''}
                  onChange={(e) => update('subject_ids', e.target.value ? [e.target.value] : [])}
                >
                  {kind === 'tool' && <option value="">General · totes</option>}
                  {data.subjects.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Tema del recurs">
                <input
                  value={value.topic}
                  maxLength={80}
                  placeholder={kind === 'formula' ? 'Ex. Derivades' : 'Ex. Simulacions'}
                  onChange={(e) => update('topic', e.target.value)}
                />
              </Field>
            </div>
            <Field label="Resum del recurs">
              <textarea
                rows={3}
                value={value.summary}
                maxLength={600}
                onChange={(e) => update('summary', e.target.value)}
              />
            </Field>
            <Field
              label="Font o bibliografia"
              hint="Identifica el llibre, la institució o l’autor utilitzat per revisar el contingut."
            >
              <input
                value={value.source}
                maxLength={160}
                onChange={(e) => update('source', e.target.value)}
              />
            </Field>
            <Field
              label="Enllaç de la font"
              hint={
                kind === 'formula'
                  ? 'HTTPS. Opcional si escrius les fórmules amb la seva explicació.'
                  : 'Enllaç HTTPS complet a l’eina o web.'
              }
            >
              <input
                type="url"
                value={value.url}
                placeholder="https://…"
                maxLength={1800}
                onChange={(e) => update('url', e.target.value)}
              />
            </Field>
            {kind === 'formula' && (
              <div className="library-formulas-editor">
                <h3>Fórmules del tema</h3>
                <p>
                  Inclou la notació, el significat de les variables i les condicions d’ús. Pots fer
                  servir símbols com ∑, √, ² o π.
                </p>
                {value.formulas.map((f, i) => (
                  <section className="formula-edit" key={i}>
                    <div className="formula-edit-top">
                      <strong>Fórmula {i + 1}</strong>
                      <Button
                        aria-label={`Eliminar fórmula ${i + 1}`}
                        onClick={() =>
                          update(
                            'formulas',
                            value.formulas.filter((_, j) => j !== i),
                          )
                        }
                      >
                        <Trash size={17} />
                      </Button>
                    </div>
                    <Field label={`Nom de la fórmula ${i + 1}`}>
                      <input
                        maxLength={100}
                        value={f.label}
                        onChange={(e) => formula(i, 'label', e.target.value)}
                      />
                    </Field>
                    <Field label={`Expressió de la fórmula ${i + 1}`}>
                      <textarea
                        className="formula-input"
                        rows={2}
                        maxLength={500}
                        value={f.expression}
                        placeholder="Ex. v = v₀ + a·t"
                        onChange={(e) => formula(i, 'expression', e.target.value)}
                      />
                    </Field>
                    <Field label={`Explicació de la fórmula ${i + 1}`}>
                      <textarea
                        rows={3}
                        maxLength={1000}
                        value={f.explanation}
                        onChange={(e) => formula(i, 'explanation', e.target.value)}
                      />
                    </Field>
                  </section>
                ))}
                <Button
                  disabled={value.formulas.length >= 24}
                  onClick={() =>
                    update('formulas', [
                      ...value.formulas,
                      { label: '', expression: '', explanation: '' },
                    ])
                  }
                >
                  <Plus size={18} />
                  Afegir fórmula
                </Button>
              </div>
            )}
          </fieldset>
        )}
        <FormError error={error} />
        {item.state === 'pending' && !dirty && (
          <div className="library-review-actions">
            <p>
              Comprova les fórmules, les variables, les condicions i la font abans d’aprovar. La
              revisió quedarà signada amb el teu nom de Google.
            </p>
            {previous && (
              <Button
                onClick={() => {
                  setPrevious(false);
                  setPreview(true);
                }}
              >
                Revisar versió pendent
              </Button>
            )}
            <Button
              busy={busy}
              disabled={previous}
              variant="primary"
              onClick={() => write('approve', true)}
            >
              <CheckCircle size={18} />
              Aprovar i publicar
            </Button>
            <Button disabled={busy} onClick={() => write('return', true)}>
              Retornar a esborrany
            </Button>
          </div>
        )}
        <div className="library-editor-actions">
          <Button disabled={busy} onClick={close}>
            Tancar
          </Button>
          <Button busy={busy} onClick={() => write('draft')}>
            Desar esborrany
          </Button>
          <Button busy={busy} variant="primary" onClick={() => write('submit')}>
            Enviar a revisió
          </Button>
        </div>
        {item.published && (
          <Button disabled={busy || dirty} variant="ghost" onClick={() => write('withdraw', true)}>
            Retirar publicació
          </Button>
        )}
        {!!history.length && (
          <details className="library-history">
            <summary>Historial de revisions</summary>
            <ol>
              {history.slice(0, 25).map((h) => (
                <li key={h.revision}>
                  <strong>{actionLabel[h.action]}</strong> · {h.actor} · {stamp(h.created_at)} · v
                  {h.revision}
                </li>
              ))}
            </ol>
          </details>
        )}
      </div>
    </Modal>
  );
}
