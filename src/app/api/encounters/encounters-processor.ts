// Static imports - load data once at module level
import classicEncounters from "@data/classic/encounters.json";
import classicGifts from "@data/classic/gifts.json";
import classicQuests from "@data/classic/quests.json";
import classicSafari from "@data/classic/safari-encounters.json";
import classicStatics from "@data/classic/statics.json";
import classicTrades from "@data/classic/trades.json";
import remixEncounters from "@data/remix/encounters.json";
import remixGifts from "@data/remix/gifts.json";
import remixQuests from "@data/remix/quests.json";
import remixSafari from "@data/remix/safari-encounters.json";
import remixStatics from "@data/remix/statics.json";
import remixTrades from "@data/remix/trades.json";
import eggLocations from "@data/shared/egg-locations.json";
import legendaryEncounters from "@data/shared/legendary-encounters.json";
import { z } from "zod";
import { EncounterSource, type EncounterType } from "@/types/encounters";
import {
  EncounterTypeSchema,
  RouteEncountersArraySchema,
} from "@/validation/encounters";

// Schema for the new enhanced data format with encounter types
const NewPokemonEncounterSchema = z.object({
  encounterType: EncounterTypeSchema,
  pokemonId: z.number().int(),
});

const NewRouteEncounterSchema = z.object({
  encounters: z.array(NewPokemonEncounterSchema),
  routeName: z.string().min(1, { error: "Route name is required" }),
});

const NewRouteEncountersArraySchema = z.array(NewRouteEncounterSchema);

// Temporary schema for the old data format during migration
const OldRouteEncounterSchema = z.object({
  pokemonIds: z.array(z.number().int()),
  routeName: z.string().min(1, { error: "Route name is required" }),
});
const OldRouteEncountersArraySchema = z.array(OldRouteEncounterSchema);

// Schema for legendary encounters data format
const LegendaryRouteEncounterSchema = z.object({
  encounters: z.array(z.number().int()),
  routeName: z.string().min(1, { error: "Route name is required" }),
});
const LegendaryRouteEncountersArraySchema = z.array(
  LegendaryRouteEncounterSchema,
);

// Schema for egg location data
const EggLocationSchema = z.object({
  description: z.string(),
  pokemonId: z.number().optional(),
  pokemonName: z.string().optional(),
  routeName: z.string(),
  source: z.enum(["gift", "nest"]),
});

const EggLocationsSchema = z.object({
  locations: z.array(EggLocationSchema),
  pokemonIdentified: z.object({
    fromGifts: z.number(),
    fromNests: z.number(),
    total: z.number(),
  }),
  sources: z.object({
    gifts: z.number(),
    nests: z.number(),
  }),
  totalLocations: z.number(),
});

interface PokemonWithSource {
  id: number;
  source: EncounterSource;
}
interface RouteData {
  encounters?: Array<{ pokemonId: number; encounterType: EncounterType }>;
  pokemonIds?: number[];
}

const withSource = (
  ids: number[],
  source: EncounterSource,
): PokemonWithSource[] => ids.map((id) => ({ id, source }));

const getWildPokemon = (
  routeData: RouteData | undefined,
): PokemonWithSource[] => {
  if (routeData?.encounters) {
    return routeData.encounters.map((encounter) => ({
      id: encounter.pokemonId,
      source: mapEncounterTypeToSource(encounter.encounterType),
    }));
  }

  return withSource(routeData?.pokemonIds ?? [], EncounterSource.WILD);
};

const addEggPokemon = (
  pokemon: PokemonWithSource[],
  eggLocation: z.infer<typeof EggLocationSchema> | undefined,
  source: EncounterSource.GIFT | EncounterSource.NEST,
) => {
  if (!eggLocation) {
    return;
  }

  pokemon.push({ id: -1, source });
  if (eggLocation.pokemonId && eggLocation.pokemonId > 0) {
    pokemon.push({ id: eggLocation.pokemonId, source: EncounterSource.EGG });
  }
};

const deduplicatePokemon = (pokemon: PokemonWithSource[]) =>
  pokemon.filter(
    (entry, index, entries) =>
      entries.findIndex(
        (candidate) =>
          candidate.id === entry.id && candidate.source === entry.source,
      ) === index,
  );

// Function to map encounter types to encounter sources
function mapEncounterTypeToSource(
  encounterType: EncounterType,
): EncounterSource {
  switch (encounterType) {
    case "grass":
      return EncounterSource.GRASS;
    case "surf":
      return EncounterSource.SURF;
    case "fishing":
      return EncounterSource.FISHING;
    case "cave":
      return EncounterSource.CAVE;
    case "rock_smash":
      return EncounterSource.ROCK_SMASH;
    case "special":
      return EncounterSource.STATIC;
    case "pokeradar":
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
  }>,
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

  safariEncounters.forEach((area) => {
    allSafariEncounters.push(...area.encounters);
  });

  // Remove duplicates based on both pokemonId and encounterType
  const uniqueEncounters = allSafariEncounters.filter(
    (encounter, index, array) =>
      array.findIndex(
        (e) =>
          e.pokemonId === encounter.pokemonId &&
          e.encounterType === encounter.encounterType,
      ) === index,
  );

  return [
    {
      encounters: uniqueEncounters,
      routeName: "Safari Zone",
    },
  ];
}

