import { proxyMap } from "valtio/utils";
import { getSpriteId } from "./sprites";

const PREFERRED_VARIANTS_STORAGE_KEY = "preferredVariants:v1";
const LEGACY_PREFERRED_VARIANTS_STORAGE_KEY = "preferredVariants";

const isPreferredVariantEntries = (
  value: unknown,
): value is Array<[string, string]> =>
  Array.isArray(value) &&
  value.every(
    (entry) =>
      Array.isArray(entry) &&
      entry.length === 2 &&
      typeof entry[0] === "string" &&
      typeof entry[1] === "string",
  );

// Use Valtio's proxyMap for reactivity
export const preferredVariants = proxyMap<string, string>();

// Initialize from localStorage on module load
if (typeof window !== "undefined") {
  try {
    const stored = localStorage.getItem(PREFERRED_VARIANTS_STORAGE_KEY);
    const legacyStored = localStorage.getItem(
      LEGACY_PREFERRED_VARIANTS_STORAGE_KEY,
    );
    const parseEntries = (value: string | null) => {
      if (value === null || value === "") {
        return null;
      }

      try {
        const parsed: unknown = JSON.parse(value);
        return isPreferredVariantEntries(parsed) ? parsed : null;
      } catch {
        return null;
      }
    };
    const storedEntries = parseEntries(stored);
    const legacyEntries = parseEntries(legacyStored);
    const entries = storedEntries ?? legacyEntries;
    if (entries) {
      for (const [key, value] of entries) {
        preferredVariants.set(key, value);
      }

      if (storedEntries === null && legacyEntries !== null && legacyStored) {
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
  if (!(headId || bodyId)) {
    return null;
  }

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
  if (!(headId || bodyId)) {
    return;
  }

  const key = getSpriteId(headId, bodyId);
  if (variant) {
    preferredVariants.set(key, variant);
  } else {
    preferredVariants.delete(key);
  }
}
