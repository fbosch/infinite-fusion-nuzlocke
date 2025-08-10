import { getSpriteId } from './sprites';

// Storage key for localStorage
const STORAGE_KEY = 'preferred-variants';

// Simple in-memory storage for preferred variants (for fast access)
const preferredVariants = new Map<string, string>();

/**
 * Load preferred variants from localStorage into memory
 */
function loadPreferredVariants(): void {
  try {
    if (typeof window === 'undefined') return;

    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const entries = JSON.parse(stored);
      if (Array.isArray(entries)) {
        preferredVariants.clear();
        entries.forEach(([key, value]) => {
          preferredVariants.set(key, value);
        });
      }
    }
  } catch (error) {
    console.warn('Failed to load preferred variants from localStorage:', error);
  }
}

/**
 * Save preferred variants from memory to localStorage
 */
function savePreferredVariants(): void {
  try {
    if (typeof window === 'undefined') return;

    const entries = Array.from(preferredVariants.entries());
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  } catch (error) {
    console.warn('Failed to save preferred variants to localStorage:', error);
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
  if (headId === -1 || bodyId === -1) return undefined; // Egg
  const spriteId = getSpriteId(headId, bodyId);
  return preferredVariants.get(spriteId);
}

/**
 * Set the preferred variant for a Pokémon or fusion
 * Updates in-memory cache and localStorage immediately
 */
export function setPreferredVariant(
  headId?: number | null,
  bodyId?: number | null,
  preferredVariant?: string
): void {
  if (!headId && !bodyId) return;

  const spriteId = getSpriteId(headId, bodyId);

  // Update in-memory cache
  if (preferredVariant) {
    preferredVariants.set(spriteId, preferredVariant);
  } else {
    preferredVariants.delete(spriteId);
  }

  // Save to localStorage immediately
  savePreferredVariants();
}

/**
 * Clear all preferred variants
 * Clears in-memory cache and localStorage immediately
 */
export function clearPreferredVariants(): void {
  // Clear in-memory cache
  preferredVariants.clear();

  // Save to localStorage immediately
  savePreferredVariants();
}

/**
 * Load preferred variants from localStorage (useful for forcing a reload)
 */
export function reloadPreferredVariants(): void {
  loadPreferredVariants();
}
