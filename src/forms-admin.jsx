import Select from './components/Select';
import AssessmentEditor from './components/AssessmentEditor';
import { assessmentType, assessmentDefinition } from '../shared/assessments';
import React, { useState } from 'react';
import { Plus, Trash } from '@phosphor-icons/react';
import { useApp } from './context';
import { Field, Button, FormError, FormFooter, IconButton } from './ui';
import { useSubmit } from './form-utils';
import { DAYS, TERM_LABELS } from '../shared/domain';
export function SchoolForm() {
  const { data, close, mutate } = useApp();
  const [name, setName] = useState(data.settings.school_name);
  const { busy, error, submit } = useSubmit(close);
  return (
    <form
      onSubmit={submit(() =>
        mutate('/admin/settings', { school_name: name }, 'Centre actualitzat.'),
      )}
    >
      <Field label="Nom del centre">
        <input value={name} required maxLength={100} onChange={(e) => setName(e.target.value)} />
      </Field>
      <FormError error={error} />
      <FormFooter busy={busy} onCancel={close} />
    </form>
  );
}
export function GroupForm({ item }) {
  const { close, mutate } = useApp();
  const [name, setName] = useState(item.name || '');
  const { busy, error, submit } = useSubmit(close);
  return (
    <form onSubmit={submit(() => mutate('/admin/groups', { id: item.id, name }, 'Grup desat.'))}>
      <Field label="Nom del grup">
        <input
          value={name}
          maxLength={100}
          onChange={(e) => setName(e.target.value)}
          required
          placeholder="2n de batxillerat C"
        />
      </Field>
      <FormError error={error} />
      <FormFooter busy={busy} onCancel={close} />
    </form>
  );
}
export function SubjectForm({ item }) {
  const { close, mutate } = useApp();
  const [f, setF] = useState({ name: '', short: '', color: '#DCE8F4', path: 'science', ...item });
  const { busy, error, submit } = useSubmit(close);
  return (
    <form onSubmit={submit(() => mutate('/admin/subjects', f, 'Assignatura desada.'))}>
      <Field label="Nom complet">
        <input
          value={f.name}
          required
          maxLength={100}
          onChange={(e) => setF({ ...f, name: e.target.value })}
        />
      </Field>
      <div className="form-grid">
        <Field label="Nom curt">
          <input
            value={f.short}
            required
            maxLength={40}
            onChange={(e) => setF({ ...f, short: e.target.value })}
          />
        </Field>
        <Field label="Color de l’assignatura">
          <input
            type="color"
            value={f.color}
            onChange={(e) => setF({ ...f, color: e.target.value })}
          />
        </Field>
      </div>
      <Field label="Itinerari">
        <Select value={f.path} onChange={(e) => setF({ ...f, path: e.target.value })}>
          <option value="common">Comuna</option>
          <option value="science">Científic i tecnològic</option>
          <option value="social">Ciències socials</option>
          <option value="humanities">Humanitats</option>
        </Select>
      </Field>
      <FormError error={error} />
      <FormFooter busy={busy} onCancel={close} />
    </form>
  );
}
export function OfferingForm({ item }) {
  const { data, close, mutate } = useApp();
  const [f, setF] = useState({
      subject_id: data.subjects[0]?.id,
      group_id: data.user.group_id,
      teacher: '',
      variant: 'Grup principal',
      path: 'common',
      ...item,
    }),
    [slots, setSlots] = useState(() =>
      (item.id
        ? data.slots.filter((s) => s.offering_id === item.id)
        : [{ day: 0, start: '08:10', end: '09:10', room: '' }]
      ).map((s) => ({
        ...s,
        teacher_mode: s.teacher == null ? 'general' : s.teacher === '' ? 'personal' : 'custom',
      })),
    );
  const { busy, error, submit } = useSubmit(close);
  function update(i, k, v) {
    setSlots(slots.map((s, j) => (i === j ? { ...s, [k]: v } : s)));
  }
  function teacherMode(index, mode) {
    setSlots((all) =>
      all.map((slot, i) =>
        i !== index
          ? slot
          : {
              ...slot,
              teacher_mode: mode,
              teacher:
                mode === 'personal' ? '' : mode === 'general' ? null : slot.teacher || f.teacher,
              note: mode === 'personal' ? slot.note || 'Treball personal' : '',
            },
      ),
    );
  }
  return (
    <form
      onSubmit={submit(() =>
        mutate('/admin/offerings', { ...f, slots }, 'Variant i horari desats.'),
      )}
    >
      <div className="form-grid">
        <Field label="Assignatura">
          <Select
            value={f.subject_id}
            onChange={(e) =>
              setF({
                ...f,
                subject_id: e.target.value,
                path: data.subjects.find((s) => s.id === e.target.value).path,
              })
            }
          >
            {data.subjects.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Grup">
          <Select value={f.group_id} onChange={(e) => setF({ ...f, group_id: e.target.value })}>
            {data.groups
              .filter((g) => data.user.role === 'admin' || g.id === data.user.group_id)
              .map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
          </Select>
        </Field>
        <Field label="Professorat general">
          <input
            value={f.teacher}
            maxLength={100}
            required
            onChange={(e) => setF({ ...f, teacher: e.target.value })}
          />
        </Field>
        <Field label="Variant">
          <input
            value={f.variant}
            maxLength={100}
            onChange={(e) => setF({ ...f, variant: e.target.value })}
          />
        </Field>
      </div>
      <p className="muted">
        Cada franja pot seguir el professorat general, tenir professorat propi o ser treball
        personal.
      </p>
      <h3>Franges de classe</h3>
      <div className="slot-editor">
        {slots.map((s, i) => (
          <div key={i}>
            <Select
              aria-label={`Dia de la franja ${i + 1}`}
              value={s.day}
              onChange={(e) => update(i, 'day', Number(e.target.value))}
            >
              {DAYS.map((d, i) => (
                <option key={d} value={i}>
                  {d}
                </option>
              ))}
            </Select>
            <input
              type="time"
              aria-label={`Inici de la franja ${i + 1}`}
              value={s.start}
              onChange={(e) => update(i, 'start', e.target.value)}
              required
            />
            <input
              type="time"
              aria-label={`Final de la franja ${i + 1}`}
              value={s.end}
              onChange={(e) => update(i, 'end', e.target.value)}
              required
            />
            <input
              aria-label={`Aula de la franja ${i + 1}`}
              value={s.room}
              placeholder="Aula"
              maxLength={80}
              onChange={(e) => update(i, 'room', e.target.value)}
            />
            <IconButton
              label="Treure franja"
              type="button"
              disabled={slots.length === 1}
              onClick={() => setSlots(slots.filter((_, j) => j !== i))}
            >
              <Trash size={17} />
            </IconButton>
            <div className="slot-teacher-editor">
              <Field label={`Professorat de la franja ${i + 1}`}>
                <Select value={s.teacher_mode} onChange={(e) => teacherMode(i, e.target.value)}>
                  <option value="general">Professorat general</option>
                  <option value="custom">Professorat d’aquest dia</option>
                  <option value="personal">Treball personal</option>
                </Select>
              </Field>
              {s.teacher_mode === 'custom' && (
                <Field label={`Nom del professor de la franja ${i + 1}`}>
                  <input
                    value={s.teacher || ''}
                    required
                    maxLength={100}
                    onChange={(e) => update(i, 'teacher', e.target.value)}
                  />
                </Field>
              )}
              <Field label={`Indicació de la franja ${i + 1}`}>
                <input
                  value={s.note || ''}
                  maxLength={200}
                  placeholder={
                    s.teacher_mode === 'personal' ? 'Treball personal · Llatí online' : 'Opcional'
                  }
                  onChange={(e) => update(i, 'note', e.target.value)}
                />
              </Field>
            </div>
          </div>
        ))}
      </div>
      <Button
        type="button"
        onClick={() =>
          setSlots([
            ...slots,
            {
              day: 0,
              start: '08:10',
              end: '09:10',
              room: '',
              teacher_mode: 'general',
              teacher: null,
              note: '',
            },
          ])
        }
      >
        <Plus size={17} />
        Afegir franja
      </Button>
      <FormError error={error} />
      <FormFooter busy={busy} onCancel={close} />
    </form>
  );
}
export function TemplateForm({ item }) {
  const { data, close, mutate } = useApp();
  const [offering, setOffering] = useState(item.offering_id),
    [term, setTerm] = useState(item.term || 1);
  const initial = (o, t) =>
    data.templates
      .filter((r) => r.offering_id === o && r.term === t)
      .map((r) => ({
        ...r,
        assessment_type: assessmentType(r),
        category: assessmentDefinition(assessmentType(r)).category,
      }));
  const [entries, setEntries] = useState(initial(offering, term));
  const totalWeight = entries.reduce((sum, row) => sum + Number(row.weight), 0);
  const { busy, error, submit } = useSubmit(close);
  function change(o, t) {
    setOffering(o);
    setTerm(t);
    setEntries(initial(o, t));
  }
  return (
    <form
      onSubmit={submit(() =>
        mutate(
          '/admin/templates',
          { offering_id: offering, term, entries },
          'Plantilla actualitzada. Els fulls personals existents es conserven.',
        ),
      )}
    >
      <div className="form-grid">
        <Field label="Variant">
          <Select value={offering} onChange={(e) => change(e.target.value, term)}>
            {data.offerings
              .filter((o) => data.user.role === 'admin' || o.group_id === data.user.group_id)
              .map((o) => (
                <option key={o.id} value={o.id}>
                  {o.group_id} · {data.subjects.find((s) => s.id === o.subject_id)?.short} ·{' '}
                  {o.teacher}
                </option>
              ))}
          </Select>
        </Field>
        <Field label="Trimestre">
          <Select value={term} onChange={(e) => change(offering, Number(e.target.value))}>
            {TERM_LABELS.map((t, i) => (
              <option key={t} value={i + 1}>
                {t}
              </option>
            ))}
          </Select>
        </Field>
      </div>
      <AssessmentEditor entries={entries} onChange={setEntries} disabled={busy} />
      <p
        className={`weights-total ${Math.abs(totalWeight - 100) > 0.001 ? 'negative' : 'positive'}`}
        role="status"
      >
        Total: {totalWeight} / 100%
      </p>
      <p className="muted">
        Els estudiants poden recuperar aquesta plantilla o conservar la seva versió personalitzada.
      </p>
      <FormError error={error} />
      <FormFooter
        busy={busy}
        disabled={!entries.length || Math.abs(totalWeight - 100) > 0.001}
        onCancel={close}
      />
    </form>
  );
}
export function ManageUserForm({ item }) {
  const { close, mutate } = useApp();
  const [role, setRole] = useState(item.role),
    [disabled, setDisabled] = useState(!!item.disabled);
  const { busy, error, submit } = useSubmit();
  return (
    <div>
      <form
        onSubmit={submit(async () => {
          await mutate('/admin/users', { user_id: item.id, role, disabled }, 'Compte actualitzat.');
          close();
        })}
      >
        <p>{item.email}</p>
        <Field label="Rol">
          <Select value={role} onChange={(e) => setRole(e.target.value)}>
            <option value="student">Estudiant</option>
            <option value="delegate">Delegat</option>
            <option value="admin">Administrador</option>
          </Select>
        </Field>
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={disabled}
            onChange={(e) => setDisabled(e.target.checked)}
          />
          Desactivar l’accés d’aquest compte
        </label>
        <FormError error={error} />
        <FormFooter busy={busy} onCancel={close} />
      </form>
    </div>
  );
}
