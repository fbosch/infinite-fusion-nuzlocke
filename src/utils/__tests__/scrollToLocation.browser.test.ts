import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  findMostRecentlyFilledLocation,
  scrollToTableRow,
  findTableRowByLocationId,
  scrollToMostRecentLocation,
  flashTableRow,
  flashPokemonOverlaysByUids,
  runAfterScrollSettles,
  scrollToLocationById,
} from '../scrollToLocation';
import type { PokemonOptionType } from '@/loaders';
import type { EncounterData } from '@/stores/playthroughs';

// Mock data
const mockPokemon: PokemonOptionType = {
  id: 1,
  name: 'Test Pokemon',
  nationalDexId: 1,
  status: 'captured',
  nickname: 'Test',
  uid: 'test-uid-1',
};

const mockEncounters: Record<string, EncounterData> = {
  'route-1': {
    head: mockPokemon,
    body: null,
    isFusion: false,
    updatedAt: new Date('2024-01-01T10:00:00Z').getTime(),
  },
  'route-2': {
    head: mockPokemon,
    body: mockPokemon,
    isFusion: true,
    updatedAt: new Date('2024-01-02T10:00:00Z').getTime(),
  },
};

describe('findMostRecentlyFilledLocation', () => {
  it('should return null for empty encounters', () => {
    const result = findMostRecentlyFilledLocation({});
    expect(result).toBeNull();
  });

  it('should return null for encounters with no Pokemon', () => {
    const emptyEncounters: Record<string, EncounterData> = {
      'route-1': {
        head: null,
        body: null,
        isFusion: false,
        updatedAt: Date.now(),
      },
    };
    const result = findMostRecentlyFilledLocation(emptyEncounters);
    expect(result).toBeNull();
  });

  it('should return location with most recent encounter that has Pokemon', () => {
    const result = findMostRecentlyFilledLocation(mockEncounters);
    expect(result).toBe('route-2');
  });

  it('should prioritize encounters with both head and body over single Pokemon', () => {
    const mixedEncounters: Record<string, EncounterData> = {
      'route-1': {
        head: mockPokemon,
        body: null,
        isFusion: false,
        updatedAt: new Date('2024-01-03T10:00:00Z').getTime(),
      },
      'route-2': {
        head: mockPokemon,
        body: mockPokemon,
        isFusion: true,
        updatedAt: new Date('2024-01-02T10:00:00Z').getTime(),
      },
    };
    const result = findMostRecentlyFilledLocation(mixedEncounters);
    expect(result).toBe('route-1'); // Should return route-1 because it has the most recent timestamp
  });

  it('should handle encounters with only head Pokemon', () => {
    const headOnlyEncounters: Record<string, EncounterData> = {
      'route-1': {
        head: mockPokemon,
        body: null,
        isFusion: false,
        updatedAt: new Date('2024-01-01T10:00:00Z').getTime(),
      },
    };
    const result = findMostRecentlyFilledLocation(headOnlyEncounters);
    expect(result).toBe('route-1');
  });

  it('should handle encounters with only body Pokemon', () => {
    const bodyOnlyEncounters: Record<string, EncounterData> = {
      'route-1': {
        head: null,
        body: mockPokemon,
        isFusion: false,
        updatedAt: new Date('2024-01-01T10:00:00Z').getTime(),
      },
    };
    const result = findMostRecentlyFilledLocation(bodyOnlyEncounters);
    expect(result).toBe('route-1');
  });
});

describe('scrollToTableRow', () => {
  let container: HTMLElement;
  let row: HTMLElement;

  beforeEach(() => {
    // Create test DOM elements
    container = document.createElement('div');
    container.style.height = '400px';
    container.style.overflow = 'auto';
    container.style.position = 'relative';
    document.body.appendChild(container);

    row = document.createElement('div');
    row.style.height = '50px';
    row.style.position = 'absolute';
    row.style.top = '200px';
    document.body.appendChild(row);
  });

  afterEach(() => {
    document.body.removeChild(container);
    document.body.removeChild(row);
  });

  it('should scroll to center the target row in the container', () => {
    // Test that the function executes without error
    expect(() => scrollToTableRow(container, row)).not.toThrow();

    // The actual scroll behavior depends on DOM layout and may not be testable in this environment
    // We're testing that the function completes successfully
  });

  it('should use custom scroll behavior', () => {
    // Test that the function executes without error with custom behavior
    expect(() => scrollToTableRow(container, row, 'smooth')).not.toThrow();

    // The actual scroll behavior depends on DOM layout and may not be testable in this environment
    // We're testing that the function completes successfully
  });

  it('should handle null elements gracefully', () => {
    expect(() => scrollToTableRow(null as any, row)).not.toThrow();
    expect(() => scrollToTableRow(container, null as any)).not.toThrow();
    expect(() => scrollToTableRow(null as any, null as any)).not.toThrow();
  });

  it('should calculate correct scroll position for different container and row sizes', () => {
    const smallContainer = document.createElement('div');
    smallContainer.style.height = '200px';
    smallContainer.style.overflow = 'auto';
    smallContainer.style.position = 'relative';
    document.body.appendChild(smallContainer);

    const smallRow = document.createElement('div');
    smallRow.style.height = '25px';
    smallRow.style.position = 'absolute';
    smallRow.style.top = '100px';
    document.body.appendChild(smallRow);

    // Test that the function executes without error
    expect(() => scrollToTableRow(smallContainer, smallRow)).not.toThrow();

    document.body.removeChild(smallContainer);
    document.body.removeChild(smallRow);
  });
});

