/**
 * Check if a sprite URL exists by attempting to load it
 * Returns a promise that resolves to true if the image exists, false otherwise
 */
export async function checkSpriteExists(url: string): Promise<boolean> {
  return new Promise(resolve => {
    window.requestAnimationFrame(() => {
      const img = new Image();
      let resolved = false;

      const resolveOnce = (result: boolean) => {
        if (!resolved) {
          resolved = true;
          resolve(result);
        }
      };

      // Set a timeout to avoid hanging on slow networks
      const timeout = setTimeout(() => {
        resolveOnce(false);
      }, 3000); // Reduced to 3 second timeout for faster response

      img.onload = () => {
        clearTimeout(timeout);
        resolveOnce(true);
      };

      img.onerror = () => {
        clearTimeout(timeout);
        resolveOnce(false);
      };

      window.requestAnimationFrame(() => {
        img.src = url;
      });
    });
  });
}

/**
 * Generate sprite URL for a fusion with optional artwork variant
 */
export function generateFusionSpriteUrl(
  headId: number,
  bodyId: number,
  variant?: string
): string {
  const variantSuffix = variant ? variant : '';
  return `https://ifd-spaces.sfo2.cdn.digitaloceanspaces.com/custom/${headId}.${bodyId}${variantSuffix}.png`;
}

// Enhanced cache with metadata about checking status
interface VariantCacheEntry {
  variants: string[];
  lastChecked: number;
  isComplete: boolean; // Whether we've checked all possible variants
  checkingPromise?: Promise<string[]>; // Track ongoing checks to avoid duplicates
}

// Persistent cache using localStorage
class PersistentVariantCache {
  private static readonly STORAGE_KEY = 'pokemon-fusion-variant-cache';
  private static readonly CACHE_VERSION = 1;
  private cache = new Map<string, VariantCacheEntry>();

  constructor() {
    this.loadFromStorage();
  }

  private loadFromStorage(): void {
    // Check if we're in a browser environment
    if (typeof window === 'undefined' || !globalThis.localStorage) return;

    try {
      const stored = localStorage.getItem(PersistentVariantCache.STORAGE_KEY);
      if (!stored) return;

      const parsed = JSON.parse(stored);

      // Check version compatibility
      if (parsed.version !== PersistentVariantCache.CACHE_VERSION) {
        console.log('Cache version mismatch, clearing cache');
        this.clearAll();
        return;
      }

      // Restore cache entries (excluding promises which can't be serialized)
      const entries = parsed.entries || [];
      for (const [key, entry] of entries) {
        this.cache.set(key, {
          variants: entry.variants,
          lastChecked: entry.lastChecked,
          isComplete: entry.isComplete,
          // Don't restore checkingPromise - it will be recreated if needed
        });
      }

      console.log(
        `Loaded ${this.cache.size} variant cache entries from localStorage`
      );
    } catch (error) {
      console.warn('Failed to load variant cache from localStorage:', error);
      this.clearAll();
    }
  }

  private saveToStorage(): void {
    // Check if we're in a browser environment
    if (typeof window === 'undefined' || !globalThis.localStorage) return;

    try {
      window.requestAnimationFrame(() => {
        // Convert Map to serializable format, excluding promises
        const entries = Array.from(this.cache.entries()).map(([key, entry]) => [
          key,
          {
            variants: entry.variants,
            lastChecked: entry.lastChecked,
            isComplete: entry.isComplete,
            // Exclude checkingPromise from serialization
          },
        ]);

        const toStore = {
          version: PersistentVariantCache.CACHE_VERSION,
          entries,
          savedAt: Date.now(),
        };

        localStorage.setItem(
          PersistentVariantCache.STORAGE_KEY,
          JSON.stringify(toStore)
        );
      });
    } catch (error) {
      console.warn('Failed to save variant cache to localStorage:', error);
      // Handle quota exceeded or other storage errors gracefully
    }
  }

  get(key: string): VariantCacheEntry | undefined {
    return this.cache.get(key);
  }

