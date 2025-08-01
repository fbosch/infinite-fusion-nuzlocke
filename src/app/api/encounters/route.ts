import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import {
  EncounterSource,
  RouteEncountersArraySchema,
} from '@/loaders/encounters';

// Temporary schema for the old data format during migration
const OldRouteEncounterSchema = z.object({
  routeName: z.string().min(1, { error: 'Route name is required' }),
  pokemonIds: z.array(z.number().int()),
});
const OldRouteEncountersArraySchema = z.array(OldRouteEncounterSchema);

// Type for egg location data
interface EggLocation {
  routeName: string;
  source: 'gift' | 'nest';
  description: string;
  pokemonName?: string;
  pokemonId?: number;
}

interface EggLocationsData {
  totalLocations: number;
  sources: {
    gifts: number;
    nests: number;
  };
  pokemonIdentified: {
    total: number;
    fromGifts: number;
    fromNests: number;
  };
  locations: EggLocation[];
}

export async function GET(request: NextRequest) {
  try {
    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const rawGameMode = searchParams.get('gameMode') || 'classic';

    // Validate the game mode explicitly
    const gameMode = rawGameMode === 'remix' ? 'remix' : 'classic';

    // Use explicit imports instead of dynamic template literals
    const [wild, trade, gift, quest, statics, eggLocations] = await Promise.all(
      [
        gameMode === 'remix'
          ? import('@data/remix/encounters.json')
          : import('@data/classic/encounters.json'),
        gameMode === 'remix'
          ? import('@data/remix/trades.json')
          : import('@data/classic/trades.json'),
        gameMode === 'remix'
          ? import('@data/remix/gifts.json')
          : import('@data/classic/gifts.json'),
        gameMode === 'remix'
          ? import('@data/remix/quests.json')
          : import('@data/classic/quests.json'),
        gameMode === 'remix'
          ? import('@data/remix/statics.json')
          : import('@data/classic/statics.json'),
        import('@data/shared/egg-locations.json'),
      ]
    );

    // Validate the data using the old schema (since data files haven't been migrated yet)
    const encounters = OldRouteEncountersArraySchema.parse(wild.default);
    const trades = OldRouteEncountersArraySchema.parse(trade.default);
    const gifts = OldRouteEncountersArraySchema.parse(gift.default);
    const quests = OldRouteEncountersArraySchema.parse(quest.default);
    const staticsData = OldRouteEncountersArraySchema.parse(statics.default);
    const eggLocationsData = eggLocations.default as EggLocationsData;

    // Create maps of route names for egg locations by source type
    const eggGiftRoutes = new Map(
      eggLocationsData.locations
        .filter(location => location.source === 'gift')
        .map(location => [location.routeName, location])
    );
    const eggNestRoutes = new Map(
      eggLocationsData.locations
        .filter(location => location.source === 'nest')
        .map(location => [location.routeName, location])
    );

    // Merge the data by route name
    const allRouteNames = new Set([
      ...encounters.map(e => e.routeName),
      ...trades.map(t => t.routeName),
      ...gifts.map(g => g.routeName),
      ...quests.map(q => q.routeName),
      ...staticsData.map(s => s.routeName),
      ...eggGiftRoutes.keys(), // Include egg gift locations
      ...eggNestRoutes.keys(), // Include egg nest locations
    ]);

    // Create a map for quick lookup of each encounter type
    const encountersMap = new Map(encounters.map(e => [e.routeName, e]));
    const tradesMap = new Map(trades.map(t => [t.routeName, t]));
    const giftsMap = new Map(gifts.map(g => [g.routeName, g]));
    const questsMap = new Map(quests.map(q => [q.routeName, q]));
    const staticsMap = new Map(staticsData.map(s => [s.routeName, s]));

    // Merge encounters for each route with source information
    const mergedEncounters = Array.from(allRouteNames).map(routeName => {
      const wildPokemon = encountersMap.get(routeName)?.pokemonIds || [];
      const tradePokemon = tradesMap.get(routeName)?.pokemonIds || [];
      const giftPokemon = giftsMap.get(routeName)?.pokemonIds || [];
      const questPokemon = questsMap.get(routeName)?.pokemonIds || [];
      const staticPokemon = staticsMap.get(routeName)?.pokemonIds || [];

      // Create Pokemon objects with source information
      const pokemon: Array<{ id: number; source: EncounterSource }> = [
        ...wildPokemon.map(id => ({
          id,
          source: EncounterSource.WILD as const,
        })),
        ...tradePokemon.map(id => ({
          id,
          source: EncounterSource.TRADE as const,
        })),
        ...giftPokemon.map(id => ({
          id,
          source: EncounterSource.GIFT as const,
        })),
        ...questPokemon.map(id => ({
          id,
          source: EncounterSource.QUEST as const,
        })),
        ...staticPokemon.map(id => ({
          id,
          source: EncounterSource.STATIC as const,
        })),
      ];

      // Add egg encounters based on data source type
      if (eggGiftRoutes.has(routeName)) {
        const eggLocation = eggGiftRoutes.get(routeName)!;
        // Add the egg itself (represented by id: -1) with GIFT source (where you get the egg)
        pokemon.push({ id: -1, source: EncounterSource.GIFT as const });
        // Add the actual Pokemon from the egg with EGG source (what hatches from the egg)
        if (eggLocation.pokemonId && eggLocation.pokemonId > 0) {
          pokemon.push({
            id: eggLocation.pokemonId,
            source: EncounterSource.EGG as const,
          });
        }
      }
      if (eggNestRoutes.has(routeName)) {
        const eggLocation = eggNestRoutes.get(routeName)!;
        // Add the egg itself (represented by id: -1) with NEST source (where you get the egg)
        pokemon.push({ id: -1, source: EncounterSource.NEST as const });
        // Add the actual Pokemon from the egg with EGG source (what hatches from the egg)
        if (eggLocation.pokemonId && eggLocation.pokemonId > 0) {
          pokemon.push({
            id: eggLocation.pokemonId,
            source: EncounterSource.EGG as const,
          });
        }
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
    const isDevelopment = process.env.NODE_ENV === 'development';

    return NextResponse.json(validatedMergedEncounters, {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': isDevelopment
          ? 'public, max-age=30' // 30 seconds in dev for quick iteration
          : 'public, max-age=3600', // 1 hour in production
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
