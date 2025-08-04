import { get, set, createStore } from 'idb-keyval';
import { getSpriteId } from './sprites';
import { debounce } from 'es-toolkit';

// Create a custom store for preferred variants
const preferredVariantsStore = createStore('preferred-variants', 'cache');

// Simple in-memory storage for preferred variants (for fast access)
const preferredVariants = new Map<string, string>();

/**
 * Load preferred variants from IndexedDB into memory
 */
async function loadPreferredVariants(): Promise<void> {
  try {
    const entries = await get('preferred-variants', preferredVariantsStore);
    if (entries && Array.isArray(entries)) {
      preferredVariants.clear();
      entries.forEach(([key, value]) => {
        preferredVariants.set(key, value);
      });
    }
  } catch (error) {
    console.warn('Failed to load preferred variants from IndexedDB:', error);
  }
}

/**
 * Save preferred variants from memory to IndexedDB
 */
async function savePreferredVariants(): Promise<void> {
  try {
    const entries = Array.from(preferredVariants.entries());
    await set('preferred-variants', entries, preferredVariantsStore);
  } catch (error) {
    console.warn('Failed to save preferred variants to IndexedDB:', error);
  }
}

/**
 * Debounced save function to avoid spamming IndexedDB with rapid writes
 * Wraps the promise to handle errors gracefully
 */
const debouncedSave = debounce(() => {
  savePreferredVariants().catch((error: unknown) => {
    console.warn('Failed to persist preferred variants to IndexedDB:', error);
    // TODO: Could implement retry logic or show user notification here
  });
}, 200);

// Load preferred variants on module initialization
if (typeof window !== 'undefined') {
  loadPreferredVariants();
}

/**
 * Get the preferred variant for a Pokémon or fusion
 */
export function getPreferredVariant(
  headId?: number | null,
  bodyId?: number | null
): string | undefined {
  if (!headId && !bodyId) return undefined;
  const spriteId = getSpriteId(headId, bodyId);
  return preferredVariants.get(spriteId);
}

/**
 * Set the preferred variant for a Pokémon or fusion
 * Uses optimistic updates - updates in-memory cache immediately,
 * then saves to IndexedDB in the background
 */
export async function setPreferredVariant(
  headId?: number | null,
  bodyId?: number | null,
  preferredVariant?: string
): Promise<void> {
  if (!headId && !bodyId) return;

  const spriteId = getSpriteId(headId, bodyId);

  // Optimistic update: immediately update in-memory cache
  if (preferredVariant) {
    preferredVariants.set(spriteId, preferredVariant);
  } else {
    preferredVariants.delete(spriteId);
  }

  // Save to IndexedDB in background with debouncing (don't await to avoid blocking UI)
  debouncedSave();
}

/**
 * Clear all preferred variants
 * Uses optimistic updates - clears in-memory cache immediately,
 * then saves to IndexedDB in the background
 */
export async function clearPreferredVariants(): Promise<void> {
  // Optimistic update: immediately clear in-memory cache
  preferredVariants.clear();

  // Save to IndexedDB in background with debouncing (don't await to avoid blocking UI)
  debouncedSave();
}

/**
 * Load preferred variants from IndexedDB (useful for forcing a reload)
 */
export async function reloadPreferredVariants(): Promise<void> {
  await loadPreferredVariants();
}
