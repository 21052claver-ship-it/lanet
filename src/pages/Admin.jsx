import React, { useEffect, useRef, useState } from 'react';
import { ArrowClockwise, ShieldCheck, Users, ChartBar, Database } from '@phosphor-icons/react';
import { useApp } from '../context';
import { api } from '../api';
import { PageTitle, Button, Empty, FormError } from '../ui';
import Select from '../components/Select';
import { ACTIVITY_AREAS, isActivityAdmin, activityDayOffset } from '../../shared/activity';
import './admin.css';

const number = (value) => new Intl.NumberFormat('ca-ES').format(value || 0);
const date = (value) =>
  new Date(value).toLocaleString('ca-ES', {
    timeZone: 'Europe/Madrid',
    dateStyle: 'short',
    timeStyle: 'short',
  });
const size = (bytes) => `${number(Math.round((bytes / 1048576) * 10) / 10)} MB`;

export default function Admin() {
  const { data } = useApp();
  const allowed = isActivityAdmin(data.user);
  const [result, setResult] = useState(null),
    [error, setError] = useState('');
  const [days, setDays] = useState(30),
    [selected, setSelected] = useState('');
  const [cursor, setCursor] = useState(''),
    [attempt, setAttempt] = useState(0);
  const [loading, setLoading] = useState(false);
  const requestId = useRef(0);
  useEffect(() => {
    if (!allowed) return;
    let current = true,
      busy = false;
    const load = async () => {
      if (busy) return;
      busy = true;
      const id = ++requestId.current;
      setLoading(true);
      try {
        const query = new URLSearchParams({ days: String(days) });
        if (selected) query.set('day', selected);
        if (cursor) query.set('after', cursor);
        const value = await api('/admin/analytics?' + query);
        if (current && id === requestId.current) {
          setResult(value);
          setError('');
        }
      } catch (e) {
        if (current && id === requestId.current) setError(e.message);
      } finally {
        busy = false;
        if (current && id === requestId.current) setLoading(false);
      }
    };
    load();
    const timer = setInterval(() => {
      if (document.visibilityState === 'visible') load();
    }, 60000);
    return () => {
      current = false;
      clearInterval(timer);
    };
  }, [allowed, days, selected, cursor, attempt]);
  if (!allowed)
    return (
      <Empty
        title="Dashboard privat"
        body="Aquest espai només està disponible per al compte autoritzat."
      />
    );
  const today = result?.daily.find((row) => row.day === result.today);
  const chart = result
    ? Array.from({ length: days }, (_, index) => {
        const day = activityDayOffset(result.today, index + 1 - days);
        return { day, users: result.daily.find((row) => row.day === day)?.users || 0 };
      })
    : [];
  const maximum = Math.max(1, ...chart.map((row) => row.users));
  return (
    <>
      <PageTitle title="Dashboard privat" subtitle="Activitat de La Net · Europe/Madrid">
        <Button busy={loading} onClick={() => setAttempt((value) => value + 1)}>
          <ArrowClockwise size={18} />
          Actualitzar
        </Button>
      </PageTitle>
      <p className="admin-access">
        <ShieldCheck size={18} /> Accés exclusiu de 21052.claver@fje.edu
      </p>
      <FormError error={error} />
      {error && result && (
        <p role="status">
          Les dades de sota són de l’última lectura correcta: {date(result.generated_at)}.
        </p>
      )}
      {loading && !result && <p role="status">Carregant les estadístiques…</p>}
      {result && (
        <div className="activity-dashboard">
          <div className="activity-metrics">
            <article className="panel">
              <Users size={24} />
              <strong>{number(result.active_total)}</strong>
              <h2>Actius ara</h2>
              <p>Activitat en els últims 5 minuts</p>
            </article>
            <article className="panel">
              <ChartBar size={24} />
              <strong>{number(today?.users)}</strong>
              <h2>Persones avui</h2>
              <p>Comptes únics amb activitat</p>
            </article>
            <article className="panel">
              <ShieldCheck size={24} />
              <strong>{number(result.inventory.users)}</strong>
              <h2>Comptes</h2>
              <p>
                {number(result.inventory.enabled)} habilitats ·{' '}
                {number(result.inventory.users - result.inventory.enabled)} desactivats
              </p>
            </article>
            <article className="panel">
              <Database size={24} />
              <strong>{size(result.inventory.file_bytes)}</strong>
              <h2>Fitxers registrats</h2>
              <p>{number(result.inventory.files)} fitxers · mida de les versions servides</p>
            </article>
          </div>
          <section className="panel activity-section">
            <div className="activity-heading">
              <h2>Usuaris per dia</h2>
              <Select
                aria-label="Període d’activitat"
                value={days}
                onChange={(e) => setDays(Number(e.target.value))}
              >
                {[7, 30, 90, 365].map((value) => (
                  <option key={value} value={value}>
                    Últims {value} dies
                  </option>
                ))}
              </Select>
            </div>
            <div
              className="activity-chart"
              role="img"
              aria-label={`Usuaris únics per dia durant ${days} dies. Detall a la taula següent.`}
            >
              {chart.map((row) => (
                <span
                  key={row.day}
                  title={`${row.day}: ${row.users} persones`}
                  style={{ height: `${Math.max(1, (row.users / maximum) * 100)}%` }}
                />
              ))}
            </div>
            <div className="activity-chart-labels">
              <span>{chart[0]?.day}</span>
              <span>{result.today}</span>
            </div>
            <details>
              <summary>Veure les xifres diàries</summary>
              <div className="activity-scroll">
                <table>
                  <thead>
                    <tr>
                      <th>Dia</th>
                      <th>Persones</th>
                      <th>Presència</th>
                      <th>Canvis</th>
                      <th>Errors</th>
                    </tr>
                  </thead>
                  <tbody>
                    {chart
                      .slice()
                      .reverse()
                      .map((row) => {
                        const value = result.daily.find((item) => item.day === row.day);
                        return (
                          <tr key={row.day}>
                            <td>{row.day}</td>
                            <td>{number(row.users)}</td>
                            <td>{number(value?.pulses)}</td>
                            <td>{number(value?.actions)}</td>
                            <td>{number(value?.errors)}</td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            </details>
          </section>
          <section className="panel activity-section">
            <h2>Actius ara</h2>
            <p className="muted">
              Actualització cada minut mentre aquesta pestanya és visible. La presència és
              aproximada.
            </p>
            {result.active.length ? (
              <div className="activity-scroll">
                <table>
                  <thead>
                    <tr>
                      <th>Persona</th>
                      <th>Grup</th>
                      <th>Última secció</th>
                      <th>Última activitat</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.active.map((person) => (
                      <tr key={person.user_id}>
                        <td>
                          <strong>{person.name}</strong>
                          <small>{person.email}</small>
                        </td>
                        <td>{person.group_id || '—'}</td>
                        <td>{ACTIVITY_AREAS[person.page]}</td>
                        <td>{date(person.last_seen)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p>Cap persona amb activitat recent.</p>
            )}
            {result.active_total > result.active.length && (
              <p>
                Es mostren les 50 persones amb activitat més recent de {number(result.active_total)}
                .
              </p>
            )}
          </section>
          <section className="panel activity-section">
            <h2>Ús de les seccions</h2>
            <div className="activity-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Secció</th>
                    <th>Mostres de presència</th>
                    <th>Intervals amb canvis</th>
                    <th>Intervals amb errors</th>
                  </tr>
                </thead>
                <tbody>
                  {result.areas.map((area) => (
                    <tr key={area.area}>
                      <td>{ACTIVITY_AREAS[area.area]}</td>
                      <td>{number(area.pulses)}</td>
                      <td>{number(area.actions)}</td>
                      <td>{number(area.errors)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
          <section className="panel activity-section">
            <div className="activity-heading">
              <h2>Activitat de les persones</h2>
              <label>
                Dia{' '}
                <input
                  type="date"
                  aria-label="Dia del detall personal"
                  value={selected || result.today}
                  min={activityDayOffset(result.today, -34)}
                  max={result.today}
                  onChange={(e) => {
                    setSelected(e.target.value);
                    setCursor('');
                  }}
                />
              </label>
            </div>
            <p className="muted">
              {result.selected_day} · pàgines de 50 persones. Els comptadors són intervals
              mostrejats, no clics ni minuts exactes.
            </p>
            {result.people.length ? (
              <div className="activity-scroll">
                <table>
                  <thead>
                    <tr>
                      <th>Persona</th>
                      <th>Primera activitat</th>
                      <th>Última activitat</th>
                      <th>Secció</th>
                      <th>Presència</th>
                      <th>Canvis</th>
                      <th>Errors</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.people.map((person) => (
                      <tr key={person.user_id}>
                        <td>
                          <strong>{person.name}</strong>
                          <small>{person.email}</small>
                        </td>
                        <td>{date(person.first_seen)}</td>
                        <td>{date(person.last_seen)}</td>
                        <td>{ACTIVITY_AREAS[person.page]}</td>
                        <td>{number(person.pulses)}</td>
                        <td>{number(person.actions)}</td>
                        <td>{number(person.errors)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p>Encara no hi ha activitat registrada aquest dia.</p>
            )}
            <div className="row-actions">
              {cursor && <Button onClick={() => setCursor('')}>Primera pàgina</Button>}
              {result.next && (
                <Button busy={loading} onClick={() => setCursor(result.next)}>
                  Següents persones
                </Button>
              )}
            </div>
          </section>
          <section className="panel activity-section activity-policy">
            <h2>Dades necessàries, conservació limitada</h2>
            <p
              role={
                !result.maintenance ||
                result.generated_at - result.maintenance.last_success > 600000
                  ? 'status'
                  : undefined
              }
            >
              Últim manteniment completat:{' '}
              {result.maintenance
                ? date(result.maintenance.last_success)
                : 'pendent de la primera passada'}
              .
              {result.maintenance && (
                <> Retirades de fitxers pendents: {number(result.maintenance.pending_files)}.</>
              )}
              {result.maintenance &&
                result.generated_at - result.maintenance.last_success > 600000 &&
                ' Cal revisar el servei de manteniment: fa més de 10 minuts que no confirma una passada.'}
            </p>
            <p>
              Mostreig cada 2 minuts per persona i tipus d’activitat, compartit entre pestanyes. La
              presència s’atura si la pestanya queda oculta o passen 5 minuts sense interacció. Els
              canvis i errors es resumeixen al servidor.
            </p>
            <p>
              Detall personal durant 35 dies; resums diaris durant 400 dies. Sense IP, dispositiu,
              URL, text, notes acadèmiques ni registre de clics. L’activitat no ocupa R2. La mida
              indicada prové de metadades i no inclou originals privats ni còpies de seguretat; no
              és la quota total del proveïdor.
            </p>
            <p>
              Recollida iniciada el {result.started_at ? date(result.started_at) : '—'}. No hi ha
              estadístiques anteriors inventades. Última lectura: {date(result.generated_at)}.
            </p>
          </section>
        </div>
      )}
    </>
  );
}
