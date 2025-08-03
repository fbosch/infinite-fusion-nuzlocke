import {
  SpriteCreditsResponse,
  SpriteService,
  generateSpriteUrl,
} from '@/lib/spriteCore';

const instance = new SpriteService();

const service = {
  generateSpriteUrl,
  getArtworkVariants: async (
    ...args: Parameters<typeof SpriteService.prototype.getArtworkVariants>
  ): Promise<string[]> => {
    return instance.getArtworkVariants(...args);
  },
  getPreferredVariant: async (
    ...args: Parameters<typeof SpriteService.prototype.getPreferredVariant>
  ): Promise<string | undefined> => {
    return instance.getPreferredVariant(...args);
  },
  setPreferredVariant: async (
    ...args: Parameters<typeof SpriteService.prototype.setPreferredVariant>
  ): Promise<void> => {
    return instance.setPreferredVariant(...args);
  },
  getSpriteCredits: async (
    ...args: Parameters<typeof SpriteService.prototype.getSpriteCredits>
  ): Promise<SpriteCreditsResponse | null> => {
    return instance.getSpriteCredits(...args);
  },
} as const;

export default service;
