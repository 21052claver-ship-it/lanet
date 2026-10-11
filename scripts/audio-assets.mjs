import assert from 'node:assert/strict';
import { openSync, readSync, closeSync, statSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
export function assertAudioAssets(root = 'public/audio') {
  const files = readdirSync(root).filter((name) => /\.(mp3|ogg)$/.test(name));
  assert.ok(files.length >= 50, 'Falta la biblioteca de música.');
  for (const name of files) {
    const path = join(root, name),
      fd = openSync(path, 'r'),
      head = Buffer.alloc(12);
    try {
      readSync(fd, head, 0, 12, 0);
    } finally {
      closeSync(fd);
    }
    assert.ok(
      statSync(path).size > 100000,
      `Àudio absent o punter LFS: ${name}. Executa git lfs pull.`,
    );
    assert.ok(
      name.endsWith('.ogg')
        ? head.subarray(0, 4).toString() === 'OggS'
        : head.subarray(0, 3).toString() === 'ID3' || (head[0] === 255 && (head[1] & 224) === 224),
      `Àudio invàlid: ${name}.`,
    );
  }
  return files.length;
}
