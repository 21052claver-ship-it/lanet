import React, { useState } from 'react';
import {
  BETS_BY_ID,
  TABLE_BETS,
  MAX_STAKE,
  rouletteColor,
  roulettePayout,
} from '../../shared/roulette';
const modes = [
  ['number', 'Números'],
  ['split', 'Entre dos'],
  ['corner', 'Cantonades'],
  ['street', 'Files de 3'],
  ['six', 'Files de 6'],
  ['zero', 'Zona del 0'],
];
function coordinates(b) {
  const n = b.numbers[0],
    row = Math.floor((n - 1) / 3),
    col = (n - 1) % 3;
  if (b.kind === 'number') return [col + 0.5, row + 0.5];
  if (b.kind === 'split')
    return b.numbers[1] - n === 1 ? [col + 1, row + 0.5] : [col + 0.5, row + 1];
  if (b.kind === 'corner') return [col + 1, row + 1];
  return [1.5, row + (b.kind === 'six' ? 1 : 0.5)];
}
export default function RouletteBoard({ bets, onChange, disabled, balance, onError, resetToken }) {
  const [mode, setMode] = useState('number'),
    [chip, setChip] = useState(1),
    [undoHistory, setUndoHistory] = useState({ token: resetToken, entries: [] }),
    [preview, setPreview] = useState(null);
  const total = bets.reduce((s, b) => s + b.stake, 0);
  const amounts = Object.fromEntries(bets.map((b) => [b.id, b.stake]));
  const undo = undoHistory.token === resetToken ? undoHistory.entries : [];
  function setUndo(value) {
    setUndoHistory((current) => ({
      token: resetToken,
      entries:
        typeof value === 'function'
          ? value(current.token === resetToken ? current.entries : [])
          : value,
    }));
  }
  const active = preview ? BETS_BY_ID[preview] : null;
  function change(next) {
    setUndo((current) => [...current.slice(-999), bets]);
    onChange(next);
    onError('');
  }
  function place(id) {
    setPreview(id);
    if (total + chip > Math.min(balance, MAX_STAKE)) {
      onError(
        `No hi caben més fitxes: tens ${balance} pastissos i el límit per gir és ${MAX_STAKE}.`,
      );
      return;
    }
    change(
      amounts[id]
        ? bets.map((b) => (b.id === id ? { ...b, stake: b.stake + chip } : b))
        : [...bets, { id, stake: chip }],
    );
  }
  function target(b, style = {}, extra = '') {
    return (
      <button
        key={b.id}
        type="button"
        className={`tapet-target ${extra} ${amounts[b.id] ? 'has-chips' : ''}`}
        style={style}
        aria-label={`${b.label} · retorn ×${b.multiplier}${amounts[b.id] ? ` · ${amounts[b.id]} apostats` : ''}`}
        onFocus={() => setPreview(b.id)}
        onMouseEnter={() => setPreview(b.id)}
        onClick={() => place(b.id)}
        data-bet-id={b.id}
      >
        <span>
          {extra.includes('tapet-number')
            ? b.numbers[0]
            : ['street', 'six'].includes(b.kind)
              ? `${b.numbers[0]}–${b.numbers[b.numbers.length - 1]}`
              : extra.includes('tapet-outside')
                ? b.label
                : '+'}
        </span>
        {amounts[b.id] > 0 && <b className="tapet-chip">{amounts[b.id]}</b>}
      </button>
    );
  }
  const gridBets = TABLE_BETS.filter((b) => b.numbers[0] > 0 && b.kind === mode);
  const outside = ['column', 'dozen', 'red', 'black', 'even', 'odd', 'low', 'high'].flatMap(
    (kind) => TABLE_BETS.filter((b) => b.kind === kind),
  );
  const maxReturn = Math.max(...Array.from({ length: 37 }, (_, n) => roulettePayout({ bets }, n)));
  return (
    <div className="roulette-board">
      <p className="tapet-help">
        Tria una fitxa i toca el tapet. Pots repartir-ne en diverses posicions abans de girar.
      </p>
      <div className="tapet-toolbar">
        <div role="group" aria-label="Valor de la fitxa" className="tapet-denominations">
          {[1, 5, 10, 25, 100].map((n) => (
            <button
              type="button"
              key={n}
              aria-pressed={chip === n}
              onClick={() => setChip(n)}
              className={`denomination denomination-${n}`}
            >
              {n}
              <span className="sr-only"> pastissos per fitxa</span>
            </button>
          ))}
        </div>
        <div className="tapet-edit">
          <button
            type="button"
            disabled={!undo.length}
            onClick={() => {
              onChange(undo[undo.length - 1]);
              setUndo((v) => v.slice(0, -1));
              onError('');
            }}
          >
            Desfer
          </button>
          <button type="button" disabled={!bets.length} onClick={() => change([])}>
            Retirar totes
          </button>
        </div>
      </div>
      <div className="tapet-modes" role="group" aria-label="On posar les fitxes">
        {modes.map(([id, label]) => (
          <button
            type="button"
            key={id}
            aria-pressed={mode === id}
            onClick={() => {
              setMode(id);
              setPreview(null);
            }}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="tapet-preview" aria-live="polite">
        {active ? (
          <>
            <strong>{active.label}</strong>
            <span>
              {active.numbers.join(' · ')} · Retorn ×{active.multiplier}, inclosa l’aposta
            </span>
          </>
        ) : (
          <>
            <strong>{modes.find((m) => m[0] === mode)[1]}</strong>
            <span>
              {mode === 'split'
                ? 'Toca el punt entre dos números.'
                : mode === 'corner'
                  ? 'Toca la cruïlla de quatre números.'
                  : mode === 'six'
                    ? 'Toca la línia entre dues files.'
                    : 'Toca una posició per afegir-hi la fitxa.'}
            </span>
          </>
        )}
      </div>
      {mode === 'zero' ? (
        <div className="tapet-zero-options">
          {TABLE_BETS.filter((b) => b.numbers[0] === 0).map((b) => (
            <button
              type="button"
              key={b.id}
              onClick={() => place(b.id)}
              data-bet-id={b.id}
              aria-label={`${b.label} · retorn ×${b.multiplier}`}
            >
              <strong>{b.label}</strong>
              <small>×{b.multiplier}</small>
              {amounts[b.id] > 0 && <b className="tapet-chip">{amounts[b.id]}</b>}
            </button>
          ))}
        </div>
      ) : (
        <>
          <div className="tapet-zero">
            {target(BETS_BY_ID['number:0'], {}, 'tapet-outside pocket-green')}
          </div>
          <div className="tapet-container">
            <div className={`tapet-grid mode-${mode}`} role="group" aria-label="Tapet de la ruleta">
              {Array.from({ length: 36 }, (_, i) => {
                const n = i + 1,
                  row = Math.floor(i / 3),
                  col = i % 3;
                const style = {
                  '--vx': `${((col + 0.5) / 3) * 100}%`,
                  '--vy': `${((row + 0.5) / 12) * 100}%`,
                  '--hx': `${((row + 0.5) / 12) * 100}%`,
                  '--hy': `${((2 - col + 0.5) / 3) * 100}%`,
                };
                return mode === 'number' ? (
                  target(
                    BETS_BY_ID[`number:${n}`],
                    style,
                    `tapet-number pocket-${rouletteColor(n)}`,
                  )
                ) : (
                  <span
                    key={n}
                    className={`tapet-cell pocket-${rouletteColor(n)} ${active?.numbers.includes(n) ? 'is-covered' : ''}`}
                    style={style}
                  >
                    {n}
                    {amounts[`number:${n}`] > 0 && (
                      <b className="tapet-chip">{amounts[`number:${n}`]}</b>
                    )}
                  </span>
                );
              })}
              {bets
                .filter(
                  (b) =>
                    ['split', 'corner', 'street', 'six'].includes(BETS_BY_ID[b.id].kind) &&
                    BETS_BY_ID[b.id].numbers[0] > 0 &&
                    BETS_BY_ID[b.id].kind !== mode,
                )
                .map((b) => {
                  const [x, y] = coordinates(BETS_BY_ID[b.id]);
                  return (
                    <span
                      key={`placed-${b.id}`}
                      className="tapet-placed"
                      aria-hidden="true"
                      style={{
                        '--vx': `${(x / 3) * 100}%`,
                        '--vy': `${(y / 12) * 100}%`,
                        '--hx': `${(y / 12) * 100}%`,
                        '--hy': `${((3 - x) / 3) * 100}%`,
                      }}
                    >
                      {b.stake}
                    </span>
                  );
                })}
              {mode !== 'number' &&
                gridBets.map((b) => {
                  const [x, y] = coordinates(b);
                  return target(
                    b,
                    {
                      '--vx': `${(x / 3) * 100}%`,
                      '--vy': `${(y / 12) * 100}%`,
                      '--hx': `${(y / 12) * 100}%`,
                      '--hy': `${((3 - x) / 3) * 100}%`,
                    },
                    ['street', 'six'].includes(mode) ? 'tapet-row' : 'tapet-junction',
                  );
                })}
            </div>
          </div>
        </>
      )}
      <div className="tapet-outsides" role="group" aria-label="Apostes exteriors">
        {outside.map((b) =>
          target(
            b,
            {},
            `tapet-outside ${['red', 'black'].includes(b.kind) ? `pocket-${b.kind}` : ''}`,
          ),
        )}
      </div>
      <div className="tapet-total" aria-live="polite">
        <strong>{total} pastissos al tapet</strong>
        <span>
          Saldo restant si apostes: {Math.max(0, balance - total)} · Retorn màxim: {maxReturn}
        </span>
        {total > balance && (
          <span role="alert">Les fitxes superen el saldo actual. Retira’n abans de girar.</span>
        )}
      </div>
      {bets.length > 0 && (
        <details className="tapet-ticket">
          <summary>Revisar i retirar fitxes · {bets.length} posicions</summary>
          <ul>
            {bets.map((b) => (
              <li key={b.id}>
                <span>
                  <strong>{BETS_BY_ID[b.id].label}</strong>
                  <small>
                    {b.stake} apostats · ×{BETS_BY_ID[b.id].multiplier}
                  </small>
                </span>
                <button
                  type="button"
                  aria-label={`Retirar una fitxa de ${BETS_BY_ID[b.id].label}`}
                  onClick={() =>
                    change(
                      bets.flatMap((v) =>
                        v.id !== b.id
                          ? [v]
                          : v.stake > chip
                            ? [{ ...v, stake: v.stake - chip }]
                            : [],
                      ),
                    )
                  }
                >
                  −{Math.min(chip, b.stake)}
                </button>
                <button
                  type="button"
                  aria-label={`Retirar ${BETS_BY_ID[b.id].label}`}
                  onClick={() => change(bets.filter((v) => v.id !== b.id))}
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        </details>
      )}
      {disabled && (
        <span className="sr-only">El tauler està bloquejat mentre es confirma el gir.</span>
      )}
    </div>
  );
}
