import React, { useState } from 'react';
import { Eye, EyeSlash } from '@phosphor-icons/react';
import { useApp } from '../context';
export function PrivateGrade({ children }) {
  const { hideGrades } = useApp();
  return hideGrades ? (
    <span className="grade-concealed" aria-label="Qualificació oculta">
      •••
    </span>
  ) : (
    children
  );
}
export function GradePrivacyToggle() {
  const { hideGrades, setGradePrivacy } = useApp();
  const [busy, setBusy] = useState(false);
  return (
    <button
      type="button"
      className="button grade-privacy-toggle"
      role="switch"
      aria-label="Mode discret de les notes"
      aria-checked={hideGrades}
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        try {
          await setGradePrivacy(!hideGrades);
        } catch {
        } finally {
          setBusy(false);
        }
      }}
    >
      {hideGrades ? <EyeSlash size={20} /> : <Eye size={20} />}
      <span>
        Mode discret<small>{hideGrades ? 'Activat' : 'Desactivat'}</small>
      </span>
      <span className="privacy-switch" aria-hidden="true">
        <i />
      </span>
    </button>
  );
}
