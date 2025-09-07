import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { settingsStore, settingsActions, SettingsSchema } from '../settings';
import { getActivePlaythrough } from '../playthroughs';

// Mock the playthroughs store
vi.mock('../playthroughs', () => ({
  getActivePlaythrough: vi.fn(),
}));

const mockGetActivePlaythrough = vi.mocked(getActivePlaythrough);

// Helper to clear localStorage
const clearLocalStorage = () => {
  localStorage.clear();
};

describe('Settings Store', () => {
  beforeEach(() => {
    // Clear all mocks and localStorage
    vi.clearAllMocks();
    clearLocalStorage();
    mockGetActivePlaythrough.mockReturnValue(null);
  });

  afterEach(() => {
    // Clear localStorage after each test
    clearLocalStorage();
  });

  describe('SettingsSchema', () => {
    it('validates valid settings object', () => {
      const validSettings = {
        moveEncountersBetweenLocations: true,
        version: '1.0.0',
      };

      const result = SettingsSchema.safeParse(validSettings);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(validSettings);
      }
    });

    it('applies defaults for missing fields', () => {
      const partialSettings = {};

      const result = SettingsSchema.safeParse(partialSettings);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual({
          moveEncountersBetweenLocations: false,
          version: '1.0.0',
        });
      }
    });

    it('rejects invalid types', () => {
      const invalidSettings = {
        moveEncountersBetweenLocations: 'invalid',
        version: 123,
      };

      const result = SettingsSchema.safeParse(invalidSettings);
      expect(result.success).toBe(false);
    });
  });

  describe('Version-based Default Logic', () => {
    it('enables move encounters for old playthroughs (no version)', async () => {
      // Mock old playthrough without version field
      mockGetActivePlaythrough.mockReturnValue({
        id: 'old-playthrough',
        name: 'Old Run',
        gameMode: 'classic',
        encounters: {},
        team: [],
        pc: [],
        customLocations: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
        // No version field - this indicates old playthrough
      } as any);

      // Import fresh instance to trigger initialization
      const { settingsStore: freshStore } = await import(
        '../settings?t=' + Date.now()
      );

      expect(freshStore.moveEncountersBetweenLocations).toBe(true);
    });

    it('disables move encounters for new playthroughs (with version)', async () => {
      // Mock new playthrough with version field
      mockGetActivePlaythrough.mockReturnValue({
        id: 'new-playthrough',
        name: 'New Run',
        gameMode: 'classic',
        encounters: {},
        team: [],
        pc: [],
        customLocations: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
        version: '1.0.0', // Has version - this indicates new playthrough
      } as any);

      // Import fresh instance to trigger initialization
      const { settingsStore: freshStore } = await import(
        '../settings?t=' + Date.now()
      );

      expect(freshStore.moveEncountersBetweenLocations).toBe(false);
    });

    it('disables move encounters when no active playthrough (new user)', async () => {
      mockGetActivePlaythrough.mockReturnValue(null);

      // Import fresh instance to trigger initialization
      const { settingsStore: freshStore } = await import(
        '../settings?t=' + Date.now()
      );

      expect(freshStore.moveEncountersBetweenLocations).toBe(false);
    });

    it('handles errors gracefully and defaults to disabled', async () => {
      mockGetActivePlaythrough.mockImplementation(() => {
        throw new Error('Playthrough access failed');
      });

      // Spy on console.warn to verify error logging
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      // Import fresh instance to trigger initialization
      const { settingsStore: freshStore } = await import(
        '../settings?t=' + Date.now()
      );

      expect(freshStore.moveEncountersBetweenLocations).toBe(false);
      expect(consoleSpy).toHaveBeenCalledWith(
        'Error checking playthrough version for settings default:',
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });
  });

  describe('localStorage Integration', () => {
    it('loads settings from localStorage when available', async () => {
      const storedSettings = {
        moveEncountersBetweenLocations: true,
        version: '1.0.0',
      };

      localStorage.setItem('settings', JSON.stringify(storedSettings));

      // Import fresh instance to trigger initialization
      const { settingsStore: freshStore } = await import(
        '../settings?t=' + Date.now()
      );

      expect(freshStore.moveEncountersBetweenLocations).toBe(true);
      expect(freshStore.version).toBe('1.0.0');
    });

    it('uses dynamic defaults when localStorage is empty', async () => {
      // localStorage is already cleared in beforeEach
      mockGetActivePlaythrough.mockReturnValue({
        id: 'old-playthrough',
        name: 'Old Run',
        // No version field
      } as any);

      // Import fresh instance to trigger initialization
      const { settingsStore: freshStore } = await import(
        '../settings?t=' + Date.now()
      );

      expect(freshStore.moveEncountersBetweenLocations).toBe(true);
    });

    it('applies dynamic default only when setting is undefined in localStorage', async () => {
      // Stored settings without moveEncountersBetweenLocations field
      const storedSettings = {
        version: '1.0.0',
      };

      localStorage.setItem('settings', JSON.stringify(storedSettings));
      mockGetActivePlaythrough.mockReturnValue({
        id: 'old-playthrough',
        name: 'Old Run',
        // No version field - should enable move encounters
      } as any);

      // Import fresh instance to trigger initialization
      const { settingsStore: freshStore } = await import(
        '../settings?t=' + Date.now()
      );

      expect(freshStore.moveEncountersBetweenLocations).toBe(true);
    });

    it('preserves explicit user setting from localStorage', async () => {
      // User explicitly disabled move encounters in old playthrough
      const storedSettings = {
        moveEncountersBetweenLocations: false,
        version: '1.0.0',
      };

      localStorage.setItem('settings', JSON.stringify(storedSettings));
      mockGetActivePlaythrough.mockReturnValue({
        id: 'old-playthrough',
        name: 'Old Run',
        // No version field - would normally enable, but user explicitly disabled
      } as any);

      // Import fresh instance to trigger initialization
      const { settingsStore: freshStore } = await import(
        '../settings?t=' + Date.now()
      );

      // Should preserve user's explicit choice
      expect(freshStore.moveEncountersBetweenLocations).toBe(false);
    });

    it('handles corrupted localStorage data gracefully', async () => {
      localStorage.setItem('settings', 'invalid-json');

      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      // Import fresh instance to trigger initialization
      const { settingsStore: freshStore } = await import(
        '../settings?t=' + Date.now()
      );

      expect(freshStore.moveEncountersBetweenLocations).toBe(false);
      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to load settings from localStorage:',
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });

    it('handles invalid settings data with Zod validation', async () => {
      const invalidSettings = {
        moveEncountersBetweenLocations: 'invalid-type',
        version: 123,
      };

      localStorage.setItem('settings', JSON.stringify(invalidSettings));

      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      // Import fresh instance to trigger initialization
      const { settingsStore: freshStore } = await import(
        '../settings?t=' + Date.now()
      );

      expect(freshStore.moveEncountersBetweenLocations).toBe(false);
      expect(consoleSpy).toHaveBeenCalledWith(
        'Invalid settings data, using defaults:',
        expect.any(Object)
      );

      consoleSpy.mockRestore();
    });
  });

  describe('Settings Actions', () => {
    beforeEach(() => {
      // Reset settingsStore to default state and clear localStorage
      clearLocalStorage();
      Object.assign(settingsStore, {
        moveEncountersBetweenLocations: false,
        version: '1.0.0',
      });
    });

    it('toggles moveEncountersBetweenLocations', () => {
      expect(settingsStore.moveEncountersBetweenLocations).toBe(false);

      settingsActions.toggleMoveEncountersBetweenLocations();
      expect(settingsStore.moveEncountersBetweenLocations).toBe(true);

      settingsActions.toggleMoveEncountersBetweenLocations();
      expect(settingsStore.moveEncountersBetweenLocations).toBe(false);
    });

    it('resets to dynamic defaults', () => {
      // Set to non-default value
      settingsStore.moveEncountersBetweenLocations = true;

      // Mock old playthrough (should default to enabled)
      mockGetActivePlaythrough.mockReturnValue({
        id: 'old-playthrough',
        name: 'Old Run',
        // No version field
      } as any);

      settingsActions.resetToDefaults();
      expect(settingsStore.moveEncountersBetweenLocations).toBe(true);

      // Mock new playthrough (should default to disabled)
      mockGetActivePlaythrough.mockReturnValue({
        id: 'new-playthrough',
        name: 'New Run',
        version: '1.0.0',
      } as any);

      settingsActions.resetToDefaults();
      expect(settingsStore.moveEncountersBetweenLocations).toBe(false);
    });

    it('updates multiple settings at once', () => {
      settingsActions.updateMultiple({
        moveEncountersBetweenLocations: true,
        version: '2.0.0',
      });

      expect(settingsStore.moveEncountersBetweenLocations).toBe(true);
      expect(settingsStore.version).toBe('2.0.0');
    });

    it('refreshes defaults when no settings are stored', async () => {
      // Clear localStorage to ensure clean state
      clearLocalStorage();

      mockGetActivePlaythrough.mockReturnValue({
        id: 'old-playthrough',
        name: 'Old Run',
        // No version field
      } as any);

      // Start with disabled to show the change
      settingsStore.moveEncountersBetweenLocations = false;

      // Wait a bit for any pending localStorage saves from the state change
      await new Promise(resolve => setTimeout(resolve, 20));

      // Clear localStorage again after the state change
      clearLocalStorage();

      settingsActions.refreshDefaults();

      expect(settingsStore.moveEncountersBetweenLocations).toBe(true);
    });

    it('refreshes defaults only when setting was undefined', () => {
      // Mock stored settings without moveEncountersBetweenLocations
      const storedSettings = { version: '1.0.0' };
      localStorage.setItem('settings', JSON.stringify(storedSettings));

      mockGetActivePlaythrough.mockReturnValue({
        id: 'old-playthrough',
        name: 'Old Run',
        // No version field
      } as any);

      // Start with disabled
      settingsStore.moveEncountersBetweenLocations = false;

      settingsActions.refreshDefaults();
      expect(settingsStore.moveEncountersBetweenLocations).toBe(true);
    });

    it('does not refresh when setting was explicitly set', () => {
      // Mock stored settings with explicit moveEncountersBetweenLocations
      const storedSettings = {
        moveEncountersBetweenLocations: false,
        version: '1.0.0',
      };
      localStorage.setItem('settings', JSON.stringify(storedSettings));

      mockGetActivePlaythrough.mockReturnValue({
        id: 'old-playthrough',
        name: 'Old Run',
        // No version field - would normally enable
      } as any);

      // Start with disabled (user's explicit choice)
      settingsStore.moveEncountersBetweenLocations = false;

      settingsActions.refreshDefaults();
      // Should preserve user's explicit choice
      expect(settingsStore.moveEncountersBetweenLocations).toBe(false);
    });
  });

  describe('Persistence', () => {
    it('saves settings to localStorage when updated', async () => {
      settingsActions.toggleMoveEncountersBetweenLocations();

      // Wait a bit for the subscription to fire
      await new Promise(resolve => setTimeout(resolve, 10));

      // Should have saved to localStorage with updated settings
      const stored = localStorage.getItem('settings');
      expect(stored).not.toBeNull();
      expect(stored!).toContain('"moveEncountersBetweenLocations":true');
    });

    it('validates settings before saving', async () => {
      const consoleSpy = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {});

      // Try to use updateSettings with invalid data
      try {
        // This should trigger validation error in updateSettings
        (settingsActions as any).updateMultiple({
          moveEncountersBetweenLocations: 'invalid',
        });
      } catch {
        // Expected to catch validation error
      }

      // Should have logged validation error
      expect(consoleSpy).toHaveBeenCalledWith(
        'Invalid settings update:',
        expect.any(Object)
      );

      consoleSpy.mockRestore();
    });
  });

  // Note: SSR testing is handled in separate node environment tests
});
