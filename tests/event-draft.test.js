import { test } from 'node:test';
import assert from 'node:assert/strict';
import { recoverEventDraft } from '../shared/event-draft.js';

test('unusable stored values do not replace a new event', () => {
  for (const value of [null, undefined, false, 37, 'old', [], {}, { title: 37, date: 'broken' }])
    assert.equal(recoverEventDraft(value), null);
});

test('a damaged draft recovers valid text without restoring metadata or invalid field types', () => {
  assert.deepEqual(
    recoverEventDraft({
      title: 'Tasca a recuperar',
      body: true,
      room: null,
      date: '2026-02-30',
      start: '99:99',
      end: {},
      subject_id: 'math',
      offering_id: 3,
      visibility: 'unknown',
      kind: 'toString',
      audience_kind: [],
      id: 'other-event',
      contextual: true,
      fromDelegatePanel: true,
      review_status: 'approved',
    }),
    { title: 'Tasca a recuperar', subject_id: 'math' },
  );
});

test('valid private and public drafts keep their editable fields', () => {
  for (const visibility of ['private', 'shared']) {
    const draft = {
      title: 'Parcial de química',
      body: 'Temes 1–3',
      room: 'Laboratori',
      date: '2028-02-29',
      start: '09:10',
      end: '10:10',
      subject_id: 'chem',
      offering_id: '2B-chem-biosca',
      visibility,
      kind: 'exam',
      audience_kind: 'offering',
    };
    assert.deepEqual(recoverEventDraft(draft), draft);
  }
});

test('an intentionally incomplete draft remains editable', () => {
  const draft = {
    title: '',
    date: '',
    start: '',
    end: '',
    body: '',
    room: '',
    subject_id: '',
    offering_id: '',
  };
  assert.deepEqual(recoverEventDraft(draft), draft);
});

test('a restored end time needs a valid earlier start', () => {
  for (const [start, end] of [
    ['', '10:10'],
    ['10:10', '10:10'],
    ['11:40', '10:10'],
    ['broken', '10:10'],
  ])
    assert.equal(recoverEventDraft({ title: 'Tasca', start, end }).end, '');
});

test('restored text fits the editor limits', () => {
  const draft = recoverEventDraft({
    title: 't'.repeat(151),
    body: 'b'.repeat(6001),
    room: 'r'.repeat(121),
  });
  assert.equal(draft.title.length, 150);
  assert.equal(draft.body.length, 6000);
  assert.equal(draft.room.length, 120);
});
