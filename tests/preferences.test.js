import test from 'node:test';
import assert from 'node:assert/strict';
import { preferencesPatch, readPreferences } from '../shared/preferences.js';
test('Preferències: matrícula per defecte, cap assignatura explícita i selecció única', () => {
  assert.equal(readPreferences(null, ['math']).notesSubjects, null);
  assert.deepEqual(preferencesPatch({ notesSubjects: [] }, ['math']).notesSubjects, []);
  assert.deepEqual(preferencesPatch({ plusSubjects: ['math', 'math'] }, ['math']).plusSubjects, [
    'math',
  ]);
  assert.throws(() => preferencesPatch({ notesSubjects: ['unknown'] }, ['math']));
});
test('Preferències: rebutja claus, tipus i valors que no corresponen', () => {
  for (const patch of [
    { role: 'admin' },
    { density: 'tiny' },
    { showBoard: 'false' },
    { volume: NaN },
    { volume: 2 },
    { lofi: 'rain' },
  ])
    assert.throws(() => preferencesPatch(patch, []));
  assert.equal(readPreferences('not JSON', []).density, 'compact');
});
test('Mode discret: valor inicial visible, booleà estricte i persistència independent de la resta', () => {
  assert.equal(readPreferences(null, []).hideGrades, false);
  assert.deepEqual(preferencesPatch({ hideGrades: true }, []), { hideGrades: true });
  assert.equal(readPreferences('{"hideGrades":true,"volume":0.4}', []).hideGrades, true);
  assert.throws(() => preferencesPatch({ hideGrades: 'true' }, []));
  assert.throws(() => preferencesPatch({ hideGrades: 1 }, []));
});

test('El cartell és permanent encara que una preferència antiga o un client demanin amagar-lo', () => {
  const legacy = {
    showBoard: false,
    notesSubjects: ['math'],
    plusSubjects: [],
    hideGrades: true,
    sidebarCollapsed: true,
    density: 'comfortable',
    lofi: 'night',
    volume: 0.6,
  };
  assert.deepEqual(readPreferences(JSON.stringify(legacy), ['math']), {
    ...legacy,
    showBoard: true,
  });
  assert.deepEqual(preferencesPatch({ showBoard: false, hideGrades: true }, []), {
    showBoard: true,
    hideGrades: true,
  });
  assert.equal(readPreferences(null, []).showBoard, true);
});
