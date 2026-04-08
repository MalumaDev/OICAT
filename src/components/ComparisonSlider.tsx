import React, { useRef, useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAppStore } from '../store/useAppStore';
import { ImageViewer } from './ImageViewer';

const MIN_SCALE = 0.05;
const MAX_SCALE = 50;

export function ComparisonSlider() {
  const { t } = useTranslation();
  const images = useAppStore((s) => s.images);
  const sliderPosition = useAppStore((s) => s.sliderPosition);
  const sliderLeftId = useAppStore((s) => s.sliderLeftId);
  const sliderRightId = useAppStore((s) => s.sliderRightId);
  const setSliderPosition = useAppStore((s) => s.setSliderPosition);
  const setSliderImage = useAppStore((s) => s.setSliderImage);
  const setTransform = useAppStore((s) => s.setTransform);
  const transform = useAppStore((s) => s.transform);

  const leftImage = images.find((img) => img.id === sliderLeftId) ?? null;
  const rightImage = images.find((img) => img.id === sliderRightId) ?? null;

  const containerRef = useRef<HTMLDivElement>(null);
  const isPanning = useRef(false);
  const panStart = useRef({ mouseX: 0, mouseY: 0, tx: 0, ty: 0 });

  // ── Wheel → zoom (non-passive) ──────────────────────────────────────────
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = el.getBoundingClientRect();
      const cx = e.clientX - rect.left;
      const cy = e.clientY - rect.top;
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
  }, [setTransform]);

  // ── Container mousedown → pan ────────────────────────────────────────────
  const handleContainerMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (e.button !== 0) return;
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
    [setTransform]
  );

  // ── Handle mousedown → move slider divider ───────────────────────────────
  const handleGripMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation(); // don't trigger pan

      const onMove = (ev: MouseEvent) => {
        const rect = containerRef.current?.getBoundingClientRect();
        if (!rect) return;
        const pos = Math.max(0, Math.min(100, ((ev.clientX - rect.left) / rect.width) * 100));
        setSliderPosition(pos);
      };
      const onUp = () => {
        window.removeEventListener('mousemove', onMove);
        window.removeEventListener('mouseup', onUp);
      };
      window.addEventListener('mousemove', onMove);
      window.addEventListener('mouseup', onUp);
    },
    [setSliderPosition]
  );

  // Touch: two-finger or single finger? Keep it simple — single touch pans, handle touch moves divider.
  const touchPanStart = useRef({ touchX: 0, touchY: 0, tx: 0, ty: 0 });

  const handleContainerTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length !== 1) return;
    const { transform: cur } = useAppStore.getState();
    touchPanStart.current = {
      touchX: e.touches[0].clientX,
      touchY: e.touches[0].clientY,
      tx: cur.x,
      ty: cur.y,
    };
  };

  const handleContainerTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length !== 1) return;
    e.preventDefault();
    const { transform: c } = useAppStore.getState();
    setTransform({
      scale: c.scale,
      x: touchPanStart.current.tx + (e.touches[0].clientX - touchPanStart.current.touchX),
      y: touchPanStart.current.ty + (e.touches[0].clientY - touchPanStart.current.touchY),
    });
  };

  const handleGripTouchStart = (e: React.TouchEvent) => {
    e.stopPropagation();
  };

  const handleGripTouchMove = (e: React.TouchEvent) => {
    e.stopPropagation();
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const pos = Math.max(
      0,
      Math.min(100, ((e.touches[0].clientX - rect.left) / rect.width) * 100)
    );
    setSliderPosition(pos);
  };

  return (
    <div className="comparison-slider-wrapper">
      {/* Image selectors */}
      <div className="comparison-controls">
        <div className="comparison-control">
          <label>{t('comparisonSlider.leftImage')}</label>
          <select
            value={sliderLeftId ?? ''}
            onChange={(e) => setSliderImage('left', e.target.value || null)}
            title={leftImage?.name}
          >
            <option value="">{t('comparisonSlider.selectLeft')}</option>
            {images.map((img) => (
              <option key={img.id} value={img.id}>
                {img.name}
              </option>
            ))}
          </select>
        </div>
        <div className="comparison-control">
          <label>{t('comparisonSlider.rightImage')}</label>
          <select
            value={sliderRightId ?? ''}
            onChange={(e) => setSliderImage('right', e.target.value || null)}
            title={rightImage?.name}
          >
            <option value="">{t('comparisonSlider.selectRight')}</option>
            {images.map((img) => (
              <option key={img.id} value={img.id}>
                {img.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Slider view */}
      <div
        ref={containerRef}
        className="comparison-slider"
        onMouseDown={handleContainerMouseDown}
        onTouchStart={handleContainerTouchStart}
        onTouchMove={handleContainerTouchMove}
        style={{ cursor: 'grab' }}
      >
        {/* Right image — full width, underneath */}
        <div className="comparison-layer comparison-right">
          <ImageViewer dataUrl={rightImage?.dataUrl ?? null} interactive={false} transformOverride={transform} />
        </div>

        {/* Left image — clipped to left of slider */}
        <div
          className="comparison-layer comparison-left"
          style={{ clipPath: `inset(0 ${100 - sliderPosition}% 0 0)` }}
        >
          <ImageViewer dataUrl={leftImage?.dataUrl ?? null} interactive={false} transformOverride={transform} />
        </div>

        {/* Divider handle — intercepts its own drag */}
        <div
          className="slider-handle"
          style={{ left: `${sliderPosition}%` }}
          onMouseDown={handleGripMouseDown}
          onTouchStart={handleGripTouchStart}
          onTouchMove={handleGripTouchMove}
        >
          <div className="slider-line" />
          <div className="slider-grip">
            <span>‹</span>
            <span>›</span>
          </div>
        </div>
      </div>
    </div>
  );
}
