/**
 * Simplified sprite service for Pokémon Infinite Fusion
 * Handles sprite URL generation and variant checking with IndexedDB caching
 *
 * Features:
 * - Memory cache for immediate access
 * - Deferred IndexedDB writes to avoid blocking the main thread
 * - Batched writes using requestIdleCallback when available
 * - Automatic cache expiration (24 hours)
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

    // Use requestIdleCallback if available, otherwise setTimeout
    if (typeof window !== 'undefined' && window.requestIdleCallback) {
      this.writeTimeoutId = window.requestIdleCallback(processBatch, {
        timeout: this.BATCH_DELAY * 2, // Fallback timeout
      }) as unknown as number;
    } else {
      this.writeTimeoutId = setTimeout(
        processBatch,
        this.BATCH_DELAY
      ) as unknown as number;
    }
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
  headId?: number | null,
  bodyId?: number | null,
  maxVariants = 50
): Promise<string[]> {
  if (!headId && !bodyId) return [''];

  const cacheKey = (
    headId && bodyId ? `${headId}.${bodyId}` : headId || bodyId || ''
  ).toString();

  // Check cache first
  const cached = await variantCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.variants;
  }

  // Check default variant
  const variants = [''];
  const defaultUrl = generateSpriteUrl(headId, bodyId, '');
  const defaultExists = await checkSpriteExists(defaultUrl);

  if (!defaultExists) {
    variantCache.set(cacheKey, { variants: [], timestamp: Date.now() });
    return [];
  }

  // Check first additional variant, then start background check
  const firstUrl = generateSpriteUrl(headId, bodyId, 'a');
  if (await checkSpriteExists(firstUrl)) {
    variants.push('a');
  }

  // Continue checking in background
  setTimeout(async () => {
    try {
      const allVariants = [''];
      for (let i = 1; i < maxVariants; i++) {
        const variant = getVariantSuffix(i);
        const url = generateSpriteUrl(headId, bodyId, variant);
        if (await checkSpriteExists(url)) {
          allVariants.push(variant);
        } else {
          break;
        }
      }
      variantCache.set(cacheKey, {
        variants: allVariants,
        timestamp: Date.now(),
      });
    } catch (error) {
      console.warn('Background variant check failed:', error);
    }
  }, 0);

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

/**
 * Manually flush pending IndexedDB writes
 * Useful for ensuring data is persisted before page unload or during testing
 */
export async function flushCache(): Promise<void> {
  await variantCache.flush();
}
