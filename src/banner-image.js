import { cropRect } from '../shared/banner';

export async function exportBannerImage(draft) {
  const { image, width, height, crop, fit } = draft;
  const canvas = document.createElement('canvas');
  canvas.width = 1600;
  canvas.height = 900;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('No s’ha pogut preparar el retall. Torna-ho a provar.');
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = 'high';
  if (fit === 'contain') {
    const scale = Math.min(canvas.width / width, canvas.height / height);
    const w = width * scale,
      h = height * scale;
    context.drawImage(image, (canvas.width - w) / 2, (canvas.height - h) / 2, w, h);
  } else {
    const rect = cropRect(width, height, crop);
    context.drawImage(
      image,
      rect.x,
      rect.y,
      rect.width,
      rect.height,
      0,
      0,
      canvas.width,
      canvas.height,
    );
  }
  const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
  if (!blob) throw new Error('No s’ha pogut crear la imatge del cartell.');
  return new File([blob], 'cartell-retall.png', { type: 'image/png' });
}
