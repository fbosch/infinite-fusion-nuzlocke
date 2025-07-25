import * as Comlink from 'comlink';
import { get } from 'idb-keyval';
import {
  SpriteService,
  spriteStore,
  generateSpriteUrl,
} from '@/lib/spriteCore';

// Create worker and wrap with Comlink
const worker = new Worker(new URL('@/workers/sprite.worker', import.meta.url));
const SpriteWorker = Comlink.wrap<typeof SpriteService>(worker);

// Create singleton instance
const spriteService = await new SpriteWorker();

const memoryCache = new Map<string, string[]>();
const service = {
  generateSpriteUrl,
  getArtworkVariants: async (
    ...args: Parameters<typeof spriteService.getArtworkVariants>
  ): Promise<string[]> => {
    const key = (
      args[0] && args[1] ? `${args[0]}.${args[1]}` : args[0] || args[1]
    )?.toString();
    if (key) {
      try {
        if (memoryCache.has(key)) {
          const value = memoryCache.get(key);
          if (value) {
            return Promise.resolve(value);
          }
        }
        const idbCached = await get(key, spriteStore);
        if (idbCached) {
          memoryCache.set(key, idbCached.variants);
          return Promise.resolve(idbCached.variants);
        }
      } catch (error) {
        console.error(error);
      }
    }
    const promise = spriteService.getArtworkVariants(...args);
    if (key) {
      promise.then(value => {
        memoryCache.set(key, value);
      });
    }
    return promise;
  },
} as const;

export default service;
