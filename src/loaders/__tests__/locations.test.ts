import { describe, it, expect } from 'vitest';
import {
  getLocations,
  getLocationsByRegion,
  getLocationsBySpecificRegion,
  getLocationsSortedByOrder
} from '../locations';

describe('Locations data', () => {
  it('should load and validate locations data', () => {
    const locations = getLocations();

    expect(locations).toBeInstanceOf(Array);
    expect(locations.length).toBeGreaterThan(0);

    // Check that each location has the required properties
    locations.forEach(location => {
      expect(location).toHaveProperty('name');
      expect(location).toHaveProperty('routeId');
      expect(location).toHaveProperty('order');
      expect(location).toHaveProperty('region');
      expect(location).toHaveProperty('description');
    });
  });

  it('should group locations by region', () => {
    const locationsByRegion = getLocationsByRegion();

    expect(locationsByRegion).toBeInstanceOf(Object);
    expect(Object.keys(locationsByRegion).length).toBeGreaterThan(0);

    // Check that each region has locations
    Object.entries(locationsByRegion).forEach(([region, locations]) => {
      expect(locations).toBeInstanceOf(Array);
      expect(locations.length).toBeGreaterThan(0);
      locations.forEach(location => {
        expect(location.region).toBe(region);
      });
    });
  });

  it('should filter locations by specific region', () => {
    const kantoLocations = getLocationsBySpecificRegion('Kanto');

    expect(kantoLocations).toBeInstanceOf(Array);
    kantoLocations.forEach(location => {
      expect(location.region).toBe('Kanto');
    });
  });

  it('should sort locations by order', () => {
    const sortedLocations = getLocationsSortedByOrder();

    expect(sortedLocations).toBeInstanceOf(Array);
    expect(sortedLocations.length).toBeGreaterThan(1);

    // Check that locations are sorted by order
    for (let i = 1; i < sortedLocations.length; i++) {
      expect(sortedLocations[i].order).toBeGreaterThanOrEqual(sortedLocations[i - 1].order);
    }
  });
}); 