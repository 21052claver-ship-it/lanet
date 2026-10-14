import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { useApp } from './context';
import { useStudyAudio } from './use-study-audio';
import {
  secondsRemaining,
  restoreTimer,
  advanceTimer,
  focusOptions,
  phaseMinutes,
} from '../shared/timer';
import { readLocalJSON, writeLocalJSON } from '../shared/local-state';
import { clientId } from '../shared/client-id';
import { createFocusAlarm } from './focus-alarm';
// Preserve timer consumers when this provider is refreshed during development.
const TimerContext = import.meta.hot?.data.timerContext ?? createContext();
if (import.meta.hot) import.meta.hot.data.timerContext = TimerContext;
export const useTimer = () => useContext(TimerContext);
export function TimerProvider({ children }) {
  const { data, mutate, notify, savePreferences } = useApp();
  const key = `lanet.timer.${data.user.id}`;
  const [timer, setTimer] = useState(() => restoreTimer(readLocalJSON(key, null), data.focus));
  const optionsKey = `lanet.focusOptions.${data.user.id}`;
  const [options, setOptions] = useState(() => focusOptions(readLocalJSON(optionsKey, null)));
  const alarm = useRef(null);
  if (!alarm.current) alarm.current = createFocusAlarm();
  const [alarmReady, setAlarmReady] = useState(false);
  const queueKey = `lanet.focusQueue.${data.user.id}`;
  const rejectedKey = `lanet.focusRejected.${data.user.id}`;
  const [rejectedSessions, setRejectedSessions] = useState(() => {
    const saved = readLocalJSON(rejectedKey, []);
    return Array.isArray(saved) ? saved.filter((v) => v?.session && v?.reason).slice(-50) : [];
  });
  const rejectedRef = useRef(rejectedSessions);
  rejectedRef.current = rejectedSessions;
  const [queue, setQueue] = useState(() => {
    const saved = readLocalJSON(queueKey, []);
    return Array.isArray(saved)
      ? saved
          .filter(
            (v) =>
              v &&
              typeof v.id === 'string' &&
              Number.isInteger(v.minutes) &&
              v.minutes >= 1 &&
              v.minutes <= 120,
          )
          .slice(-50)
      : [];
  });
  const [retry, setRetry] = useState(0);
  const completionPending = useRef(false);
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
    const update = () => setNow(Date.now());
    window.addEventListener('focus', update);
    document.addEventListener('visibilitychange', update);
    return () => {
      window.removeEventListener('focus', update);
      document.removeEventListener('visibilitychange', update);
    };
  }, []);
  useEffect(() => {
    writeLocalJSON(optionsKey, options);
  }, [optionsKey, options]);
  useEffect(() => {
    writeLocalJSON(queueKey, queue);
  }, [queueKey, queue]);
  useEffect(() => {
    const online = () => setRetry((n) => n + 1),
      interval = setInterval(online, 30000);
    window.addEventListener('online', online);
    return () => {
      window.removeEventListener('online', online);
      clearInterval(interval);
    };
  }, []);
  useEffect(() => {
    if (!queue.length || completionPending.current) return;
    completionPending.current = true;
    const first = queue[0];
    let committed = false;
    mutate('/focus/complete', first, undefined, () => {
      committed = true;
      setQueue((q) => q.filter((e) => e.id !== first.id));
    })
      .catch((error) => {
        // A permanent validation failure must not block later valid sessions.
        // Preserve the original entry before advancing; transient errors retry.
        if (error.status !== 400) return;
        const saved = [
          ...rejectedRef.current,
          { session: first, reason: error.message, savedAt: new Date().toISOString() },
        ].slice(-50);
        if (!writeLocalJSON(rejectedKey, saved)) return;
        setRejectedSessions(saved);
        setQueue((q) => q.filter((e) => e.id !== first.id));
        committed = true;
        notify(
          'Una sessió antiga no s’ha pogut sincronitzar. La conservem en aquest dispositiu; les següents continuen normalment.',
          'warning',
        );
      })
      .finally(() => {
        completionPending.current = false;
        if (committed) setRetry((n) => n + 1);
      });
  }, [queue[0]?.id, retry, mutate, rejectedKey, notify]);
  useEffect(() => {
    if (!options.alarm) alarm.current.cancel();
  }, [options.alarm]);
  useEffect(() => () => alarm.current.dispose(), []);
  const prepareAlarm = () => alarm.current.prepare().then(setAlarmReady);
  useEffect(() => {
    if (!timer.running || !options.alarm || alarmReady) return;
    const unlock = () => {
      prepareAlarm();
    };
    window.addEventListener('pointerdown', unlock, { once: true });
    window.addEventListener('keydown', unlock, { once: true });
    return () => {
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
    };
  }, [timer.running, options.alarm, alarmReady]);
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
            phaseSeconds: phaseMinutes(current.phase, data.focus) * 60,
            end: null,
          },
    );
  }, [data.focus]);
  const remaining = secondsRemaining(timer, now);
  useEffect(() => {
    if (!timer.running || remaining > 0 || processing.current) return;
    processing.current = true;
    const next = advanceTimer(timer, data.focus, Date.now(), options.automatic, clientId);
    if (next) {
      if (
        options.alarm &&
        options.alarmVolume > 0 &&
        alarmReady &&
        !alarm.current.schedule({
          phase: next.timer.phase,
          tone: options.tone,
          volume: options.alarmVolume,
        })
      )
        setAlarmReady(false);
      setTimer(next.timer);
      if (next.completed)
        setQueue((q) =>
          q.some((e) => e.id === next.completed.id) ? q : [...q, next.completed].slice(-50),
        );
      notify(
        next.timer.phase === 'work'
          ? next.timer.running
            ? 'El descans ha acabat. Comença la concentració.'
            : 'Descans acabat. Preparat per continuar.'
          : 'Sessió acabada. És hora de descansar.',
      );
    }
    processing.current = false;
  }, [
    remaining,
    timer,
    data.focus,
    options.automatic,
    options.alarm,
    options.tone,
    options.alarmVolume,
    alarmReady,
    notify,
  ]);
  const toggle = () => {
    if (timer.running) alarm.current.cancel();
    else if (options.alarm) prepareAlarm();
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
  const reset = () => {
    alarm.current.cancel();
    setTimer((t) => ({
      ...t,
      running: false,
      phase: 'work',
      round: 1,
      remaining: data.focus.work * 60,
      phaseSeconds: data.focus.work * 60,
      end: null,
      sessionId: null,
      workMinutes: null,
    }));
  };
  return (
    <TimerContext.Provider
      value={{
        timer,
        remaining,
        toggle,
        reset,
        options,
        setFocusOptions: (patch) => {
          if (patch.alarm === true) prepareAlarm();
          setOptions((o) => focusOptions({ ...o, ...patch }));
        },
        alarmReady,
        alarmSupported: alarm.current.supported,
        prepareAlarm,
        testAlarm: async () => {
          const ready = await alarm.current.prepare();
          setAlarmReady(ready);
          if (ready) alarm.current.schedule({ tone: options.tone, volume: options.alarmVolume });
        },
        pendingSessions: queue.length,
        rejectedSessions,
        applySettings: (focus) => {
          alarm.current.cancel();
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
            phaseSeconds: phaseMinutes(t.phase, focus) * 60,
          }));
        },
        setTimer,
        ...music,
      }}
    >
      {children}
    </TimerContext.Provider>
  );
}
