import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  getLocations,
  getLocationsByRegion,
  getLocationsBySpecificRegion,
  getLocationsSortedByOrder,
  getLocationEncounters,
  getLocationsWithEncounters,
  hasLocationEncounters,
  getLocationNameByRouteId,
} from '../locations';
import { getStarterPokemonByGameMode } from '../starters';

// Mock the starters module
vi.mock('../starters', () => ({
  getStarterPokemonByGameMode: vi.fn(),
}));

describe('Locations', () => {
  describe('getLocations', () => {
    it('should return all locations', () => {
      const locations = getLocations();
      expect(locations).toBeInstanceOf(Array);
      expect(locations.length).toBeGreaterThan(0);
    });

    it('should have valid location data', () => {
      const locations = getLocations();
      locations.forEach(location => {
        expect(location).toHaveProperty('name');
        expect(location).toHaveProperty('routeId');
        expect(location).toHaveProperty('order');
        expect(location).toHaveProperty('region');
        expect(location).toHaveProperty('description');
      });
    });
  });

  describe('getLocationsByRegion', () => {
    it('should group locations by region', () => {
      const grouped = getLocationsByRegion();
      expect(grouped).toBeInstanceOf(Object);
      expect(Object.keys(grouped).length).toBeGreaterThan(0);
    });

    it('should have Kanto and Johto regions', () => {
      const grouped = getLocationsByRegion();
      expect(grouped).toHaveProperty('Kanto');
      expect(grouped).toHaveProperty('Johto');
    });
  });

  describe('getLocationsBySpecificRegion', () => {
    it('should return only Kanto locations', () => {
      const kantoLocations = getLocationsBySpecificRegion('Kanto');
      expect(kantoLocations).toBeInstanceOf(Array);
      kantoLocations.forEach(location => {
        expect(location.region).toBe('Kanto');
      });
    });

    it('should return only Johto locations', () => {
      const johtoLocations = getLocationsBySpecificRegion('Johto');
      expect(johtoLocations).toBeInstanceOf(Array);
      johtoLocations.forEach(location => {
        expect(location.region).toBe('Johto');
      });
    });
  });

  describe('getLocationsSortedByOrder', () => {
    it('should return locations sorted by order', () => {
      const sortedLocations = getLocationsSortedByOrder();
      expect(sortedLocations).toBeInstanceOf(Array);

      for (let i = 1; i < sortedLocations.length; i++) {
        expect(sortedLocations[i].order).toBeGreaterThanOrEqual(
          sortedLocations[i - 1].order
        );
      }
    });
  });

  describe('Starter Pokémon Encounter Handling', () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    describe('getLocationEncounters', () => {
      it('should return starter Pokémon for starter location in classic mode', async () => {
        const mockStarterPokemon = [1, 4, 7];
        vi.mocked(getStarterPokemonByGameMode).mockResolvedValue(
          mockStarterPokemon
        );

        const locations = getLocations();
        const starterLocation = locations.find(loc => loc.routeId === 0);
        expect(starterLocation).not.toBeNull();

        if (starterLocation) {
          const encounters = await getLocationEncounters(
            starterLocation,
            'classic'
          );
          expect(encounters).toEqual(mockStarterPokemon);
          expect(getStarterPokemonByGameMode).toHaveBeenCalledWith('classic');
        }
      });

      it('should return starter Pokémon for starter location in remix mode', async () => {
        const mockStarterPokemon = [
          1, 4, 7, 152, 155, 158, 276, 279, 282, 316, 319, 322, 479, 482, 485,
        ];
        vi.mocked(getStarterPokemonByGameMode).mockResolvedValue(
          mockStarterPokemon
        );

        const locations = getLocations();
        const starterLocation = locations.find(loc => loc.routeId === 0);
        expect(starterLocation).not.toBeNull();

        if (starterLocation) {
          const encounters = await getLocationEncounters(
            starterLocation,
            'remix'
          );
          expect(encounters).toEqual(mockStarterPokemon);
          expect(getStarterPokemonByGameMode).toHaveBeenCalledWith('remix');
        }
      });

      it('should return empty array for non-starter locations', async () => {
        const locations = getLocations();
        const nonStarterLocation = locations.find(loc => loc.routeId !== 0);
        expect(nonStarterLocation).toBeDefined();

        if (nonStarterLocation) {
          const encounters = await getLocationEncounters(
            nonStarterLocation,
            'classic'
          );
          expect(encounters).toEqual([]);
        }
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
          loc => loc.routeId === 0
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
        const starterLocation = locations.find(loc => loc.routeId === 0);
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
        const locations = getLocations();
        const nonStarterLocation = locations.find(loc => loc.routeId !== 0);
        expect(nonStarterLocation).toBeDefined();

        if (nonStarterLocation) {
          const hasEncounters = await hasLocationEncounters(
            nonStarterLocation,
            'classic'
          );
          expect(hasEncounters).toBe(false);
        }
      });
    });

    describe('Starter Location Identification', () => {
      it('should identify starter location by routeId 0', () => {
        const locations = getLocations();
        const starterLocation = locations.find(loc => loc.routeId === 0);
        expect(starterLocation).not.toBeNull();
        expect(starterLocation?.name).toBe('Starter');
      });

      it('should identify non-starter locations correctly', () => {
        const locations = getLocations();
        const nonStarterLocation = locations.find(loc => loc.routeId !== 0);
        expect(nonStarterLocation).toBeDefined();
        expect(nonStarterLocation?.routeId).not.toBe(0);
      });
    });
  });

  describe('getLocationNameByRouteId', () => {
    it('should return location name for valid routeId', () => {
      const locationName = getLocationNameByRouteId(0);
      expect(locationName).toBe('Starter');
    });

    it('should return null for invalid routeId', () => {
      const locationName = getLocationNameByRouteId(99999);
      expect(locationName).toBeNull();
    });

    it('should return correct location name for Route 1', () => {
      const locationName = getLocationNameByRouteId(78);
      expect(locationName).toBe('Route 1');
    });
  });
});
