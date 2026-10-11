import test from 'node:test';
import assert from 'node:assert/strict';
import {
  BANNER_ASPECT,
  DEFAULT_CROP,
  cropRect,
  cropFromRect,
  zoomCrop,
  moveCrop,
  resizeCrop,
  bannerMode,
  publicBanner,
} from '../shared/banner.js';
const close = (a, b) => assert.ok(Math.abs(a - b) < 0.000001, `${a} difereix de ${b}`);

test('Un cartell anònim omet identitat i camps interns de la resposta pública', () => {
  const banner = {
    id: 'banner-1',
    title: 'Hola',
    body: '',
    color: 'sage',
    amount: 10,
    previous_id: null,
    file_id: 'photo',
    day: '2026-10-10',
    created_at: '2026-10-10T12:00:00',
    anonymous: 1,
    author: 'Nom privat',
    author_id: 'private-account',
    email: 'private@example.test',
  };
  const visible = publicBanner(banner);
  assert.equal(visible.anonymous, true);
  assert.equal(visible.author, null);
  assert.equal(visible.id, banner.id);
  assert.equal(visible.file_id, banner.file_id);
  for (const secret of ['author_id', 'email']) assert.equal(secret in visible, false);
  for (const secret of ['Nom privat', 'private-account', 'private@example.test'])
    assert.equal(JSON.stringify(visible).includes(secret), false);
  assert.equal(banner.author, 'Nom privat');
});

test('Els cartells amb nom i els antics mantenen la signatura sense exposar el compte', () => {
  for (const anonymous of [undefined, 0, false]) {
    const visible = publicBanner({ id: 'named', author: 'Laia', author_id: 'account', anonymous });
    assert.equal(visible.anonymous, false);
    assert.equal(visible.author, 'Laia');
    assert.equal('author_id' in visible, false);
  }
  assert.equal(publicBanner(null), null);
  assert.equal(publicBanner(undefined), null);
});
function inside(width, height, rect) {
  assert.ok(rect.x >= -0.000001 && rect.y >= -0.000001);
  assert.ok(rect.x + rect.width <= width + 0.000001 && rect.y + rect.height <= height + 0.000001);
  close(rect.width / rect.height, BANNER_ASPECT);
}
test('Cartell sense títol amb imatge i formats antics compatibles', () => {
  assert.equal(bannerMode({ title: '', file_id: 'photo' }), 'image');
  assert.equal(bannerMode({ title: '   ', file_id: 'photo' }), 'image');
  assert.equal(bannerMode({ title: 'Hola', file_id: 'photo' }), 'mixed');
  assert.equal(bannerMode({ title: 'Hola' }), 'text');
  assert.equal(bannerMode(), 'text');
});
test('Retall 16:9 complet i centrat en fotos verticals, horitzontals i panoràmiques', () => {
  close(BANNER_ASPECT, 16 / 9);
  for (const [w, h] of [
    [1000, 1600],
    [1600, 1000],
    [6000, 400],
    [260, 44],
  ]) {
    const r = cropRect(w, h);
    inside(w, h, r);
    close(r.x + r.width / 2, w / 2);
    close(r.y + r.height / 2, h / 2);
    assert.ok(Math.abs(r.width - w) < 0.000001 || Math.abs(r.height - h) < 0.000001);
  }
});
test('Pan i zoom extrems no deixen zones fora de la foto', () => {
  for (const [w, h] of [
    [1000, 1600],
    [6000, 400],
  ])
    for (const zoom of [-100, 1, 2, 6, 900, NaN])
      for (const x of [-1, 0, 0.5, 1, 2, NaN])
        for (const y of [-1, 0, 1, 2, NaN]) inside(w, h, cropRect(w, h, { zoom, x, y }));
});
test('El zoom conserva el centre seleccionat quan hi ha espai', () => {
  const w = 1800,
    h = 1200,
    start = { x: 0.5, y: 0.7, zoom: 2 };
  const before = cropRect(w, h, start),
    after = cropRect(w, h, zoomCrop(w, h, start, 4));
  close(before.x + before.width / 2, after.x + after.width / 2);
  close(before.y + before.height / 2, after.y + after.height / 2);
});
test('Arrossegar i moure amb teclat arriba als límits sense saltar', () => {
  const moved = moveCrop(1800, 1200, DEFAULT_CROP, 100000, -100000);
  const r = cropRect(1800, 1200, moved);
  inside(1800, 1200, r);
  close(r.x + r.width, 1800);
  close(r.y, 0);
});
test('Nanses mantenen el cantó oposat i limiten ampliació i retall', () => {
  const w = 1800,
    h = 1200,
    start = { x: 0.4, y: 0.6, zoom: 2 },
    before = cropRect(w, h, start);
  for (const corner of ['nw', 'ne', 'sw', 'se']) {
    const left = corner.includes('w'),
      top = corner.includes('n');
    for (const point of [
      { x: 0, y: 0 },
      { x: 900, y: 600 },
      { x: 100000, y: -100000 },
    ]) {
      const after = cropRect(w, h, resizeCrop(w, h, start, corner, point));
      inside(w, h, after);
      close(left ? after.x + after.width : after.x, left ? before.x + before.width : before.x);
      close(top ? after.y + after.height : after.y, top ? before.y + before.height : before.y);
    }
  }
});
test('Anada i tornada de coordenades no modifica el retall', () => {
  for (const [w, h] of [
    [1000, 1600],
    [6000, 400],
  ]) {
    const r = cropRect(w, h, { x: 0.3, y: 0.8, zoom: 2.5 }),
      next = cropRect(w, h, cropFromRect(w, h, r));
    for (const k of ['x', 'y', 'width', 'height']) close(r[k], next[k]);
  }
  assert.throws(() => cropRect(0, 100));
});
