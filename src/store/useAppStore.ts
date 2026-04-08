import { create } from 'zustand';
import { arrayMove } from '@dnd-kit/sortable';

export interface ImageItem {
  id: string;
  name: string;
  dataUrl: string;
}

export interface ViewPanel {
  id: string;
  imageId: string | null;
  label: string;
}

export interface ViewTransform {
  scale: number;
  x: number;
  y: number;
}

export type ViewMode = 'sidebyside' | 'slider';
export type DiffMode = 'none' | 'diff' | 'heatmap';

interface AppStore {
  images: ImageItem[];
  views: ViewPanel[];
  transform: ViewTransform;
  viewMode: ViewMode;
  sliderPosition: number;
  sliderLeftId: string | null;
  sliderRightId: string | null;
  // Side-by-side visualization options
  diffMode: DiffMode;
  diffThreshold: number;   // 0–255
  sbsColumns: number;      // 1–4, 0 = auto (flex)

  addImages: (items: Omit<ImageItem, 'id'>[]) => void;
  removeImage: (id: string) => void;
  reorderImages: (from: number, to: number) => void;
  addView: (imageId?: string | null) => void;
  removeView: (id: string) => void;
  renameView: (id: string, label: string) => void;
  setViewImage: (viewId: string, imageId: string | null) => void;
  setTransform: (t: ViewTransform) => void;
  resetTransform: () => void;
  setViewMode: (mode: ViewMode) => void;
  setSliderPosition: (pos: number) => void;
  setSliderImage: (side: 'left' | 'right', id: string | null) => void;
  setDiffMode: (mode: DiffMode) => void;
  setDiffThreshold: (v: number) => void;
  setSbsColumns: (n: number) => void;
}

let _viewCounter = 0;
const nextViewId = () => `view-${++_viewCounter}`;
let _imageCounter = 0;
const nextImageId = () => `img-${++_imageCounter}`;

const DEFAULT_TRANSFORM: ViewTransform = { scale: 1, x: 0, y: 0 };

export const useAppStore = create<AppStore>((set) => ({
  images: [],
  views: [{ id: nextViewId(), imageId: null, label: 'View 1' }],
  transform: DEFAULT_TRANSFORM,
  viewMode: 'sidebyside',
  sliderPosition: 50,
  sliderLeftId: null,
  sliderRightId: null,
  diffMode: 'none',
  diffThreshold: 10,
  sbsColumns: 0,

  addImages: (items) =>
    set((state) => {
      const newImages = items.map((item) => ({ ...item, id: nextImageId() }));
      const allImages = [...state.images, ...newImages];

      const views = [...state.views];
      let imgIdx = 0;
      for (let i = 0; i < views.length && imgIdx < newImages.length; i++) {
        if (!views[i].imageId) {
          views[i] = { ...views[i], imageId: newImages[imgIdx++].id };
        }
      }
      while (imgIdx < newImages.length) {
        views.push({
          id: nextViewId(),
          imageId: newImages[imgIdx++].id,
          label: `View ${views.length + 1}`,
        });
      }

      const sliderLeftId = state.sliderLeftId ?? (allImages[0]?.id ?? null);
      const sliderRightId =
        state.sliderRightId ?? (allImages[1]?.id ?? allImages[0]?.id ?? null);

      return { images: allImages, views, sliderLeftId, sliderRightId };
    }),

  removeImage: (id) =>
    set((state) => ({
      images: state.images.filter((img) => img.id !== id),
      views: state.views.map((v) =>
        v.imageId === id ? { ...v, imageId: null } : v
      ),
      sliderLeftId: state.sliderLeftId === id ? null : state.sliderLeftId,
      sliderRightId: state.sliderRightId === id ? null : state.sliderRightId,
    })),

  reorderImages: (from, to) =>
    set((state) => ({ images: arrayMove(state.images, from, to) })),

  addView: (imageId = null) =>
    set((state) => {
      const label = `View ${state.views.length + 1}`;
      return {
        views: [...state.views, { id: nextViewId(), imageId, label }],
      };
    }),

  removeView: (id) =>
    set((state) => ({ views: state.views.filter((v) => v.id !== id) })),

  renameView: (id, label) =>
    set((state) => ({
      views: state.views.map((v) => (v.id === id ? { ...v, label } : v)),
    })),

  setViewImage: (viewId, imageId) =>
    set((state) => ({
      views: state.views.map((v) =>
        v.id === viewId ? { ...v, imageId } : v
      ),
    })),

  setTransform: (t) => set({ transform: t }),
  resetTransform: () => set({ transform: DEFAULT_TRANSFORM }),

  setViewMode: (viewMode) => set({ viewMode }),
  setSliderPosition: (sliderPosition) => set({ sliderPosition }),
  setSliderImage: (side, id) =>
    set(side === 'left' ? { sliderLeftId: id } : { sliderRightId: id }),

  setDiffMode: (diffMode) => set({ diffMode }),
  setDiffThreshold: (diffThreshold) => set({ diffThreshold }),
  setSbsColumns: (sbsColumns) => set({ sbsColumns }),
}));
