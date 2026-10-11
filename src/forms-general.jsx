import Select from './components/Select';
import SubjectPicker from './components/SubjectPicker';
import { DEFAULT_PREFERENCES } from '../shared/preferences';
import React, { useState } from 'react';
import {
  Plus,
  Trash,
  Check,
  Warning,
  Clock,
  MapPin,
  LockSimple,
  ArrowRight,
} from '@phosphor-icons/react';
import { useApp } from './context';
import { Avatar } from './art';
import { useTimer } from './timer';
import {
  Field,
  Button,
  FormError,
  FormFooter,
  SubjectChip,
  RichText,
  IconButton,
  Tabs,
} from './ui';
import { useSubmit, Attachments } from './form-utils';
import { readLocalJSON, writeLocalJSON, removeLocalValue } from '../shared/local-state';
import {
  slotConflicts,
  weightedGrades,
  neededGrade,
  numberLabel,
  dateLabel,
  madridDay,
} from '../shared/domain';
export function ConfigureForm() {
  const { data, close, mutate } = useApp();
  const [group, setGroup] = useState(data.user.group_id || data.groups[0]?.id),
    [path, setPath] = useState(data.user.path || 'science'),
    [selected, setSelected] = useState(
      data.enrollments.length
        ? data.enrollments.map((e) => e.offering_id)
        : data.offerings
            .filter(
              (o) =>
                o.group_id === (data.user.group_id || data.groups[0]?.id) &&
                ['common', data.user.path || 'science'].includes(o.path) &&
                o.subject_id !== 'bio',
            )
            .filter((o, i, a) => a.findIndex((x) => x.subject_id === o.subject_id) === i)
            .map((o) => o.id),
    );
  const { busy, error, submit } = useSubmit(close);
  const offerings = data.offerings.filter(
    (o) => o.group_id === group && ['common', path].includes(o.path),
  );
  const subjects = data.subjects.filter((s) => offerings.some((o) => o.subject_id === s.id));
  const conflicts = slotConflicts(selected, data.slots);
  function defaults(g, p) {
    setSelected(
      data.offerings
        .filter((o) => o.group_id === g && ['common', p].includes(o.path) && o.subject_id !== 'bio')
        .filter((o, i, arr) => arr.findIndex((a) => a.subject_id === o.subject_id) === i)
        .map((o) => o.id),
    );
  }
  function toggle(oid) {
    if (selected.includes(oid)) {
      setSelected(selected.filter((x) => x !== oid));
      return;
    }
    const newSlots = data.slots.filter((s) => s.offering_id === oid);
    setSelected([
      ...selected.filter(
        (old) =>
          !data.slots.some(
            (s) =>
              s.offering_id === old &&
              newSlots.some((n) => n.day === s.day && n.start < s.end && s.start < n.end),
          ) &&
          data.offerings.find((o) => o.id === old)?.subject_id !==
            data.offerings.find((o) => o.id === oid)?.subject_id,
      ),
      oid,
    ]);
  }
  return (
    <form
      onSubmit={submit(() =>
        mutate(
          '/configure',
          { group_id: group, path, offerings: selected },
          'El curs i l’horari ja estan configurats.',
        ),
      )}
    >
      <div className="form-grid">
        <Field label="Grup">
          <Select
            value={group || ''}
            disabled={data.user.role === 'delegate'}
            onChange={(e) => {
              setGroup(e.target.value);
              defaults(e.target.value, path);
            }}
          >
            {data.groups.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Itinerari">
          <Select
            value={path}
            onChange={(e) => {
              setPath(e.target.value);
              defaults(group, e.target.value);
            }}
          >
            <option value="science">Científic i tecnològic</option>
            <option value="social">Ciències socials</option>
            <option value="humanities">Humanitats</option>
          </Select>
        </Field>
      </div>
      <p className="muted">
        Les franges les prepara el delegat. Tria les assignatures i les variants que fas.
      </p>
      <div className="course-subjects">
        {subjects.map((s) => {
          const variants = offerings.filter((o) => o.subject_id === s.id),
            chosen = variants.find((o) => selected.includes(o.id));
          return (
            <div className="course-subject" key={s.id}>
              <label>
                <input
                  type="checkbox"
                  checked={!!chosen}
                  disabled={variants.every((o) => o.path === 'common')}
                  onChange={() => toggle(variants[0].id)}
                />
                <SubjectChip subject={s} />
                {s.path === 'common' && <small>Comuna</small>}
              </label>
              <Select
                aria-label={`Professor i variant de ${s.short}`}
                value={chosen?.id || variants[0]?.id}
                onChange={(e) =>
                  setSelected([
                    ...selected.filter((x) => !variants.some((o) => o.id === x)),
                    e.target.value,
                  ])
                }
              >
                {variants.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.teacher} · {o.variant || 'Principal'}
                  </option>
                ))}
              </Select>
            </div>
          );
        })}
      </div>
      {!selected.length && (
        <Button type="button" onClick={() => defaults(group, path)}>
          Seleccionar el curs recomanat
        </Button>
      )}
      {conflicts.length > 0 && (
        <p className="form-error">
          Hi ha assignatures amb franges coincidents. Tria una alternativa.
        </p>
      )}
      <FormError error={error} />
      <FormFooter busy={busy} onCancel={close} label="Desar el meu curs" />
    </form>
  );
}
export function EventForm({ item }) {
  const { data, enrolled, close, mutate, open } = useApp();
  const [f, setF] = useState({
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
    kind: item.display_kind || item.kind || 'exam',
  });
  const { busy, error, submit } = useSubmit(close);
  const change = (k, v) => setF((x) => ({ ...x, [k]: v }));
  const subjects = f.visibility === 'shared' ? data.subjects : enrolled;
  return (
    <form
      onSubmit={submit(() =>
        mutate('/events' + (item.id ? '/' + item.id : ''), f, 'Data desada al calendari.'),
      )}
    >
      <Field label="Títol">
        <input
          value={f.title}
          onChange={(e) => change('title', e.target.value)}
          required
          maxLength={150}
        />
      </Field>
      <div className="form-grid">
        <Field label="Tipus">
          <Select value={f.kind} onChange={(e) => change('kind', e.target.value)}>
            <option value="exam">Examen</option>
            <option value="test">Prova</option>
            <option value="task">Tasca</option>
            <option value="deadline">Lliurament</option>
            <option value="reminder">Recordatori</option>
            <option value="event">Activitat</option>
          </Select>
        </Field>
        <Field label="Visibilitat">
          <Select value={f.visibility} onChange={(e) => change('visibility', e.target.value)}>
            <option value="private">Privat · només jo</option>
            {data.user.role !== 'student' && <option value="shared">Compartit amb el grup</option>}
          </Select>
        </Field>
      </div>
      {f.visibility === 'shared' && (
        <Field label="Grup">
          <Select
            value={f.group_id}
            onChange={(e) => {
              change('group_id', e.target.value);
              change('offering_id', '');
            }}
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
      <div className="form-grid three">
        <Field label="Data">
          <input
            type="date"
            value={f.date}
            onChange={(e) => change('date', e.target.value)}
            required
          />
        </Field>
        <Field label="Hora d’inici" hint="Buit: tot el dia">
          <input
            type="time"
            value={f.start || ''}
            onChange={(e) => change('start', e.target.value)}
          />
        </Field>
        <Field label="Hora final">
          <input type="time" value={f.end || ''} onChange={(e) => change('end', e.target.value)} />
        </Field>
      </div>
      <div className="form-grid">
        <Field label="Assignatura">
          <Select
            value={f.subject_id || ''}
            onChange={(e) => {
              change('subject_id', e.target.value);
              change('offering_id', '');
            }}
          >
            <option value="">Sense assignatura</option>
            {subjects.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Variant">
          <Select
            value={f.offering_id || ''}
            onChange={(e) => change('offering_id', e.target.value)}
          >
            <option value="">Totes les variants del grup</option>
            {data.offerings
              .filter((o) => o.subject_id === f.subject_id && o.group_id === f.group_id)
              .map((o) => (
                <option key={o.id} value={o.id}>
                  {o.variant} · {o.teacher}
                </option>
              ))}
          </Select>
        </Field>
      </div>
      <Field label="Aula o lloc">
        <input value={f.room} onChange={(e) => change('room', e.target.value)} maxLength={120} />
      </Field>
      <Field label="Temari o detalls">
        <textarea
          rows={4}
          value={f.body}
          onChange={(e) => change('body', e.target.value)}
          maxLength={6000}
        />
      </Field>
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
export function ProposalForm({ item }) {
  const { data, close, mutate } = useApp();
  const key = `lanet.proposalDraft.${data.user.id}`;
  const cached = readLocalJSON(key, {}) || {};
  const draft = {
    title: typeof cached.title === 'string' ? cached.title.slice(0, 120) : '',
    body: typeof cached.body === 'string' ? cached.body.slice(0, 4000) : '',
    files: Array.isArray(cached.files)
      ? cached.files.filter((file) => file && typeof file.id === 'string').slice(0, 12)
      : [],
  };
  const [f, setF] = useState({ title: '', body: '', ...(!item.id ? draft : {}), ...item }),
    [files, setFiles] = useState(item.id ? item.files || [] : draft.files),
    [uploading, setUploading] = useState(false),
    [draftRemembered, setDraftRemembered] = useState(true);
  const { busy, error, submit } = useSubmit(() => {
    removeLocalValue(key);
    close();
  });
  function change(k, v) {
    const next = { ...f, [k]: v };
    setF(next);
    if (!item.id) setDraftRemembered(writeLocalJSON(key, { ...next, files }));
  }
  return (
    <form
      onSubmit={submit(() => {
        if (uploading) throw new Error('Espera que acabin de pujar les imatges.');
        return mutate(
          '/proposals' + (item.id ? '/' + item.id : ''),
          { ...f, files },
          'Idea compartida. Gràcies per millorar La Net!',
        );
      })}
    >
      <Field label="La teva idea">
        <input
          placeholder="Ex.: trobar companys per repassar"
          value={f.title}
          onChange={(e) => change('title', e.target.value)}
          maxLength={120}
          required
        />
      </Field>
      <Field label="Com ajudaria?" hint="Explica el problema i què canviaries.">
        <textarea
          rows={5}
          value={f.body}
          onChange={(e) => change('body', e.target.value)}
          maxLength={4000}
          required
        />
      </Field>
      <Attachments
        imagesOnly
        onBusyChange={setUploading}
        files={files}
        setFiles={(v) => {
          setFiles(v);
          if (!item.id) setDraftRemembered(writeLocalJSON(key, { ...f, files: v }));
        }}
      />
      <FormError error={error} />
      {!draftRemembered && (
        <p className="muted small" role="status">
          El navegador no pot recordar l’esborrany. Pots continuar escrivint i publicar-lo des
          d’aquesta finestra.
        </p>
      )}
      <FormFooter
        busy={busy || uploading}
        onCancel={close}
        label={item.id ? 'Desar canvis' : 'Publicar la idea'}
      />
    </form>
  );
}
export function ResponseForm({ item }) {
  const { close, mutate } = useApp();
  const [status, setStatus] = useState(item.status),
    [response, setResponse] = useState(item.response);
  const { busy, error, submit } = useSubmit(close);
  return (
    <form
      onSubmit={submit(() =>
        mutate('/proposals/' + item.id, { status, response }, 'Proposta actualitzada.'),
      )}
    >
      <Field label="Estat">
        <Select value={status} onChange={(e) => setStatus(e.target.value)}>
          {['Proposat', 'En estudi', 'Planificat', 'Fet'].map((s) => (
            <option key={s}>{s}</option>
          ))}
        </Select>
      </Field>
      <Field label="Resposta de l’equip">
        <textarea
          rows={5}
          value={response}
          onChange={(e) => setResponse(e.target.value)}
          maxLength={3000}
        />
      </Field>
      <FormError error={error} />
      <FormFooter busy={busy} onCancel={close} />
    </form>
  );
}
export function AnnouncementForm({ item }) {
  const { data, close, mutate, open } = useApp();
  const [f, setF] = useState({
    title: '',
    body: '',
    group_id: data.user.group_id,
    pinned: false,
    ...item,
  });
  const { busy, error, submit } = useSubmit(close);
  return (
    <form
      onSubmit={submit(() =>
        mutate('/announcements' + (item.id ? '/' + item.id : ''), f, 'Avís publicat.'),
      )}
    >
      <Field label="Títol">
        <input
          value={f.title}
          required
          maxLength={150}
          onChange={(e) => setF({ ...f, title: e.target.value })}
        />
      </Field>
      <Field label="Missatge">
        <textarea
          rows={6}
          value={f.body}
          required
          maxLength={6000}
          onChange={(e) => setF({ ...f, body: e.target.value })}
        />
      </Field>
      <Field label="Destinataris">
        <Select
          value={f.group_id || ''}
          onChange={(e) => setF({ ...f, group_id: e.target.value || null })}
        >
          <option value="">Tot el centre</option>
          {data.groups
            .filter((g) => data.user.role === 'admin' || g.id === data.user.group_id)
            .map((g) => (
              <option value={g.id} key={g.id}>
                {g.name}
              </option>
            ))}
        </Select>
      </Field>
      <label className="checkbox-label">
        <input
          type="checkbox"
          checked={!!f.pinned}
          onChange={(e) => setF({ ...f, pinned: e.target.checked })}
        />
        Fixar al principi
      </label>
      <FormError error={error} />
      <FormFooter onCancel={close} busy={busy}>
        {item.id && (
          <Button
            type="button"
            variant="danger"
            onClick={() =>
              open('delete', { resource: 'announcements', id: item.id, title: item.title })
            }
          >
            Eliminar
          </Button>
        )}
      </FormFooter>
    </form>
  );
}
export function ProfileForm({ item = {} }) {
  const { data, enrolled, close, mutate, open } = useApp();
  const [section, setSection] = useState(item.section || 'personal');
  const [preferences, setPreferences] = useState({ ...DEFAULT_PREFERENCES, ...data.preferences });
  const updatePreference = (key, value) => setPreferences((p) => ({ ...p, [key]: value }));
  const { busy, error, submit } = useSubmit();
  return (
    <div>
      <Tabs
        label="Configuració del perfil"
        value={section}
        onChange={setSection}
        items={[
          ['personal', 'Perfil'],
          ['subjects', 'Assignatures'],
          ['appearance', 'Aparença'],
        ]}
      />
      {section === 'personal' ? (
        <>
          <div className="profile-google">
            <div className="profile-google-identity">
              <Avatar name={data.user.name} src={data.user.avatar_url} />
              <div>
                <strong>{data.user.name}</strong>
                <small>{data.user.email}</small>
              </div>
            </div>
            <p className="profile-identity-hint">
              <LockSimple size={16} aria-hidden="true" />
              <span>
                Nom, cognoms i foto del teu compte de Google. No es poden editar a La Net.
              </span>
            </p>
            <p>S’actualitzen quan tornes a iniciar sessió.</p>
          </div>
          <div className="profile-course">
            <strong>
              {data.groups.find((g) => g.id === data.user.group_id)?.name || 'El meu curs'}
            </strong>
            <span>{enrolled.length} assignatures al meu horari</span>
            <Button type="button" onClick={() => open('configure')}>
              Configurar el meu curs
            </Button>
          </div>
          <div className="form-footer">
            <Button type="button" variant="primary" onClick={close}>
              Fet
            </Button>
          </div>
        </>
      ) : (
        <form
          onSubmit={submit(async () => {
            await mutate('/preferences', preferences, 'Preferències actualitzades.');
            close();
          })}
        >
          {section === 'subjects' && (
            <>
              <p className="muted">
                Tria què vols veure per defecte. Això filtra els recursos; el teu horari es
                configura des del curs.
              </p>
              <SubjectPicker
                label="Assignatures de Continguts"
                subjects={data.subjects}
                defaults={enrolled.map((s) => s.id)}
                value={preferences.notesSubjects ?? enrolled.map((s) => s.id)}
                onChange={(v) => updatePreference('notesSubjects', v)}
              />
              <SubjectPicker
                label="Assignatures de Plusos"
                subjects={data.subjects}
                defaults={enrolled.map((s) => s.id)}
                value={preferences.plusSubjects ?? enrolled.map((s) => s.id)}
                onChange={(v) => updatePreference('plusSubjects', v)}
              />
            </>
          )}
          {section === 'appearance' && (
            <>
              <Field label="Densitat de la plataforma">
                <Select
                  value={preferences.density}
                  onChange={(e) => updatePreference('density', e.target.value)}
                >
                  <option value="compact">Compacta · més espai per al contingut</option>
                  <option value="comfortable">Còmoda · més espai entre elements</option>
                </Select>
              </Field>
              <label className="preference-check">
                <input
                  type="checkbox"
                  checked={preferences.sidebarCollapsed}
                  onChange={(e) => updatePreference('sidebarCollapsed', e.target.checked)}
                />
                Barra lateral plegada a l’escriptori
              </label>
              <label className="preference-check">
                <input
                  type="checkbox"
                  checked={!!preferences.hideGrades}
                  onChange={(e) => updatePreference('hideGrades', e.target.checked)}
                />
                Mode discret a Notes · ocultar qualificacions i mitjanes
              </label>
            </>
          )}

          <FormError error={error} />
          <FormFooter onCancel={close} busy={busy} label="Desar preferències" />
        </form>
      )}
    </div>
  );
}
export function DeleteForm({ item }) {
  const { close, remove } = useApp();
  const { busy, error, submit } = useSubmit(close);
  return (
    <form onSubmit={submit(() => remove(`/${item.resource}/${item.id}`, 'Contingut retirat.'))}>
      <p>
        Vols retirar <strong>{item.title}</strong>?
      </p>
      {item.resource === 'notes' && (
        <p className="muted">
          Els estudiants que ja hagin desbloquejat aquests apunts conservaran l’accés.
        </p>
      )}
      <FormError error={error} />
      <FormFooter busy={busy} onCancel={close} label="Retirar" />
    </form>
  );
}
export function ReportForm({ item }) {
  const { close, mutate } = useApp();
  const [reason, setReason] = useState('');
  const { busy, error, submit } = useSubmit(close);
  return (
    <form
      onSubmit={submit(() =>
        mutate('/reports', { ...item, reason }, 'Avís enviat als responsables del centre.'),
      )}
    >
      <Field label="Què hauríem de revisar?">
        <textarea
          rows={4}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          required
          maxLength={1000}
        />
      </Field>
      <FormError error={error} />
      <FormFooter busy={busy} onCancel={close} label="Enviar avís" />
    </form>
  );
}
export function FocusForm() {
  const { data, close, mutate } = useApp();
  const { timer, applySettings } = useTimer();
  const [f, setF] = useState(data.focus);
  const [applyNow, setApplyNow] = useState(!timer.running && !timer.sessionId);
  const { busy, error, submit } = useSubmit(close);
  return (
    <form
      onSubmit={submit(async () => {
        await mutate('/focus/settings', f, 'Pastisdoro personalitzat.');
        if (applyNow) applySettings(f);
      })}
    >
      <div className="form-grid">
        {[
          ['work', 'Concentració (minuts)', 120],
          ['rest', 'Descans (minuts)', 60],
          ['long_rest', 'Descans llarg (minuts)', 60],
          ['rounds', 'Sessions abans del descans llarg', 12],
        ].map(([k, label, max]) => (
          <Field key={k} label={label}>
            <input
              type="number"
              min="1"
              max={max}
              required
              value={f[k]}
              onChange={(e) => setF({ ...f, [k]: Number(e.target.value) })}
            />
          </Field>
        ))}
      </div>
      {timer.running || timer.sessionId ? (
        <fieldset className="settings-apply">
          <legend>Quan vols aplicar la nova durada?</legend>
          <label>
            <input
              type="radio"
              name="focus-apply"
              checked={!applyNow}
              onChange={() => setApplyNow(false)}
            />{' '}
            A la següent sessió · conservar el temps actual
          </label>
          <label>
            <input
              type="radio"
              name="focus-apply"
              checked={applyNow}
              onChange={() => setApplyNow(true)}
            />{' '}
            Aplicar ara i reiniciar aquesta sessió
          </label>
        </fieldset>
      ) : (
        <p className="muted">La nova durada s’aplicarà al comptador quan desis.</p>
      )}
      <FormError error={error} />
      <FormFooter busy={busy} onCancel={close} />
    </form>
  );
}
