import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAppStore, DiffMode } from '../store/useAppStore';
import { fitToWindow, actualSize, zoomTo } from '../utils/viewHelpers';

interface Props {
  onClose: () => void;
  anchorRef: React.RefObject<HTMLButtonElement | null>;
}

const ZOOM_PRESETS = [25, 50, 75, 100, 150, 200];

export function ViewOptionsDropdown({ onClose, anchorRef }: Props) {
  const { t } = useTranslation();
  const dropdownRef = useRef<HTMLDivElement>(null);

  const transform = useAppStore((s) => s.transform);
  const diffMode = useAppStore((s) => s.diffMode);
  const diffThreshold = useAppStore((s) => s.diffThreshold);
  const sbsColumns = useAppStore((s) => s.sbsColumns);
  const setDiffMode = useAppStore((s) => s.setDiffMode);
  const setDiffThreshold = useAppStore((s) => s.setDiffThreshold);
  const setSbsColumns = useAppStore((s) => s.setSbsColumns);

  const [zoomInput, setZoomInput] = useState(String(Math.round(transform.scale * 100)));

  // Sync zoom input when transform changes from outside
  useEffect(() => {
    setZoomInput(String(Math.round(transform.scale * 100)));
  }, [transform.scale]);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        dropdownRef.current && !dropdownRef.current.contains(e.target as Node) &&
        !anchorRef.current?.contains(e.target as Node)
      ) onClose();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [anchorRef, onClose]);

  const commitZoom = () => {
    const v = parseInt(zoomInput, 10);
    if (!isNaN(v) && v >= 1 && v <= 5000) {
      zoomTo(v / 100);
    } else {
      setZoomInput(String(Math.round(transform.scale * 100)));
    }
  };

  return (
    <div ref={dropdownRef} className="view-options-dropdown">

      {/* ── Zoom ────────────────────────────────────────── */}
      <div className="vod-section">
        <div className="vod-section-title">{t('viewOptions.zoom')}</div>

        <div className="vod-row">
          <div className="zoom-input-wrap">
            <input
              className="zoom-input"
              value={zoomInput}
              onChange={(e) => setZoomInput(e.target.value)}
              onBlur={commitZoom}
              onKeyDown={(e) => { if (e.key === 'Enter') commitZoom(); }}
            />
            <span className="zoom-pct">%</span>
          </div>
          <button className="vod-btn" onClick={() => { fitToWindow(); }} title={t('viewOptions.fitToWindow')}>
            ⊡ {t('viewOptions.fit')}
          </button>
          <button className="vod-btn" onClick={() => { actualSize(); }} title={t('viewOptions.actualSize')}>
            1:1
          </button>
        </div>

        <div className="zoom-presets">
          {ZOOM_PRESETS.map((p) => (
            <button
              key={p}
              className={`zoom-preset-btn ${Math.round(transform.scale * 100) === p ? 'active' : ''}`}
              onClick={() => zoomTo(p / 100)}
            >
              {p}%
            </button>
          ))}
        </div>
      </div>

      {/* ── Columns ─────────────────────────────────────── */}
      <div className="vod-section">
        <div className="vod-section-title">{t('viewOptions.columns')}</div>
        <div className="vod-row">
          {[0, 1, 2, 3, 4].map((n) => (
            <button
              key={n}
              className={`vod-seg-btn ${sbsColumns === n ? 'active' : ''}`}
              onClick={() => setSbsColumns(n)}
              title={n === 0 ? t('viewOptions.columnsAuto') : String(n)}
            >
              {n === 0 ? t('viewOptions.auto') : n}
            </button>
          ))}
        </div>
      </div>

      {/* ── Diff / Heatmap ──────────────────────────────── */}
      <div className="vod-section">
        <div className="vod-section-title">{t('viewOptions.diffOverlay')}</div>
        <div className="vod-row">
          {(['none', 'diff', 'heatmap'] as DiffMode[]).map((m) => (
            <button
              key={m}
              className={`vod-seg-btn ${diffMode === m ? 'active' : ''}`}
              onClick={() => setDiffMode(m)}
            >
              {t(`viewOptions.diff_${m}`)}
            </button>
          ))}
        </div>

        {diffMode !== 'none' && (
          <div className="vod-row vod-row-gap">
            <label className="vod-label">{t('viewOptions.threshold')} {diffThreshold}</label>
            <input
              type="range"
              min={0}
              max={80}
              value={diffThreshold}
              onChange={(e) => setDiffThreshold(Number(e.target.value))}
              className="vod-range"
            />
          </div>
        )}
      </div>

    </div>
  );
}
