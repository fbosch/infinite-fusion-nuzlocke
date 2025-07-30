import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { RouteEncountersArraySchema } from '@/loaders/encounters';

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

    const [wild, trade, gift] = await Promise.all([
      query.gameMode === 'remix'
        ? import('@data/remix/encounters.json')
        : import('@data/classic/encounters.json'),
      query.gameMode === 'remix'
        ? import('@data/remix/trades.json')
        : import('@data/classic/trades.json'),
      query.gameMode === 'remix'
        ? import('@data/remix/gifts.json')
        : import('@data/classic/gifts.json'),
    ]);

    // Validate the data
    const encounters = RouteEncountersArraySchema.parse(wild.default);
    const trades = RouteEncountersArraySchema.parse(trade.default);
    const gifts = RouteEncountersArraySchema.parse(gift.default);

    // Merge the data by route name
    const allRouteNames = new Set([
      ...encounters.map(e => e.routeName),
      ...trades.map(t => t.routeName),
      ...gifts.map(g => g.routeName),
    ]);

    // Create a map for quick lookup of each encounter type
    const encountersMap = new Map(encounters.map(e => [e.routeName, e]));
    const tradesMap = new Map(trades.map(t => [t.routeName, t]));
    const giftsMap = new Map(gifts.map(g => [g.routeName, g]));

    // Merge encounters for each route
    const mergedEncounters = Array.from(allRouteNames).map(routeName => {
      const wildPokemon = encountersMap.get(routeName)?.pokemonIds || [];
      const tradePokemon = tradesMap.get(routeName)?.pokemonIds || [];
      const giftPokemon = giftsMap.get(routeName)?.pokemonIds || [];

      // Combine all Pokemon IDs, removing duplicates
      const allPokemonIds = [
        ...new Set([...wildPokemon, ...tradePokemon, ...giftPokemon]),
      ];

      return {
        routeName,
        pokemonIds: allPokemonIds,
      };
    });

    // Sort by route name for consistent ordering
    mergedEncounters.sort((a, b) => a.routeName.localeCompare(b.routeName));

    // Validate the merged data using the original schema
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
