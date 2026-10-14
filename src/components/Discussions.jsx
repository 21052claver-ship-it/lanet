import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ChatCircle,
  CheckCircle,
  ArrowRight,
  ArrowLeft,
  Plus,
  Flag,
  Trash,
  PaperPlaneTilt,
  ArrowClockwise,
  BookOpen,
} from '@phosphor-icons/react';
import { api } from '../api';
import { useApp } from '../context';
import { Button, Empty, Field, FormError, RichText } from '../ui';
import Select from './Select';
import { useSubmit } from '../form-utils';
import { clientId } from '../../shared/client-id';
import {
  readLocalJSON,
  writeLocalJSON,
  removeLocalJSONIfUnchanged,
} from '../../shared/local-state';
import { matchesSearch } from '../../shared/search';
import '../workspace.css';

const changed = () => window.dispatchEvent(new Event('lanet:discussions'));
const stamp = (value) =>
  new Intl.DateTimeFormat('ca', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value));
function useRooms(subjectId) {
  const [state, setState] = useState({ rooms: [], loading: true, error: '' });
  const [attempt, retry] = useState(0);
  useEffect(() => {
    let active = true;
    setState({ rooms: [], loading: true, error: '' });
    api('/discussions/rooms?subject=' + encodeURIComponent(subjectId))
      .then((result) => {
        if (active) setState({ ...result, loading: false, error: '' });
      })
      .catch((e) => {
        if (active) setState({ rooms: [], loading: false, error: e.message });
      });
    return () => {
      active = false;
    };
  }, [subjectId, attempt]);
  return { ...state, retry: () => retry((n) => n + 1) };
}
const roomLabel = (room) =>
  `${room.group_name} · ${room.variant || 'Grup'}${room.teacher ? ' · ' + room.teacher : ''}`;

