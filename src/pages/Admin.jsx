import Select from '../components/Select';
import { MAIN_ASSESSMENTS, assessmentType, activeAssessment } from '../../shared/assessments';
import React, { useState, useEffect } from 'react';
import { Plus, NotePencil, ShieldCheck, Check, Warning } from '@phosphor-icons/react';
import { useApp } from '../context';
import { api } from '../api';
import { PageTitle, Button, Tabs, Empty, SubjectChip, IconButton, FormError } from '../ui';
import { DAYS_SHORT, TERM_LABELS } from '../../shared/domain';
export default function Admin() {
  const { data, open, subject, mutate, notify } = useApp();
  const [tab, setTab] = useState('course'),
    [management, setManagement] = useState(null),
    [error, setError] = useState(''),
    [loading, setLoading] = useState(true),
    [reload, setReload] = useState(0),
    [group, setGroup] = useState(data.user.group_id),
    [term, setTerm] = useState(1);
  const admin = data.user.role === 'admin';
  useEffect(() => {
    if (data.user.role === 'student') return;
    let current = true;
    setLoading(true);
    api('/admin')
      .then((result) => {
        if (!current) return;
        setManagement(result);
        setError('');
      })
      .catch((e) => current && setError(e.message))
      .finally(() => current && setLoading(false));
    return () => {
      current = false;
    };
  }, [data, tab, reload]);
  if (data.user.role === 'student')
    return <Empty title="Aquest espai és per als responsables del centre" />;
  const offerings = data.offerings.filter((o) => o.group_id === group);
  return (
    <>
      <PageTitle
        title="Gestió del centre"
        subtitle="Dades comunes, preparades pels delegats i administradors."
      >
        {admin && <Button onClick={() => open('school')}>Configurar centre</Button>}
      </PageTitle>
      <Tabs
        items={[
          ['course', 'Curs i horaris'],
          ['templates', 'Percentatges'],
          ...(admin ? [['users', 'Comptes']] : []),
          ['reports', 'Revisions'],
        ]}
        value={tab}
        onChange={setTab}
      />
      <FormError error={error} />
      {error && (
        <Button busy={loading} onClick={() => setReload((attempt) => attempt + 1)}>
          Tornar-ho a provar
        </Button>
      )}
      {loading && !management && <p role="status">Carregant la gestió del centre…</p>}
      {['course', 'templates'].includes(tab) && (
        <div className="admin-toolbar">
          <Select
            aria-label="Grup gestionat"
            value={group}
            onChange={(e) => setGroup(e.target.value)}
          >
            {data.groups
              .filter((g) => admin || g.id === data.user.group_id)
              .map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
          </Select>
          {tab === 'templates' && (
            <Select
              aria-label="Trimestre de la plantilla"
              value={term}
              onChange={(e) => setTerm(Number(e.target.value))}
            >
              {TERM_LABELS.map((t, i) => (
                <option key={t} value={i + 1}>
                  {t}
                </option>
              ))}
            </Select>
          )}
          <Button
            variant="primary"
            onClick={() =>
              open(
                tab === 'course' ? 'offering' : 'template',
                tab === 'course' ? { group_id: group } : { offering_id: offerings[0]?.id, term },
              )
            }
          >
            <Plus size={17} />
            {tab === 'course' ? 'Afegir variant' : 'Editar plantilla'}
          </Button>
          {admin && tab === 'course' && (
            <>
              <Button onClick={() => open('subject')}>Nova assignatura</Button>
              <Button onClick={() => open('group')}>Nou grup</Button>
            </>
          )}
        </div>
      )}
      {tab === 'course' ? (
        <>
          <div className="panel admin-table">
            <table>
              <thead>
                <tr>
                  <th>Assignatura / variant</th>
                  <th>Professor</th>
                  <th>Franges</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {offerings.map((o) => (
                  <tr key={o.id}>
                    <td>
                      <SubjectChip subject={subject(o.subject_id)} />
                      <small>{o.variant}</small>
                    </td>
                    <td>{o.teacher}</td>
                    <td>
                      {data.slots
                        .filter((s) => s.offering_id === o.id)
                        .map((s) => (
                          <span className="slot-tag" key={s.id}>
                            {DAYS_SHORT[s.day]} {s.start} · {s.room}
                          </span>
                        ))}
                    </td>
                    <td>
                      <IconButton
                        label={`Editar ${subject(o.subject_id)?.short}`}
                        onClick={() => open('offering', o)}
                      >
                        <NotePencil size={20} />
                      </IconButton>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {admin && (
            <div className="admin-subject-list">
              <h3>Assignatures del catàleg</h3>
              {data.subjects.map((s) => (
                <button key={s.id} onClick={() => open('subject', s)}>
                  <SubjectChip subject={s} />
                  <NotePencil size={15} />
                </button>
              ))}
            </div>
          )}
        </>
      ) : tab === 'templates' ? (
        <div className="template-grid">
          {offerings.map((o) => {
            const ts = data.templates.filter((t) => t.offering_id === o.id && t.term === term);
            return (
              <section className="panel template-card" key={o.id}>
                <SubjectChip subject={subject(o.subject_id)} />
                <h2>{o.variant}</h2>
                <p className="muted">{o.teacher}</p>
                <div>
                  {ts
                    .filter(
                      (t) => MAIN_ASSESSMENTS.includes(assessmentType(t)) || activeAssessment(t),
                    )
                    .map((t) => (
                      <p key={t.id}>
                        <span>{t.title}</span>
                        <strong>{t.weight}%</strong>
                      </p>
                    ))}
                </div>
                <small className="assessment-template-note">
                  Activitats opcionals: redaccions, entregues i presentacions.
                </small>
                <Button
                  variant="full"
                  onClick={() => open('template', { offering_id: o.id, term })}
                >
                  <NotePencil size={17} />
                  Editar plantilla
                </Button>
              </section>
            );
          })}
        </div>
      ) : tab === 'users' ? (
        <div className="panel admin-table">
          <table>
            <thead>
              <tr>
                <th>Estudiant</th>
                <th>Grup</th>
                <th>Rol</th>
                <th>Estat</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {management?.users.map((u) => (
                <tr key={u.id}>
                  <td>
                    <strong>{u.name}</strong>
                    <small>{u.email}</small>
                  </td>
                  <td>{u.group_id}</td>
                  <td>
                    {u.role === 'admin'
                      ? 'Administrador'
                      : u.role === 'delegate'
                        ? 'Delegat'
                        : 'Estudiant'}
                  </td>
                  <td>{u.disabled ? 'Desactivat' : 'Actiu'}</td>
                  <td>
                    <Button disabled={u.id === data.user.id} onClick={() => open('manageUser', u)}>
                      Gestionar
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <section className="report-list">
          {management?.reports.length ? (
            management.reports.map((r) => (
              <article className="panel report-card" key={r.id}>
                <span className="clay-icon peach">
                  <Warning size={22} />
                </span>
                <div>
                  <h2>
                    Revisar{' '}
                    {r.type === 'note'
                      ? 'apunts'
                      : r.type === 'discussion'
                        ? 'dubte de l’assignatura'
                      : r.type === 'plus'
                        ? 'plus'
                        : r.type === 'proposal'
                          ? 'proposta'
                          : 'missatge'}
                  </h2>
                  <p>{r.reason}</p>
                  <small>{r.author}</small>
                  <div className="row-actions">
                    <Button
                      onClick={() => {
                        if (r.type === 'discussion') {
                          open('discussion', {id:r.target_id});
                          return;
                        }
                        const item = {
                          note: data.notes,
                          plus: data.pluses,
                          proposal: data.proposals,
                          banner: data.bannerSlots?.map((s) => s.banner) || [data.banner],
                        }[r.type].find((p) => p?.id === r.target_id);
                        if (item)
                          open(
                            r.type === 'note'
                              ? 'reader'
                              : r.type === 'plus'
                                ? 'plusDetail'
                                : r.type === 'proposal'
                                  ? 'proposalResponse'
                                  : 'banner',
                            item,
                          );
                        else
                          notify('Aquest contingut ja s’ha retirat o no està disponible.', 'error');
                      }}
                    >
                      Veure contingut
                    </Button>
                    <Button
                      onClick={() =>
                        mutate('/admin/reports', { id: r.id }, 'Revisió resolta.').catch(() => {})
                      }
                    >
                      <Check size={17} />
                      Marcar com resolt
                    </Button>
                    {admin && ['note', 'plus'].includes(r.type) && (
                      <Button
                        variant="danger"
                        onClick={() =>
                          open('delete', {
                            resource: r.type === 'note' ? 'notes' : 'pluses',
                            id: r.target_id,
                            title: 'Contingut notificat',
                          })
                        }
                      >
                        Retirar
                      </Button>
                    )}
                  </div>
                </div>
              </article>
            ))
          ) : management ? (
            <Empty
              title="No hi ha revisions pendents"
              body="Els avisos sobre continguts apareixeran aquí."
            />
          ) : null}
        </section>
      )}
    </>
  );
}
