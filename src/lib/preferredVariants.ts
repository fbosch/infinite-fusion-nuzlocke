import { proxyMap } from "valtio/utils";
import { getSpriteId } from "./sprites";

const PREFERRED_VARIANTS_STORAGE_KEY = "preferredVariants:v1";
const LEGACY_PREFERRED_VARIANTS_STORAGE_KEY = "preferredVariants";

// Use Valtio's proxyMap for reactivity
export const preferredVariants = proxyMap<string, string>();

// Initialize from localStorage on module load
if (typeof window !== "undefined") {
  try {
    const stored = localStorage.getItem(PREFERRED_VARIANTS_STORAGE_KEY);
    const legacyStored = stored
      ? null
      : localStorage.getItem(LEGACY_PREFERRED_VARIANTS_STORAGE_KEY);
    const persistedVariants = stored ?? legacyStored;
    if (persistedVariants) {
      const entries = JSON.parse(persistedVariants);
      for (const [key, value] of entries) {
        preferredVariants.set(key, value);
      }

      if (legacyStored) {
        localStorage.setItem(PREFERRED_VARIANTS_STORAGE_KEY, legacyStored);
        localStorage.removeItem(LEGACY_PREFERRED_VARIANTS_STORAGE_KEY);
      }
    }
  } catch (error) {
    console.error(
      "Failed to load preferred variants from localStorage:",
      error,
    );
  }
}

// Save to localStorage whenever the Map changes
const saveToStorage = () => {
  try {
    const entries = Array.from(preferredVariants.entries());
    localStorage.setItem(
      PREFERRED_VARIANTS_STORAGE_KEY,
      JSON.stringify(entries),
    );
  } catch (error) {
    console.error("Failed to save preferred variants to localStorage:", error);
  }
};

// Subscribe to changes and save to localStorage
import { subscribe } from "valtio";

subscribe(preferredVariants, saveToStorage);

/**
 * Get the preferred variant for a Pokémon or fusion
 */
export function getPreferredVariant(
  headId: number | null,
  bodyId: number | null,
): string | null {
  if (!headId && !bodyId) return null;

  const key = getSpriteId(headId, bodyId);
  return preferredVariants.get(key) ?? null;
}

/**
 * Set the preferred variant for a Pokémon or fusion
 */
export function setPreferredVariant(
  headId: number | null,
  bodyId: number | null,
  variant: string,
): void {
  if (!headId && !bodyId) return;

  const key = getSpriteId(headId, bodyId);
  if (variant) {
    preferredVariants.set(key, variant);
  } else {
    preferredVariants.delete(key);
  }
}
