import { get, set, createStore } from 'idb-keyval';
import { getSpriteId } from './sprites';

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
 */
export async function setPreferredVariant(
  headId?: number | null,
  bodyId?: number | null,
  preferredVariant?: string
): Promise<void> {
  if (!headId && !bodyId) return;

  const spriteId = getSpriteId(headId, bodyId);
  if (preferredVariant) {
    preferredVariants.set(spriteId, preferredVariant);
  } else {
    preferredVariants.delete(spriteId);
  }

  // Save to IndexedDB
  await savePreferredVariants();
}

/**
 * Clear all preferred variants
 */
export async function clearPreferredVariants(): Promise<void> {
  preferredVariants.clear();
  await savePreferredVariants();
}

/**
 * Load preferred variants from IndexedDB (useful for forcing a reload)
 */
export async function reloadPreferredVariants(): Promise<void> {
  await loadPreferredVariants();
}
