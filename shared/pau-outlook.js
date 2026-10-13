import { courseGrade } from './course-grades.js';
import { emptyPau, pauAdmission, roundPau, validatePau } from './pau.js';

// Only explicit curriculum mappings; language courses are not literature exams.
export const PAU_COURSE_SUBJECTS = {
  math: 'math',
  smath: 'social-math',
  phy: 'physics',
  chem: 'chemistry',
  bio: 'biology',
  tech: 'technology',
  dt: 'technical-drawing',
  eco: 'business',
  geo: 'geography',
  latin: 'latin',
  greek: 'greek',
  art: 'art-history',
  lit: 'catalan-literature',
};
export function currentPauProfile(data, enrolled) {
  const subjects = enrolled
    .filter((subject) => subject.assessed !== 0)
    .map((subject) => {
      const entries = (data.grades || []).filter((e) => e.subject_id === subject.id);
      const result = courseGrade(
        entries,
        (data.gradeBonuses || []).filter((b) => b.subject_id === subject.id),
        (data.courseSettings || []).find((s) => s.subject_id === subject.id),
      );
      const grade = result.total === null ? null : Math.max(0, Math.min(10, result.total));
      const coverage = result.terms.reduce(
        (sum, t) =>
          sum + (t.total > 0 ? t.weight * Math.min(1, Math.max(0, t.evaluated / t.total)) : 0),
        0,
      );
      return {
        id: subject.id,
        name: subject.name || subject.short,
        grade,
        pauId: PAU_COURSE_SUBJECTS[subject.id] || null,
        coverage,
      };
    });
  const known = subjects.filter((s) => s.grade !== null);
  return {
    subjects,
    known: known.length,
    total: subjects.length,
    average: known.length
      ? roundPau(known.reduce((sum, s) => sum + s.grade, 0) / known.length)
      : null,
    coverage: subjects.length
      ? Math.round(subjects.reduce((sum, s) => sum + s.coverage, 0) / subjects.length)
      : 0,
  };
}
export function degreeOutlook(draft, degree, profile, round = 'latest') {
  const cutoff = round === 'first' ? degree.firstCutoff : degree.cutoff;
  const missing = (reason) => ({
    ready: false,
    reason,
    cutoff: typeof cutoff === 'number' ? cutoff : null,
    total: null,
    percent: null,
    gap: null,
    reaches: null,
    best: [],
  });
  try {
    draft = validatePau(draft);
  } catch {
    return missing('invalid');
  }
  if (!degree.weights[String(draft.year)]) return missing('weights');
  let result;
  if (draft.orientationSource === 'simulation') {
    result = pauAdmission(draft, degree, round);
    if (result.total === null) return missing('simulation');
  } else {
    if (draft.route !== 'batx') return missing('cfgs');
    if (profile.average === null) return missing('grades');
    // Explicit scenario: current subject mean repeated in batx + compulsory PAU.
    // Optional PAU subjects retain each mapped subject's provisional course mark.
    const candidates = profile.subjects.filter((s) => s.pauId && s.grade !== null);
    const proxy = {
      ...emptyPau(),
      year: draft.year,
      average: profile.average,
      general: profile.average,
      modalityGrade: null,
      subjects: candidates.map((s) => ({
        id: s.pauId,
        grade: roundPau(s.grade),
        year: draft.year,
      })),
    };
    result = pauAdmission(proxy, degree, round);
    if (result.total === null) return missing('minimum');
  }
  if (typeof cutoff !== 'number' || cutoff <= 0) return missing('cutoff');
  return {
    ready: true,
    reason: '',
    cutoff,
    total: result.total,
    // Reserve 100% for a reached cutoff, even when rounding a near miss.
    percent: Math.min(
      result.total >= cutoff ? 100 : 99,
      Math.max(0, Math.round((result.total / cutoff) * 100)),
    ),
    gap: roundPau(result.total - cutoff),
    reaches: result.total >= cutoff,
    best: result.best,
  };
}
