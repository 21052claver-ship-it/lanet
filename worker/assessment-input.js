import { ASSESSMENT_TYPES, assessmentType, assessmentDefinition } from '../shared/assessments.js';
import { choice, fail } from './utils.js';
export function assessmentInput(entry) {
  const assessment_type =
    entry.assessment_type === undefined
      ? assessmentType(entry)
      : choice(
          entry.assessment_type,
          ASSESSMENT_TYPES.map((type) => type.key),
        );
  const category = assessmentDefinition(assessment_type).category;
  if (entry.category !== undefined && entry.category !== category)
    fail(400, 'El tipus de prova no correspon a aquesta categoria.');
  return { assessment_type, category };
}
