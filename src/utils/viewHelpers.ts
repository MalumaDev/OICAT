import { useAppStore } from '../store/useAppStore';

/**
 * Fit the first-panel image inside its container.
 * If no image is loaded, falls back to resetTransform.
 */
export function fitToWindow() {
  const { views, images, setTransform, resetTransform } = useAppStore.getState();
  const panel = views.find((v) => v.imageId);
  if (!panel?.imageId) { resetTransform(); return; }

  const imgData = images.find((i) => i.id === panel.imageId);
  if (!imgData) { resetTransform(); return; }

  const body = document.querySelector('.view-panel-body') as HTMLElement;
  if (!body) { resetTransform(); return; }

  const { width: pw, height: ph } = body.getBoundingClientRect();

  const img = new Image();
  img.onload = () => {
    const scale = Math.min(pw / img.naturalWidth, ph / img.naturalHeight);
    const x = (pw - img.naturalWidth * scale) / 2;
    const y = (ph - img.naturalHeight * scale) / 2;
    setTransform({ scale, x, y });
  };
  img.src = imgData.dataUrl;
}

/** Reset zoom to 100%, centered in the first panel. */
export function actualSize() {
  const { views, images, setTransform, resetTransform } = useAppStore.getState();
  const panel = views.find((v) => v.imageId);
  if (!panel?.imageId) { resetTransform(); return; }

  const body = document.querySelector('.view-panel-body') as HTMLElement;
  if (!body) { resetTransform(); return; }

  const { width: pw, height: ph } = body.getBoundingClientRect();
  const imgData = images.find((i) => i.id === panel.imageId);
  if (!imgData) { resetTransform(); return; }

  const img = new Image();
  img.onload = () => {
    const x = (pw - img.naturalWidth) / 2;
    const y = (ph - img.naturalHeight) / 2;
    setTransform({ scale: 1, x, y });
  };
  img.src = imgData.dataUrl;
}

/** Set an explicit zoom level (e.g. 1.5 = 150%), keeping the view centered. */
export function zoomTo(targetScale: number) {
  const { transform, setTransform } = useAppStore.getState();
  const body = document.querySelector('.view-panel-body') as HTMLElement;
  if (!body) return;
  const { width: pw, height: ph } = body.getBoundingClientRect();
  const cx = pw / 2;
  const cy = ph / 2;
  const ratio = targetScale / transform.scale;
  setTransform({
    scale: targetScale,
    x: cx - (cx - transform.x) * ratio,
    y: cy - (cy - transform.y) * ratio,
  });
}
