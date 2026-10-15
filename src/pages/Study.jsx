import React, { useState } from 'react';
import {
  Play,
  Pause,
  ArrowCounterClockwise,
  Gear,
  ArrowsOut,
  SpeakerHigh,
} from '@phosphor-icons/react';
import { useApp } from '../context';
import { useTimer } from '../timer';
import { PageTitle, Button, SubjectChip, IconButton } from '../ui';
import { ReferenceArt } from '../art';
import MusicPlayer from '../components/MusicPlayer';
import FocusMode, { FocusOptions } from '../components/FocusMode';
import { download } from '../api';
export default function Study() {
  const { data, subject, open } = useApp();
  const {
    timer,
    remaining,
    toggle,
    reset,
    options,
    setFocusMode,
    pendingSessions,
    rejectedSessions,
  } = useTimer();
  const [focusing, setFocusing] = useState(false);
  const duration =
    timer.phaseSeconds ||
    (timer.phase === 'work' && timer.workMinutes
      ? timer.workMinutes
      : timer.phase === 'work'
        ? data.focus.work
        : timer.phase === 'long'
          ? data.focus.long_rest
          : data.focus.rest) * 60;
  const elapsed = Math.max(0, Math.min(1, 1 - remaining / duration));
  const today = data.study.filter((session) => session.day === data.today);
  return (
    <>
      <PageTitle title="Estudi" subtitle="Un espai per concentrar-te">
        <Button
          variant="primary"
          onClick={() => {
            setFocusMode(options.mode);
            setFocusing(true);
          }}
        >
          <ArrowsOut size={19} /> Mode focus
        </Button>
      </PageTitle>
      {focusing && <FocusMode onClose={() => setFocusing(false)} />}
      <div className="study-layout">
        <section className="panel focus-panel">
          <div className="focus-heading">
            <ReferenceArt name="focus-cake" size={54} />
            <div>
              <h2>Pastisdoro</h2>
            </div>
          </div>
          <p className="focus-phase" role="status">
            <span>
              {timer.phase === 'work'
                ? 'Concentració'
                : timer.phase === 'long'
                  ? 'Descans llarg'
                  : 'Descans'}
            </span>
            <span>
              Sessió {((timer.round - 1) % data.focus.rounds) + 1} de {data.focus.rounds}
            </span>
          </p>
          <div className="timer-face">
            <svg className="timer-ring" viewBox="0 0 240 240" aria-hidden="true">
              <circle cx="120" cy="120" r="108" />
              <circle
                className="timer-progress"
                cx="120"
                cy="120"
                r="108"
                strokeDasharray={679}
                strokeDashoffset={679 * (1 - elapsed)}
              />
              <circle
                className="timer-marker"
                cx={120 + Math.cos(elapsed * Math.PI * 2) * 108}
                cy={120 + Math.sin(elapsed * Math.PI * 2) * 108}
                r="9"
              />
            </svg>
            <div>
              <span
                className="timer-number"
                role="timer"
                aria-label={
                  Math.floor(remaining / 60) + ' minuts i ' + (remaining % 60) + ' segons'
                }
              >
                {String(Math.floor(remaining / 60)).padStart(2, '0')}
                <i>:</i>
                {String(remaining % 60).padStart(2, '0')}
              </span>
              <small>
                {timer.running
                  ? 'Un moment per concentrar-te'
                  : timer.phase === 'work'
                    ? 'Prepara’t i comença'
                    : 'Un moment per respirar'}
              </small>
            </div>
          </div>
          <div className="timer-actions">
            <Button variant="primary timer-start" onClick={toggle}>
              {timer.running ? <Pause size={23} weight="fill" /> : <Play size={23} weight="fill" />}
              {timer.running ? 'Pausar' : timer.remaining === duration ? 'Comença' : 'Continuar'}
            </Button>
            <Button onClick={() => open('focus')}>
              <Gear size={23} />
              Configura
            </Button>
            {(timer.running || remaining !== duration) && (
              <IconButton label="Reiniciar el temporitzador" onClick={reset}>
                <ArrowCounterClockwise size={21} />
              </IconButton>
            )}
          </div>
          <p className="focus-settings-summary">
            {data.focus.work} min de concentració · {data.focus.rest} min de descans
          </p>
          <details className="study-continuity">
            <summary>
              <SpeakerHigh size={18} />{' '}
              {options.automatic ? 'Continuïtat automàtica' : 'Continuïtat manual'} ·{' '}
              {options.alarm ? 'amb alarma' : 'sense so'}
            </summary>
            <FocusOptions />
          </details>
          {pendingSessions > 0 && (
            <p className="focus-queue-hint" role="status">
              {pendingSessions} sessions pendents de sincronitzar. El temporitzador pot continuar.
            </p>
          )}
          {rejectedSessions.length > 0 && (
            <div className="focus-queue-hint" role="status">
              <p>
                {rejectedSessions.length} sessions no s’han pogut sincronitzar. Les dades es
                conserven en aquest dispositiu.
              </p>
              <Button
                onClick={() =>
                  download(
                    'sessions-estudi-pendents.json',
                    JSON.stringify(rejectedSessions, null, 2),
                    'application/json',
                  )
                }
              >
                Descarregar sessions
              </Button>
            </div>
          )}
        </section>
        <aside className="study-aside">
          <MusicPlayer />
        </aside>
      </div>
      <details className="panel study-record">
        <summary>
          <strong>{today.reduce((sum, session) => sum + session.minutes, 0)} minuts</strong>{' '}
          d’estudi avui · {today.length} sessions
        </summary>
        {today.map((session) => (
          <div key={session.id}>
            <SubjectChip subject={subject(session.subject_id)} />
            <span>{session.task || 'Sessió de concentració'}</span>
            <small>{session.minutes} min</small>
          </div>
        ))}
        {!today.length && <p className="muted">La primera sessió acabada apareixerà aquí.</p>}
      </details>
    </>
  );
}
