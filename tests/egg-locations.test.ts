import { describe, it, expect } from 'vitest';
import eggLocationsData from '../data/shared/egg-locations.json';

interface EggLocation {
  routeName: string;
  source: 'gift' | 'nest';
  description: string;
}

interface EggLocationsData {
  totalLocations: number;
  sources: {
    gifts: number;
    nests: number;
  };
  locations: EggLocation[];
}

describe('Egg Locations Data Integrity', () => {
  const data = eggLocationsData as EggLocationsData;

  describe('Data Structure', () => {
    it('should have the correct data structure', () => {
      expect(data).toHaveProperty('totalLocations');
      expect(data).toHaveProperty('sources');
      expect(data).toHaveProperty('locations');
      expect(Array.isArray(data.locations)).toBe(true);
    });

    it('should have correct source counts', () => {
      expect(data.sources).toHaveProperty('gifts');
      expect(data.sources).toHaveProperty('nests');
      expect(typeof data.sources.gifts).toBe('number');
      expect(typeof data.sources.nests).toBe('number');
    });

    it('should have correct total location count', () => {
      expect(data.totalLocations).toBe(data.locations.length);
      expect(data.totalLocations).toBe(data.sources.gifts + data.sources.nests);
    });
  });

  describe('Location Data Validation', () => {
    it('should have valid location objects', () => {
      data.locations.forEach((location, index) => {
        expect(location).toHaveProperty('routeName');
        expect(location).toHaveProperty('source');
        expect(location).toHaveProperty('description');

        expect(typeof location.routeName).toBe('string');
        expect(typeof location.source).toBe('string');
        expect(typeof location.description).toBe('string');

        expect(location.routeName.length).toBeGreaterThan(0);
        expect(location.description.length).toBeGreaterThan(0);
        expect(['gift', 'nest']).toContain(location.source);
      });
    });

    it('should have unique route names', () => {
      const routeNames = data.locations.map(loc => loc.routeName);
      const uniqueRouteNames = new Set(routeNames);
      expect(uniqueRouteNames.size).toBe(routeNames.length);
    });

    it('should have valid route names', () => {
      const validRoutePatterns = [
        /^Route \d+$/, // Route 5, Route 8, etc.
        /^[A-Za-z\s]+$/, // City names, town names
        /^[A-Za-z\s]+(?:Daycare|Forest|Islands|Tunnel|Garden|Road)$/, // Special locations
      ];

      data.locations.forEach(location => {
        const isValidRoute = validRoutePatterns.some(pattern =>
          pattern.test(location.routeName)
        );
        expect(
          isValidRoute,
          `${location.routeName} is not a valid route name`
        ).toBe(true);
      });
    });
  });

  describe('Source Counts', () => {
    it('should have exactly 7 gift locations', () => {
      const giftLocations = data.locations.filter(loc => loc.source === 'gift');
      expect(giftLocations.length).toBe(7);
      expect(data.sources.gifts).toBe(7);
    });

    it('should have exactly 9 nest locations', () => {
      const nestLocations = data.locations.filter(loc => loc.source === 'nest');
      expect(nestLocations.length).toBe(9);
      expect(data.sources.nests).toBe(9);
    });

    it('should have correct total count', () => {
      expect(data.totalLocations).toBe(16);
    });
  });

  describe('Specific Location Validation', () => {
    it('should contain all expected gift locations', () => {
      const expectedGiftLocations = [
        'Kanto Daycare',
        'Knot Island',
        'Lavender Town',
        'National Park',
        'Pallet Town',
        'Route 5',
        'Route 8',
      ];

      const actualGiftLocations = data.locations
        .filter(loc => loc.source === 'gift')
        .map(loc => loc.routeName)
        .sort();

      expect(actualGiftLocations).toEqual(expectedGiftLocations.sort());
    });

    it('should contain all expected nest locations', () => {
      const expectedNestLocations = [
        'Kindle Road',
        'Rock Tunnel',
        'Route 15',
        'Route 23',
        'Route 34',
        'Saffron City',
        'Seafoam Islands',
        'Secret Garden',
        'Viridian Forest',
      ];

      const actualNestLocations = data.locations
        .filter(loc => loc.source === 'nest')
        .map(loc => loc.routeName)
        .sort();

      expect(actualNestLocations).toEqual(expectedNestLocations.sort());
    });
  });

  describe('Description Validation', () => {
    it('should have meaningful descriptions for gift locations', () => {
      const giftLocations = data.locations.filter(loc => loc.source === 'gift');

      giftLocations.forEach(location => {
        expect(location.description.length).toBeGreaterThan(5);
        expect(location.description).toMatch(/egg|Egg|Pokemon|Pokémon/i);
      });
    });

    it('should have meaningful descriptions for nest locations', () => {
      const nestLocations = data.locations.filter(loc => loc.source === 'nest');

      nestLocations.forEach(location => {
        expect(location.description.length).toBeGreaterThan(5);
        expect(location.description).toMatch(/nest|Nest location/i);
      });
    });
  });

  describe('Data Completeness', () => {
    it('should not have any empty or null values', () => {
      data.locations.forEach((location, index) => {
        expect(
          location.routeName,
          `Location ${index} has empty routeName`
        ).toBeTruthy();
        expect(
          location.source,
          `Location ${index} has empty source`
        ).toBeTruthy();
        expect(
          location.description,
          `Location ${index} has empty description`
        ).toBeTruthy();
      });
    });

    it('should not have any duplicate entries', () => {
      const seen = new Set<string>();

      data.locations.forEach(location => {
        const key = `${location.routeName}-${location.source}`;
        expect(
          seen.has(key),
          `Duplicate entry found: ${location.routeName}`
        ).toBe(false);
        seen.add(key);
      });
    });
  });

  describe('Route Name Formatting', () => {
    it('should have properly formatted route names', () => {
      data.locations.forEach(location => {
        // Should not have extra whitespace
        expect(location.routeName).toBe(location.routeName.trim());

        // Should not have consecutive spaces
        expect(location.routeName).not.toMatch(/\s{2,}/);

        // Should not start or end with spaces
        expect(location.routeName).not.toMatch(/^\s|\s$/);
      });
    });

    it('should have consistent capitalization', () => {
      data.locations.forEach(location => {
        // Route names should be properly capitalized (title case allowed)
        expect(location.routeName).toMatch(/^[A-Z][a-zA-Z\s\d]+$/);
      });
    });
  });
});
