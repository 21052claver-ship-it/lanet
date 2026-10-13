import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Calculator,
  GraduationCap,
  MagnifyingGlass,
  ArrowRight,
  CheckCircle,
  Info,
  FloppyDisk,
  ArrowClockwise,
  Plus,
  Trash,
  Atom,
  Leaf,
  Flask,
  Pi,
  GlobeHemisphereWest,
  BookOpen,
  Palette,
  MusicNotes,
  MaskHappy,
  Ruler,
  Gear,
  ChartLineUp,
} from '@phosphor-icons/react';
import { useApp } from '../context';
import { api } from '../api';
import { PageTitle, Button, Field, Tabs, Modal, Empty, FormError } from '../ui';
import Select from '../components/Select';
import { PrivateGrade, GradePrivacyToggle } from '../components/GradePrivacy';
import {
  emptyPau,
  validatePau,
  pauAccess,
  pauAdmission,
  findPauDegrees,
  MODALITY_IDS,
  COMMON_EXAMS,
  pauMark,
} from '../../shared/pau';
import { matchesSearch } from '../../shared/search';
import { currentPauProfile, degreeOutlook } from '../../shared/pau-outlook';
import PauChoices, { PauOutlook } from '../components/PauChoices';
import SchoolCalendar from '../components/SchoolCalendar';
import '../pau.css';

const number = (n) =>
  n == null
    ? '—'
    : n.toLocaleString('ca-ES', { minimumFractionDigits: 3, maximumFractionDigits: 3 });
const official = 'https://universitats.gencat.cat/ca/';
const subjectVisuals = {
  biology: [Leaf, 'green'],
  geology: [Leaf, 'green'],
  physics: [Atom, 'blue'],
  chemistry: [Flask, 'blue'],
  'general-science': [Atom, 'blue'],
  technology: [Gear, 'blue'],
  math: [Pi, 'violet'],
  'social-math': [Pi, 'violet'],
  geography: [GlobeHemisphereWest, 'green'],
  business: [ChartLineUp, 'amber'],
  analysis: [MusicNotes, 'rose'],
  choir: [MusicNotes, 'rose'],
  'music-history': [MusicNotes, 'rose'],
  performing: [MaskHappy, 'rose'],
  drama: [MaskHappy, 'rose'],
  'technical-drawing': [Ruler, 'blue'],
  'design-drawing': [Ruler, 'rose'],
  'art-drawing': [Palette, 'rose'],
  design: [Palette, 'rose'],
  'art-foundations': [Palette, 'rose'],
  'art-history': [Palette, 'rose'],
  'cultural-movements': [Palette, 'rose'],
  'graphic-expression': [Palette, 'rose'],
};
const commonLabels = {
  catalan: 'Llengua Catalana i Literatura',
  spanish: 'Llengua Castellana i Literatura',
  foreign: 'Llengua estrangera',
  history: 'Història / Història de la Filosofia',
};
const universities = {
  UB: 'Universitat de Barcelona',
  UAB: 'Universitat Autònoma de Barcelona',
  UPC: 'Universitat Politècnica de Catalunya',
  UPF: 'Universitat Pompeu Fabra',
  UdL: 'Universitat de Lleida',
  UdG: 'Universitat de Girona',
  URV: 'Universitat Rovira i Virgili',
  'UVic-UCC': 'Universitat de Vic · Universitat Central de Catalunya',
  UOC: 'Universitat Oberta de Catalunya',
};

function Mark({ label, value, onChange, hint }) {
  const { hideGrades } = useApp();
  const [editing, setEditing] = useState(false),
    [text, setText] = useState('');
  let invalid = false;
  try {
    pauMark(value);
  } catch {
    invalid = true;
  }
  return (
    <Field label={label} hint={hint}>
      <input
        type={hideGrades ? 'password' : 'text'}
        inputMode="decimal"
        autoComplete="off"
        spellCheck={false}
        maxLength={6}
        aria-invalid={invalid || undefined}
        placeholder={hideGrades && value !== null && value !== '' ? '•••' : '0–10'}
        value={hideGrades ? (editing ? text : '') : (value ?? '')}
        onFocus={() => {
          setEditing(true);
          setText('');
        }}
        onBlur={() => setEditing(false)}
        onChange={(e) => {
          setText(e.target.value);
          onChange(e.target.value);
        }}
      />
    </Field>
  );
}
function SourceLink({ href, children }) {
  return (
    <a href={href} target="_blank" rel="noreferrer">
      {children} ↗
    </a>
  );
}

