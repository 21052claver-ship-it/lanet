import React, { useLayoutEffect, useId, useRef, useState } from 'react';
import { CaretDown, SlidersHorizontal } from '@phosphor-icons/react';
import { useApp } from '../context';
import { Button } from '../ui';
import SubjectPicker from './SubjectPicker';
export default function SubjectFilter({ kind, value, onApplied, expanded, onExpandedChange }) {
  const { data, enrolled, savePreferences } = useApp();
  const [draft, setDraft] = useState(value),
    [busy, setBusy] = useState(false),
    [following, setFollowing] = useState(false);
  const preferenceKey = kind === 'notes' ? 'notesSubjects' : 'plusSubjects';
  const trigger = useRef(null),
    pending = useRef(false);
  const wasExpanded = useRef(false);
  const panelId = useId();
  useLayoutEffect(() => {
    if (expanded && !wasExpanded.current) {
      setDraft(value);
      setFollowing(data.preferences?.[preferenceKey] == null);
    }
    wasExpanded.current = expanded;
  }, [expanded, value, data.preferences, preferenceKey]);
  function close() {
    onExpandedChange(false);
    trigger.current?.focus();
  }
  async function save(selection) {
    if (pending.current) return;
    pending.current = true;
    setBusy(true);
    try {
      await savePreferences({ [preferenceKey]: selection }, 'Assignatures desades al teu perfil.');
      // The preference can finish after navigation has unmounted this filter.
      // Keep the confirmed write without resetting the newly opened workspace.
      if (!trigger.current?.isConnected) return;
      onApplied?.();
      close();
    } catch {
    } finally {
      pending.current = false;
      if (trigger.current?.isConnected) setBusy(false);
    }
  }
  return (
    <>
      <button
        ref={trigger}
        className="button resource-subjects-trigger"
        aria-label={`Les meves assignatures: ${value.length} ${value.length === 1 ? 'seleccionada' : 'seleccionades'}`}
        aria-expanded={expanded}
        aria-controls={panelId}
        disabled={busy}
        onClick={() => {
          if (!expanded) setDraft(value);
          onExpandedChange(!expanded);
        }}
      >
        <SlidersHorizontal size={20} />
        <span>
          Assignatures <small>· {value.length}</small>
        </span>
        <CaretDown size={16} />
      </button>
      {expanded && (
        <div
          id={panelId}
          className="subject-filter-content"
          role="region"
          aria-label="Preferències d’assignatures"
          aria-busy={busy}
          onKeyDown={(e) => {
            if (e.key === 'Escape' && !busy) {
              e.preventDefault();
              close();
            }
          }}
        >
          <label className="preference-check subject-filter-mode">
            <input
              type="checkbox"
              checked={following}
              disabled={busy}
              onChange={(e) => setFollowing(e.target.checked)}
            />
            Seguir les assignatures del meu curs
          </label>
          {following ? (
            <p className="muted subject-filter-following">
              S’actualitzaran automàticament si canvies el curs. Desmarca l’opció per fer una
              selecció pròpia.
            </p>
          ) : (
            <SubjectPicker
              disabled={busy}
              label="Mostrar recursos d’aquestes assignatures"
              subjects={data.subjects}
              value={draft}
              defaults={(enrolled.length ? enrolled : data.subjects).map((s) => s.id)}
              onChange={setDraft}
            />
          )}
          <div className="subject-filter-actions">
            <Button type="button" onClick={close} disabled={busy}>
              Cancel·lar
            </Button>
            <Button
              type="button"
              variant="primary"
              busy={busy}
              onClick={() => save(following ? null : draft)}
            >
              Aplicar i desar
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
