import * as Comlink from 'comlink';
import { SpriteService, generateSpriteUrl } from '@/lib/spriteCore';

let mainThreadInstance: SpriteService | null = null;
let instance: Comlink.Remote<SpriteService> | SpriteService | null = null;

async function getInstance(mainThread = false) {
  if (mainThread) {
    if (!mainThreadInstance) {
      mainThreadInstance = new SpriteService();
    }
    return mainThreadInstance as SpriteService;
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
  return instance || (mainThreadInstance as SpriteService);
}

const service = {
  generateSpriteUrl,
  getArtworkVariants: async (
    ...args: Parameters<typeof SpriteService.prototype.getArtworkVariants>
  ): Promise<string[]> => {
    const spriteService = await getInstance(true);
    return spriteService.getArtworkVariants(...args);
  },
  getPreferredVariant: async (
    ...args: Parameters<typeof SpriteService.prototype.getPreferredVariant>
  ): Promise<string | undefined> => {
    // Use main thread instance for IndexedDB operations
    const spriteService = await getInstance();
    return spriteService.getPreferredVariant(...args);
  },
  setPreferredVariant: async (
    ...args: Parameters<typeof SpriteService.prototype.setPreferredVariant>
  ): Promise<void> => {
    // Use main thread instance for IndexedDB operations
    const spriteService = await getInstance();
    return spriteService.setPreferredVariant(...args);
  },
} as const;

export default service;
