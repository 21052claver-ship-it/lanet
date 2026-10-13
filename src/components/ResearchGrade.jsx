import React, { useState } from 'react';
import { useApp } from '../context';
import { Button, FormError } from '../ui';
import { GradePrivacyToggle, PrivateGrade } from './GradePrivacy';
import { RESEARCH_PARTS, researchResult } from '../../shared/student-guide';
import { numberLabel } from '../../shared/domain';
import { readLocalJSON, writeLocalJSON } from '../../shared/local-state';
import '../student-guide.css';

export default function ResearchGrade() {
  const { data, hideGrades } = useApp();
  const key = `lanet.research.${data.user.id}`;
  const [marks, setMarks] = useState(() => {
    const saved = readLocalJSON(key, {});
    try {
      researchResult(saved);
      return saved || {};
    } catch {
      return {};
    }
  });
  const [focused, setFocused] = useState(null),
    [status, setStatus] = useState(''),
    [privateDraft, setPrivateDraft] = useState('');
  let result, error;
  try {
    result = researchResult(marks);
  } catch (err) {
    error = err.message;
  }
  return (
    <section className="panel research-grade" aria-label="Calculadora del Treball de Recerca">
      <div className="section-heading">
        <h2>Treball de Recerca</h2>
        <GradePrivacyToggle />
      </div>
      <p>Els quatre blocs d’avaluació del centre. Buit vol dir pendent; zero és una nota vàlida.</p>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          if (error) return;
          setStatus(
            writeLocalJSON(key, marks)
              ? 'Notes del TR desades en aquest navegador.'
              : 'No s’han pogut desar. Conserva les notes abans de sortir.',
          );
        }}
      >
        <div className="research-parts">
          {RESEARCH_PARTS.map((part) => (
            <label key={part.id}>
              <span>
                {part.label}
                <strong>{part.weight}%</strong>
              </span>
              <input
                aria-label={`TR · ${part.label}`}
                inputMode="decimal"
                autoComplete="off"
                value={
                  hideGrades ? (focused === part.id ? privateDraft : '') : (marks[part.id] ?? '')
                }
                placeholder={
                  hideGrades && marks[part.id] != null && marks[part.id] !== '' ? '•••' : 'Pendent'
                }
                onFocus={(event) => {
                  setFocused(part.id);
                  setPrivateDraft('');
                  event.target.select();
                }}
                onBlur={() => setFocused(null)}
                onChange={(event) => {
                  setPrivateDraft(event.target.value);
                  setMarks((current) => ({ ...current, [part.id]: event.target.value }));
                  setStatus('');
                }}
                onKeyDown={(event) => {
                  if (
                    hideGrades &&
                    ['Backspace', 'Delete'].includes(event.key) &&
                    !event.currentTarget.value
                  ) {
                    setMarks((current) => ({ ...current, [part.id]: '' }));
                    setStatus('');
                  }
                }}
                aria-invalid={!!error}
                aria-description="Nota de 0 a 10. Es desa només en aquest navegador en prémer Desar notes del TR."
              />
            </label>
          ))}
        </div>
        <FormError error={error} />
        {result && (
          <div className="research-result" aria-live="polite">
            <span>
              {result.complete ? 'Nota del TR' : 'Mitjana provisional del TR'}
              <small>{result.coverage}% avaluat</small>
            </span>
            <strong>
              <PrivateGrade>{numberLabel(result.mean, 2)}</PrivateGrade>
            </strong>
          </div>
        )}
        <p className="assessment-hint">
          Seguiment 30% · dossier 42% · exposició oral 21% · pòster 7%. La mitjana provisional només
          considera els blocs amb nota. Aquesta calculadora no modifica la mitjana de batxillerat ni
          la PAU.
        </p>
        <Button type="submit" disabled={!!error}>
          Desar notes del TR
        </Button>
        <p role="status">{status || 'Les notes del TR es conserven només en aquest navegador.'}</p>
      </form>
    </section>
  );
}
