import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { api } from './api';
import { createDataSync, runMutation, privacyAfterFailure } from '../shared/async-state';
import { useGradeWrites } from './grade-writes';
import { emptyPau } from '../shared/pau';
import { useReactionWrites } from './reaction-writes';
import { createPreferenceWriter } from '../shared/preference-writer';
// Preserve the provider identity across Vite module refreshes during development.
const AppContext = import.meta.hot?.data.appContext ?? createContext();
if (import.meta.hot) import.meta.hot.data.appContext = AppContext;
export const useApp = () => useContext(AppContext);
export function AppProvider({ initial, children }) {
  const [data, setData] = useState(initial),
    [modal, setModal] = useState(null),
    [toast, setToast] = useState(null),
    [page, setPage] = useState(() => location.hash.slice(1) || 'schedule'),
    [communityTab, setCommunityTab] = useState('notices'),
    [subjectFilter, updateSubjectFilter] = useState(() => {
      const id = new URL(location.href).searchParams.get('subject');
      return initial.subjects.some(s => s.id === id) ? id : 'all';
    });
  const [agendaSubject, setAgendaSubject] = useState(null);
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
      updateSubjectFilter(data.subjects.some(s => s.id === id) ? id : 'all');
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
    const update = () => {
      if (document.visibilityState === 'visible') refresh().catch(() => {});
    };
    const interval = setInterval(update, 30000);
    window.addEventListener('focus', update);
    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', update);
    };
  }, [refresh]);
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
  const reactions = useReactionWrites(data, setData, sync.current, notify);
  const go = useCallback((p) => {
    setPage(p);
    location.hash = p;
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, []);
  useEffect(() => {
    const f = () => setPage(location.hash.slice(1) || 'schedule');
    window.addEventListener('hashchange', f);
    return () => window.removeEventListener('hashchange', f);
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
        open: (type, item = {}) => setModal({ type, item }),
        replaceModal: (type, item = {}) => setModal(current => current === modal ? {type,item} : current),
        // A delayed response from a dismissed form must not close a newer dialog.
        close: () => setModal((current) => (current === modal ? null : current)),
        page,
        go,
        subject,
        enrolled,
        communityTab,
        setCommunityTab,
        subjectFilter,
        setSubjectFilter,
        agendaSubject,
        setAgendaSubject,
        savePreferences,
        gradeWrites,
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
