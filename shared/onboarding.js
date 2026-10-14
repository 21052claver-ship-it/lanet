import {
  SCHEDULE_VERSION,
  OFFICIAL_ROUTES,
  curriculumChoices,
  officialOfferings,
  selectedCurriculum,
  curriculumIssues,
} from './official-schedule.js';

export const onboardingKey = (userId) => `lanet:onboarding:${userId}:${SCHEDULE_VERSION}`;

// Session-local, per-account progress. Treat stored values as untrusted input.
export function onboardingDraft(catalog, value) {
  const route = OFFICIAL_ROUTES.find((r) => r.id === value?.group);
  if (!route || (catalog.user.role === 'delegate' && route.id !== catalog.user.group_id))
    return null;
  const offers = officialOfferings(catalog, route.id);
  const choices = curriculumChoices(catalog, route.id);
  for (const block of route.blocks) {
    const saved = value.choices?.[block.id];
    const variants = offers.filter(
      (o) => o.block === block.id && o.subject_id === saved?.subject_id,
    );
    if (!variants.length) continue;
    choices[block.id] = {
      subject_id: saved.subject_id,
      offering_id:
        variants.find((o) => o.id === saved.offering_id)?.id ||
        (variants.length === 1 ? variants[0].id : ''),
    };
  }
  let step = Number.isInteger(value.step) ? Math.max(-1, Math.min(2, value.step)) : 0;
  if (
    step === 2 &&
    curriculumIssues(catalog, route.id, selectedCurriculum(catalog, route.id, choices)).length
  )
    step = 1;
  return { group: route.id, choices, step };
}

export function readOnboarding(catalog, storage) {
  try {
    return onboardingDraft(catalog, JSON.parse(storage.getItem(onboardingKey(catalog.user.id))));
  } catch {
    return null;
  }
}
