import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { ChartLineUp } from '@phosphor-icons/react';
import { Button, Field, FormError } from '../ui';
import Select from './Select';
import {
  createPauHistoryLoader,
  historicalStats,
  historySegments,
  historySource,
  historicalAlternatives,
} from '../../shared/pau-history';

const loadHistory = createPauHistoryLoader();
const mark = (value) =>
  value == null
    ? 'Sense dada'
    : value.toLocaleString('ca-ES', { minimumFractionDigits: 3, maximumFractionDigits: 3 });
const change = (value) =>
  value == null ? 'Sense comparació' : (value > 0 ? '+' : '') + mark(value) + ' punts';
const colors = ['#3c7660', '#a65a30', '#566fa9', '#92628c', '#567d8b'];
function Chart({ series, years }) {
  const root = useRef(null);
  const [width, setWidth] = useState(320);
  useLayoutEffect(() => {
    const observer = new ResizeObserver(([entry]) =>
      setWidth(Math.max(260, Math.round(entry.contentRect.width))),
    );
    observer.observe(root.current);
    return () => observer.disconnect();
  }, []);
  const x = (index) => 38 + (index * (width - 58)) / 4,
    y = (value) => 215 - (value - 5) * 20;
  const mean = series.length === 1 ? historicalStats(series[0].values).mean : null;
  return (
    <div className="pau-history-plot" ref={root}>
      <svg
        width="100%"
        height="255"
        viewBox={`0 0 ${width} 255`}
        role="img"
        aria-label="Evolució de la nota de tall de 2022 a 2026. Escala de 5 a 14 punts. Les dades exactes són a la taula."
      >
        {[5, 8, 11, 14].map((value) => (
          <g key={value}>
            <line x1="35" x2={width - 12} y1={y(value)} y2={y(value)} stroke="#dedbd4" />
            <text x="25" y={y(value) + 4} textAnchor="end">
              {value}
            </text>
          </g>
        ))}
        {years.map((year, index) => (
          <text key={year} x={x(index)} y="239" textAnchor="middle">
            {year}
          </text>
        ))}
        {mean != null && (
          <line
            x1="35"
            x2={width - 12}
            y1={y(mean)}
            y2={y(mean)}
            stroke="#7e7469"
            strokeDasharray="4 4"
          >
            <title>Mitjana: {mark(mean)}</title>
          </line>
        )}
        {series.map((item, seriesIndex) => (
          <g key={item.code} stroke={colors[seriesIndex]} fill={colors[seriesIndex]}>
            {historySegments(item.values)
              .filter((segment) => segment.length > 1)
              .map((segment, index) => (
                <polyline
                  key={index}
                  points={segment.map((point) => `${x(point.index)},${y(point.value)}`).join(' ')}
                  fill="none"
                  strokeWidth="2.5"
                  strokeDasharray={
                    seriesIndex ? `${8 - seriesIndex} ${seriesIndex + 2}` : undefined
                  }
                />
              ))}
            {item.values.map((value, index) =>
              value == null ? null : (
                <circle
                  key={index}
                  cx={x(index)}
                  cy={y(value)}
                  r="4"
                  strokeWidth="2"
                  stroke="white"
                >
                  <title>
                    {item.name} · {years[index]}: {mark(value)}
                  </title>
                </circle>
              ),
            )}
          </g>
        ))}
      </svg>
      <div className="pau-history-legend">
        {series.map((item, index) => (
          <span key={item.code}>
            <i style={{ background: colors[index] }} />
            {item.name} · {item.university} · {item.code}
          </span>
        ))}
        {mean != null && (
          <span>
            <i className="is-mean" />
            Mitjana dels anys amb dada: {mark(mean)}
          </span>
        )}
      </div>
    </div>
  );
}

