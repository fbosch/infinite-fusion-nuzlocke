import { get, set, createStore } from 'idb-keyval';
import { SpriteVariantsResponse, SpriteVariantsError } from '@/types/sprites';

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
 * Check if a sprite URL exists
 * Works in both main thread (using Image) and web workers (using fetch)
 */
export async function checkSpriteExists(url: string): Promise<boolean> {
  // Try Image approach first in main thread (more reliable for images)
  if (typeof window !== 'undefined' && typeof Image !== 'undefined') {
    return new Promise<boolean>(resolve => {
      const img = new Image();
      img.decoding = 'async';

      const timeoutId = setTimeout(() => {
        img.onload = null;
        img.onerror = null;
        resolve(false);
      }, 3000);

      img.onload = () => {
        clearTimeout(timeoutId);
        resolve(true);
      };

      img.onerror = () => {
        clearTimeout(timeoutId);
        resolve(false);
      };

      img.src = url;
    });
  }

  // Fallback to fetch for web workers or when Image is not available
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);

    const response = await fetch(url, {
      method: 'HEAD',
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    return response.ok;
  } catch (error) {
    // If HEAD fails, try GET (some servers don't support HEAD)
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);

      const response = await fetch(url, {
        method: 'GET',
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      return response.ok;
    } catch (getError) {
      console.warn('Failed to check sprite exists:', error, getError);
      return false;
    }
  }
}

/**
 * Generate sprite URL for a fusion or single Pokémon
 */
export function generateSpriteUrl(
  headId?: number | null,
  bodyId?: number | null,
  variant = ''
): string {
  const id = headId && bodyId ? `${headId}.${bodyId}` : headId || bodyId || '';
  return `https://ifd-spaces.sfo2.cdn.digitaloceanspaces.com/custom/${id}${variant}.png`;
}

/**
 * Generate variant suffix for index (0='', 1='a', 2='b', etc.)
 */
export function getVariantSuffix(index: number): string {
  if (index === 0) return '';

  let result = '';
  index = index - 1; // Convert to 0-based

  do {
    result = String.fromCharCode(97 + (index % 26)) + result;
    index = Math.floor(index / 26);
  } while (index > 0);

  return result;
}

/**
 * Get the cache key for a Pokémon or fusion
 */
function getCacheKey(headId?: number | null, bodyId?: number | null): string {
  return headId && bodyId
    ? `${headId}.${bodyId}`
    : (headId || bodyId || '').toString();
}

/**
 * Simple sprite service class
 */
export class SpriteService {
  /**
   * Generate sprite URL for a fusion or single Pokémon
   */
  generateSpriteUrl(
    headId?: number | null,
    bodyId?: number | null,
    variant = ''
  ): string {
    return generateSpriteUrl(headId, bodyId, variant);
  }

  /**
   * Check if a sprite URL exists
   */
  async checkSpriteExists(url: string): Promise<boolean> {
    return checkSpriteExists(url);
  }

  /**
   * Get available artwork variants for a Pokémon or fusion
   */
  async getArtworkVariants(
    headId?: number | null,
    bodyId?: number | null,
    maxVariants = 50
  ): Promise<string[]> {
    if (!headId && !bodyId) return [''];

    try {
      // Use edge function to get variants (avoids CORS issues)
      const id =
        headId && bodyId ? `${headId}.${bodyId}` : headId || bodyId || '';
      const params = new URLSearchParams();
      params.set('id', id.toString());

      const response = await fetch(
        `/api/sprites/variants?${params.toString()}`
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch variants: ${response.statusText}`);
      }

      const data: SpriteVariantsResponse | SpriteVariantsError =
        await response.json();

      // Check if response is an error
      if ('error' in data) {
        throw new Error(data.error);
      }

      return data.variants || [];
    } catch (error) {
      console.warn('Failed to get artwork variants from API:', error);

      // Return empty array to avoid CORS issues with direct CDN access
      // The API should handle all sprite checking server-side
      return [''];
    }
  }

  /**
   * Get the preferred variant for a Pokémon or fusion
   */
  getPreferredVariant(
    headId?: number | null,
    bodyId?: number | null
  ): string | undefined {
    if (!headId && !bodyId) return undefined;
    const cacheKey = getCacheKey(headId, bodyId);
    return preferredVariants.get(cacheKey);
  }

  /**
   * Set the preferred variant for a Pokémon or fusion
   */
  async setPreferredVariant(
    headId?: number | null,
    bodyId?: number | null,
    preferredVariant?: string
  ): Promise<void> {
    if (!headId && !bodyId) return;

    const cacheKey = getCacheKey(headId, bodyId);
    if (preferredVariant) {
      preferredVariants.set(cacheKey, preferredVariant);
    } else {
      preferredVariants.delete(cacheKey);
    }

    // Save to IndexedDB
    await savePreferredVariants();
  }

  /**
   * Clear all preferred variants
   */
  async clearPreferredVariants(): Promise<void> {
    preferredVariants.clear();
    await savePreferredVariants();
  }

  /**
   * Load preferred variants from IndexedDB
   */
  async loadPreferredVariants(): Promise<void> {
    await loadPreferredVariants();
  }
}