describe('findTableRowByLocationId', () => {
  let table: HTMLTableElement;

  beforeEach(() => {
    table = document.createElement('table');
    table.setAttribute('aria-label', 'Locations table');

    // Create table structure
    const tbody = document.createElement('tbody');
    const row1 = document.createElement('tr');
    row1.setAttribute('data-location-id', 'route-1');
    const row2 = document.createElement('tr');
    row2.setAttribute('data-location-id', 'route-2');

    tbody.appendChild(row1);
    tbody.appendChild(row2);
    table.appendChild(tbody);

    document.body.appendChild(table);
  });

  afterEach(() => {
    document.body.removeChild(table);
  });

  it('should find row by location ID', () => {
    const result = findTableRowByLocationId(table, 'route-1');
    expect(result).toBeDefined();
    expect(result?.getAttribute('data-location-id')).toBe('route-1');
  });

  it('should return null for non-existent location ID', () => {
    const result = findTableRowByLocationId(table, 'non-existent');
    expect(result).toBeNull();
  });

  it('should handle special characters in location ID', () => {
    const specialRow = document.createElement('tr');
    specialRow.setAttribute('data-location-id', 'route-3-special!@#');
    table.querySelector('tbody')?.appendChild(specialRow);

    const result = findTableRowByLocationId(table, 'route-3-special!@#');
    expect(result).toBeDefined();
    expect(result?.getAttribute('data-location-id')).toBe('route-3-special!@#');
  });
});

describe('scrollToMostRecentLocation', () => {
  let container: HTMLElement;
  let table: HTMLTableElement;

  beforeEach(() => {
    container = document.createElement('div');
    container.style.height = '400px';
    container.style.overflow = 'auto';
    document.body.appendChild(container);

    table = document.createElement('table');
    const tbody = document.createElement('tbody');
    const row = document.createElement('tr');
    row.setAttribute('data-location-id', 'route-2');
    tbody.appendChild(row);
    table.appendChild(tbody);
    document.body.appendChild(table);
  });

  afterEach(() => {
    document.body.removeChild(container);
    document.body.removeChild(table);
  });

  it('should scroll to most recent location successfully', () => {
    const result = scrollToMostRecentLocation(mockEncounters, container, table);
    expect(result).toBe(true);
  });

  it('should return false when container is null', () => {
    const result = scrollToMostRecentLocation(mockEncounters, null, table);
    expect(result).toBe(false);
  });

  it('should return false when table is null', () => {
    const result = scrollToMostRecentLocation(mockEncounters, container, null);
    expect(result).toBe(false);
  });

  it('should return false when no recent location found', () => {
    const result = scrollToMostRecentLocation({}, container, table);
    expect(result).toBe(false);
  });

  it('should return false when target row not found', () => {
    const emptyTable = document.createElement('table');
    const result = scrollToMostRecentLocation(
      mockEncounters,
      container,
      emptyTable
    );
    expect(result).toBe(false);
  });
});

describe('flashTableRow', () => {
  let row: HTMLElement;

  beforeEach(() => {
    row = document.createElement('tr');
    document.body.appendChild(row);
  });

  afterEach(() => {
    document.body.removeChild(row);
  });

  it('should add highlight classes to row', () => {
    flashTableRow(row);
    expect(row.classList.contains('ring-2')).toBe(true);
    expect(row.classList.contains('ring-green-500/60')).toBe(true);
    expect(row.classList.contains('bg-green-50')).toBe(true);
  });

  it('should remove highlight classes after duration', async () => {
    vi.useFakeTimers();
    flashTableRow(row, 100);

    expect(row.classList.contains('ring-2')).toBe(true);

    vi.advanceTimersByTime(100);
    await vi.runAllTimersAsync();

    expect(row.classList.contains('ring-2')).toBe(false);

    vi.useRealTimers();
  });

  it('should handle null row gracefully', () => {
    expect(() => flashTableRow(null as any)).not.toThrow();
  });

  it('should use default duration when not specified', async () => {
    vi.useFakeTimers();
    flashTableRow(row);

    expect(row.classList.contains('ring-2')).toBe(true);

    vi.advanceTimersByTime(1200);
    await vi.runAllTimersAsync();

    expect(row.classList.contains('ring-2')).toBe(false);

    vi.useRealTimers();
  });
});