export default function Discussions({ subjectId }) {
  const { open } = useApp();
  const { rooms, loading, error, retry } = useRooms(subjectId);
  const [selected, setSelected] = useState(''),
    [query, setQuery] = useState(''),
    [search, setSearch] = useState(''),
    [filter, setFilter] = useState('all');
  const room = rooms.find((r) => r.id === selected) || rooms[0];
  const [state, setState] = useState({ items: [], next: null, loading: true, error: '' });
  const generation = useRef(0),
    morePending = useRef(false),
    browsingHistory = useRef(false);
  useEffect(() => {
    const timer = setTimeout(() => setSearch(query), 250);
    return () => clearTimeout(timer);
  }, [query]);
  const queryPath = room
    ? '/discussions?room=' +
      encodeURIComponent(room.id) +
      '&q=' +
      encodeURIComponent(search) +
      '&state=' +
      filter
    : '';
  const load = useCallback(async () => {
    if (!room) return;
    const ticket = ++generation.current;
    try {
      const result = await api(queryPath);
      if (ticket === generation.current) setState({ ...result, loading: false, error: '' });
    } catch (e) {
      if (ticket === generation.current)
        setState((s) => ({ ...s, loading: false, error: e.message }));
    }
  }, [queryPath]);
  useEffect(() => {
    setState({ items: [], next: null, loading: true, error: '' });
    browsingHistory.current = false;
    load();
    const refresh = () => {
      if (document.visibilityState === 'visible' && !browsingHistory.current) load();
    };
    const timer = setInterval(refresh, 15000);
    window.addEventListener('lanet:discussions', refresh);
    window.addEventListener('focus', refresh);
    return () => {
      generation.current++;
      clearInterval(timer);
      window.removeEventListener('lanet:discussions', refresh);
      window.removeEventListener('focus', refresh);
    };
  }, [load]);
  async function more() {
    if (morePending.current || !state.next) return;
    morePending.current = true;
    const ticket = generation.current;
    try {
      const result = await api(queryPath + '&before=' + state.next);
      if (ticket === generation.current) {
        browsingHistory.current = true;
        setState((s) => ({
          ...s,
          items: [...new Map([...s.items, ...result.items].map((t) => [t.id, t])).values()],
          next: result.next,
          error: '',
        }));
      }
    } catch (e) {
      setState((s) => ({ ...s, error: e.message }));
    } finally {
      morePending.current = false;
    }
  }
  if (loading) return <p role="status">Carregant el teu grup…</p>;
  if (error)
    return (
      <div role="alert">
        <p>{error}</p>
        <Button onClick={retry}>Tornar-ho a provar</Button>
      </div>
    );
  if (!rooms.length)
    return (
      <Empty
        title="Aquest espai no forma part del teu curs"
        body="Pots consultar els materials. Per participar en dubtes, configura les assignatures i variants del teu horari."
      />
    );
  const visible = state.items.filter(
    (t) =>
      (filter === 'all' || (filter === 'open' ? !t.resolved : !!t.resolved)) &&
      matchesSearch(query, t.title, t.body, t.author, t.note_title),
  );
  return (
    <div className="discussions">
      <div className="library-heading">
        <div>
          <h2>Dubtes del teu grup</h2>
          <p>
            Una pregunta per fil. Enllaça el material i marca-la com a resolta quan ho entenguis.
          </p>
        </div>
        <Button
          variant="primary"
          onClick={() => open('discussionNew', { subject_id: subjectId, offering_id: room.id })}
        >
          <Plus size={18} /> Nou dubte
        </Button>
      </div>
      <div className="discussion-room">
        <ChatCircle size={23} />
        {rooms.length === 1 ? (
          <strong>{roomLabel(room)}</strong>
        ) : (
          <Select
            aria-label="Grup de dubtes"
            value={room.id}
            onChange={(e) => setSelected(e.target.value)}
          >
            {rooms.map((r) => (
              <option key={r.id} value={r.id}>
                {roomLabel(r)}
              </option>
            ))}
          </Select>
        )}
        <span>Només les persones d’aquest espai</span>
      </div>
      <div className="discussion-filters">
        <input
          aria-label="Cercar dubtes"
          placeholder="Cerca un dubte o un material…"
          value={query}
          maxLength={100}
          onChange={(e) => setQuery(e.target.value)}
        />
        <Select
          aria-label="Estat dels dubtes"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        >
          <option value="all">Tots els dubtes</option>
          <option value="open">Per resoldre</option>
          <option value="resolved">Resolts</option>
        </Select>
      </div>
      {state.error && (
        <div role="alert">
          <p>{state.error}</p>
          <Button onClick={load}>Tornar-ho a provar</Button>
        </div>
      )}
      {state.loading ? (
        <p role="status">Carregant dubtes…</p>
      ) : visible.length ? (
        <div className="discussion-list">
          {visible.map((t) => (
            <button
              key={t.id}
              className="discussion-card panel"
              onClick={() => open('discussion', { id: t.id })}
            >
              <span className={'discussion-state ' + (t.resolved ? 'resolved' : '')}>
                {t.resolved ? <CheckCircle size={17} /> : <ChatCircle size={17} />}{' '}
                {t.resolved ? 'Resolt' : 'Per resoldre'}
              </span>
              <strong>{t.title}</strong>
              <span className="discussion-excerpt">{t.body}</span>
              {t.note_title && (
                <span className="discussion-reference">
                  <BookOpen size={15} /> {t.note_title}
                </span>
              )}
              <small>
                {t.author} · {t.replies} {t.replies === 1 ? 'resposta' : 'respostes'}
              </small>
              <ArrowRight size={18} />
            </button>
          ))}
        </div>
      ) : (
        <Empty
          title={query ? 'Cap dubte coincideix' : 'Encara no hi ha dubtes aquí'}
          body="Pregunta sobre un exercici, un tema o un material. Els teus companys et podran respondre."
        />
      )}
      {state.next && <Button onClick={more}>Carregar dubtes anteriors</Button>}
      {browsingHistory.current && (
        <p className="muted">
          Estàs consultant fils anteriors.{' '}
          <Button
            onClick={() => {
              browsingHistory.current = false;
              load();
            }}
          >
            Actualitzar dubtes
          </Button>
        </p>
      )}
    </div>
  );
}

