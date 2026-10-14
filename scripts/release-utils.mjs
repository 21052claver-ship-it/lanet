import assert from 'node:assert/strict';
export const RELEASE_REPOSITORY = '21052claver-ship-it/lanet';
export function releaseNotes(changelog, version) {
  assert.match(version, /^\d+\.\d+\.\d+(?:-[a-zA-Z0-9.-]+)?$/, 'Versió SemVer invàlida.');
  const start = changelog.indexOf(`## [${version}] - `);
  assert.ok(start >= 0, 'Falta entrada de la versió a CHANGELOG.md.');
  const end = changelog.indexOf('\n## ', start + 4);
  const notes = changelog.slice(start, end < 0 ? undefined : end).trim();
  assert.match(notes, /\n- \S/, 'Cal descriure els canvis.');
  return notes;
}
export function validateRelease({
  login,
  remote,
  branch,
  dirty,
  localSha,
  remoteSha,
  version,
  lockVersion,
  run,
}) {
  assert.equal(login, '21052claver-ship-it', 'La sessió GitHub no és el compte autoritzat.');
  assert.equal(remote, `https://github.com/${RELEASE_REPOSITORY}.git`, 'Repositori inesperat.');
  assert.equal(branch, 'main', 'Només es publica main.');
  assert.equal(dirty, '', 'Cal commit i arbre net abans de publicar.');
  assert.match(localSha, /^[a-f0-9]{40}$/);
  assert.equal(remoteSha, localSha, 'GitHub main no coincideix amb el codi local.');
  assert.equal(lockVersion, version, 'package-lock i package.json han de tenir la mateixa versió.');
  assert.equal(run?.headSha, localSha, 'La CI ha de comprovar el mateix commit.');
  assert.equal(run?.status, 'completed', 'La CI encara no ha acabat.');
  assert.equal(run?.conclusion, 'success', 'La CI ha de ser verda.');
}
