import { ViewTransform } from '../store/useAppStore';

export type DiffMode = 'diff' | 'heatmap';

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = (e) => reject(new Error(`Failed to load image: ${e}`));
    img.src = src;
    // If already complete (cached), onload won't fire
    if (img.complete && img.naturalWidth > 0) resolve(img);
  });
}

function drawImageToCanvas(
  img: HTMLImageElement,
  W: number,
  H: number,
  transform: ViewTransform
): ImageData {
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
  ctx.fillStyle = '#1a1a1a';
  ctx.fillRect(0, 0, W, H);
  ctx.drawImage(
    img,
    transform.x,
    transform.y,
    img.naturalWidth * transform.scale,
    img.naturalHeight * transform.scale
  );
  return ctx.getImageData(0, 0, W, H);
}

function heatmapColor(v: number): [number, number, number] {
  if (v < 128) {
    const t = v / 128;
    return [0, Math.round(t * 255), Math.round((1 - t) * 255)];
  }
  const t = (v - 128) / 127;
  return [Math.round(t * 255), Math.round((1 - t) * 255), 0];
}

export async function computeDiff(
  baseDataUrl: string,
  compareDataUrl: string,
  W: number,
  H: number,
  transform: ViewTransform,
  mode: DiffMode,
  threshold: number
): Promise<ImageData> {
  const [baseImg, cmpImg] = await Promise.all([
    loadImage(baseDataUrl),
    loadImage(compareDataUrl),
  ]);

  const baseData = drawImageToCanvas(baseImg, W, H, transform);
  const cmpData = drawImageToCanvas(cmpImg, W, H, transform);

  const out = new ImageData(W, H);
  const b = baseData.data;
  const c = cmpData.data;
  const o = out.data;

  for (let i = 0; i < b.length; i += 4) {
    const dr = Math.abs(b[i] - c[i]);
    const dg = Math.abs(b[i + 1] - c[i + 1]);
    const db = Math.abs(b[i + 2] - c[i + 2]);
    const delta = (dr + dg + db) / 3;

    if (delta <= threshold) {
      o[i + 3] = 0; // transparent
    } else {
      const norm = Math.min(255, ((delta - threshold) / (255 - threshold)) * 255);
      if (mode === 'diff') {
        o[i] = 220; o[i + 1] = 50; o[i + 2] = 50;
        o[i + 3] = Math.round(80 + (norm / 255) * 160);
      } else {
        const [r, g, bv] = heatmapColor(norm);
        o[i] = r; o[i + 1] = g; o[i + 2] = bv;
        o[i + 3] = Math.round(60 + (norm / 255) * 180);
      }
    }
  }

  return out;
}
