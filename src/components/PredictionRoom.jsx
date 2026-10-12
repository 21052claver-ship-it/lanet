import React, { useEffect, useRef, useState } from 'react';
import {
  ArrowLeft,
  ArrowClockwise,
  ChartBar,
  Clock,
  Plus,
  Scales,
  UserCircle,
  CheckCircle,
  Cake,
} from '@phosphor-icons/react';
import { useApp } from '../context';
import { api } from '../api';
import { Button, Field, FormError, Modal, Tabs } from '../ui';
import { clientId } from '../../shared/client-id';
import { readLocalJSON, writeLocalJSON, removeLocalValue } from '../../shared/local-state';
import {
  predictionStatus,
  validatePrediction,
  validatePredictionBet,
  validatePredictionAction,
  PREDICTION_MAX_POOL,
} from '../../shared/predictions';
import '../predictions.css';

const statuses = {
  pending: 'Pendent d’acceptació',
  open: 'Apostes obertes',
  closed: 'Esperant resultat',
  resolved: 'Resolta',
  cancelled: 'Anul·lada · retorn',
};
const dates = (seconds) =>
  new Intl.DateTimeFormat('ca-ES', { dateStyle: 'medium', timeStyle: 'short' }).format(
    new Date(seconds * 1000),
  );
function localDate(date) {
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}
function pendingValue(key) {
  const saved = readLocalJSON(key, null);
  if (!saved || typeof saved.path !== 'string') return null;
  try {
    if (saved.path === '/predictions') validatePrediction(saved.body, null);
    else if (/^\/predictions\/[0-9a-f-]{36}\/bets$/.test(saved.path))
      validatePredictionBet(saved.body);
    else if (/^\/predictions\/[0-9a-f-]{36}\/actions$/.test(saved.path))
      validatePredictionAction(saved.body);
    else return null;
    return saved;
  } catch {
    return null;
  }
}
function Pool({ market }) {
  const total = market.total_a + market.total_b;
  const a = total ? Math.round((100 * market.total_a) / total) : 50;
  return (
    <div className="prediction-pool">
      <div className="prediction-pool-labels">
        <span>
          <b>A</b> {market.option_a}
        </span>
        <span>
          <b>B</b> {market.option_b}
        </span>
      </div>
      <div className="prediction-pool-bar" aria-hidden="true">
        <i style={{ width: `${a}%` }} />
      </div>
      <div className="prediction-pool-numbers">
        <span>
          {market.total_a} pastissos{total > 0 && ` · ${a}%`}
        </span>
        <span>
          {market.total_b} pastissos{total > 0 && ` · ${100 - a}%`}
        </span>
      </div>
    </div>
  );
}
function Choices({ market, value, onChange, locked = null, disabled = false }) {
  function move(e, side) {
    if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'].includes(e.key)) return;
    e.preventDefault();
    const next =
      locked || (e.key === 'Home' ? 'A' : e.key === 'End' ? 'B' : side === 'A' ? 'B' : 'A');
    onChange(next);
    e.currentTarget.parentElement.querySelector(`[data-side="${next}"]`)?.focus();
  }
  return (
    <div className="prediction-choices" role="radiogroup" aria-label="Opció de la predicció">
      {['A', 'B'].map((side) => (
        <button
          key={side}
          type="button"
          role="radio"
          data-side={side}
          aria-checked={value === side}
          tabIndex={value === side ? 0 : -1}
          disabled={disabled || (!!locked && side !== locked)}
          className={`prediction-choice side-${side} ${value === side ? 'selected' : ''}`}
          onClick={() => onChange(side)}
          onKeyDown={(e) => move(e, side)}
        >
          <b>{side}</b>
          <span>{market[side === 'A' ? 'option_a' : 'option_b']}</span>
          {value === side && <CheckCircle size={22} weight="fill" aria-hidden="true" />}
        </button>
      ))}
    </div>
  );
}
function CreatePrediction({ busy, onSubmit, error, onClose }) {
  const [draft, setDraft] = useState({
    title: '',
    option_a: 'Sí',
    option_b: 'No',
    rules: '',
    closes: localDate(new Date(Date.now() + 86400000)),
    resolver_id: '',
  });
  const [query, setQuery] = useState(''),
    [people, setPeople] = useState([]),
    [person, setPerson] = useState(null),
    [searching, setSearching] = useState(false),
    [searchError, setSearchError] = useState(''),
    [validation, setValidation] = useState('');
  useEffect(() => {
    setPeople([]);
    setSearchError('');
    if (query.trim().length < 2) {
      setSearching(false);
      return;
    }
    const own = new AbortController();
    setSearching(true);
    const timeout = setTimeout(() => {
      own.abort();
      setSearching(false);
      setSearchError('La cerca ha trigat massa. Torna-ho a provar.');
    }, 20000);
    const timer = setTimeout(
      () =>
        api('/predictions/people?q=' + encodeURIComponent(query.trim()), { signal: own.signal })
          .then((value) => {
            clearTimeout(timeout);
            setPeople(value.people);
            setSearching(false);
          })
          .catch((e) => {
            clearTimeout(timeout);
            if (!own.signal.aborted) {
              setSearching(false);
              setSearchError(e.message);
            }
          }),
      250,
    );
    return () => {
      clearTimeout(timer);
      clearTimeout(timeout);
      own.abort();
    };
  }, [query]);
  const patch = (key, value) => setDraft((current) => ({ ...current, [key]: value }));
  return (
    <Modal
      open
      onClose={() => !busy && onClose()}
      title="Crear aposta"
      description="Dues opcions, unes regles clares i algú que en confirmi el resultat."
    >
      <form
        className="prediction-form"
        onSubmit={(e) => {
          e.preventDefault();
          try {
            const { closes, ...fields } = draft;
            const payload = validatePrediction({
              ...fields,
              request_id: clientId(),
              closes_at: Math.floor(new Date(closes).getTime() / 1000),
            });
            setValidation('');
            onSubmit(payload);
          } catch (e) {
            setValidation(e.message);
          }
        }}
      >
        <fieldset disabled={busy}>
          <Field label="Pregunta">
            <input
              required
              minLength={8}
              maxLength={140}
              value={draft.title}
              onChange={(e) => patch('title', e.target.value)}
              placeholder="Qui guanyarà el concurs de la classe?"
            />
          </Field>
          <div className="prediction-form-pair">
            <Field label="Opció A">
              <input
                required
                maxLength={60}
                value={draft.option_a}
                onChange={(e) => patch('option_a', e.target.value)}
              />
            </Field>
            <Field label="Opció B">
              <input
                required
                maxLength={60}
                value={draft.option_b}
                onChange={(e) => patch('option_b', e.target.value)}
              />
            </Field>
          </div>
          <Field
            label="Tancament de les apostes"
            hint="Hora local del teu dispositiu. Entre 5 minuts i 180 dies."
          >
            <input
              type="datetime-local"
              required
              value={draft.closes}
              onChange={(e) => patch('closes', e.target.value)}
            />
          </Field>
          <Field
            label="Criteris del resultat"
            hint="Indica la font, què compta com A o B i quan s’ha d’anul·lar, per exemple en cas d’empat."
          >
            <textarea
              required
              minLength={20}
              maxLength={1200}
              rows={4}
              value={draft.rules}
              onChange={(e) => patch('rules', e.target.value)}
              placeholder="El marcador oficial del concurs determinarà el resultat. En cas d’empat, es retornaran els pastissos."
            />
          </Field>
          <Field
            label="Responsable del resultat"
            hint="Cerca una altra persona de La Net. Haurà d’acceptar i no podrà apostar."
          >
            <input
              type="search"
              maxLength={80}
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setPerson(null);
                patch('resolver_id', '');
              }}
              placeholder="Cerca pel nom…"
              autoComplete="off"
            />
          </Field>
          {searching && <p role="status">Cercant persones…</p>}
          <FormError error={searchError} />
          {!searching && query.trim().length >= 2 && !people.length && !searchError && (
            <p className="prediction-hint">
              Cap coincidència. La persona ha d’haver entrat amb Google a La Net.
            </p>
          )}
          {!!people.length && (
            <div className="prediction-people" role="group" aria-label="Tria el responsable">
              {people.map((p) => (
                <button
                  type="button"
                  key={p.id}
                  aria-pressed={person?.id === p.id}
                  onClick={() => {
                    setPerson(p);
                    patch('resolver_id', p.id);
                  }}
                >
                  <UserCircle size={24} aria-hidden="true" />
                  <span>{p.name}</span>
                  {person?.id === p.id && (
                    <CheckCircle weight="fill" size={20} aria-hidden="true" />
                  )}
                </button>
              ))}
            </div>
          )}
          {person && (
            <p className="prediction-hint">
              <b>{person.name}</b> rebrà l’encàrrec a «Per resoldre».
            </p>
          )}
        </fieldset>
        <p className="prediction-form-note">
          Les regles, el responsable i el termini quedaran fixats. Si el responsable no accepta
          abans del tancament, la proposta caduca.
        </p>
        <FormError error={validation || error} />
        <div className="form-footer">
          <Button type="button" variant="ghost" disabled={busy} onClick={onClose}>
            Cancel·lar
          </Button>
          <Button type="submit" variant="primary" busy={busy} disabled={!person}>
            Enviar proposta
          </Button>
        </div>
      </form>
    </Modal>
  );
}
function ResolvePrediction({ market, kind, busy, error, onClose, onSubmit }) {
  const [choice, setChoice] = useState('A'),
    [reason, setReason] = useState(''),
    [confirmed, setConfirmed] = useState(false);
  const resolving = kind === 'resolve';
  return (
    <Modal
      open
      onClose={() => !busy && onClose()}
      title={
        resolving
          ? 'Confirmar el resultat'
          : kind === 'reject'
            ? 'Rebutjar l’encàrrec'
            : 'Anul·lar la predicció'
      }
      description={market.title}
    >
      <form
        className="prediction-form"
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit({ request_id: clientId(), kind, choice: resolving ? choice : null, reason });
        }}
      >
        <fieldset disabled={busy}>
          {resolving && <Choices market={market} value={choice} onChange={setChoice} />}
          <Field
            label={resolving ? 'Justificació i font del resultat' : 'Motiu de l’anul·lació'}
            hint="La justificació serà visible a la taula."
          >
            <textarea
              required
              minLength={10}
              maxLength={1000}
              rows={4}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={
                resolving
                  ? 'Segons el resultat oficial…'
                  : 'No es pot determinar un resultat perquè…'
              }
            />
          </Field>
          <div className="prediction-confirm-summary">
            {resolving ? (
              <>
                <b>
                  Guanya {choice}: {market[choice === 'A' ? 'option_a' : 'option_b']}
                </b>
                <p>
                  {market.total_a + market.total_b} pastissos al pot · {market.participants}{' '}
                  participants.{' '}
                  {market[choice === 'A' ? 'total_a' : 'total_b'] === 0
                    ? 'No hi ha apostes guanyadores: es retorna tot.'
                    : 'Es repartirà tot el pot proporcionalment entre els guanyadors.'}
                </p>
              </>
            ) : (
              <p>
                Es retornaran íntegrament els {market.total_a + market.total_b} pastissos apostats.
              </p>
            )}
          </div>
          <label className="prediction-confirm">
            <input
              type="checkbox"
              required
              checked={confirmed}
              onChange={(e) => setConfirmed(e.target.checked)}
            />
            <span>
              {resolving
                ? 'He comprovat les regles i el resultat. Entenc que serà definitiu.'
                : 'Confirmo l’anul·lació i el retorn de tots els pastissos.'}
            </span>
          </label>
        </fieldset>
        <FormError error={error} />
        <div className="form-footer">
          <Button type="button" variant="ghost" disabled={busy} onClick={onClose}>
            Tornar
          </Button>
          <Button
            type="submit"
            variant="primary"
            busy={busy}
            disabled={!confirmed || reason.trim().length < 10}
          >
            {resolving ? 'Confirmar i repartir' : 'Anul·lar i retornar'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
function BetForm({ market, balance, busy, now, submit }) {
  const [choice, setChoice] = useState(market.own_choice || 'A'),
    [stake, setStake] = useState('1');
  useEffect(() => {
    if (market.own_choice) setChoice(market.own_choice);
  }, [market.own_choice]);
  const amount = Number(stake),
    pool = market.total_a + market.total_b,
    side = choice === 'A' ? market.total_a : market.total_b;
  const valid =
    Number.isInteger(amount) &&
    amount >= 1 &&
    amount <= Math.min(1000, balance, PREDICTION_MAX_POOL - pool);
  const estimate = valid
    ? Math.floor(((pool + amount) * (market.own_stake + amount)) / (side + amount))
    : 0;
  return (
    <form
      className="prediction-bet-form"
      onSubmit={(e) => {
        e.preventDefault();
        if (valid) submit({ request_id: clientId(), choice, stake: amount });
      }}
    >
      <fieldset disabled={busy || now >= market.closes_at}>
        <legend>La teva aposta</legend>
        <Choices market={market} value={choice} onChange={setChoice} locked={market.own_choice} />
        {market.own_stake > 0 && (
          <p className="prediction-hint">
            Ja tens{' '}
            <b>
              {market.own_stake} pastissos a {market.own_choice}
            </b>
            . Només pots afegir-ne a aquesta opció.
          </p>
        )}
        <div className="prediction-stake">
          <Field label="Pastissos a afegir">
            <input
              type="number"
              inputMode="numeric"
              min={1}
              max={Math.min(1000, balance, PREDICTION_MAX_POOL - pool)}
              step={1}
              required
              value={stake}
              onChange={(e) => setStake(e.target.value)}
            />
          </Field>
          <div>
            {[1, 5, 10].map((n) => (
              <button
                type="button"
                key={n}
                disabled={balance < n || pool + n > PREDICTION_MAX_POOL}
                onClick={() => setStake(String(n))}
              >
                {n}
                <Cake size={16} aria-hidden="true" />
              </button>
            ))}
          </div>
        </div>
        <p className="prediction-estimate">
          {valid ? (
            <>
              Si guanya {choice}, retorn estimat de tota la teva posició:{' '}
              <b>≈ {estimate} pastissos</b>.
            </>
          ) : balance < 1 ? (
            'No tens pastissos disponibles. Pots recollir-ne al forn.'
          ) : (
            'Tria una quantitat vàlida entre 1 i 1.000, dins del teu saldo.'
          )}
          <small>
            El retorn inclou els pastissos apostats i pot variar fins al tancament. Els pastissos
            queden al pot fins al resultat o l’anul·lació.
          </small>
        </p>
        <Button type="submit" variant="primary" busy={busy} disabled={!valid}>
          Apostar {valid ? amount : '—'} a {choice}
        </Button>
      </fieldset>
    </form>
  );
}
export default function PredictionRoom() {
  const { data, setData, mutate, notify } = useApp();
  const storageKey = `lanet.predictions.pending.${data.user.id}`;
  const [pending, setPending] = useState(() => pendingValue(storageKey)),
    [busy, setBusy] = useState(false),
    [loading, setLoading] = useState(true),
    [error, setError] = useState('');
  const [filter, setFilter] = useState('open'),
    [markets, setMarkets] = useState([]),
    [cursor, setCursor] = useState(null),
    [selected, setSelected] = useState(null),
    [market, setMarket] = useState(null),
    [create, setCreate] = useState(false),
    [action, setAction] = useState(null),
    [offset, setOffset] = useState(0),
    [clock, setClock] = useState(Date.now());
  const mounted = useRef(true),
    locked = useRef(false),
    sequence = useRef(0),
    fetchController = useRef(null),
    writeController = useRef(null),
    heading = useRef(null);
  const now = Math.floor((clock + offset) / 1000);
  const sync = (value) => {
    setOffset(value.server_now * 1000 - Date.now());
    setClock(Date.now());
    setData((current) => ({ ...current, user: { ...current.user, balance: value.balance } }));
  };
  async function load(id = selected, before = null, quiet = false) {
    if (locked.current) return;
    const seq = ++sequence.current;
    fetchController.current?.abort();
    const own = new AbortController();
    fetchController.current = own;
    const timeout = setTimeout(() => {
      if (mounted.current && seq === sequence.current)
        setError('La taula ha trigat massa a respondre. Prem Actualitzar.');
      own.abort();
    }, 12000);
    if (!quiet) setLoading(true);
    try {
      const value = await api(
        id
          ? '/predictions/' + id
          : `/predictions?filter=${filter}${before ? '&before=' + encodeURIComponent(before) : ''}`,
        { signal: own.signal },
      );
      if (!mounted.current || seq !== sequence.current) return;
      sync(value);
      if (id) setMarket(value.market);
      else {
        setMarkets((current) =>
          before
            ? [...current, ...value.markets.filter((m) => !current.some((c) => c.id === m.id))]
            : value.markets,
        );
        setCursor(value.next_cursor);
      }
    } catch (e) {
      if (mounted.current && seq === sequence.current && !own.signal.aborted) setError(e.message);
    } finally {
      clearTimeout(timeout);
      if (mounted.current && seq === sequence.current) setLoading(false);
    }
  }
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      sequence.current++;
      fetchController.current?.abort();
      writeController.current?.abort();
    };
  }, []);
  useEffect(() => {
    setError('');
    load();
    heading.current?.focus({ preventScroll: true });
  }, [selected, filter]);
  useEffect(() => {
    const tick = setInterval(() => setClock(Date.now()), 1000);
    return () => clearInterval(tick);
  }, []);
  useEffect(() => {
    const update = () => {
      if (document.visibilityState === 'visible') load(selected, null, true);
    };
    const timer = setInterval(update, 15000);
    window.addEventListener('focus', update);
    return () => {
      clearInterval(timer);
      window.removeEventListener('focus', update);
    };
  }, [selected, filter]);
  useEffect(() => {
    const update = (e) => {
      if (e.key === storageKey) setPending(pendingValue(storageKey));
    };
    window.addEventListener('storage', update);
    return () => window.removeEventListener('storage', update);
  }, [storageKey]);
  async function send(command, recover = false) {
    if (locked.current) return;
    const existing = pendingValue(storageKey);
    if (!recover && existing) {
      setPending(existing);
      setError('Recupera l’acció pendent abans de continuar.');
      return;
    }
    if (!writeLocalJSON(storageKey, command)) {
      setError('Permet l’emmagatzematge local per recuperar l’acció si es talla la connexió.');
      return;
    }
    locked.current = true;
    sequence.current++;
    fetchController.current?.abort();
    setBusy(true);
    setPending(command);
    setError('');
    const own = new AbortController();
    writeController.current = own;
    const timer = setTimeout(() => own.abort(), 15000);
    let committedMarketId = null;
    try {
      await mutate(
        command.path,
        command.body,
        undefined,
        (value) => {
          if (pendingValue(storageKey)?.body.request_id === command.body.request_id)
            removeLocalValue(storageKey);
          if (!mounted.current) return;
          committedMarketId = value.market.id;
          sync(value);
          setPending(null);
          setMarket(value.market);
          setSelected(value.market.id);
          setCreate(false);
          setAction(null);
          setLoading(false);
          notify('La taula s’ha actualitzat.');
          requestAnimationFrame(() => {
            if (mounted.current) heading.current?.focus({ preventScroll: true });
          });
        },
        'POST',
        { signal: own.signal },
      );
    } catch (e) {
      if (!mounted.current) return;
      const rejected = [400, 403, 404, 409, 429].includes(e.status);
      if (rejected) {
        removeLocalValue(storageKey);
        setPending(null);
        setError(e.message);
      } else {
        setCreate(false);
        setAction(null);
        setError(
          'No hem pogut confirmar l’acció. Recupera-la: es repetirà la mateixa referència sense cobrar dues vegades.',
        );
      }
    } finally {
      clearTimeout(timer);
      writeController.current = null;
      locked.current = false;
      if (mounted.current) {
        setBusy(false);
        // Changing selection already triggers its own load effect.
        if (!committedMarketId || committedMarketId === selected) load(selected, null, true);
      }
    }
  }
  const disabled = busy || !!pending;
  const openMarket = (m) => {
    setMarket(null);
    setSelected(m.id);
  };
  const status = market ? predictionStatus(market, now) : null;
  return (
    <div className="prediction-room">
      <div className="prediction-heading">
        <div>
          <span className="prediction-eyebrow">La segona taula</span>
          <h3 ref={heading} tabIndex={-1}>
            {selected ? 'La predicció' : 'Prediccions'}
          </h3>
          <p>Tria A o B. El resultat decideix com es reparteix el pot.</p>
        </div>
        <Button
          variant="primary"
          onClick={() => {
            setError('');
            setCreate(true);
          }}
          disabled={disabled}
        >
          <Plus size={18} />
          Crear aposta
        </Button>
      </div>
      <div className="prediction-wallet">
        <Cake size={20} aria-hidden="true" />
        <b>{data.user.balance}</b>
        <span>pastissos disponibles</span>
        <small>Virtuals · sense diners</small>
      </div>
      {pending && (
        <div className="prediction-recovery" role="status">
          <strong>Acció pendent de confirmar</strong>
          <p>
            {pending.path.endsWith('/bets')
              ? `${pending.body.stake} pastissos a ${pending.body.choice}. `
              : ''}
            Recuperar-la no crea una acció nova.
          </p>
          <Button variant="primary" busy={busy} onClick={() => send(pending, true)}>
            <ArrowClockwise size={18} />
            Recuperar acció
          </Button>
        </div>
      )}
      <FormError error={error} />
      {selected ? (
        <>
          <Button
            variant="ghost"
            className="prediction-back"
            onClick={() => {
              setSelected(null);
              setMarket(null);
            }}
          >
            <ArrowLeft size={17} />
            Totes les prediccions
          </Button>
          {market && (
            <article className="prediction-detail">
              <span className={`prediction-status status-${status}`}>{statuses[status]}</span>
              <h4>{market.title}</h4>
              <Pool market={market} />
              <div className="prediction-facts">
                <span>
                  <Clock size={17} aria-hidden="true" />
                  Tanca:{' '}
                  <time dateTime={new Date(market.closes_at * 1000).toISOString()}>
                    {dates(market.closes_at)}
                  </time>
                </span>
                <span>
                  <UserCircle size={17} aria-hidden="true" />
                  Creada per {market.creator}
                </span>
                <span>
                  <Scales size={17} aria-hidden="true" />
                  Resol {market.resolver}
                </span>
                <span>
                  <Cake size={17} aria-hidden="true" />
                  {market.total_a + market.total_b} al pot · {market.participants} participants
                </span>
              </div>
              <div className="prediction-rules">
                <strong>Criteris del resultat</strong>
                <p>{market.rules}</p>
              </div>
              {status === 'pending' && (
                <div className="prediction-notice">
                  <Scales size={25} aria-hidden="true" />
                  <div>
                    <b>Esperant l’acceptació de {market.resolver}</b>
                    <p>Encara no es poden apostar pastissos.</p>
                    {market.can_accept && (
                      <div className="prediction-actions">
                        <Button
                          variant="primary"
                          disabled={disabled}
                          onClick={() =>
                            send({
                              path: `/predictions/${market.id}/actions`,
                              body: {
                                request_id: clientId(),
                                kind: 'accept',
                                choice: null,
                                reason: '',
                              },
                            })
                          }
                        >
                          Acceptar encàrrec
                        </Button>
                        <Button
                          variant="ghost"
                          disabled={disabled}
                          onClick={() => setAction('reject')}
                        >
                          Rebutjar
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              )}
              {status === 'open' && market.resolver_id === data.user.id && (
                <p className="prediction-notice">
                  Ets el responsable: podràs confirmar el resultat després del tancament. No pots
                  apostar en aquesta taula.
                </p>
              )}
              {status === 'open' && market.resolver_id !== data.user.id && (
                <BetForm
                  key={market.id}
                  market={market}
                  balance={data.user.balance}
                  busy={disabled}
                  now={now}
                  submit={(body) => send({ path: `/predictions/${market.id}/bets`, body })}
                />
              )}
              {status === 'closed' && (
                <div className="prediction-notice">
                  <Clock size={25} aria-hidden="true" />
                  <div>
                    <b>Apostes tancades</b>
                    <p>
                      {market.resolver} té fins al {dates(market.resolve_by)} per confirmar el
                      resultat. Si no ho fa, es retornarà tot.
                    </p>
                    {market.resolver_id === data.user.id && now < market.resolve_by && (
                      <Button
                        variant="primary"
                        disabled={disabled}
                        onClick={() => setAction('resolve')}
                      >
                        Confirmar resultat A/B
                      </Button>
                    )}
                  </div>
                </div>
              )}
              {['resolved', 'cancelled'].includes(status) && (
                <div className="prediction-outcome">
                  <CheckCircle size={28} weight="fill" aria-hidden="true" />
                  <div>
                    <strong>
                      {status === 'resolved'
                        ? `Guanya ${market.result}: ${market[market.result === 'A' ? 'option_a' : 'option_b']}`
                        : 'Predicció anul·lada'}
                    </strong>
                    <p>{market.reason}</p>
                    {status === 'resolved' &&
                      market[market.result === 'A' ? 'total_a' : 'total_b'] === 0 && (
                        <p>
                          Cap participant havia triat l’opció guanyadora. S’ha retornat tot el pot.
                        </p>
                      )}
                    {market.own_stake > 0 && (
                      <p className="prediction-own-result">
                        La teva posició: {market.own_stake} a {market.own_choice} ·{' '}
                        <b>{market.own_payout} pastissos retornats</b> · balanç{' '}
                        {market.own_payout - market.own_stake > 0 ? '+' : ''}
                        {market.own_payout - market.own_stake}
                      </p>
                    )}
                  </div>
                </div>
              )}
              {status === 'closed' && market.own_stake > 0 && (
                <p className="prediction-hint">
                  La teva posició: {market.own_stake} pastissos a {market.own_choice}.
                </p>
              )}
              {market.can_cancel && ['pending', 'open', 'closed'].includes(status) && (
                <Button
                  variant="ghost"
                  className="prediction-cancel"
                  disabled={disabled}
                  onClick={() => setAction('cancel')}
                >
                  Anul·lar i retornar pastissos
                </Button>
              )}
              {!!market.history.length && (
                <details className="prediction-history">
                  <summary>Historial de la taula</summary>
                  <ol>
                    {market.history.map((h, index) => (
                      <li key={index}>
                        <b>
                          {h.kind === 'accept'
                            ? 'Encàrrec acceptat'
                            : h.kind === 'resolve'
                              ? `Resultat ${h.choice}`
                              : 'Taula anul·lada'}
                        </b>
                        <span>
                          {h.actor} · {dates(h.created_at)}
                        </span>
                        {h.reason && <p>{h.reason}</p>}
                      </li>
                    ))}
                  </ol>
                </details>
              )}
            </article>
          )}
        </>
      ) : (
        <>
          <Tabs
            label="Filtrar prediccions"
            className="prediction-tabs"
            value={filter}
            onChange={setFilter}
            items={[
              ['open', 'Taules', ChartBar],
              ['mine', 'Les meves', UserCircle],
              ['resolve', 'Per resoldre', Scales],
              ['finished', 'Finalitzades', CheckCircle],
            ]}
          />
          {!!markets.length && (
            <div className="prediction-grid">
              {markets.map((m) => {
                const s = predictionStatus(m, now);
                return (
                  <button
                    type="button"
                    className="prediction-card"
                    key={m.id}
                    onClick={() => openMarket(m)}
                  >
                    <span className={`prediction-status status-${s}`}>{statuses[s]}</span>
                    <h4>{m.title}</h4>
                    <Pool market={m} />
                    <span className="prediction-card-meta">
                      <span>
                        {m.participants} participants · {m.total_a + m.total_b} pastissos
                      </span>
                      <span>
                        {s === 'resolved'
                          ? `Guanya ${m.result}`
                          : s === 'cancelled'
                            ? 'Pastissos retornats'
                            : dates(m.closes_at)}
                      </span>
                    </span>
                    {m.own_stake > 0 && (
                      <span className="prediction-card-own">
                        Tu: {m.own_stake} a {m.own_choice}
                      </span>
                    )}
                    <span className="prediction-card-footer">
                      <span>Resol {m.resolver}</span>
                      <b>Veure taula →</b>
                    </span>
                  </button>
                );
              })}
            </div>
          )}
          {!loading && !markets.length && (
            <div className="prediction-empty">
              <ChartBar size={38} weight="duotone" aria-hidden="true" />
              <h4>
                {filter === 'resolve'
                  ? 'Cap encàrrec pendent'
                  : filter === 'mine'
                    ? 'Encara no tens prediccions'
                    : filter === 'finished'
                      ? 'Encara no hi ha resultats'
                      : 'La taula està preparada'}
              </h4>
              <p>
                {filter === 'resolve'
                  ? 'Quan et designin responsable, trobaràs aquí la proposta per acceptar-la.'
                  : 'Crea una pregunta amb dues opcions i convida algú a confirmar el resultat.'}
              </p>
              {filter === 'open' && (
                <Button variant="primary" disabled={disabled} onClick={() => setCreate(true)}>
                  Crear la primera aposta
                </Button>
              )}
            </div>
          )}
          {cursor && (
            <Button variant="ghost" busy={loading} onClick={() => load(null, cursor)}>
              Carregar més
            </Button>
          )}
        </>
      )}
      {loading && (
        <p className="prediction-loading" role="status">
          Actualitzant la taula…
        </p>
      )}
      <div className="prediction-bottom">
        <p>Percentatges = pastissos del pot, no probabilitats. Sense comissions.</p>
        <Button variant="ghost" busy={loading} disabled={busy} onClick={() => load()}>
          <ArrowClockwise size={16} />
          Actualitzar
        </Button>
      </div>
      <details className="prediction-help">
        <summary>Com funciona el repartiment?</summary>
        <p>
          Els guanyadors es reparteixen tot el pot proporcionalment als pastissos que han apostat.
          Els pastissos enters sobrants van a les restes més grans; en cas d’empat, s’utilitza
          l’identificador estable del participant. Si ningú ha apostat a l’opció guanyadora, es
          retorna tot.
        </p>
        <p>
          Les regles i els terminis no es poden editar. Només el responsable acceptat confirma A/B,
          després del tancament, amb una justificació pública. Pot anul·lar si no hi ha un resultat
          verificable. L’autor pot cancel·lar mentre no hi hagi apostes; l’administració pot
          anul·lar per incidències.
        </p>
        <p>
          Sense resolució al cap de 7 dies, el servidor retorna els pastissos quan se sincronitza
          l’aplicació. Màxim 10 prediccions actives i 5 creacions per hora per persona.
        </p>
      </details>
      {create && (
        <CreatePrediction
          busy={busy}
          error={error}
          onClose={() => setCreate(false)}
          onSubmit={(body) => send({ path: '/predictions', body })}
        />
      )}
      {action && market && (
        <ResolvePrediction
          key={`${market.id}-${action}`}
          market={market}
          kind={action}
          busy={busy}
          error={error}
          onClose={() => setAction(null)}
          onSubmit={(body) => send({ path: `/predictions/${market.id}/actions`, body })}
        />
      )}
    </div>
  );
}
