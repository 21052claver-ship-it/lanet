import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { api } from './api';
import { createDataSync, runMutation, privacyAfterFailure } from '../shared/async-state';
import { useGradeWrites } from './grade-writes';
import { useTaskWrites } from './task-writes';
import { emptyPau } from '../shared/pau';
import { useReactionWrites } from './reaction-writes';
import { createPreferenceWriter } from '../shared/preference-writer';
import { useActivity } from './use-activity';
import { ACTIVITY_INTERVAL, ACTIVE_WINDOW } from '../shared/activity';
import { readLocalJSON, writeLocalJSON } from '../shared/local-state';
import { communityLocation, communityURL, calendarSession } from '../shared/workspace-navigation';
const currentRoute = () =>
  location.hash.slice(1) ||
  (location.pathname.replace(/\/$/, '') === '/admin' ? 'admin' : 'schedule');
// Preserve the provider identity across Vite module refreshes during development.
const AppContext = import.meta.hot?.data.appContext ?? createContext();
if (import.meta.hot) import.meta.hot.data.appContext = AppContext;
export const useApp = () => useContext(AppContext);
export function AppProvider({ initial, children }) {
  const [data, setData] = useState(initial),
    [modal, setModal] = useState(null),
    [toast, setToast] = useState(null),
    [page, setPage] = useState(currentRoute),
    [communityState, updateCommunityState] = useState(() => communityLocation(location.href)),
    [subjectFilter, updateSubjectFilter] = useState(() => {
      const id = new URL(location.href).searchParams.get('subject');
      return initial.subjects.some((s) => s.id === id) ? id : 'all';
    });
  const [agendaSubject, setAgendaSubject] = useState(null);
  const communityRef = useRef(communityState);
  const changeCommunity = useCallback((patch) => {
    const next = { ...communityRef.current, ...patch };
    communityRef.current = next;
    updateCommunityState(next);
    if (currentRoute() === 'community') {
      const url = communityURL(location.href, next);
      if (url.href !== location.href) history.pushState(null, '', url);
    }
  }, []);
  const setCommunityTab = useCallback((tab) => changeCommunity({ tab }), [changeCommunity]);
  const setDelegateTab = useCallback(
    (delegates) => changeCommunity({ delegates }),
    [changeCommunity],
  );
  const sessionKey = `lanet.calendarSession.${initial.user.id}`;
  const [scheduleSession, updateScheduleSession] = useState(() => {
    try {
      return calendarSession(readLocalJSON(sessionKey, null, sessionStorage), initial.today);
    } catch {
      return calendarSession(null, initial.today);
    }
  });
  const setScheduleSession = useCallback(
    (patch) => {
      updateScheduleSession((current) => ({ ...calendarSession(current, data.today), ...patch }));
    },
    [data.today],
  );
  useEffect(() => {
    try {
      writeLocalJSON(sessionKey, scheduleSession, sessionStorage);
    } catch {
      /* Memory still preserves navigation. */
    }
  }, [sessionKey, scheduleSession]);
  const lastInteraction = useActivity(initial.user.id, page);
  const setSubjectFilter = useCallback((id) => {
    updateSubjectFilter(id);
    const url = new URL(location.href);
    url.searchParams.delete('contents');
    if (id === 'all') url.searchParams.delete('subject');
    else url.searchParams.set('subject', id);
    history.pushState(null, '', url);
  }, []);
  useEffect(() => {
    const restore = () => {
      const id = new URL(location.href).searchParams.get('subject');
      updateSubjectFilter(data.subjects.some((s) => s.id === id) ? id : 'all');
    };
    window.addEventListener('popstate', restore);
    return () => window.removeEventListener('popstate', restore);
  }, [data.subjects]);
  const [walletHold, holdWallet] = useState(null);
  const walletBalance = walletHold ?? data.user.balance;
  const [hideGrades, setHideGrades] = useState(!!initial.preferences?.hideGrades);
  const [pauDraft, setPauDraft] = useState(() => initial.pau?.value || emptyPau());
  const [pauSaved, setPauSaved] = useState(() => initial.pau || { value: null, revision: 0 });
  const pauDirty = JSON.stringify(pauDraft) !== JSON.stringify(pauSaved.value || emptyPau());
  useEffect(() => {
    if (!pauDirty && data.pau?.revision > pauSaved.revision) {
      setPauSaved(data.pau);
      setPauDraft(data.pau.value || emptyPau());
    }
  }, [data.pau, pauDirty, pauSaved.revision]);
  useEffect(() => {
    if (!pauDirty) return;
    const warn = (e) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [pauDirty]);
  const privacyPending = useRef(false);
  useEffect(() => {
    if (!privacyPending.current) setHideGrades(!!data.preferences?.hideGrades);
  }, [data.preferences?.hideGrades]);
  const notify = useCallback(
    (message, type = 'success') => setToast({ message, type, id: Date.now() }),
    [],
  );
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4500);
    return () => clearTimeout(t);
  }, [toast]);
  const sync = useRef(null);
  if (!sync.current)
    sync.current = createDataSync({ read: () => api('/bootstrap'), apply: setData });
  const refresh = useCallback(() => sync.current.refresh(), []);
  useEffect(() => {
    let lastRead = Date.now(),
      pending = false;
    const update = () => {
      const now = Date.now();
      if (
        pending ||
        document.visibilityState !== 'visible' ||
        now - lastInteraction.current >= ACTIVE_WINDOW ||
        now - lastRead < ACTIVITY_INTERVAL
      )
        return;
      lastRead = now;
      pending = true;
      refresh()
        .catch(() => {})
        .finally(() => {
          pending = false;
        });
    };
    const interval = setInterval(update, ACTIVITY_INTERVAL);
    window.addEventListener('focus', update);
    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', update);
    };
  }, [refresh, lastInteraction]);
  const mutate = useCallback(
    (path, body, success, onCommitted, method = 'POST', requestOptions = {}) =>
      runMutation({
        sync: sync.current,
        write: () => api(path, { ...requestOptions, method, body }),
        onCommitted,
        onSuccess: () => success && notify(success),
        onError: (error) => notify(error.message, 'error'),
        onRefreshError: () =>
          notify(
            'L’acció s’ha desat. No hem pogut actualitzar la vista; es tornarà a sincronitzar.',
            'warning',
          ),
      }),
    [notify],
  );
  const preferenceWrites = useRef(null);
  if (!preferenceWrites.current)
    preferenceWrites.current = createPreferenceWriter((patch) =>
      api('/preferences', { method: 'POST', body: patch }),
    );
  const savePreferences = useCallback(
    (patch, success) =>
      runMutation({
        sync: sync.current,
        write: () => preferenceWrites.current(patch),
        onCommitted: ({ patch: saved }) =>
          setData((current) => ({
            ...current,
            preferences: { ...current.preferences, ...saved },
          })),
        onSuccess: () => success && notify(success),
        onError: (error) => notify(error.message, 'error'),
        onRefreshError: () =>
          notify('Preferències desades. La vista es tornarà a sincronitzar.', 'warning'),
      }),
    [notify],
  );
  const gradeWrites = useGradeWrites(data, setData, mutate);
  const taskWrites = useTaskWrites(mutate, setData);
  const reactions = useReactionWrites(data, setData, sync.current, notify);
  const go = useCallback((p) => {
    setPage(p);
    if (p === 'admin') history.pushState(null, '', '/admin');
    else {
      if (location.pathname === '/admin') history.pushState(null, '', '/');
      if (p === 'community') {
        const url = communityURL(location.href, communityRef.current);
        url.hash = p;
        if (url.href !== location.href) history.pushState(null, '', url);
      } else location.hash = p;
    }
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, []);
  useEffect(() => {
    const f = () => {
      setPage(currentRoute());
      const state = communityLocation(location.href);
      communityRef.current = state;
      updateCommunityState(state);
    };
    window.addEventListener('hashchange', f);
    window.addEventListener('popstate', f);
    return () => {
      window.removeEventListener('hashchange', f);
      window.removeEventListener('popstate', f);
    };
  }, []);
  const subject = (id) => data.subjects.find((s) => s.id === id);
  const enrolled = data.subjects.filter((s) =>
    data.enrollments.some(
      (e) => data.offerings.find((o) => o.id === e.offering_id)?.subject_id === s.id,
    ),
  );
  return (
    <AppContext.Provider
      value={{
        data,
        setData,
        walletBalance,
        holdWallet,
        refresh,
        mutate,
        reactions,
        remove: (path, success) => mutate(path, {}, success, undefined, 'DELETE'),
        notify,
        modal,
        open: (type, item = {}) => {
          setToast((current) => (current?.type === 'success' ? null : current));
          setModal({ type, item });
        },
        // A delayed response from a dismissed form must not close a newer dialog.
        close: () => setModal((current) => (current === modal ? null : current)),
        page,
        go,
        subject,
        enrolled,
        communityTab: communityState.tab,
        setCommunityTab,
        delegateTab: communityState.delegates,
        setDelegateTab,
        scheduleSession: calendarSession(scheduleSession, data.today),
        setScheduleSession,
        subjectFilter,
        setSubjectFilter,
        agendaSubject,
        setAgendaSubject,
        savePreferences,
        gradeWrites,
        taskWrites,
        hideGrades,
        pauDraft,
        setPauDraft,
        pauSaved,
        setPauSaved,
        pauDirty,
        setGradePrivacy: async (hidden) => {
          if (privacyPending.current) return;
          privacyPending.current = true;
          setHideGrades(hidden);
          try {
            await savePreferences({ hideGrades: hidden });
          } catch (error) {
            setHideGrades(privacyAfterFailure(hideGrades, hidden));
            throw error;
          } finally {
            privacyPending.current = false;
          }
        },
      }}
    >
      {children}
      {toast && (
        <div
          key={toast.id}
          className={`toast ${toast.type}`}
          role={toast.type === 'error' ? 'alert' : 'status'}
        >
          {toast.message}
        </div>
      )}
    </AppContext.Provider>
  );
}
