import { proxy, subscribe } from 'valtio';
import { z } from 'zod';
import { getActivePlaythrough } from '@/stores/playthroughs';

// Zod schema for settings validation
export const SettingsSchema = z.object({
  moveEncountersBetweenLocations: z.boolean().default(false),
  version: z.string().default('1.0.0'),
});

export type Settings = z.infer<typeof SettingsSchema>;

// Function to determine if move encounters should be enabled by default
// Based on whether the current playthrough has a version (old vs new playthroughs)
const shouldEnableMoveEncountersByDefault = (): boolean => {
  if (typeof window === 'undefined') return false; // SSR safety

  try {
    const activePlaythrough = getActivePlaythrough();

    // If no active playthrough, default to disabled (new user)
    if (!activePlaythrough) return false;

    // If playthrough has no version field, it's an old playthrough
    // Enable move encounters to maintain backward compatibility
    if (!activePlaythrough.version) return true;

    // For new playthroughs (with version), default to disabled
    return false;
  } catch (error) {
    console.warn(
      'Error checking playthrough version for settings default:',
      error
    );
    return false; // Safe default
  }
};

const getDefaultSettings = (): Settings => ({
  moveEncountersBetweenLocations: shouldEnableMoveEncountersByDefault(),
  version: '1.0.0',
});

// Load settings from localStorage on initialization with Zod validation
const loadSettings = (): Settings => {
  const dynamicDefaults = getDefaultSettings();

  if (typeof window === 'undefined') return dynamicDefaults;

  try {
    const stored = localStorage.getItem('nuzlocke-settings');
    if (stored) {
      const parsed = JSON.parse(stored);
      // Validate and parse with Zod, merging with dynamic defaults for missing fields
      const result = SettingsSchema.safeParse(parsed);
      if (result.success) {
        // If this is the first time loading and moveEncountersBetweenLocations is not set,
        // use the dynamic default based on playthrough version
        if (parsed.moveEncountersBetweenLocations === undefined) {
          return {
            ...result.data,
            moveEncountersBetweenLocations:
              dynamicDefaults.moveEncountersBetweenLocations,
          };
        }
        return result.data;
      } else {
        console.warn('Invalid settings data, using defaults:', result.error);
        return dynamicDefaults;
      }
    }
  } catch (error) {
    console.warn('Failed to load settings from localStorage:', error);
  }

  return dynamicDefaults;
};

export const settingsStore = proxy<Settings>(loadSettings());

// Subscribe to changes and save to localStorage with validation
if (typeof window !== 'undefined') {
  subscribe(settingsStore, () => {
    try {
      // Validate settings before saving
      const result = SettingsSchema.safeParse(settingsStore);
      if (result.success) {
        localStorage.setItem('nuzlocke-settings', JSON.stringify(result.data));
      } else {
        console.error('Invalid settings data, not saving:', result.error);
      }
    } catch (error) {
      console.warn('Failed to save settings to localStorage:', error);
    }
  });
}

// Helper function to safely update settings with validation
const updateSettings = (updates: Partial<Settings>) => {
  const newSettings = { ...settingsStore, ...updates };
  const result = SettingsSchema.safeParse(newSettings);

  if (result.success) {
    Object.assign(settingsStore, result.data);
  } else {
    console.error('Invalid settings update:', result.error);
  }
};

// Actions for updating settings
export const settingsActions = {
  toggleMoveEncountersBetweenLocations: () => {
    updateSettings({
      moveEncountersBetweenLocations:
        !settingsStore.moveEncountersBetweenLocations,
    });
  },

  // Helper function to reset settings to defaults
  resetToDefaults: () => {
    updateSettings(getDefaultSettings());
  },

  // Helper function to update multiple settings at once
  updateMultiple: (updates: Partial<Settings>) => {
    updateSettings(updates);
  },

  // Function to re-evaluate defaults when playthrough changes
  // This should be called when switching playthroughs if the setting hasn't been explicitly set
  refreshDefaults: () => {
    const stored = localStorage.getItem('nuzlocke-settings');
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
      console.warn('Failed to refresh settings defaults:', error);
    }
  },
};
