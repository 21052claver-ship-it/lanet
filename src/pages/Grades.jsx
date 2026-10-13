import Select from '../components/Select';
import OptionsMenu from '../components/OptionsMenu';
import CourseGrades from '../components/CourseGrades';
import ResearchGrade from '../components/ResearchGrade';
import { courseGrade, courseSettingsFor } from '../../shared/course-grades';
import {
  EXTRA_ACTIVITY_SLOTS,
  extraActivityTitle,
  subjectActivities,
  isConfiguredActivity,
  activityCsvCells,
} from '../../shared/grade-activities';
import '../grade-activities.css';
import {
  MAIN_ASSESSMENTS,
  OPTIONAL_ASSESSMENTS,
  assessmentType,
  assessmentDefinition,
  activeAssessment,
} from '../../shared/assessments';
import { PrivateGrade, GradePrivacyToggle } from '../components/GradePrivacy';
import React, { useState, useRef, useEffect } from 'react';
import { useMediaQuery } from '../responsive';
import {
  Export,
  SlidersHorizontal,
  ArrowCounterClockwise,
  LockSimple,
  Plus,
  Target,
  DotsThree,
} from '@phosphor-icons/react';
import { useApp } from '../context';
import { download } from '../api';
import { PageTitle, Button, SubjectIcon, Tabs, Empty } from '../ui';
import {
  TERM_LABELS,
  weightedGrades,
  numberLabel,
  parseGrade,
  dateLabel,
} from '../../shared/domain';
const SUBJECT_DOTS = {
  math: '#91bcfa',
  smath: '#91bcfa',
  phy: '#b58cff',
  chem: '#ff9fc4',
  cat: '#ffb184',
  cast: '#7eb894',
  eng: '#ffdc6d',
  hist: '#dfccbe',
  phil: '#b9a6e7',
};
export default function Grades() {
  const cards = useMediaQuery('(max-width: 1200px)');
  const {
    data,
    enrolled: currentSubjects,
    subject,
    open,
    notify,
    hideGrades,
    gradeWrites,
  } = useApp();
  const { drafts, setDrafts, busy } = gradeWrites;
  const [editingGrade, setEditingGrade] = useState(null);
  const [exportConfirm, setExportConfirm] = useState(false);
  const [view, setView] = useState('terms');
  const exportConfirmRef = useRef(),
    toolbarRef = useRef();
  useEffect(() => {
    if (exportConfirm) exportConfirmRef.current?.focus();
  }, [exportConfirm]);
  function dismissExport() {
    setExportConfirm(false);
    toolbarRef.current?.querySelector('.section-options summary')?.focus();
  }
  const subjectOrder = ['math', 'smath', 'phy', 'chem', 'cat', 'cast', 'eng', 'hist', 'phil'];
  const enrolled = currentSubjects
    .filter((s) => s.assessed !== 0)
    .sort(
      (a, b) =>
        (subjectOrder.indexOf(a.id) < 0 ? 99 : subjectOrder.indexOf(a.id)) -
        (subjectOrder.indexOf(b.id) < 0 ? 99 : subjectOrder.indexOf(b.id)),
    );
  const [term, setTerm] = useState(1),
    [sheet, setSheet] = useState('summary'),
    [selected, setSelected] = useState(enrolled[0]?.id || null);
  const tableRef = useRef();
  const rows = data.grades.filter(
    (r) => r.term === term && enrolled.some((s) => s.id === r.subject_id),
  );
  const sheetRows = rows.filter((r) => r.subject_id === sheet);
  const activitiesBySubject = new Map(
    enrolled.map((s) => [s.id, subjectActivities(rows.filter((row) => row.subject_id === s.id))]),
  );
  const activityCount = Math.max(
    EXTRA_ACTIVITY_SLOTS,
    ...[...activitiesBySubject.values()].map((entries) => entries.length),
  );
  const columns = [
    ...MAIN_ASSESSMENTS.map((key) => ({ key, label: assessmentDefinition(key).label })),
    ...(rows.some((row) => assessmentType(row) === 'other_exam' && activeAssessment(row))
      ? [{ key: 'other_exam', label: 'Altres proves' }]
      : []),
    ...Array.from({ length: activityCount }, (_, index) => ({
      key: `activity_${index}`,
      label: extraActivityTitle(index),
      activityIndex: index,
    })),
  ];
  function write(entries, remember = true) {
    const submitted = Object.fromEntries(entries.map((entry) => [entry.id, drafts[entry.id]]));
    return gradeWrites.write(entries, { remember }).then((saved) => {
      if (saved)
        setDrafts((d) => {
          const n = { ...d };
          entries.forEach((e) => {
            if (n[e.id] === submitted[e.id]) delete n[e.id];
          });
          return n;
        });
      return saved;
    });
  }
  function commit(row) {
    if (!(row.id in drafts)) return;
    try {
      const grade = parseGrade(drafts[row.id]);
      write([{ id: row.id, grade }]);
    } catch (e) {
      notify(e.message, 'error');
      setDrafts((d) => {
        const n = { ...d };
        delete n[row.id];
        return n;
      });
    }
  }
  function navigation(e) {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
      e.preventDefault();
      gradeWrites.undo();
      return;
    }
    const direction = {
      ArrowDown: [1, 0],
      Enter: [e.shiftKey ? -1 : 1, 0],
      ArrowUp: [-1, 0],
      ArrowLeft: [0, -1],
      ArrowRight: [0, 1],
    }[e.key];
    if (!direction || !e.target.matches('[data-row]')) return;
    if (
      ['ArrowLeft', 'ArrowRight'].includes(e.key) &&
      e.target.selectionStart !== e.target.selectionEnd
    )
      return;
    e.preventDefault();
    const r = Number(e.target.dataset.row),
      c = Number(e.target.dataset.col);
    const next = [...tableRef.current.querySelectorAll('[data-row][data-col]')]
      .filter(
        (element) =>
          element.getClientRects().length &&
          (direction[0]
            ? Number(element.dataset.col) === c &&
              (Number(element.dataset.row) - r) * direction[0] > 0
            : Number(element.dataset.row) === r &&
              (Number(element.dataset.col) - c) * direction[1] > 0),
      )
      .sort((a, b) =>
        direction[0]
          ? Math.abs(Number(a.dataset.row) - r) - Math.abs(Number(b.dataset.row) - r)
          : Math.abs(Number(a.dataset.col) - c) - Math.abs(Number(b.dataset.col) - c),
      )[0];
    if (next) {
      next.focus();
      next.select?.();
    }
  }
  function paste(e) {
    if (!e.target.matches('input[data-row]')) return;
    const text = e.clipboardData.getData('text/plain').trim();
    if (!text.includes('\t') && !text.includes('\n') && !text.includes(';')) return;
    e.preventDefault();
    const r = Number(e.target.dataset.row),
      c = Number(e.target.dataset.col);
    const entries = [];
    try {
      for (const [line, y] of text.split(/\r?\n/).map((line, y) => [line, y]))
        for (const [value, x] of line
          .split(text.includes('\t') ? '\t' : ';')
          .map((value, x) => [value, x])) {
          const input = tableRef.current.querySelector(
            `input[data-row="${r + y}"][data-col="${c + x}"]`,
          );
          if (input?.getClientRects().length)
            entries.push({ id: input.dataset.entry, grade: parseGrade(value) });
        }
      write(entries);
    } catch (error) {
      notify(error.message, 'error');
    }
  }
  function gradeInput(row, r, c) {
    const failed = gradeWrites.failed.find((entry) => entry.id === row.id);
    const draft =
      drafts[row.id] ??
      (failed ? (failed.grade === null ? '' : numberLabel(failed.grade, 1)) : undefined);
    return (
      <span
        className={`grade-cell-control${failed ? ' grade-cell-pending' : ''}`}
        title={
          row.title +
          ' · ' +
          assessmentDefinition(assessmentType(row)).label +
          ' · ' +
          numberLabel(row.weight, 2) +
          '% del trimestre'
        }
      >
        {row.category === 'activity' && !/^Activitat extra \d+$/.test(row.title) && (
          <small className="grade-activity-title">{row.title}</small>
        )}
        <input
          className="grade-input"
          inputMode="decimal"
          aria-label={`${subject(row.subject_id)?.short}: ${row.title}`}
          aria-description={`${numberLabel(row.weight, 2)}% del trimestre. ${row.category === 'activity' ? assessmentDefinition(assessmentType(row)).label + '. ' : ''}${failed ? 'Canvi pendent de desar. ' : ''}${hideGrades ? 'Nota desada oculta. Escriu per afegir o substituir. Suprimir esborra la nota; zero és vàlid.' : 'Buit: pendent; zero és una nota vàlida.'}`}
          data-row={r}
          data-col={c}
          data-entry={row.id}
          autoComplete="off"
          value={
            hideGrades
              ? editingGrade === row.id
                ? (draft ?? '')
                : ''
              : (draft ?? (row.grade === null ? '' : numberLabel(row.grade, 1)))
          }
          placeholder={hideGrades ? (row.grade === null ? 'Afegir' : '•••') : '—'}
          onChange={(e) => setDrafts((d) => ({ ...d, [row.id]: e.target.value }))}
          onFocus={(e) => {
            setSelected(row.subject_id);
            setEditingGrade(row.id);
            e.target.select();
          }}
          onBlur={() => {
            setEditingGrade(null);
            commit(row);
          }}
          onKeyDown={(e) => {
            if (hideGrades && ['Backspace', 'Delete'].includes(e.key) && !e.currentTarget.value)
              setDrafts((d) => ({ ...d, [row.id]: '' }));
          }}
        />
        <small className="grade-cell-weight">
          {numberLabel(row.weight, Number.isInteger(row.weight) ? 0 : 2)}%
          {row.category === 'activity' && <> · {assessmentDefinition(assessmentType(row)).label}</>}
        </small>
      </span>
    );
  }
  function categoryRows(s, c) {
    if (c.activityIndex !== undefined) {
      const row = activitiesBySubject.get(s.id)?.[c.activityIndex];
      return row ? [row] : [];
    }
    return rows.filter(
      (row) =>
        row.subject_id === s.id &&
        (c.key === 'activities'
          ? row.category === 'activity' && activeAssessment(row)
          : assessmentType(row) === c.key),
    );
  }
  function subjectTable(entries) {
    return (
      <table className="subject-sheet">
        <thead>
          <tr>
            <th className="row-index">#</th>
            <th className="frozen">Prova / activitat</th>
            <th>Data</th>
            <th>Nota i pes</th>
            <th className="calculated">Aportació</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((row, index) => (
            <tr key={row.id}>
              <td className="row-index">{index + 1}</td>
              <th className="frozen">
                {row.title}
                <small>{assessmentDefinition(assessmentType(row)).label}</small>
              </th>
              <td data-label="Data">{row.date ? dateLabel(row.date) : '—'}</td>
              <td data-label="Nota i pes">{gradeInput(row, sheetRows.indexOf(row), 0)}</td>
              <td data-label="Aportació" className="calculated">
                <PrivateGrade>
                  {row.grade === null ? '—' : numberLabel((row.grade * row.weight) / 100, 2)}
                </PrivateGrade>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    );
  }
  function csv(confirmed = false) {
    const menu = toolbarRef.current?.querySelector('.section-options');
    if (menu) menu.open = false;
    if (hideGrades && !confirmed) {
      setExportConfirm(true);
      return;
    }
    if (exportConfirm) dismissExport();
    const csvRows = [
      view === 'course'
        ? [
            'Assignatura',
            ...TERM_LABELS,
            'Base del curs',
            'Plusos corregits',
            'Nota final',
            'Estat',
          ]
        : [
            'Assignatura',
            ...columns.flatMap((c) =>
              c.activityIndex === undefined
                ? [c.label]
                : [c.label, `${c.label} · Tipus`, `${c.label} · Nom`, `${c.label} · Pes (%)`],
            ),
            'Mitjana',
            'Avaluat (%)',
          ],
    ];
    for (const s of enrolled) {
      if (view === 'course') {
        const result = courseGrade(
          data.grades.filter((entry) => entry.subject_id === s.id),
          (data.gradeBonuses || []).filter((bonus) => bonus.subject_id === s.id),
          courseSettingsFor(data.courseSettings, s.id),
        );
        csvRows.push([
          s.short,
          ...result.terms.map((term) => numberLabel(term.mean, 2)),
          numberLabel(result.base, 2),
          numberLabel(result.bonus, 2),
          numberLabel(result.total, 2),
          result.complete ? 'Completa' : 'Provisional',
        ]);
        continue;
      }
      const rs = rows.filter((r) => r.subject_id === s.id),
        summary = weightedGrades(rs);
      csvRows.push([
        s.short,
        ...columns.flatMap((c) => {
          const entries = categoryRows(s, c);
          const grade = entries.length === 1 ? entries[0].grade : weightedGrades(entries).mean;
          return [
            numberLabel(grade, 2),
            ...(c.activityIndex === undefined ? [] : activityCsvCells(entries[0])),
          ];
        }),
        numberLabel(summary.mean, 2),
        summary.evaluated,
      ]);
    }
    download(
      view === 'course' ? 'la-net-notes-finals.csv' : `la-net-notes-trimestre-${term}.csv`,
      '\uFEFF' +
        csvRows
          .map((r) => r.map((x) => '"' + String(x).replaceAll('"', '""') + '"').join(';'))
          .join('\r\n'),
      'text/csv;charset=utf-8',
    );
  }
  const selectedSubject = subject(sheet === 'summary' ? selected : sheet);
  const summary = weightedGrades(sheetRows);
  return (
    <>
      <PageTitle
        title="Les meves notes"
        subtitle={
          view === 'research'
            ? 'Treball de Recerca · calculadora personal'
            : 'Privades i amb desament automàtic'
        }
      />
      <Tabs
        className="grade-view-tabs"
        label="Vista de les notes"
        items={[
          ['terms', 'Trimestres'],
          ['course', 'Nota final'],
          ['research', 'Recerca'],
        ]}
        value={view}
        onChange={(value) => {
          setView(value);
          setExportConfirm(false);
        }}
      />
      {view !== 'research' && (
        <div className="grades-toolbar" ref={toolbarRef}>
          <GradePrivacyToggle />
          {view === 'terms' && (
            <Select
              aria-label="Trimestre"
              value={term}
              onChange={(e) => {
                setTerm(Number(e.target.value));
              }}
            >
              {TERM_LABELS.map((t, i) => (
                <option key={t} value={i + 1}>
                  {t}
                </option>
              ))}
            </Select>
          )}
          {gradeWrites.canUndo && (
            <Button
              disabled={!gradeWrites.canUndo}
              aria-label="Desfer l’última nota"
              onClick={gradeWrites.undo}
            >
              <ArrowCounterClockwise size={18} />
            </Button>
          )}
          <OptionsMenu label="Opcions del full de notes">
            <Button variant="ghost" disabled={!enrolled.length} onClick={() => csv()}>
              <Export size={18} /> Exportar les notes en CSV
            </Button>
            {view === 'terms' && selectedSubject && (
              <>
                <Button
                  variant="ghost"
                  onClick={() => open('goal', { subject_id: selectedSubject.id, term })}
                >
                  <Target size={17} /> Objectiu i previsió
                </Button>
                <Button
                  variant="ghost"
                  disabled={busy}
                  onClick={() => open('restoreGrades', { subject_id: selectedSubject.id, term })}
                >
                  Recuperar plantilla
                </Button>
              </>
            )}
            <p className="options-help">
              {view === 'terms'
                ? 'Tab i Enter per avançar · Enganxa des d’Excel · Ctrl+Z per desfer. '
                : 'Configura els pesos i els plusos des de cada assignatura. '}
              Una casella buida és pendent; zero és una nota vàlida.
            </p>
          </OptionsMenu>
          <span className={`grade-save-status ${busy ? 'is-busy' : 'sr-only'}`} role="status">
            {busy ? 'Desant…' : 'Els canvis es desen automàticament'}
          </span>
          {view === 'terms' && (
            <Button
              variant="primary"
              className="grades-add"
              disabled={!enrolled.length || busy}
              onClick={() =>
                open('gradeSheet', { subject_id: selectedSubject?.id || enrolled[0]?.id, term })
              }
            >
              <SlidersHorizontal size={20} />
              Configurar avaluació
            </Button>
          )}
        </div>
      )}
      {exportConfirm && (
        <div className="grade-export-confirm course-export-confirm" role="alert">
          <p>
            <strong>El CSV contindrà les notes reals.</strong> El mode discret només les oculta a la
            pantalla.
          </p>
          <Button ref={exportConfirmRef} variant="primary" onClick={() => csv(true)}>
            Descarregar el CSV amb les notes
          </Button>
          <Button onClick={dismissExport}>Cancel·lar</Button>
        </div>
      )}
      {gradeWrites.failed.length > 0 && (
        <div className="grade-retry-note" role="alert">
          <p>
            <strong>
              {gradeWrites.failed.length}{' '}
              {gradeWrites.failed.length === 1
                ? 'canvi pendent de desar'
                : 'canvis pendents de desar'}
              .
            </strong>{' '}
            Es conserven mentre naveges per La Net. Revisa la connexió i torna-ho a provar.
          </p>
          <Button
            disabled={busy}
            onClick={async () => {
              const submitted = { ...drafts };
              const failedIds = new Set(gradeWrites.failed.map((entry) => entry.id));
              const result = await gradeWrites.retry();
              if (result.every(Boolean))
                setDrafts((current) =>
                  Object.fromEntries(
                    Object.entries(current).filter(
                      ([id, value]) => !failedIds.has(id) || submitted[id] !== value,
                    ),
                  ),
                );
            }}
          >
            Reintentar desament
          </Button>
        </div>
      )}
      {hideGrades && (
        <div className="grade-privacy-note" role="status">
          <LockSimple size={19} />
          <span>Notes ocultes. Pots escriure a qualsevol casella per afegir-ne una.</span>
        </div>
      )}
      {view === 'research' ? (
        <ResearchGrade />
      ) : view === 'course' ? (
        <CourseGrades subjects={enrolled} />
      ) : (
        <>
          <div className="sheet-selector">
            <Select
              aria-label="Full de notes"
              value={sheet}
              onChange={(event) => {
                setSheet(event.target.value);
                if (event.target.value !== 'summary') setSelected(event.target.value);
              }}
            >
              <option value="summary">Resum de totes les assignatures</option>
              {enrolled.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name || s.short}
                </option>
              ))}
            </Select>
          </div>
          <div
            className={`spreadsheet panel ${sheet === 'summary' ? 'summary-view' : 'subject-view'}`}
            data-cards={cards}
            ref={tableRef}
            onKeyDown={navigation}
            onPaste={paste}
          >
            {sheet === 'summary' ? (
              <table
                className="grade-summary-table"
                style={
                  cards
                    ? undefined
                    : { minWidth: 1100 + (activityCount - EXTRA_ACTIVITY_SLOTS) * 100 }
                }
                role="table"
                aria-label={`Notes del ${TERM_LABELS[term - 1]}`}
              >
                <colgroup>
                  <col className="grade-col-index" />
                  <col className="grade-col-subject" />
                  {columns.map((column) => (
                    <col key={column.key} />
                  ))}
                  <col className="grade-col-mean" />
                  <col className="grade-col-evaluated" />
                </colgroup>
                <thead role="rowgroup">
                  <tr role="row">
                    <th className="row-index" role="columnheader" scope="col">
                      #
                    </th>
                    <th className="frozen" role="columnheader" scope="col">
                      Assignatura
                    </th>
                    {columns.map((c) => (
                      <th key={c.key} role="columnheader" scope="col">
                        {c.label}
                      </th>
                    ))}
                    <th className="calculated" role="columnheader" scope="col">
                      Mitjana
                    </th>
                    <th className="calculated" role="columnheader" scope="col">
                      Avaluat
                    </th>
                  </tr>
                </thead>
                <tbody role="rowgroup">
                  {enrolled.map((s, r) => {
                    const rs = rows.filter((g) => g.subject_id === s.id),
                      sum = weightedGrades(rs);
                    return (
                      <tr role="row" key={s.id} className={selected === s.id ? 'selected-row' : ''}>
                        <td role="cell" className="row-index">
                          {r + 1}
                        </td>
                        <th role="rowheader" scope="row" className="frozen">
                          <button
                            aria-label={`Veure el full de ${s.short}`}
                            onClick={() => {
                              setSheet(s.id);
                              setSelected(s.id);
                            }}
                          >
                            <span style={{ background: SUBJECT_DOTS[s.id] || s.color }}>
                              <SubjectIcon id={s.id} />
                            </span>
                            {['math', 'smath', 'cast'].includes(s.id)
                              ? s.name || s.short
                              : s.short || s.name}
                          </button>
                        </th>
                        {columns.map((c, i) => {
                          const category = categoryRows(s, c);
                          return (
                            <td
                              role="cell"
                              key={c.key}
                              data-label={c.label}
                              className={
                                c.activityIndex !== undefined ? 'grade-extra-cell' : undefined
                              }
                            >
                              {category.length === 1 ? (
                                <div
                                  className={
                                    category[0].grade === null && category[0].date
                                      ? 'grade-pending'
                                      : ''
                                  }
                                >
                                  {gradeInput(category[0], r, i)}
                                  {category[0].grade === null && category[0].date && (
                                    <small className="grade-date">
                                      {dateLabel(category[0].date)}
                                    </small>
                                  )}
                                </div>
                              ) : category.length > 1 ? (
                                <button
                                  className="aggregate-cell"
                                  data-row={r}
                                  data-col={i}
                                  onClick={() => setSheet(s.id)}
                                  title="Veure les proves que formen aquesta mitjana"
                                  aria-label={`${s.short}: ${category.length} activitats, pes conjunt ${category.reduce((sum, r) => sum + r.weight, 0)}%. Obrir detall`}
                                >
                                  <strong>
                                    <PrivateGrade>
                                      {numberLabel(weightedGrades(category).mean)}
                                    </PrivateGrade>
                                  </strong>
                                  <small>
                                    {category.length} proves ·{' '}
                                    {numberLabel(
                                      category.reduce((sum, r) => sum + r.weight, 0),
                                      2,
                                    )}
                                    %
                                  </small>
                                </button>
                              ) : c.activityIndex !== undefined ? (
                                <button
                                  type="button"
                                  className="grade-activity-add"
                                  disabled={busy}
                                  aria-label={`${s.short}: configurar l’activitat extra ${c.activityIndex + 1}`}
                                  onClick={() =>
                                    open('gradeSheet', {
                                      subject_id: s.id,
                                      term,
                                      activity_index: c.activityIndex,
                                    })
                                  }
                                >
                                  <Plus size={15} /> Afegir
                                </button>
                              ) : (
                                <span className="muted">—</span>
                              )}
                            </td>
                          );
                        })}
                        <td role="cell" data-label="Mitjana" className="calculated grade-mean">
                          <PrivateGrade>{numberLabel(sum.mean)}</PrivateGrade>
                        </td>
                        <td role="cell" data-label="Avaluat" className="calculated evaluated-cell">
                          <span>{numberLabel(sum.evaluated, 0)}%</span>
                          <i style={{ width: Math.min(100, sum.evaluated) + '%' }} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            ) : (
              <div className="subject-assessment-sheet">
                {subjectTable(sheetRows.filter((row) => row.category === 'exam'))}
                {OPTIONAL_ASSESSMENTS.map((type) => {
                  const entries = sheetRows.filter((row) => assessmentType(row) === type.key);
                  const weight = entries.reduce((sum, row) => sum + row.weight, 0);
                  return (
                    <details
                      className="assessment-optional"
                      key={type.key}
                      open={entries.some(isConfiguredActivity)}
                    >
                      <summary>
                        <strong>{type.plural}</strong>
                        <span>
                          {entries.length} caselles ·{' '}
                          {numberLabel(weight, Number.isInteger(weight) ? 0 : 2)}%
                        </span>
                      </summary>
                      {entries.length ? (
                        subjectTable(entries)
                      ) : (
                        <p className="assessment-hint">Afegeix-les des de Configurar avaluació.</p>
                      )}
                    </details>
                  );
                })}
                {sheetRows.some((row) => assessmentType(row) === 'other_activity') && (
                  <details className="assessment-optional" open>
                    <summary>
                      <strong>Altres activitats</strong>
                    </summary>
                    {subjectTable(
                      sheetRows.filter((row) => assessmentType(row) === 'other_activity'),
                    )}
                  </details>
                )}
                <div className="subject-grade-total">
                  <strong>Mitjana provisional</strong>
                  <strong className="grade-mean">
                    <PrivateGrade>{numberLabel(summary.mean)}</PrivateGrade>
                  </strong>
                  <small>
                    {numberLabel(summary.evaluated, 2)}% avaluat · {numberLabel(summary.total, 2)}%
                    configurat
                  </small>
                </div>
              </div>
            )}
          </div>
        </>
      )}
      {!enrolled.length && (
        <Empty
          title="Tria les assignatures del curs"
          body="Les notes apareixeran en aquest full quan configuris el curs."
        />
      )}
    </>
  );
}
