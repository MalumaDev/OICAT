import { useAppStore } from '../store/useAppStore';

function escHtml(s: string) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

export interface SvgSettings {
  scale: number; // 1 | 2 | 3 (logical resolution multiplier)
  showLabels: boolean;
}

function labelOverlay(text: string, x: number, y: number, anchor: 'start' | 'end' = 'start'): string {
  const pad = 8, fs = 13;
  // We don't know exact text width in SVG without measuring, so use a reasonable estimate
  const estW = text.length * 7.5 + pad * 2;
  const rx = anchor === 'end' ? x - estW : x;
  return `<rect x="${rx}" y="${y - fs - pad / 2}" width="${estW}" height="${fs + pad}" fill="rgba(0,0,0,0.55)" rx="2" />
      <text x="${rx + pad}" y="${y - pad / 2}" font-size="${fs}" fill="#e8e8e8" font-family="system-ui, sans-serif">${escHtml(text)}</text>`;
}

function panelLayer(dataUrl: string, tx: number, ty: number, scale: number, _w: number, _h: number, imgNW: number, imgNH: number): string {
  const iw = imgNW * scale;
  const ih = imgNH * scale;
  return `<image href="${dataUrl}" x="${tx}" y="${ty}" width="${iw}" height="${ih}" preserveAspectRatio="none" />`;
}

function loadImgDimensions(dataUrl: string): Promise<{ w: number; h: number }> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve({ w: img.naturalWidth, h: img.naturalHeight });
    img.src = dataUrl;
  });
}

export async function renderSideBySideSvg(settings: SvgSettings): Promise<string> {
  const { views, images, transform } = useAppStore.getState();
  const GAP = 2;
  const s = settings.scale;

  const panelBodies = Array.from(
    document.querySelectorAll('.view-panel-body')
  ) as HTMLElement[];
  if (!panelBodies.length) throw new Error('No panels found');

  const firstRect = panelBodies[0].getBoundingClientRect();
  const panelW = Math.round(firstRect.width * s);
  const panelH = Math.round(firstRect.height * s);
  const totalW = panelW * panelBodies.length + GAP * (panelBodies.length - 1);

  const layers: string[] = [];

  for (let i = 0; i < panelBodies.length; i++) {
    const view = views[i];
    if (!view?.imageId) continue;
    const imageData = images.find((img) => img.id === view.imageId);
    if (!imageData) continue;

    const { w: nw, h: nh } = await loadImgDimensions(imageData.dataUrl);
    const offsetX = i * (panelW + GAP);

    layers.push(`
    <g>
      <clipPath id="clip-${i}">
        <rect x="${offsetX}" y="0" width="${panelW}" height="${panelH}" />
      </clipPath>
      <rect x="${offsetX}" y="0" width="${panelW}" height="${panelH}" fill="#1a1a1a" />
      <g clip-path="url(#clip-${i})">
        ${panelLayer(imageData.dataUrl, offsetX + transform.x * s, transform.y * s, transform.scale * s, panelW, panelH, nw, nh)}
      </g>
      ${settings.showLabels && view.label ? labelOverlay(view.label, offsetX + 8, panelH - 8) : ''}
    </g>`);

    if (i > 0) {
      layers.push(`<rect x="${offsetX - GAP}" y="0" width="${GAP}" height="${panelH}" fill="#3a3a3a" />`);
    }
  }

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"
     width="${totalW}" height="${panelH}" viewBox="0 0 ${totalW} ${panelH}">
  <rect width="${totalW}" height="${panelH}" fill="#1a1a1a" />
  ${layers.join('\n  ')}
</svg>`;
}

export async function renderSliderSvg(settings: SvgSettings): Promise<string> {
  const { sliderLeftId, sliderRightId, images, sliderPosition, transform } =
    useAppStore.getState();

  const sliderEl = document.querySelector('.comparison-slider') as HTMLElement;
  if (!sliderEl) throw new Error('Slider element not found');

  const rect = sliderEl.getBoundingClientRect();
  const s = settings.scale;
  const W = Math.round(rect.width * s);
  const H = Math.round(rect.height * s);
  const clipW = (sliderPosition / 100) * W;

  const layers: string[] = [];

  if (sliderRightId) {
    const imgData = images.find((i) => i.id === sliderRightId);
    if (imgData) {
      const { w: nw, h: nh } = await loadImgDimensions(imgData.dataUrl);
      layers.push(`
    <g>
      <clipPath id="clip-right"><rect x="0" y="0" width="${W}" height="${H}" /></clipPath>
      <g clip-path="url(#clip-right)">
        ${panelLayer(imgData.dataUrl, transform.x * s, transform.y * s, transform.scale * s, W, H, nw, nh)}
      </g>
    </g>`);
    }
  }

  if (sliderLeftId) {
    const imgData = images.find((i) => i.id === sliderLeftId);
    if (imgData) {
      const { w: nw, h: nh } = await loadImgDimensions(imgData.dataUrl);
      layers.push(`
    <g>
      <clipPath id="clip-left"><rect x="0" y="0" width="${clipW}" height="${H}" /></clipPath>
      <g clip-path="url(#clip-left)">
        ${panelLayer(imgData.dataUrl, transform.x * s, transform.y * s, transform.scale * s, W, H, nw, nh)}
      </g>
    </g>
    <line x1="${clipW}" y1="0" x2="${clipW}" y2="${H}" stroke="rgba(255,255,255,0.85)" stroke-width="2" />
    ${settings.showLabels ? labelOverlay(imgData.name, 8, H - 8) : ''}`);
    }
  }

  if (settings.showLabels && sliderRightId) {
    const rightData = images.find((i) => i.id === sliderRightId);
    if (rightData) {
      layers.push(labelOverlay(rightData.name, W - 8, H - 8, 'end'));
    }
  }

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"
     width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <rect width="${W}" height="${H}" fill="#1a1a1a" />
  ${layers.join('\n  ')}
</svg>`;
}
