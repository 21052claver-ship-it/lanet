import React, { useId, useState, useEffect, useRef } from 'react';
import {
  bakerySequence,
  bakeryFrame,
  BAKERY_PREPARATION_MS,
  BAKERY_COOKING_MS,
  BAKERY_MOTION_MS,
} from '../../shared/bakery-sequence';
import CounterCake, { BakerRigDefs } from './BakerPuppet';

const motionVariables = Object.fromEntries(
  Object.entries(BAKERY_MOTION_MS).map(([name, ms]) => [`--bakery-${name}`, `${ms}ms`]),
);
const labels = {
  warming: 'El forn s’escalfa…',
  baking: 'El pastís s’està coent…',
  resting: 'Ja és cuit. Un moment perquè es refredi…',
  presenting: 'Acabat de fer…',
  offering: 'El teu pastís ja és a punt!',
  claimed: 'Ja has recollit el teu pastís.',
};

function Oven({ uid, frame }) {
  return (
    <g className="baker-oven-art">
      <defs>
        <clipPath id={`${uid}-window`}>
          <path d="M449 513 L448 486 C448 420 530 421 529 488 L529 509 Z" />
        </clipPath>
        <radialGradient id={`${uid}-heat`}>
          <stop stopColor="#ffc36b" />
          <stop offset="1" stopColor="#d76b28" stopOpacity=".1" />
        </radialGradient>
      </defs>
      <g clipPath={`url(#${uid}-window)`} className="oven-window-heat">
        <ellipse cx="488" cy="487" rx="51" ry="49" fill={`url(#${uid}-heat)`} />
        <g className={`oven-food ${frame.ovenFilled ? 'is-visible' : ''}`}>
          <g className="oven-cake-rise">
            <path d="M457 500 Q488 483 519 500 L518 514 Q488 525 458 516 Z" fill="#c88f50" />
            <ellipse cx="488" cy="500" rx="31" ry="13" fill="#e9b975" />
          </g>
        </g>
      </g>
    </g>
  );
}

// A coherent still illustration avoids disjoint limbs and foreground cutouts.
// The pure stage is also rendered offline for frame inspection.
export function BakerStage({
  phase,
  motion = true,
  paused = false,
  action,
  uid = 'bakery',
  stageRef,
  onSecret,
  secretState = 'none',
  rugRef,
  secretDisabled = false,
}) {
  const frame = bakeryFrame(phase);
  const statusId = `baker-status-${uid}`;
  const announcement = phase === 'presenting' ? labels.resting : labels[phase];
  return (
    <div
      ref={stageRef}
      className={`baker-stage phase-${phase} ${frame.cooking ? 'is-cooking' : ''} ${frame.warming ? 'is-warming' : ''} ${frame.cooked ? 'is-cooked' : ''} ${paused ? 'is-paused' : ''} ${motion ? '' : 'motion-off'}`}
      data-phase={phase}
      data-oven={frame.cooking ? 'cooking' : frame.warming ? 'warming' : 'quiet'}
      role="group"
      aria-label="La pastissera i el forn"
      style={{
        ...motionVariables,
        '--preparation-duration': `${BAKERY_PREPARATION_MS}ms`,
        '--cooking-duration': `${BAKERY_COOKING_MS}ms`,
      }}
    >
      <svg
        className="baker-scene-art"
        width="1536"
        height="1024"
        viewBox="0 0 1536 1024"
        aria-hidden="true"
      >
        <BakerRigDefs id={`${uid}-atlas`} />
        <image href="/images/bakery-interior-transparent-v1.webp" width="1536" height="1024" />
        <Oven uid={uid} frame={frame} />
        <CounterCake atlas={`${uid}-atlas`} visible={frame.onCounter} />
      </svg>
      {onSecret && (
        <div className={`secret-trap state-${secretState}`}>
          <span className="secret-hole" aria-hidden="true" />
          <button
            ref={rugRef}
            type="button"
            className="secret-rug"
            aria-label="Aixecar la catifa de la pastisseria"
            title="Aquesta catifa amaga alguna cosa…"
            onClick={onSecret}
            disabled={secretDisabled || secretState !== 'none'}
          >
            <svg viewBox="0 0 200 100" preserveAspectRatio="none" aria-hidden="true">
              <ellipse cx="100" cy="50" rx="97" ry="45" fill="#ad7642" />
              <ellipse cx="100" cy="47" rx="94" ry="43" fill="#d3a56a" />
              {[86, 74, 62, 50, 38, 26, 14].map((r) => (
                <ellipse
                  key={r}
                  cx="100"
                  cy="47"
                  rx={r}
                  ry={r * 0.44}
                  fill="none"
                  stroke="#bb8b53"
                  strokeWidth="2.7"
                  strokeDasharray="3 2"
                />
              ))}
            </svg>
            <span className="secret-rug-spark" aria-hidden="true">
              ✦
            </span>
          </button>
        </div>
      )}
      {['claimed', 'offering'].includes(phase) && action && (
        <div className="baker-interaction">{action(statusId)}</div>
      )}
      <p
        className={`baker-scene-status ${frame.preparing ? 'is-preparing' : ''}`}
        aria-live="off"
        id={statusId}
      >
        {labels[phase]}
      </p>
      <p className="sr-only" role="status" aria-live="polite" aria-atomic="true">
        {announcement}
      </p>
    </div>
  );
}
export default function BakerScene({
  claimed = false,
  onReady,
  action,
  onSecret,
  secretState,
  rugRef,
  secretDisabled,
}) {
  const [phase, setPhase] = useState(claimed ? 'claimed' : 'warming');
  const [motion, setMotion] = useState(
    () => !matchMedia('(prefers-reduced-motion: reduce)').matches,
  );
  const [paused, setPaused] = useState(() => document.hidden);
  const uid = useId().replaceAll(':', '');
  const stage = useRef(null);
  useEffect(() => {
    const media = matchMedia('(prefers-reduced-motion: reduce)');
    const changed = () => setMotion(!media.matches);
    if (media.addEventListener) {
      media.addEventListener('change', changed);
      return () => media.removeEventListener('change', changed);
    }
    media.addListener(changed);
    return () => media.removeListener(changed);
  }, []);
  useEffect(() => {
    const cancel = bakerySequence(
      (next, ready) => {
        setPhase(next);
        onReady?.(ready);
      },
      { claimed, reduced: !motion, paused: document.hidden },
    );
    const suspended = new Set();
    const visibility = () => {
      if (document.hidden) {
        for (const animation of stage.current?.getAnimations?.({ subtree: true }) || []) {
          if (animation.playState === 'running') {
            animation.pause();
            suspended.add(animation);
          }
        }
      } else {
        for (const animation of suspended) if (animation.playState === 'paused') animation.play();
        suspended.clear();
      }
      setPaused(document.hidden);
      if (document.hidden) cancel.pause();
      else cancel.resume();
    };
    document.addEventListener('visibilitychange', visibility);
    return () => {
      document.removeEventListener('visibilitychange', visibility);
      cancel();
    };
  }, [claimed, motion, onReady]);
  return (
    <BakerStage
      phase={phase}
      motion={motion}
      paused={paused}
      action={action}
      uid={uid}
      stageRef={stage}
      onSecret={onSecret}
      secretState={secretState}
      rugRef={rugRef}
      secretDisabled={secretDisabled}
    />
  );
}