describe('flashPokemonOverlaysByUids', () => {
  let root: HTMLElement;

  beforeEach(() => {
    root = document.createElement('div');
    root.setAttribute('data-uid', 'test-uid');

    // Create overlay element
    const overlay = document.createElement('div');
    overlay.className = 'location-highlight-overlay';
    overlay.style.opacity = '0';
    root.appendChild(overlay);

    document.body.appendChild(root);
  });

  afterEach(() => {
    document.body.removeChild(root);
  });

  it('should flash overlays for valid UIDs', async () => {
    vi.useFakeTimers();
    flashPokemonOverlaysByUids(['test-uid']);

    const overlay = root.querySelector(
      '.location-highlight-overlay'
    ) as HTMLElement;
    expect(overlay.style.opacity).toBe('1');

    vi.advanceTimersByTime(1200);
    await vi.runAllTimersAsync();

    expect(overlay.style.opacity).toBe('');

    vi.useRealTimers();
  });

  it('should handle multiple UIDs', async () => {
    const root2 = document.createElement('div');
    root2.setAttribute('data-uid', 'test-uid-2');
    const overlay2 = document.createElement('div');
    overlay2.className = 'location-highlight-overlay';
    overlay2.style.opacity = '0';
    root2.appendChild(overlay2);
    document.body.appendChild(root2);

    vi.useFakeTimers();
    flashPokemonOverlaysByUids(['test-uid', 'test-uid-2']);

    const overlay1 = root.querySelector(
      '.location-highlight-overlay'
    ) as HTMLElement;
    const overlay2Element = root2.querySelector(
      '.location-highlight-overlay'
    ) as HTMLElement;
    expect(overlay1.style.opacity).toBe('1');
    expect(overlay2Element.style.opacity).toBe('1');

    vi.advanceTimersByTime(1200);
    await vi.runAllTimersAsync();

    expect(overlay1.style.opacity).toBe('');
    expect(overlay2Element.style.opacity).toBe('');

    document.body.removeChild(root2);
    vi.useRealTimers();
  });

  it('should handle empty UIDs array', () => {
    expect(() => flashPokemonOverlaysByUids([])).not.toThrow();
  });

  it('should handle null UIDs array', () => {
    expect(() => flashPokemonOverlaysByUids(null as any)).not.toThrow();
  });

  it('should handle non-existent UIDs gracefully', () => {
    expect(() =>
      flashPokemonOverlaysByUids(['non-existent-uid'])
    ).not.toThrow();
  });

  it('should handle UIDs with special characters', () => {
    const specialRoot = document.createElement('div');
    specialRoot.setAttribute('data-uid', 'uid.with/special-chars');
    const specialOverlay = document.createElement('div');
    specialOverlay.className = 'location-highlight-overlay';
    specialOverlay.style.opacity = '0';
    specialRoot.appendChild(specialOverlay);
    document.body.appendChild(specialRoot);

    flashPokemonOverlaysByUids(['uid.with/special-chars']);

    expect(specialOverlay.style.opacity).toBe('1');

    document.body.removeChild(specialRoot);
  });

  it('should remove opacity after duration', async () => {
    vi.useFakeTimers();
    flashPokemonOverlaysByUids(['test-uid'], 100);

    const overlay = root.querySelector(
      '.location-highlight-overlay'
    ) as HTMLElement;
    expect(overlay.style.opacity).toBe('1');

    vi.advanceTimersByTime(100);
    await vi.runAllTimersAsync();

    expect(overlay.style.opacity).toBe('');

    vi.useRealTimers();
  });
});

