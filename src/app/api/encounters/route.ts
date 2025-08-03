import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import {
  EncounterSource,
  RouteEncountersArraySchema,
} from '@/loaders/encounters';
import { EncounterTypeSchema, type EncounterType } from '@/types/encounters';

// Schema for the new enhanced data format with encounter types
const NewPokemonEncounterSchema = z.object({
  pokemonId: z.number().int(),
  encounterType: EncounterTypeSchema,
});

const NewRouteEncounterSchema = z.object({
  routeName: z.string().min(1, { error: 'Route name is required' }),
  encounters: z.array(NewPokemonEncounterSchema),
});

const NewRouteEncountersArraySchema = z.array(NewRouteEncounterSchema);
// Temporary schema for the old data format during migration
const OldRouteEncounterSchema = z.object({
  routeName: z.string().min(1, { error: 'Route name is required' }),
  pokemonIds: z.array(z.number().int()),
});
const OldRouteEncountersArraySchema = z.array(OldRouteEncounterSchema);

// Schema for legendary encounters data format
const LegendaryRouteEncounterSchema = z.object({
  routeName: z.string().min(1, { error: 'Route name is required' }),
  encounters: z.array(z.number().int()),
});
const LegendaryRouteEncountersArraySchema = z.array(
  LegendaryRouteEncounterSchema
);

// Function to map encounter types to encounter sources
function mapEncounterTypeToSource(
  encounterType: EncounterType
): EncounterSource {
  switch (encounterType) {
    case 'grass':
      return EncounterSource.GRASS;
    case 'surf':
      return EncounterSource.SURF;
    case 'fishing':
      return EncounterSource.FISHING;
    case 'cave':
      return EncounterSource.CAVE;
    case 'rock_smash':
      return EncounterSource.ROCK_SMASH;
    case 'special':
      return EncounterSource.STATIC;
    case 'pokeradar':
      return EncounterSource.POKERADAR;
    default:
      return EncounterSource.WILD;
  }
}

// Function to consolidate Safari Zone areas into a single location for Nuzlocke rules
function consolidateSafariZoneAreas(
  safariEncounters: Array<{
    routeName: string;
    encounters: Array<{
      pokemonId: number;
      encounterType: EncounterType;
    }>;
  }>
): Array<{
  routeName: string;
  encounters: Array<{
    pokemonId: number;
    encounterType: EncounterType;
  }>;
}> {
  if (safariEncounters.length === 0) {
    return [];
  }

  // Consolidate all Safari Zone areas into a single "Safari Zone" location
  const allSafariEncounters: Array<{
    pokemonId: number;
    encounterType: EncounterType;
  }> = [];

  safariEncounters.forEach(area => {
    allSafariEncounters.push(...area.encounters);
  });

  // Remove duplicates based on both pokemonId and encounterType
  const uniqueEncounters = allSafariEncounters.filter(
    (encounter, index, array) =>
      array.findIndex(
        e =>
          e.pokemonId === encounter.pokemonId &&
          e.encounterType === encounter.encounterType
      ) === index
  );

  return [
    {
      routeName: 'Safari Zone',
      encounters: uniqueEncounters,
    },
  ];
}

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
    const [wild, safari, trade, gift, quest, statics, eggLocations, legendary] =
      await Promise.all([
        gameMode === 'remix'
          ? import('@data/remix/encounters.json')
          : import('@data/classic/encounters.json'),
        gameMode === 'remix'
          ? import('@data/remix/safari-encounters.json')
          : import('@data/classic/safari-encounters.json'),
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
        import('@data/shared/legendary-encounters.json'),
      ]);

    // Parse Safari Zone encounters and consolidate them
    const safariData = NewRouteEncountersArraySchema.parse(safari.default);
    const consolidatedSafari = consolidateSafariZoneAreas(safariData);

    // Try to parse with new schema first, fall back to old schema for backward compatibility
    let encounters: Array<{
      routeName: string;
      encounters?: Array<{
        pokemonId: number;
        encounterType: EncounterType;
      }>;
      pokemonIds?: number[];
    }>;

    const newWildFormat = NewRouteEncountersArraySchema.safeParse(wild.default);
    if (newWildFormat.success) {
      // Combine regular encounters with consolidated Safari Zone encounters
      encounters = [...newWildFormat.data, ...consolidatedSafari];
    } else {
      // Fall back to old format
      const oldWildFormat = OldRouteEncountersArraySchema.parse(wild.default);
      const oldFormatEncounters = oldWildFormat.map(route => ({
        routeName: route.routeName,
        pokemonIds: route.pokemonIds,
      }));
      // Add Safari Zone encounters to old format as well
      encounters = [...oldFormatEncounters, ...consolidatedSafari];
    }

    const trades = OldRouteEncountersArraySchema.parse(trade.default);
    const gifts = OldRouteEncountersArraySchema.parse(gift.default);
    const quests = OldRouteEncountersArraySchema.parse(quest.default);
    const staticsData = OldRouteEncountersArraySchema.parse(statics.default);
    const eggLocationsData = eggLocations.default as EggLocationsData;
    const legendaryData = LegendaryRouteEncountersArraySchema.parse(
      legendary.default
    );

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
      ...legendaryData.map(l => l.routeName),
      ...eggGiftRoutes.keys(), // Include egg gift locations
      ...eggNestRoutes.keys(), // Include egg nest locations
    ]);

    // Create a map for quick lookup of each encounter type
    const encountersMap = new Map(encounters.map(e => [e.routeName, e]));
    const tradesMap = new Map(trades.map(t => [t.routeName, t]));
    const giftsMap = new Map(gifts.map(g => [g.routeName, g]));
    const questsMap = new Map(quests.map(q => [q.routeName, q]));
    const staticsMap = new Map(staticsData.map(s => [s.routeName, s]));
    const legendaryMap = new Map(legendaryData.map(l => [l.routeName, l]));

    // Merge encounters for each route with source information
    const mergedEncounters = Array.from(allRouteNames).map(routeName => {
      const routeData = encountersMap.get(routeName);
      const tradePokemon = tradesMap.get(routeName)?.pokemonIds || [];
      const giftPokemon = giftsMap.get(routeName)?.pokemonIds || [];
      const questPokemon = questsMap.get(routeName)?.pokemonIds || [];
      const staticPokemon = staticsMap.get(routeName)?.pokemonIds || [];
      const legendaryPokemon = legendaryMap.get(routeName)?.encounters || [];

      // Handle wild Pokemon with the new encounter type system
      const wildPokemonObjects: Array<{ id: number; source: EncounterSource }> =
        [];

      if (routeData) {
        if (routeData.encounters) {
          // New format: encounters with types
          wildPokemonObjects.push(
            ...routeData.encounters.map(encounter => ({
              id: encounter.pokemonId,
              source: mapEncounterTypeToSource(encounter.encounterType),
            }))
          );
        } else if (routeData.pokemonIds) {
          // Old format: just pokemon IDs (treat as generic wild)
          wildPokemonObjects.push(
            ...routeData.pokemonIds.map(id => ({
              id,
              source: EncounterSource.WILD as const,
            }))
          );
        }
      }

      // Create Pokemon objects with source information
      const pokemon: Array<{ id: number; source: EncounterSource }> = [
        ...wildPokemonObjects,
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
        ...legendaryPokemon.map((id: number) => ({
          id,
          source: EncounterSource.LEGENDARY as const,
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
