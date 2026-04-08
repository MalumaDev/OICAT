import { useEffect, useRef } from 'react';
import { useAppStore } from '../store/useAppStore';
import { computeDiff, DiffMode } from '../utils/computeDiff';

interface Props {
  compareDataUrl: string;
  baseDataUrl: string;
}

export function DiffOverlay({ compareDataUrl, baseDataUrl }: Props) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const cancelRef = useRef(false);

  const transform = useAppStore((s) => s.transform);
  const diffMode = useAppStore((s) => s.diffMode);
  const diffThreshold = useAppStore((s) => s.diffThreshold);

  useEffect(() => {
    cancelRef.current = false;

    const wrapper = wrapperRef.current;
    const canvas = canvasRef.current;
    if (!wrapper || !canvas) return;

    const rect = wrapper.getBoundingClientRect();
    const W = Math.round(rect.width);
    const H = Math.round(rect.height);

    if (W === 0 || H === 0) return;

    canvas.width = W;
    canvas.height = H;

    const ctx = canvas.getContext('2d')!;
    ctx.clearRect(0, 0, W, H);

    computeDiff(baseDataUrl, compareDataUrl, W, H, transform, diffMode as DiffMode, diffThreshold)
      .then((imageData) => {
        if (cancelRef.current) return;
        canvas.width = W;
        canvas.height = H;
        ctx.putImageData(imageData, 0, 0);
      })
      .catch((err) => console.error('[DiffOverlay] computeDiff error:', err));

    return () => { cancelRef.current = true; };
  }, [transform, diffMode, diffThreshold, baseDataUrl, compareDataUrl]);

  return (
    <div
      ref={wrapperRef}
      style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 5 }}
    >
      <canvas ref={canvasRef} style={{ display: 'block' }} />
    </div>
  );
}
