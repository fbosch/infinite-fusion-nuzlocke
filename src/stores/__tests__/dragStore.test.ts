import { describe, it, expect, beforeEach } from 'vitest';
import { dragStore, dragActions } from '../dragStore';
import type { PokemonOption } from '@/loaders/pokemon';

describe('Drag Store', () => {
  beforeEach(() => {
    // Reset the store before each test
    dragActions.clearDrag();
  });

  it('should initialize with null values', () => {
    expect(dragStore.currentDragData).toBeNull();
    expect(dragStore.currentDragSource).toBeNull();
    expect(dragStore.currentDragValue).toBeNull();
  });

  it('should set drag data correctly', () => {
    dragActions.setDragData('Pikachu');
    expect(dragStore.currentDragData).toBe('Pikachu');
  });

  it('should set drag source correctly', () => {
    dragActions.setDragSource('combobox-1');
    expect(dragStore.currentDragSource).toBe('combobox-1');
  });

  it('should set drag value correctly', () => {
    const pokemon: PokemonOption = {
      id: 25,
      name: 'Pikachu',
      nationalDexId: 25,
      evolutionIds: [26],
    };
    dragActions.setDragValue(pokemon);
    expect(dragStore.currentDragValue).toEqual(pokemon);
  });

  it('should start drag with all parameters', () => {
    const pokemon: PokemonOption = {
      id: 25,
      name: 'Pikachu',
      nationalDexId: 25,
      evolutionIds: [26],
    };
    dragActions.startDrag('Pikachu', 'combobox-1', pokemon);
    
    expect(dragStore.currentDragData).toBe('Pikachu');
    expect(dragStore.currentDragSource).toBe('combobox-1');
    expect(dragStore.currentDragValue).toEqual(pokemon);
  });

  it('should clear drag state', () => {
    // Set some values first
    dragActions.startDrag('Pikachu', 'combobox-1', null);
    
    // Clear them
    dragActions.clearDrag();
    
    expect(dragStore.currentDragData).toBeNull();
    expect(dragStore.currentDragSource).toBeNull();
    expect(dragStore.currentDragValue).toBeNull();
  });

  it('should handle null values correctly', () => {
    dragActions.setDragData(null);
    dragActions.setDragSource(null);
    dragActions.setDragValue(null);
    
    expect(dragStore.currentDragData).toBeNull();
    expect(dragStore.currentDragSource).toBeNull();
    expect(dragStore.currentDragValue).toBeNull();
  });
}); 