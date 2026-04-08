import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAppStore } from '../store/useAppStore';
import { renderSideBySideCanvas, renderSliderCanvas, canvasToUint8Array } from '../utils/exportStatic';
import { renderSideBySideSvg, renderSliderSvg } from '../utils/exportSvg';
import { renderSideBySidePdf, renderSliderPdf, PaperSize, Orientation, FitMode } from '../utils/exportPdf';
import { buildSideBySideHtml, buildSliderHtml } from '../utils/exportInteractive';
import { saveWithDialog } from '../utils/saveTauri';

interface Props {
  onClose: () => void;
}

type ExportType = 'image' | 'html';
type ImageFormat = 'png' | 'jpeg' | 'svg' | 'pdf';

export function ExportModal({ onClose }: Props) {
  const { t } = useTranslation();
  const viewMode = useAppStore((s) => s.viewMode);
  const images = useAppStore((s) => s.images);
  const sliderLeftId = useAppStore((s) => s.sliderLeftId);
  const sliderRightId = useAppStore((s) => s.sliderRightId);
  const views = useAppStore((s) => s.views);

  const [exportType, setExportType] = useState<ExportType>('image');
  const [format, setFormat] = useState<ImageFormat>('png');
  const [scale, setScale] = useState(1);
  const [quality, setQuality] = useState(92);
  const [paper, setPaper] = useState<PaperSize>('a4');
  const [orientation, setOrientation] = useState<Orientation>('landscape');
  const [fit, setFit] = useState<FitMode>('fit');
  const [showLabels, setShowLabels] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Validation
  const validationError = (() => {
    if (images.length === 0) return t('export.errorNoImages');
    if (images.length === 1) return t('export.errorOneImage');
    if (viewMode === 'slider') {
      if (!sliderLeftId || !sliderRightId) return t('export.errorSliderImages');
    }
    if (viewMode === 'sidebyside') {
      const filled = views.filter((v) => v.imageId).length;
      if (filled < 2) return t('export.errorSideBySideImages');
    }
    return null;
  })();

  const handleExport = async () => {
    if (validationError) return;
    setExporting(true);
    setError(null);

    try {
      const isSbs = viewMode === 'sidebyside';

      if (exportType === 'html') {
        const html = isSbs ? buildSideBySideHtml() : buildSliderHtml();
        const defaultName = isSbs ? 'oicat-sidebyside.html' : 'oicat-slider.html';
        await saveWithDialog(html, defaultName, [{ name: 'HTML file', extensions: ['html'] }]);

      } else {
        const settings = { scale, quality: quality / 100, showLabels };
        const pdfSettings = { paper, orientation, fit, showLabels };
        const defaultBase = isSbs ? 'oicat-sidebyside' : 'oicat-slider';

        let data: Uint8Array;
        let defaultName: string;
        let filters: { name: string; extensions: string[] }[];

        if (format === 'png') {
          const canvas = isSbs
            ? await renderSideBySideCanvas(settings)
            : await renderSliderCanvas(settings);
          data = await canvasToUint8Array(canvas, 'png', 1);
          defaultName = `${defaultBase}.png`;
          filters = [{ name: 'PNG Image', extensions: ['png'] }];

        } else if (format === 'jpeg') {
          const canvas = isSbs
            ? await renderSideBySideCanvas(settings)
            : await renderSliderCanvas(settings);
          data = await canvasToUint8Array(canvas, 'jpeg', settings.quality);
          defaultName = `${defaultBase}.jpg`;
          filters = [{ name: 'JPEG Image', extensions: ['jpg', 'jpeg'] }];

        } else if (format === 'svg') {
          const svg = isSbs
            ? await renderSideBySideSvg({ scale, showLabels })
            : await renderSliderSvg({ scale, showLabels });
          data = new TextEncoder().encode(svg);
          defaultName = `${defaultBase}.svg`;
          filters = [{ name: 'SVG Image', extensions: ['svg'] }];

        } else {
          // pdf
          data = isSbs
            ? await renderSideBySidePdf(pdfSettings)
            : await renderSliderPdf(pdfSettings);
          defaultName = `${defaultBase}.pdf`;
          filters = [{ name: 'PDF Document', extensions: ['pdf'] }];
        }

        await saveWithDialog(data, defaultName, filters);
      }

      onClose();
    } catch (e: any) {
      setError(e?.message ?? 'Export failed');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="modal-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal-window">
        {/* Header */}
        <div className="modal-header">
          <span className="modal-title">{t('export.modalTitle')}</span>
          <button className="icon-btn" onClick={onClose}>×</button>
        </div>

        {/* Validation error banner */}
        {validationError && (
          <div className="modal-error-banner">
            ⚠ {validationError}
          </div>
        )}

        <div className="modal-body">
          {/* Export type toggle */}
          <div className="modal-section">
            <div className="modal-row">
              <label className="modal-label">{t('export.type')}</label>
              <div className="segmented">
                <button
                  className={`seg-btn ${exportType === 'image' ? 'active' : ''}`}
                  onClick={() => setExportType('image')}
                >
                  🖼 {t('export.staticImage')}
                </button>
                <button
                  className={`seg-btn ${exportType === 'html' ? 'active' : ''}`}
                  onClick={() => setExportType('html')}
                >
                  🌐 {t('export.interactiveHtml')}
                </button>
              </div>
            </div>
          </div>

          {exportType === 'image' && (
            <>
              {/* Labels toggle — before format */}
              <div className="modal-section">
                <div className="modal-row">
                  <label className="modal-label">{t('export.showLabels')}</label>
                  <label className="toggle-switch">
                    <input
                      type="checkbox"
                      checked={showLabels}
                      onChange={(e) => setShowLabels(e.target.checked)}
                    />
                    <span className="toggle-track" />
                  </label>
                </div>
              </div>

              {/* Format */}
              <div className="modal-section">
                <div className="modal-section-title">{t('export.format')}</div>
                <div className="format-grid">
                  {(['png', 'jpeg', 'svg', 'pdf'] as ImageFormat[]).map((f) => (
                    <button
                      key={f}
                      className={`format-btn ${format === f ? 'active' : ''}`}
                      onClick={() => setFormat(f)}
                    >
                      {f.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>

              {/* Settings per format */}
              <div className="modal-section">
                <div className="modal-section-title">{t('export.settings')}</div>

                {/* Scale (all formats except pdf) */}
                {format !== 'pdf' && (
                  <div className="modal-row">
                    <label className="modal-label">{t('export.scale')}</label>
                    <div className="segmented">
                      {[1, 2, 3].map((s) => (
                        <button
                          key={s}
                          className={`seg-btn ${scale === s ? 'active' : ''}`}
                          onClick={() => setScale(s)}
                        >
                          {s}×
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* JPEG quality */}
                {format === 'jpeg' && (
                  <div className="modal-row">
                    <label className="modal-label">{t('export.quality')} {quality}%</label>
                    <input
                      type="range"
                      min={30}
                      max={100}
                      value={quality}
                      onChange={(e) => setQuality(Number(e.target.value))}
                      className="quality-slider"
                    />
                  </div>
                )}

                {/* PDF settings */}
                {format === 'pdf' && (
                  <>
                    <div className="modal-row">
                      <label className="modal-label">{t('export.paper')}</label>
                      <select
                        className="modal-select"
                        value={paper}
                        onChange={(e) => setPaper(e.target.value as PaperSize)}
                      >
                        <option value="a4">A4</option>
                        <option value="a3">A3</option>
                        <option value="letter">Letter</option>
                      </select>
                    </div>
                    <div className="modal-row">
                      <label className="modal-label">{t('export.orientation')}</label>
                      <div className="segmented">
                        <button
                          className={`seg-btn ${orientation === 'landscape' ? 'active' : ''}`}
                          onClick={() => setOrientation('landscape')}
                        >
                          {t('export.landscape')}
                        </button>
                        <button
                          className={`seg-btn ${orientation === 'portrait' ? 'active' : ''}`}
                          onClick={() => setOrientation('portrait')}
                        >
                          {t('export.portrait')}
                        </button>
                      </div>
                    </div>
                    <div className="modal-row">
                      <label className="modal-label">{t('export.fit')}</label>
                      <div className="segmented">
                        <button
                          className={`seg-btn ${fit === 'fit' ? 'active' : ''}`}
                          onClick={() => setFit('fit')}
                        >
                          {t('export.fitPage')}
                        </button>
                        <button
                          className={`seg-btn ${fit === 'actual' ? 'active' : ''}`}
                          onClick={() => setFit('actual')}
                        >
                          {t('export.actualSize')}
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </>
          )}

          {exportType === 'html' && (
            <div className="modal-section">
              <p className="modal-hint">{t('export.htmlHint')}</p>
            </div>
          )}

          {error && <div className="modal-error-banner">⚠ {error}</div>}
        </div>

        {/* Footer */}
        <div className="modal-footer">
          <button className="btn-secondary" onClick={onClose} disabled={exporting}>
            {t('common.cancel')}
          </button>
          <button
            className="btn-primary"
            onClick={handleExport}
            disabled={!!validationError || exporting}
          >
            {exporting ? t('export.exporting') : t('export.exportBtn')}
          </button>
        </div>
      </div>
    </div>
  );
}
