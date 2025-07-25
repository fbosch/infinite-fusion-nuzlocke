/**
 * Simplified sprite service for Pokémon Infinite Fusion
 * Handles sprite URL generation and variant checking with IndexedDB caching
 */

import { get, set, del, clear, createStore } from 'idb-keyval';

// Create a custom store for sprite variant cache
const spriteStore = createStore('sprite-variants', 'cache');

// Persistent cache using IndexedDB with custom store
class VariantCache {
  private static readonly CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours
  private memoryCache = new Map<
    string,
    { variants: string[]; timestamp: number }
  >();

  async get(
    key: string
  ): Promise<{ variants: string[]; timestamp: number } | undefined> {
    // Check memory cache first
    const memoryEntry = this.memoryCache.get(key);
    if (memoryEntry) {
      const now = Date.now();
      if (now - memoryEntry.timestamp < VariantCache.CACHE_DURATION) {
        return memoryEntry;
      } else {
        // Expired, remove from memory
        this.memoryCache.delete(key);
      }
    }

    // Check IndexedDB with custom store
    try {
      const entry = await get(key, spriteStore);
      if (entry) {
        const now = Date.now();
        if (now - entry.timestamp < VariantCache.CACHE_DURATION) {
          // Cache in memory for faster access
          this.memoryCache.set(key, entry);
          return entry;
        } else {
          // Expired, remove from IndexedDB
          await del(key, spriteStore);
        }
      }
    } catch (error) {
      console.warn('Failed to read from IndexedDB cache:', error);
    }

    return undefined;
  }

  async set(
    key: string,
    value: { variants: string[]; timestamp: number }
  ): Promise<void> {
    // Update memory cache
    this.memoryCache.set(key, value);

    // Update IndexedDB with custom store
    try {
      await set(key, value, spriteStore);
    } catch (error) {
      console.warn('Failed to save to IndexedDB cache:', error);
    }
  }

  async clear(): Promise<void> {
    this.memoryCache.clear();
    try {
      await clear(spriteStore);
    } catch (error) {
      console.warn('Failed to clear IndexedDB cache:', error);
    }
  }

  size(): number {
    return this.memoryCache.size;
  }
}

const variantCache = new VariantCache();
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Check if a sprite URL exists
 */
export async function checkSpriteExists(url: string): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);

    const response = await fetch(url, {
      method: 'HEAD',
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Generate sprite URL for a fusion or single Pokémon
 */
export function generateSpriteUrl(
  headId: number | undefined,
  bodyId?: number | undefined,
  variant = ''
): string {
  const id =
    headId && bodyId ? `${headId}.${bodyId}` : (headId?.toString() ?? '');

  return `https://ifd-spaces.sfo2.cdn.digitaloceanspaces.com/custom/${id}${variant}.png`;
}

/**
 * Generate variant suffix for index (0='', 1='a', 2='b', etc.)
 */
function getVariantSuffix(index: number): string {
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
 * Get available artwork variants for a Pokémon or fusion
 */
export async function getArtworkVariants(
  headId: number,
  bodyId?: number,
  maxVariants = 50
): Promise<string[]> {
  const cacheKey = bodyId ? `${headId}.${bodyId}` : headId.toString();

  // Check cache first
  const cached = await variantCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.variants;
  }

  // Check variants sequentially until we find a missing one
  const variants = ['']; // Always include default

  for (let i = 1; i < maxVariants; i++) {
    const variant = getVariantSuffix(i);
    const url = generateSpriteUrl(headId, bodyId, variant);

    const exists = await checkSpriteExists(url);
    if (exists) {
      variants.push(variant);
    } else {
      break; // Stop on first missing variant
    }
  }

  // Cache result
  await variantCache.set(cacheKey, {
    variants,
    timestamp: Date.now(),
  });

  return variants;
}

/**
 * Clear the variant cache
 */
export async function clearCache(): Promise<void> {
  await variantCache.clear();
}

/**
 * Get cache size for debugging
 */
export function getCacheSize(): number {
  return variantCache.size();
}
