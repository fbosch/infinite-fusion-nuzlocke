import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { RouteEncountersArraySchema } from '@/loaders/encounters';

// Temporary schema for the old data format during migration
const OldRouteEncounterSchema = z.object({
  routeName: z.string().min(1, { error: 'Route name is required' }),
  pokemonIds: z.array(z.number().int()),
});
const OldRouteEncountersArraySchema = z.array(OldRouteEncounterSchema);

// Query parameter schema
const QuerySchema = z.object({
  gameMode: z.enum(['classic', 'remix']).optional().default('classic'),
});

export async function GET(request: NextRequest) {
  try {
    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const query = QuerySchema.parse({
      gameMode: searchParams.get('gameMode'),
    });

    // Import all data files to avoid conditional dynamic imports that cause webpack circular dependencies
    const [
      classicEncounters,
      remixEncounters,
      classicTrades,
      remixTrades,
      classicGifts,
      remixGifts,
      eggLocations,
    ] = await Promise.all([
      import('@data/classic/encounters.json'),
      import('@data/remix/encounters.json'),
      import('@data/classic/trades.json'),
      import('@data/remix/trades.json'),
      import('@data/classic/gifts.json'),
      import('@data/remix/gifts.json'),
      import('@data/egg-locations.json'),
    ]);

    // Select the appropriate data based on game mode
    const wild =
      query.gameMode === 'remix' ? remixEncounters : classicEncounters;
    const trade = query.gameMode === 'remix' ? remixTrades : classicTrades;
    const gift = query.gameMode === 'remix' ? remixGifts : classicGifts;

    // Validate the data using the old schema (since data files haven't been migrated yet)
    const encounters = OldRouteEncountersArraySchema.parse(wild.default);
    const trades = OldRouteEncountersArraySchema.parse(trade.default);
    const gifts = OldRouteEncountersArraySchema.parse(gift.default);
    const eggLocationsData = eggLocations.default;

    // Create a set of route names that have egg locations
    const eggRouteNames = new Set(
      eggLocationsData.locations.map(location => location.routeName)
    );

    // Merge the data by route name
    const allRouteNames = new Set([
      ...encounters.map(e => e.routeName),
      ...trades.map(t => t.routeName),
      ...gifts.map(g => g.routeName),
      ...eggRouteNames, // Include egg locations
    ]);

    // Create a map for quick lookup of each encounter type
    const encountersMap = new Map(encounters.map(e => [e.routeName, e]));
    const tradesMap = new Map(trades.map(t => [t.routeName, t]));
    const giftsMap = new Map(gifts.map(g => [g.routeName, g]));

    // Merge encounters for each route with source information
    const mergedEncounters = Array.from(allRouteNames).map(routeName => {
      const wildPokemon = encountersMap.get(routeName)?.pokemonIds || [];
      const tradePokemon = tradesMap.get(routeName)?.pokemonIds || [];
      const giftPokemon = giftsMap.get(routeName)?.pokemonIds || [];

      // Create Pokemon objects with source information
      const pokemon = [
        ...wildPokemon.map(id => ({ id, source: 'wild' as const })),
        ...tradePokemon.map(id => ({ id, source: 'trade' as const })),
        ...giftPokemon.map(id => ({ id, source: 'gift' as const })),
      ];

      // Add egg encounter if this route has egg locations
      if (eggRouteNames.has(routeName)) {
        pokemon.push({ id: -1, source: 'gift' as const });
      }

      // Remove duplicates based on both id and source
      const uniquePokemon = pokemon.filter(
        (pokemon, index, array) =>
          array.findIndex(
            p => p.id === pokemon.id && p.source === pokemon.source
          ) === index
      );

      return {
        routeName,
        pokemon: uniquePokemon,
      };
    });

    // Sort by route name for consistent ordering
    mergedEncounters.sort((a, b) => a.routeName.localeCompare(b.routeName));

    // Validate the merged data using the new schema
    const validatedMergedEncounters =
      RouteEncountersArraySchema.parse(mergedEncounters);

    // Return merged encounters for the game mode
    return NextResponse.json(validatedMergedEncounters, {
      headers: {
        'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
    console.error('Error loading encounters:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid encounters data format', details: error.issues },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to load encounters data' },
      { status: 500 }
    );
  }
}
