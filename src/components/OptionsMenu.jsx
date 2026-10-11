import React, { useEffect, useId, useRef } from 'react';
import { DotsThree } from '@phosphor-icons/react';

// A disclosure with ordinary buttons, so forms and explanations remain accessible.
export default function OptionsMenu({ label = 'Opcions', children }) {
  const root = useRef(null);
  const pointerInside = useRef(false);
  const id = useId();
  function position() {
    if (!root.current?.open) return;
    const anchor = root.current.getBoundingClientRect();
    const content = root.current.querySelector('.section-options-content');
    const main = root.current.closest('main').getBoundingClientRect();
    const visible = window.visualViewport;
    const viewportTop = visible?.offsetTop || 0,
      viewportLeft = visible?.offsetLeft || 0,
      viewportBottom = viewportTop + (visible?.height || window.innerHeight);
    const nav = document.querySelector('.bottom-nav');
    const top =
      Math.max(
        viewportTop,
        document.querySelector('.topbar')?.getBoundingClientRect().bottom || 0,
      ) + 8;
    const bottom =
      (nav && getComputedStyle(nav).display !== 'none'
        ? nav.getBoundingClientRect().top
        : viewportBottom) - 8;
    const above = Math.max(44, anchor.top - top - 8);
    const below = Math.max(44, bottom - anchor.bottom - 8);
    const side = below >= Math.min(content.scrollHeight, 460) || below >= above ? 'bottom' : 'top';
    const width = Math.min(310, main.width - 24, (visible?.width || window.innerWidth) - 24);
    const left = Math.max(
      viewportLeft + 12,
      main.left + 12,
      Math.min(anchor.right - width, main.right - width - 12),
    );
    root.current.dataset.side = side;
    content.style.width = `${width}px`;
    content.style.left = `${left - anchor.left}px`;
    content.style.maxHeight = `${Math.min(460, side === 'top' ? above : below)}px`;
  }
  useEffect(() => {
    const outside = (event) => {
      pointerInside.current = !!root.current?.contains(event.target);
      if (root.current?.open && !pointerInside.current) root.current.open = false;
    };
    const releasePointer = () => {
      pointerInside.current = false;
    };
    document.addEventListener('pointerdown', outside);
    document.addEventListener('pointerup', releasePointer);
    document.addEventListener('pointercancel', releasePointer);
    window.addEventListener('resize', position);
    window.addEventListener('scroll', position, true);
    window.visualViewport?.addEventListener('resize', position);
    window.visualViewport?.addEventListener('scroll', position);
    return () => {
      document.removeEventListener('pointerdown', outside);
      document.removeEventListener('pointerup', releasePointer);
      document.removeEventListener('pointercancel', releasePointer);
      window.removeEventListener('resize', position);
      window.removeEventListener('scroll', position, true);
      window.visualViewport?.removeEventListener('resize', position);
      window.visualViewport?.removeEventListener('scroll', position);
    };
  }, []);
  return (
    <details
      className="section-options"
      ref={root}
      onToggle={position}
      onKeyDown={(event) => {
        pointerInside.current = false;
        if (event.key !== 'Escape') return;
        event.preventDefault();
        event.stopPropagation();
        root.current.open = false;
        root.current.querySelector('summary').focus();
      }}
      onBlur={(event) => {
        // Safari can move focus outside when pressing a menu button. Keep it
        // mounted through that pointer gesture so its click can execute.
        if (pointerInside.current) return;
        if (event.relatedTarget && !event.currentTarget.contains(event.relatedTarget))
          event.currentTarget.open = false;
      }}
    >
      <summary aria-label={label} aria-controls={id}>
        <DotsThree size={22} weight="bold" />
        <span>Opcions</span>
      </summary>
      <div className="section-options-content" id={id} role="region" aria-label={label}>
        {children}
      </div>
    </details>
  );
}
