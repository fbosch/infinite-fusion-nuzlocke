import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  getLocations,
  getLocationsByRegion,
  getLocationsBySpecificRegion,
  getLocationsSortedByOrder,
  getLocationEncountersByName,
  getLocationEncountersById,
  getLocationsWithEncounters,
  hasLocationEncounters,
} from '../locations';
import { getStarterPokemonByGameMode } from '../starters';
import { SPECIAL_LOCATIONS } from '@/constants/special-locations';

// Mock the starters module
vi.mock('../starters', () => ({
  getStarterPokemonByGameMode: vi.fn(),
}));

describe('Locations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getLocations', () => {
    it('should return an array of locations', () => {
      const locations = getLocations();
      expect(Array.isArray(locations)).toBe(true);
      expect(locations.length).toBeGreaterThan(0);
    });

    it('should return locations with required properties', () => {
      const locations = getLocations();
      const location = locations[0];

      expect(location).toHaveProperty('id');
      expect(location).toHaveProperty('name');
      expect(location).toHaveProperty('order');
      expect(location).toHaveProperty('region');
      expect(location).toHaveProperty('description');
    });

    it('should return locations sorted by order', () => {
      const locations = getLocations();
      const sortedLocations = getLocationsSortedByOrder();

      expect(sortedLocations).toEqual(
        [...locations].sort((a, b) => a.order - b.order)
      );
    });
  });

  describe('getLocationsByRegion', () => {
    it('should return locations for a specific region', () => {
      const kantoLocations = getLocationsByRegion('Kanto');
      expect(kantoLocations.length).toBeGreaterThan(0);
      kantoLocations.forEach(location => {
        expect(location.region).toBe('Kanto');
      });
    });

    it('should return empty array for non-existent region', () => {
      const nonExistentLocations = getLocationsByRegion('NonExistent');
      expect(nonExistentLocations).toEqual([]);
    });
  });

  describe('getLocationsBySpecificRegion', () => {
    it('should return locations for a specific region (case-insensitive)', () => {
      const kantoLocations = getLocationsBySpecificRegion('kanto');
      expect(kantoLocations.length).toBeGreaterThan(0);
      kantoLocations.forEach(location => {
        expect(location.region.toLowerCase()).toBe('kanto');
      });
    });

    it('should return empty array for non-existent region', () => {
      const nonExistentLocations = getLocationsBySpecificRegion('nonexistent');
      expect(nonExistentLocations).toEqual([]);
    });
  });

  describe('Starter Pokémon Encounter Handling', () => {
    describe('getLocationEncountersByName', () => {
      it('should return starter Pokémon for starter location', async () => {
        const mockStarterPokemon = [1, 4, 7];
        vi.mocked(getStarterPokemonByGameMode).mockResolvedValue(
          mockStarterPokemon
        );

        const encounters = await getLocationEncountersByName(
          "Oak's Lab",
          'classic'
        );
        expect(encounters).toEqual(mockStarterPokemon);
      });

      it('should return empty array for non-existent location', async () => {
        const encounters = await getLocationEncountersByName(
          'NonExistentLocation',
          'classic'
        );
        expect(encounters).toEqual([]);
      });
    });

    describe('getLocationEncountersById', () => {
      it('should return starter Pokémon for starter location ID', async () => {
        const mockStarterPokemon = [1, 4, 7];
        vi.mocked(getStarterPokemonByGameMode).mockResolvedValue(
          mockStarterPokemon
        );

        const encounters = await getLocationEncountersById(
          SPECIAL_LOCATIONS.STARTER_LOCATION,
          'classic'
        );
        expect(encounters).toEqual(mockStarterPokemon);
      });

      it('should return empty array for non-existent location ID', async () => {
        const encounters = await getLocationEncountersById(
          'non-existent-id',
          'classic'
        );
        expect(encounters).toEqual([]);
      });
    });

    describe('getLocationsWithEncounters', () => {
      it('should return locations with encounters', async () => {
        const mockStarterPokemon = [1, 4, 7];
        vi.mocked(getStarterPokemonByGameMode).mockResolvedValue(
          mockStarterPokemon
        );

        const locationsWithEncounters =
          await getLocationsWithEncounters('classic');
        expect(locationsWithEncounters).toBeInstanceOf(Array);
        expect(locationsWithEncounters.length).toBeGreaterThan(0);

        // Check that starter location has encounters
        const starterLocationWithEncounters = locationsWithEncounters.find(
          loc => loc.id === SPECIAL_LOCATIONS.STARTER_LOCATION
        );
        expect(starterLocationWithEncounters).toBeDefined();
        expect(starterLocationWithEncounters?.encounters).toEqual(
          mockStarterPokemon
        );
      });
    });

    describe('hasLocationEncounters', () => {
      it('should return true for starter location', async () => {
        const mockStarterPokemon = [1, 4, 7];
        vi.mocked(getStarterPokemonByGameMode).mockResolvedValue(
          mockStarterPokemon
        );

        const locations = getLocations();
        const starterLocation = locations.find(
          loc => loc.id === SPECIAL_LOCATIONS.STARTER_LOCATION
        );
        expect(starterLocation).not.toBeNull();

        if (starterLocation) {
          const hasEncounters = await hasLocationEncounters(
            starterLocation,
            'classic'
          );
          expect(hasEncounters).toBe(true);
        }
      });

      it('should return false for non-starter locations', async () => {
        // Create a mock location that we know doesn't have encounters
        const mockLocation = {
          id: 'mock-location-id',
          name: 'Mock City',
          routeId: 99999, // Use a high number that won't exist
          order: 999,
          region: 'Kanto',
          description: 'A mock location for testing',
        };

        const hasEncounters = await hasLocationEncounters(
          mockLocation,
          'classic'
        );
        expect(hasEncounters).toBe(false);
      });
    });

    describe('Starter Location Identification', () => {
      it('should identify starter location by GUID', () => {
        const locations = getLocations();
        const starterLocation = locations.find(
          loc => loc.id === SPECIAL_LOCATIONS.STARTER_LOCATION
        );
        expect(starterLocation).not.toBeNull();
        expect(starterLocation?.name).toBe("Oak's Lab");
      });

      it('should identify non-starter locations correctly', () => {
        const locations = getLocations();
        const nonStarterLocation = locations.find(
          loc => loc.id !== SPECIAL_LOCATIONS.STARTER_LOCATION
        );
        expect(nonStarterLocation).toBeDefined();
        expect(nonStarterLocation?.id).not.toBe(
          SPECIAL_LOCATIONS.STARTER_LOCATION
        );
      });
    });
  });
});
