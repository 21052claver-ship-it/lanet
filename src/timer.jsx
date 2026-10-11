import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { useApp } from './context';
import { useStudyAudio } from './use-study-audio';
import { secondsRemaining, restoreTimer } from '../shared/timer';
import { readLocalJSON, writeLocalJSON } from '../shared/local-state';
import { clientId } from '../shared/client-id';
// Preserve timer consumers when this provider is refreshed during development.
const TimerContext = import.meta.hot?.data.timerContext ?? createContext();
if (import.meta.hot) import.meta.hot.data.timerContext = TimerContext;
export const useTimer = () => useContext(TimerContext);
export function TimerProvider({ children }) {
  const { data, mutate, notify, savePreferences } = useApp();
  const key = `lanet.timer.${data.user.id}`;
  const [timer, setTimer] = useState(() => restoreTimer(readLocalJSON(key, null), data.focus));
  const storageWarning = useRef(false);
  const [now, setNow] = useState(Date.now());
  const processing = useRef(false);
  const focusVersion = useRef(JSON.stringify(data.focus));
  const music = useStudyAudio({ preferences: data.preferences, savePreferences, notify });
  useEffect(() => {
    const i = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(i);
  }, []);
  useEffect(() => {
    if (!writeLocalJSON(key, timer) && !storageWarning.current) {
      storageWarning.current = true;
      notify(
        'El temporitzador funciona, però aquest navegador no permet recordar-lo en recarregar.',
        'warning',
      );
    }
  }, [timer, key, notify]);
  useEffect(() => {
    const version = JSON.stringify(data.focus);
    if (focusVersion.current === version) return;
    focusVersion.current = version;
    setTimer((current) =>
      current.running || current.sessionId
        ? current
        : {
            ...current,
            remaining:
              (current.phase === 'work'
                ? data.focus.work
                : current.phase === 'long'
                  ? data.focus.long_rest
                  : data.focus.rest) * 60,
            end: null,
          },
    );
  }, [data.focus]);
  const remaining = secondsRemaining(timer, now);
  useEffect(() => {
    if (!timer.running || remaining > 0 || processing.current) return;
    processing.current = true;
    const next =
      timer.phase === 'work' ? (timer.round % data.focus.rounds === 0 ? 'long' : 'rest') : 'work';
    const round = timer.phase === 'work' ? timer.round : timer.round + 1;
    setTimer((t) => ({
      ...t,
      running: false,
      phase: next,
      round,
      sessionId: null,
      workMinutes: null,
      remaining:
        (next === 'work'
          ? data.focus.work
          : next === 'long'
            ? data.focus.long_rest
            : data.focus.rest) * 60,
    }));
    if (timer.phase === 'work') {
      mutate('/focus/complete', {
        id: timer.sessionId,
        subject_id: timer.subject_id,
        task: timer.task,
        minutes: timer.workMinutes || data.focus.work,
      }).catch(() => {});
      notify('Sessió acabada. És hora de descansar.');
    } else notify('Descans acabat. Preparat per continuar.');
    processing.current = false;
  }, [remaining, timer, data.focus, mutate, notify]);
  const toggle = () => {
    const currentTime = Date.now();
    setNow(currentTime);
    setTimer((t) => ({
      ...t,
      running: !t.running,
      ...(t.phase === 'work' && !t.sessionId ? { task: '', subject_id: '' } : {}),
      remaining: secondsRemaining(t, currentTime),
      end: t.running ? null : currentTime + t.remaining * 1000,
      sessionId: t.phase === 'work' ? t.sessionId || clientId() : null,
      workMinutes: t.phase === 'work' ? t.workMinutes || data.focus.work : null,
    }));
  };
  const reset = () =>
    setTimer((t) => ({
      ...t,
      running: false,
      phase: 'work',
      round: 1,
      remaining: data.focus.work * 60,
      sessionId: null,
      workMinutes: null,
    }));
  return (
    <TimerContext.Provider
      value={{
        timer,
        remaining,
        toggle,
        reset,
        applySettings: (focus) =>
          setTimer((t) => ({
            ...t,
            running: false,
            remaining:
              (t.phase === 'work'
                ? focus.work
                : t.phase === 'long'
                  ? focus.long_rest
                  : focus.rest) * 60,
            end: null,
            sessionId: null,
            workMinutes: null,
          })),
        setTimer,
        ...music,
      }}
    >
      {children}
    </TimerContext.Provider>
  );
}
