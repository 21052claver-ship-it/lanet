import React, { useState } from 'react';
import SubjectFilter from '../components/SubjectFilter';
import {
  Plus,
  MagnifyingGlass,
  Clock,
  MapPin,
  ArrowRight,
  CalendarPlus,
} from '@phosphor-icons/react';
import { useApp } from '../context';
import {
  PageTitle,
  Button,
  Tabs,
  SubjectChip,
  SubjectIcon,
  LikeButton,
  SaveButton,
  Empty,
} from '../ui';
import { dateLabel } from '../../shared/domain';
import { ActivityArt, Avatar } from '../art';
import { matchesSearch } from '../../shared/search';
export default function Pluses() {
  const { data, enrolled, subject, open, mutate } = useApp();
  const [tab, setTab] = useState('upcoming'),
    [query, setQuery] = useState(''),
    [filtersOpen, setFiltersOpen] = useState(false);
  const filters =
    data.preferences?.plusSubjects ?? (enrolled.length ? enrolled : data.subjects).map((s) => s.id);
  const items = data.pluses.filter(
    (p) =>
      (tab === 'saved'
        ? p.saved
        : tab === 'mine'
          ? p.author_id === data.user.id
          : p.status === 'published' && p.date >= data.today) &&
      p.subjects.some((s) => filters.includes(s.subject_id)) &&
      matchesSearch(
        query,
        p.title,
        p.body,
        p.place,
        p.author,
        ...p.subjects.map((s) => subject(s.subject_id)?.name),
      ),
  );
  items.sort((a, b) => (a.date + (a.start || '')).localeCompare(b.date + (b.start || '')));
  async function reaction(p, action) {
    try {
      await mutate(`/pluses/${p.id}/${action}`, {
        active: action === 'like' ? !p.liked : !p.saved,
      });
    } catch {}
  }
  return (
    <>
      <PageTitle title="Plusos" subtitle="Activitats que poden sumar al teu curs">
        <Button variant="primary" onClick={() => open('plus')}>
          <Plus size={18} />
          Publica un plus
        </Button>
      </PageTitle>
      <div className="resource-toolbar">
        <Tabs
          items={[
            ['upcoming', 'Propers'],
            ['saved', 'Desats'],
            ['mine', 'Els meus'],
          ]}
          value={tab}
          onChange={setTab}
        />
      </div>
      <div className="resource-filters">
        <label className="search-field">
          <MagnifyingGlass size={19} />
          <input
            aria-label="Cercar plusos"
            placeholder="Cerca una activitat…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
        <SubjectFilter
          kind="pluses"
          value={filters}
          expanded={filtersOpen}
          onExpandedChange={setFiltersOpen}
        />
      </div>
      <p className="results-label" aria-live="polite">
        {items.length} {items.length === 1 ? 'activitat' : 'activitats'}
      </p>
      {items.length ? (
        <div className="pluses-grid">
          {items.map((p) => (
            <article className="plus-card panel" key={p.id}>
              <div className="plus-save">
                <SaveButton item={p} onClick={() => reaction(p, 'save')} />
              </div>
              <button
                className="plus-visual"
                style={{
                  background:
                    p.subjects[0]?.subject_id === 'phy'
                      ? '#eae7f9'
                      : p.subjects[0]?.subject_id === 'chem'
                        ? '#f5e2e9'
                        : '#ede4ec',
                }}
                onClick={() => open('plusDetail', p)}
                aria-label={`Veure ${p.title}`}
              >
                <span className="plus-date">
                  <strong>{Number(p.date.slice(8))}</strong>
                  <small>{dateLabel(p.date, { month: 'short' }).replace('.', '')}</small>
                </span>
                <ActivityArt subjectId={p.subjects[0]?.subject_id} />
              </button>
              <div className="plus-body">
                <button
                  className="card-title-button"
                  aria-label={`Obrir ${p.title}`}
                  onClick={() => open('plusDetail', p)}
                >
                  <h2>{p.title}</h2>
                </button>
                <div className="card-tags">
                  {p.subjects.map((s) => (
                    <SubjectChip key={s.subject_id} subject={subject(s.subject_id)} />
                  ))}
                </div>
                <div className="plus-facts">
                  <span>
                    <Clock size={17} />
                    {p.start || 'Hora per confirmar'}
                    {p.end ? ' — ' + p.end : ''}
                  </span>
                  <span>
                    <MapPin size={17} />
                    {p.place}
                  </span>
                </div>
                <div className={`plus-bonus ${p.subjects.length === 1 ? 'single-subject' : ''}`}>
                  <small>Plus indicat</small>
                  {p.subjects.map((s) => (
                    <strong key={s.subject_id}>
                      {s.bonus}{' '}
                      {p.subjects.length > 1 && <span>en {subject(s.subject_id)?.short}</span>}
                    </strong>
                  ))}
                </div>
                <div className="card-meta">
                  <Avatar name={p.author} tiny />
                  {p.author}
                </div>
              </div>
              <footer className="plus-footer">
                <LikeButton item={p} onClick={() => reaction(p, 'like')} />
                <Button variant="ghost" onClick={() => open('plusDetail', p)}>
                  Veure plus
                  <ArrowRight size={17} />
                </Button>
              </footer>
            </article>
          ))}
        </div>
      ) : (
        <Empty
          title="Cap plus amb aquests filtres"
          body={
            filters.length
              ? 'Prova una altra cerca, revisa les assignatures o publica una activitat que coneguis.'
              : 'No has seleccionat cap assignatura. Tria les que vols veure a Les meves assignatures.'
          }
        >
          <Button onClick={() => open('profile', { section: 'subjects' })}>
            Revisar assignatures
          </Button>
        </Empty>
      )}
    </>
  );
}
