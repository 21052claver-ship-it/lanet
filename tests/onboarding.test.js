import test from 'node:test';
import assert from 'node:assert/strict';
import { onboardingDraft, readOnboarding, onboardingKey } from '../shared/onboarding.js';
import { OFFICIAL_OFFERINGS, curriculumChoices } from '../shared/official-schedule.js';
const model = { user: { id: 'local', role: 'student' }, offerings: OFFICIAL_OFFERINGS };
test('onboarding rejects corrupted, unknown and cross-group progress', () => {
  for (const value of [null, '', [], 5, { group: 'missing' }])
    assert.equal(onboardingDraft(model, value), null);
  const value = onboardingDraft(model, {
    group: '2A',
    choices: { science: { subject_id: 'phy', offering_id: '2B-phy-ruiz' } },
    step: 2,
  });
  assert.equal(value.choices.science.offering_id, '');
  assert.equal(value.step, 1);
});
test('onboarding preserves partial teacher choices and correct completed review', () => {
  const partial = onboardingDraft(model, {
    group: '2A',
    choices: { science: { subject_id: 'phy' } },
    step: 1,
  });
  assert.equal(partial.choices.science.subject_id, 'phy');
  assert.equal(partial.choices.science.offering_id, '');
  const ids = ['2B-math', '2B-phy-ruiz', '2B-eco', '2B-tech-tere', '2B-tutor-closa'];
  const value = onboardingDraft(model, {
    group: '2B',
    choices: curriculumChoices(model, '2B', ids),
    step: 2,
  });
  assert.equal(value.step, 2);
  assert.equal(value.choices.elective.offering_id, '2B-tech-tere');
});
test('onboarding respects delegate groups and clamps invalid steps', () => {
  assert.equal(
    onboardingDraft({ ...model, user: { role: 'delegate', group_id: '2C' } }, { group: '2A' }),
    null,
  );
  assert.equal(onboardingDraft(model, { group: '2A', step: -100 }).step, -1);
  assert.equal(onboardingDraft(model, { group: '2A', step: '2' }).step, 0);
});
test('unavailable or invalid session storage never blocks the form', () => {
  assert.equal(
    readOnboarding(model, {
      getItem() {
        throw Error('disabled');
      },
    }),
    null,
  );
  assert.equal(readOnboarding(model, { getItem: () => '{broken' }), null);
  assert.notEqual(onboardingKey('alice'), onboardingKey('bob'));
});
