import { useEffect, useRef, useState } from 'react';
import { createGradeWriter } from '../shared/grade-writer';

export function useGradeWrites(data, setData, mutate) {
  const latest = useRef(data),
    actions = useRef({ setData, mutate });
  latest.current = data;
  actions.current = { setData, mutate };
  const [state, setState] = useState({ busy: false, failed: [], canUndo: false });
  const [drafts, setDrafts] = useState({});
  const writer = useRef(null);
  if (!writer.current)
    writer.current = createGradeWriter({
      getGrade: (id) =>
        [...latest.current.grades, ...(latest.current.gradeBonuses || [])].find(
          (row) => row.id === id,
        )?.grade,
      save: (entries) =>
        actions.current.mutate('/grades/batch', { entries }, null, () => {
          const grades = new Map(entries.map((entry) => [entry.id, entry.grade]));
          const apply = (current) => ({
            ...current,
            grades: current.grades.map((row) =>
              grades.has(row.id) ? { ...row, grade: grades.get(row.id) } : row,
            ),
            gradeBonuses: (current.gradeBonuses || []).map((row) =>
              grades.has(row.id) ? { ...row, grade: grades.get(row.id) } : row,
            ),
          });
          latest.current = apply(latest.current);
          actions.current.setData(apply);
        }),
      onChange: setState,
    });
  useEffect(() => {
    const ids = new Set([...data.grades, ...(data.gradeBonuses || [])].map((row) => row.id));
    writer.current.reconcile(ids);
    setDrafts((current) =>
      Object.fromEntries(Object.entries(current).filter(([id]) => ids.has(id))),
    );
  }, [data.grades, data.gradeBonuses]);
  return {
    ...state,
    drafts,
    setDrafts,
    write: writer.current.write,
    retry: writer.current.retry,
    undo: writer.current.undo,
  };
}
