import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, copyFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, dirname, basename } from 'node:path';
import { spawnSync } from 'node:child_process';

test('Checklist: evidencia invalida no marca tasca verificada ni escriu historial', () => {
  const root = mkdtempSync(join(tmpdir(), 'lanet-tracker-'));
  try {
    mkdirSync(join(root, 'docs'));
    mkdirSync(join(root, 'scripts'));
    copyFileSync(resolve('scripts/track-task.mjs'), join(root, 'scripts/track-task.mjs'));
    const plan = JSON.stringify({ tasks: [{ id: 'T', status: 'active' }] });
    const history = '# History\n';
    writeFileSync(join(root, 'docs/SEGUIMENT.json'), plan);
    writeFileSync(join(root, 'docs/HISTORIAL-CANVIS.md'), history);
    for (const evidence of ['missing.json', '../outside.json', 'docs']) {
      const result = spawnSync(
        process.execPath,
        ['scripts/track-task.mjs', 'done', 'T', 'Summary', evidence],
        { cwd: root, encoding: 'utf8', windowsHide: true },
      );
      assert.notEqual(result.status, 0);
      assert.match(result.stderr, /Evidència absent o fora del projecte/);
      assert.equal(readFileSync(join(root, 'docs/SEGUIMENT.json'), 'utf8'), plan);
      assert.equal(readFileSync(join(root, 'docs/HISTORIAL-CANVIS.md'), 'utf8'), history);
    }
  } finally {
    assert.equal(dirname(root), resolve(tmpdir()));
    assert.ok(basename(root).startsWith('lanet-tracker-'));
    rmSync(root, { recursive: true, force: true });
  }
});
