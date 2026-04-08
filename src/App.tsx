import { useRef, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { openUrl } from '@tauri-apps/plugin-opener';
import { useAppStore } from './store/useAppStore';
import { ImageList } from './components/ImageList';
import { ViewPanel } from './components/ViewPanel';
import { ComparisonSlider } from './components/ComparisonSlider';
import { ExportModal } from './components/ExportModal';
import { ViewOptionsDropdown } from './components/ViewOptionsDropdown';
import { useUpdateCheck } from './hooks/useUpdateCheck';
import './App.css';

const SIDEBAR_MIN = 140;
const SIDEBAR_MAX = 480;
const SIDEBAR_DEFAULT = 220;

export default function App() {
  const { t } = useTranslation();
  const viewMode = useAppStore((s) => s.viewMode);
  const views = useAppStore((s) => s.views);
  const transform = useAppStore((s) => s.transform);
  const sbsColumns = useAppStore((s) => s.sbsColumns);
  const setViewMode = useAppStore((s) => s.setViewMode);
  const resetTransform = useAppStore((s) => s.resetTransform);
  const addView = useAppStore((s) => s.addView);

  const { newVersion, dismissed, dismiss, releasesUrl } = useUpdateCheck();

  const [sidebarWidth, setSidebarWidth] = useState(SIDEBAR_DEFAULT);
  const [collapsed, setCollapsed] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [viewOptionsOpen, setViewOptionsOpen] = useState(false);
  const viewOptionsBtnRef = useRef<HTMLButtonElement>(null);
  const dragStart = useRef<{ x: number; w: number } | null>(null);

  const handleResizeMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    dragStart.current = { x: e.clientX, w: sidebarWidth };

    const onMove = (ev: MouseEvent) => {
      if (!dragStart.current) return;
      const next = Math.max(SIDEBAR_MIN, Math.min(SIDEBAR_MAX, dragStart.current.w + (ev.clientX - dragStart.current.x)));
      setSidebarWidth(next);
      if (collapsed) setCollapsed(false);
    };
    const onUp = () => {
      dragStart.current = null;
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }, [sidebarWidth, collapsed]);

  // Column grid style for side-by-side
  const sbsStyle = sbsColumns > 0
    ? { gridTemplateColumns: `repeat(${sbsColumns}, 1fr)`, display: 'grid' as const }
    : {};

  const zoomPct = Math.round(transform.scale * 100);

  return (
    <div className="app-root">
      {newVersion && !dismissed && (
        <div className="update-banner">
          <span>
            A new version <strong>{newVersion}</strong> is available.{' '}
            <button
              className="update-banner-link"
              onClick={() => openUrl(releasesUrl)}
            >
              Download
            </button>
          </span>
          <button className="update-banner-dismiss" onClick={dismiss} title="Dismiss">✕</button>
        </div>
      )}
      <header className="toolbar">
        <div className="toolbar-left">
          <button
            className="sidebar-toggle"
            onClick={() => setCollapsed((c) => !c)}
            title={collapsed ? 'Show panel' : 'Hide panel'}
          >
            {collapsed ? '›' : '‹'}
          </button>
          <span className="app-logo">OICAT</span>
        </div>

        <div className="toolbar-center">
          <div className="mode-toggle">
            <button
              className={`mode-btn ${viewMode === 'sidebyside' ? 'active' : ''}`}
              onClick={() => setViewMode('sidebyside')}
            >
              {t('toolbar.sideBySide')}
            </button>
            <button
              className={`mode-btn ${viewMode === 'slider' ? 'active' : ''}`}
              onClick={() => setViewMode('slider')}
            >
              {t('toolbar.slider')}
            </button>
          </div>
        </div>

        <div className="toolbar-right">
          <span className="zoom-badge">{zoomPct}%</span>

          <button className="btn-secondary" onClick={resetTransform}>
            {t('toolbar.resetTransform')}
          </button>

          {viewMode === 'sidebyside' && (
            <>
              <button className="btn-secondary" onClick={() => addView()}>
                + {t('toolbar.addView')}
              </button>

              <div className="view-options-wrapper">
                <button
                  ref={viewOptionsBtnRef}
                  className={`btn-secondary ${viewOptionsOpen ? 'active-btn' : ''}`}
                  onClick={() => setViewOptionsOpen((o) => !o)}
                >
                  {t('toolbar.viewOptions')} ▾
                </button>
                {viewOptionsOpen && (
                  <ViewOptionsDropdown
                    anchorRef={viewOptionsBtnRef}
                    onClose={() => setViewOptionsOpen(false)}
                  />
                )}
              </div>
            </>
          )}

          <button className="btn-secondary" onClick={() => setExportOpen(true)}>
            Export
          </button>
        </div>
      </header>

      <div className="app-body">
        <div
          className={`sidebar-wrapper ${collapsed ? 'collapsed' : ''}`}
          style={{ width: collapsed ? 0 : sidebarWidth }}
        >
          <ImageList />
          <div className="sidebar-resize-handle" onMouseDown={handleResizeMouseDown} />
        </div>

        <main className="main-area">
          {viewMode === 'sidebyside' ? (
            <div className="side-by-side" style={sbsStyle}>
              {views.map((panel, i) => (
                <ViewPanel key={panel.id} panel={panel} index={i} />
              ))}
              {views.length === 0 && (
                <div className="no-views-hint">
                  <p>No views open. Click "+ {t('toolbar.addView')}" to add one.</p>
                </div>
              )}
            </div>
          ) : (
            <ComparisonSlider />
          )}
        </main>
      </div>

      {exportOpen && <ExportModal onClose={() => setExportOpen(false)} />}
    </div>
  );
}