export function DiscussionNew({ item }) {
  const { data, open, notify } = useApp();
  const { rooms, loading, error: roomsError, retry } = useRooms(item.subject_id);
  const [selected, setSelected] = useState(item.offering_id || '');
  const room = rooms.find((r) => r.id === selected) || rooms[0];
  const key = `lanet.discussionDraft.${data.user.id}.${room?.id || item.subject_id}`;
  return loading ? (
    <p role="status">Carregant el teu grup…</p>
  ) : roomsError ? (
    <div role="alert">
      <p>{roomsError}</p>
      <Button onClick={retry}>Tornar-ho a provar</Button>
    </div>
  ) : !room ? (
    <Empty
      title="No tens matrícula en aquesta assignatura"
      body="Configura el teu curs per participar en els dubtes del grup."
    />
  ) : (
    <>
      {rooms.length > 1 && (
        <Field label="Grup de dubtes">
          <Select value={room.id} onChange={(e) => setSelected(e.target.value)}>
            {rooms.map((r) => (
              <option key={r.id} value={r.id}>
                {roomLabel(r)}
              </option>
            ))}
          </Select>
        </Field>
      )}
      <p className="discussion-privacy">{roomLabel(room)} · Visible només en aquest espai.</p>
      <DiscussionComposer
        key={key}
        storageKey={key}
        subjectId={item.subject_id}
        noteId={item.note_id}
        send={(draft) =>
          api('/discussions', { method: 'POST', body: { ...draft, offering_id: room.id } })
        }
        onSent={(result) => {
          changed();
          notify('Dubte publicat.');
          open('discussion', { id: result.id });
        }}
      />
    </>
  );
}
function DiscussionComposer({ storageKey, subjectId, noteId, send, onSent, reply = false }) {
  const { data } = useApp();
  const [draft, setDraft] = useState(
    () =>
      readLocalJSON(storageKey, null) || {
        id: clientId(),
        title: '',
        body: '',
        note_id: noteId || '',
      },
  );
  const [remembered, setRemembered] = useState(true);
  const [restored, setRestored] = useState(() => !!readLocalJSON(storageKey, null)?.body);
  const { busy, error, submit } = useSubmit();
  useEffect(() => {
    setRemembered(writeLocalJSON(storageKey, draft));
  }, [storageKey, draft]);
  function edit(field, value) {
    setDraft((d) => ({ ...d, [field]: value, id: clientId() }));
  }
  return (
    <form
      className="discussion-composer"
      onSubmit={submit(async () => {
        const submitted = { ...draft },
          result = await send(submitted);
        removeLocalJSONIfUnchanged(storageKey, submitted);
        setDraft({ id: clientId(), title: '', body: '', note_id: '' });
        onSent(result);
      })}
    >
      {restored && (
        <div className="editor-draft-hint">
          <p>Hem recuperat el teu esborrany. Revisa el material relacionat abans d’enviar.</p>
          <Button
            type="button"
            disabled={busy}
            onClick={() => {
              setDraft({ id: clientId(), title: '', body: '', note_id: noteId || '' });
              setRestored(false);
            }}
          >
            Començar de nou
          </Button>
        </div>
      )}
      <fieldset disabled={busy}>
        {!reply && (
          <Field label="Títol del dubte">
            <input
              required
              maxLength={120}
              value={draft.title}
              placeholder="Què necessites entendre?"
              onChange={(e) => edit('title', e.target.value)}
            />
          </Field>
        )}
        {!reply && (
          <Field label="Material relacionat (opcional)">
            <Select value={draft.note_id || ''} onChange={(e) => edit('note_id', e.target.value)}>
              <option value="">Dubte sobre el tema, sense material</option>
              {data.notes
                .filter((n) => n.subject_id === subjectId && n.status === 'published')
                .map((n) => (
                  <option key={n.id} value={n.id}>
                    {n.title}
                  </option>
                ))}
            </Select>
          </Field>
        )}
        <Field
          label={reply ? 'La teva resposta' : 'Explica el dubte'}
          hint={
            reply
              ? undefined
              : 'Per compartir fotos o documents, afegeix-los a Materials i enllaça el material al dubte.'
          }
        >
          <textarea
            required
            rows={reply ? 3 : 5}
            maxLength={4000}
            value={draft.body}
            placeholder={
              reply ? 'Ajuda amb una explicació…' : 'Què has provat i en quin pas t’has encallat?'
            }
            onChange={(e) => edit('body', e.target.value)}
          />
        </Field>
      </fieldset>
      {!remembered && <p role="status">No es pot recordar l’esborrany en aquest navegador.</p>}
      <FormError error={error} />
      <div className="discussion-send">
        <small>
          {draft.body.length}/4000 ·{' '}
          {remembered ? 'Esborrany en aquest dispositiu' : 'Sense còpia local'}
        </small>
        <Button type="submit" variant="primary" busy={busy}>
          <PaperPlaneTilt size={18} />
          {reply ? 'Enviar resposta' : 'Publicar dubte'}
        </Button>
      </div>
    </form>
  );
}

