import React, { useRef } from 'react';
import { useTranslation } from 'react-i18next';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useAppStore, ImageItem } from '../store/useAppStore';

function SortableImage({ image }: { image: ImageItem }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: image.id });
  const removeImage = useAppStore((s) => s.removeImage);

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`image-list-item ${isDragging ? 'dragging' : ''}`}
    >
      <span className="drag-handle" {...attributes} {...listeners} title="Drag to reorder">
        ⠿
      </span>
      <img src={image.dataUrl} alt={image.name} className="image-thumb" />
      <span className="image-name" title={image.name}>
        {image.name}
      </span>
      <button
        className="icon-btn remove-btn"
        onClick={() => removeImage(image.id)}
        title="Remove"
      >
        ×
      </button>
    </div>
  );
}

export function ImageList() {
  const { t } = useTranslation();
  const images = useAppStore((s) => s.images);
  const reorderImages = useAppStore((s) => s.reorderImages);
  const addImages = useAppStore((s) => s.addImages);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = images.findIndex((img) => img.id === active.id);
    const newIndex = images.findIndex((img) => img.id === over.id);
    reorderImages(oldIndex, newIndex);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    Promise.all(
      files.map(
        (file) =>
          new Promise<Omit<ImageItem, 'id'>>((resolve) => {
            const reader = new FileReader();
            reader.onload = () =>
              resolve({ name: file.name, dataUrl: reader.result as string });
            reader.readAsDataURL(file);
          })
      )
    ).then((items) => addImages(items));
    // Reset so same file can be re-selected
    e.target.value = '';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files).filter((f) =>
      f.type.startsWith('image/')
    );
    if (!files.length) return;
    Promise.all(
      files.map(
        (file) =>
          new Promise<Omit<ImageItem, 'id'>>((resolve) => {
            const reader = new FileReader();
            reader.onload = () =>
              resolve({ name: file.name, dataUrl: reader.result as string });
            reader.readAsDataURL(file);
          })
      )
    ).then((items) => addImages(items));
  };

  return (
    <aside
      className="image-list-sidebar"
      onDragOver={(e) => e.preventDefault()}
      onDrop={handleDrop}
    >
      <div className="sidebar-header">
        <span className="sidebar-title">{t('imageList.title')}</span>
        <button
          className="btn-primary"
          onClick={() => fileInputRef.current?.click()}
          title={t('toolbar.addImages')}
        >
          + {t('toolbar.addImages')}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          style={{ display: 'none' }}
          onChange={handleFileChange}
        />
      </div>

      <div className="image-list-body">
        {images.length === 0 ? (
          <div className="image-list-empty">
            <div className="drop-zone-icon">🖼️</div>
            <p>{t('imageList.empty')}</p>
          </div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={images.map((img) => img.id)}
              strategy={verticalListSortingStrategy}
            >
              {images.map((img) => (
                <SortableImage key={img.id} image={img} />
              ))}
            </SortableContext>
          </DndContext>
        )}
      </div>
    </aside>
  );
}
