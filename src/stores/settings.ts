import { proxy, subscribe } from 'valtio';

export interface Settings {
  // Theme is handled by next-themes, so we don't duplicate it here
  // Add other app-specific settings as needed
  moveEncountersBetweenLocations: boolean;
  _placeholder?: never; // Temporary placeholder to avoid empty interface error
}

const defaultSettings: Settings = {
  // Empty for now, add settings as needed
  moveEncountersBetweenLocations: false,
};

// Load settings from localStorage on initialization
const loadSettings = (): Settings => {
  if (typeof window === 'undefined') return defaultSettings;

  try {
    const stored = localStorage.getItem('nuzlocke-settings');
    if (stored) {
      const parsed = JSON.parse(stored);
      return { ...defaultSettings, ...parsed };
    }
  } catch (error) {
    console.warn('Failed to load settings from localStorage:', error);
  }

  return defaultSettings;
};

export const settingsStore = proxy<Settings>(loadSettings());

// Subscribe to changes and save to localStorage
if (typeof window !== 'undefined') {
  subscribe(settingsStore, () => {
    try {
      localStorage.setItem('nuzlocke-settings', JSON.stringify(settingsStore));
    } catch (error) {
      console.warn('Failed to save settings to localStorage:', error);
    }
  });
}

// Actions for updating settings
export const settingsActions = {
  // Add actions as needed
  toggleMoveEncountersBetweenLocations: () => {
    settingsStore.moveEncountersBetweenLocations =
      !settingsStore.moveEncountersBetweenLocations;
  },
};
