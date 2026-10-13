import React, { useId, useRef, useState } from 'react';
import {
  BETS_BY_ID,
  TABLE_BETS,
  MAX_STAKE,
  rouletteColor,
  roulettePayout,
} from '../../shared/roulette';
import {
  roulettePosition,
  roulettePositionStyle,
  rouletteTargetClass,
} from '../../shared/roulette-layout';

const onTable = TABLE_BETS.filter((b) => roulettePosition(b));
const outside = TABLE_BETS.filter((b) => !roulettePosition(b));

export default function RouletteBoard({
  bets,
  onChange,
  disabled,
  balance,
  onError,
  resetToken,
  result = null,
  settledBets = [],
}) {
  const [chip, setChip] = useState(1),
    [undoHistory, setUndoHistory] = useState({ token: resetToken, entries: [] }),
    [preview, setPreview] = useState(null),
    [focused, setFocused] = useState('number:0'),
    [announcement, setAnnouncement] = useState('');
  const board = useRef(null);
  const helpId = useId();
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
    if (disabled) return;
    setUndo((current) => [...current.slice(-999), bets]);
    onChange(next);
    onError('');
  }
  function place(id) {
    if (disabled) return;
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
    setAnnouncement(
      `${chip} pastissos a ${BETS_BY_ID[id].label}. Total al tapet: ${total + chip}.`,
    );
  }
  function navigate(event) {
    const direction = {
      ArrowLeft: [-1, 0],
      ArrowRight: [1, 0],
      ArrowUp: [0, -1],
      ArrowDown: [0, 1],
    }[event.key];
    if (!direction && !['Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    const targets = [...board.current.querySelectorAll('[data-bet-id]')];
    let next;
    if (event.key === 'Home' || event.key === 'End') {
      next = targets.find(
        (t) => t.dataset.betId === (event.key === 'Home' ? 'number:0' : 'number:36'),
      );
    } else {
      const current = event.currentTarget.getBoundingClientRect();
      const [dx, dy] = direction;
      let score = Infinity;
      for (const target of targets) {
        if (target === event.currentTarget) continue;
        const r = target.getBoundingClientRect();
        const x = (r.left + r.right - current.left - current.right) / 2;
        const y = (r.top + r.bottom - current.top - current.bottom) / 2;
        const forward = x * dx + y * dy;
        const sideways = Math.abs(x * dy - y * dx);
        const distance = forward + sideways * 3;
        if (forward > 1 && distance < score) {
          score = distance;
          next = target;
        }
      }
    }
    next?.focus({ preventScroll: true });
    next?.scrollIntoView({ block: 'nearest' });
  }
  function target(b) {
    const type = rouletteTargetClass(b);
    const winning =
      Number.isInteger(result) &&
      b.numbers.includes(result) &&
      (b.kind === 'number' ||
        !roulettePosition(b) ||
        b.kind === 'column' ||
        amounts[b.id] > 0 ||
        settledBets.some((bet) => bet.id === b.id));
    const color = ['red', 'black'].includes(b.kind) ? b.kind : null;
    return (
      <button
        key={b.id}
        type="button"
        disabled={disabled}
        tabIndex={focused === b.id ? 0 : -1}
        className={`tapet-target ${type} ${color ? `pocket-${color}` : ''} ${amounts[b.id] ? 'has-chips' : ''} ${preview === b.id ? 'is-preview' : ''} ${b.kind === 'dozen' ? 'tapet-dozen' : ''} ${winning ? 'is-winning' : ''}`}
        style={roulettePositionStyle(b)}
        aria-label={`${b.label} · retorn ×${b.multiplier}${amounts[b.id] ? ` · ${amounts[b.id]} apostats` : ''}`}
        aria-describedby={helpId}
        data-winning={winning || undefined}
        title={winning ? `${b.label} · Casella guanyadora` : b.label}
        onFocus={() => {
          setFocused(b.id);
          setPreview(b.id);
        }}
        onMouseEnter={() => setPreview(b.id)}
        onKeyDown={navigate}
        onClick={() => place(b.id)}
        data-bet-id={b.id}
      >
        <span aria-hidden="true" className={type === 'tapet-edge' ? 'tapet-edge-label' : undefined}>
          {b.kind === 'number'
            ? b.numbers[0]
            : b.kind === 'column'
              ? '2:1'
              : type === 'tapet-edge'
                ? b.numbers.length
                : type === 'tapet-outside'
                  ? b.label
                  : ''}
        </span>
        {amounts[b.id] > 0 && (
          <b
            key={amounts[b.id]}
            className={`tapet-chip ${amounts[b.id] >= 1000 ? 'is-large' : ''}`}
            aria-hidden="true"
          >
            {amounts[b.id]}
          </b>
        )}
      </button>
    );
  }
  const maxReturn = Math.max(...Array.from({ length: 37 }, (_, n) => roulettePayout({ bets }, n)));
  return (
    <div className="roulette-board" data-result={result ?? undefined}>
      <p className="tapet-help">
        Tria una fitxa i posa-la sobre un número, una línia o una cruïlla. A la vora, 3 cobreix una
        fila i 6 en cobreix dues.
      </p>
      <p id={helpId} className="sr-only">
        Fletxes per moure’t pel tapet; Intro o espai per posar una fitxa. Inici va al zero i Fi al
        36.
      </p>
      <div className="sr-only" role="status">
        {announcement}
      </div>
      <div className="tapet-toolbar">
        <div role="group" aria-label="Valor de la fitxa" className="tapet-denominations">
          {[1, 5, 10, 25, 100].map((n) => (
            <button
              type="button"
              disabled={disabled}
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
            disabled={disabled || !undo.length}
            onClick={() => {
              onChange(undo[undo.length - 1]);
              setUndo((v) => v.slice(0, -1));
              onError('');
            }}
          >
            Desfer
          </button>
          <button type="button" disabled={disabled || !bets.length} onClick={() => change([])}>
            Retirar totes
          </button>
        </div>
      </div>
      <div className="tapet-preview">
        <strong>{active ? active.label : 'Tot el tapet, a punt'}</strong>
        <span>
          {active
            ? `${active.numbers.join(' · ')} · Retorn ×${active.multiplier}, inclosa l’aposta`
            : 'Els punts de les línies i cantonades també admeten fitxes.'}
        </span>
      </div>
      <div
        className="tapet-container"
        ref={board}
        role="group"
        aria-label="Tapet de la ruleta"
        onMouseLeave={() => setPreview(null)}
      >
        <div className="tapet-surface">
          <div className="tapet-grid">
            <span
              className={`tapet-cell tapet-zero-cell pocket-green ${active?.numbers.includes(0) ? 'is-covered' : ''} ${result === 0 ? 'is-result' : ''}`}
              data-number="0"
              aria-hidden="true"
            />
            {Array.from({ length: 36 }, (_, i) => {
              const n = i + 1;
              return (
                <span
                  key={n}
                  data-number={n}
                  className={`tapet-cell pocket-${rouletteColor(n)} ${active?.numbers.includes(n) ? 'is-covered' : ''} ${result === n ? 'is-result' : ''}`}
                  style={roulettePositionStyle(BETS_BY_ID[`number:${n}`])}
                  aria-hidden="true"
                />
              );
            })}
            {onTable.map(target)}
          </div>
        </div>
        <div className="tapet-outsides" role="group" aria-label="Apostes exteriors">
          {outside.map(target)}
        </div>
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
                  disabled={disabled}
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
                  disabled={disabled}
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
