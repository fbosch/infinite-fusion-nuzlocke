import { get, set, del, clear, createStore } from 'idb-keyval';
import { SpriteVariantsResponse, SpriteVariantsError } from '@/types/sprites';

// Create a custom store for sprite variant cache
export const spriteStore = createStore('sprite-variants', 'cache');

// Universal cache implementation that works in both main thread and workers
export class SpriteVariantCache {
  private static readonly CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

  // Queue for deferred IndexedDB writes
  private writeQueue = new Map<
    string,
    { variants: string[]; timestamp: number; preferredVariant?: string }
  >();
  private writeTimeoutId: number | null = null;
  private readonly BATCH_DELAY = 100; // ms to wait before batching writes

  async get(
    key: string
  ): Promise<
    | { variants: string[]; timestamp: number; preferredVariant?: string }
    | undefined
  > {
    // Check IndexedDB with custom store
    try {
      const entry = await get(key, spriteStore);
      if (entry) {
        const now = Date.now();
        if (now - entry.timestamp < SpriteVariantCache.CACHE_DURATION) {
          // Cache in memory for faster access
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

  set(
    key: string,
    value: { variants: string[]; timestamp: number; preferredVariant?: string }
  ): void {
    // Queue IndexedDB write for deferred processing
    this.queueIndexedDBWrite(key, value);
  }

  async setPreferredVariant(
    key: string,
    preferredVariant: string
  ): Promise<void> {
    // Get current cache entry
    const existing = await this.get(key);
    if (existing) {
      // Update preferred variant while preserving existing data
      this.set(key, {
        ...existing,
        preferredVariant,
      });
    } else {
      // If no existing entry, create a minimal one with just the preferred variant
      // The variants array will be populated when getArtworkVariants is called
      this.set(key, {
        variants: [],
        timestamp: Date.now(),
        preferredVariant,
      });
    }
  }

  private queueIndexedDBWrite(
    key: string,
    value: { variants: string[]; timestamp: number; preferredVariant?: string }
  ): void {
    // Add to write queue
    this.writeQueue.set(key, value);

    // Cancel existing timeout if any
    if (this.writeTimeoutId !== null) {
      clearTimeout(this.writeTimeoutId);
    }
    // Schedule batched write using timeout
    setTimeout(() => {
      this.writeTimeoutId = null;
      this.processBatchedWrites();
    }, this.BATCH_DELAY);
  }

  private async processBatchedWrites(): Promise<void> {
    if (this.writeQueue.size === 0) return;

    // Copy queue and clear it
    const entries = Array.from(this.writeQueue.entries());
    this.writeQueue.clear();

    // Process writes in background without blocking
    try {
      // Process all writes concurrently
      await Promise.all(
        entries.map(async ([key, value]) => {
          try {
            await set(key, value, spriteStore);
          } catch (error) {
            console.warn(
              `Failed to save cache entry ${key} to IndexedDB:`,
              error
            );
          }
        })
      );
    } catch (error) {
      console.warn('Failed to process batched IndexedDB writes:', error);
    }
  }

  async clear(): Promise<void> {
    this.writeQueue.clear();

    // Cancel pending writes
    if (this.writeTimeoutId !== null) {
      if (typeof window !== 'undefined' && window.cancelIdleCallback) {
        window.cancelIdleCallback(this.writeTimeoutId);
      } else {
        clearTimeout(this.writeTimeoutId);
      }
      this.writeTimeoutId = null;
    }

    try {
      await clear(spriteStore);
    } catch (error) {
      console.warn('Failed to clear IndexedDB cache:', error);
    }
  }

  // Expose method to manually flush pending writes (useful for testing or cleanup)
  async flush(): Promise<void> {
    if (this.writeTimeoutId !== null) {
      if (typeof window !== 'undefined' && window.cancelIdleCallback) {
        window.cancelIdleCallback(this.writeTimeoutId);
      } else {
        clearTimeout(this.writeTimeoutId);
      }
      this.writeTimeoutId = null;
    }

    await this.processBatchedWrites();
  }
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
 * Core sprite service class that can be used in both main thread and workers
 */
export class SpriteService {
  private variantCache = new SpriteVariantCache();
  private readonly CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

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
    maxVariants = 50,
    forceRefresh = false
  ): Promise<string[]> {
    if (!headId && !bodyId) return [''];

    const cacheKey = (
      headId && bodyId ? `${headId}.${bodyId}` : headId || bodyId || ''
    ).toString();

    // Check cache first
    const cached = await this.variantCache.get(cacheKey);
    if (
      cached &&
      !forceRefresh &&
      Date.now() - cached.timestamp < this.CACHE_DURATION
    ) {
      return cached.variants;
    }

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

      const variants = data.variants || [];

      // Preserve existing preferred variant when updating variants
      this.variantCache.set(cacheKey, {
        variants,
        timestamp: Date.now(),
        preferredVariant: cached?.preferredVariant,
      });

      return variants;
    } catch (error) {
      console.warn(
        'Failed to get artwork variants from API, falling back to client-side check:',
        error
      );

      // Fallback to client-side checking if API fails
      const variants: string[] = [];
      try {
        for (let i = 0; i < maxVariants; i++) {
          const variant = getVariantSuffix(i);
          const url = generateSpriteUrl(headId, bodyId, variant);
          if (await checkSpriteExists(url)) {
            variants.push(variant);
          } else {
            break;
          }
        }

        // Preserve existing preferred variant when updating variants
        this.variantCache.set(cacheKey, {
          variants,
          timestamp: Date.now(),
          preferredVariant: cached?.preferredVariant,
        });
      } catch (fallbackError) {
        console.warn('Fallback sprite checking also failed:', fallbackError);
      }

      return variants;
    }
  }

  /**
   * Get the preferred variant for a Pokémon or fusion
   */
  async getPreferredVariant(
    headId?: number | null,
    bodyId?: number | null
  ): Promise<string | undefined> {
    if (!headId && !bodyId) return undefined;

    const cacheKey = (
      headId && bodyId ? `${headId}.${bodyId}` : headId || bodyId || ''
    ).toString();

    const cached = await this.variantCache.get(cacheKey);
    return cached?.preferredVariant;
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

    const cacheKey = (
      headId && bodyId ? `${headId}.${bodyId}` : headId || bodyId || ''
    ).toString();

    if (preferredVariant) {
      await this.variantCache.setPreferredVariant(cacheKey, preferredVariant);
    }
  }

  /**
   * Clear the variant cache
   */
  async clearCache(): Promise<void> {
    await this.variantCache.clear();
  }

  /**
   * Manually flush pending IndexedDB writes
   * Useful for ensuring data is persisted before page unload or during testing
   */
  async flushCache(): Promise<void> {
    await this.variantCache.flush();
  }
}
