// Prepare a private, reviewable roster. Never store names/emails in source control.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve, relative, isAbsolute } from 'node:path';
import assert from 'node:assert/strict';
import { DELEGATION_UNITS } from '../shared/delegation.js';
const [input, output = '.cache/delegates/roster.sql'] = process.argv.slice(2);
assert.ok(input, 'Indica el JSON privat de representants.');
for (const path of [input, output]) {
  const rel = relative(resolve('.cache'), resolve(path));
  assert.ok(
    rel && !rel.startsWith('..') && !isAbsolute(rel),
    'El roster ha de quedar dins de .cache.',
  );
}
const members = JSON.parse(readFileSync(input, 'utf8'));
assert.ok(Array.isArray(members) && members.length > 0 && members.length <= 20);
const quote = (s) => "'" + s.replaceAll("'", "''") + "'";
const keys = new Set();
const statements = members.map((m) => {
  assert.ok(typeof m.email === 'string' && /^\d{5}\.claver@fje\.edu$/.test(m.email));
  assert.ok(typeof m.name === 'string' && m.name.length > 2 && m.name.length <= 150);
  assert.ok(DELEGATION_UNITS.some((u) => u.id === m.unit_id));
  assert.ok(['delegate', 'subdelegate'].includes(m.position));
  const key = m.email + '/' + m.unit_id;
  assert.ok(!keys.has(key), 'Representant duplicat.');
  keys.add(key);
  return `INSERT INTO delegation_members(email,unit_id,name,position,active) VALUES(${[m.email, m.unit_id, m.name, m.position].map(quote).join(',')},1) ON CONFLICT(email,unit_id) DO UPDATE SET name=excluded.name,position=excluded.position,active=1;`;
});
mkdirSync(resolve('.cache/delegates'), { recursive: true });
writeFileSync(output, statements.join('\n') + '\n');
console.log(
  JSON.stringify({
    prepared: members.length,
    path: output,
    executed: false,
    accountRolesChanged: false,
  }),
);
