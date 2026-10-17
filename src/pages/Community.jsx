import VerifiedImage from '../components/VerifiedImage';
import Select from '../components/Select';
import React, { useEffect, useState } from 'react';
import { Plus, ArrowRight, NotePencil, ChatCircle, Flag, UsersThree } from '@phosphor-icons/react';
import { useApp } from '../context';
import { PageTitle, Button, Tabs, Empty, RichText, IconButton, VoteButton } from '../ui';
import { dateLabel } from '../../shared/domain';
import { ReferenceArt, Avatar } from '../art';
import { matchesSearch } from '../../shared/search';
import Delegates from '../components/Delegates';

export default function Community() {
  const { data, communityTab: tab, setCommunityTab: setTab, open } = useApp();
  useEffect(() => {
    const selected = document.querySelector('.page-community .tabs [aria-selected="true"]');
    const list = selected?.parentElement;
    if (!list) return;
    const reveal = () => {
      const itemBounds = selected.getBoundingClientRect(),
        listBounds = list.getBoundingClientRect();
      const delta =
        itemBounds.left < listBounds.left
          ? itemBounds.left - listBounds.left
          : itemBounds.right > listBounds.right
            ? itemBounds.right - listBounds.right
            : 0;
      if (delta) list.scrollLeft += delta;
    };
    reveal();
    // Loading a long inbox can introduce a classic scrollbar and narrow the tab list.
    const observer = new ResizeObserver(reveal);
    observer.observe(list);
    return () => observer.disconnect();
  }, [tab]);
  const [status, setStatus] = useState('all');
  const [order, setOrder] = useState('votes');
  const [query, setQuery] = useState('');
  const [scope, setScope] = useState('group');
  const manager = data.user.role !== 'student';
  const group = data.groups.find((g) => g.id === data.user.group_id);
  const announcements = data.announcements.filter((a) => scope === 'group' || !a.group_id);
  const events = data.events.filter(
    (e) =>
      e.kind === 'event' &&
      e.date >= data.today &&
      (scope === 'group' || (e.visibility === 'shared' && !e.group_id)),
  );
  const preview = [...data.proposals].sort((a, b) => b.votes - a.votes).slice(0, 2);
  const proposals = data.proposals
    .filter(
      (p) => (status === 'all' || p.status === status) && matchesSearch(query, p.title, p.body),
    )
    .sort((a, b) =>
      order === 'votes' ? b.votes - a.votes : b.created_at.localeCompare(a.created_at),
    );
  return (
    <>
      <PageTitle title="Comunitat" subtitle="La gent i les coses del teu grup">
        {['notices', 'events'].includes(tab) && (
          <label className="community-group">
            <UsersThree size={24} />
            <Select
              aria-label="Àmbit de la comunitat"
              value={scope}
              onChange={(e) => setScope(e.target.value)}
            >
              <option value="group">
                {group?.name.replace(/^([12])n de batxillerat ([A-Z])$/, '$1n $2') || 'El meu grup'}
              </option>
              <option value="centre">Tot el centre</option>
            </Select>
          </label>
        )}
        {manager && tab === 'notices' && (
          <Button onClick={() => open('announcement')}>
            <Plus size={18} />
            Publicar avís
          </Button>
        )}
        {tab === 'proposals' && (
          <Button variant="primary" onClick={() => open('proposal')}>
            <Plus size={18} />
            Proposa una idea
          </Button>
        )}
      </PageTitle>
      <Tabs
        items={[
          ['notices', 'Tauler'],
          ['events', 'Esdeveniments'],
          ['proposals', 'Propostes'],
          ['delegates', 'Delegats'],
          ['notifications', 'Notificacions'],
        ]}
        value={tab}
        onChange={(next) => {
          setTab(next);
          document.querySelector('.page-community .tabs')?.scrollIntoView({ block: 'nearest' });
        }}
      />
      {tab === 'delegates' ? (
        <Delegates />
      ) : tab === 'notifications' ? (
        <Delegates notificationsOnly />
      ) : tab === 'notices' ? (
        <div className="community-columns">
          <section className="panel notice-feed">
            <h2>{scope === 'group' ? 'Avisos del grup' : 'Avisos del centre'}</h2>
            {announcements.length ? (
              announcements.map((a, index) => (
                <article className="announcement" key={a.id}>
                  <div className="announcement-heading">
                    <ReferenceArt name={index % 2 ? 'document' : 'megaphone'} size={60} />
                    <div>
                      <h2>{a.title}</h2>
                    </div>
                    <span className="announcement-date">
                      {a.created_at.slice(0, 10) === data.today
                        ? 'Avui'
                        : dateLabel(a.created_at.slice(0, 10))}
                    </span>
                    {manager && (
                      <IconButton label="Editar avís" onClick={() => open('announcement', a)}>
                        <NotePencil size={20} />
                      </IconButton>
                    )}
                  </div>
                  <RichText text={a.body} />
                  <div className="card-meta">
                    <Avatar name={a.author} tiny />
                    {a.author}
                    <span className="notice-scope">
                      {a.group_id
                        ? data.groups.find((g) => g.id === a.group_id)?.name
                        : 'Tot el centre'}
                      {a.pinned ? ' · Fixat' : ''}
                    </span>
                  </div>
                </article>
              ))
            ) : (
              <Empty
                title="Sense avisos nous"
                body="Els delegats publicaran aquí les novetats del centre."
              />
            )}
          </section>
          <aside className="panel proposal-preview">
            <div className="section-heading">
              <h2>Propostes</h2>
              <Button variant="ghost" onClick={() => open('proposal')}>
                <Plus size={16} />
                Proposa una idea
              </Button>
            </div>
            <p className="muted">Fem de La Net un lloc millor.</p>
            {preview.map((p) => (
              <article className="proposal-summary" key={p.id}>
                <h3>
                  <button
                    className="proposal-title"
                    onClick={() => {
                      setTab('proposals');
                      setQuery(p.title);
                    }}
                  >
                    {p.title}
                  </button>
                </h3>
                <div>
                  <VoteButton item={p} showCount={false} />
                  <span>{p.votes} vots</span>
                  <span className={'status-badge status-' + p.status.replace(' ', '-')}>
                    {p.status}
                  </span>
                </div>
              </article>
            ))}
            {!preview.length && <p className="empty">Comparteix la primera idea del centre.</p>}
            <button
              className="text-button"
              onClick={() => {
                setTab('proposals');
                setQuery('');
              }}
            >
              Veure totes les propostes <ArrowRight size={17} />
            </button>
          </aside>
        </div>
      ) : tab === 'events' ? (
        <div className="panel community-events">
          <div className="section-heading">
            <h2>Activitats del centre</h2>
            {
              <Button onClick={() => open('event', { kind: 'event', visibility: 'shared' })}>
                <Plus size={17} />
                Afegir activitat
              </Button>
            }
          </div>
          {events.map((e) => (
            <button className="community-event" key={e.id} onClick={() => open('eventDetail', e)}>
              <span className="date-square">
                <small>{dateLabel(e.date, { month: 'short' })}</small>
                <strong>{Number(e.date.slice(8))}</strong>
              </span>
              <span>
                <strong>{e.title}</strong>
                <small>
                  {e.start || 'Tot el dia'}
                  {e.room ? ' · ' + e.room : ''} ·{' '}
                  {e.visibility === 'private' ? 'Privat' : 'Compartit'}
                </small>
              </span>
              <ArrowRight size={19} />
            </button>
          ))}
          {!events.length && (
            <Empty
              title="Encara no hi ha activitats"
              body="També pots afegir un plus al teu calendari privat."
            />
          )}
        </div>
      ) : (
        <>
          <div className="proposal-intro">
            <div>
              <p>Propostes de tot el centre. Vota les que t’ajudarien.</p>
            </div>
            <span>
              {data.proposals.length} propostes · {data.proposals.filter((p) => p.voted).length} amb
              el teu vot
            </span>
          </div>
          <div className="proposal-toolbar">
            <input
              className="proposal-search"
              aria-label="Cercar propostes"
              placeholder="Cerca una proposta…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <Select
              aria-label="Filtrar estat"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              <option value="all">Tots els estats</option>
              {['Proposat', 'En estudi', 'Planificat', 'Fet'].map((s) => (
                <option key={s}>{s}</option>
              ))}
            </Select>
            <Select
              aria-label="Ordenar propostes"
              value={order}
              onChange={(e) => setOrder(e.target.value)}
            >
              <option value="votes">Més votades</option>
              <option value="recent">Més recents</option>
            </Select>
          </div>
          <div className="proposal-list">
            {proposals.length ? (
              proposals.map((p) => (
                <article className="panel proposal-row" key={p.id}>
                  <VoteButton item={p} />
                  <div className="proposal-content">
                    <div className="proposal-heading">
                      <h2>{p.title}</h2>
                      <span className={`status-badge status-${p.status.replace(' ', '-')}`}>
                        {p.status}
                      </span>
                    </div>
                    <RichText text={p.body} />
                    {p.files?.map((f) => (
                      <a key={f.id} href={`/api/files/${f.id}`} target="_blank" rel="noreferrer">
                        <VerifiedImage
                          className="proposal-image"
                          src={`/api/files/${f.id}`}
                          alt="Imatge adjunta a la proposta"
                        />
                      </a>
                    ))}
                    {p.response && (
                      <div className="team-response">
                        <ChatCircle size={18} />
                        <p>
                          <strong>Resposta de l’equip</strong>
                          {p.response}
                        </p>
                      </div>
                    )}
                    <div className="card-meta">
                      <Avatar name={p.author} tiny />
                      {p.author} · {dateLabel(p.created_at.slice(0, 10))}
                      <div className="meta-right row-actions">
                        {p.author_id === data.user.id && (
                          <IconButton label="Editar proposta" onClick={() => open('proposal', p)}>
                            <NotePencil size={18} />
                          </IconButton>
                        )}
                        {manager && (
                          <Button onClick={() => open('proposalResponse', p)}>Gestionar</Button>
                        )}
                        <IconButton
                          label="Informar d’aquesta proposta"
                          onClick={() => open('report', { type: 'proposal', target_id: p.id })}
                        >
                          <Flag size={17} />
                        </IconButton>
                      </div>
                    </div>
                  </div>
                </article>
              ))
            ) : (
              <Empty title="Cap proposta amb aquest filtre">
                <Button onClick={() => open('proposal')}>Compartir una idea</Button>
              </Empty>
            )}
          </div>
        </>
      )}
    </>
  );
}
