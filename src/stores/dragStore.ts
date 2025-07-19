import { proxy } from 'valtio';
import type { PokemonOption } from '@/loaders/pokemon';

export interface DragState {
  currentDragData: string | null;
  currentDragSource: string | null;
  currentDragValue: PokemonOption | null | undefined;
  isDragging: boolean;
}

export const dragStore = proxy<DragState>({
  currentDragData: null,
  currentDragSource: null,
  currentDragValue: null,
  isDragging: false,
});

// Actions for managing drag state
export const dragActions = {
  setDragData: (data: string | null) => {
    dragStore.currentDragData = data;
  },

  setDragSource: (source: string | null) => {
    dragStore.currentDragSource = source;
  },

  setDragValue: (value: PokemonOption | null | undefined) => {
    dragStore.currentDragValue = value;
  },

  setIsDragging: (dragging: boolean) => {
    dragStore.isDragging = dragging;
  },

  startDrag: (
    data: string,
    source: string,
    value: PokemonOption | null | undefined
  ) => {
    dragStore.currentDragData = data;
    dragStore.currentDragSource = source;
    dragStore.currentDragValue = value;
    dragStore.isDragging = true;
  },

  clearDrag: () => {
    dragStore.currentDragData = null;
    dragStore.currentDragSource = null;
    dragStore.currentDragValue = null;
    dragStore.isDragging = false;
  },
};
