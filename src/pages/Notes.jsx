import VerifiedImage from '../components/VerifiedImage';
import Select from '../components/Select';
import SubjectFilter from '../components/SubjectFilter';
import React, { useEffect, useState } from 'react';
import {
  Plus,
  MagnifyingGlass,
  FilePdf,
  ImageSquare,
  TextT,
  LockSimple,
  Cake,
  NotePencil,
  ArrowRight,
  VideoCamera,
  Books,
  Function as FunctionIcon,
  Toolbox,
  ArrowLeft,
  Folder,
  CalendarPlus,
} from '@phosphor-icons/react';
import { useApp } from '../context';
import {
  PageTitle,
  Button,
  Tabs,
  SubjectChip,
  SubjectMark,
  LikeButton,
  SaveButton,
  Empty,
} from '../ui';
import { Avatar, ReferenceArt } from '../art';
import { matchesSearch } from '../../shared/search';
import ContentLibrary from '../components/ContentLibrary';
import SchoolGuide from '../components/SchoolGuide';
import { filterMaterials, materialTopics } from '../../shared/content-workspace';
import { eventLabel, eventKind, eventSubjectIds } from '../../shared/agenda';
import { dateLabel } from '../../shared/domain';
import '../contents.css';
import '../workspace.css';
const CONTENT_SECTIONS = ['materials', 'formula', 'tool', 'guide'];
export default function Notes() {
  const { open, data, subject, subjectFilter, setSubjectFilter, setAgendaSubject, go } = useApp();
  const current = subject(subjectFilter);
  const readSection = () => {
    const value = new URL(location.href).searchParams.get('contents');
    return CONTENT_SECTIONS.includes(value) ? value : 'materials';
  };
  const [section, updateSection] = useState(readSection);
  function setSection(value) {
    updateSection(value);
    const url = new URL(location.href);
    if (value === 'materials') url.searchParams.delete('contents');
    else url.searchParams.set('contents', value);
    history.replaceState(null, '', url);
  }
  useEffect(() => {
    const restore = () => {
      updateSection(readSection());
      const url = new URL(location.href);
      const value = url.searchParams.get('contents');
      if (value && !CONTENT_SECTIONS.includes(value)) {
        url.searchParams.delete('contents');
        history.replaceState(null, '', url);
      }
    };
    restore();
    window.addEventListener('popstate', restore);
    return () => window.removeEventListener('popstate', restore);
  }, []);
  useEffect(() => {
    if (current && section === 'guide') setSection('materials');
  }, [subjectFilter, section]);
  const upcoming = current
    ? data.events
        .filter(
          (e) =>
            eventSubjectIds(e).includes(current.id) &&
            !e.done &&
            (e.date >= data.today || eventKind(e) === 'task'),
        )
        .slice()
        .sort((a, b) => a.date.localeCompare(b.date))
        .slice(0, 3)
    : [];
  return (
    <div className="contents-page">
      <PageTitle title="Continguts" subtitle="Materials, fórmules i eines per estudiar">
        {section === 'materials' && (
          <Button
            variant="primary"
            onClick={() => open('note', current ? { subject_id: current.id } : {})}
          >
            <Plus size={18} />
            Comparteix un apunt
          </Button>
        )}
      </PageTitle>
      {current && (
        <section
          className="subject-workspace panel"
          aria-label={`Espai de ${current.name}`}
          style={{ '--subject-color': current.color }}
        >
          <button
            className="text-button workspace-back"
            onClick={() => {
              setSubjectFilter('all');
              setSection('materials');
            }}
          >
            <ArrowLeft size={17} /> Totes les assignatures
          </button>
          <div className="workspace-heading">
            <SubjectMark subject={current} />
            <div>
              <h2>{current.name}</h2>
              <p>El teu espai d’estudi</p>
            </div>
          </div>
          <div className="workspace-actions">
            <Button onClick={() => open('event', { subject_id: current.id, kind: 'exam' })}>
              <CalendarPlus size={18} /> Afegir examen
            </Button>
            <Button onClick={() => open('event', { subject_id: current.id, kind: 'task' })}>
              <Plus size={18} /> Afegir tasca
            </Button>
            <Button
              variant="ghost"
              onClick={() => {
                setAgendaSubject(current.id);
                go('schedule');
              }}
            >
              Agenda de l’assignatura <ArrowRight size={16} />
            </Button>
          </div>
          {!!upcoming.length && (
            <div className="workspace-dates" aria-label="Pròximes dates">
              {upcoming.map((e) => (
                <button key={e.id} onClick={() => open('eventDetail', e)}>
                  <span className={'workspace-date-kind ' + (e.date < data.today ? 'overdue' : '')}>
                    {eventLabel(e)} · {dateLabel(e.date, { day: 'numeric', month: 'short' })}
                  </span>
                  <strong>{e.title}</strong>
                </button>
              ))}
            </div>
          )}
        </section>
      )}
      <Tabs
        className="contents-sections"
        label="Apartats de Continguts"
        items={[
          ['materials', 'Materials', Books],
          ['formula', 'Formularis', FunctionIcon],
          ['tool', 'Eines i webs', Toolbox],
          ...(!current ? [['guide', 'Guia del curs', Books]] : []),
        ]}
        value={section}
        onChange={setSection}
      />
      <section
        className="contents-section"
        aria-label={
          section === 'materials'
            ? 'Materials compartits'
            : section === 'formula'
              ? 'Formularis de fórmules'
              : section === 'guide'
                ? 'Guia acadèmica del curs'
                : 'Eines i webs d’ajuda'
        }
      >
        {section === 'materials' ? (
          <Materials key={subjectFilter} />
        ) : section === 'guide' ? (
          <SchoolGuide />
        ) : (
          <ContentLibrary
            key={`${section}-${subjectFilter}`}
            kind={section}
            subjectId={current?.id}
          />
        )}
      </section>
    </div>
  );
}
function Materials() {
  const { data, enrolled, subject, subjectFilter, setSubjectFilter, open } = useApp();
  const selectedSubjects =
    subjectFilter === 'all'
      ? (data.preferences?.notesSubjects ??
        (enrolled.length ? enrolled : data.subjects).map((s) => s.id))
      : [subjectFilter];
  const [tab, setTab] = useState('explore'),
    [query, setQuery] = useState(''),
    [order, setOrder] = useState('recent'),
    [filtersOpen, setFiltersOpen] = useState(false),
    [topic, setTopic] = useState(null),
    [term, setTerm] = useState('all'),
    [limit, setLimit] = useState(12);
  const scoped = subjectFilter !== 'all';
  const baseItems = filterMaterials(data.notes, {
    subjects: !scoped && (tab !== 'explore' || query.trim()) ? null : selectedSubjects,
    tab,
    userId: data.user.id,
    query,
    term,
    subjectName: (id) => subject(id)?.name,
  });
  const topics = materialTopics(baseItems);
  const items = baseItems.filter((n) => topic === null || (n.topic || '') === topic);
  if (order === 'likes') items.sort((a, b) => b.likes - a.likes);
  if (order === 'title') items.sort((a, b) => a.title.localeCompare(b.title, 'ca'));
  if (order === 'recent') items.sort((a, b) => b.created_at.localeCompare(a.created_at));
  return (
    <>
      <div className="resource-toolbar notes-toolbar">
        <Tabs
          className="notes-tabs"
          items={[
            ['explore', 'Explorar'],
            ['saved', 'Desats'],
            ['mine', 'Els meus'],
          ]}
          value={tab}
          onChange={(value) => {
            setTab(value);
            setTopic(null);
            setLimit(12);
          }}
        />
      </div>
      <div className="resource-filters notes-filters">
        <label className="search-field">
          <MagnifyingGlass size={19} />
          <input
            aria-label="Cercar apunts"
            placeholder="Cerca apunts, temes o autors"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setTopic(null);
              setLimit(12);
            }}
          />
        </label>
        <Select
          aria-label="Ordenar apunts"
          value={order}
          onChange={(e) => setOrder(e.target.value)}
        >
          <option value="recent">Més recents</option>
          <option value="likes">Més agradats</option>
          <option value="title">Títol</option>
        </Select>
        {!scoped && (
          <SubjectFilter
            kind="notes"
            value={selectedSubjects}
            expanded={filtersOpen}
            onExpandedChange={setFiltersOpen}
            onApplied={() => setSubjectFilter('all')}
          />
        )}
      </div>
      {!scoped && tab === 'explore' && !query.trim() && (
        <section className="subject-spaces" aria-label="Espais per assignatura">
          <div className="workspace-list-heading">
            <h2>Les teves assignatures</h2>
            <Select
              aria-label="Obrir una altra assignatura"
              value="all"
              onChange={(e) => setSubjectFilter(e.target.value)}
            >
              <option value="all">Altres assignatures…</option>
              {data.subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </Select>
          </div>
          <div className="subject-spaces-grid">
            {data.subjects
              .filter((s) => selectedSubjects.includes(s.id))
              .map((s) => {
                const count = data.notes.filter(
                  (n) => n.subject_id === s.id && n.status === 'published',
                ).length;
                const next = data.events
                  .filter((e) => e.subject_id === s.id && e.date >= data.today && !e.done)
                  .sort((a, b) => a.date.localeCompare(b.date))[0];
                return (
                  <button
                    className="subject-space"
                    key={s.id}
                    onClick={() => setSubjectFilter(s.id)}
                    aria-label={`Obrir l’espai de ${s.name}`}
                    style={{ '--subject-color': s.color }}
                  >
                    <SubjectMark subject={s} />
                    <strong>{s.name}</strong>
                    <span>
                      {count} {count === 1 ? 'material' : 'materials'}
                    </span>
                    {next && (
                      <small>
                        {eventLabel(next)} ·{' '}
                        {dateLabel(next.date, { day: 'numeric', month: 'short' })}
                      </small>
                    )}
                    <ArrowRight size={17} />
                  </button>
                );
              })}
          </div>
          {!selectedSubjects.length && (
            <p>
              No has triat assignatures. Pots obrir-ne una des del selector o ajustar les
              preferències.
            </p>
          )}
          <h2 className="workspace-recents">Materials recents</h2>
        </section>
      )}
      {scoped && (
        <div className="material-organization">
          <div className="topic-folders" role="group" aria-label="Temes dels materials">
            <button
              aria-pressed={topic === null}
              onClick={() => {
                setTopic(null);
                setLimit(12);
              }}
            >
              <Books size={18} /> Tots <span>{baseItems.length}</span>
            </button>
            {topics.map(([name, count]) => (
              <button
                key={name}
                aria-pressed={topic === name}
                onClick={() => {
                  setTopic(name);
                  setLimit(12);
                }}
              >
                <Folder size={19} weight="duotone" /> {name || 'Sense tema'} <span>{count}</span>
              </button>
            ))}
          </div>
          <Select
            aria-label="Trimestre dels materials"
            value={term}
            onChange={(e) => {
              setTerm(e.target.value);
              setTopic(null);
              setLimit(12);
            }}
          >
            <option value="all">Tot el curs</option>
            <option value="1">1r trimestre</option>
            <option value="2">2n trimestre</option>
            <option value="3">3r trimestre</option>
            <option value="none">Sense trimestre</option>
          </Select>
          {topic !== null && (
            <Button
              onClick={() =>
                open('note', {
                  subject_id: subjectFilter,
                  topic,
                  term: ['1', '2', '3'].includes(term) ? term : '',
                })
              }
            >
              <Plus size={17} /> Material en aquest tema
            </Button>
          )}
        </div>
      )}
      <p className="results-label" aria-live="polite">
        {items.length} {items.length === 1 ? 'publicació' : 'publicacions'}{' '}
      </p>
      {items.length ? (
        <div className="notes-grid">
          {items.slice(0, limit).map((n) => {
            const photos = n.files.filter((f) => f.mime.startsWith('image/'));
            const first = photos.find((f) => f.accessible);
            const pdf = n.files.find((f) => f.mime === 'application/pdf' && f.accessible);
            const videos = n.files.filter((f) => f.mime.startsWith('video/'));
            const format =
              [
                n.has_text ? 'Text' : '',
                photos.length ? photos.length + (photos.length === 1 ? ' foto' : ' fotos') : '',
                videos.length ? videos.length + (videos.length === 1 ? ' vídeo' : ' vídeos') : '',
                n.files.some((f) => f.mime === 'application/pdf') ? 'PDF' : '',
                n.files.some(
                  (f) =>
                    !f.mime.startsWith('image/') &&
                    !f.mime.startsWith('video/') &&
                    f.mime !== 'application/pdf',
                )
                  ? 'Documents'
                  : '',
              ]
                .filter(Boolean)
                .join(' + ') || 'Apunts';
            return (
              <article
                className={`note-card panel ${first || pdf ? 'has-preview' : 'note-text-only'}`}
                key={n.id}
              >
                {n.status === 'published' && (
                  <div className="note-save">
                    <SaveButton item={n} resource="notes" />
                  </div>
                )}
                {(first || pdf) && (
                  <button
                    className="note-preview"
                    aria-label={`Previsualitzar ${n.title}`}
                    style={{ '--subject': subject(n.subject_id)?.color }}
                    onClick={() => open('reader', n)}
                  >
                    {first ? (
                      <>
                        <VerifiedImage
                          src={`/api/files/${first.id}`}
                          alt={`Previsualització de ${n.title}`}
                          loading="lazy"
                        />
                        {photos.length > 1 && (
                          <span className="format-badge">
                            <ImageSquare size={14} />
                            {photos.length} fotos
                          </span>
                        )}
                      </>
                    ) : pdf ? (
                      <>
                        <iframe
                          loading="lazy"
                          src={`/api/files/${pdf.id}#toolbar=0&navpanes=0`}
                          title={`Previsualització de ${pdf.name}`}
                          tabIndex={-1}
                        />
                        <span className="format-badge">
                          <FilePdf size={14} />
                          PDF
                        </span>
                      </>
                    ) : null}
                    {n.price > 0 && !n.unlocked && (
                      <span className="preview-lock">
                        <LockSimple size={16} />
                        Mostra gratuïta
                      </span>
                    )}
                  </button>
                )}
                <div className="note-body">
                  <div className="card-tags">
                    <SubjectChip subject={subject(n.subject_id)} />
                    {n.topic && (
                      <span className="material-topic">
                        <Folder size={13} /> {n.topic}
                      </span>
                    )}
                    {n.term && (
                      <span className="material-topic">
                        {n.term === 2 ? '2n' : n.term + 'r'} trimestre
                      </span>
                    )}
                    {n.status === 'draft' && <span className="badge">Esborrany</span>}
                  </div>
                  <button
                    className="card-title-button"
                    aria-label={`Obrir ${n.title}`}
                    onClick={() => open('reader', n)}
                  >
                    <h2>{n.title}</h2>
                  </button>
                  <p className="card-description">{n.summary}</p>
                  <div className="card-meta">
                    <Avatar name={n.author} tiny />
                    <span>{n.author}</span>
                    <span className="note-format">
                      {photos.length ? (
                        <ImageSquare size={20} />
                      ) : videos.length ? (
                        <VideoCamera size={20} />
                      ) : pdf ? (
                        <FilePdf size={20} />
                      ) : (
                        <TextT size={20} />
                      )}
                      {format}
                    </span>
                  </div>
                </div>
                <footer className="resource-card-footer">
                  {n.status === 'published' && (
                    <>
                      <LikeButton item={n} resource="notes" />
                    </>
                  )}
                  {n.author_id === data.user.id && (
                    <button
                      className="small-action"
                      aria-label={`Editar ${n.title}`}
                      onClick={() => open('note', n)}
                    >
                      <NotePencil size={19} />
                    </button>
                  )}
                  <span className={`note-price ${n.price > 0 ? 'paid' : ''}`}>
                    {n.price > 0 ? (
                      <>
                        <ReferenceArt name="cake" size={25} />
                        {n.price} pastissos
                      </>
                    ) : (
                      'Gratuït'
                    )}
                  </span>
                  <Button variant="ghost note-open" onClick={() => open('reader', n)}>
                    {n.price > 0 && !n.unlocked
                      ? 'Veure mostra'
                      : photos.length || pdf
                        ? 'Veure apunt'
                        : 'Llegir apunt'}
                    <ArrowRight size={17} />
                  </Button>
                </footer>
              </article>
            );
          })}
        </div>
      ) : (
        <Empty
          title="No hem trobat apunts"
          body={
            !selectedSubjects.length
              ? 'No has seleccionat cap assignatura. Obre Les meves assignatures per triar què vols veure.'
              : tab === 'saved'
                ? 'Els apunts que desis apareixeran aquí.'
                : 'Prova un altre filtre o comparteix el primer apunt.'
          }
        >
          <Button
            onClick={() => {
              setQuery('');
              setFiltersOpen(true);
            }}
          >
            Revisar filtres
          </Button>
          <Button onClick={() => open('note')}>
            <Plus size={17} />
            Compartir apunts
          </Button>
        </Empty>
      )}
      {items.length > limit && (
        <div className="workspace-load-more">
          <Button onClick={() => setLimit((n) => n + 12)}>
            Mostrar més materials ({items.length - limit})
          </Button>
        </div>
      )}
    </>
  );
}
