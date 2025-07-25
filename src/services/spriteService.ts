import * as Comlink from 'comlink';
import { get } from 'idb-keyval';
import {
  SpriteService,
  spriteStore,
  generateSpriteUrl,
} from '@/lib/spriteCore';

const mainThreadInstance: SpriteService = new SpriteService();
let instance: Comlink.Remote<SpriteService> | SpriteService | null = null;

async function getInstance(mainThread = false) {
  if (mainThread) {
    return mainThreadInstance;
  }
  if (instance) {
    return instance;
  }
  try {
    // Create worker and wrap with Comlink
    const worker = new Worker(
      new URL('@/workers/sprite.worker', import.meta.url)
    );
    const SpriteWorker = Comlink.wrap<typeof SpriteService>(worker);
    // Create singleton instance
    const spriteService = await new SpriteWorker();
    instance = spriteService;
  } catch (error) {
    instance = mainThreadInstance;
    console.error(error);
  }
  return instance || mainThreadInstance;
}

const memoryCache = new Map<string, string[]>();
const service = {
  generateSpriteUrl,
  getArtworkVariants: async (
    ...args: Parameters<typeof SpriteService.prototype.getArtworkVariants>
  ): Promise<string[]> => {
    const spriteService = await getInstance(true);
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
        if (idbCached?.variants?.length > 0) {
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
  getPreferredVariant: async (
    ...args: Parameters<typeof SpriteService.prototype.getPreferredVariant>
  ): Promise<string | undefined> => {
    const spriteService = await getInstance();
    return spriteService.getPreferredVariant(...args);
  },
  setPreferredVariant: async (
    ...args: Parameters<typeof SpriteService.prototype.setPreferredVariant>
  ): Promise<void> => {
    const spriteService = await getInstance();
    return spriteService.setPreferredVariant(...args);
  },
} as const;

export default service;
