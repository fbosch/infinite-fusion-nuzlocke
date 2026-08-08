import { proxy, subscribe } from "valtio";
import { getBrowserReducedMotion } from "@/lib/reducedMotion";
import {
  getActivePlaythrough,
  playthroughsStore,
} from "@/stores/playthroughs/store";

const SETTINGS_STORAGE_KEY = "settings:v1";
const LEGACY_SETTINGS_STORAGE_KEY = "settings";

interface Settings {
  moveEncountersBetweenLocations: boolean;
  reducedMotion?: boolean;
  version: string;
}

// fallow-ignore-next-line complexity -- Validates every persisted setting field before applying defaults.
const parseSettings = (value: unknown): Settings | null => {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return null;
  }

  const settings = value as Record<string, unknown>;
  if (
    (settings.moveEncountersBetweenLocations !== undefined &&
      typeof settings.moveEncountersBetweenLocations !== "boolean") ||
    (settings.reducedMotion !== undefined &&
      typeof settings.reducedMotion !== "boolean") ||
    (settings.version !== undefined && typeof settings.version !== "string")
  ) {
    return null;
  }

  return {
    moveEncountersBetweenLocations:
      settings.moveEncountersBetweenLocations ?? false,
    reducedMotion: settings.reducedMotion,
    version: settings.version ?? "1.0.0",
  };
};

export const SettingsSchema = {
  safeParse(value: unknown) {
    const data = parseSettings(value);
    return data
      ? { data, success: true as const }
      : { success: false as const };
  },
};

// Function to determine if move encounters should be enabled by default
// Based on whether the current playthrough has a version (old vs new playthroughs)
const shouldEnableMoveEncountersByDefault = (): boolean => {
  if (typeof window === "undefined") {
    return false; // SSR safety
  }

  try {
    const activePlaythrough = getActivePlaythrough();

    // If no active playthrough, default to disabled (new user)
    if (!activePlaythrough) {
      return false;
    }

    // If playthrough has no version field, it's an old playthrough
    // Enable move encounters to maintain backward compatibility
    if (!activePlaythrough.version) {
      return true;
    }

    // For new playthroughs (with version), default to disabled
    return false;
  } catch (error) {
    console.warn(
      "Error checking playthrough version for settings default:",
      error,
    );
    return false; // Safe default
  }
};

const getDefaultSettings = (): Settings => ({
  moveEncountersBetweenLocations: shouldEnableMoveEncountersByDefault(),
  version: "1.0.0",
});

// Load settings from localStorage on initialization with Zod validation
const loadSettings = (): Settings => {
  const dynamicDefaults = getDefaultSettings();

  if (typeof window === "undefined") {
    return dynamicDefaults;
  }

  try {
    const stored = localStorage.getItem(SETTINGS_STORAGE_KEY);
    const legacyStored = stored
      ? null
      : localStorage.getItem(LEGACY_SETTINGS_STORAGE_KEY);
    const persistedSettings = stored || legacyStored;
    if (persistedSettings) {
      const parsed = JSON.parse(persistedSettings);
      const result = parseSettings(parsed);
      if (result) {
        if (legacyStored) {
          localStorage.setItem(SETTINGS_STORAGE_KEY, legacyStored);
          localStorage.removeItem(LEGACY_SETTINGS_STORAGE_KEY);
        }
        // If this is the first time loading and moveEncountersBetweenLocations is not set,
        // use the dynamic default based on playthrough version
        if (parsed.moveEncountersBetweenLocations === undefined) {
          return {
            ...result,
            moveEncountersBetweenLocations:
              dynamicDefaults.moveEncountersBetweenLocations,
          };
        }
        return result;
      }
      console.warn("Invalid settings data, using defaults:", parsed);
      return dynamicDefaults;
    }
  } catch (error) {
    console.warn("Failed to load settings from localStorage:", error);
  }

  return dynamicDefaults;
};

export const settingsStore = proxy<Settings>(loadSettings());

export const getEffectiveReducedMotion = (
  preference = settingsStore.reducedMotion,
): boolean => {
  if (typeof preference === "boolean") {
    return preference;
  }
  return getBrowserReducedMotion();
};

// Subscribe to changes and save to localStorage with validation
if (typeof window !== "undefined") {
  subscribe(settingsStore, () => {
    try {
      const result = parseSettings(settingsStore);
      if (result) {
        localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(result));
      } else {
        console.error("Invalid settings data, not saving:", settingsStore);
      }
    } catch (error) {
      console.warn("Failed to save settings to localStorage:", error);
    }
  });
}

// Helper function to safely update settings with validation
const updateSettings = (updates: Partial<Settings>) => {
  const newSettings = { ...settingsStore, ...updates };
  const result = parseSettings(newSettings);

  if (result) {
    Object.assign(settingsStore, result);
  } else {
    console.error("Invalid settings update:", updates);
  }
};

// Actions for updating settings
export const settingsActions = {
  // Function to re-evaluate defaults when playthrough changes
  // This should be called when switching playthroughs if the setting hasn't been explicitly set
  refreshDefaults: () => {
    const stored =
      localStorage.getItem(SETTINGS_STORAGE_KEY) ??
      localStorage.getItem(LEGACY_SETTINGS_STORAGE_KEY);
    if (!stored) {
      // No settings stored yet, apply dynamic defaults
      updateSettings(getDefaultSettings());
      return;
    }

    try {
      const parsed = JSON.parse(stored);
      // Only update if moveEncountersBetweenLocations was never explicitly set
      if (parsed.moveEncountersBetweenLocations === undefined) {
        const dynamicDefaults = getDefaultSettings();
        updateSettings({
          moveEncountersBetweenLocations:
            dynamicDefaults.moveEncountersBetweenLocations,
        });
      }
    } catch (error) {
      console.warn("Failed to refresh settings defaults:", error);
    }
  },

  // Helper function to reset settings to defaults
  resetToDefaults: () => {
    updateSettings({ ...getDefaultSettings(), reducedMotion: undefined });
  },

  setReducedMotion: (reducedMotion: boolean) => {
    updateSettings({ reducedMotion });
  },
  toggleMoveEncountersBetweenLocations: () => {
    updateSettings({
      moveEncountersBetweenLocations:
        !settingsStore.moveEncountersBetweenLocations,
    });
  },

  // Helper function to update multiple settings at once
  updateMultiple: (updates: Partial<Settings>) => {
    updateSettings(updates);
  },
};

if (typeof window !== "undefined") {
  let wasLoading = playthroughsStore.isLoading;

  subscribe(playthroughsStore, () => {
    const hasFinishedLoading = wasLoading && !playthroughsStore.isLoading;
    wasLoading = playthroughsStore.isLoading;

    if (hasFinishedLoading) {
      settingsActions.refreshDefaults();
    }
  });
}
