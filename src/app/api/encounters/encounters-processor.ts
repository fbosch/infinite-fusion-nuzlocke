import { z } from 'zod';
import {
  EncounterSource,
  RouteEncountersArraySchema,
} from '@/loaders/encounters';
import { EncounterTypeSchema, type EncounterType } from '@/types/encounters';

// Static imports - load data once at module level
import classicEncounters from '@data/classic/encounters.json';
import classicSafari from '@data/classic/safari-encounters.json';
import classicTrades from '@data/classic/trades.json';
import classicGifts from '@data/classic/gifts.json';
import classicQuests from '@data/classic/quests.json';
import classicStatics from '@data/classic/statics.json';

import remixEncounters from '@data/remix/encounters.json';
import remixSafari from '@data/remix/safari-encounters.json';
import remixTrades from '@data/remix/trades.json';
import remixGifts from '@data/remix/gifts.json';
import remixQuests from '@data/remix/quests.json';
import remixStatics from '@data/remix/statics.json';

import eggLocations from '@data/shared/egg-locations.json';
import legendaryEncounters from '@data/shared/legendary-encounters.json';

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

// Schema for egg location data
const EggLocationSchema = z.object({
  routeName: z.string(),
  source: z.enum(['gift', 'nest']),
  description: z.string(),
  pokemonName: z.string().optional(),
  pokemonId: z.number().optional(),
});

const EggLocationsSchema = z.object({
  totalLocations: z.number(),
  sources: z.object({
    gifts: z.number(),
    nests: z.number(),
  }),
  pokemonIdentified: z.object({
    total: z.number(),
    fromGifts: z.number(),
    fromNests: z.number(),
  }),
  locations: z.array(EggLocationSchema),
});

// Types for egg location data (inferred from schemas)
// Use z.infer<typeof EggLocationSchema> and z.infer<typeof EggLocationsSchema> where needed

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

// In-memory cache for processed data
const processedDataCache = new Map<
  string,
  ReturnType<typeof RouteEncountersArraySchema.parse>
>();

// Pre-process data once when module loads
export function processGameModeData(gameMode: 'classic' | 'remix') {
  const cacheKey = `processed-${gameMode}`;

  if (processedDataCache.has(cacheKey)) {
    return processedDataCache.get(cacheKey);
  }

  // Get the correct data for the game mode
  const data =
    gameMode === 'remix'
      ? {
          encounters: remixEncounters,
          safari: remixSafari,
          trades: remixTrades,
          gifts: remixGifts,
          quests: remixQuests,
          statics: remixStatics,
        }
      : {
          encounters: classicEncounters,
          safari: classicSafari,
          trades: classicTrades,
          gifts: classicGifts,
          quests: classicQuests,
          statics: classicStatics,
        };

  // Process Safari Zone encounters and consolidate them
  const safariData = NewRouteEncountersArraySchema.parse(data.safari);
  const consolidatedSafari = consolidateSafariZoneAreas(safariData);

  // Parse encounters data
  let encounters: Array<{
    routeName: string;
    encounters?: Array<{
      pokemonId: number;
      encounterType: EncounterType;
    }>;
    pokemonIds?: number[];
  }>;

  const newWildFormat = NewRouteEncountersArraySchema.safeParse(
    data.encounters
  );
  if (newWildFormat.success) {
    encounters = [...newWildFormat.data, ...consolidatedSafari];
  } else {
    const oldWildFormat = OldRouteEncountersArraySchema.parse(data.encounters);
    const oldFormatEncounters = oldWildFormat.map(route => ({
      routeName: route.routeName,
      pokemonIds: route.pokemonIds,
    }));
    encounters = [...oldFormatEncounters, ...consolidatedSafari];
  }

  // Parse other data
  const trades = OldRouteEncountersArraySchema.parse(data.trades);
  const gifts = OldRouteEncountersArraySchema.parse(data.gifts);
  const quests = OldRouteEncountersArraySchema.parse(data.quests);
  const staticsData = OldRouteEncountersArraySchema.parse(data.statics);
  const eggLocationsData = EggLocationsSchema.parse(eggLocations);
  const legendaryData =
    LegendaryRouteEncountersArraySchema.parse(legendaryEncounters);

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
    ...eggGiftRoutes.keys(),
    ...eggNestRoutes.keys(),
  ]);

  // Create maps for quick lookup
  const encountersMap = new Map(encounters.map(e => [e.routeName, e]));
  const tradesMap = new Map(trades.map(t => [t.routeName, t]));
  const giftsMap = new Map(gifts.map(g => [g.routeName, g]));
  const questsMap = new Map(quests.map(q => [q.routeName, q]));
  const staticsMap = new Map(staticsData.map(s => [s.routeName, s]));
  const legendaryMap = new Map(legendaryData.map(l => [l.routeName, l]));

  // Merge encounters for each route
  const mergedEncounters = Array.from(allRouteNames).map(routeName => {
    const routeData = encountersMap.get(routeName);
    const tradePokemon = tradesMap.get(routeName)?.pokemonIds || [];
    const giftPokemon = giftsMap.get(routeName)?.pokemonIds || [];
    const questPokemon = questsMap.get(routeName)?.pokemonIds || [];
    const staticPokemon = staticsMap.get(routeName)?.pokemonIds || [];
    const legendaryPokemon = legendaryMap.get(routeName)?.encounters || [];

    // Handle wild Pokemon with encounter types
    const wildPokemonObjects: Array<{ id: number; source: EncounterSource }> =
      [];

    if (routeData) {
      if (routeData.encounters) {
        wildPokemonObjects.push(
          ...routeData.encounters.map(encounter => ({
            id: encounter.pokemonId,
            source: mapEncounterTypeToSource(encounter.encounterType),
          }))
        );
      } else if (routeData.pokemonIds) {
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
      ...giftPokemon.map(id => ({ id, source: EncounterSource.GIFT as const })),
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

    // Add egg encounters
    if (eggGiftRoutes.has(routeName)) {
      const eggLocation = eggGiftRoutes.get(routeName)!;
      pokemon.push({ id: -1, source: EncounterSource.GIFT as const });
      if (eggLocation.pokemonId && eggLocation.pokemonId > 0) {
        pokemon.push({
          id: eggLocation.pokemonId,
          source: EncounterSource.EGG as const,
        });
      }
    }
    if (eggNestRoutes.has(routeName)) {
      const eggLocation = eggNestRoutes.get(routeName)!;
      pokemon.push({ id: -1, source: EncounterSource.NEST as const });
      if (eggLocation.pokemonId && eggLocation.pokemonId > 0) {
        pokemon.push({
          id: eggLocation.pokemonId,
          source: EncounterSource.EGG as const,
        });
      }
    }

    // Remove duplicates
    const uniquePokemon = pokemon.filter(
      (pokemon, index, array) =>
        array.findIndex(
          p => p.id === pokemon.id && p.source === pokemon.source
        ) === index
    );

    return { routeName, pokemon: uniquePokemon };
  });

  // Sort by route name
  mergedEncounters.sort((a, b) => a.routeName.localeCompare(b.routeName));

  // Validate and cache the result
  const validatedMergedEncounters =
    RouteEncountersArraySchema.parse(mergedEncounters);
  processedDataCache.set(cacheKey, validatedMergedEncounters);

  return validatedMergedEncounters;
}
