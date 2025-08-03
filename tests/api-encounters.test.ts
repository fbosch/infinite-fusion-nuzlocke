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

    // Check that routes with egg gift locations include -1 with 'gift' source
    const eggGiftRouteNames = [
      'Kanto Daycare',
      'Knot Island',
      'Lavender Town',
      'National Park',
      'Pallet Town',
      'Route 5',
      'Route 8',
    ];

    eggGiftRouteNames.forEach(routeName => {
      const route = data.find((r: any) => r.routeName === routeName);
      if (route) {
        const eggPokemon = route.pokemon.find((p: any) => p.id === -1);
        expect(eggPokemon).toBeTruthy();
        expect(eggPokemon?.source).toBe('gift');
      }
    });

    // Check that routes with egg nest locations include -1 with 'nest' source
    const eggNestRouteNames = [
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

    eggNestRouteNames.forEach(routeName => {
      const route = data.find((r: any) => r.routeName === routeName);
      if (route) {
        const eggPokemon = route.pokemon.find((p: any) => p.id === -1);
        expect(eggPokemon).toBeTruthy();
        expect(eggPokemon?.source).toBe('nest');
      }
    });

    // Check that routes without egg locations don't have -1
    const allEggRoutes = [...eggGiftRouteNames, ...eggNestRouteNames];
    const nonEggRoutes = data.filter(
      (route: any) => !allEggRoutes.includes(route.routeName)
    );
    nonEggRoutes.forEach((route: any) => {
      const eggPokemon = route.pokemon.find((p: any) => p.id === -1);
      expect(eggPokemon).toBeFalsy();
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

  it('should have valid Pokemon data with sources', async () => {
    const request = new NextRequest(
      'http://localhost:3000/api/encounters?gameMode=classic'
    );
    const response = await GET(request);
    const data = await response.json();

    data.forEach((route: any) => {
      expect(route).toHaveProperty('routeName');
      expect(route).toHaveProperty('pokemon');
      expect(Array.isArray(route.pokemon)).toBe(true);

      // All Pokemon should have valid id and source
      route.pokemon.forEach((pokemon: any) => {
        expect(pokemon).toHaveProperty('id');
        expect(pokemon).toHaveProperty('source');
        expect(typeof pokemon.id).toBe('number');
        expect([
          'wild',
          'grass',
          'surf',
          'fishing',
          'cave',
          'rock_smash',
          'gift',
          'trade',
          'quest',
          'static',
          'nest',
          'egg',
          'legendary',
        ]).toContain(pokemon.source);
      });
    });
  });

  it('should not have duplicate Pokemon with same ID and source within routes', async () => {
    const request = new NextRequest(
      'http://localhost:3000/api/encounters?gameMode=classic'
    );
    const response = await GET(request);
    const data = await response.json();

    data.forEach((route: any) => {
      const pokemonKeys = route.pokemon.map((p: any) => `${p.id}-${p.source}`);
      const uniqueKeys = new Set(pokemonKeys);
      expect(uniqueKeys.size).toBe(route.pokemon.length);
    });
  });
});