  set(key: string, entry: VariantCacheEntry): void {
    this.cache.set(key, entry);
    // Save to localStorage after updating cache
    this.saveToStorage();
  }

  has(key: string): boolean {
    return this.cache.has(key);
  }

  delete(key: string): boolean {
    const result = this.cache.delete(key);
    if (result) {
      this.saveToStorage();
    }
    return result;
  }

  clear(): void {
    this.cache.clear();
    this.saveToStorage();
  }

  clearAll(): void {
    this.cache.clear();
    // Check if we're in a browser environment
    if (typeof window === 'undefined' || !globalThis.localStorage) return;

    try {
      localStorage.removeItem(PersistentVariantCache.STORAGE_KEY);
    } catch (error) {
      console.warn('Failed to clear localStorage:', error);
    }
  }

  entries(): IterableIterator<[string, VariantCacheEntry]> {
    return this.cache.entries();
  }

  get size(): number {
    return this.cache.size;
  }

  // Clean up expired entries and save
  clearExpired(expiryTime: number): number {
    const now = Date.now();
    let cleared = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.lastChecked > expiryTime) {
        this.cache.delete(key);
        cleared++;
      }
    }

    if (cleared > 0) {
      this.saveToStorage();
      console.log(`Cleared ${cleared} expired cache entries`);
    }

    return cleared;
  }
}

const variantCache = new PersistentVariantCache();
const CACHE_EXPIRY = 7 * 24 * 60 * 60 * 1000; // 7 days

/**
 * Generate variant suffix for a given index
 * Supports pattern: '', 'a', 'b', ..., 'z', 'aa', 'ab', 'ac', ..., 'az', 'ba', 'bb', etc.
 */
function generateVariantSuffix(index: number): string {
  if (index === 0) return ''; // Default variant

  // Convert to 0-based index for letter generation
  index = index - 1;

  let result = '';

  // Generate base-26 representation
  do {
    result = String.fromCharCode(97 + (index % 26)) + result; // 97 is 'a'
    index = Math.floor(index / 26);
  } while (index > 0);

  return result;
}

/**
 * Sequential variant checking - stops immediately on first missing variant
 * This minimizes HTTP requests by stopping as soon as we hit a 404
 */
async function checkVariantsSequentially(
  headId: number,
  bodyId: number,
  maxVariants: number = 100
): Promise<string[]> {
  const variants = ['']; // Always include default

  // Check variants one by one, stopping immediately when one doesn't exist
  for (let i = 1; i < maxVariants; i++) {
    const variantSuffix = generateVariantSuffix(i);
    const url = generateFusionSpriteUrl(headId, bodyId, variantSuffix);

    try {
      const exists = await checkSpriteExists(url);

      if (exists) {
        variants.push(variantSuffix);
        console.log(
          `Found variant '${variantSuffix}' for fusion ${headId}.${bodyId}`
        );
      } else {
        // Stop immediately on first missing variant
        console.log(
          `Variant '${variantSuffix}' not found for fusion ${headId}.${bodyId}, stopping check`
        );
        break;
      }
    } catch (error) {
      console.warn(
        `Error checking variant ${variantSuffix} for ${headId}.${bodyId}:`,
        error
      );
      // Stop on error as well
      break;
    }
  }

  console.log(
    `Sequential check complete for ${headId}.${bodyId}: found ${variants.length} total variants`
  );
  return variants;
}

/**
 * Get available artwork variants for a fusion with optimized sequential checking
 * Uses sequential checking to minimize HTTP requests by stopping on first 404
 */
