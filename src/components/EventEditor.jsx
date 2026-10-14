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
import { previewAgenda } from '../api';
import { dateLabel } from '../../shared/domain';
import { ConflictNotice } from './Delegates';

export default function EventEditor({ item }) {
  const { data, enrolled, close, mutate, open } = useApp();
  const key = `lanet.eventDraft.${data.user.id}.${item.subject_id || 'all'}.${item.kind || 'exam'}${item.contextual ? '.' + item.date + '.' + item.offering_id : ''}`;
  const [cached] = useState(() => (!item.id ? readLocalJSON(key, null) : null));
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
    audience_kind: ['class', 'offering'].includes(cached?.audience_kind || item.audience_kind)
      ? cached?.audience_kind || item.audience_kind
      : item.offering_id
        ? 'offering'
        : 'class',
    kind: cached?.kind || item.display_kind || item.kind || 'exam',
  }));
  const { busy, error, submit } = useSubmit(close);
  const [remembered, setRemembered] = useState(true);
  const [preview, setPreview] = useState(null),
    [previewError, setPreviewError] = useState('');
  const [confirmed, setConfirmed] = useState(''),
    [retry, setRetry] = useState(0);
  const signature = JSON.stringify(f);
  useEffect(() => {
    let current = true;
    const controller = new AbortController();
    setPreview(null);
    setPreviewError('');
    setConfirmed('');
    if (!f.title.trim() || !f.date) return;
    const timer = setTimeout(() => {
      previewAgenda(f, controller.signal)
        .then((result) => {
          if (current) setPreview({ ...result, signature });
        })
        .catch((e) => {
          if (current && !controller.signal.aborted) setPreviewError(e.message);
        });
    }, 450);
    return () => {
      current = false;
      controller.abort();
      clearTimeout(timer);
    };
  }, [signature, retry]);
  const change = (k, v) => setF((x) => ({ ...x, [k]: v }));
  useEffect(() => {
    if (!item.id) setRemembered(writeLocalJSON(key, f));
  }, [key, f, item.id]);
  const subjects = data.subjects.filter(
    (s) => enrolled.some((e) => e.id === s.id) || s.id === f.subject_id,
  );
  const variants = data.offerings.filter(
    (o) => o.subject_id === f.subject_id && data.enrollments.some((e) => e.offering_id === o.id),
  );
  const changeSubject = (id) =>
    setF((x) => ({ ...x, subject_id: id, offering_id: '', audience_kind: 'class' }));
  const duplicate = preview?.conflicts.some((c) => c.type === 'duplicate');
  const overlap = preview?.conflicts.some((c) => c.type === 'overlap');
  return (
    <form
      className="event-editor"
      onSubmit={submit(async () => {
        const checked = await previewAgenda(f);
        setPreview({ ...checked, signature });
        if (checked.conflicts.some((c) => c.type === 'duplicate'))
          throw new Error('Revisa el duplicat abans de continuar.');
        if (checked.conflicts.length && confirmed !== checked.conflicts_token)
          throw new Error('Revisa les coincidències i confirma que vols continuar.');
        return mutate(
          '/events' + (item.id ? '/' + item.id : ''),
          { ...f, conflicts_token: confirmed },
          f.visibility === 'shared'
            ? 'Proposta enviada als delegats. T’avisarem quan la revisin.'
            : 'Data privada desada al calendari.',
          () => {
            if (!item.id) removeLocalJSONIfUnchanged(key, f);
          },
        );
      })}
    >
      {cached && <p className="editor-draft-hint">Hem recuperat la data que estaves preparant.</p>}
      <ol className="agenda-sequence" aria-label="Passos per afegir una data">
        <li>
          <b>1</b> Què i quan
        </li>
        <li>
          <b>2</b> Qui ho veu
        </li>
        <li>
          <b>3</b> Revisar i enviar
        </li>
      </ol>
      {item.contextual && (
        <p className="agenda-context">
          <CalendarDots size={18} />
          {f.date
            ? dateLabel(f.date, { weekday: 'long', day: 'numeric', month: 'long' })
            : 'Tria la data'}{' '}
          · {f.start || 'Tot el dia'}
          {f.end ? '–' + f.end : ''}
        </p>
      )}
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
          <Select
            required={f.visibility === 'shared'}
            value={f.subject_id || ''}
            onChange={(e) => changeSubject(e.target.value)}
          >
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
      <div className="audience-cards" role="group" aria-label="Visibilitat de la data">
        <button
          type="button"
          aria-pressed={f.visibility === 'private'}
          onClick={() => change('visibility', 'private')}
        >
          <LockSimple size={25} />
          <strong>Privat</strong>
          <span>Només tu · desat immediat</span>
        </button>
        <button
          type="button"
          aria-pressed={f.visibility === 'shared'}
          onClick={() => change('visibility', 'shared')}
        >
          <UsersThree size={25} />
          <strong>Públic</strong>
          <span>Per a la classe · validació de delegats</span>
        </button>
      </div>
      {f.visibility === 'shared' && (
        <Field label="Destinataris de la proposta">
          <Select value={f.audience_kind} onChange={(e) => change('audience_kind', e.target.value)}>
            <option value="class">
              La meva classe ·{' '}
              {data.delegation?.units.find((u) => u.id === data.delegation.unit)?.label ||
                'Confirma la tutoria'}
            </option>
            {!!variants.length && (
              <option value="offering">Els alumnes de la variant seleccionada</option>
            )}
          </Select>
        </Field>
      )}
      {f.visibility === 'shared' && f.audience_kind === 'offering' && (
        <Field label="Variant que cursa l’examen o tasca">
          <Select
            value={f.offering_id || ''}
            onChange={(e) => change('offering_id', e.target.value)}
          >
            <option value="">Tria la variant</option>
            {variants.map((o) => (
              <option key={o.id} value={o.id}>
                {o.variant} · {o.teacher}
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
        {!!variants.length && f.visibility === 'private' && (
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
      {f.visibility === 'shared' && (
        <section className="agenda-review-summary" aria-label="Qui ha d’autoritzar la proposta">
          <h3>Ho validaran</h3>
          {preview?.reviewers.length ? (
            preview.reviewers.map((m) => (
              <span className="reviewer-pill" key={m.email + m.unit_id}>
                {m.name}
                <small>
                  {m.position === 'subdelegate' ? 'Subdelegat/ada' : 'Delegat/ada'} ·{' '}
                  {data.delegation?.units.find((u) => u.id === m.unit_id)?.label}
                </small>
              </span>
            ))
          ) : (
            <p>
              {previewError || 'Tria l’assignatura i escriu el títol per veure els responsables.'}
            </p>
          )}
          <p>
            Encara no apareixerà a l’agenda de la classe. Rebràs un avís quan s’aprovi o calgui
            corregir-la.
          </p>
        </section>
      )}
      {!!f.title.trim() && (
        <section className="agenda-final-check" aria-label="Revisió de la data">
          <strong>{f.title}</strong>
          <span>
            {f.date ? dateLabel(f.date) : 'Tria la data'} · {f.start || 'Tot el dia'}
            {f.end ? '–' + f.end : ''} ·{' '}
            {f.visibility === 'private' ? 'Privat' : 'Pendent de validació'}
          </span>
          {!preview && !previewError && <p role="status">Comprovant duplicats i horaris…</p>}
          <ConflictNotice conflicts={preview?.conflicts || []} />
          {preview && !preview.conflicts.length && (
            <p className="agenda-clear" role="status">
              Cap duplicat ni coincidència detectats.
            </p>
          )}
          {overlap && !duplicate && (
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={confirmed === preview.conflicts_token}
                onChange={(e) => setConfirmed(e.target.checked ? preview.conflicts_token : '')}
              />{' '}
              He revisat les coincidències i vull continuar
            </label>
          )}
          {previewError && (
            <div role="alert">
              <p>{previewError}</p>
              <Button type="button" onClick={() => setRetry((n) => n + 1)}>
                Tornar a comprovar
              </Button>
            </div>
          )}
        </section>
      )}
      {!remembered && (
        <p role="status">
          Aquest navegador no pot recordar l’esborrany. Pots desar la data igualment.
        </p>
      )}
      <FormError error={error} />
      <FormFooter
        busy={busy}
        onCancel={close}
        disabled={
          !!duplicate ||
          (f.visibility === 'shared' && (!preview || preview.signature !== signature)) ||
          (!!overlap && confirmed !== preview?.conflicts_token)
        }
        label={f.visibility === 'shared' ? 'Enviar a validació' : 'Desar'}
      >
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
