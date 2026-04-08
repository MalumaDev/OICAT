import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useAppStore } from '../store/useAppStore';
import { exportSideBySideStatic, exportSliderStatic } from '../utils/exportStatic';
import { exportSideBySideInteractive, exportSliderInteractive } from '../utils/exportInteractive';

interface Props {
  anchorRef: React.RefObject<HTMLButtonElement | null>;
  onClose: () => void;
}

export function ExportPopover({ anchorRef, onClose }: Props) {
  const { t } = useTranslation();
  const viewMode = useAppStore((s) => s.viewMode);
  const popoverRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(e.target as Node) &&
        !anchorRef.current?.contains(e.target as Node)
      ) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [anchorRef, onClose]);

  const run = (fn: () => void) => {
    onClose();
    // Defer so the popover closes before canvas operations start
    setTimeout(fn, 50);
  };

  const isSbs = viewMode === 'sidebyside';

  return (
    <div ref={popoverRef} className="export-popover">
      <div className="export-popover-title">{t('export.title')}</div>

      <div className="export-section-label">{t('export.staticImage')}</div>
      <button
        className="export-item"
        onClick={() => run(() => (isSbs ? exportSideBySideStatic('png') : exportSliderStatic('png')))}
      >
        <span className="export-item-icon">🖼</span>
        {t('export.savePng')}
      </button>
      <button
        className="export-item"
        onClick={() => run(() => (isSbs ? exportSideBySideStatic('jpeg') : exportSliderStatic('jpeg')))}
      >
        <span className="export-item-icon">🖼</span>
        {t('export.saveJpeg')}
      </button>

      <div className="export-section-label">{t('export.interactive')}</div>
      <button
        className="export-item"
        onClick={() => run(() => (isSbs ? exportSideBySideInteractive() : exportSliderInteractive()))}
      >
        <span className="export-item-icon">🌐</span>
        {t('export.saveHtml')}
      </button>
    </div>
  );
}
