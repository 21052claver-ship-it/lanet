import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  readLocalJSON,
  writeLocalJSON,
  removeLocalValue,
  removeLocalJSONIfUnchanged,
} from '../shared/local-state.js';

test('blocked browser storage never interrupts editing or timer updates', () => {
  const storage = {
    getItem() {
      throw new Error('blocked');
    },
    setItem() {
      throw new Error('quota');
    },
    removeItem() {
      throw new Error('blocked');
    },
  };
  assert.deepEqual(readLocalJSON('draft', { title: '' }, storage), { title: '' });
  assert.equal(writeLocalJSON('draft', { title: 'Idea' }, storage), false);
  assert.equal(removeLocalValue('draft', storage), false);
  assert.equal(removeLocalJSONIfUnchanged('draft', {}, storage), false);
});

test('a late confirmation clears only its own unchanged draft', () => {
  const values = new Map();
  const storage = {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key),
  };
  const submitted = { title: 'Primera idea', files: [] };
  const newer = { title: 'Segona idea', files: [{ id: 'new' }] };
  writeLocalJSON('draft', submitted, storage);
  writeLocalJSON('other-user', newer, storage);
  assert.equal(removeLocalJSONIfUnchanged('draft', submitted, storage), true);
  assert.deepEqual(readLocalJSON('other-user', null, storage), newer);
  writeLocalJSON('draft', newer, storage);
  assert.equal(removeLocalJSONIfUnchanged('draft', submitted, storage), false);
  assert.deepEqual(readLocalJSON('draft', null, storage), newer);
});

test('a malformed or absent cache falls back without affecting other keys', () => {
  for (const value of ['{broken', null, 'null'])
    assert.equal(readLocalJSON('timer', 'fresh', { getItem: () => value }), 'fresh');
});

test('a proposal draft can be remembered, recovered and cleared after publishing', () => {
  const values = new Map();
  const storage = {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key),
  };
  const draft = { title: 'Una idea', body: 'Amb accents', files: [{ id: 'own-file' }] };
  assert.equal(writeLocalJSON('draft-own-user', draft, storage), true);
  assert.deepEqual(readLocalJSON('draft-own-user', {}, storage), draft);
  assert.equal(removeLocalValue('draft-own-user', storage), true);
  assert.deepEqual(readLocalJSON('draft-own-user', {}, storage), {});
});
