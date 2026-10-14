import React, { useEffect, useState } from 'react';
import {
  CalendarCheck,
  CheckSquare,
  Package,
  Exam,
  Bell,
  CalendarDots,
  LockSimple,
  UsersThree,
} from '@phosphor-icons/react';
import Select from './Select';
import { useApp } from '../context';
import { Field, Button, FormError, FormFooter, Tabs } from '../ui';
import { useSubmit } from '../form-utils';
import { madridDay } from '../../shared/domain';
import {
  readLocalJSON,
  writeLocalJSON,
  removeLocalJSONIfUnchanged,
} from '../../shared/local-state';
import '../workspace.css';

export default function EventEditor({ item }) {
  const { data, enrolled, close, mutate, open } = useApp();
  const key = `lanet.eventDraft.${data.user.id}.${item.subject_id || 'all'}.${item.kind || 'exam'}`;
  const cached = !item.id ? readLocalJSON(key, null) : null;
  const [f, setF] = useState(() => ({
    title: '',
    date: madridDay(),
    start: '',
    end: '',
    subject_id: '',
    offering_id: '',
    group_id: data.user.group_id,
    room: '',
    body: '',
    visibility: 'private',
    ...item,
    ...cached,
    kind: cached?.kind || item.display_kind || item.kind || 'exam',
  }));
  const { busy, error, submit } = useSubmit(close);
  const [remembered, setRemembered] = useState(true);
  const change = (k, v) => setF((x) => ({ ...x, [k]: v }));
  useEffect(() => {
    if (!item.id) setRemembered(writeLocalJSON(key, f));
  }, [key, f, item.id]);
  const subjects =
    f.visibility === 'shared'
      ? data.subjects
      : data.subjects.filter((s) => enrolled.some((e) => e.id === s.id) || s.id === f.subject_id);
  const variants = data.offerings.filter(
    (o) =>
      o.subject_id === f.subject_id &&
      (f.visibility === 'shared'
        ? o.group_id === f.group_id
        : data.enrollments.some((e) => e.offering_id === o.id)),
  );
  const changeSubject = (id) => setF((x) => ({ ...x, subject_id: id, offering_id: '' }));
  return (
    <form
      className="event-editor"
      onSubmit={submit(() =>
        mutate('/events' + (item.id ? '/' + item.id : ''), f, 'Data desada al calendari.', () => {
          if (!item.id) removeLocalJSONIfUnchanged(key, f);
        }),
      )}
    >
      {cached && <p className="editor-draft-hint">Hem recuperat la data que estaves preparant.</p>}
      <Tabs
        className="event-kind-picker"
        label="Tipus de data"
        value={f.kind}
        onChange={(v) => change('kind', v)}
        items={[
          ['exam', 'Examen', Exam],
          ['task', 'Tasca', CheckSquare],
          ['deadline', 'Lliurament', Package],
          ['test', 'Prova', CalendarCheck],
          ['reminder', 'Recordatori', Bell],
          ['event', 'Activitat', CalendarDots],
        ]}
      />
      <Field label="Títol">
        <input
          required
          maxLength={150}
          value={f.title}
          placeholder={
            ['exam', 'test'].includes(f.kind)
              ? 'Per exemple: Parcial de derivades'
              : 'Què has de preparar?'
          }
          onChange={(e) => change('title', e.target.value)}
        />
      </Field>
      <div className="form-grid">
        <Field label="Assignatura">
          <Select value={f.subject_id || ''} onChange={(e) => changeSubject(e.target.value)}>
            <option value="">Sense assignatura</option>
            {subjects.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Data">
          <input
            type="date"
            required
            value={f.date}
            onChange={(e) => change('date', e.target.value)}
          />
        </Field>
      </div>
      <div className="event-audience">
        {f.visibility === 'private' ? <LockSimple size={21} /> : <UsersThree size={21} />}
        <div>
          <strong>{f.visibility === 'private' ? 'Només per a tu' : 'Compartit amb el grup'}</strong>
          <p>
            {f.visibility === 'private'
              ? 'La resta de la classe no veurà aquesta data.'
              : 'Apareixerà a l’agenda dels alumnes del grup i variant seleccionats.'}
          </p>
        </div>
        {data.user.role !== 'student' && (
          <Field label="Visibilitat">
            <Select
              value={f.visibility}
              onChange={(e) => setF((x) => ({ ...x, visibility: e.target.value, offering_id: '' }))}
            >
              <option value="private">Privat · només jo</option>
              <option value="shared">Compartit amb el grup</option>
            </Select>
          </Field>
        )}
      </div>
      {f.visibility === 'shared' && (
        <Field label="Grup">
          <Select
            value={f.group_id}
            onChange={(e) => setF((x) => ({ ...x, group_id: e.target.value, offering_id: '' }))}
          >
            {data.groups
              .filter((g) => data.user.role === 'admin' || g.id === data.user.group_id)
              .map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
          </Select>
        </Field>
      )}
      <Field label="Temari o detalls">
        <textarea
          rows={3}
          maxLength={6000}
          value={f.body}
          placeholder="Temes que entren, instruccions o què cal portar…"
          onChange={(e) => change('body', e.target.value)}
        />
      </Field>
      <details
        className="event-more"
        open={(item.id && !!(item.start || item.room || item.offering_id)) || undefined}
      >
        <summary>Més detalls · hora, variant i aula</summary>
        <div className="form-grid">
          <Field label="Hora d’inici" hint="Buit: tot el dia">
            <input
              type="time"
              value={f.start || ''}
              onChange={(e) =>
                setF((x) => ({
                  ...x,
                  start: e.target.value,
                  ...(!e.target.value ? { end: '' } : {}),
                }))
              }
            />
          </Field>
          <Field label="Hora final">
            <input
              type="time"
              disabled={!f.start}
              value={f.end || ''}
              onChange={(e) => change('end', e.target.value)}
            />
          </Field>
        </div>
        {!!variants.length && (
          <Field label="Variant">
            <Select
              value={f.offering_id || ''}
              onChange={(e) => change('offering_id', e.target.value)}
            >
              <option value="">
                {f.visibility === 'shared'
                  ? 'Totes les variants del grup'
                  : 'Sense variant específica'}
              </option>
              {variants.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.variant} · {o.teacher}
                </option>
              ))}
            </Select>
          </Field>
        )}
        <Field label="Aula o lloc">
          <input maxLength={120} value={f.room} onChange={(e) => change('room', e.target.value)} />
        </Field>
      </details>
      {!remembered && (
        <p role="status">
          Aquest navegador no pot recordar l’esborrany. Pots desar la data igualment.
        </p>
      )}
      <FormError error={error} />
      <FormFooter busy={busy} onCancel={close}>
        {item.id && (
          <Button
            type="button"
            variant="danger"
            onClick={() => open('delete', { resource: 'events', id: item.id, title: item.title })}
          >
            Eliminar
          </Button>
        )}
      </FormFooter>
    </form>
  );
}
