import React, { useId } from 'react';
import { createPortal } from 'react-dom';
import { BakerRigDefs, BakerPart } from './BakerPuppet';
export function FlyingCake() {
  const uid = `flying-cake-${useId().replaceAll(':', '')}`;
  return (
    <svg width="64" height="64" viewBox="0 0 64 64" aria-hidden="true">
      <BakerRigDefs id={uid} />
      <BakerPart atlas={uid} part="cake" x={0} y={8} width={64} height={48} />
    </svg>
  );
}
export default function CakeFlight({ flight, onArrive }) {
  if (!flight) return null;
  return createPortal(
    <div
      className="cake-flight"
      aria-hidden="true"
      style={{
        left: flight.x,
        top: flight.y,
        '--cake-dx': `${flight.dx}px`,
        '--cake-dy': `${flight.dy}px`,
      }}
      onAnimationEnd={onArrive}
    >
      <FlyingCake />
      <span>+1</span>
    </div>,
    document.body,
  );
}
