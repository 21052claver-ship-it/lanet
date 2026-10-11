export const BANNER_ASPECT = 16 / 9;
export const BANNER_SLOTS = Object.freeze([1, 2, 3]);
export function bannerSpaces(data) {
  return (
    data.bannerSlots ||
    BANNER_SLOTS.map((slot) => ({
      slot,
      banner: slot === 1 ? data.banner : null,
      minBid: slot === 1 ? data.minBid : 1,
    }))
  );
}
export const MAX_CROP_ZOOM = 6;
export const DEFAULT_CROP = Object.freeze({ x: 0.5, y: 0.5, zoom: 1 });
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const finite = (value, fallback) => (Number.isFinite(value) ? value : fallback);

// Public projection: account linkage is only used internally for billing and
// moderation. Never return it with the announcement, even to its own author.
export function publicBanner(banner) {
  if (!banner) return null;
  const anonymous = !!banner.anonymous;
  return {
    id: banner.id,
    slot: banner.slot || 1,
    title: banner.title,
    body: banner.body,
    color: banner.color,
    amount: banner.amount,
    previous_id: banner.previous_id,
    file_id: banner.file_id,
    day: banner.day,
    created_at: banner.created_at,
    anonymous,
    author: anonymous ? null : banner.author,
  };
}

export function bannerMode({ title, file_id: fileId } = {}) {
  return fileId ? (title?.trim() ? 'mixed' : 'image') : 'text';
}

export function cropRect(width, height, crop = DEFAULT_CROP) {
  if (!(width > 0 && height > 0)) throw new Error('La imatge no té una mida vàlida.');
  const zoom = clamp(finite(crop.zoom, 1), 1, MAX_CROP_ZOOM);
  const baseWidth = Math.min(width, height * BANNER_ASPECT);
  const w = baseWidth / zoom,
    h = w / BANNER_ASPECT;
  return {
    x: (width - w) * clamp(finite(crop.x, 0.5), 0, 1),
    y: (height - h) * clamp(finite(crop.y, 0.5), 0, 1),
    width: w,
    height: h,
  };
}

export function cropFromRect(width, height, rect) {
  const baseWidth = Math.min(width, height * BANNER_ASPECT);
  const w = clamp(rect.width, baseWidth / MAX_CROP_ZOOM, baseWidth);
  const h = w / BANNER_ASPECT;
  return {
    x: width - w > 0.000001 ? clamp(rect.x / (width - w), 0, 1) : 0.5,
    y: height - h > 0.000001 ? clamp(rect.y / (height - h), 0, 1) : 0.5,
    zoom: baseWidth / w,
  };
}

export function zoomCrop(width, height, crop, zoom) {
  const before = cropRect(width, height, crop);
  const next = cropRect(width, height, { ...crop, zoom });
  return cropFromRect(width, height, {
    ...next,
    x: before.x + before.width / 2 - next.width / 2,
    y: before.y + before.height / 2 - next.height / 2,
  });
}

export function moveCrop(width, height, crop, dx, dy) {
  const rect = cropRect(width, height, crop);
  return cropFromRect(width, height, { ...rect, x: rect.x + dx, y: rect.y + dy });
}

export function resizeCrop(width, height, crop, corner, point) {
  const rect = cropRect(width, height, crop);
  const left = corner.includes('w'),
    top = corner.includes('n');
  const anchorX = left ? rect.x + rect.width : rect.x;
  const anchorY = top ? rect.y + rect.height : rect.y;
  const baseWidth = Math.min(width, height * BANNER_ASPECT);
  const availableW = left ? anchorX : width - anchorX;
  const availableH = top ? anchorY : height - anchorY;
  const desired = Math.max(
    left ? anchorX - point.x : point.x - anchorX,
    (top ? anchorY - point.y : point.y - anchorY) * BANNER_ASPECT,
  );
  const w = clamp(
    desired,
    baseWidth / MAX_CROP_ZOOM,
    Math.min(baseWidth, availableW, availableH * BANNER_ASPECT),
  );
  const h = w / BANNER_ASPECT;
  return cropFromRect(width, height, {
    x: left ? anchorX - w : anchorX,
    y: top ? anchorY - h : anchorY,
    width: w,
    height: h,
  });
}
