import { get, set, del, clear, createStore } from 'idb-keyval';

// Create a custom store for sprite variant cache
export const spriteStore = createStore('sprite-variants', 'cache');

// Universal cache implementation that works in both main thread and workers
export class SpriteVariantCache {
  private static readonly CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours
  private memoryCache = new Map<
    string,
    { variants: string[]; timestamp: number }
  >();

  // Queue for deferred IndexedDB writes
  private writeQueue = new Map<
    string,
    { variants: string[]; timestamp: number }
  >();
  private writeTimeoutId: number | null = null;
  private readonly BATCH_DELAY = 100; // ms to wait before batching writes

  async get(
    key: string
  ): Promise<{ variants: string[]; timestamp: number } | undefined> {
    // Check memory cache first
    const memoryEntry = this.memoryCache.get(key);
    if (memoryEntry) {
      const now = Date.now();
      if (now - memoryEntry.timestamp < SpriteVariantCache.CACHE_DURATION) {
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
        if (now - entry.timestamp < SpriteVariantCache.CACHE_DURATION) {
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

  set(key: string, value: { variants: string[]; timestamp: number }): void {
    // Update memory cache immediately (synchronous, fast)
    this.memoryCache.set(key, value);

    // Queue IndexedDB write for deferred processing
    this.queueIndexedDBWrite(key, value);
  }

  private queueIndexedDBWrite(
    key: string,
    value: { variants: string[]; timestamp: number }
  ): void {
    // Add to write queue
    this.writeQueue.set(key, value);

    // Cancel existing timeout if any
    if (this.writeTimeoutId !== null) {
      clearTimeout(this.writeTimeoutId);
    }

    // Schedule batched write using idle callback or timeout
    const processBatch = () => {
      this.writeTimeoutId = null;
      this.processBatchedWrites();
    };

    processBatch();
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
    this.memoryCache.clear();
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

  size(): number {
    return this.memoryCache.size;
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
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);

    const response = await fetch(url, {
      method: 'HEAD',
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    return response.ok; // This will be false for 404s
  } catch (error) {
    // Network error, abort, or CORS issue - assume image doesn't exist
    return false;
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
    maxVariants = 50
  ): Promise<string[]> {
    if (!headId && !bodyId) return [''];

    const cacheKey = (
      headId && bodyId ? `${headId}.${bodyId}` : headId || bodyId || ''
    ).toString();

    // Check cache first
    const cached = await this.variantCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      console.log('cached from worker!');
      return cached.variants;
    }

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
      this.variantCache.set(cacheKey, {
        variants,
        timestamp: Date.now(),
      });
    } catch (error) {
      console.warn('Failed to get artwork variants:', error);
    }

    return variants;
  }

  /**
   * Clear the variant cache
   */
  async clearCache(): Promise<void> {
    await this.variantCache.clear();
  }

  /**
   * Get cache size for debugging
   */
  getCacheSize(): number {
    return this.variantCache.size();
  }

  /**
   * Manually flush pending IndexedDB writes
   * Useful for ensuring data is persisted before page unload or during testing
   */
  async flushCache(): Promise<void> {
    await this.variantCache.flush();
  }

  /**
   * Get service stats for debugging
   */
  getStats(): {
    cacheSize: number;
    initialized: boolean;
  } {
    return {
      cacheSize: this.variantCache.size(),
      initialized: true,
    };
  }
}
