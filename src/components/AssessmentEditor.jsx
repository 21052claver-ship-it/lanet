import React from 'react';
import { clientId } from '../../shared/client-id';
import { Plus, Trash } from '@phosphor-icons/react';
import { Button, IconButton } from '../ui';
import Select from './Select';
import {
  ASSESSMENT_TYPES,
  MAIN_ASSESSMENTS,
  OPTIONAL_ASSESSMENTS,
  assessmentType,
  assessmentDefinition,
} from '../../shared/assessments';
import { numberLabel } from '../../shared/domain';
import { isConfiguredActivity, extraActivityTitle } from '../../shared/grade-activities';

export default function AssessmentEditor({
  entries,
  onChange,
  renderGrade,
  disabled = false,
  activitySlots = false,
  focusActivity,
}) {
  function update(index, patch) {
    onChange(entries.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  }
  function add(key) {
    const type = assessmentDefinition(key),
      count = entries.filter((row) => assessmentType(row) === key).length;
    if (!activitySlots && type.slots && count >= type.slots) return;
    const number = type.slots
      ? Array.from({ length: type.slots }, (_, i) => i + 1).find(
          (n) =>
            !entries.some(
              (row) => assessmentType(row) === key && row.title === `${type.label} ${n}`,
            ),
        )
      : null;
    let extraIndex = 0;
    while (entries.some((row) => row.title === extraActivityTitle(extraIndex))) extraIndex++;
    const title =
      activitySlots && type.category === 'activity'
        ? extraActivityTitle(extraIndex)
        : type.slots
          ? `${type.label} ${number || count + 1}`
          : type.label;
    onChange([
      ...entries,
      {
        id: clientId(),
        title,
        assessment_type: key,
        category: type.category,
        date: '',
        grade: null,
        raw: '',
        weight: 0,
        ...(activitySlots && type.category === 'activity' ? { extra_slot: true } : {}),
      },
    ]);
  }
  function table(rows) {
    return (
      <div className="sheet-editor assessment-table">
        <table>
          <thead>
            <tr>
              <th>Prova / activitat</th>
              <th>Tipus</th>
              <th>Data</th>
              {renderGrade && <th>Nota</th>}
              <th>Pes %</th>
              <th>
                <span className="sr-only">Accions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const i = entries.indexOf(row),
                key = assessmentType(row);
              return (
                <tr key={row.id || i}>
                  <td data-label="Nom">
                    <input
                      aria-label={`Nom: ${row.title}`}
                      value={row.title}
                      required
                      maxLength={100}
                      autoFocus={
                        activitySlots &&
                        row.extra_slot &&
                        entries.filter((entry) => entry.extra_slot).indexOf(row) === focusActivity
                      }
                      onChange={(e) => update(i, { title: e.target.value })}
                    />
                  </td>
                  <td data-label="Tipus">
                    <Select
                      aria-label={`Tipus: ${row.title}`}
                      value={key}
                      onChange={(e) =>
                        update(i, {
                          assessment_type: e.target.value,
                          category: assessmentDefinition(e.target.value).category,
                        })
                      }
                    >
                      {ASSESSMENT_TYPES.filter(
                        (type) => !activitySlots || type.category === row.category,
                      ).map((type) => (
                        <option key={type.key} value={type.key}>
                          {type.label}
                        </option>
                      ))}
                    </Select>
                  </td>
                  <td data-label="Data">
                    <input
                      aria-label={`Data: ${row.title}`}
                      type="date"
                      value={row.date || ''}
                      onChange={(e) => update(i, { date: e.target.value })}
                    />
                  </td>
                  {renderGrade && <td data-label="Nota">{renderGrade(row, i)}</td>}
                  <td data-label="Pes %">
                    <input
                      aria-label={`Pes: ${row.title}`}
                      type="number"
                      min="0"
                      max="100"
                      step=".01"
                      value={row.weight}
                      required
                      onChange={(e) => update(i, { weight: e.target.value })}
                    />
                  </td>
                  <td>
                    <IconButton
                      type="button"
                      label={`Treure ${row.title}`}
                      onClick={() => onChange(entries.filter((_, index) => index !== i))}
                    >
                      <Trash size={17} />
                    </IconButton>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  }
  const exams = entries.filter(
    (row) => assessmentDefinition(assessmentType(row)).category === 'exam',
  );
  const other = entries.filter((row) => assessmentType(row) === 'other_activity');
  return (
    <fieldset className="assessment-editor" disabled={disabled}>
      <legend className="sr-only">Proves i activitats del trimestre</legend>
      <div className="assessment-group-heading">
        <strong>Exàmens</strong>
        <Button
          type="button"
          onClick={() =>
            add(
              MAIN_ASSESSMENTS.find((key) => !entries.some((row) => assessmentType(row) === key)) ||
                'other_exam',
            )
          }
        >
          <Plus size={16} />
          Afegir prova
        </Button>
      </div>
      {table(exams)}
      <p className="assessment-hint">
        Activitats opcionals. Les caselles amb pes 0% no afecten la mitjana.
      </p>
      {activitySlots ? (
        <section className="extra-activity-editor" aria-label="Activitats extra de l’assignatura">
          <div className="assessment-group-heading">
            <strong>Activitats extra</strong>
            <Button type="button" onClick={() => add('other_activity')}>
              <Plus size={16} /> Afegir activitat
            </Button>
          </div>
          <p className="assessment-hint">
            Tria el tipus, posa-hi un nom i assigna el percentatge de cada activitat.
          </p>
          {table(
            entries.filter(
              (row) => row.category === 'activity' && (row.extra_slot || isConfiguredActivity(row)),
            ),
          )}
        </section>
      ) : (
        OPTIONAL_ASSESSMENTS.map((type) => {
          const rows = entries.filter((row) => assessmentType(row) === type.key),
            weight = rows.reduce((sum, row) => sum + Number(row.weight), 0);
          return (
            <details className="assessment-optional" key={type.key}>
              <summary>
                <strong>{type.plural}</strong>
                <span>
                  {rows.length} caselles · {numberLabel(weight, Number.isInteger(weight) ? 0 : 2)}%
                </span>
              </summary>
              {rows.length > 0 && table(rows)}
              <Button
                type="button"
                disabled={rows.length >= type.slots}
                onClick={() => add(type.key)}
              >
                <Plus size={16} />
                Afegir {type.label.toLocaleLowerCase('ca')}
              </Button>
            </details>
          );
        })
      )}
      {!activitySlots && other.length > 0 && (
        <details className="assessment-optional">
          <summary>
            <strong>Altres activitats</strong>
            <span>{other.length} caselles</span>
          </summary>
          {table(other)}
        </details>
      )}
      {!activitySlots && (
        <Button type="button" variant="ghost" onClick={() => add('other_activity')}>
          <Plus size={16} />
          Altra activitat
        </Button>
      )}
    </fieldset>
  );
}
