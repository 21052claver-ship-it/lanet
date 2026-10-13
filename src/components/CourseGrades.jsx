import React, { useState } from 'react';
import { clientId } from '../../shared/client-id';
import {
  Plus,
  Trash,
  Check,
  ArrowRight,
  SlidersHorizontal,
  ArrowCounterClockwise,
} from '@phosphor-icons/react';
import { useApp } from '../context';
import { Button, Field, FormError, IconButton, SubjectIcon } from '../ui';
import Select from './Select';
import { PrivateGrade, GradePrivacyToggle } from './GradePrivacy';
import { useSubmit } from '../form-utils';
import { numberLabel, TERM_LABELS } from '../../shared/domain';
import {
  courseGrade,
  courseSettingsFor,
  bonusMaximum,
  parseBonusGrade,
  BONUS_TYPES,
  COURSE_WEIGHTS,
  CUMULATIVE_WEIGHTS,
} from '../../shared/course-grades';
import { evaluationKind } from '../../shared/student-guide';

function subjectResult(data, subjectId) {
  return courseGrade(
    data.grades.filter((entry) => entry.subject_id === subjectId),
    (data.gradeBonuses || []).filter((bonus) => bonus.subject_id === subjectId),
    courseSettingsFor(data.courseSettings, subjectId),
  );
}
function FinalFigures({ result }) {
  return (
    <div className="course-figures" aria-label="Càlcul de la nota final">
      <div>
        <small>Base del curs</small>
        <strong className="course-base">
          <PrivateGrade>{numberLabel(result.base, 2)}</PrivateGrade>
        </strong>
      </div>
      <span aria-hidden="true">+</span>
      <div>
        <small>Plusos corregits</small>
        <strong className="course-bonus">
          <PrivateGrade>{numberLabel(result.bonus, 2)}</PrivateGrade>
        </strong>
      </div>
      <span aria-hidden="true">=</span>
      <div className="course-total">
        <small>{result.complete ? 'Nota final' : 'Final provisional'}</small>
        <strong className="course-total-number">
          <PrivateGrade>{numberLabel(result.total, 2)}</PrivateGrade>
        </strong>
      </div>
    </div>
  );
}
function TermFigures({ result }) {
  return (
    <div className="course-terms">
      {result.terms.map((term) => (
        <div key={term.term}>
          <small>{TERM_LABELS[term.term - 1]}</small>
          <strong>
            <PrivateGrade>{numberLabel(term.mean, 2)}</PrivateGrade>
          </strong>
          <span>
            {numberLabel(term.weight, 2)}% del curs
            {term.mean !== null && !term.complete ? ' · provisional' : ''}
          </span>
        </div>
      ))}
    </div>
  );
}
export default function CourseGrades({ subjects }) {
  const { data, open } = useApp();
  return (
    <div className="course-grades">
      <p className="course-explanation">
        La mitjana del curs segons els pesos de cada assignatura, més els plusos corregits. Màxim
        dos de 0,25 o un de 0,50.
      </p>
      <div className="course-grid">
        {subjects.map((subject) => {
          const result = subjectResult(data, subject.id);
          return (
            <article className="panel course-card" key={subject.id} data-subject={subject.id}>
              <h2>
                <span className="course-subject-icon" style={{ background: subject.color }}>
                  <SubjectIcon id={subject.id} />
                </span>
                {subject.name || subject.short}
              </h2>
              <p className="course-evaluation-kind">
                {evaluationKind(subject.id) === 'cumulative'
                  ? 'Acumulativa'
                  : evaluationKind(subject.id) === 'equal'
                    ? 'No acumulativa'
                    : 'Pesos configurables'}
                {(data.courseSettings || []).some((setting) => setting.subject_id === subject.id)
                  ? ' · càlcul personalitzat'
                  : ' · pesos orientatius'}
              </p>
              <TermFigures result={result} />
              <FinalFigures result={result} />
              <div className="course-card-footer">
                <span className="course-state">
                  {result.complete ? (
                    <>
                      <Check size={15} />
                      Completa
                    </>
                  ) : (
                    `Provisional · ${result.knownTerms}/3 trimestres`
                  )}
                  {result.pending > 0 &&
                    ` · ${result.pending} ${result.pending === 1 ? 'plus pendent' : 'plusos pendents'}`}
                </span>
                <Button
                  aria-label={`Plusos i càlcul de ${subject.short}`}
                  onClick={() => open('courseSubject', { subject_id: subject.id })}
                >
                  Plusos i càlcul
                  <ArrowRight size={17} />
                </Button>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}

function BonusGrade({ bonus }) {
  const { hideGrades, gradeWrites } = useApp();
  const { drafts, setDrafts } = gradeWrites;
  const [editing, setEditing] = useState(false),
    [error, setError] = useState('');
  const failed = gradeWrites.failed.find((entry) => entry.id === bonus.id);
  const draft =
    drafts[bonus.id] ??
    (failed ? (failed.grade === null ? '' : String(failed.grade).replace('.', ',')) : undefined);
  async function commit() {
    if (!(bonus.id in drafts)) return;
    const submitted = drafts[bonus.id];
    try {
      const grade = parseBonusGrade(submitted, bonus.capacity * 0.25);
      setError('');
      if (await gradeWrites.write([{ id: bonus.id, grade }]))
        setDrafts((current) => {
          if (current[bonus.id] !== submitted) return current;
          const next = { ...current };
          delete next[bonus.id];
          return next;
        });
    } catch (error) {
      setError(error.message);
    }
  }
  return (
    <div className="bonus-score">
      <label>
        <span>Nota corregida</span>
        <input
          className="bonus-grade-input"
          inputMode="decimal"
          autoComplete="off"
          aria-label={`Nota del plus ${bonus.title}`}
          aria-invalid={!!error}
          aria-description={`Entre 0 i ${String(bonus.capacity * 0.25).replace('.', ',')}. Buit: pendent; zero és vàlid. ${hideGrades ? 'Nota desada oculta. Escriu per afegir o substituir.' : ''}`}
          data-entry={bonus.id}
          value={
            hideGrades
              ? editing
                ? (draft ?? '')
                : ''
              : (draft ?? (bonus.grade === null ? '' : String(bonus.grade).replace('.', ',')))
          }
          placeholder={hideGrades && bonus.grade !== null ? '•••' : 'Pendent'}
          onFocus={(event) => {
            setEditing(true);
            event.target.select();
          }}
          onChange={(event) => {
            setError('');
            setDrafts((current) => ({ ...current, [bonus.id]: event.target.value }));
          }}
          onBlur={() => {
            setEditing(false);
            commit();
          }}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              event.currentTarget.blur();
            }
            if (
              hideGrades &&
              ['Backspace', 'Delete'].includes(event.key) &&
              !event.currentTarget.value
            )
              setDrafts((current) => ({ ...current, [bonus.id]: '' }));
          }}
        />
        <small>De 0 a {numberLabel(bonus.capacity * 0.25, 2)}</small>
      </label>
      <FormError error={error} />
      {failed && (
        <p className="bonus-save-error" role="alert">
          Canvi pendent de desar.{' '}
          <Button
            onClick={async () => {
              const submitted = { ...drafts };
              const failedIds = new Set(gradeWrites.failed.map((entry) => entry.id));
              if ((await gradeWrites.retry()).every(Boolean))
                setDrafts((current) =>
                  Object.fromEntries(
                    Object.entries(current).filter(
                      ([id, value]) => !failedIds.has(id) || submitted[id] !== value,
                    ),
                  ),
                );
            }}
          >
            Reintentar
          </Button>
        </p>
      )}
    </div>
  );
}
function BonusRow({ bonus }) {
  const { mutate, setData, gradeWrites } = useApp();
  const [confirm, setConfirm] = useState(false);
  const { busy, error, submit } = useSubmit();
  return (
    <article className="personal-bonus">
      <div className="personal-bonus-heading">
        <div>
          <strong>{bonus.title}</strong>
          <small>
            Màxim +{numberLabel(bonus.capacity * 0.25, 2)} ·{' '}
            {bonus.plus_id ? 'Activitat de Plusos' : 'Registre personal'}
          </small>
        </div>
        <IconButton
          label={`Treure el plus ${bonus.title}`}
          disabled={busy || gradeWrites.busy}
          onClick={() => setConfirm(true)}
        >
          <Trash size={18} />
        </IconButton>
      </div>
      {confirm ? (
        <div className="bonus-remove-confirm">
          <p>Treure aquest plus de les teves notes?</p>
          <Button
            busy={busy}
            onClick={submit(() =>
              mutate('/grades/bonus/remove', { id: bonus.id }, null, () =>
                setData((current) => ({
                  ...current,
                  gradeBonuses: current.gradeBonuses.filter((item) => item.id !== bonus.id),
                })),
              ),
            )}
          >
            Treure plus
          </Button>
          <Button disabled={busy} onClick={() => setConfirm(false)}>
            Cancel·lar
          </Button>
        </div>
      ) : (
        <BonusGrade bonus={bonus} />
      )}
      <FormError error={error} />
    </article>
  );
}
function AddBonus({ subjectId, remaining, initialPlus, onDone }) {
  const { data, mutate, setData } = useApp();
  const candidates = data.pluses.filter(
    (plus) =>
      plus.subjects.some(
        (item) =>
          item.subject_id === subjectId &&
          bonusMaximum(item.bonus) !== null &&
          bonusMaximum(item.bonus) / 0.25 <= remaining,
      ) &&
      !(data.gradeBonuses || []).some(
        (bonus) => bonus.subject_id === subjectId && bonus.plus_id === plus.id,
      ),
  );
  const [source, setSource] = useState(
    candidates.some((plus) => plus.id === initialPlus) ? initialPlus : 'manual',
  );
  const [title, setTitle] = useState(''),
    [maximum, setMaximum] = useState(0.25),
    [grade, setGrade] = useState('');
  const [key] = useState(() => `bonus:${clientId()}`);
  const { busy, error, submit } = useSubmit(onDone);
  const activity = candidates.find((plus) => plus.id === source);
  const max = activity
    ? bonusMaximum(activity.subjects.find((item) => item.subject_id === subjectId).bonus)
    : maximum;
  if (initialPlus && !candidates.some((plus) => plus.id === initialPlus))
    return (
      <div className="bonus-limit" role="status">
        <p>
          Aquest plus no cap en els espais que et queden o ja no està disponible. Revisa els plusos
          que tens registrats.
        </p>
        <Button onClick={onDone}>Tornar als meus plusos</Button>
      </div>
    );
  return (
    <form
      className="add-bonus-form"
      onSubmit={submit(async () => {
        const earned = parseBonusGrade(grade, max);
        await mutate(
          '/grades/bonus',
          {
            id: key,
            subject_id: subjectId,
            plus_id: activity?.id || null,
            title,
            maximum: max,
            grade: earned,
          },
          null,
          (result) =>
            setData((current) => ({
              ...current,
              gradeBonuses: current.gradeBonuses.some((bonus) => bonus.id === result.id)
                ? current.gradeBonuses
                : [
                    ...current.gradeBonuses,
                    {
                      id: result.id,
                      user_id: data.user.id,
                      subject_id: subjectId,
                      plus_id: activity?.id || null,
                      title: activity?.title || title,
                      capacity: max / 0.25,
                      grade: earned,
                    },
                  ],
            })),
        );
      })}
    >
      {candidates.length > 0 && (
        <Field label="Activitat">
          <Select
            aria-label="Activitat del plus"
            value={source}
            onChange={(event) => {
              setSource(event.target.value);
              setGrade('');
            }}
          >
            <option value="manual">Escriure una activitat</option>
            {candidates.map((plus) => (
              <option key={plus.id} value={plus.id}>
                {plus.title}
              </option>
            ))}
          </Select>
        </Field>
      )}
      {!activity && (
        <Field label="Nom del plus">
          <input
            required
            maxLength={120}
            value={title}
            onChange={(event) => setTitle(event.target.value)}
          />
        </Field>
      )}
      <Field label="Tipus de plus">
        <Select
          aria-label="Tipus de plus"
          value={max}
          disabled={!!activity}
          onChange={(event) => {
            setMaximum(Number(event.target.value));
            setGrade('');
          }}
        >
          {BONUS_TYPES.filter((type) => type.capacity <= remaining || type.maximum === max).map(
            (type) => (
              <option key={type.capacity} value={type.maximum}>
                {type.label}
              </option>
            ),
          )}
        </Select>
      </Field>
      <Field
        label="Nota corregida (opcional)"
        hint={`Entre 0 i ${numberLabel(max, 2)}. Deixa-la buida si encara no està corregit.`}
      >
        <input
          aria-label="Nota corregida del nou plus"
          inputMode="decimal"
          autoComplete="off"
          value={grade}
          onChange={(event) => setGrade(event.target.value)}
        />
      </Field>
      <FormError error={error} />
      <div className="row-actions">
        <Button type="submit" variant="primary" busy={busy}>
          Afegir a les meves notes
        </Button>
        <Button type="button" disabled={busy} onClick={onDone}>
          Cancel·lar
        </Button>
      </div>
    </form>
  );
}
function CourseSettings({ subjectId }) {
  const { data, mutate, setData } = useApp();
  const initial = courseSettingsFor(data.courseSettings, subjectId);
  const [mode, setMode] = useState(
    initial?.equal_terms !== 0
      ? 'equal'
      : CUMULATIVE_WEIGHTS.every(
            (weight, index) => Math.abs(weight - initial[`term${index + 1}_weight`]) < 0.001,
          )
        ? 'cumulative'
        : 'custom',
  );
  const [limit, setLimit] = useState(initial?.limit_to_ten !== 0);
  const [weights, setWeights] = useState(
    initial
      ? [initial.term1_weight, initial.term2_weight, initial.term3_weight].map(String)
      : COURSE_WEIGHTS.map(String),
  );
  const { busy, error, submit } = useSubmit();
  return (
    <details className="course-settings">
      <summary>
        <SlidersHorizontal size={18} />
        Pesos i límit de la nota final
      </summary>
      <form
        onSubmit={submit(async () => {
          const values = weights.map((weight) => Number(weight.replace(',', '.')));
          const setting = {
            subject_id: subjectId,
            equal_terms: mode === 'equal' ? 1 : 0,
            limit_to_ten: limit ? 1 : 0,
            term1_weight: values[0],
            term2_weight: values[1],
            term3_weight: values[2],
          };
          await mutate(
            '/grades/course',
            {
              subject_id: subjectId,
              equal_terms: mode === 'equal',
              limit_to_ten: limit,
              weights: values,
            },
            'Càlcul final actualitzat.',
            () =>
              setData((current) => ({
                ...current,
                courseSettings: [
                  ...current.courseSettings.filter((item) => item.subject_id !== subjectId),
                  setting,
                ],
              })),
          );
        })}
      >
        <Field label="Pes dels trimestres">
          <Select
            aria-label="Pes dels trimestres"
            value={mode}
            onChange={(event) => {
              const next = event.target.value;
              setMode(next);
              if (next !== 'custom')
                setWeights((next === 'equal' ? COURSE_WEIGHTS : CUMULATIVE_WEIGHTS).map(String));
            }}
          >
            <option value="equal">Iguals: un terç cadascun</option>
            <option value="cumulative">Acumulativa: 16,67% · 33,33% · 50%</option>
            <option value="custom">Percentatges personalitzats</option>
          </Select>
        </Field>
        {mode === 'cumulative' && (
          <p className="course-weight-summary">1r: 16,67% · 2n: 33,33% · 3r: 50%</p>
        )}
        {mode === 'custom' && (
          <div className="course-weight-inputs">
            {weights.map((weight, index) => (
              <Field key={index} label={`${TERM_LABELS[index]} (%)`}>
                <input
                  aria-label={`Pes del trimestre ${index + 1}`}
                  inputMode="decimal"
                  required
                  value={weight}
                  onChange={(event) =>
                    setWeights((current) =>
                      current.map((value, i) => (i === index ? event.target.value : value)),
                    )
                  }
                />
              </Field>
            ))}
          </div>
        )}
        <label className="course-cap-option">
          <input
            type="checkbox"
            checked={limit}
            onChange={(event) => setLimit(event.target.checked)}
          />
          Limitar la nota final a 10
        </label>
        <p className="assessment-hint">
          La classificació acumulativa és la del centre. Els percentatges són orientatius; confirma
          els criteris de la matèria amb el professorat. La teva configuració desada es conserva.
        </p>
        <p className="assessment-hint">
          Els plusos se sumen després de calcular la base del curs. Els pesos personalitzats han de
          sumar el 100%.
        </p>
        <FormError error={error} />
        <Button type="submit" busy={busy}>
          Desar el càlcul
        </Button>
      </form>
    </details>
  );
}
export function CourseSubject({ item }) {
  const { data, subject, enrolled, gradeWrites } = useApp();
  const selected = subject(item.subject_id);
  const bonuses = (data.gradeBonuses || []).filter((bonus) => bonus.subject_id === item.subject_id);
  const result = subjectResult(data, item.subject_id);
  const remaining = 2 - result.capacity;
  const [adding, setAdding] = useState(
    !!item.plus_id && !bonuses.some((bonus) => bonus.plus_id === item.plus_id),
  );
  const [requestedPlus, setRequestedPlus] = useState(item.plus_id || null);
  if (!selected || !enrolled.some((subject) => subject.id === selected.id))
    return <p>Tria una assignatura del teu curs.</p>;
  return (
    <div className="course-detail">
      <div className="course-detail-heading">
        <h3>{selected.name || selected.short}</h3>
        <GradePrivacyToggle />
      </div>
      <TermFigures result={result} />
      <FinalFigures result={result} />
      <p className="course-detail-state">
        {result.complete
          ? 'Càlcul complet.'
          : 'Provisional: es recalcula quan afegeixes notes o corregeixes els plusos.'}
        {result.limited && ' S’aplica el límit de 10 configurat.'}
      </p>
      <section className="personal-bonuses">
        <div className="section-heading">
          <h3>Els meus plusos</h3>
          <small>{numberLabel(result.capacity * 0.25, 2)} de 0,50 reservat</small>
        </div>
        <p className="assessment-hint">
          Dos plusos de 0,25 o un de 0,50. Escriu la nota que t’han posat; buit vol dir pendent i
          zero és una nota corregida. Els plusos acadèmics i de voluntariat comparteixen el límit de
          0,50 per assignatura.
        </p>
        {bonuses.map((bonus) => (
          <BonusRow key={bonus.id} bonus={bonus} />
        ))}
        {remaining > 0 ? (
          adding ? (
            <AddBonus
              subjectId={selected.id}
              remaining={remaining}
              initialPlus={
                bonuses.some((bonus) => bonus.plus_id === requestedPlus) ? null : requestedPlus
              }
              onDone={() => {
                setAdding(false);
                setRequestedPlus(null);
              }}
            />
          ) : (
            <Button className="add-personal-bonus" onClick={() => setAdding(true)}>
              <Plus size={18} />
              Afegir un plus
            </Button>
          )
        ) : (
          <p className="bonus-limit">Ja tens el màxim de plusos d’aquesta assignatura.</p>
        )}
        <p className="bonus-save-status" role="status">
          {gradeWrites.busy
            ? 'Desant nota…'
            : 'Les notes corregides es desen en sortir de la casella.'}
        </p>
        {gradeWrites.canUndo && (
          <Button disabled={gradeWrites.busy} onClick={gradeWrites.undo}>
            <ArrowCounterClockwise size={17} />
            Desfer l’última nota
          </Button>
        )}
      </section>
      <CourseSettings subjectId={selected.id} />
    </div>
  );
}
export function PlusToGrades({ plus }) {
  const { enrolled, open, data } = useApp();
  const available = plus.subjects.filter(
    (item) =>
      enrolled.some((subject) => subject.id === item.subject_id) &&
      bonusMaximum(item.bonus) !== null,
  );
  const [selected, setSelected] = useState(available[0]?.subject_id || '');
  if (!available.length) return null;
  const exists = (data.gradeBonuses || []).some(
    (bonus) => bonus.subject_id === selected && bonus.plus_id === plus.id,
  );
  return (
    <div className="plus-to-grades">
      {available.length > 1 && (
        <Select
          aria-label="Assignatura per registrar el plus"
          value={selected}
          onChange={(event) => setSelected(event.target.value)}
        >
          {available.map((item) => (
            <option key={item.subject_id} value={item.subject_id}>
              {enrolled.find((subject) => subject.id === item.subject_id)?.name}
            </option>
          ))}
        </Select>
      )}
      <Button onClick={() => open('courseSubject', { subject_id: selected, plus_id: plus.id })}>
        {exists ? 'Veure el plus a les meves notes' : 'Registrar a les meves notes'}
        <ArrowRight size={17} />
      </Button>
      <small>Privat. Només se suma la nota corregida al final del curs.</small>
    </div>
  );
}
