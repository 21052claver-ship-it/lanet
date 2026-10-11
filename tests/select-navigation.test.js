import { test } from 'node:test';
import assert from 'node:assert/strict';
import { nextEnabledOption } from '../shared/select-navigation.js';

const options = [{ disabled: true }, {}, { disabled: true }, {}, { disabled: true }];
test('keyboard navigation skips disabled subjects in the requested direction', () => {
  assert.equal(nextEnabledOption(options, 1, 'ArrowDown'), 3);
  assert.equal(nextEnabledOption(options, 3, 'ArrowUp'), 1);
  assert.equal(nextEnabledOption(options, 1, 'ArrowUp'), 3);
  assert.equal(nextEnabledOption(options, 3, 'ArrowDown'), 1);
});
test('Home and End reach the first and last available subject', () => {
  assert.equal(nextEnabledOption(options, 3, 'Home'), 1);
  assert.equal(nextEnabledOption(options, 1, 'End'), 3);
});
test('empty or fully disabled selectors cannot open an unavailable choice', () => {
  for (const key of ['ArrowDown', 'ArrowUp', 'Home', 'End']) {
    assert.equal(nextEnabledOption([], 0, key), -1);
    assert.equal(nextEnabledOption([{ disabled: true }], 0, key), -1);
  }
});
