import React, { useEffect, useRef, useState } from 'react';
import {
  ShieldCheck,
  Clock,
  CheckCircle,
  ArrowCounterClockwise,
  EnvelopeSimple,
  Warning,
  Bell,
  UsersThree,
  NotePencil,
  Plus,
  CalendarCheck,
  MagnifyingGlass,
} from '@phosphor-icons/react';
import { useApp } from '../context';
import { ReferenceArt } from '../art';
import { Button, Tabs, Empty, Field, FormError, FormFooter, SubjectChip, RichText } from '../ui';
import { useSubmit } from '../form-utils';
import { previewAgenda } from '../api';
import { dateLabel } from '../../shared/domain';
import { eventLabel } from '../../shared/agenda';
import { canManageEvent } from '../../shared/delegation';
import { acknowledgeNotifications } from '../../shared/notifications';
import { matchesSearch } from '../../shared/search';
import '../delegation.css';

export function ConflictNotice({ conflicts }) {
  if (!conflicts.length) return null;
  return (
    <div className="agenda-conflicts" role="status">
      <h4>
        <Warning size={19} />{' '}
        {conflicts.some((c) => c.type === 'duplicate')
          ? 'Possible duplicat'
          : 'Coincidències d’horari'}
      </h4>
      {conflicts.map((c) => (
        <p key={c.id}>
          <strong>{c.title}</strong>
          <span>
            {c.start || 'Tot el dia'}
            {c.end ? '–' + c.end : ''} ·{' '}
            {c.type === 'duplicate'
              ? 'Ja existeix o està pendent de validació'
              : 'Coincideix amb aquesta data'}
          </span>
        </p>
      ))}
    </div>
  );
}
export function AgendaReview({ item }) {
  const { close, mutate, refresh, notify } = useApp();
  const published = item.review_status === 'approved';
  const [preview, setPreview] = useState(null),
    [previewError, setPreviewError] = useState('');
  const [note, setNote] = useState(''),
    [confirmed, setConfirmed] = useState(false),
    [ack, setAck] = useState(''),
    [retry, setRetry] = useState(0),
    [stale, setStale] = useState(false);
  const { busy, error, submit } = useSubmit(close);
  useEffect(() => {
    let live = true;
    previewAgenda({ review_id: item.id })
      .then((r) => {
        if (live) {
          setPreview(r);
          setPreviewError('');
        }
      })
      .catch((e) => {
        if (live) setPreviewError(e.message);
      });
    return () => {
      live = false;
    };
  }, [item.id, retry]);
  const decision = async (action) => {
    const result = await previewAgenda({ review_id: item.id });
    setPreview(result);
    if (
      action === 'approve' &&
      (result.conflicts.some((c) => c.type === 'duplicate') ||
        (result.conflicts.length && ack !== result.conflicts_token))
    )
      throw new Error('Revisa els avisos actualitzats abans d’aprovar.');
    return mutate(
      '/events/' + item.id + '/review',
      { revision: item.revision, decision: action, note, confirmed, conflicts_token: ack },
      action === 'approve'
        ? 'Data validada i publicada. Hem avisat l’autor.'
        : 'Decisió desada. Hem avisat l’autor.',
    ).catch((error) => {
      if (error.status === 409) setStale(true);
      throw error;
    });
  };
  return (
    <form
      className="agenda-review-form"
      onSubmit={submit(() => decision(published ? 'withdraw' : 'approve'))}
    >
      <span className={'agenda-state ' + (published ? 'approved' : 'pending')}>
        <Clock size={17} />{' '}
        {item.review_status === 'approved' ? 'Publicada' : 'Pendent de validació'}
      </span>
      <h3>{item.title}</h3>
      <p>
        {eventLabel(item)} · {dateLabel(item.date)} · {item.start || 'Tot el dia'}
        {item.end ? '–' + item.end : ''}
      </p>
      <p className="muted">Proposat per {item.author}</p>
      <RichText text={item.body} />
      {published && (
        <p>La data és visible a l’agenda. Si la retires, avisarem l’autor amb el motiu.</p>
      )}
      <ConflictNotice conflicts={preview?.conflicts || []} />
      {preview && !preview.conflicts.length && (
        <p className="agenda-clear">Cap duplicat ni coincidència detectats.</p>
      )}
      {previewError && (
        <div role="alert">
          <p>{previewError}</p>
          <Button type="button" onClick={() => setRetry((n) => n + 1)}>
            Tornar a comprovar
          </Button>
        </div>
      )}
      {preview?.conflicts.some((c) => c.type === 'overlap') && (
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={ack === preview.conflicts_token}
            onChange={(e) => setAck(e.target.checked ? preview.conflicts_token : '')}
          />{' '}
          He comprovat les coincidències
        </label>
      )}
      <Field label="Missatge per a l’autor" hint="Obligatori si demanes canvis o retires la data.">
        <textarea
          maxLength={1000}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Què cal confirmar o corregir?"
        />
      </Field>
      {item.review_status === 'pending' && (
        <label className="checkbox-label agenda-truth">
          <input
            type="checkbox"
            checked={confirmed}
            onChange={(e) => setConfirmed(e.target.checked)}
          />{' '}
          Confirmo que la data i el contingut són correctes
        </label>
      )}
      <FormError error={error} />
      {stale && (
        <Button
          type="button"
          disabled={busy}
          onClick={submit(async () => {
            await refresh();
            notify('Panell actualitzat. Revisa l’estat de la proposta.');
          })}
        >
          Actualitzar el panell
        </Button>
      )}
      <FormFooter
        busy={busy}
        onCancel={close}
        label={published ? 'Retirar de l’agenda' : 'Validar i publicar'}
        variant={published ? 'danger' : 'primary'}
        disabled={
          stale ||
          (published
            ? !note.trim()
            : !confirmed ||
              !preview ||
              !!previewError ||
              preview.conflicts.some((c) => c.type === 'duplicate') ||
              (!!preview.conflicts.length && ack !== preview.conflicts_token) ||
              item.review_status !== 'pending')
        }
      >
        {!published && (
          <Button
            type="button"
            disabled={busy || stale || !note.trim()}
            onClick={submit(() => decision('return'))}
          >
            <ArrowCounterClockwise size={18} />
            Demanar canvis
          </Button>
        )}
      </FormFooter>
    </form>
  );
}
function usePanelRefresh() {
  const { refresh } = useApp();
  const [loading, setLoading] = useState(true),
    [loadError, setLoadError] = useState('');
  const firstRead = useRef(null),
    pending = useRef(false);
  useEffect(() => {
    let live = true;
    firstRead.current ||= refresh();
    pending.current = true;
    firstRead.current
      .catch((e) => {
        if (live) setLoadError(e.message);
      })
      .finally(() => {
        if (live) {
          pending.current = false;
          setLoading(false);
        }
      });
    return () => {
      live = false;
    };
  }, [refresh]);
  async function reload() {
    if (pending.current) return;
    pending.current = true;
    setLoading(true);
    setLoadError('');
    try {
      await refresh();
    } catch (e) {
      setLoadError(e.message);
    } finally {
      pending.current = false;
      setLoading(false);
    }
  }
  return { loading, loadError, reload };
}
function NotificationInbox({ queue, onReview }) {
  const { data, open, mutate, setData } = useApp();
  const notifications = data.agendaNotifications || [];
  const events = new Map([...data.events, ...(data.agendaProposals || [])].map((e) => [e.id, e]));
  const { busy, error, submit } = useSubmit();
  const { loading, loadError, reload } = usePanelRefresh();
  async function markRead(ids) {
    if (!ids.length) return;
    await mutate('/agenda/notifications/read', { ids }, 'Avisos marcats com a llegits.', (result) =>
      setData((current) => acknowledgeNotifications(current, result)),
    );
  }
  return (
    <section className="delegate-notifications" aria-label="Notificacions de l’agenda">
      <div className="delegate-section-heading">
        <h2>
          <Bell size={23} /> Notificacions
        </h2>
        <div className="row-actions">
          <Button disabled={loading || busy} onClick={reload}>
            {loading ? 'Actualitzant…' : 'Actualitzar avisos'}
          </Button>
          <Button
            disabled={loading || busy || !notifications.some((n) => !n.read_at)}
            onClick={submit(() =>
              markRead(notifications.filter((n) => !n.read_at).map((n) => n.id)),
            )}
          >
            Marcar com a llegides
          </Button>
        </div>
      </div>
      <FormError error={error || loadError} />
      {queue.length > 0 && (
        <div className="delegate-pending-notice">
          <Clock size={23} />
          <div>
            <strong>
              {queue.length} {queue.length === 1 ? 'proposta pendent' : 'propostes pendents'} de
              validar
            </strong>
            <p>Comprova-les i publica les dates correctes.</p>
            <Button onClick={onReview}>Revisar propostes pendents</Button>
          </div>
        </div>
      )}
      {data.agendaNotificationsMoreUnread && (
        <p role="status">
          Hi ha més avisos sense llegir. La bústia en mostra fins a 100; quan els marquis com a
          llegits, apareixeran els següents. Si falla l’actualització, prem Actualitzar avisos.
        </p>
      )}
      {notifications.length
        ? notifications.map((n) => {
            const event = events.get(n.event_id);
            return (
              <article
                className={'panel agenda-notification ' + (n.read_at ? '' : 'unread')}
                key={n.id}
              >
                <CheckCircle size={24} />
                <div className="agenda-notification-content">
                  <h3>{n.title}</h3>
                  <p>{n.body}</p>
                  <small>
                    <time dateTime={n.created_at}>{dateLabel(n.created_at.slice(0, 10))}</time> ·{' '}
                    {n.read_at ? 'Llegida' : 'Pendent de llegir'}
                  </small>
                  <div className="row-actions">
                    {event ? (
                      <Button
                        onClick={() =>
                          open(
                            event.review_status === 'approved'
                              ? 'eventDetail'
                              : event.owner_id !== data.user.id &&
                                  canManageEvent(data.user, event, data.delegation)
                                ? 'agendaReview'
                                : 'event',
                            event,
                          )
                        }
                      >
                        {event.review_status === 'returned'
                          ? 'Corregir proposta'
                          : event.review_status === 'approved'
                            ? 'Veure data'
                            : 'Veure proposta'}
                      </Button>
                    ) : (
                      <small>La data relacionada ja no està disponible.</small>
                    )}
                    {!n.read_at && (
                      <Button disabled={busy || loading} onClick={submit(() => markRead([n.id]))}>
                        Marcar com a llegida
                      </Button>
                    )}
                  </div>
                </div>
              </article>
            );
          })
        : !loading &&
          !loadError && (
            <Empty
              title="Encara no tens notificacions"
              body="Aquí rebràs el resultat de les teves propostes públiques."
            />
          )}
    </section>
  );
}
export default function Delegates({ notificationsOnly = false }) {
  const { data, open, setCommunityTab, delegateTab, setDelegateTab } = useApp();
  const delegation = data.delegation || { units: [], members: [], managedUnits: [] };
  const manager = delegation.managedUnits.length > 0;
  const proposals = data.agendaProposals || [];
  const queue = proposals.filter(
    (e) => e.review_status === 'pending' && canManageEvent(data.user, e, delegation),
  );
  const shared = data.events.filter((e) => e.visibility === 'shared');
  const mine = [...proposals, ...shared].filter((e) => e.owner_id === data.user.id);
  const published = shared.filter((e) => canManageEvent(data.user, e, delegation));
  const tab = !manager && ['pending', 'published'].includes(delegateTab) ? 'mine' : delegateTab;
  const setTab = setDelegateTab;
  const [query, setQuery] = useState('');
  const source = tab === 'pending' ? queue : tab === 'published' ? published : mine;
  const ordered = source
    .filter((e) => matchesSearch(query, e.title, e.body, e.author))
    .slice()
    .sort((a, b) => {
      const priority = (e) =>
        e.review_status === 'returned'
          ? 0
          : e.review_status === 'pending'
            ? 1
            : e.date >= data.today
              ? 2
              : 3;
      return (
        priority(a) - priority(b) || a.date.localeCompare(b.date) || a.title.localeCompare(b.title)
      );
    });
  function card(e) {
    const manage = canManageEvent(data.user, e, delegation);
    return (
      <article className="panel delegate-proposal" key={e.id}>
        <div className="delegate-proposal-top">
          <span className={'agenda-state ' + e.review_status}>
            {e.review_status === 'pending'
              ? 'Pendent'
              : e.review_status === 'returned'
                ? 'Cal corregir'
                : e.review_status === 'approved'
                  ? 'Publicada'
                  : 'Retirada'}
          </span>
          <span>{eventLabel(e)}</span>
        </div>
        <h3>{e.title}</h3>
        <SubjectChip subject={data.subjects.find((s) => s.id === e.subject_id)} />
        <p>
          {dateLabel(e.date)} · {e.start || 'Tot el dia'}
          {e.end ? '–' + e.end : ''}
        </p>
        <small>Proposat per {e.author}</small>
        {e.review_note && <p className="delegate-feedback">{e.review_note}</p>}
        <div className="row-actions">
          {manage && e.review_status === 'pending' && (
            <Button variant="primary" onClick={() => open('agendaReview', e)}>
              <ShieldCheck size={18} /> Revisar proposta
            </Button>
          )}
          {e.review_status === 'approved' && (
            <Button onClick={() => open('eventDetail', e)}>Veure data</Button>
          )}
          {manage && e.review_status === 'approved' && (
            <Button onClick={() => open('agendaReview', e)}>Revisar o retirar la data</Button>
          )}
          {e.owner_id === data.user.id && (
            <Button onClick={() => open('event', e)}>
              <NotePencil size={18} />{' '}
              {e.review_status === 'returned'
                ? 'Corregir i reenviar'
                : e.review_status === 'approved'
                  ? 'Editar data'
                  : 'Editar proposta'}
            </Button>
          )}
          {e.owner_id === data.user.id && e.review_status === 'pending' && (
            <Button
              onClick={() => open('delete', { resource: 'events', id: e.id, title: e.title })}
            >
              Cancel·lar proposta
            </Button>
          )}
        </div>
      </article>
    );
  }
  if (notificationsOnly)
    return (
      <NotificationInbox
        queue={queue}
        onReview={() => {
          setTab('pending');
          setCommunityTab('delegates');
        }}
      />
    );
  return (
    <DelegatePanel
      {...{
        data,
        delegation,
        manager,
        queue,
        mine,
        tab,
        setTab,
        open,
        query,
        setQuery,
        ordered,
        card,
      }}
    />
  );
}
function DelegatePanel({
  data,
  delegation,
  manager,
  queue,
  mine,
  tab,
  setTab,
  open,
  query,
  setQuery,
  ordered,
  card,
}) {
  const { loading, loadError, reload } = usePanelRefresh();
  return (
    <section className="delegation-hub" aria-label="Delegats i agenda pública">
      <div className="delegate-hero">
        <ReferenceArt name="delegates" size={38} />
        <div>
          <h2>{manager ? 'El teu panell de delegats' : 'Delegats de la comunitat'}</h2>
          <p>
            {manager
              ? 'Publica dates i revisa les propostes de la classe.'
              : 'Proposa dates i troba els teus delegats.'}
          </p>
        </div>
      </div>
      <div className="delegate-panel-actions">
        <Button
          variant="primary"
          aria-label={manager ? 'Publicar una data' : 'Proposar una data'}
          onClick={() => {
            setQuery('');
            open('event', {
              kind: 'exam',
              visibility: 'shared',
              audience_kind: 'class',
              fromDelegatePanel: true,
            });
          }}
        >
          <Plus size={18} /> {manager ? 'Publicar data' : 'Proposar data'}
        </Button>
        <Button
          disabled={loading}
          aria-busy={loading}
          aria-label={loading ? 'Actualitzant…' : 'Actualitzar propostes'}
          onClick={reload}
        >
          {loading ? 'Actualitzant…' : 'Actualitzar'}
        </Button>
      </div>
      <FormError error={loadError} />
      <div className="delegate-stats">
        <span>
          <b>{manager ? queue.length : mine.filter((e) => e.review_status === 'pending').length}</b>
          Per validar
        </span>
        <span>
          <b>{mine.length}</b>Les meves
        </span>
        <span>
          <b>{delegation.members.length}</b>Representants
        </span>
      </div>
      <Tabs
        label="Panell de delegats"
        value={tab}
        onChange={setTab}
        items={[
          ...(manager ? [['pending', 'Per validar', Clock]] : []),
          ...(manager ? [['published', 'Publicades', CalendarCheck]] : []),
          ['mine', 'Les meves propostes', NotePencil],
          ['contacts', 'Contactes', UsersThree],
        ]}
      />
      {tab === 'contacts' ? (
        <div className="delegate-contact-grid">
          {delegation.units.map((unit) => (
            <section
              className={
                'panel delegate-contact ' + (unit.id === delegation.unit ? 'my-class' : '')
              }
              key={unit.id}
            >
              <h3>
                {unit.label}
                {unit.id === delegation.unit && <small>La teva classe</small>}
              </h3>
              {delegation.members
                .filter((m) => m.unit_id === unit.id)
                .map((m) => (
                  <article key={m.email}>
                    <span className="delegate-initials" aria-hidden="true">
                      {m.name
                        .split(' ')
                        .slice(0, 2)
                        .map((s) => s[0])
                        .join('')}
                    </span>
                    <div>
                      <strong>{m.name}</strong>
                      <small>
                        {m.position === 'subdelegate' ? 'Subdelegat/ada' : 'Delegat/ada'} · mateixos
                        permisos
                      </small>
                      <a href={'mailto:' + m.email}>
                        <EnvelopeSimple size={16} />
                        {m.email}
                      </a>
                    </div>
                  </article>
                ))}
              {!delegation.members.some((m) => m.unit_id === unit.id) && (
                <p>Representants pendents d’assignar.</p>
              )}
            </section>
          ))}
        </div>
      ) : (
        <>
          <label className="delegate-search">
            <MagnifyingGlass size={19} aria-hidden="true" />
            <input
              type="search"
              aria-label="Cercar dates del panell"
              placeholder="Cerca pel títol, els detalls o l’autor"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </label>
          <div className="delegate-proposal-grid" aria-busy={loading}>
            {ordered.length ? (
              ordered.map(card)
            ) : loading ? (
              <p role="status">Actualitzant les propostes…</p>
            ) : loadError ? null : query ? (
              <Empty
                title="Cap data coincideix amb la cerca"
                body="Prova un altre text o torna a veure totes les dates."
              >
                <Button onClick={() => setQuery('')}>Netejar la cerca</Button>
              </Empty>
            ) : (
              <Empty
                title={
                  tab === 'pending'
                    ? 'Tot revisat!'
                    : tab === 'published'
                      ? 'Cap data publicada'
                      : 'Cap proposta pendent'
                }
                body={
                  tab === 'pending'
                    ? 'Les propostes noves apareixeran aquí automàticament.'
                    : tab === 'published'
                      ? 'Les dates que publiquis o validis apareixeran aquí.'
                      : 'Pots proposar una data des del botó de dalt.'
                }
              />
            )}
          </div>
        </>
      )}
      <p className="delegate-scope-note">
        Delegats i subdelegats tenen els mateixos permisos de publicació i revisió dins del seu
        àmbit. Les dates privades són personals.
      </p>
    </section>
  );
}
