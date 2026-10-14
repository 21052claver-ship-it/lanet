import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  Play,
  Pause,
  X,
  ArrowsOut,
  ArrowsIn,
  Gear,
  SpeakerHigh,
  MusicNotes,
  Moon,
  Leaf,
  Sun,
  ArrowCounterClockwise,
} from '@phosphor-icons/react';
import { useApp } from '../context';
import { useTimer } from '../timer';
import { Button, Field, Tabs } from '../ui';
import Select from './Select';
import { phaseMinutes } from '../../shared/timer';
import '../focus-mode.css';

export function FocusOptions() {
  const { options, setFocusOptions, testAlarm, alarmReady, alarmSupported } = useTimer();
  return (
    <div className="focus-options-grid">
      <label className="focus-option-check">
        <input
          type="checkbox"
          checked={options.automatic}
          onChange={(e) => setFocusOptions({ automatic: e.target.checked })}
        />
        <span>
          <strong>Continuar automàticament</strong>
          <small>Concentració, descans i següent sessió</small>
        </span>
      </label>
      <label className="focus-option-check">
        <input
          type="checkbox"
          checked={options.alarm}
          onChange={(e) => setFocusOptions({ alarm: e.target.checked })}
        />
        <span>
          <strong>Alarma als canvis</strong>
          <small>Un so curt en acabar cada fase</small>
        </span>
      </label>
      {options.alarm && (
        <div className="focus-alarm-options">
          <Field label="So de l’alarma">
            <Select
              value={options.tone}
              onChange={(e) => setFocusOptions({ tone: e.target.value })}
            >
              <option value="bell">Campaneta</option>
              <option value="soft">Suau</option>
              <option value="digital">Digital</option>
            </Select>
          </Field>
          <Field label="Volum de l’alarma">
            <input
              type="range"
              min="0"
              max="100"
              value={Math.round(options.alarmVolume * 100)}
              onChange={(e) => setFocusOptions({ alarmVolume: Number(e.target.value) / 100 })}
            />
          </Field>
          <Button type="button" onClick={testAlarm} disabled={!alarmSupported}>
            <SpeakerHigh size={18} /> Provar el so
          </Button>
          <small role="status">
            {!alarmSupported
              ? 'El navegador no permet aquesta alarma.'
              : alarmReady
                ? 'So preparat'
                : 'El so s’activa quan prems Comença o Provar el so.'}
          </small>
        </div>
      )}
    </div>
  );
}
export function FocusClock({ visual = 'ring' }) {
  const { data } = useApp(),
    { timer, remaining } = useTimer();
  const duration =
    timer.phaseSeconds ||
    (timer.phase === 'work' && timer.workMinutes
      ? timer.workMinutes * 60
      : phaseMinutes(timer.phase, data.focus) * 60);
  const elapsed = Math.max(0, Math.min(1, 1 - remaining / duration));
  return (
    <div className={'timer-face focus-clock clock-' + visual}>
      {visual === 'ring' && (
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
        </svg>
      )}
      <div>
        <span
          className="timer-number"
          role="timer"
          aria-label={`${Math.floor(remaining / 60)} minuts i ${remaining % 60} segons`}
        >
          {String(Math.floor(remaining / 60)).padStart(2, '0')}
          <i>:</i>
          {String(remaining % 60).padStart(2, '0')}
        </span>
        <small>{timer.running ? 'Només aquest moment' : 'Al teu ritme'}</small>
      </div>
    </div>
  );
}
export default function FocusMode({ onClose }) {
  const { data, savePreferences } = useApp();
  const {
    timer,
    remaining,
    toggle,
    reset,
    options,
    setFocusOptions,
    playing,
    toggleMusic,
    volume,
    setVolume,
    alarmReady,
    alarmSupported,
    prepareAlarm,
  } = useTimer();
  const root = useRef(null),
    exit = useRef(null),
    ownsFullscreen = useRef(false);
  const [fullscreen, setFullscreen] = useState(!!document.fullscreenElement),
    [screenStatus, setScreenStatus] = useState('');
  const closeRef = useRef(onClose);
  const savedVolume = useRef(volume);
  const persistVolume = () => {
    if (savedVolume.current === volume) return;
    const value = volume,
      previous = savedVolume.current;
    savedVolume.current = value;
    savePreferences({ volume: value }).catch(() => {
      if (savedVolume.current === value) savedVolume.current = previous;
    });
  };
  closeRef.current = onClose;
  useEffect(() => {
    let live = true;
    if (
      !document.fullscreenElement &&
      root.current?.requestFullscreen &&
      navigator.userActivation?.isActive !== false
    ) {
      root.current
        .requestFullscreen()
        .then(() => {
          if (!live) {
            document.exitFullscreen?.().catch(() => {});
            return;
          }
          ownsFullscreen.current = true;
          setFullscreen(true);
        })
        .catch(() => {});
    }
    const previous = document.activeElement,
      overflow = document.body.style.overflow,
      shell = document.querySelector('.app-shell'),
      inert = shell?.inert;
    document.body.style.overflow = 'hidden';
    if (shell) shell.inert = true;
    exit.current?.focus();
    const keys = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        closeRef.current();
      }
      if (e.key === 'Tab') {
        const all = [
          ...root.current.querySelectorAll('button,a,input,select,[tabindex="0"],summary'),
        ].filter((el) => !el.disabled && el.getClientRects().length);
        const first = all[0],
          last = all.at(-1);
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    };
    const change = () => {
      const native = !!document.fullscreenElement;
      setFullscreen(native);
      if (ownsFullscreen.current && !native) {
        ownsFullscreen.current = false;
        closeRef.current();
      }
    };
    document.addEventListener('keydown', keys);
    document.addEventListener('fullscreenchange', change);
    return () => {
      live = false;
      document.removeEventListener('keydown', keys);
      document.removeEventListener('fullscreenchange', change);
      document.body.style.overflow = overflow;
      if (shell) shell.inert = inert;
      if (ownsFullscreen.current && document.fullscreenElement)
        document.exitFullscreen?.().catch(() => {});
      previous?.isConnected && previous.focus?.({ preventScroll: true });
    };
  }, []);
  useEffect(() => {
    if (!options.awake || !navigator.wakeLock) {
      setScreenStatus('');
      return;
    }
    let lock,
      alive = true,
      pending = false;
    const acquire = async () => {
      if (!alive || pending || document.visibilityState !== 'visible' || (lock && !lock.released))
        return;
      pending = true;
      try {
        const acquired = await navigator.wakeLock.request('screen');
        if (!alive) {
          await acquired.release();
          return;
        }
        lock = acquired;
        setScreenStatus('Pantalla activa');
        lock.addEventListener('release', () => {
          if (alive) setScreenStatus('Pantalla alliberada');
        });
      } catch {
        if (alive) setScreenStatus('No s’ha pogut mantenir la pantalla activa.');
      } finally {
        pending = false;
      }
    };
    acquire();
    document.addEventListener('visibilitychange', acquire);
    return () => {
      alive = false;
      document.removeEventListener('visibilitychange', acquire);
      lock?.release().catch(() => {});
    };
  }, [options.awake]);
  const nativeFullscreen = () => {
    if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {});
    else if (root.current?.requestFullscreen)
      root.current
        .requestFullscreen()
        .then(() => {
          ownsFullscreen.current = true;
          setFullscreen(true);
        })
        .catch(() => setScreenStatus('Mode focus actiu a tota la finestra.'));
  };
  const phase =
    timer.phase === 'work' ? 'Concentració' : timer.phase === 'long' ? 'Descans llarg' : 'Descans';
  return createPortal(
    <section
      ref={root}
      className={'focus-mode theme-' + options.theme}
      role="dialog"
      aria-modal="true"
      aria-label="Mode focus"
    >
      <header className="focus-mode-header">
        <strong>
          <Leaf size={22} /> Mode focus
        </strong>
        <div>
          {typeof document.documentElement.requestFullscreen === 'function' && (
            <button
              type="button"
              onClick={nativeFullscreen}
              aria-label={fullscreen ? 'Sortir de pantalla completa' : 'Pantalla completa'}
            >
              {fullscreen ? <ArrowsIn size={21} /> : <ArrowsOut size={21} />}
            </button>
          )}
          <button ref={exit} type="button" onClick={onClose} aria-label="Sortir del mode focus">
            <X size={24} />
          </button>
        </div>
      </header>
      <main className="focus-mode-main">
        <p className="focus-mode-phase" role="status">
          {phase}
        </p>
        <p className="focus-mode-round">
          Sessió {((timer.round - 1) % data.focus.rounds) + 1} de {data.focus.rounds}
        </p>
        <FocusClock visual={options.visual} />
        <div className="focus-mode-actions">
          <Button variant="primary" onClick={toggle}>
            {timer.running ? <Pause size={23} /> : <Play size={23} />}{' '}
            {timer.running
              ? 'Pausar'
              : timer.phase === 'work' && !timer.sessionId && remaining === data.focus.work * 60
                ? 'Comença'
                : 'Continuar'}
          </Button>
          <Button onClick={reset} aria-label="Reiniciar el temporitzador">
            <ArrowCounterClockwise size={20} />
          </Button>
          {timer.running && options.alarm && alarmSupported && !alarmReady && (
            <Button onClick={prepareAlarm}>
              <SpeakerHigh size={20} /> Activar alarma
            </Button>
          )}
        </div>
        <p className="focus-mode-next">
          {options.automatic ? 'La següent fase començarà sola' : 'Tu decideixes quan continuar'}
        </p>
      </main>
      <footer className="focus-mode-footer">
        <details className="focus-mode-settings">
          <summary>
            <Gear size={18} /> Personalitza el teu espai
          </summary>
          <div className="focus-mode-settings-content">
            <Field label="Ambient">
              <Tabs
                label="Ambient del mode focus"
                value={options.theme}
                onChange={(theme) => setFocusOptions({ theme })}
                items={[
                  ['linen', 'Clar', Sun],
                  ['forest', 'Bosc', Leaf],
                  ['night', 'Nit', Moon],
                ]}
              />
            </Field>
            <Field label="Rellotge">
              <Tabs
                label="Estil del rellotge"
                value={options.visual}
                onChange={(visual) => setFocusOptions({ visual })}
                items={[
                  ['ring', 'Anell'],
                  ['digital', 'Digital'],
                ]}
              />
            </Field>
            <FocusOptions />
            <label className="focus-option-check">
              <input
                type="checkbox"
                checked={options.music}
                onChange={(e) => setFocusOptions({ music: e.target.checked })}
              />
              <span>Mostrar controls de música</span>
            </label>
            {navigator.wakeLock && (
              <label className="focus-option-check">
                <input
                  type="checkbox"
                  checked={options.awake}
                  onChange={(e) => setFocusOptions({ awake: e.target.checked })}
                />
                <span>Mantenir la pantalla activa</span>
              </label>
            )}
            <small role="status">{screenStatus}</small>
          </div>
        </details>
        {options.music && (
          <div className="focus-mode-music">
            <Button onClick={toggleMusic}>
              <MusicNotes size={19} />
              {playing ? 'Pausar música' : 'Reproduir música'}
            </Button>
            <input
              aria-label="Volum de la música"
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={volume}
              onChange={(e) => setVolume(Number(e.target.value))}
              onPointerUp={persistVolume}
              onKeyUp={persistVolume}
              onBlur={persistVolume}
            />
          </div>
        )}
      </footer>
    </section>,
    document.body,
  );
}