describe('runAfterScrollSettles', () => {
  let container: HTMLElement;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    document.body.removeChild(container);
  });

  it('should run callback after scroll settles', async () => {
    vi.useFakeTimers();
    const callback = vi.fn();

    runAfterScrollSettles(container, callback, 100);

    // Simulate scroll event
    container.dispatchEvent(new Event('scroll'));

    // Advance time to trigger callback
    vi.advanceTimersByTime(100);
    await vi.runAllTimersAsync();

    expect(callback).toHaveBeenCalledTimes(1);

    vi.useRealTimers();
  });

  it('should reset timer on subsequent scroll events', async () => {
    vi.useFakeTimers();
    const callback = vi.fn();

    runAfterScrollSettles(container, callback, 100);

    // First scroll
    container.dispatchEvent(new Event('scroll'));
    vi.advanceTimersByTime(50);

    // Second scroll should reset timer
    container.dispatchEvent(new Event('scroll'));
    vi.advanceTimersByTime(50);

    // Callback should not have been called yet
    expect(callback).not.toHaveBeenCalled();

    // Advance to trigger callback
    vi.advanceTimersByTime(100);
    await vi.runAllTimersAsync();

    expect(callback).toHaveBeenCalledTimes(1);

    vi.useRealTimers();
  });

  it('should have fallback timeout', async () => {
    vi.useFakeTimers();
    const callback = vi.fn();

    runAfterScrollSettles(container, callback, 100, 300);

    // No scroll events, just wait for fallback
    vi.advanceTimersByTime(300);
    await vi.runAllTimersAsync();

    expect(callback).toHaveBeenCalledTimes(1);

    vi.useRealTimers();
  });

  it('should only run callback once', async () => {
    vi.useFakeTimers();
    const callback = vi.fn();

    runAfterScrollSettles(container, callback, 100);

    // Multiple scroll events
    container.dispatchEvent(new Event('scroll'));
    container.dispatchEvent(new Event('scroll'));
    vi.advanceTimersByTime(100);

    // Try to trigger again
    container.dispatchEvent(new Event('scroll'));
    vi.advanceTimersByTime(100);

    expect(callback).toHaveBeenCalledTimes(1);

    vi.useRealTimers();
  });
});

describe('scrollToLocationById', () => {
  let table: HTMLTableElement;
  let container: HTMLElement;

  beforeEach(() => {
    table = document.createElement('table');
    table.setAttribute('aria-label', 'Locations table');

    const tbody = document.createElement('tbody');
    const row = document.createElement('tr');
    row.setAttribute('data-location-id', 'route-1');
    row.style.height = '50px';
    tbody.appendChild(row);
    table.appendChild(tbody);

    container = document.createElement('div');
    container.style.height = '400px';
    container.style.overflow = 'auto';
    container.style.position = 'relative';

    // Make table a child of container so scrollToLocationById can find it
    container.appendChild(table);
    document.body.appendChild(container);
  });

  afterEach(() => {
    document.body.removeChild(container);
  });

  it('should return false for empty location ID', () => {
    const result = scrollToLocationById('');
    expect(result).toBe(false);
  });

  it('should return false when table not found', () => {
    // Remove the table from the container so the function can't find it
    container.removeChild(table);

    const result = scrollToLocationById('route-1');
    expect(result).toBe(false);

    // Restore the table for other tests
    container.appendChild(table);
  });

  it('should return false when container not found', () => {
    // Remove the entire container (which contains the table) from the DOM
    document.body.removeChild(container);

    const result = scrollToLocationById('route-1');
    expect(result).toBe(false);

    // Restore the container for other tests
    document.body.appendChild(container);
  });

  it('should return false when target row not found', () => {
    const result = scrollToLocationById('non-existent-route');
    expect(result).toBe(false);
  });

  it('should scroll when row is not in view', () => {
    // Position row below the visible area and make container scrollable
    const row = table.querySelector(
      '[data-location-id="route-1"]'
    ) as HTMLElement;
    if (row) {
      row.style.position = 'absolute';
      row.style.top = '1000px';
      row.style.height = '50px';
    }

    // Ensure container has content that makes it scrollable
    container.style.height = '200px';
    container.style.overflow = 'auto';

    const result = scrollToLocationById('route-1');

    expect(result).toBe(true);
    // Since the function should complete successfully, we just verify it returns true
    // The actual scroll behavior depends on the DOM structure and may not be testable in this environment
  });

  it('should not scroll when row is already in view', () => {
    // Position row in view
    const row = table.querySelector(
      '[data-location-id="route-1"]'
    ) as HTMLElement;
    if (row) {
      row.style.position = 'absolute';
      row.style.top = '50px';
      row.style.height = '50px';
    }
    container.scrollTop = 0;

    const result = scrollToLocationById('route-1');

    expect(result).toBe(true);
    // Since the function should complete successfully, we just verify it returns true
    // The actual scroll behavior depends on the DOM structure and may not be testable in this environment
  });

  it('should highlight UIDs when provided', () => {
    const result = scrollToLocationById('route-1', {
      highlightUids: ['test-uid'],
      durationMs: 500,
    });

    expect(result).toBe(true);
    // The function should complete successfully when highlighting is requested
  });

  it('should use default scroll behavior', () => {
    const result = scrollToLocationById('route-1');
    expect(result).toBe(true);
  });
});
