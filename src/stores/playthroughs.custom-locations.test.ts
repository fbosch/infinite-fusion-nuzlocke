import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { playthroughActions, playthroughsStore } from './playthroughs';

// Mock IndexedDB
const mockIndexedDB = {
  get: vi.fn(),
  set: vi.fn(),
  del: vi.fn(),
  clear: vi.fn(),
};

vi.mock('idb-keyval', () => ({
  get: (...args: unknown[]) => mockIndexedDB.get(...args),
  set: (...args: unknown[]) => mockIndexedDB.set(...args),
  del: (...args: unknown[]) => mockIndexedDB.del(...args),
  createStore: vi.fn(() => ({})),
}));

// Mock sprite service to avoid import issues
vi.mock('@/services/spriteService', () => ({
  default: {
    getPreferredVariant: vi.fn(() => Promise.resolve(undefined)),
    setPreferredVariant: vi.fn(() => Promise.resolve()),
    getArtworkVariants: vi.fn(() => Promise.resolve([])),
    generateSpriteUrl: vi.fn(() => ''),
  },
}));

describe('Playthrough Store - Custom Locations', () => {
  beforeEach(async () => {
    // Reset store state
    playthroughsStore.playthroughs = [];
    playthroughsStore.activePlaythroughId = undefined;
    playthroughsStore.isLoading = false;
    playthroughsStore.isSaving = false;

    // Create a test playthrough
    const playthroughId = playthroughActions.createPlaythrough(
      'Test Run',
      false
    );
    playthroughsStore.activePlaythroughId = playthroughId;

    // Reset mocks
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('addCustomLocation', () => {
    it('should add a custom location to the active playthrough', async () => {
      // Use real location ID from locations.json (Route 1)
      const customLocationId = await playthroughActions.addCustomLocation(
        'Custom Route',
        '288d719e-5aab-4097-b98d-f1ffbd780a9b'
      );

      expect(customLocationId).toBeTruthy();
      if (customLocationId) {
        expect(customLocationId).toMatch(/^custom_/);

        const activePlaythrough = playthroughActions.getActivePlaythrough();
        expect(activePlaythrough?.customLocations).toHaveLength(1);
        expect(activePlaythrough?.customLocations?.[0]).toMatchObject({
          id: customLocationId,
          name: 'Custom Route',
          order: expect.any(Number),
        });
      }
    });

    it('should initialize customLocations array if it does not exist', async () => {
      const activePlaythrough = playthroughActions.getActivePlaythrough();
      // Ensure customLocations is undefined initially
      if (activePlaythrough) {
        delete activePlaythrough.customLocations;
      }

      // Use real location ID from locations.json (Route 1)
      const customLocationId = await playthroughActions.addCustomLocation(
        'Custom Route',
        '288d719e-5aab-4097-b98d-f1ffbd780a9b'
      );

      expect(customLocationId).toBeTruthy();
      expect(activePlaythrough?.customLocations).toHaveLength(1);
    });

    it('should return null if no active playthrough', async () => {
      playthroughsStore.activePlaythroughId = undefined;

      // Use real location ID from locations.json (Route 1)
      const result = await playthroughActions.addCustomLocation(
        'Custom Route',
        '288d719e-5aab-4097-b98d-f1ffbd780a9b'
      );

      expect(result).toBeNull();
    });

    it('should update playthrough timestamp when adding custom location', async () => {
      const activePlaythrough = playthroughActions.getActivePlaythrough();
      const originalTimestamp = activePlaythrough?.updatedAt || 0;

      // Wait a bit to ensure timestamp difference
      await new Promise(resolve => setTimeout(resolve, 1));

      // Use real location ID from locations.json (Route 1)
      await playthroughActions.addCustomLocation(
        'Custom Route',
        '288d719e-5aab-4097-b98d-f1ffbd780a9b'
      );

      const updatedPlaythrough = playthroughActions.getActivePlaythrough();
      expect(updatedPlaythrough?.updatedAt).toBeGreaterThan(originalTimestamp);
    });
  });

  describe('removeCustomLocation', () => {
    it('should remove a custom location from the active playthrough', async () => {
      // Add a custom location first using real location ID (Route 1)
      const customLocationId = await playthroughActions.addCustomLocation(
        'Custom Route',
        '288d719e-5aab-4097-b98d-f1ffbd780a9b'
      );
      expect(customLocationId).toBeTruthy();

      if (customLocationId) {
        // Remove it
        const result =
          playthroughActions.removeCustomLocation(customLocationId);

        expect(result).toBe(true);
        const activePlaythrough = playthroughActions.getActivePlaythrough();
        expect(activePlaythrough?.customLocations).toHaveLength(0);
      }
    });

    it('should remove associated encounters when removing custom location', async () => {
      // Add a custom location first using real location ID (Route 1)
      const customLocationId = await playthroughActions.addCustomLocation(
        'Custom Route',
        '288d719e-5aab-4097-b98d-f1ffbd780a9b'
      );
      expect(customLocationId).toBeTruthy();

      if (customLocationId) {
        // Add an encounter for this custom location
        const activePlaythrough = playthroughActions.getActivePlaythrough();
        if (activePlaythrough) {
          if (!activePlaythrough.encounters) {
            activePlaythrough.encounters = {};
          }
          activePlaythrough.encounters[customLocationId] = {
            head: {
              id: 1,
              name: 'Bulbasaur',
              nationalDexId: 1,
              uid: 'test-uid',
            },
            body: null,
            isFusion: false,
            updatedAt: Date.now(),
          };
        }

        // Remove the custom location
        const result =
          playthroughActions.removeCustomLocation(customLocationId);

        expect(result).toBe(true);
        expect(
          activePlaythrough?.encounters?.[customLocationId]
        ).toBeUndefined();
      }
    });

    it('should return false if custom location does not exist', () => {
      const result = playthroughActions.removeCustomLocation('non-existent-id');
      expect(result).toBe(false);
    });

    it('should return false if no active playthrough', () => {
      playthroughsStore.activePlaythroughId = undefined;

      const result = playthroughActions.removeCustomLocation('custom-id');
      expect(result).toBe(false);
    });

    it('should return false if customLocations array does not exist', () => {
      const activePlaythrough = playthroughActions.getActivePlaythrough();
      if (activePlaythrough) {
        delete activePlaythrough.customLocations;
      }

      const result = playthroughActions.removeCustomLocation('custom-id');
      expect(result).toBe(false);
    });
  });

  describe('updateCustomLocationName', () => {
    it('should update the name of a custom location', async () => {
      // Add a custom location first using real location ID (Route 1)
      const customLocationId = await playthroughActions.addCustomLocation(
        'Original Name',
        '288d719e-5aab-4097-b98d-f1ffbd780a9b'
      );
      expect(customLocationId).toBeTruthy();

      if (customLocationId) {
        // Update the name
        const result = playthroughActions.updateCustomLocationName(
          customLocationId,
          'Updated Name'
        );

        expect(result).toBe(true);
        const activePlaythrough = playthroughActions.getActivePlaythrough();
        const customLocation = activePlaythrough?.customLocations?.find(
          loc => loc.id === customLocationId
        );
        expect(customLocation?.name).toBe('Updated Name');
      }
    });

    it('should trim whitespace from the new name', async () => {
      // Add a custom location first using real location ID (Route 1)
      const customLocationId = await playthroughActions.addCustomLocation(
        'Original Name',
        '288d719e-5aab-4097-b98d-f1ffbd780a9b'
      );
      expect(customLocationId).toBeTruthy();

      if (customLocationId) {
        // Update the name with whitespace
        const result = playthroughActions.updateCustomLocationName(
          customLocationId,
          '  Spaced Name  '
        );

        expect(result).toBe(true);
        const activePlaythrough = playthroughActions.getActivePlaythrough();
        const customLocation = activePlaythrough?.customLocations?.find(
          loc => loc.id === customLocationId
        );
        expect(customLocation?.name).toBe('Spaced Name');
      }
    });

    it('should return false if custom location does not exist', () => {
      const result = playthroughActions.updateCustomLocationName(
        'non-existent-id',
        'New Name'
      );
      expect(result).toBe(false);
    });

    it('should return false if no active playthrough', () => {
      playthroughsStore.activePlaythroughId = undefined;

      const result = playthroughActions.updateCustomLocationName(
        'custom-id',
        'New Name'
      );
      expect(result).toBe(false);
    });
  });

  describe('getCustomLocations', () => {
    it('should return custom locations for the active playthrough', async () => {
      // Initially should be empty
      expect(playthroughActions.getCustomLocations()).toEqual([]);

      // Add custom locations using real location IDs
      await playthroughActions.addCustomLocation(
        'Custom Route 1',
        '288d719e-5aab-4097-b98d-f1ffbd780a9b'
      ); // Route 1
      await playthroughActions.addCustomLocation(
        'Custom Route 2',
        'a1e59912-1eb5-4b2a-b3b3-e5ae27f66e68'
      ); // Route 22

      const customLocations = playthroughActions.getCustomLocations();
      expect(customLocations).toHaveLength(2);
      expect(customLocations[0].name).toBe('Custom Route 1');
      expect(customLocations[1].name).toBe('Custom Route 2');
    });

    it('should return empty array if no active playthrough', () => {
      playthroughsStore.activePlaythroughId = undefined;

      const result = playthroughActions.getCustomLocations();
      expect(result).toEqual([]);
    });

    it('should return empty array if customLocations does not exist', () => {
      const activePlaythrough = playthroughActions.getActivePlaythrough();
      if (activePlaythrough) {
        delete activePlaythrough.customLocations;
      }

      const result = playthroughActions.getCustomLocations();
      expect(result).toEqual([]);
    });
  });

  describe('Integration tests', () => {
    it('should handle complete custom location lifecycle', async () => {
      // 1. Add multiple custom locations using real location IDs
      const customId1 = await playthroughActions.addCustomLocation(
        'Custom Route 1',
        '288d719e-5aab-4097-b98d-f1ffbd780a9b'
      ); // Route 1
      const customId2 = await playthroughActions.addCustomLocation(
        'Custom Route 2',
        'a1e59912-1eb5-4b2a-b3b3-e5ae27f66e68'
      ); // Route 22

      expect(customId1).toBeTruthy();
      expect(customId2).toBeTruthy();

      if (customId1 && customId2) {
        // 2. Verify they were added
        let customLocations = playthroughActions.getCustomLocations();
        expect(customLocations).toHaveLength(2);

        // 3. Update a custom location name
        const updateResult = playthroughActions.updateCustomLocationName(
          customId1,
          'Updated Route 1'
        );
        expect(updateResult).toBe(true);

        // 4. Verify the update
        customLocations = playthroughActions.getCustomLocations();
        const updatedLocation = customLocations.find(
          loc => loc.id === customId1
        );
        expect(updatedLocation?.name).toBe('Updated Route 1');

        // 5. Remove one custom location
        const removeResult = playthroughActions.removeCustomLocation(customId2);
        expect(removeResult).toBe(true);

        // 6. Verify only one remains
        customLocations = playthroughActions.getCustomLocations();
        expect(customLocations).toHaveLength(1);
        expect(customLocations[0].id).toBe(customId1);
      }
    });

    it('should maintain data integrity across operations', async () => {
      const activePlaythrough = playthroughActions.getActivePlaythrough();
      expect(activePlaythrough).toBeTruthy();

      const originalTimestamp = activePlaythrough?.updatedAt || 0;

      // Wait a bit to ensure timestamp difference
      await new Promise(resolve => setTimeout(resolve, 5));

      // Add custom location using real location ID (Route 1)
      const customId = await playthroughActions.addCustomLocation(
        'Test Route',
        '288d719e-5aab-4097-b98d-f1ffbd780a9b'
      );
      expect(customId).toBeTruthy();

      if (customId) {
        // Verify timestamp was updated
        expect(activePlaythrough?.updatedAt).toBeGreaterThan(originalTimestamp);

        // Verify the custom location has correct structure
        const customLocations = playthroughActions.getCustomLocations();
        expect(customLocations).toHaveLength(1);
        expect(customLocations[0]).toMatchObject({
          id: expect.stringMatching(/^custom_/),
          name: 'Test Route',
          order: expect.any(Number),
        });

        // Verify the playthrough structure is intact
        expect(activePlaythrough?.id).toBeTruthy();
        expect(activePlaythrough?.name).toBe('Test Run');
        expect(activePlaythrough?.remixMode).toBe(false);
      }
    });
  });
});
