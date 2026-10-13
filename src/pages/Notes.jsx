import VerifiedImage from '../components/VerifiedImage';
import Select from '../components/Select';
import SubjectFilter from '../components/SubjectFilter';
import React, { useState } from 'react';
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
} from '@phosphor-icons/react';
import { useApp } from '../context';
import { PageTitle, Button, Tabs, SubjectChip, LikeButton, SaveButton, Empty } from '../ui';
import { Avatar, ReferenceArt } from '../art';
import { matchesSearch } from '../../shared/search';
import ContentLibrary from '../components/ContentLibrary';
import SchoolGuide from '../components/SchoolGuide';
import '../contents.css';
export default function Notes() {
  const { open } = useApp();
  const [section, setSection] = useState('materials');
  return (
    <div className="contents-page">
      <PageTitle title="Continguts" subtitle="Materials, fórmules i eines per estudiar">
        {section === 'materials' && (
          <Button variant="primary" onClick={() => open('note')}>
            <Plus size={18} />
            Comparteix un apunt
          </Button>
        )}
      </PageTitle>
      <Tabs
        className="contents-sections"
        label="Apartats de Continguts"
        items={[
          ['materials', 'Materials', Books],
          ['formula', 'Formularis', FunctionIcon],
          ['tool', 'Eines i webs', Toolbox],
          ['guide', 'Guia del curs', Books],
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
          <Materials />
        ) : section === 'guide' ? (
          <SchoolGuide />
        ) : (
          <ContentLibrary key={section} kind={section} />
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
    [filtersOpen, setFiltersOpen] = useState(false);
  const items = data.notes.filter(
    (n) =>
      selectedSubjects.includes(n.subject_id) &&
      (tab === 'saved'
        ? n.saved
        : tab === 'mine'
          ? n.author_id === data.user.id
          : n.status === 'published') &&
      matchesSearch(query, n.title, n.summary, n.author, subject(n.subject_id)?.name),
  );
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
          onChange={setTab}
        />
      </div>
      <div className="resource-filters notes-filters">
        <label className="search-field">
          <MagnifyingGlass size={19} />
          <input
            aria-label="Cercar apunts"
            placeholder="Cerca apunts, temes o autors"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
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
        <SubjectFilter
          kind="notes"
          value={selectedSubjects}
          expanded={filtersOpen}
          onExpandedChange={setFiltersOpen}
          onApplied={() => setSubjectFilter('all')}
        />
      </div>
      <p className="results-label" aria-live="polite">
        {items.length} {items.length === 1 ? 'publicació' : 'publicacions'}{' '}
      </p>
      {items.length ? (
        <div className="notes-grid">
          {items.map((n) => {
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
    </>
  );
}
