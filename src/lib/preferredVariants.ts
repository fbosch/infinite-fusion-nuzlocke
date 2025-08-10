import { getSpriteId } from './sprites';

const STORAGE_KEY = 'preferred-variants';
const preferredVariants = new Map<string, string>();

// Load on module initialization
if (typeof window !== 'undefined') {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const entries = JSON.parse(stored);
      if (Array.isArray(entries)) {
        entries.forEach(([key, value]) => preferredVariants.set(key, value));
      }
    }
  } catch (error) {
    console.warn('Failed to load preferred variants:', error);
  }
}

function saveToStorage(): void {
  try {
    if (typeof window === 'undefined') return;
    const entries = Array.from(preferredVariants.entries());
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  } catch (error) {
    console.warn('Failed to save preferred variants:', error);
  }
}

export function getPreferredVariant(
  headId?: number | null,
  bodyId?: number | null
): string | undefined {
  if (!headId && !bodyId) return undefined;
  if (headId === -1 || bodyId === -1) return undefined; // Egg
  const spriteId = getSpriteId(headId, bodyId);
  return preferredVariants.get(spriteId);
}

export function setPreferredVariant(
  headId?: number | null,
  bodyId?: number | null,
  preferredVariant?: string
): void {
  if (!headId && !bodyId) return;

  const spriteId = getSpriteId(headId, bodyId);

  if (preferredVariant) {
    preferredVariants.set(spriteId, preferredVariant);
  } else {
    preferredVariants.delete(spriteId);
  }

  saveToStorage();
}

export function reloadPreferredVariants(): void {
  try {
    if (typeof window === 'undefined') return;

    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const entries = JSON.parse(stored);
      if (Array.isArray(entries)) {
        preferredVariants.clear();
        entries.forEach(([key, value]) => preferredVariants.set(key, value));
      }
    }
  } catch (error) {
    console.warn('Failed to reload preferred variants:', error);
  }
}