export default function Pau() {
  const {
    data,
    enrolled,
    pauDraft: draft,
    setPauDraft: setDraft,
    pauSaved,
    setPauSaved,
    pauDirty,
    hideGrades,
    notify,
  } = useApp();
  const [tab, setTab] = useState('top'),
    [catalogue, setCatalogue] = useState(null),
    [loadError, setLoadError] = useState(''),
    [reload, setReload] = useState(0);
  const [saving, setSaving] = useState(false),
    [saveError, setSaveError] = useState(''),
    [conflict, setConflict] = useState(false);
  const [query, setQuery] = useState(''),
    [career, setCareer] = useState(''),
    [university, setUniversity] = useState(''),
    [round, setRound] = useState('latest'),
    [onlyEligible, setOnlyEligible] = useState(false),
    [limit, setLimit] = useState(18),
    [detail, setDetail] = useState(null);
  const pending = useRef(false),
    searchRef = useRef(null);
  useEffect(() => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20000);
    let alive = true;
    setLoadError('');
    fetch('/data/pau.json', { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error('No hem pogut carregar les dades oficials.');
        const data = await response.json();
        if (data.schema !== 1 || !Array.isArray(data.degrees) || data.degrees.length < 400)
          throw new Error('El catàleg no té el format esperat.');
        if (alive) setCatalogue(data);
      })
      .catch(() => {
        if (alive)
          setLoadError(
            'No hem pogut carregar el catàleg. Comprova la connexió i torna-ho a provar.',
          );
      })
      .finally(() => clearTimeout(timeout));
    return () => {
      alive = false;
      controller.abort();
      clearTimeout(timeout);
    };
  }, [reload]);
  useEffect(() => setLimit(18), [query, career, university, round, onlyEligible, draft.year]);
  let value,
    validation = '';
  try {
    value = validatePau(draft);
  } catch (error) {
    validation = error.message;
  }
  const access = value ? pauAccess(value) : null;
  const profile = useMemo(() => currentPauProfile(data, enrolled), [data, enrolled]);
  const topFive = value?.topFive || draft.topFive || (draft.selected ? [draft.selected] : []);
  const orientationReady =
    (draft.orientationSource || 'grades') === 'grades'
      ? draft.route === 'batx' && profile.average !== null && profile.average >= 5
      : !!access?.eligible;
  const subjects = catalogue?.subjects || [];
  const subjectName = (id) => subjects.find((s) => s.id === id)?.label || id;
  const selected = catalogue?.degrees.find((d) => d.code === draft.selected);
  const selectedResult = selected && value ? pauAdmission(value, selected, round) : null;
  const rows = useMemo(
    () =>
      catalogue
        ? findPauDegrees(catalogue.degrees, value || emptyPau(), {
            query,
            career,
            university,
            onlyEligible: false,
            round,
          })
            .map((row) => ({
              ...row,
              outlook: degreeOutlook(draft, row.degree, profile, round),
            }))
            .filter(
              (row) =>
                !onlyEligible || hideGrades || !orientationReady || row.outlook.reaches === true,
            )
        : [],
    [
      catalogue,
      JSON.stringify(value),
      query,
      career,
      university,
      onlyEligible,
      hideGrades,
      round,
      profile,
      orientationReady,
      draft.year,
    ],
  );
  const careers = useMemo(
    () =>
      [...new Set((catalogue?.degrees || []).map((d) => d.career))].sort((a, b) =>
        a.localeCompare(b, 'ca'),
      ),
    [catalogue],
  );
  const uniOptions = useMemo(
    () =>
      [
        ...new Set((catalogue?.degrees || []).flatMap((d) => d.university.split(/\s*\/\s*/))),
      ].sort(),
    [catalogue],
  );
  const matchingCareers = careers.filter((c) => matchesSearch(query, c));
  const visibleCareers = query && matchingCareers.length ? matchingCareers : careers;
  const recommendation =
    !hideGrades && career ? rows.find((r) => r.outlook.reaches === true) : null;
  const patch = (p) => {
    setDraft((current) => ({ ...current, ...p }));
    setSaveError('');
  };
  function changeSubject(index, p) {
    patch({ subjects: draft.subjects.map((s, i) => (i === index ? { ...s, ...p } : s)) });
  }
  function addChoice(code) {
    if (topFive.includes(code)) {
      setTab('top');
      return;
    }
    if (topFive.length >= 5) {
      notify('El teu top 5 ja és ple. Treu una opció abans d’afegir-ne una altra.', 'warning');
      return;
    }
    patch({ topFive: [...topFive, code], selected: draft.selected || code });
    notify('Grau afegit al top 5. Desa les preferències per conservar-lo.');
  }
  async function save() {
    if (pending.current || !value) return;
    pending.current = true;
    setSaving(true);
    setSaveError('');
    try {
      const result = await api('/pau', {
        method: 'PUT',
        body: { value, revision: pauSaved.revision },
      });
      setPauSaved({ value: result.value, revision: result.revision });
      setDraft(result.value);
      setConflict(false);
      notify('Preferències i simulació PAU desades.');
    } catch (error) {
      setSaveError(error.message);
      setConflict(error.status === 409);
    } finally {
      pending.current = false;
      setSaving(false);
    }
  }
  async function restore() {
    if (pending.current) return;
    pending.current = true;
    setSaving(true);
    try {
      const result = await api('/pau');
      setPauSaved(result);
      setDraft(result.value || emptyPau());
      setConflict(false);
      setSaveError('');
      notify('Versió desada recuperada.');
    } catch (error) {
      setSaveError(error.message);
    } finally {
      pending.current = false;
      setSaving(false);
    }
  }
  function resultText(result) {
    if (hideGrades) return 'Resultat ocult';
    if (!value) return 'Revisa les notes';
    if (!result?.available) return 'Ponderació no disponible';
    if (!result.access.eligible) return 'Completa o revisa l’accés';
    if (result.cutoff === null) return 'Sense tall en aquesta assignació';
    return result.reaches ? 'Arribes al tall de 2026' : 'Encara no arribes al tall';
  }
  function Result({ degree, result, large = false }) {
    return (
      <div className={`pau-result ${large ? 'large' : ''}`}>
        <div>
          <span>La teva admissió · {draft.year}</span>
          <strong data-testid="admission">
            <PrivateGrade>{number(result?.total)}</PrivateGrade>
            <small>/14</small>
          </strong>
        </div>
        <div>
          <span>Tall 2026 · {round === 'latest' ? '6a assignació' : '1a assignació'}</span>
          <strong>
            {number(result?.cutoff ?? (round === 'latest' ? degree.cutoff : degree.firstCutoff))}
          </strong>
        </div>
        <p className={`pau-status ${!hideGrades && result?.reaches === true ? 'reaches' : ''}`}>
          {!hideGrades && result?.reaches === true ? (
            <CheckCircle size={19} weight="fill" />
          ) : (
            <Info size={19} />
          )}{' '}
          {resultText(result)}
          {!hideGrades && result?.gap !== null && result?.gap !== undefined && (
            <span>
              {result.gap >= 0 ? 'Marge' : 'Et falten'} {number(Math.abs(result.gap))} punts
            </span>
          )}
        </p>
      </div>
    );
  }
  function WeightDetails({ degree }) {
    const result = value ? pauAdmission(value, degree, round) : null;
    const weights = degree.weights[String(draft.year)];
    return (
      <>
        <p className="pau-muted">
          {degree.university} · {degree.campus || 'Consulta el campus al document oficial'} · Codi{' '}
          {degree.code}
        </p>
        {access?.eligible ? (
          <Result degree={degree} result={result} />
        ) : (
          <PauOutlook {...{ degree, draft: value || draft, profile, round, hideGrades }} />
        )}
        <h3>Matèries que ponderen · {draft.year}</h3>
        {weights && (
          <p className="pau-muted">×0,2: fins a 2 punts · ×0,1: fins a 1 punt per matèria.</p>
        )}
        {!weights ? (
          <p className="form-error">
            {degree.weightConflicts?.[String(draft.year)]
              ? 'El PDF oficial publica coeficients diferents per a aquest mateix codi. No calculem una nota amb dades contradictòries. Confirma la ponderació amb Canal Universitats.'
              : 'Aquest codi no té ponderacions publicades per a l’any triat. No les deduïm d’un altre grau.'}
          </p>
        ) : (
          <div className="pau-weights">
            {subjects
              .filter((s) => weights[s.id])
              .map((s) => {
                const c = result?.contributions.find((c) => c.id === s.id);
                const chosen = result?.best.some((c) => c.id === s.id);
                const [Icon, tone] = subjectVisuals[s.id] || [BookOpen, 'amber'];
                return (
                  <div
                    key={s.id}
                    className={`pau-weight-card tone-${tone}${!hideGrades && chosen ? ' is-chosen' : ''}`}
                  >
                    <span className="pau-weight-icon" aria-hidden="true">
                      <Icon size={22} weight="duotone" />
                    </span>
                    <span className="pau-weight-name">{s.label}</span>
                    <b className="pau-weight-coefficient">
                      ×{String(weights[s.id]).replace('.', ',')}
                      <span>Fins a {weights[s.id] * 10} punts</span>
                    </b>
                    {!hideGrades && c && c.grade !== null && (
                      <small>
                        {!c.valid
                          ? 'Fora de validesa'
                          : c.grade < 5
                            ? 'Cal un 5 per ponderar'
                            : chosen
                              ? `✓ Seleccionada · Suma ${number(c.points)} punts`
                              : 'No és una de les dues millors aportacions'}
                      </small>
                    )}
                  </div>
                );
              })}
          </div>
        )}
        {!hideGrades && result?.total != null && (
          <p className="pau-formula">
            {number(result.access.value)} d’accés + {number(result.bonus)} de ponderacions ={' '}
            <b>{number(result.total)}</b>
          </p>
        )}
        <p className="pau-muted">
          Només sumen les dues millors aportacions de matèries aprovades (≥5) i vigents. La matèria
          de modalitat també pot ponderar. Les PAP i altres requisits del grau s’han de superar
          igualment.
        </p>
        <div className="pau-links">
          <SourceLink
            href={
              catalogue.sources[`weights-${draft.year}`].url +
              `#page=${degree.weightPages[String(draft.year)] || 1}`
            }
          >
            Ponderacions oficials
          </SourceLink>
          {(round === 'first' ? degree.firstCutoff : degree.cutoff) !== undefined && (
            <SourceLink
              href={
                catalogue.sources[round === 'latest' ? 'cutoffs-2026-latest' : 'cutoffs-2026-first']
                  .url +
                `#page=${degree[round === 'latest' ? 'cutoffPage' : 'firstCutoffPage'] || 1}`
              }
            >
              Nota de tall oficial
            </SourceLink>
          )}
        </div>
      </>
    );
  }
  return (
    <div className="pau-page">
      <PageTitle
        title="PAU i universitat"
        subtitle="Tria on vols estudiar i construeix el teu top 5."
      >
        <GradePrivacyToggle />
      </PageTitle>
      <SchoolCalendar onlyAdmission />
      <div className="pau-topline">
        <Tabs
          label="Apartat PAU"
          items={[
            ['top', 'El meu top 5', GraduationCap],
            ['finder', 'Explorar', MagnifyingGlass],
            ['calculator', 'La meva nota', Calculator],
          ]}
          value={tab}
          onChange={setTab}
        />
        <Field label="Any d’admissió">
          <Select
            value={draft.year}
            disabled={saving}
            onChange={(e) => patch({ year: Number(e.target.value) })}
          >
            <option value="2027">2027 · proper accés</option>
            <option value="2026">2026</option>
          </Select>
        </Field>
      </div>
      {tab !== 'top' && (
        <p className="pau-context">
          Ponderacions {draft.year} · Talls de juny de 2026, actualitzats el 7 d’octubre. Comparació
          orientativa: la nota de tall futura pot canviar i no garanteix plaça.
        </p>
      )}
      <FormError error={validation} />
      {(pauDirty || saving || validation || conflict) && (
        <div className="pau-savebar">
          <span role="status">
            {pauDirty
              ? 'Canvis sense desar'
              : 'Llista i simulació privades · desades al compte' +
                (pauSaved.revision ? '' : ' quan premis Desar')}
          </span>
          <Button disabled={!pauDirty || !!validation} busy={saving} onClick={save}>
            <FloppyDisk size={18} />
            {tab === 'calculator' ? 'Desar simulació' : 'Desar preferències'}
          </Button>
        </div>
      )}
      <FormError error={saveError} />
      {conflict && (
        <Button busy={saving} onClick={restore}>
          <ArrowClockwise size={18} />
          Recuperar versió desada (substitueix aquests canvis)
        </Button>
      )}
      {tab === 'top' ? (
        <PauChoices
          codes={topFive}
          {...{ catalogue, profile, round, hideGrades, saving, patch }}
          draft={value || draft}
          explore={() => setTab('finder')}
          detail={setDetail}
        />
      ) : tab === 'calculator' ? (
        <div className="pau-calculator">
          <section className="panel pau-inputs" aria-label="Notes de la PAU">
            <h2>
              <Calculator size={22} /> La teva nota d’accés
            </h2>
            <fieldset disabled={saving}>
              <Field label="Via d’accés">
                <Select
                  value={draft.route}
                  onChange={(e) =>
                    patch({
                      route: e.target.value,
                      subjects: draft.subjects.filter(
                        (s) => e.target.value === 'cfgs' || s.id !== draft.modality,
                      ),
                    })
                  }
                >
                  <option value="batx">Batxillerat + PAU</option>
                  <option value="cfgs">Cicle formatiu de grau superior</option>
                </Select>
              </Field>
              <Mark
                label={draft.route === 'cfgs' ? 'Mitjana del CFGS' : 'Mitjana de batxillerat'}
                value={draft.average}
                onChange={(v) => patch({ average: v })}
                hint={
                  draft.route === 'batx'
                    ? 'La mitjana oficial dels dos cursos; pots simular-la amb una estimació.'
                    : 'La nota final oficial del cicle (sobre 10).'
                }
              />
              {draft.route === 'batx' && (
                <>
                  <Field label="Fase d’accés">
                    <Select
                      value={draft.accessMode}
                      onChange={(e) => patch({ accessMode: e.target.value })}
                    >
                      <option value="summary">Ja tinc la mitjana dels 5 exàmens</option>
                      <option value="exams">Calcular-la examen per examen</option>
                    </Select>
                  </Field>
                  {draft.accessMode === 'summary' ? (
                    <Mark
                      label="Mitjana de la fase d’accés"
                      value={draft.general}
                      onChange={(v) => patch({ general: v })}
                    />
                  ) : (
                    <div className="pau-exams">
                      {COMMON_EXAMS.map((k) => (
                        <Mark
                          key={k}
                          label={commonLabels[k]}
                          value={draft.exams[k]}
                          onChange={(v) => patch({ exams: { ...draft.exams, [k]: v } })}
                        />
                      ))}
                    </div>
                  )}
                  <div className="pau-subsection">
                    <h3>Matèria obligatòria de modalitat</h3>
                    <p>També pot sumar punts a l’admissió si l’aproves.</p>
                    <Field label="Matèria de modalitat">
                      <Select
                        value={draft.modality}
                        onChange={(e) => patch({ modality: e.target.value })}
                      >
                        {MODALITY_IDS.map((id) => (
                          <option
                            key={id}
                            value={id}
                            disabled={draft.subjects.some((s) => s.id === id)}
                          >
                            {subjectName(id)}
                          </option>
                        ))}
                      </Select>
                    </Field>
                    <div className="pau-pair">
                      <Mark
                        label="Nota de modalitat"
                        value={draft.modalityGrade}
                        onChange={(v) => patch({ modalityGrade: v })}
                      />
                      <Field label="Any de modalitat">
                        <Select
                          value={draft.modalityYear}
                          onChange={(e) => patch({ modalityYear: Number(e.target.value) })}
                        >
                          {[2027, 2026, 2025, 2024].map((y) => (
                            <option key={y} value={y}>
                              {y}
                            </option>
                          ))}
                        </Select>
                      </Field>
                    </div>
                  </div>
                </>
              )}
            </fieldset>
            <div className="pau-access">
              <span>
                Nota d’accés <small>/10</small>
              </span>
              <strong data-testid="access">
                <PrivateGrade>{number(access?.value)}</PrivateGrade>
              </strong>
            </div>
            {!hideGrades && access?.reason && (
              <p className="pau-muted" role="status">
                {access.reason}
              </p>
            )}
            <details className="pau-help">
              <summary>Com es calcula?</summary>
              <p>
                Batxillerat: 60% de la mitjana de batxillerat + 40% de la mitjana dels cinc exàmens.
                La fase d’accés ha de ser ≥4 i la nota d’accés ≥5. CFGS: la mitjana del cicle és la
                nota d’accés.
              </p>
              <p>
                No importem automàticament la mitjana de les notes del curs: no és la mitjana
                oficial del batxillerat.
              </p>
            </details>
          </section>
          <div className="pau-admission-column">
            <section className="panel pau-inputs" aria-label="Fase d’admissió">
              <h2>
                <Plus size={22} /> Puja la nota fins a 14
              </h2>
              <p className="pau-muted">
                Afegeix fins a tres matèries. Per a cada grau escollim automàticament les dues
                millors aportacions, inclosa la de modalitat.
              </p>
              <fieldset disabled={saving}>
                {draft.subjects.map((s, index) => (
                  <div className="pau-subject" key={index}>
                    <Field label={`Matèria ${index + 1}`}>
                      <Select
                        value={s.id}
                        onChange={(e) => changeSubject(index, { id: e.target.value })}
                      >
                        {subjects.map((subject) => (
                          <option
                            key={subject.id}
                            value={subject.id}
                            disabled={
                              (draft.route === 'batx' && subject.id === draft.modality) ||
                              draft.subjects.some((o, i) => i !== index && o.id === subject.id)
                            }
                          >
                            {subject.label}
                          </option>
                        ))}
                      </Select>
                    </Field>
                    <div className="pau-subject-bottom">
                      <Mark
                        label={`Nota de ${subjectName(s.id)}`}
                        value={s.grade}
                        onChange={(v) => changeSubject(index, { grade: v })}
                      />
                      <Field label={`Any de la matèria ${index + 1}`}>
                        <Select
                          value={s.year}
                          onChange={(e) => changeSubject(index, { year: Number(e.target.value) })}
                        >
                          {[2027, 2026, 2025, 2024].map((y) => (
                            <option key={y} value={y}>
                              {y}
                            </option>
                          ))}
                        </Select>
                      </Field>
                      <button
                        type="button"
                        className="icon-button"
                        aria-label={`Treure matèria ${index + 1}`}
                        onClick={() =>
                          patch({ subjects: draft.subjects.filter((_, i) => i !== index) })
                        }
                      >
                        <Trash size={19} />
                      </button>
                    </div>
                  </div>
                ))}
                <Button
                  disabled={!catalogue || draft.subjects.length >= 3}
                  onClick={() => {
                    const next = subjects.find(
                      (s) =>
                        !(draft.route === 'batx' && s.id === draft.modality) &&
                        !draft.subjects.some((o) => o.id === s.id),
                    );
                    if (next)
                      patch({
                        subjects: [
                          ...draft.subjects,
                          { id: next.id, grade: null, year: draft.year },
                        ],
                      });
                  }}
                >
                  <Plus size={18} />
                  Afegir matèria
                </Button>
              </fieldset>
              <p className="pau-caption">
                Vàlides l’any de l’examen i els dos següents. Història, Filosofia i les llengües
                comunes no ponderen en cap grau de Catalunya.
              </p>
            </section>
            <section className="panel pau-target">
              <h2>
                <GraduationCap size={23} /> El teu objectiu
              </h2>
              {selected ? (
                <>
                  <h3>{selected.name}</h3>
                  <p>{selected.university}</p>
                  <Result degree={selected} result={selectedResult} large />
                  <Button onClick={() => setDetail(selected.code)}>
                    Veure ponderacions i càlcul
                  </Button>
                </>
              ) : (
                <p className="pau-muted">
                  Tria un grau al cercador per veure la teva nota d’admissió amb les seves
                  ponderacions.
                </p>
              )}
              <Button variant="primary" onClick={() => setTab('finder')}>
                Explorar graus <ArrowRight size={19} />
              </Button>
            </section>
          </div>
        </div>
      ) : (
        <section aria-label="Cercador d’universitats" className="pau-finder">
          <div className="panel pau-search">
            <Field label="Cerca una carrera, campus o codi">
              <span className="pau-search-input">
                <MagnifyingGlass size={20} />
                <input
                  ref={searchRef}
                  type="search"
                  placeholder="Medicina, enginyeria informàtica…"
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    setCareer('');
                  }}
                />
              </span>
            </Field>
            <div className="pau-filters">
              <Field label="Carrera per a la recomanació">
                <Select
                  value={career}
                  onChange={(e) => {
                    setCareer(e.target.value);
                    setQuery('');
                  }}
                >
                  <option value="">Tria una carrera</option>
                  {visibleCareers.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Universitat">
                <Select value={university} onChange={(e) => setUniversity(e.target.value)}>
                  <option value="">Totes les universitats</option>
                  {uniOptions.map((u) => (
                    <option key={u} value={u}>
                      {u} · {universities[u] || u}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Referència de tall">
                <Select value={round} onChange={(e) => setRound(e.target.value)}>
                  <option value="latest">Última publicada · 07/10/2026</option>
                  <option value="first">Primera assignació · 10/07/2026</option>
                </Select>
              </Field>
            </div>
            <label className="pau-check">
              <input
                type="checkbox"
                disabled={hideGrades || !orientationReady}
                checked={onlyEligible && !hideGrades}
                onChange={(e) => setOnlyEligible(e.target.checked)}
              />
              Mostrar només on arribo al tall històric
            </label>
          </div>
          {hideGrades ? (
            <p className="pau-note">
              Mode discret: ocultem les teves notes, els marges i la recomanació personal. Pots
              consultar tots els talls i les ponderacions.
            </p>
          ) : career && orientationReady ? (
            <div className="pau-recommendation" role="status">
              <GraduationCap size={30} />
              <div>
                <h2>
                  {recommendation
                    ? 'La nota de tall més alta que assoleixes'
                    : 'La teva recomanació'}
                </h2>
                {recommendation ? (
                  <>
                    <h3>{recommendation.degree.name}</h3>
                    <p>
                      {recommendation.degree.university} · Tall{' '}
                      {number(recommendation.outlook.cutoff)} ·{' '}
                      {draft.orientationSource === 'simulation' ? 'Simulació' : 'Projecció'}{' '}
                      {number(recommendation.outlook.total)}
                    </p>
                    <Button onClick={() => setDetail(recommendation.degree.code)}>
                      Veure aquesta opció <ArrowRight size={18} />
                    </Button>
                  </>
                ) : (
                  <p>
                    Cap opció dels filtres actuals cobreix el tall històric amb aquesta orientació.
                    Explora alternatives o ajusta la simulació.
                  </p>
                )}
              </div>
            </div>
          ) : (
            <p className="pau-note">
              Guarda els graus que t’agraden al teu top 5. El tall reflecteix la demanda d’aquell
              any; no és un rànquing de qualitat.
            </p>
          )}
          {catalogue && (
            <>
              <div className="pau-results-heading">
                <h2>
                  {rows.length} {rows.length === 1 ? 'opció' : 'opcions'}
                </h2>
                <Button
                  onClick={() => {
                    setQuery('');
                    setCareer('');
                    setUniversity('');
                    setOnlyEligible(false);
                    searchRef.current?.focus();
                  }}
                >
                  Netejar filtres
                </Button>
              </div>
              {rows.length ? (
                <div className="pau-degree-grid">
                  {rows.slice(0, limit).map(({ degree }) => (
                    <article className="panel pau-degree" key={degree.code} data-code={degree.code}>
                      <div className="pau-degree-meta">
                        <span>{degree.university}</span>
                        <small>
                          {degree.campus || 'Campus a consultar'} · {degree.code}
                        </small>
                      </div>
                      <h3>{degree.name}</h3>
                      <PauOutlook {...{ degree, profile, round, hideGrades }} draft={draft} />
                      <div className="pau-degree-actions">
                        <Button onClick={() => setDetail(degree.code)}>Ponderacions</Button>
                        <Button
                          aria-pressed={topFive.includes(degree.code)}
                          disabled={
                            saving || (topFive.length >= 5 && !topFive.includes(degree.code))
                          }
                          onClick={() => addChoice(degree.code)}
                        >
                          {topFive.includes(degree.code) ? (
                            <>
                              <CheckCircle size={18} />
                              Al top 5 · {topFive.indexOf(degree.code) + 1}
                            </>
                          ) : topFive.length >= 5 ? (
                            'Top 5 complet'
                          ) : (
                            'Afegir al top 5'
                          )}
                        </Button>
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <Empty
                  title="Cap grau amb aquests filtres"
                  body="Prova una cerca més curta, una altra universitat o desmarca el filtre de nota."
                />
              )}
              {rows.length > limit && (
                <Button className="pau-more" onClick={() => setLimit((n) => n + 18)}>
                  Mostrar més opcions ({rows.length - limit} pendents)
                </Button>
              )}
            </>
          )}
        </section>
      )}
      {!catalogue &&
        (loadError ? (
          <div className="panel pau-load" role="alert">
            <p>{loadError}</p>
            <Button onClick={() => setReload((n) => n + 1)}>Tornar a carregar el catàleg</Button>
          </div>
        ) : (
          <p role="status" className="pau-load">
            Carregant dades oficials…
          </p>
        ))}
      <details className="panel pau-sources">
        <summary>Fonts oficials i informació d’accés</summary>
        <p>
          Catàleg de graus i títols propis inclosos en la preinscripció universitària catalana. Les
          universitats privades amb admissió pròpia poden tenir altres criteris. Cap absència de
          nota es transforma en un 5.
        </p>
        <p>
          Talls de la convocatòria de juny de 2026: 1a assignació (10/07) i última publicada, 6a
          (07/10). Les rondes de setembre corresponen a una altra convocatòria i no es barregen.
          Ponderacions 2026 i 2027. Revisió: 11/10/2026.
        </p>
        <p>
          Arribar al tall històric no garanteix plaça, ni substitueix la preinscripció, la prioritat
          de convocatòria o les proves d’aptitud personal (PAP). Revisa requisits, places i terminis
          al portal oficial.
        </p>
        <div className="pau-links">
          <SourceLink href={official + 'preinscripcions/notes-tall/'}>Notes de tall</SourceLink>
          <SourceLink href={official + 'preinscripcions/ponderacions/'}>Ponderacions</SourceLink>
          <SourceLink href={official + 'pau/que-qui/'}>Regles de càlcul</SourceLink>
          <SourceLink href={official + 'pau/'}>Calendari i exàmens</SourceLink>
          <SourceLink href="https://accesuniversitat.gencat.cat">Preinscripció oficial</SourceLink>
        </div>
      </details>
      <Modal
        open={!!detail}
        onClose={() => setDetail(null)}
        title={catalogue?.degrees.find((d) => d.code === detail)?.name || 'Detall del grau'}
        description="Nota d’admissió i ponderacions oficials del grau."
      >
        {catalogue?.degrees.find((d) => d.code === detail) && (
          <WeightDetails degree={catalogue.degrees.find((d) => d.code === detail)} />
        )}
      </Modal>
    </div>
  );
}
