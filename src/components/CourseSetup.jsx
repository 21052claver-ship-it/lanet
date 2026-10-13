import React, { useRef, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle,
  Clock,
  MapPin,
  User,
} from '@phosphor-icons/react';
import { useApp } from '../context';
import { ReferenceArt } from '../art';
import { Button, FormError, SubjectChip, SubjectMark } from '../ui';
import { useSubmit } from '../form-utils';
import { DAYS, DAYS_SHORT, slotConflicts } from '../../shared/domain';
import {
  SCHEDULE_VERSION,
  OFFICIAL_ROUTES,
  officialOfferings,
  curriculumChoices,
  selectedCurriculum,
  curriculumIssues,
  mergeAdjacentSlots,
  slotTeacher,
} from '../../shared/official-schedule';

function Choice({ name, value, checked, onChange, disabled, children, className = '' }) {
  return (
    <label
      className={`course-choice ${className}`}
      data-selected={checked}
      data-disabled={!!disabled}
    >
      <input
        type="radio"
        name={name}
        value={value}
        checked={checked}
        onChange={onChange}
        disabled={disabled}
      />
      {children}
      <span className="course-choice-check" aria-hidden="true">
        {checked ? <CheckCircle size={22} weight="fill" /> : <span />}
      </span>
    </label>
  );
}
function OfferingInfo({ offering, slots }) {
  const relevant = slots.filter((s) => s.offering_id === offering.id);
  const rooms = [...new Set(relevant.map((s) => s.room).filter(Boolean))];
  const personalHours = relevant.filter((s) => s.teacher === '').length;
  return (
    <span className="course-offering-info">
      <span>
        <User size={15} aria-hidden="true" />
        {offering.teacher}
      </span>
      <small>
        <MapPin size={14} aria-hidden="true" />
        {rooms.length > 1 ? 'Aules ' : 'Aula '}
        {rooms.join(' / ') || 'per confirmar'}
      </small>
      {personalHours > 0 ? (
        <small>
          {personalHours} h de treball personal · {relevant.length - personalHours} h amb
          professorat
        </small>
      ) : (
        new Set(relevant.map((s) => s.teacher)).size > 1 && (
          <small>Professorat segons el dia · detall al resum</small>
        )
      )}
    </span>
  );
}
function WeekPreview({ catalog, ids, subject }) {
  const slots = mergeAdjacentSlots(catalog.slots.filter((s) => ids.includes(s.offering_id)));
  return (
    <div className="course-week-preview" aria-label="Resum de l’horari setmanal">
      {DAYS_SHORT.slice(0, 5).map((day, index) => (
        <section key={day}>
          <h4>{DAYS[index]}</h4>
          <ol>
            {slots
              .filter((s) => s.day === index)
              .map((slot) => {
                const o = catalog.offerings.find((o) => o.id === slot.offering_id),
                  s = subject(o.subject_id);
                return (
                  <li key={slot.id} style={{ '--subject-color': s.color }}>
                    <time>
                      {slot.start}–{slot.end}
                    </time>
                    <strong>{s.short}</strong>
                    <span>{slotTeacher(slot, o) || slot.note}</span>
                    <small>Aula {slot.room || 'per confirmar'}</small>
                  </li>
                );
              })}
          </ol>
        </section>
      ))}
    </div>
  );
}
export default function CourseSetup() {
  const { data, close, mutate, subject } = useApp();
  const initialGroup = OFFICIAL_ROUTES.some((r) => r.id === data.user.group_id)
    ? data.user.group_id
    : '';
  const [group, setGroup] = useState(initialGroup);
  const [choices, setChoices] = useState(() =>
    curriculumChoices(
      data,
      initialGroup,
      data.enrollments.map((e) => e.offering_id),
      data.user.schedule_version === SCHEDULE_VERSION,
    ),
  );
  const [step, setStep] = useState(0);
  const heading = useRef(null);
  const { busy, error, setError, submit } = useSubmit(close);
  const route = OFFICIAL_ROUTES.find((r) => r.id === group);
  const offers = officialOfferings(data, group);
  const ids = selectedCurriculum(data, group, choices);
  const issues = curriculumIssues(data, group, ids);
  const conflicts = slotConflicts(ids, data.slots);
  const missing = route?.blocks.filter((b) => !choices[b.id]?.offering_id) || [];
  function move(next) {
    setError('');
    setStep(next);
    requestAnimationFrame(() => {
      heading.current?.closest('.dialog')?.scrollTo({ top: 0 });
      heading.current?.focus({ preventScroll: true });
    });
  }
  function changeRoute(id) {
    setGroup(id);
    setChoices(curriculumChoices(data, id));
    setError('');
  }
  function pick(block, sid, oid) {
    const variants = offers.filter((o) => o.block === block && o.subject_id === sid);
    setChoices((prev) => ({
      ...prev,
      [block]: {
        subject_id: sid,
        offering_id: oid || (variants.length === 1 ? variants[0].id : ''),
      },
    }));
    setError('');
  }
  const save = submit(async () => {
    if (issues.length || conflicts.length)
      throw new Error(issues[0] || 'Hi ha dues franges coincidents.');
    await mutate(
      '/configure',
      { group_id: group, path: route.path, offerings: ids },
      'El curs i l’horari ja estan configurats.',
    );
  });
  return (
    <form
      className="course-setup"
      onSubmit={(e) => {
        if (step === 2) return save(e);
        e.preventDefault();
        if ((step === 0 && route) || (step === 1 && !issues.length && !conflicts.length))
          move(step + 1);
      }}
      aria-label="Configurar l’horari oficial"
    >
      <fieldset disabled={busy} className="course-setup-body">
        <ol className="course-steps" aria-label="Passos de configuració">
          {['Itinerari', 'Assignatures', 'Revisió'].map((label, i) => (
            <li key={label} aria-current={step === i ? 'step' : undefined} data-done={i < step}>
              <span aria-hidden="true">{i < step ? <Check size={16} /> : i + 1}</span>
              {label}
            </li>
          ))}
        </ol>
        <div className="course-step-heading">
          <small>2n de batxillerat · 2026–2027</small>
          <h3 tabIndex={-1} ref={heading}>
            {['Quin itinerari fas?', 'Fes-lo teu', 'El teu horari, a punt'][step]}
          </h3>
          <p>
            {
              [
                'Tria el teu grup. Després escolliràs les optatives i, quan calgui, el professorat.',
                'Tria una opció de cada bloc. Les comunes ja estan incloses.',
                'Revisa les assignatures, el professorat i les aules abans de desar.',
              ][step]
            }
          </p>
        </div>
        {step === 0 && (
          <fieldset className="course-route-options">
            <legend className="sr-only">Itinerari oficial</legend>
            {OFFICIAL_ROUTES.map((r) => (
              <Choice
                key={r.id}
                name="course-route"
                value={r.id}
                checked={r.id === group}
                disabled={data.user.role === 'delegate' && r.id !== data.user.group_id}
                onChange={() => changeRoute(r.id)}
                className="course-route"
              >
                <span className="course-route-art" style={{ background: r.color }}>
                  <ReferenceArt name={r.art} size={68} />
                </span>
                <span className="course-route-copy">
                  <small>Grup {r.id.slice(1)}</small>
                  <strong>{r.label}</strong>
                  <span>{r.description}</span>
                </span>
              </Choice>
            ))}
            {data.user.role === 'delegate' && (
              <p className="muted">Com a delegat, el teu grup el gestiona l’administrador.</p>
            )}
          </fieldset>
        )}
        {step === 1 && (
          <>
            <div className="course-common">
              <span>
                <CheckCircle size={18} /> Comunes incloses
              </span>
              <div>
                {offers
                  .filter((o) => !o.block)
                  .map((o) => (
                    <SubjectChip key={o.id} subject={subject(o.subject_id)} />
                  ))}
              </div>
            </div>
            <div className="course-blocks">
              {route.blocks.map((block, index) => {
                const options = offers.filter((o) => o.block === block.id);
                const sids = [...new Set(options.map((o) => o.subject_id))];
                const selected = choices[block.id];
                const variants = options.filter((o) => o.subject_id === selected?.subject_id);
                return (
                  <section className="course-block" key={block.id} data-block={block.id}>
                    <header>
                      <span className="course-block-number">{index + 1}</span>
                      <h4>{block.label}</h4>
                      {selected?.offering_id && (
                        <CheckCircle
                          className="course-block-done"
                          size={20}
                          aria-label="Bloc complet"
                        />
                      )}
                    </header>
                    {sids.length > 1 ? (
                      <fieldset className="course-subject-options">
                        <legend className="sr-only">{block.label}</legend>
                        {sids.map((sid) => (
                          <Choice
                            key={sid}
                            name={`course-${block.id}`}
                            value={sid}
                            checked={selected?.subject_id === sid}
                            onChange={() => pick(block.id, sid)}
                          >
                            <SubjectMark subject={subject(sid)} />
                            <strong>{subject(sid).short}</strong>
                          </Choice>
                        ))}
                      </fieldset>
                    ) : (
                      <div className="course-fixed-subject">
                        <SubjectChip subject={subject(sids[0])} />
                        <small>
                          {block.id === 'tutor'
                            ? 'Tria el teu tutor o tutora'
                            : 'Assignatura inclosa'}
                        </small>
                      </div>
                    )}
                    {variants.length > 1 ? (
                      <fieldset className="course-teacher-options">
                        <legend>
                          {block.id === 'tutor'
                            ? 'Tutor o tutora'
                            : 'Amb qui fas aquesta assignatura?'}
                        </legend>
                        {variants.map((o) => (
                          <Choice
                            key={o.id}
                            name={`course-teacher-${block.id}`}
                            value={o.id}
                            checked={selected?.offering_id === o.id}
                            onChange={() => pick(block.id, o.subject_id, o.id)}
                          >
                            <OfferingInfo offering={o} slots={data.slots} />
                          </Choice>
                        ))}
                      </fieldset>
                    ) : variants.length === 1 ? (
                      <div className="course-fixed-teacher">
                        <OfferingInfo offering={variants[0]} slots={data.slots} />
                      </div>
                    ) : (
                      <p className="course-pending">Selecciona una assignatura per continuar.</p>
                    )}
                  </section>
                );
              })}
            </div>
            <p className="course-completion" role="status">
              {missing.length
                ? `${missing.length} ${missing.length === 1 ? 'bloc pendent' : 'blocs pendents'} de completar`
                : 'Tots els blocs complets · sense coincidències'}
            </p>
          </>
        )}
        {step === 2 && (
          <>
            <div className="course-review-summary">
              <ReferenceArt name={route.art} size={48} />
              <div>
                <strong>
                  {route.label} · Grup {group.slice(1)}
                </strong>
                <span>
                  <Clock size={15} /> 30 hores setmanals · 08:10–15:45
                </span>
              </div>
              <Button type="button" variant="ghost" onClick={() => move(1)}>
                Editar
              </Button>
            </div>
            <WeekPreview catalog={data} ids={ids} subject={subject} />
            <p className="course-source">
              Horari del document BAT2 2026–27. Pauses: 10:10–10:40 i 12:40–13:45. El professorat i
              l’aula poden variar segons el dia.
            </p>
          </>
        )}
      </fieldset>
      <FormError error={error} />
      <div className="form-footer course-setup-footer">
        {step > 0 ? (
          <Button type="button" variant="ghost" onClick={() => move(step - 1)} disabled={busy}>
            <ArrowLeft size={17} />
            Enrere
          </Button>
        ) : (
          <Button type="button" variant="ghost" onClick={close}>
            Cancel·lar
          </Button>
        )}
        <Button
          type="submit"
          variant="primary"
          busy={busy}
          disabled={step === 0 ? !route : issues.length > 0 || conflicts.length > 0}
        >
          {step === 2 ? 'Desar el meu horari' : 'Continuar'}
          {step < 2 && <ArrowRight size={17} />}
        </Button>
      </div>
    </form>
  );
}
