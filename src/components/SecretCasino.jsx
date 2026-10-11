import React, { useEffect, useId, useRef, useState } from 'react';
import { ArrowLeft, Cake, ArrowClockwise, ChartBar, CircleDashed } from '@phosphor-icons/react';
import PredictionRoom from './PredictionRoom';
import RouletteBoard from './RouletteBoard';
import { useApp } from '../context';
import { api } from '../api';
import { Button, FormError } from '../ui';
import { ReferenceArt } from '../art';
import { clientId } from '../../shared/client-id';
import { readLocalJSON, writeLocalJSON, removeLocalValue } from '../../shared/local-state';
import {
  WHEEL,
  MAX_STAKE,
  SPIN_MS,
  rouletteColor,
  wheelRotation,
  betLabel,
  validateBet,
  ticketStake,
  BETS_BY_ID,
  roulettePayout,
} from '../../shared/roulette';
import { useMediaQuery } from '../responsive';
import '../roulette.css';

const colorNames = { red: 'Vermell', black: 'Negre', green: 'Verd' };
function TicketDetails({ spin }) {
  if (!spin?.bets) return null;
  return (
    <details className="roulette-ticket-result">
      <summary>Veure les {spin.bets.length} posicions del gir</summary>
      <div role="list">
        {spin.bets.map((b) => {
          const payout = roulettePayout({ bets: [b] }, spin.result);
          return (
            <p role="listitem" key={b.id} className={payout ? 'ticket-win' : ''}>
              <span>{BETS_BY_ID[b.id].label}</span>
              <small>
                {b.stake} apostats · {payout} de retorn
              </small>
            </p>
          );
        })}
      </div>
    </details>
  );
}
function point(radius, angle) {
  return [
    200 + Math.sin((angle * Math.PI) / 180) * radius,
    200 - Math.cos((angle * Math.PI) / 180) * radius,
  ];
}
export function RouletteWheel({ angle, spinning, result }) {
  const uid = useId().replaceAll(':', '');
  const step = 360 / WHEEL.length;
  return (
    <div
      className={`roulette-device ${spinning ? 'is-spinning' : ''}`}
      role="img"
      aria-label={
        spinning
          ? 'La ruleta està girant'
          : result == null
            ? 'Ruleta europea de 37 números'
            : `Resultat: ${result}, ${colorNames[rouletteColor(result)]}`
      }
      data-result={result ?? ''}
      data-angle={angle}
    >
      <div className="roulette-pointer" aria-hidden="true" />
      <svg
        className="roulette-wheel"
        viewBox="0 0 400 400"
        style={{ transform: `rotate(${angle}deg)` }}
        aria-hidden="true"
      >
        <defs>
          <linearGradient id={`${uid}-rim`} x1="0" y1="0" x2="0.8" y2="1">
            <stop stopColor="#f3d7a0" />
            <stop offset=".45" stopColor="#ba854d" />
            <stop offset="1" stopColor="#674023" />
          </linearGradient>
          <radialGradient id={`${uid}-bowl`}>
            <stop stopColor="#d8aa70" />
            <stop offset=".65" stopColor="#9d693b" />
            <stop offset="1" stopColor="#55351f" />
          </radialGradient>
          <linearGradient id={`${uid}-gold`} x1="0" y1="0" x2="1" y2="1">
            <stop stopColor="#fff0c2" />
            <stop offset=".5" stopColor="#d3a75e" />
            <stop offset="1" stopColor="#9e7032" />
          </linearGradient>
        </defs>
        <circle cx="200" cy="200" r="197" fill={`url(#${uid}-rim)`} />
        <circle cx="200" cy="200" r="188" fill={`url(#${uid}-gold)`} />
        {WHEEL.map((number, index) => {
          const a = point(183, index * step - step / 2),
            b = point(183, index * step + step / 2),
            text = point(168, index * step);
          return (
            <g key={number}>
              <path
                d={`M200 200 L${a.join(' ')} A183 183 0 0 1 ${b.join(' ')} Z`}
                className={`wheel-pocket pocket-${rouletteColor(number)}`}
              />
              <text
                x={text[0]}
                y={text[1]}
                transform={`rotate(${index * step},${text[0]},${text[1]})`}
                textAnchor="middle"
                dominantBaseline="central"
              >
                {number}
              </text>
            </g>
          );
        })}
        <circle cx="200" cy="200" r="130" fill="#b88652" stroke="#ebd197" strokeWidth="5" />
        <circle
          cx="200"
          cy="200"
          r="118"
          fill={`url(#${uid}-bowl)`}
          stroke="#986c40"
          strokeWidth="14"
        />
        <circle cx="200" cy="200" r="87" fill={`url(#${uid}-rim)`} />
        <path
          d="M200 128V272 M128 200H272"
          stroke="#dfbc74"
          strokeWidth="12"
          strokeLinecap="round"
        />
        <circle cx="200" cy="200" r="27" fill="#f1d39c" stroke="#8b5b33" strokeWidth="6" />
        <circle cx="194" cy="192" r="9" fill="#fff1c5" />
      </svg>
      <div className="roulette-ball-orbit" aria-hidden="true">
        <span className="roulette-ball" />
      </div>
    </div>
  );
}
export default function SecretCasino({ onExit }) {
  const [betMode, setBetMode] = useState('board');
  const [chips, setChips] = useState([]);
  const [boardRound, setBoardRound] = useState(0);
  const [table, setTable] = useState('roulette');
  const { data, setData, mutate, refresh } = useApp();
  const storageKey = `lanet.roulette.pending.${data.user.id}`;
  const [pending, setPending] = useState(() => {
    try {
      const value = readLocalJSON(storageKey, null);
      return value ? validateBet(value) : null;
    } catch {
      return null;
    }
  });
  const [stake, setStake] = useState('1'),
    [kind, setKind] = useState('red'),
    [number, setNumber] = useState(0);
  const [busy, setBusy] = useState(false),
    [spinning, setSpinning] = useState(false),
    [result, setResult] = useState(null);
  const [angle, setAngle] = useState(0),
    [history, setHistory] = useState([]),
    [error, setError] = useState(''),
    [loaded, setLoaded] = useState(false);
  const reduced = useMediaQuery('(prefers-reduced-motion: reduce)');
  const mounted = useRef(false),
    locked = useRef(false),
    controller = useRef(null),
    finishTimer = useRef(null),
    heading = useRef(null);
  useEffect(() => {
    mounted.current = true;
    heading.current?.focus({ preventScroll: true });
    heading.current
      ?.closest('.casino-room')
      ?.scrollIntoView({ block: 'start', behavior: reduced ? 'instant' : 'smooth' });
    return () => {
      mounted.current = false;
      controller.current?.abort();
      clearTimeout(finishTimer.current);
    };
  }, []);
  async function load() {
    setError('');
    try {
      const value = await api('/roulette');
      if (!mounted.current) return;
      setHistory(value.spins);
      setLoaded(true);
      setData((current) => ({ ...current, user: { ...current.user, balance: value.balance } }));
    } catch (e) {
      if (mounted.current) setError(e.message);
    }
  }
  useEffect(() => {
    load();
  }, []);
  useEffect(() => {
    const syncPending = (event) => {
      if (event.key !== storageKey || locked.current) return;
      try {
        setPending(event.newValue ? validateBet(JSON.parse(event.newValue)) : null);
      } catch {
        return;
      }
      if (!event.newValue) load();
    };
    window.addEventListener('storage', syncPending);
    return () => window.removeEventListener('storage', syncPending);
  }, [storageKey]);
  const amount = Number(stake);
  const quickValid =
    Number.isInteger(amount) && amount >= 1 && amount <= Math.min(MAX_STAKE, data.user.balance);
  const boardStake = ticketStake({ bets: chips });
  const valid =
    betMode === 'board'
      ? boardStake >= 1 && boardStake <= Math.min(MAX_STAKE, data.user.balance)
      : quickValid;
  const bet =
    betMode === 'board'
      ? { bets: chips }
      : { kind, number: kind === 'number' ? number : null, stake: amount };
  function finish(spin) {
    if (!mounted.current) return;
    setSpinning(false);
    setResult(spin);
    setChips([]);
    setBoardRound((v) => v + 1);
  }
  async function spin(recover = false) {
    if (locked.current || spinning || (!recover && (pending || !valid || !loaded))) return;
    if (!recover) {
      try {
        const existing = readLocalJSON(storageKey, null);
        if (existing) {
          setPending(validateBet(existing));
          return;
        }
      } catch {
        /* A malformed local draft cannot influence server settlement. */
      }
    }
    const payload = recover ? pending : validateBet({ ...bet, request_id: clientId() });
    if (!payload) return;
    if (!writeLocalJSON(storageKey, payload)) {
      setError(
        'Permet l’emmagatzematge local per poder recuperar l’aposta si es talla la connexió.',
      );
      return;
    }
    locked.current = true;
    setPending(payload);
    setBusy(true);
    setError('');
    setResult(null);
    const own = new AbortController();
    controller.current = own;
    const timeout = setTimeout(() => own.abort(), 15000);
    try {
      await mutate(
        '/roulette',
        payload,
        undefined,
        (response) => {
          clearTimeout(timeout);
          removeLocalValue(storageKey);
          if (!mounted.current) return;
          setPending(null);
          setData((current) => ({
            ...current,
            user: { ...current.user, balance: response.balance },
          }));
          setHistory((current) =>
            [
              response.spin,
              ...current.filter((s) => s.request_id !== response.spin.request_id),
            ].slice(0, 20),
          );
          setAngle((current) => wheelRotation(current, response.spin.result));
          if (reduced || recover) finish(response.spin);
          else {
            setSpinning(true);
            finishTimer.current = setTimeout(() => finish(response.spin), SPIN_MS);
          }
        },
        'POST',
        { signal: own.signal },
      );
    } catch (e) {
      if (!mounted.current) return;
      const rejected = [400, 429].includes(e.status) || e.code === 'insufficient_balance';
      if (rejected) {
        removeLocalValue(storageKey);
        setPending(null);
      }
      if (e.code === 'insufficient_balance') refresh().catch(() => {});
      setError(
        rejected
          ? e.message
          : 'No hem pogut confirmar el resultat. Recupera aquesta aposta abans de fer-ne una altra.',
      );
    } finally {
      clearTimeout(timeout);
      controller.current = null;
      locked.current = false;
      if (mounted.current) setBusy(false);
    }
  }
  // Visibility changes should reveal an already settled result without a stale timer.
  useEffect(() => {
    if (reduced && spinning && history[0]) {
      clearTimeout(finishTimer.current);
      finish(history[0]);
    }
  }, [reduced, spinning, history]);
  const disabled = busy || spinning || !!pending;
  return (
    <section className="casino-room" aria-labelledby="casino-heading">
      <header className="casino-header">
        <div>
          <span className="casino-eyebrow">Sota la pastisseria</span>
          <h2 id="casino-heading" ref={heading} tabIndex={-1}>
            La sala secreta
          </h2>
          <p>La pastissera tenia un altre barret.</p>
        </div>
        <Button variant="ghost" onClick={onExit}>
          <ArrowLeft size={18} />
          Tornar al forn
        </Button>
      </header>
      <nav className="casino-tables" aria-label="Taules de la sala secreta">
        <Button
          aria-pressed={table === 'roulette'}
          disabled={disabled}
          onClick={() => setTable('roulette')}
        >
          <CircleDashed size={21} aria-hidden="true" />
          Ruleta
        </Button>
        <Button
          aria-pressed={table === 'predictions'}
          disabled={disabled}
          onClick={() => setTable('predictions')}
        >
          <ChartBar size={21} aria-hidden="true" />
          Prediccions A/B
        </Button>
      </nav>
      {table === 'predictions' ? (
        <PredictionRoom />
      ) : (
        <>
          <div className="casino-stage">
            <div className="casino-arch" aria-hidden="true" />
            <RouletteWheel angle={angle} spinning={spinning} result={result?.result} />
            <div className="casino-host">
              <img
                src="/images/croupier-v1.webp"
                alt="La pastissera, ara amb armilla verda, corbatí i barret de crupier"
                width="512"
                height="768"
              />
            </div>
            <div className="casino-counter" aria-hidden="true" />
          </div>
          <div className="casino-play-panel">
            <div className="casino-balance">
              <ReferenceArt name="cake" size={36} />
              <span>
                <strong>{data.user.balance}</strong> pastissos disponibles
              </span>
              <small>Punts virtuals · sense diners</small>
            </div>
            {!loaded && !pending && (
              <p role="status">
                {error ? 'No s’ha pogut carregar la sala.' : 'Obrint el teu moneder…'}
              </p>
            )}
            {!loaded && error && <Button onClick={load}>Tornar a carregar</Button>}
            {pending && (
              <div className="casino-pending" role="status">
                <strong>Aposta pendent de confirmar</strong>
                <p>
                  {pending.bets ? ticketStake(pending) : pending.stake} pastissos ·{' '}
                  {betLabel(pending)}. Recuperar-la no crea cap aposta nova.
                </p>
                <Button variant="primary" busy={busy} onClick={() => spin(true)}>
                  <ArrowClockwise size={18} />
                  Recuperar aposta
                </Button>
              </div>
            )}
            <form
              onSubmit={(event) => {
                event.preventDefault();
                spin();
              }}
            >
              <fieldset disabled={disabled || !loaded} className="casino-bet-controls">
                <legend>Tria la teva aposta</legend>
                <div className="roulette-play-modes" role="group" aria-label="Manera d’apostar">
                  <button
                    type="button"
                    aria-pressed={betMode === 'board'}
                    onClick={() => setBetMode('board')}
                  >
                    Repartir fitxes
                  </button>
                  <button
                    type="button"
                    aria-pressed={betMode === 'quick'}
                    disabled={chips.length > 0}
                    title={chips.length ? 'Retira primer les fitxes del tapet.' : undefined}
                    onClick={() => setBetMode('quick')}
                  >
                    Aposta ràpida
                  </button>
                </div>
                {betMode === 'board' ? (
                  <RouletteBoard
                    resetToken={boardRound}
                    bets={chips}
                    onChange={setChips}
                    balance={data.user.balance}
                    disabled={disabled}
                    onError={setError}
                  />
                ) : (
                  <>
                    <div className="roulette-choices" role="radiogroup" aria-label="Tipus d’aposta">
                      {[
                        ['red', 'Vermell', '×2'],
                        ['black', 'Negre', '×2'],
                        ['number', 'Número', '×36'],
                      ].map(([value, label, pay]) => (
                        <button
                          key={value}
                          type="button"
                          role="radio"
                          aria-checked={kind === value}
                          tabIndex={kind === value ? 0 : -1}
                          className={`bet-choice bet-${value} ${kind === value ? 'selected' : ''}`}
                          onClick={() => setKind(value)}
                          onKeyDown={(event) => {
                            const choices = ['red', 'black', 'number'];
                            const index = choices.indexOf(value);
                            const next =
                              event.key === 'Home'
                                ? 0
                                : event.key === 'End'
                                  ? 2
                                  : ['ArrowRight', 'ArrowDown'].includes(event.key)
                                    ? (index + 1) % 3
                                    : ['ArrowLeft', 'ArrowUp'].includes(event.key)
                                      ? (index + 2) % 3
                                      : null;
                            if (next === null) return;
                            event.preventDefault();
                            setKind(choices[next]);
                            event.currentTarget.parentElement
                              .querySelectorAll('[role="radio"]')
                              [next].focus();
                          }}
                        >
                          <span className="bet-dot" />
                          {label}
                          <small>{pay}</small>
                        </button>
                      ))}
                    </div>
                    {kind === 'number' && (
                      <div
                        className="roulette-numbers"
                        role="group"
                        aria-label="Tria un número del 0 al 36"
                      >
                        {Array.from({ length: 37 }, (_, n) => (
                          <button
                            key={n}
                            type="button"
                            aria-label={`Apostar al número ${n}`}
                            aria-pressed={number === n}
                            tabIndex={number === n ? 0 : -1}
                            className={`number-bet pocket-${rouletteColor(n)} ${number === n ? 'selected' : ''}`}
                            onClick={() => setNumber(n)}
                            onKeyDown={(event) => {
                              const columns = matchMedia('(max-width: 600px)').matches ? 6 : 13;
                              const next =
                                event.key === 'Home'
                                  ? 0
                                  : event.key === 'End'
                                    ? 36
                                    : event.key === 'ArrowRight'
                                      ? (n + 1) % 37
                                      : event.key === 'ArrowLeft'
                                        ? (n + 36) % 37
                                        : event.key === 'ArrowDown'
                                          ? (n + columns) % 37
                                          : event.key === 'ArrowUp'
                                            ? (n + 37 - columns) % 37
                                            : null;
                              if (next === null) return;
                              event.preventDefault();
                              setNumber(next);
                              event.currentTarget.parentElement
                                .querySelectorAll('button')
                                [next].focus();
                            }}
                          >
                            {n}
                          </button>
                        ))}
                      </div>
                    )}
                    <div className="roulette-stake-row">
                      <label htmlFor="roulette-stake">Pastissos a apostar</label>
                      <div className="roulette-stepper">
                        <button
                          type="button"
                          aria-label="Treure un pastís de l’aposta"
                          disabled={amount <= 1}
                          onClick={() => setStake(String(Math.max(1, amount - 1)))}
                        >
                          −
                        </button>
                        <input
                          id="roulette-stake"
                          type="number"
                          inputMode="numeric"
                          min="1"
                          max={Math.min(MAX_STAKE, data.user.balance)}
                          step="1"
                          value={stake}
                          onChange={(event) => setStake(event.target.value)}
                          required
                        />
                        <button
                          type="button"
                          aria-label="Afegir un pastís a l’aposta"
                          disabled={amount >= Math.min(MAX_STAKE, data.user.balance)}
                          onClick={() =>
                            setStake(String(Math.min(MAX_STAKE, data.user.balance, amount + 1)))
                          }
                        >
                          +
                        </button>
                      </div>
                    </div>
                    <p className="roulette-bet-summary">
                      {quickValid ? (
                        <>
                          {amount} {amount === 1 ? 'pastís' : 'pastissos'} a{' '}
                          <strong>{betLabel({ kind, number })}</strong> · Retorn si encertes:{' '}
                          <strong>{amount * (kind === 'number' ? 36 : 2)}</strong>
                        </>
                      ) : data.user.balance < 1 ? (
                        'No tens pastissos disponibles. Pots tornar al forn.'
                      ) : (
                        `Tria entre 1 i ${Math.min(MAX_STAKE, data.user.balance)} pastissos sencers.`
                      )}
                    </p>
                  </>
                )}
                <Button
                  type="submit"
                  variant="primary roulette-spin"
                  disabled={!valid || disabled || !loaded}
                  busy={busy}
                >
                  <Cake size={20} />
                  {busy
                    ? 'Confirmant aposta…'
                    : spinning
                      ? 'La ruleta està girant…'
                      : 'Fer girar la ruleta'}
                </Button>
              </fieldset>
            </form>
            <FormError error={error} />
            <div
              className={`roulette-result ${result ? 'has-result' : ''}`}
              role="status"
              aria-live="polite"
              aria-atomic="true"
            >
              {spinning ? (
                <p>La bola està buscant el seu número…</p>
              ) : result ? (
                <>
                  <span className={`result-pocket pocket-${rouletteColor(result.result)}`}>
                    {result.result}
                  </span>
                  <div>
                    <strong>
                      Ha sortit el {result.result} · {colorNames[rouletteColor(result.result)]}
                    </strong>
                    <p>
                      {result.payout
                        ? `Retorn: ${result.payout} · Balanç de l’aposta: ${result.net > 0 ? '+' : ''}${result.net}`
                        : `Retorn: 0 · Balanç de l’aposta: −${result.stake}`}{' '}
                      pastissos
                    </p>
                  </div>
                </>
              ) : (
                <p>Reparteix les fitxes i fes girar quan ho tinguis preparat.</p>
              )}
            </div>
            {result && !spinning && <TicketDetails spin={result} />}
            <details className="roulette-rules">
              <summary>Com funciona la ruleta?</summary>
              <p>
                37 números, del 0 al 36, tots amb la mateixa probabilitat. El zero és verd: vermell
                i negre perden si surt zero.
              </p>
              <p>
                Número ×36; cavall (2 números) ×18; fila o trio (3) ×12; cantonada o primers quatre
                (4) ×9; dues files (6) ×6; columna o dotzena (12) ×3; vermell/negre, parell/senar i
                1–18/19–36 (18) ×2. El zero perd a totes les apostes exteriors. Els retorns inclouen
                l’aposta. Es sumen els retorns de totes les posicions guanyadores. Mínim 1 per
                posició, màxim {MAX_STAKE} per gir i dins del teu saldo.
              </p>
              <p>
                El resultat es decideix al servidor abans de l’animació. Els pastissos són punts
                gratuïts de La Net; no es compren ni es canvien per diners.
              </p>
            </details>
            <details className="roulette-history">
              <summary>
                Els teus últims girs <span>{history.length}</span>
              </summary>
              {history.length ? (
                <ol>
                  {history.map((s) => (
                    <li key={s.request_id}>
                      <span className={`history-pocket pocket-${rouletteColor(s.result)}`}>
                        {s.result}
                      </span>
                      <div>
                        <strong>{betLabel(s)}</strong>
                        <small>
                          {s.stake} apostats · {s.payout} de retorn
                        </small>
                        <TicketDetails spin={s} />
                      </div>
                      <b>
                        {s.net > 0 ? '+' : ''}
                        {s.net}
                      </b>
                    </li>
                  ))}
                </ol>
              ) : (
                <p>Encara no has fet cap aposta.</p>
              )}
              <Button
                variant="ghost"
                onClick={() => {
                  load();
                  refresh().catch(() => {});
                }}
              >
                Actualitzar moviments
              </Button>
            </details>
          </div>
        </>
      )}
    </section>
  );
}
