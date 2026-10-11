import test from 'node:test';
import assert from 'node:assert/strict';
import { matchesSearch, searchText } from '../shared/search.js';

test('cerca catalana independent d’accents, majúscules i apòstrofs', () => {
  assert.equal(searchText('  QUÍMICA  d’Avui\n'), "quimica d'avui");
  assert.equal(matchesSearch('quimica', 'Equilibri químic', 'Química'), true);
  assert.equal(matchesSearch("d'exercicis", 'Guia d’exercicis'), true);
});

test('les paraules poden aparèixer en camps diferents i en qualsevol ordre', () => {
  assert.equal(matchesSearch('  SOLER   derivades ', 'Derivades, pas a pas', 'Laia Soler'), true);
  assert.equal(matchesSearch('derivades pluja', 'Derivades, pas a pas', 'Laia Soler'), false);
});

test('cerca buida i camps opcionals no descarten publicacions', () => {
  assert.equal(matchesSearch(' \n ', null, undefined, 'Un apunt'), true);
  assert.equal(matchesSearch('null', null, undefined), false);
});
