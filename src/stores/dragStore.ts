import { proxy } from 'valtio';
import type { PokemonOptionType } from '@/loaders/pokemon';

// Track if global handlers have been initialized
let globalHandlersInitialized = false;

export interface DragState {
  currentDragData: string | null;
  currentDragSource: string | null;
  currentDragValue: PokemonOptionType | null | undefined;
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

  setDragValue: (value: PokemonOptionType | null | undefined) => {
    dragStore.currentDragValue = value;
  },

  setIsDragging: (dragging: boolean) => {
    dragStore.isDragging = dragging;
  },

  startDrag: (
    data: string,
    source: string,
    value: PokemonOptionType | null | undefined
  ) => {
    // Initialize global handlers on first use
    dragActions._initializeGlobalHandlers();

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

  // Initialize global drag end handlers (called automatically)
  _initializeGlobalHandlers: () => {
    if (typeof window === 'undefined' || globalHandlersInitialized) return;

    const handleGlobalDragEnd = () => {
      // Small delay to ensure all drag events have completed
      setTimeout(() => {
        if (dragStore.isDragging) {
          dragActions.clearDrag();
        }
      }, 100);
    };

    // Add global event listeners for drag end
    document.addEventListener('dragend', handleGlobalDragEnd);
    document.addEventListener('drop', handleGlobalDragEnd);

    globalHandlersInitialized = true;
  },
};
