import { proxy } from 'valtio';
import type { PokemonOptionType } from '@/loaders/pokemon';

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

// Track global handlers initialization
let globalHandlersCleanup: (() => void) | null = null;

// Simple actions for managing drag state
export const dragActions = {
  startDrag: (
    data: string,
    source: string,
    value: PokemonOptionType | null | undefined
  ) => {
    // Initialize global handlers on first use
    initializeGlobalHandlers();

    // Update all drag state at once
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

  // Individual setters for fine-grained control
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

  // Cleanup for testing or hot reloading
  cleanup: () => {
    globalHandlersCleanup?.();
    dragActions.clearDrag();
  },
};

// Initialize global drag end handlers (called automatically on first drag)
function initializeGlobalHandlers() {
  if (typeof window === 'undefined' || globalHandlersCleanup) return;

  const abortController = new AbortController();
  const { signal } = abortController;

  const handleDragEnd = () => {
    dragActions.clearDrag();
  };

  // Clean up drag state on global drag events
  document.addEventListener('dragend', handleDragEnd, { signal });
  document.addEventListener('drop', handleDragEnd, { signal });

  // Clean up if page becomes hidden (e.g., tab switch during drag)
  document.addEventListener(
    'visibilitychange',
    () => {
      if (document.hidden && dragStore.isDragging) {
        dragActions.clearDrag();
      }
    },
    { signal }
  );

  // Store cleanup function
  globalHandlersCleanup = () => {
    abortController.abort();
    globalHandlersCleanup = null;
  };
}
