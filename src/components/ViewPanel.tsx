import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAppStore, ViewPanel as ViewPanelType } from '../store/useAppStore';
import { ImageViewer } from './ImageViewer';
import { DiffOverlay } from './DiffOverlay';

interface Props {
  panel: ViewPanelType;
  index: number;
}

export function ViewPanel({ panel, index }: Props) {
  const { t } = useTranslation();
  const images = useAppStore((s) => s.images);
  const views = useAppStore((s) => s.views);
  const diffMode = useAppStore((s) => s.diffMode);
  const removeView = useAppStore((s) => s.removeView);
  const renameView = useAppStore((s) => s.renameView);
  const setViewImage = useAppStore((s) => s.setViewImage);

  const [isRenaming, setIsRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState(panel.label);
  const renameInputRef = useRef<HTMLInputElement>(null);

  const image = images.find((img) => img.id === panel.imageId) ?? null;
  const baseImage = images.find((img) => img.id === views[0]?.imageId) ?? null;
  const showDiff = diffMode !== 'none' && index > 0 && !!image && !!baseImage;

  useEffect(() => {
    if (isRenaming) renameInputRef.current?.focus();
  }, [isRenaming]);

  const commitRename = () => {
    const trimmed = renameValue.trim();
    if (trimmed) renameView(panel.id, trimmed);
    else setRenameValue(panel.label);
    setIsRenaming(false);
  };

  const handleRenameKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') commitRename();
    if (e.key === 'Escape') {
      setRenameValue(panel.label);
      setIsRenaming(false);
    }
  };

  return (
    <div className="view-panel">
      <div className="view-panel-header">
        {isRenaming ? (
          <input
            ref={renameInputRef}
            className="rename-input"
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
            onBlur={commitRename}
            onKeyDown={handleRenameKeyDown}
          />
        ) : (
          <span
            className="view-panel-label"
            title={t('viewPanel.rename')}
            onDoubleClick={() => {
              setRenameValue(panel.label);
              setIsRenaming(true);
            }}
          >
            {panel.label}
          </span>
        )}

        <div className="view-panel-actions">
          <select
            className="image-selector"
            value={panel.imageId ?? ''}
            onChange={(e) => setViewImage(panel.id, e.target.value || null)}
            title={image?.name ?? t('viewPanel.changeImage')}
          >
            <option value="">{t('viewPanel.noImage')}</option>
            {images.map((img) => (
              <option key={img.id} value={img.id}>
                {img.name}
              </option>
            ))}
          </select>

          <button
            className="icon-btn close-btn"
            onClick={() => removeView(panel.id)}
            title={t('viewPanel.close')}
          >
            ×
          </button>
        </div>
      </div>

      <div className="view-panel-body">
        <ImageViewer dataUrl={image?.dataUrl ?? null} />
        {showDiff && (
          <DiffOverlay
            baseDataUrl={baseImage!.dataUrl}
            compareDataUrl={image!.dataUrl}
          />
        )}
      </div>
    </div>
  );
}