export function DiscussionDetail({ item }) {
  const { data, open, notify } = useApp();
  const [state, setState] = useState(null),
    [error, setError] = useState(''),
    [updates, setUpdates] = useState(null),
    [reporting, setReporting] = useState(false),
    [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const generation = useRef(0),
    current = useRef(null),
    pending = useRef(false);
  current.current = state;
  const load = useCallback(
    async (quiet = false) => {
      if (quiet && pending.current) return;
      const ticket = ++generation.current;
      try {
        const result = await api('/discussions/' + item.id);
        if (ticket !== generation.current) return;
        setError('');
        if (quiet && current.current) {
          if (
            JSON.stringify([result.thread, result.replies]) !==
            JSON.stringify([current.current.thread, current.current.replies.slice(-50)])
          )
            setUpdates(result);
        } else {
          setState(result);
          setUpdates(null);
        }
      } catch (e) {
        if (ticket === generation.current) setError(e.message);
      }
    },
    [item.id],
  );
  useEffect(() => {
    load();
    const refresh = () => {
      if (document.visibilityState === 'visible') load(true);
    };
    const timer = setInterval(refresh, 15000);
    window.addEventListener('focus', refresh);
    return () => {
      generation.current++;
      clearInterval(timer);
      window.removeEventListener('focus', refresh);
    };
  }, [load]);
  async function action(path, body, method = 'POST') {
    if (pending.current) return;
    pending.current = true;
    setBusy(true);
    setError('');
    try {
      await api('/discussions/' + item.id + path, { method, body });
      changed();
      await load();
    } catch (e) {
      setError(e.message);
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }
  async function older() {
    if (pending.current || !state?.next) return;
    pending.current = true;
    setBusy(true);
    const ticket = generation.current;
    try {
      const result = await api('/discussions/' + item.id + '?before=' + state.next);
      if (ticket === generation.current)
        setState((s) => ({ ...s, next: result.next, replies: [...result.replies, ...s.replies] }));
    } catch (e) {
      setError(e.message);
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }
  if (!state)
    return (
      <>
        <FormError error={error} />
        {error ? (
          <Button onClick={() => load()}>Tornar-ho a provar</Button>
        ) : (
          <p role="status">Carregant el fil…</p>
        )}
      </>
    );
  const t = state.thread,
    note = data.notes.find((n) => n.id === t.note_id);
  return (
    <div className="discussion-detail">
      <p className="discussion-privacy">
        {roomLabel(state.room)} · {t.resolved ? 'Resolt' : 'Per resoldre'}
      </p>
      <h2>{t.title}</h2>
      <p className="discussion-author">
        {t.author} · {stamp(t.created_at)}
      </p>
      <RichText text={t.body} />
      {note && (
        <Button onClick={() => open('reader', note)}>
          <BookOpen size={18} /> Obrir material: {note.title}
        </Button>
      )}
      {t.note_id && !note && <p className="muted">El material relacionat ja no està disponible.</p>}
      <div className="discussion-controls">
        {t.can_manage && (
          <Button busy={busy} onClick={() => action('/resolve', { resolved: !t.resolved })}>
            <CheckCircle size={18} />
            {t.resolved ? 'Reobrir dubte' : 'Marcar com a resolt'}
          </Button>
        )}
        <Button onClick={() => setReporting(!reporting)}>
          <Flag size={16} /> Informar
        </Button>
        {t.can_manage && (
          <Button
            variant="ghost"
            busy={busy}
            onClick={async () => {
              if (!confirm('Retirar aquest dubte i ocultar el fil?')) return;
              try {
                await api('/discussions/' + t.id, { method: 'DELETE' });
                changed();
                notify('Dubte retirat.');
                open('discussionNew', {
                  subject_id: state.room.subject_id,
                  offering_id: state.room.id,
                });
              } catch (e) {
                setError(e.message);
              }
            }}
          >
            <Trash size={16} /> Retirar dubte
          </Button>
        )}
      </div>
      {reporting && (
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            if (pending.current) return;
            pending.current = true;
            setBusy(true);
            try {
              await api('/discussions/' + t.id + '/report', { method: 'POST', body: { reason } });
              setReporting(false);
              setReason('');
              notify('Informe enviat a revisió.');
            } catch (e) {
              setError(e.message);
            } finally {
              pending.current = false;
              setBusy(false);
            }
          }}
        >
          <Field label="Motiu de l’informe">
            <textarea
              required
              maxLength={1000}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </Field>
          <Button type="submit" busy={busy}>
            Enviar informe
          </Button>
        </form>
      )}
      <FormError error={error} />
      <section className="discussion-replies" aria-label="Respostes del dubte">
        <h3>Respostes</h3>
        {state.next && (
          <Button busy={busy} onClick={older}>
            <ArrowLeft size={16} /> Mostrar respostes anteriors
          </Button>
        )}
        {!state.replies.length && (
          <p className="muted">Encara no hi ha respostes. Comparteix el que saps.</p>
        )}
        {state.replies.map((r) => (
          <article
            key={r.id}
            className={'discussion-reply ' + (r.author_id === data.user.id ? 'own' : '')}
          >
            <header>
              <strong>{r.author}</strong>
              <time>{stamp(r.created_at)}</time>
              {r.can_manage && !r.deleted && (
                <button
                  className="icon-button"
                  aria-label={'Retirar resposta de ' + r.author}
                  disabled={busy}
                  onClick={() => {
                    if (confirm('Retirar aquesta resposta?'))
                      action('/reply/' + r.id, undefined, 'DELETE');
                  }}
                >
                  <Trash size={16} />
                </button>
              )}
            </header>
            {r.deleted ? <p className="muted">Missatge retirat.</p> : <RichText text={r.body} />}
          </article>
        ))}
        {updates && (
          <Button
            onClick={() => {
              setState((s) => ({
                ...updates,
                replies: [
                  ...new Map([...s.replies, ...updates.replies].map((r) => [r.id, r])).values(),
                ],
                next: s.next,
              }));
              setUpdates(null);
            }}
          >
            <ArrowClockwise size={18} /> Hi ha canvis al fil · Mostrar
          </Button>
        )}
      </section>
      {t.resolved ? (
        <p className="discussion-resolved">
          <CheckCircle size={20} /> Dubte resolt. Es pot reobrir si cal continuar.
        </p>
      ) : (
        <DiscussionComposer
          storageKey={`lanet.discussionReply.${data.user.id}.${t.id}`}
          reply
          send={(draft) =>
            api('/discussions/' + t.id + '/reply', {
              method: 'POST',
              body: { id: draft.id, body: draft.body },
            })
          }
          onSent={() => {
            changed();
            load();
          }}
        />
      )}
    </div>
  );
}
