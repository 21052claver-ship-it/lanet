import React, { useLayoutEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { FlyingCake } from './CakeFlight';

export default function RouletteAward({ spin }) {
  const [destination, setDestination] = useState({ x: 0, y: -200 });
  useLayoutEffect(() => {
    const measure = () => {
      const header = document.querySelector('.cake-balance')?.getBoundingClientRect();
      const local = document.querySelector('.casino-balance')?.getBoundingClientRect();
      const box = header && header.bottom > 0 && header.top < innerHeight ? header : local;
      setDestination({
        x: box ? box.left + box.width / 2 - innerWidth / 2 : 0,
        y: box ? box.top + box.height / 2 - innerHeight / 2 : -innerHeight / 3,
      });
    };
    measure();
    window.addEventListener('resize', measure);
    window.addEventListener('scroll', measure, { passive: true });
    return () => {
      window.removeEventListener('resize', measure);
      window.removeEventListener('scroll', measure);
    };
  }, []);
  const profit = spin.net > 0;
  return createPortal(
    <div className={`roulette-award ${profit ? 'is-profit' : 'is-return'}`} aria-hidden="true">
      <div className="roulette-award-halo" />
      {profit &&
        Array.from({ length: 16 }, (_, i) => (
          <i
            className="roulette-spark"
            key={i}
            style={{ '--ray': `${i * 22.5}deg`, '--delay': `${(i % 4) * 45}ms` }}
          />
        ))}
      <div className="roulette-award-card">
        <FlyingCake />
        <small>{profit ? 'Has guanyat!' : 'Retorn de l’aposta'}</small>
        <strong>+{spin.payout}</strong>
        <span>pastissos al teu saldo</span>
        <p>{profit ? `Guany net: +${spin.net}` : `Balanç de l’aposta: ${spin.net}`}</p>
      </div>
      {Array.from({ length: profit ? 7 : 3 }, (_, i) => (
        <div
          className="roulette-prize-flight"
          key={i}
          style={{
            '--dx': `${destination.x}px`,
            '--dy': `${destination.y}px`,
            '--spread': `${(i - 3) * 18}px`,
            '--delay': `${900 + i * 65}ms`,
          }}
        >
          <FlyingCake />
        </div>
      ))}
    </div>,
    document.body,
  );
}
