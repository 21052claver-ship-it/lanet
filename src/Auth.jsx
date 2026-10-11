import React, { useEffect, useId, useRef, useState } from 'react';
import {
  ArrowRight,
  BookOpen,
  CalendarDots,
  ShieldCheck,
  SpinnerGap,
  Timer,
} from '@phosphor-icons/react';
import { FormError } from './ui';
import { Brand } from './art';
import GoogleSignIn from './components/GoogleSignIn';

export function WelcomeFrame({ school = '', children }) {
  return (
    <div className="welcome-page">
      <a className="welcome-skip" href="#welcome-access">
        Anar a l’accés
      </a>
      <header className="welcome-header">
        <Brand className="welcome-brand" href="#welcome-main" />
        <span className="welcome-school" title={school || undefined}>
          <span aria-hidden="true" />
          {school && school !== 'La Net' ? school : 'El teu espai d’estudi'}
        </span>
      </header>
      <main className="welcome-main" id="welcome-main">
        <section className="welcome-intro" aria-labelledby="welcome-title">
          <p className="welcome-eyebrow">Feta pels estudiants</p>
          <h1 id="welcome-title">
            El teu dia a dia,
            <br />
            <span>una mica més fàcil.</span>
          </h1>
          <p className="welcome-description">
            L’horari, els apunts i el temps d’estudi.
            <br />
            Tot connectat, al teu ritme.
          </p>
          <div className="welcome-illustration" aria-hidden="true">
            <picture>
              <source
                media="(max-width: 900px)"
                srcSet="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7"
              />
              <img
                src="/images/welcome-study-v1.webp"
                alt=""
                width="1536"
                height="1024"
                fetchPriority="high"
              />
            </picture>
          </div>
          <ul className="welcome-features" aria-label="El teu espai a La Net">
            <li>
              <CalendarDots size={18} />
              Horari i agenda
            </li>
            <li>
              <BookOpen size={18} />
              Apunts compartits
            </li>
            <li>
              <Timer size={18} />
              Temps per estudiar
            </li>
          </ul>
        </section>
        {children}
      </main>
      <footer className="welcome-footer">El teu centre. La teva comunitat.</footer>
    </div>
  );
}

export function AuthPanel({
  status,
  busy = false,
  onGoogleBusyChange,
  feedbackRef,
  idPrefix = 'welcome',
  notice,
  onDismissNotice,
}) {
  return (
    <section
      className="welcome-access"
      id="welcome-access"
      aria-labelledby={idPrefix + '-heading'}
      tabIndex={-1}
    >
      <div className="welcome-card welcome-google-only" aria-busy={busy}>
        <header className="welcome-card-heading">
          <h2 id={idPrefix + '-heading'}>Entra a La Net</h2>
          <p>El teu espai, amb el compte del centre.</p>
        </header>
        {notice && (
          <div className="welcome-feedback" ref={feedbackRef} tabIndex={-1}>
            {notice.type === 'error' ? (
              <FormError error={notice.message} />
            ) : (
              <p className="welcome-success" role="status">
                {notice.message}
              </p>
            )}
            <button
              type="button"
              className="welcome-dismiss"
              disabled={busy}
              onClick={onDismissNotice}
            >
              Entesos
            </button>
          </div>
        )}
        <GoogleSignIn enabled={!!status.google} onBusyChange={onGoogleBusyChange} />
        {status.google ? (
          <>
            <p className="welcome-google-hint">Fes servir el teu compte @fje.edu.</p>
            <p className="welcome-google-detail">
              Si és el primer cop, crearem el teu perfil amb el nom i la foto de Google.
            </p>
          </>
        ) : (
          <button type="button" className="welcome-submit" onClick={() => window.location.reload()}>
            Tornar-ho a provar <ArrowRight size={18} />
          </button>
        )}
        <p className="welcome-privacy">
          <ShieldCheck size={16} />
          Les teves notes són privades.
        </p>
      </div>
    </section>
  );
}

export function AuthFeedback({ error = '', onRetry }) {
  return (
    <WelcomeFrame>
      <section
        className="welcome-access"
        id="welcome-access"
        aria-labelledby="welcome-feedback-heading"
        tabIndex={-1}
      >
        <div className="welcome-card welcome-connection">
          {!error && <SpinnerGap className="welcome-spinner" size={28} aria-hidden="true" />}
          <h2 id="welcome-feedback-heading">
            {error ? 'No hem pogut connectar' : 'Preparant el teu espai'}
          </h2>
          <p role={error ? 'alert' : 'status'}>
            {error
              ? 'Comprova la connexió i torna-ho a provar. Les teves dades desades es conserven.'
              : 'Un moment, ja hi som…'}
          </p>
          {error && (
            <button type="button" className="welcome-submit" onClick={onRetry}>
              Tornar-ho a provar
              <ArrowRight size={18} />
            </button>
          )}
        </div>
      </section>
    </WelcomeFrame>
  );
}

export default function Auth({ status, notice, onDismissNotice }) {
  const [busy, setBusy] = useState(false);
  const feedbackRef = useRef(null);
  const idPrefix = useId();
  useEffect(() => {
    if (notice) feedbackRef.current?.focus();
  }, [notice]);
  return (
    <WelcomeFrame school={status.school}>
      <AuthPanel
        status={status}
        busy={busy}
        onGoogleBusyChange={setBusy}
        feedbackRef={feedbackRef}
        idPrefix={idPrefix}
        notice={notice}
        onDismissNotice={onDismissNotice}
      />
    </WelcomeFrame>
  );
}