export async function getAvailableArtworkVariants(
  headId: number,
  bodyId: number,
  maxVariants: number = 10
): Promise<string[]> {
  const cacheKey = `${headId}.${bodyId}`;
  const now = Date.now();

  // Check if we have a valid cached result
  const cached = variantCache.get(cacheKey);
  if (cached && now - cached.lastChecked < CACHE_EXPIRY) {
    return cached.variants;
  }

  // If there's already an ongoing check for this fusion, wait for it
  if (cached?.checkingPromise) {
    return await cached.checkingPromise;
  }

  // Start the check and cache the promise to avoid duplicate requests
  const checkingPromise = (async () => {
    try {
      console.log(
        `Checking artwork variants for fusion ${headId}.${bodyId}...`
      );

      // Use sequential checking to minimize HTTP requests
      const variants = await checkVariantsSequentially(
        headId,
        bodyId,
        maxVariants
      );

      console.log(
        `Found ${variants.length} variants for fusion ${headId}.${bodyId}: [${variants.join(', ')}]`
      );

      // Cache the result
      const cacheEntry: VariantCacheEntry = {
        variants,
        lastChecked: now,
        isComplete: true,
      };
      variantCache.set(cacheKey, cacheEntry);

      return variants;
    } catch (error) {
      console.error(`Failed to check variants for ${headId}.${bodyId}:`, error);

      // Cache a minimal result to avoid repeated failures
      const fallbackEntry: VariantCacheEntry = {
        variants: [''], // Just the default
        lastChecked: now,
        isComplete: false,
      };
      variantCache.set(cacheKey, fallbackEntry);

      return [''];
    }
  })();

  // Store the promise in cache to prevent duplicate requests
  if (cached) {
    cached.checkingPromise = checkingPromise;
  } else {
    variantCache.set(cacheKey, {
      variants: [''],
      lastChecked: 0,
      isComplete: false,
      checkingPromise,
    });
  }

  return await checkingPromise;
}

/**
 * Preload variants for multiple fusions in the background
 * Useful for preloading variants for visible encounters
 */
export async function preloadArtworkVariants(
  fusions: Array<{ headId: number; bodyId: number }>,
  maxConcurrent: number = 2
): Promise<void> {
  console.log(`Preloading artwork variants for ${fusions.length} fusions...`);

  // Process fusions in small batches to avoid overwhelming the server
  for (let i = 0; i < fusions.length; i += maxConcurrent) {
    const batch = fusions.slice(i, i + maxConcurrent);

    const preloadPromises = batch.map(({ headId, bodyId }) =>
      getAvailableArtworkVariants(headId, bodyId).catch(error => {
        console.warn(
          `Failed to preload variants for ${headId}.${bodyId}:`,
          error
        );
      })
    );

    await Promise.all(preloadPromises);

    // Add a small delay between batches to be respectful to the server
    if (i + maxConcurrent < fusions.length) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  console.log(
    `Completed preloading artwork variants for ${fusions.length} fusions`
  );
}

/**
 * Get cache statistics for debugging
 */
export function getVariantCacheStats(): {
  size: number;
  entries: Array<{
    key: string;
    variants: number;
    lastChecked: Date;
    isComplete: boolean;
  }>;
} {
  const entries = Array.from(variantCache.entries()).map(([key, entry]) => ({
    key,
    variants: entry.variants.length,
    lastChecked: new Date(entry.lastChecked),
    isComplete: entry.isComplete,
  }));

  return {
    size: variantCache.size,
    entries,
  };
}

/**
 * Clear expired cache entries
 */
export function clearExpiredCache(): number {
  return variantCache.clearExpired(CACHE_EXPIRY);
}

/**
 * Clear the variant cache (useful for testing or if variants change)
 */
export function clearVariantCache(): void {
  variantCache.clearAll();
  console.log('Cleared all variant cache entries');
}

/**
 * Get cached variants without making HTTP requests
 * Returns null if not cached or expired
 */
export function getCachedArtworkVariants(
  headId: number,
  bodyId: number
): string[] | null {
  const cacheKey = `${headId}.${bodyId}`;
  const cached = variantCache.get(cacheKey);

  if (!cached) return null;

  const now = Date.now();
  if (now - cached.lastChecked > CACHE_EXPIRY) {
    return null;
  }

  return cached.variants;
}
