import React, { useRef, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useAppStore, ViewTransform } from '../store/useAppStore';

interface Props {
  dataUrl: string | null;
  /** Override transform (used by ComparisonSlider to keep clip + transform in sync) */
  transformOverride?: ViewTransform;
  /** If true, wheel/drag events update the global store transform */
  interactive?: boolean;
}

const MIN_SCALE = 0.05;
const MAX_SCALE = 50;

export function ImageViewer({ dataUrl, transformOverride, interactive = true }: Props) {
  const { t } = useTranslation();
  const transform = useAppStore((s) => s.transform);
  const setTransform = useAppStore((s) => s.setTransform);

  const displayTransform = transformOverride ?? transform;

  const containerRef = useRef<HTMLDivElement>(null);
  const isPanning = useRef(false);
  const panStart = useRef({ mouseX: 0, mouseY: 0, tx: 0, ty: 0 });

  // Wheel → zoom (non-passive so we can preventDefault)
  useEffect(() => {
    if (!interactive) return;
    const el = containerRef.current;
    if (!el) return;

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = el.getBoundingClientRect();
      const cx = e.clientX - rect.left;
      const cy = e.clientY - rect.top;
      // Read freshest transform from store to avoid stale closure
      const { transform: cur } = useAppStore.getState();
      const factor = e.deltaY < 0 ? 1.12 : 1 / 1.12;
      const newScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, cur.scale * factor));
      const ratio = newScale / cur.scale;
      setTransform({
        scale: newScale,
        x: cx - (cx - cur.x) * ratio,
        y: cy - (cy - cur.y) * ratio,
      });
    };

    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [interactive, setTransform]);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (!interactive || e.button !== 0) return;
      e.preventDefault();
      isPanning.current = true;
      const { transform: cur } = useAppStore.getState();
      panStart.current = { mouseX: e.clientX, mouseY: e.clientY, tx: cur.x, ty: cur.y };

      const onMove = (ev: MouseEvent) => {
        if (!isPanning.current) return;
        const { transform: c } = useAppStore.getState();
        setTransform({
          scale: c.scale,
          x: panStart.current.tx + (ev.clientX - panStart.current.mouseX),
          y: panStart.current.ty + (ev.clientY - panStart.current.mouseY),
        });
      };

      const onUp = () => {
        isPanning.current = false;
        window.removeEventListener('mousemove', onMove);
        window.removeEventListener('mouseup', onUp);
      };

      window.addEventListener('mousemove', onMove);
      window.addEventListener('mouseup', onUp);
    },
    [interactive, setTransform]
  );

  if (!dataUrl) {
    return (
      <div className="image-viewer empty-viewer">
        <span className="empty-viewer-hint">{t('viewPanel.emptyHint')}</span>
      </div>
    );
  }

  const imgStyle: React.CSSProperties = {
    transform: `translate(${displayTransform.x}px, ${displayTransform.y}px) scale(${displayTransform.scale})`,
    transformOrigin: '0 0',
    position: 'absolute',
    top: 0,
    left: 0,
    maxWidth: 'none',
    maxHeight: 'none',
    userSelect: 'none',
    pointerEvents: 'none',
  };

  return (
    <div
      ref={containerRef}
      className="image-viewer"
      onMouseDown={handleMouseDown}
      style={{ cursor: interactive ? (isPanning.current ? 'grabbing' : 'grab') : 'default' }}
    >
      <img src={dataUrl} alt="" style={imgStyle} draggable={false} />
    </div>
  );
}
