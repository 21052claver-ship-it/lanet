import React, { useEffect, useId, useRef, useState } from 'react';
import { COMPACT_LAYOUT_QUERY } from './responsive';
import * as Dialog from '@radix-ui/react-dialog';
import {
  X,
  Plus,
  Heart,
  BookmarkSimple,
  CalendarDots,
  Notebook,
  PlusCircle,
  ChartLine,
  Timer,
  UsersThree,
  Cake,
  MathOperations,
  Flask,
  Atom,
  Translate,
  BookOpen,
  GlobeHemisphereWest,
  Brain,
  Leaf,
  ArrowRight,
  SpinnerGap,
  GraduationCap,
} from '@phosphor-icons/react';
export const NAV = [
  ['schedule', 'Horari i agenda', CalendarDots],
  ['notes', 'Continguts', Notebook],
  ['pluses', 'Plusos', PlusCircle],
  ['grades', 'Notes', ChartLine],
  ['pau', 'PAU i universitat', GraduationCap],
  ['study', 'Estudi', Timer],
  ['community', 'Comunitat', UsersThree],
  ['bakery', 'Pastisseria', Cake],
];
export function SubjectIcon({ id, size = 19, ...props }) {
  const Icon =
    {
      math: MathOperations,
      smath: MathOperations,
      phy: Atom,
      chem: Flask,
      bio: Leaf,
      cat: BookOpen,
      cast: BookOpen,
      eng: Translate,
      hist: GlobeHemisphereWest,
      phil: Brain,
    }[id] || BookOpen;
  return <Icon size={size} {...props} />;
}
export function SubjectMark({ subject, id }) {
  return (
    <span className="subject-mark" style={{ '--subject-color': subject?.color }} aria-hidden="true">
      <SubjectIcon id={subject?.id || id} size={21} weight="duotone" />
    </span>
  );
}
export function Button({
  children,
  variant = '',
  busy = false,
  disabled = false,
  className = '',
  ...props
}) {
  return (
    <button className={`button ${variant} ${className}`} {...props} disabled={busy || disabled}>
      {busy && <SpinnerGap className="spin" size={18} />} {children}
    </button>
  );
}
export function IconButton({ label, children, ...props }) {
  return (
    <button className="icon-button" aria-label={label} title={label} {...props}>
      {children}
    </button>
  );
}
export function PageTitle({ title, subtitle, badge, children }) {
  return (
    <header className="page-title">
      <div>
        <div className="page-heading">
          <h1>{title}</h1>
          {badge}
        </div>
        {subtitle && <p>{subtitle}</p>}
      </div>
      <div className="title-actions">{children}</div>
    </header>
  );
}
export function Empty({ title = 'Encara no hi ha contingut', body, children }) {
  return (
    <div className="empty">
      <BookOpen size={28} />
      <h3>{title}</h3>
      {body && <p>{body}</p>}
      {children}
    </div>
  );
}
export function SubjectChip({ subject, label }) {
  return subject ? (
    <span className="subject-chip" style={{ background: subject.color }}>
      <SubjectIcon id={subject.id} size={15} />
      {label || subject.short}
    </span>
  ) : null;
}
export function Field({ label, hint, children }) {
  const id = useId();
  return (
    <label className="field">
      <span id={id}>{label}</span>
      {React.isValidElement(children)
        ? React.cloneElement(children, {
            'aria-labelledby': children.props['aria-labelledby'] || id,
          })
        : children}
      {hint && <small>{hint}</small>}
    </label>
  );
}
export function Tabs({ items, value, onChange, label = 'Vista', className = '' }) {
  function move(event, index) {
    const next =
      event.key === 'Home'
        ? 0
        : event.key === 'End'
          ? items.length - 1
          : event.key === 'ArrowRight'
            ? (index + 1) % items.length
            : event.key === 'ArrowLeft'
              ? (index - 1 + items.length) % items.length
              : null;
    if (next === null) return;
    event.preventDefault();
    onChange(items[next][0]);
    event.currentTarget.parentElement.querySelectorAll('[role="tab"]')[next]?.focus();
  }
  return (
    <div className={`tabs view-tabs ${className}`} role="tablist" aria-label={label}>
      {items.map(([id, name, Icon], index) => (
        <button
          key={id}
          type="button"
          role="tab"
          aria-selected={value === id}
          tabIndex={value === id || (!items.some(([key]) => key === value) && index === 0) ? 0 : -1}
          className={value === id ? 'active' : ''}
          onClick={() => onChange(id)}
          onKeyDown={(event) => move(event, index)}
        >
          {Icon && <Icon size={18} weight={value === id ? 'fill' : 'regular'} aria-hidden="true" />}
          {name}
        </button>
      ))}
    </div>
  );
}
function usePendingAction(action) {
  const pending = useRef(false);
  const [busy, setBusy] = useState(false);
  async function run() {
    if (pending.current) return;
    pending.current = true;
    setBusy(true);
    try {
      await action();
    } catch {
      // The mutation already reports the error. Release the action for retry.
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }
  return [busy, run];
}
export function LikeButton({ item, onClick }) {
  const [busy, react] = usePendingAction(onClick);
  return (
    <button
      className={`like-button ${item.liked ? 'liked' : ''}`}
      aria-pressed={!!item.liked}
      aria-busy={busy}
      disabled={busy}
      onClick={react}
    >
      <Heart size={19} weight={item.liked ? 'fill' : 'regular'} />
      {item.liked ? 'T’agrada' : 'M’agrada'}
      <span>· {item.likes}</span>
    </button>
  );
}
export function SaveButton({ item, onClick }) {
  const [busy, save] = usePendingAction(onClick);
  return (
    <IconButton
      label={item.saved ? 'Treure dels desats' : 'Desar'}
      aria-pressed={!!item.saved}
      aria-busy={busy}
      disabled={busy}
      onClick={save}
    >
      <BookmarkSimple size={21} weight={item.saved ? 'fill' : 'regular'} />
    </IconButton>
  );
}
export function Modal({ open, onClose, title, description, children, wide = false }) {
  const returnFocus = useRef(document.activeElement);
  const [viewport, setViewport] = useState(null);
  useEffect(() => {
    const visible = window.visualViewport;
    if (!visible || !open) return;
    let frame;
    const update = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() =>
        setViewport({ height: visible.height, top: visible.offsetTop }),
      );
    };
    update();
    visible.addEventListener('resize', update);
    visible.addEventListener('scroll', update);
    return () => {
      cancelAnimationFrame(frame);
      visible.removeEventListener('resize', update);
      visible.removeEventListener('scroll', update);
    };
  }, [open]);
  return (
    <Dialog.Root open={!!open} onOpenChange={(v) => !v && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="dialog-overlay" />
        <Dialog.Content
          className={`dialog ${wide ? 'wide' : ''}`}
          style={
            viewport
              ? {
                  '--dialog-viewport-height': `${viewport.height}px`,
                  '--dialog-viewport-top': `${viewport.top}px`,
                }
              : undefined
          }
          onEscapeKeyDown={(event) => {
            if (document.querySelector('.select-menu[data-open="true"]')) event.preventDefault();
          }}
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            let target = returnFocus.current;
            if (target instanceof HTMLElement) {
              const closedDisclosure = target.closest('details:not([open])');
              if (closedDisclosure) target = closedDisclosure.querySelector('summary');
            }
            if (
              !(target instanceof HTMLElement) ||
              !target.isConnected ||
              target.closest('[inert]') ||
              !target.getClientRects().length
            ) {
              target = document.querySelector(
                matchMedia(COMPACT_LAYOUT_QUERY).matches
                  ? '.bottom-nav button:last-child'
                  : '.profile-button',
              );
            }
            target?.focus({ preventScroll: true });
          }}
        >
          <div className="dialog-heading">
            <Dialog.Title>{title}</Dialog.Title>
            <Dialog.Close asChild>
              <IconButton label="Tancar">
                <X size={21} />
              </IconButton>
            </Dialog.Close>
          </div>
          <Dialog.Description className={description ? 'dialog-description' : 'sr-only'}>
            {description || 'Formulari i detalls de La Net.'}
          </Dialog.Description>
          {children}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
export function RichText({ text }) {
  return (
    <div className="rich-text">
      {(text || '').split('\n').map((line, i) =>
        line.startsWith('# ') ? (
          <h3 key={i}>{line.slice(2)}</h3>
        ) : line.startsWith('## ') ? (
          <h4 key={i}>{line.slice(3)}</h4>
        ) : line.startsWith('• ') || line.startsWith('- ') ? (
          <p className="text-bullet" key={i}>
            {line.replace(/^[•-] /, '• ')}
          </p>
        ) : line ? (
          <p key={i}>{line}</p>
        ) : (
          <div className="text-space" key={i} />
        ),
      )}
    </div>
  );
}
export function FormError({ error }) {
  return error ? (
    <p className="form-error" role="alert">
      {error}
    </p>
  ) : null;
}
export function FormFooter({ onCancel, busy, disabled = false, label = 'Desar', children }) {
  return (
    <div className="form-footer">
      {children}
      <Button type="button" variant="ghost" onClick={onCancel}>
        Cancel·lar
      </Button>
      <Button type="submit" variant="primary" busy={busy} disabled={disabled}>
        {label}
      </Button>
    </div>
  );
}
