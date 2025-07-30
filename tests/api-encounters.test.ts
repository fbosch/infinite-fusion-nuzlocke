import { describe, it, expect } from 'vitest';
import { GET } from '@/app/api/encounters/route';
import { NextRequest } from 'next/server';

describe('Encounters API', () => {
  it('should include egg locations with -1 ID', async () => {
    // Create a mock request
    const request = new NextRequest(
      'http://localhost:3000/api/encounters?gameMode=classic'
    );

    // Call the API
    const response = await GET(request);
    const data = await response.json();

    // Verify the response structure
    expect(Array.isArray(data)).toBe(true);
    expect(data.length).toBeGreaterThan(0);

    // Check that routes with egg locations include -1
    const eggRouteNames = [
      'Kanto Daycare',
      'Knot Island',
      'Lavender Town',
      'National Park',
      'Pallet Town',
      'Route 5',
      'Route 8',
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

    eggRouteNames.forEach(routeName => {
      const route = data.find((r: any) => r.routeName === routeName);
      if (route) {
        expect(route.pokemonIds).toContain(-1);
      }
    });

    // Check that routes without egg locations don't have -1
    const nonEggRoutes = data.filter(
      (route: any) => !eggRouteNames.includes(route.routeName)
    );
    nonEggRoutes.forEach((route: any) => {
      expect(route.pokemonIds).not.toContain(-1);
    });
  });

  it('should work for both classic and remix modes', async () => {
    // Test classic mode
    const classicRequest = new NextRequest(
      'http://localhost:3000/api/encounters?gameMode=classic'
    );
    const classicResponse = await GET(classicRequest);
    const classicData = await classicResponse.json();

    expect(classicResponse.status).toBe(200);
    expect(Array.isArray(classicData)).toBe(true);

    // Test remix mode
    const remixRequest = new NextRequest(
      'http://localhost:3000/api/encounters?gameMode=remix'
    );
    const remixResponse = await GET(remixRequest);
    const remixData = await remixResponse.json();

    expect(remixResponse.status).toBe(200);
    expect(Array.isArray(remixData)).toBe(true);
  });

  it('should have valid Pokemon IDs', async () => {
    const request = new NextRequest(
      'http://localhost:3000/api/encounters?gameMode=classic'
    );
    const response = await GET(request);
    const data = await response.json();

    data.forEach((route: any) => {
      expect(route).toHaveProperty('routeName');
      expect(route).toHaveProperty('pokemonIds');
      expect(Array.isArray(route.pokemonIds)).toBe(true);

      // All Pokemon IDs should be numbers
      route.pokemonIds.forEach((id: number) => {
        expect(typeof id).toBe('number');
      });
    });
  });

  it('should not have duplicate Pokemon IDs within routes', async () => {
    const request = new NextRequest(
      'http://localhost:3000/api/encounters?gameMode=classic'
    );
    const response = await GET(request);
    const data = await response.json();

    data.forEach((route: any) => {
      const uniqueIds = new Set(route.pokemonIds);
      expect(uniqueIds.size).toBe(route.pokemonIds.length);
    });
  });
});
