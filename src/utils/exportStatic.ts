import { useAppStore } from '../store/useAppStore';

export interface RasterSettings {
  scale: number;       // 1 | 2 | 3
  quality: number;     // 0.0–1.0, used for JPEG
  showLabels: boolean;
}

const LABEL_FONT_SIZE = 13;
const LABEL_PAD = 8;

function drawLabel(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, scale: number) {
  const fs = LABEL_FONT_SIZE * scale;
  const pad = LABEL_PAD * scale;
  ctx.font = `${fs}px system-ui, sans-serif`;
  const tw = ctx.measureText(text).width;
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  ctx.fillRect(x, y - fs - pad / 2, tw + pad * 2, fs + pad);
  ctx.fillStyle = '#e8e8e8';
  ctx.fillText(text, x + pad, y - pad / 2);
}

function loadImg(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

/** Returns a canvas rendered at the requested scale */
export async function renderSideBySideCanvas(settings: RasterSettings): Promise<HTMLCanvasElement> {
  const { views, images, transform } = useAppStore.getState();
  const GAP = 2;

  const panelBodies = Array.from(
    document.querySelectorAll('.view-panel-body')
  ) as HTMLElement[];
  if (!panelBodies.length) throw new Error('No panels found');

  const firstRect = panelBodies[0].getBoundingClientRect();
  const panelW = Math.round(firstRect.width * settings.scale);
  const panelH = Math.round(firstRect.height * settings.scale);
  const totalW = panelW * panelBodies.length + GAP * (panelBodies.length - 1);

  const canvas = document.createElement('canvas');
  canvas.width = totalW;
  canvas.height = panelH;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#1a1a1a';
  ctx.fillRect(0, 0, totalW, panelH);

  for (let i = 0; i < panelBodies.length; i++) {
    const view = views[i];
    if (!view?.imageId) continue;
    const imageData = images.find((img) => img.id === view.imageId);
    if (!imageData) continue;

    const img = await loadImg(imageData.dataUrl);
    const offsetX = i * (panelW + GAP);
    const s = settings.scale;

    ctx.save();
    ctx.beginPath();
    ctx.rect(offsetX, 0, panelW, panelH);
    ctx.clip();
    ctx.drawImage(
      img,
      offsetX + transform.x * s,
      transform.y * s,
      img.naturalWidth * transform.scale * s,
      img.naturalHeight * transform.scale * s
    );
    ctx.restore();

    if (settings.showLabels && view.label) {
      drawLabel(ctx, view.label, offsetX + 8, panelH - 8, settings.scale);
    }

    if (i > 0) {
      ctx.fillStyle = '#3a3a3a';
      ctx.fillRect(offsetX - GAP, 0, GAP, panelH);
    }
  }

  return canvas;
}

export async function renderSliderCanvas(settings: RasterSettings): Promise<HTMLCanvasElement> {
  const { sliderLeftId, sliderRightId, images, sliderPosition, transform } =
    useAppStore.getState();

  const sliderEl = document.querySelector('.comparison-slider') as HTMLElement;
  if (!sliderEl) throw new Error('Slider element not found');

  const rect = sliderEl.getBoundingClientRect();
  const s = settings.scale;
  const W = Math.round(rect.width * s);
  const H = Math.round(rect.height * s);

  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#1a1a1a';
  ctx.fillRect(0, 0, W, H);

  if (sliderRightId) {
    const imgData = images.find((i) => i.id === sliderRightId);
    if (imgData) {
      const img = await loadImg(imgData.dataUrl);
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, 0, W, H);
      ctx.clip();
      ctx.drawImage(img, transform.x * s, transform.y * s, img.naturalWidth * transform.scale * s, img.naturalHeight * transform.scale * s);
      ctx.restore();
    }
  }

  if (sliderLeftId) {
    const imgData = images.find((i) => i.id === sliderLeftId);
    if (imgData) {
      const img = await loadImg(imgData.dataUrl);
      const clipW = (sliderPosition / 100) * W;
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, 0, clipW, H);
      ctx.clip();
      ctx.drawImage(img, transform.x * s, transform.y * s, img.naturalWidth * transform.scale * s, img.naturalHeight * transform.scale * s);
      ctx.restore();

      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      ctx.fillRect(Math.round(clipW) - 1, 0, 2, H);

      if (settings.showLabels) {
        const leftName = images.find((i) => i.id === sliderLeftId)?.name ?? '';
        if (leftName) drawLabel(ctx, leftName, 8, H - 8, settings.scale);
      }
    }
  }

  if (settings.showLabels && sliderRightId) {
    const rightName = images.find((i) => i.id === sliderRightId)?.name ?? '';
    if (rightName) {
      const fs = LABEL_FONT_SIZE * settings.scale;
      const pad = LABEL_PAD * settings.scale;
      const ctx2 = canvas.getContext('2d')!;
      ctx2.font = `${fs}px system-ui, sans-serif`;
      const tw = ctx2.measureText(rightName).width;
      drawLabel(ctx2, rightName, W - tw - pad * 2 - 8, H - 8, settings.scale);
    }
  }

  return canvas;
}

export function canvasToUint8Array(canvas: HTMLCanvasElement, format: 'png' | 'jpeg', quality: number): Promise<Uint8Array> {
  const mime = format === 'jpeg' ? 'image/jpeg' : 'image/png';
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) { reject(new Error('toBlob failed')); return; }
        blob.arrayBuffer().then((buf) => resolve(new Uint8Array(buf)));
      },
      mime,
      quality
    );
  });
}
