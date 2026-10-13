import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Cake, ArrowRight, ArrowLeft, Heart, BookOpen, Check } from '@phosphor-icons/react';
import { useApp } from '../context';
import { PageTitle, Button, Tabs, FormError } from '../ui';
import { dateLabel } from '../../shared/domain';
import { ReferenceArt } from '../art';
import BakerScene from '../components/BakerScene';
import CakeFlight from '../components/CakeFlight';
import { BAKERY_MOTION_MS } from '../../shared/bakery-sequence';
import SecretCasino from '../components/SecretCasino';
import { bakeryRemainingSeconds, bakeryCountdown } from '../../shared/bakery-reward';
export default function Bakery() {
  const { data, mutate, open, notify, setData } = useApp();
  const [inside, setInside] = useState(false),
    [entering, setEntering] = useState(false),
    [tab, setTab] = useState('bakery'),
    [collecting, setCollecting] = useState(false),
    [collected, setCollected] = useState(false),
    [error, setError] = useState('');
  const mounted = useRef(false);
  const [cakeReady, setCakeReady] = useState(false);
  const [secret, setSecret] = useState('none');
  const secretTimer = useRef(null),
    secretGeneration = useRef(0),
    rug = useRef(null),
    wasSecret = useRef(false);
  const [flight, setFlight] = useState(null);
  const claimPending = useRef(false);
  const collectionFinished = useRef(true);
  const enterTimeout = useRef(null);
  const bakeTimeout = useRef(null);
  const entryButton = useRef(null);
  const claimButton = useRef(null);
  const insideHeading = useRef(null);
  const wasInside = useRef(false);
  const wasEntering = useRef(false);
  const sceneGeneration = useRef(0);
  const reward = data.bakeryReward;
  const testMode = reward?.mode === 'test';
  const timeAnchor = useMemo(() => performance.now(), [reward?.serverNow, reward?.nextClaimAt]);
  const [, clockTick] = useState(0);
  useEffect(() => {
    if (!testMode) return;
    const timer = setInterval(() => clockTick((n) => n + 1), 1000);
    return () => clearInterval(timer);
  }, [testMode]);
  const remaining = bakeryRemainingSeconds(reward, performance.now() - timeAnchor);
  const available = testMode ? remaining === 0 : !data.dailyClaimed;
  useEffect(() => {
    if (testMode && available && !collecting) setCollected(false);
  }, [testMode, available, collecting]);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      sceneGeneration.current++;
      clearTimeout(enterTimeout.current);
      clearTimeout(bakeTimeout.current);
      clearTimeout(secretTimer.current);
      secretGeneration.current++;
    };
  }, []);
  useEffect(() => {
    if (secret === 'none' && wasSecret.current) rug.current?.focus({ preventScroll: true });
    wasSecret.current = secret !== 'none';
  }, [secret]);
  function closeSecret() {
    secretGeneration.current++;
    clearTimeout(secretTimer.current);
    setSecret('none');
    setCakeReady(false);
  }
  async function openSecret() {
    if (secret !== 'none' || collecting) return;
    const generation = ++secretGeneration.current;
    setSecret('opening');
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const image = new Image();
    image.src = '/images/croupier-v1.webp';
    const start = performance.now();
    try {
      await image.decode();
    } catch {
      if (mounted.current && generation === secretGeneration.current) {
        closeSecret();
        notify('No s’ha pogut obrir la sala. Torna-ho a provar.', 'error');
      }
      return;
    }
    if (!mounted.current || generation !== secretGeneration.current) return;
    secretTimer.current = setTimeout(
      () => {
        if (!mounted.current || generation !== secretGeneration.current) return;
        if (reduced) {
          setSecret('room');
          return;
        }
        setSecret('descending');
        secretTimer.current = setTimeout(() => {
          if (mounted.current && generation === secretGeneration.current) setSecret('room');
        }, 1800);
      },
      reduced ? 0 : Math.max(0, 1100 - (performance.now() - start)),
    );
  }
  useEffect(() => {
    if (inside) {
      insideHeading.current?.focus({ preventScroll: true });
      insideHeading.current?.closest('.bakery-scene')?.scrollIntoView({
        block: 'start',
        behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches
          ? 'instant'
          : 'smooth',
      });
    } else if (!entering && (wasInside.current || wasEntering.current))
      entryButton.current?.focus({ preventScroll: true });
    wasInside.current = inside;
    wasEntering.current = entering;
  }, [inside, entering]);
  function cancelScene() {
    closeSecret();
    sceneGeneration.current++;
    clearTimeout(enterTimeout.current);
    clearTimeout(bakeTimeout.current);
    setInside(false);
    setEntering(false);
    collectionFinished.current = true;
    setCollecting(false);
    setCollected(false);
    setCakeReady(false);
    setFlight(null);
  }
  function changeTab(next) {
    if (next !== 'bakery') cancelScene();
    setTab(next);
  }
  async function enter() {
    if (entering) return;
    const generation = ++sceneGeneration.current;
    setCollected(false);
    setEntering(true);
    const start = performance.now();
    try {
      await Promise.all(
        ['/images/bakery-interior-transparent-v1.webp', '/images/baker-rig-v4.png'].map((src) => {
          const image = new Image();
          image.src = src;
          return image.decode();
        }),
      );
    } catch {
      if (mounted.current && generation === sceneGeneration.current) {
        setEntering(false);
        notify('No s’ha pogut obrir el forn. Torna-ho a provar.', 'error');
      }
      return;
    }
    if (!mounted.current || generation !== sceneGeneration.current) return;
    enterTimeout.current = setTimeout(
      () => {
        if (!mounted.current || generation !== sceneGeneration.current) return;
        setInside(true);
        setEntering(false);
      },
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
        ? 0
        : Math.max(0, BAKERY_MOTION_MS.entry - (performance.now() - start)),
    );
  }
  async function claim() {
    if (claimPending.current || collecting || collected || !cakeReady || !available) return;
    claimPending.current = true;
    collectionFinished.current = false;
    setCollecting(true);
    setCollected(false);
    setError('');
    const generation = sceneGeneration.current;
    try {
      const result = await mutate('/bakery/claim', {}, undefined, (confirmed) => {
        setData((current) => ({
          ...current,
          user: { ...current.user, balance: confirmed.balance },
          bakeryReward: confirmed.bakeryReward,
          dailyClaimed: !confirmed.bakeryReward.available,
        }));
      });
      if (!mounted.current || generation !== sceneGeneration.current) return;
      setCollected(true);
      if (!result.claimed) {
        notify(
          testMode ? 'El següent pastís encara s’està preparant.' : 'El pastís d’avui ja el tens.',
        );
        collectionFinished.current = true;
        setCollecting(false);
        insideHeading.current?.focus({ preventScroll: true });
        return;
      }
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        finishFlight();
        return;
      }
      const origin = document.querySelector('.baker-cake-origin')?.getBoundingClientRect();
      const balance = document.querySelector('.cake-balance')?.getBoundingClientRect();
      if (!origin || !balance) {
        finishFlight();
        return;
      }
      const x = origin.left + origin.width / 2,
        y = origin.top + origin.height / 2;
      setFlight({
        x,
        y,
        dx: balance.left + balance.width / 2 - x,
        dy: balance.top + balance.height / 2 - y,
      });
      bakeTimeout.current = setTimeout(() => {
        if (mounted.current && generation === sceneGeneration.current) finishFlight();
      }, 2100);
    } catch (error) {
      if (mounted.current && generation === sceneGeneration.current) {
        setError(error.message);
        collectionFinished.current = true;
        setCollecting(false);
      }
    } finally {
      claimPending.current = false;
    }
  }
  function finishFlight() {
    if (collectionFinished.current) return;
    collectionFinished.current = true;
    clearTimeout(bakeTimeout.current);
    setFlight(null);
    setCollecting(false);
    insideHeading.current?.focus({ preventScroll: true });
    window.dispatchEvent(new Event('lanet:cake-arrived'));
    notify('Un pastís acabat de fer. Ja és al teu saldo!');
  }
  return (
    <>
      {secret !== 'room' && (
        <PageTitle
          title="Pastisseria"
          subtitle={
            testMode
              ? 'Mode de prova · Un pastís cada minut.'
              : 'Un pastís acabat de fer, cada dia.'
          }
        />
      )}
      {tab !== 'bakery' && (
        <Tabs
          items={[
            ['bakery', 'La pastisseria'],
            ['wallet', 'Moviments'],
            ['earn', 'Com funciona'],
          ]}
          value={tab}
          onChange={changeTab}
        />
      )}
      {tab === 'bakery' && secret === 'room' ? (
        <SecretCasino onExit={closeSecret} />
      ) : tab === 'bakery' ? (
        <div className="bakery-layout">
          <section
            className={`bakery-scene panel ${inside ? 'inside' : ''} ${entering ? 'entering' : ''} ${collecting ? 'collecting' : ''}`}
            style={{ '--bakery-entry': `${BAKERY_MOTION_MS.entry}ms` }}
            aria-busy={entering || collecting}
          >
            {inside && (
              <div className="scene-caption">
                <h2 ref={insideHeading} tabIndex={-1}>
                  El forn de La Net
                </h2>
                <Button variant="ghost" onClick={cancelScene} aria-label="Sortir de la pastisseria">
                  <ArrowLeft size={18} /> Sortir
                </Button>
              </div>
            )}
            <>
              <div className="bakery-picture-wrap">
                {inside ? (
                  <BakerScene
                    claimed={!available || collected}
                    onReady={setCakeReady}
                    onSecret={openSecret}
                    secretState={secret}
                    rugRef={rug}
                    secretDisabled={collecting}
                    action={(statusId) =>
                      !available || collected ? (
                        <span className="baker-claimed">
                          <Check size={17} />{' '}
                          {testMode && remaining > 0
                            ? `Nou pastís en ${bakeryCountdown(remaining)}`
                            : 'Pastís recollit'}
                        </span>
                      ) : (
                        <Button
                          variant="primary"
                          ref={claimButton}
                          busy={collecting}
                          disabled={!cakeReady || collecting}
                          onClick={claim}
                          aria-describedby={statusId}
                        >
                          <Cake size={19} />
                          <span>{collecting ? 'Agafant el pastís…' : 'Agafa el pastís'}</span>
                        </Button>
                      )
                    }
                  />
                ) : (
                  <div className="bakery-exterior-stage">
                    <img
                      className="bakery-picture bakery-exterior-full"
                      src="/images/bakery-exterior-transparent-v1.png"
                      alt="La pastisseria de La Net completa, amb teulada rosa, porta verda i camí de pedres"
                      width="1536"
                      height="1024"
                      decoding="async"
                    />
                    {entering && (
                      <div className="bakery-steam" aria-hidden="true">
                        <span />
                        <span />
                        <span />
                      </div>
                    )}
                    <button
                      className="door-hotspot"
                      aria-label="Entrar per la porta de la pastisseria"
                      disabled={entering}
                      onClick={enter}
                    >
                      <span>
                        Entrar
                        <ArrowRight size={16} />
                      </span>
                    </button>
                  </div>
                )}
              </div>
              {!inside && (
                <div className="scene-actions">
                  <Button variant="primary" ref={entryButton} busy={entering} onClick={enter}>
                    {entering ? 'Obrint la porta…' : 'Entrar a la pastisseria'}
                    <ArrowRight size={18} />
                  </Button>
                  {entering && (
                    <Button variant="ghost" onClick={cancelScene}>
                      Cancel·lar entrada
                    </Button>
                  )}
                </div>
              )}
              {inside && <FormError error={error} />}
              {inside && ['opening', 'descending'].includes(secret) && (
                <div className={`secret-transition transition-${secret}`} aria-live="polite">
                  {secret === 'descending' && (
                    <div className="secret-tunnel" aria-hidden="true">
                      {[0, 1, 2, 3, 4, 5].map((i) => (
                        <i key={i} style={{ '--ring': i }} />
                      ))}
                      <span className="tunnel-light" />
                    </div>
                  )}
                  <div className="tunnel-caption">
                    <strong>
                      {secret === 'opening'
                        ? 'La catifa amagava una trapa…'
                        : 'Baixant a la sala secreta…'}
                    </strong>
                    <Button variant="ghost" onClick={closeSecret}>
                      Tornar al forn
                    </Button>
                  </div>
                </div>
              )}
            </>
          </section>
          <aside className="bakery-aside">
            <section className="panel bakery-wallet">
              <h2>Els teus pastissos</h2>
              <div className="wallet-amount">
                <ReferenceArt name="cake-large" size={64} />
                <strong>{data.user.balance}</strong>
              </div>
              <p className="daily-status-line">
                {!available || collected
                  ? testMode
                    ? `El següent, en ${bakeryCountdown(remaining)}`
                    : 'Pastís d’avui recollit'
                  : 'Tens un pastís disponible'}
                <small>
                  {testMode
                    ? 'Un pastís cada 60 segons · Mode de prova'
                    : 'Es renova a les 00:00 · Barcelona'}
                </small>
              </p>
              <Button variant="ghost" onClick={() => changeTab('wallet')}>
                Veure moviments <ArrowRight size={17} />
              </Button>
              <Button variant="ghost" onClick={() => changeTab('earn')}>
                Com guanyar-ne <ArrowRight size={17} />
              </Button>
            </section>
            <details className="wallet-preview quiet-disclosure">
              <summary>Últims moviments</summary>
              {data.wallet.slice(0, 2).map((w) => (
                <div className="wallet-preview-item" key={w.id}>
                  <ReferenceArt name="cake" size={35} />
                  <span>
                    <strong className={w.amount > 0 ? 'positive' : 'negative'}>
                      {w.amount > 0 ? '+' : ''}
                      {w.amount}
                    </strong>{' '}
                    {w.reason}
                    <small>{dateLabel(w.day, { day: 'numeric', month: 'long' })}</small>
                  </span>
                </div>
              ))}
              {!data.wallet.length && <p className="muted">Recull el teu primer pastís al forn.</p>}
            </details>
          </aside>
        </div>
      ) : tab === 'wallet' ? (
        <div className="panel wallet-table">
          <div className="section-heading">
            <h2>El teu moneder</h2>
            <span>{data.user.balance} pastissos disponibles</span>
          </div>
          <table>
            <thead>
              <tr>
                <th>Moviment</th>
                <th>Data</th>
                <th>Pastissos</th>
              </tr>
            </thead>
            <tbody>
              {data.wallet.map((w) => (
                <tr key={w.id}>
                  <td>{w.reason}</td>
                  <td>{dateLabel(w.day, { day: 'numeric', month: 'short', year: 'numeric' })}</td>
                  <td className={w.amount > 0 ? 'positive' : 'negative'}>
                    {w.amount > 0 ? '+' : ''}
                    {w.amount}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!data.wallet.length && (
            <p className="empty">El primer moviment apareixerà quan recullis el teu pastís.</p>
          )}
        </div>
      ) : (
        <div className="panel economy-info">
          <h2>Pastissos que circulen dins de La Net</h2>
          <p>
            Són punts de la comunitat. Donar un like sempre és gratuït. Les recompenses es guanyen
            ajudant altres estudiants.
          </p>
          <div className="economy-rules">
            <div>
              <Cake size={26} />
              <h3>{testMode ? 'Un cada minut' : 'Un cada dia'}</h3>
              <p>
                {testMode
                  ? 'Durant les proves, pots recollir un pastís cada 60 segons des de l’última recollida.'
                  : 'Recull el pastís que et prepara la pastissera. Un cop al dia per compte.'}
              </p>
            </div>
            <div>
              <Heart size={26} />
              <h3>Gràcies per compartir</h3>
              <p>
                Un like d’una altra persona et dona un pastís. Treure’l i tornar-lo a posar no
                genera una altra recompensa.
              </p>
            </div>
            <div>
              <BookOpen size={26} />
              <h3>Apunts que ajuden</h3>
              <p>
                Cada cinc lectors diferents, un pastís. Recarregar o passar fotos no torna a
                comptar. Fins a 30 recompenses per contribucions al dia.
              </p>
            </div>
          </div>
          <h3>On els pots fer servir?</h3>
          <p>
            Per desbloquejar apunts amb preu opcional o publicar un missatge al cartell de la
            comunitat. En una compra d’apunts, els pastissos passen íntegrament a l’autor.
          </p>
          <Button onClick={() => open('banner')}>
            Crear el teu missatge
            <ArrowRight size={18} />
          </Button>
          <p className="muted small">
            Aquesta versió funciona amb pastissos gratuïts. Les recàrregues amb diners queden
            reservades per a una fase posterior.
          </p>
        </div>
      )}
      <CakeFlight flight={flight} onArrive={finishFlight} />
    </>
  );
}
