import React, { useState } from 'react';
import { Check } from '@phosphor-icons/react';
import { SubjectMark, Button } from '../ui';
export default function SubjectPicker({
  subjects,
  value,
  onChange,
  label = 'Les meves assignatures',
  defaults = subjects.map((s) => s.id),
}) {
  const [query, setQuery] = useState('');
  return (
    <fieldset className="subject-picker">
      <legend>{label}</legend>
      <div className="subject-picker-tools">
        <input
          aria-label={'Cercar a ' + label}
          placeholder="Cerca una assignatura…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <Button type="button" variant="small" onClick={() => onChange(defaults)}>
          Les del meu curs
        </Button>
        <Button type="button" variant="small" onClick={() => onChange(subjects.map((s) => s.id))}>
          Totes
        </Button>
        <Button type="button" variant="small" onClick={() => onChange([])}>
          Cap
        </Button>
      </div>
      <div className="subject-picker-grid">
        {subjects
          .filter((s) => s.name.toLocaleLowerCase().includes(query.toLocaleLowerCase()))
          .map((s) => (
            <label
              className={'subject-choice ' + (value.includes(s.id) ? 'chosen' : '')}
              key={s.id}
            >
              <input
                type="checkbox"
                checked={value.includes(s.id)}
                onChange={(e) =>
                  onChange(e.target.checked ? [...value, s.id] : value.filter((id) => id !== s.id))
                }
              />
              <SubjectMark subject={s} />
              <span>{s.name}</span>
              {value.includes(s.id) && <Check size={17} aria-hidden="true" />}
            </label>
          ))}
      </div>
      <small>{value.length} assignatures seleccionades</small>
    </fieldset>
  );
}