export default function PauHistory({ degrees }) {
  const [data, setData] = useState(null),
    [error, setError] = useState(''),
    [attempt, setAttempt] = useState(0);
  const [round, setRound] = useState('first');
  const [otherCode, setOtherCode] = useState('');
  useEffect(() => {
    let alive = true;
    setError('');
    loadHistory()
      .then((value) => {
        if (alive) setData(value);
      })
      .catch(() => {
        if (alive)
          setError(
            'No hem pogut carregar l’històric. Pots reintentar-ho sense perdre les teves opcions.',
          );
      });
    return () => {
      alive = false;
    };
  }, [attempt]);
  const unique = [
    ...new Map(degrees.filter(Boolean).map((degree) => [degree.code, degree])).values(),
  ].slice(0, 5);
  const alternatives = data && unique.length === 1 ? historicalAlternatives(data, unique[0]) : [];
  const comparison = alternatives.find((degree) => degree.code === otherCode);
  const series = data
    ? [...unique, ...(comparison ? [comparison] : [])].map((degree) => ({
        ...degree,
        values: data.degrees[degree.code]?.[round] || [null, null, null, null, null],
      }))
    : [];
  return (
    <section className="pau-history" aria-label="Històric de notes de tall">
      <div className="pau-history-heading">
        <h3>
          <ChartLineUp size={21} /> Evolució del tall · 2022–2026
        </h3>
        <Field label="Assignació de l’històric">
          <Select value={round} onChange={(event) => setRound(event.target.value)}>
            <option value="first">Primera assignació</option>
            <option value="latest">Última publicada</option>
          </Select>
        </Field>
      </div>
      <p className="pau-muted">
        Convocatòria de juny · via PAU/CFGS · mateix codi oficial, universitat i centre.
      </p>
      <FormError error={error} />
      {error && (
        <Button onClick={() => setAttempt((value) => value + 1)}>
          Tornar a carregar l’històric
        </Button>
      )}
      {!data && !error && <p role="status">Carregant l’històric oficial…</p>}
      {data && (
        <>
          {alternatives.length > 0 && (
            <div className="pau-history-alternatives">
              <p>
                La font històrica conté un altre codi amb el mateix nom, universitat i població.
                Pots comparar-lo en una sèrie separada; no pressuposem que els codis siguin
                equivalents.
              </p>
              <div className="row-actions">
                {alternatives.slice(0, 3).map((degree) => (
                  <Button
                    key={degree.code}
                    aria-pressed={otherCode === degree.code}
                    onClick={() => setOtherCode(otherCode === degree.code ? '' : degree.code)}
                  >
                    Comparar codi {degree.code}
                  </Button>
                ))}
              </div>
            </div>
          )}
          <Chart series={series} years={data.years} />
          {series.length === 1 && (
            <div className="pau-history-stats">
              {(() => {
                const stats = historicalStats(series[0].values);
                return (
                  <>
                    <div>
                      <span>Mitjana dels talls</span>
                      <strong>{mark(stats.mean)}</strong>
                      <small>{stats.count}/5 anys amb dada</small>
                    </div>
                    <div>
                      <span>Variació 2022 → 2026</span>
                      <strong>{change(stats.delta)}</strong>
                      <small>Mateixa assignació</small>
                    </div>
                    <div>
                      <span>Mínim – màxim</span>
                      <strong>
                        {stats.count ? `${mark(stats.min)} – ${mark(stats.max)}` : 'Sense dades'}
                      </strong>
                      <small>Anys disponibles</small>
                    </div>
                  </>
                );
              })()}
            </div>
          )}
          <div
            className="pau-history-table"
            tabIndex="0"
            role="region"
            aria-label="Taula de notes de tall històriques"
          >
            {series.length === 1 ? (
              <table>
                <caption>Notes oficials del grau {series[0].code}</caption>
                <thead>
                  <tr>
                    <th scope="col">Any</th>
                    <th scope="col">Primera</th>
                    <th scope="col">Última</th>
                    <th scope="col">
                      Variació anual
                      <br />({round === 'first' ? 'primera' : 'última'})
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {data.years.map((year, index) => {
                    const code = series[0].code,
                      record = data.degrees[code];
                    return (
                      <tr key={year}>
                        <th scope="row">
                          {year}
                          {year === 2026 && <small>En curs</small>}
                        </th>
                        {['first', 'latest'].map((kind) => {
                          const value = record?.[kind][index],
                            href = historySource(data, code, index, kind);
                          return (
                            <td key={kind} className={kind === round ? 'is-selected' : undefined}>
                              {href ? (
                                <a
                                  href={href}
                                  target="_blank"
                                  rel="noreferrer"
                                  aria-label={`${year}, ${kind === 'first' ? 'primera' : 'última'} assignació, ${mark(value)}, font oficial`}
                                >
                                  {mark(value)}
                                </a>
                              ) : (
                                'Sense dada'
                              )}
                            </td>
                          );
                        })}
                        <td>
                          {index > 0 &&
                          series[0].values[index] != null &&
                          series[0].values[index - 1] != null
                            ? change(
                                Math.round(
                                  (series[0].values[index] - series[0].values[index - 1]) * 1000,
                                ) / 1000,
                              )
                            : '—'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            ) : (
              <table>
                <caption>
                  Comparació de codis · {round === 'first' ? 'primera' : 'última'} assignació
                </caption>
                <thead>
                  <tr>
                    <th scope="col">Grau i centre</th>
                    {data.years.map((year) => (
                      <th key={year} scope="col">
                        {year}
                      </th>
                    ))}
                    <th scope="col">Mitjana</th>
                    <th scope="col">2022 → 2026</th>
                  </tr>
                </thead>
                <tbody>
                  {series.map((item) => {
                    const stats = historicalStats(item.values);
                    return (
                      <tr key={item.code}>
                        <th scope="row">
                          {item.name}
                          <small>
                            {item.university} · {item.code}
                          </small>
                        </th>
                        {item.values.map((value, index) => (
                          <td key={index}>{mark(value)}</td>
                        ))}
                        <td>
                          {mark(stats.mean)}
                          <small>{stats.count}/5 anys</small>
                        </td>
                        <td>{change(stats.delta)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
          <p className="pau-history-note">
            La mitjana és aritmètica dels talls disponibles, no la nota mitjana dels estudiants ni
            una predicció. Els anys sense dada queden buits al gràfic i no compten en la mitjana. No
            s’uneixen codis diferents encara que el nom s’assembli.
          </p>
          <p className="pau-history-note">
            2022–2025: procés de juny tancat. 2026: primera assignació del 10/07 i última publicada,
            6a del 07/10; el procés encara pot canviar.{' '}
            {round === 'latest'
              ? 'La comparació amb 2026 és provisional.'
              : 'La primera assignació permet comparar el mateix moment de cada any.'}
          </p>
          <p className="pau-history-note">
            Fonts:{' '}
            <a href={data.sources['history-2021-2025'].url} target="_blank" rel="noreferrer">
              històric oficial 2021–2025
            </a>{' '}
            ·{' '}
            <a href={data.sources['cutoffs-2026-first'].url} target="_blank" rel="noreferrer">
              primera de 2026
            </a>{' '}
            ·{' '}
            <a href={data.sources['cutoffs-2026-latest'].url} target="_blank" rel="noreferrer">
              última de 2026
            </a>
            . Revisat el 14/10/2026.
          </p>
        </>
      )}
    </section>
  );
}

export function PauHistoryComparison({ codes, catalogue }) {
  const [open, setOpen] = useState(false);
  const degrees = codes
    .map((code) => catalogue?.degrees.find((degree) => degree.code === code))
    .filter(Boolean);
  if (!degrees.length) return null;
  return (
    <details
      className="panel pau-history-comparison"
      onToggle={(event) => setOpen(event.currentTarget.open)}
    >
      <summary>Comparar l’evolució del meu top 5</summary>
      {open && <PauHistory degrees={degrees} />}
    </details>
  );
}
