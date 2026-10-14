import React from 'react';
import { ArrowUp, ArrowDown, Plus, Trash, GraduationCap } from '@phosphor-icons/react';
import { Button, Field, IconButton } from '../ui';
import Select from './Select';
import { PrivateGrade } from './GradePrivacy';
import { degreeOutlook } from '../../shared/pau-outlook';

const mark = (n) =>
  n == null
    ? '—'
    : n.toLocaleString('ca-ES', { maximumFractionDigits: 2, minimumFractionDigits: 2 });
const reasons = {
  invalid: 'Revisa les dades de La meva nota; pots continuar triant graus.',
  grades: 'Afegeix notes a Notes per obtenir una orientació. Pots triar graus ara.',
  simulation: 'Completa la simulació a La meva nota per comparar-la.',
  minimum: 'Amb el nivell actual projectat encara no se superarien els mínims d’accés.',
  cfgs: 'Per a CFGS, fes servir la simulació amb la mitjana del cicle.',
  weights: 'No hi ha ponderacions fiables per a aquest any.',
  cutoff: 'No hi ha tall publicat en aquesta assignació.',
};
export function PauOutlook({ degree, draft, profile, round, hideGrades }) {
  const result = degreeOutlook(draft, degree, profile, round);
  return (
    <div className="pau-outlook">
      <div className="pau-cutoff">
        <span>Tall 2026 · {round === 'latest' ? '6a' : '1a'} assignació</span>
        <strong>{mark(result.cutoff)}</strong>
      </div>
      {hideGrades ? (
        <p className="pau-muted">Orientació personal oculta · mode discret</p>
      ) : result.ready ? (
        <>
          <div className="pau-outlook-label">
            <span>{result.reaches ? 'Tall històric cobert' : 'Aproximació al tall'}</span>
            <strong>{result.percent}%</strong>
          </div>
          <progress
            aria-label="Percentatge del tall històric cobert"
            max="100"
            value={result.percent}
          />
          <div className={`pau-outlook-numbers ${result.reaches ? 'reaches' : ''}`}>
            <span>
              {draft.orientationSource === 'simulation'
                ? 'Admissió simulada'
                : 'Admissió projectada'}{' '}
              <b>{mark(result.total)}/14</b>
            </span>
            <span>
              {result.gap >= 0 ? 'Marge' : 'Et faltarien'} <b>{mark(Math.abs(result.gap))} punts</b>
            </span>
          </div>
          <small>Percentatge del tall cobert; no és una probabilitat d’entrar.</small>
        </>
      ) : (
        <p className="pau-muted">{reasons[result.reason]}</p>
      )}
    </div>
  );
}
export default function PauChoices({
  codes,
  catalogue,
  draft,
  profile,
  round,
  hideGrades,
  saving,
  patch,
  explore,
  detail,
}) {
  const move = (index, direction) => {
    const next = [...codes],
      target = index + direction;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    patch({ topFive: next, selected: next[0] || '' });
  };
  function remove(code) {
    const next = codes.filter((c) => c !== code);
    patch({ topFive: next, selected: next[0] || '' });
  }
  return (
    <section className="pau-choices" aria-label="El meu top 5">
      <div className="pau-choices-heading">
        <div>
          <h2>
            <GraduationCap size={25} />
            El teu top 5 <small>{codes.length}/5</small>
          </h2>
          <p>Graus i campus en el teu ordre de preferència.</p>
        </div>
        <Button variant="primary" onClick={explore}>
          <Plus size={18} />
          Explorar graus
        </Button>
      </div>
      <p className="pau-choice-basis">
        {hideGrades
          ? 'Orientació personal oculta · mode discret'
          : draft.orientationSource === 'simulation'
            ? 'Orientació amb la teva simulació PAU'
            : profile.known
              ? `Projecció provisional · ${profile.known}/${profile.total} assignatures amb notes`
              : 'Tria les teves opcions; l’orientació arribarà quan tinguis notes.'}
      </p>
      {!codes.length ? (
        <div className="pau-choices-empty">
          <GraduationCap size={44} />
          <h3>On t’agradaria estudiar?</h3>
          <p>
            Explora carreres i guarda fins a cinc combinacions de grau, universitat i campus. No
            necessites cap nota de PAU.
          </p>
        </div>
      ) : (
        catalogue && (
          <ol className="pau-choice-list">
            {codes.map((code, index) => {
              const degree = catalogue.degrees.find((d) => d.code === code);
              return (
                <li className="panel pau-choice" key={code} data-choice={code}>
                  <span className="pau-choice-rank" aria-label={`Preferència ${index + 1}`}>
                    {index + 1}
                  </span>
                  <div className="pau-choice-content">
                    <div className="pau-degree-meta">
                      <span>{degree?.university || 'Grau fora del catàleg'}</span>
                      <small>{degree?.campus || `Codi ${code}`}</small>
                    </div>
                    <h3>{degree?.name || `Opció ${code}`}</h3>
                    {degree && <PauOutlook {...{ degree, draft, profile, round, hideGrades }} />}
                    <div className="pau-choice-actions">
                      {degree && <Button onClick={() => detail(code)}>Detall i evolució</Button>}
                      <div>
                        <IconButton
                          label={`Pujar opció ${index + 1}`}
                          disabled={saving || index === 0}
                          onClick={() => move(index, -1)}
                        >
                          <ArrowUp size={18} />
                        </IconButton>
                        <IconButton
                          label={`Baixar opció ${index + 1}`}
                          disabled={saving || index === codes.length - 1}
                          onClick={() => move(index, 1)}
                        >
                          <ArrowDown size={18} />
                        </IconButton>
                        <IconButton
                          label={`Treure opció ${index + 1}`}
                          disabled={saving}
                          onClick={() => remove(code)}
                        >
                          <Trash size={18} />
                        </IconButton>
                      </div>
                    </div>
                  </div>
                </li>
              );
            })}
          </ol>
        )
      )}
      {codes.length > 0 && codes.length < 5 && (
        <Button className="pau-add-choice" onClick={explore}>
          <Plus size={18} />
          Afegir una altra opció ({codes.length}/5)
        </Button>
      )}
      <details className="panel pau-orientation-base">
        <summary>Base i criteri de l’orientació</summary>
        <Field label="Base de l’orientació">
          <Select
            value={draft.orientationSource || 'grades'}
            disabled={saving}
            onChange={(e) => patch({ orientationSource: e.target.value })}
          >
            <option value="grades">Les meves notes actuals de La Net</option>
            <option value="simulation">La meva simulació PAU</option>
          </Select>
        </Field>
        {draft.orientationSource === 'simulation' ? (
          <p>
            Pots ajustar els exàmens a <b>La meva nota</b>; la llista funciona encara que no els
            tinguis.
          </p>
        ) : hideGrades ? (
          <p>Mode discret: notes, estimacions i marges ocults.</p>
        ) : (
          <p>
            {profile.known ? (
              <>
                <b>
                  <PrivateGrade>{mark(profile.average)}</PrivateGrade>/10
                </b>{' '}
                de mitjana provisional · {profile.known}/{profile.total} assignatures amb notes ·{' '}
                {profile.coverage}% del pes d’avaluació registrat.
              </>
            ) : (
              'Encara sense notes. Comença triant les opcions que t’agraden.'
            )}
          </p>
        )}
        <div className="pau-method">
          <h3>Com funciona l’orientació?</h3>
          <p>
            El percentatge indica quina part del tall històric cobreix la nota projectada, amb màxim
            del 100%. No és una probabilitat d’admissió.
          </p>
          <p>
            Amb notes actuals, calculem la mitjana de les assignatures amb qualificacions, segons
            els teus pesos de proves i trimestres i els plusos corregits, amb màxim de 10 per
            assignatura. Les assignatures sense notes no compten com a zeros. Aquesta mitjana
            parcial no és la mitjana oficial dels dos cursos de batxillerat.
          </p>
          <p>
            Escenari: mantens aquesta mitjana al batxillerat i a la fase d’accés de la PAU (60% +
            40%). Hi sumem les dues millors ponderacions de les assignatures que curses i tenen
            notes, suposant que t’hi presentes i mantens la nota actual. No suposem notes per a
            matèries que no curses. Com menys avaluacions tens, més provisional és el resultat.
          </p>
          <p>
            El tall de 2026 és una referència: les places, la demanda, els requisits i la
            convocatòria poden canviar. L’ordre d’aquesta llista és teu i no tramita la
            preinscripció oficial.
          </p>
        </div>
      </details>
    </section>
  );
}