// In-memory cache for processed data
const processedDataCache = new Map<
  string,
  ReturnType<typeof RouteEncountersArraySchema.parse>
>();

// Pre-process data once when module loads
export function processGameModeData(gameMode: "classic" | "remix") {
  const cacheKey = `processed-${gameMode}`;

  if (processedDataCache.has(cacheKey)) {
    return processedDataCache.get(cacheKey);
  }

  // Get the correct data for the game mode
  const data =
    gameMode === "remix"
      ? {
          encounters: remixEncounters,
          gifts: remixGifts,
          quests: remixQuests,
          safari: remixSafari,
          statics: remixStatics,
          trades: remixTrades,
        }
      : {
          encounters: classicEncounters,
          gifts: classicGifts,
          quests: classicQuests,
          safari: classicSafari,
          statics: classicStatics,
          trades: classicTrades,
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
    data.encounters,
  );
  if (newWildFormat.success) {
    encounters = [...newWildFormat.data, ...consolidatedSafari];
  } else {
    const oldWildFormat = OldRouteEncountersArraySchema.parse(data.encounters);
    const oldFormatEncounters = oldWildFormat.map((route) => ({
      pokemonIds: route.pokemonIds,
      routeName: route.routeName,
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

  // Create maps of route names for egg locations by source type.
  const eggGiftRoutes = new Map();
  const eggNestRoutes = new Map();
  for (const location of eggLocationsData.locations) {
    if (location.source === "gift") {
      eggGiftRoutes.set(location.routeName, location);
    } else if (location.source === "nest") {
      eggNestRoutes.set(location.routeName, location);
    }
  }

  // Merge the data by route name
  const allRouteNames = new Set([
    ...encounters.map((e) => e.routeName),
    ...trades.map((t) => t.routeName),
    ...gifts.map((g) => g.routeName),
    ...quests.map((q) => q.routeName),
    ...staticsData.map((s) => s.routeName),
    ...legendaryData.map((l) => l.routeName),
    ...eggGiftRoutes.keys(),
    ...eggNestRoutes.keys(),
  ]);

  // Create maps for quick lookup
  const encountersMap = new Map(encounters.map((e) => [e.routeName, e]));
  const tradesMap = new Map(trades.map((t) => [t.routeName, t]));
  const giftsMap = new Map(gifts.map((g) => [g.routeName, g]));
  const questsMap = new Map(quests.map((q) => [q.routeName, q]));
  const staticsMap = new Map(staticsData.map((s) => [s.routeName, s]));
  const legendaryMap = new Map(legendaryData.map((l) => [l.routeName, l]));

  // Merge encounters for each route
  // Per-route aggregation deliberately keeps every source visible before deduplication.
  // fallow-ignore-next-line complexity
  const mergedEncounters = Array.from(allRouteNames).map((routeName) => {
    const routeData = encountersMap.get(routeName);
    const tradePokemon = tradesMap.get(routeName)?.pokemonIds || [];
    const giftPokemon = giftsMap.get(routeName)?.pokemonIds || [];
    const questPokemon = questsMap.get(routeName)?.pokemonIds || [];
    // Static encounters can come from special-only locations (for example cities,
    // interior rooms, and one-off events) that intentionally have no wild
    // encounter table entry in encounters.json.
    const staticPokemon = staticsMap.get(routeName)?.pokemonIds || [];
    const legendaryPokemon = legendaryMap.get(routeName)?.encounters || [];

    const pokemon: PokemonWithSource[] = [
      ...getWildPokemon(routeData),
      ...withSource(tradePokemon, EncounterSource.TRADE),
      ...withSource(giftPokemon, EncounterSource.GIFT),
      ...withSource(questPokemon, EncounterSource.QUEST),
      ...withSource(staticPokemon, EncounterSource.STATIC),
      ...withSource(legendaryPokemon, EncounterSource.LEGENDARY),
    ];

    addEggPokemon(pokemon, eggGiftRoutes.get(routeName), EncounterSource.GIFT);
    addEggPokemon(pokemon, eggNestRoutes.get(routeName), EncounterSource.NEST);

    return { pokemon: deduplicatePokemon(pokemon), routeName };
  });

  // Sort by route name
  mergedEncounters.sort((a, b) => a.routeName.localeCompare(b.routeName));

  // Validate and cache the result
  const validatedMergedEncounters =
    RouteEncountersArraySchema.parse(mergedEncounters);
  processedDataCache.set(cacheKey, validatedMergedEncounters);

  return validatedMergedEncounters;
}
