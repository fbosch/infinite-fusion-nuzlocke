import * as Comlink from 'comlink';
import { SpriteService } from '@/lib/spriteCore';

// Create a single instance of the sprite service for the worker
const spriteService = new SpriteService();

// Export the worker interface for Comlink
export type SpriteWorkerType = SpriteService;

// Expose the sprite service directly through Comlink
Comlink.expose(spriteService);
