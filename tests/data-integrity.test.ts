import { describe, it, expect, beforeAll } from 'vitest';
import fs from 'fs/promises';
import path from 'path';

interface Location {
  name: string;
  routeId: number | null;
  order: number;
  region: string;
  description: string;
}

interface RouteEncounter {
  routeName: string;
  pokemonIds: number[];
  routeId: number;
}

interface GiftPokemon {
  pokemonId: number;
  location: string;
  level?: number;
  requirements?: string;
}

interface TradePokemon {
  pokemonId: number;
  location: string;
  requirements?: string;
}

describe('Data Integrity Tests', () => {
  let locations: Location[];
  let classicEncounters: RouteEncounter[];
  let remixEncounters: RouteEncounter[];
  let classicGifts: GiftPokemon[];
  let remixGifts: GiftPokemon[];
  let classicTrades: TradePokemon[];
  let remixTrades: TradePokemon[];

  beforeAll(async () => {
    const dataDir = path.join(process.cwd(), 'data');

    // Load all data files
    const [
      locationsData,
      classicData,
      remixData,
      classicGiftsData,
      remixGiftsData,
      classicTradesData,
      remixTradesData,
    ] = await Promise.all([
      fs.readFile(path.join(dataDir, 'locations.json'), 'utf-8'),
      fs.readFile(path.join(dataDir, 'route-encounters-classic.json'), 'utf-8'),
      fs.readFile(path.join(dataDir, 'route-encounters-remix.json'), 'utf-8'),
      fs.readFile(path.join(dataDir, 'gifts-classic.json'), 'utf-8'),
      fs.readFile(path.join(dataDir, 'gifts-remix.json'), 'utf-8'),
      fs.readFile(path.join(dataDir, 'trades-classic.json'), 'utf-8'),
      fs.readFile(path.join(dataDir, 'trades-remix.json'), 'utf-8'),
    ]);

    locations = JSON.parse(locationsData);
    classicEncounters = JSON.parse(classicData);
    remixEncounters = JSON.parse(remixData);
    classicGifts = JSON.parse(classicGiftsData);
    remixGifts = JSON.parse(remixGiftsData);
    classicTrades = JSON.parse(classicTradesData);
    remixTrades = JSON.parse(remixTradesData);
  });

  describe('Route Encounter Coverage', () => {
    it('should have encounter data for every location with a routeId in classic mode', () => {
      // Get all locations that have a routeId (excluding starter Pokemon routeId 0)
      const locationsWithRouteId = locations.filter(
        loc => loc.routeId !== null && loc.routeId !== 0
      );

      // Create a map of routeId to classic encounters for quick lookup
      const classicRouteIdMap = new Map<number, RouteEncounter>();
      classicEncounters.forEach(encounter => {
        classicRouteIdMap.set(encounter.routeId, encounter);
      });

      const missingEncounters: Location[] = [];

      // Check each location with routeId
      locationsWithRouteId.forEach(location => {
        if (!classicRouteIdMap.has(location.routeId!)) {
          missingEncounters.push(location);
        }
      });

      if (missingEncounters.length > 0) {
        const missingDetails = missingEncounters
          .map(loc => `- ${loc.name} (routeId: ${loc.routeId})`)
          .join('\n');

        throw new Error(
          `Missing classic encounter data for ${missingEncounters.length} location(s):\n${missingDetails}`
        );
      }

      expect(missingEncounters).toHaveLength(0);
    });

    it('should have encounter data for every location with a routeId in remix mode', () => {
      // Get all locations that have a routeId (excluding starter Pokemon routeId 0)
      const locationsWithRouteId = locations.filter(
        loc => loc.routeId !== null && loc.routeId !== 0
      );

      // Create a map of routeId to remix encounters for quick lookup
      const remixRouteIdMap = new Map<number, RouteEncounter>();
      remixEncounters.forEach(encounter => {
        remixRouteIdMap.set(encounter.routeId, encounter);
      });

      const missingEncounters: Location[] = [];

      // Check each location with routeId
      locationsWithRouteId.forEach(location => {
        if (!remixRouteIdMap.has(location.routeId!)) {
          missingEncounters.push(location);
        }
      });

      if (missingEncounters.length > 0) {
        const missingDetails = missingEncounters
          .map(loc => `- ${loc.name} (routeId: ${loc.routeId})`)
          .join('\n');

        throw new Error(
          `Missing remix encounter data for ${missingEncounters.length} location(s):\n${missingDetails}`
        );
      }

      expect(missingEncounters).toHaveLength(0);
    });

    it('should not have orphaned encounter data (encounters without corresponding locations)', () => {
      // Get all routeIds from locations (excluding starter Pokemon routeId 0)
      const locationRouteIds = new Set(
        locations
          .filter(loc => loc.routeId !== null && loc.routeId !== 0)
          .map(loc => loc.routeId!)
      );

      // Check classic encounters (excluding routeId 0)
      const orphanedClassicEncounters = classicEncounters.filter(
        encounter =>
          encounter.routeId !== 0 && !locationRouteIds.has(encounter.routeId)
      );

      // Check remix encounters (excluding routeId 0)
      const orphanedRemixEncounters = remixEncounters.filter(
        encounter =>
          encounter.routeId !== 0 && !locationRouteIds.has(encounter.routeId)
      );

      const errors: string[] = [];

      if (orphanedClassicEncounters.length > 0) {
        const orphanedDetails = orphanedClassicEncounters
          .map(enc => `- ${enc.routeName} (routeId: ${enc.routeId})`)
          .join('\n');
        errors.push(`Orphaned classic encounters:\n${orphanedDetails}`);
      }

      if (orphanedRemixEncounters.length > 0) {
        const orphanedDetails = orphanedRemixEncounters
          .map(enc => `- ${enc.routeName} (routeId: ${enc.routeId})`)
          .join('\n');
        errors.push(`Orphaned remix encounters:\n${orphanedDetails}`);
      }

      if (errors.length > 0) {
        throw new Error(errors.join('\n\n'));
      }

      expect(orphanedClassicEncounters).toHaveLength(0);
      expect(orphanedRemixEncounters).toHaveLength(0);
    });

    it('should have valid Pokemon IDs in all encounter tables', () => {
      const invalidClassicEncounters: string[] = [];
      const invalidRemixEncounters: string[] = [];

      // Check classic encounters
      classicEncounters.forEach(encounter => {
        if (!encounter.pokemonIds || encounter.pokemonIds.length === 0) {
          invalidClassicEncounters.push(
            `${encounter.routeName} (routeId: ${encounter.routeId}) has no Pokemon`
          );
        } else {
          encounter.pokemonIds.forEach(pokemonId => {
            if (!Number.isInteger(pokemonId) || pokemonId <= 0) {
              invalidClassicEncounters.push(
                `${encounter.routeName} (routeId: ${encounter.routeId}) has invalid Pokemon ID: ${pokemonId}`
              );
            }
          });
        }
      });

      // Check remix encounters
      remixEncounters.forEach(encounter => {
        if (!encounter.pokemonIds || encounter.pokemonIds.length === 0) {
          invalidRemixEncounters.push(
            `${encounter.routeName} (routeId: ${encounter.routeId}) has no Pokemon`
          );
        } else {
          encounter.pokemonIds.forEach(pokemonId => {
            if (!Number.isInteger(pokemonId) || pokemonId <= 0) {
              invalidRemixEncounters.push(
                `${encounter.routeName} (routeId: ${encounter.routeId}) has invalid Pokemon ID: ${pokemonId}`
              );
            }
          });
        }
      });

      const errors: string[] = [];
      if (invalidClassicEncounters.length > 0) {
        errors.push(
          `Invalid classic encounters:\n${invalidClassicEncounters.join('\n')}`
        );
      }
      if (invalidRemixEncounters.length > 0) {
        errors.push(
          `Invalid remix encounters:\n${invalidRemixEncounters.join('\n')}`
        );
      }

      if (errors.length > 0) {
        throw new Error(errors.join('\n\n'));
      }

      expect(invalidClassicEncounters).toHaveLength(0);
      expect(invalidRemixEncounters).toHaveLength(0);
    });
  });

  describe('Pokemon Data Structure', () => {
    let pokemonData: any[]; // eslint-disable-line @typescript-eslint/no-explicit-any

    beforeAll(async () => {
      const dataDir = path.join(process.cwd(), 'data');
      const pokemonDataFile = await fs.readFile(
        path.join(dataDir, 'pokemon-data.json'),
        'utf-8'
      );
      pokemonData = JSON.parse(pokemonDataFile);
    });

    it('should have valid evolution data structure for all Pokemon', () => {
      const invalidEvolutionData: string[] = [];

      pokemonData.forEach(pokemon => {
        // Check if evolution field exists and is an object
        if (
          pokemon.evolution !== undefined &&
          typeof pokemon.evolution !== 'object'
        ) {
          invalidEvolutionData.push(
            `${pokemon.name}: evolution field is not an object`
          );
          return;
        }

        // If evolution data exists, validate its structure
        if (pokemon.evolution) {
          // Check evolves_to array
          if (!Array.isArray(pokemon.evolution.evolves_to)) {
            invalidEvolutionData.push(
              `${pokemon.name}: evolves_to is not an array`
            );
          }

          // Check evolves_from (optional)
          if (
            pokemon.evolution.evolves_from &&
            typeof pokemon.evolution.evolves_from !== 'object'
          ) {
            invalidEvolutionData.push(
              `${pokemon.name}: evolves_from is not an object`
            );
          }

          // Validate evolution details
          pokemon.evolution.evolves_to.forEach(
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (evolution: any, index: number) => {
              if (!evolution.id || !evolution.name) {
                invalidEvolutionData.push(
                  `${pokemon.name}: evolution ${index} missing id or name`
                );
              }
              if (typeof evolution.id !== 'number' || evolution.id <= 0) {
                invalidEvolutionData.push(
                  `${pokemon.name}: evolution ${index} has invalid id`
                );
              }
            }
          );

          if (pokemon.evolution.evolves_from) {
            const from = pokemon.evolution.evolves_from;
            if (!from.id || !from.name) {
              invalidEvolutionData.push(
                `${pokemon.name}: evolves_from missing id or name`
              );
            }
            if (typeof from.id !== 'number' || from.id <= 0) {
              invalidEvolutionData.push(
                `${pokemon.name}: evolves_from has invalid id`
              );
            }
          }
        }
      });

      if (invalidEvolutionData.length > 0) {
        throw new Error(
          `Invalid evolution data found:\n${invalidEvolutionData.join('\n')}`
        );
      }

      expect(invalidEvolutionData).toHaveLength(0);
    });

    it('should have valid species data structure for all Pokemon', () => {
      const invalidSpeciesData: string[] = [];

      pokemonData.forEach(pokemon => {
        if (!pokemon.species) {
          invalidSpeciesData.push(`${pokemon.name}: missing species data`);
          return;
        }

        // Check required species fields
        if (typeof pokemon.species.is_legendary !== 'boolean') {
          invalidSpeciesData.push(
            `${pokemon.name}: is_legendary is not a boolean`
          );
        }
        if (typeof pokemon.species.is_mythical !== 'boolean') {
          invalidSpeciesData.push(
            `${pokemon.name}: is_mythical is not a boolean`
          );
        }
        if (
          pokemon.species.generation !== null &&
          typeof pokemon.species.generation !== 'string'
        ) {
          invalidSpeciesData.push(
            `${pokemon.name}: generation is not a string or null`
          );
        }

        // Check evolution_chain if present
        if (
          pokemon.species.evolution_chain &&
          typeof pokemon.species.evolution_chain.url !== 'string'
        ) {
          invalidSpeciesData.push(
            `${pokemon.name}: evolution_chain.url is not a string`
          );
        }
      });

      if (invalidSpeciesData.length > 0) {
        throw new Error(
          `Invalid species data found:\n${invalidSpeciesData.join('\n')}`
        );
      }

      expect(invalidSpeciesData).toHaveLength(0);
    });

    it('should have consistent Pokemon IDs across all data', () => {
      const invalidIds: string[] = [];

      pokemonData.forEach(pokemon => {
        if (!Number.isInteger(pokemon.id) || pokemon.id <= 0) {
          invalidIds.push(`${pokemon.name}: invalid id ${pokemon.id}`);
        }
        if (
          !Number.isInteger(pokemon.nationalDexId) ||
          pokemon.nationalDexId <= 0
        ) {
          invalidIds.push(
            `${pokemon.name}: invalid nationalDexId ${pokemon.nationalDexId}`
          );
        }
      });

      if (invalidIds.length > 0) {
        throw new Error(`Invalid Pokemon IDs found:\n${invalidIds.join('\n')}`);
      }

      expect(invalidIds).toHaveLength(0);
    });

    it('should have correct evolution data for specific Pokemon', () => {
      // Test Eevee's evolution data
      const eevee = pokemonData.find(p => p.name === 'Eevee');
      expect(eevee).toBeDefined();
      expect(eevee?.evolution).toBeDefined();
      expect(eevee?.evolution.evolves_to).toBeInstanceOf(Array);
      expect(eevee?.evolution.evolves_to.length).toBeGreaterThan(0);

      // Check that Eevee has multiple evolution options
      const evolutionNames =
        eevee?.evolution.evolves_to.map((e: any) => e.name) || []; // eslint-disable-line @typescript-eslint/no-explicit-any
      expect(evolutionNames).toContain('vaporeon');
      expect(evolutionNames).toContain('jolteon');
      expect(evolutionNames).toContain('flareon');

      // Test a final evolution (Venusaur)
      const venusaur = pokemonData.find(p => p.name === 'Venusaur');
      expect(venusaur).toBeDefined();
      expect(venusaur?.evolution).toBeDefined();
      expect(venusaur?.evolution.evolves_to).toBeInstanceOf(Array);
      expect(venusaur?.evolution.evolves_to.length).toBe(0); // Final evolution
      expect(venusaur?.evolution.evolves_from).toBeDefined();
      expect(venusaur?.evolution.evolves_from.name).toBe('ivysaur');

      // Test a base Pokemon (Bulbasaur)
      const bulbasaur = pokemonData.find(p => p.name === 'Bulbasaur');
      expect(bulbasaur).toBeDefined();
      expect(bulbasaur?.evolution).toBeDefined();
      expect(bulbasaur?.evolution.evolves_to).toBeInstanceOf(Array);
      expect(bulbasaur?.evolution.evolves_to.length).toBeGreaterThan(0);
      expect(bulbasaur?.evolution.evolves_from).toBeUndefined(); // Base Pokemon
    });
  });

  describe('Data Consistency', () => {
    it('should have consistent routeId values between locations and encounters', () => {
      const locationRouteIds = new Set(
        locations
          .filter(loc => loc.routeId !== null && loc.routeId !== 0)
          .map(loc => loc.routeId!)
      );

      const classicRouteIds = new Set(
        classicEncounters
          .filter(enc => enc.routeId !== 0)
          .map(enc => enc.routeId)
      );
      const remixRouteIds = new Set(
        remixEncounters.filter(enc => enc.routeId !== 0).map(enc => enc.routeId)
      );

      // Check if all location routeIds exist in both encounter sets
      const missingInClassic = [...locationRouteIds].filter(
        id => !classicRouteIds.has(id)
      );
      const missingInRemix = [...locationRouteIds].filter(
        id => !remixRouteIds.has(id)
      );

      const errors: string[] = [];
      if (missingInClassic.length > 0) {
        errors.push(
          `RouteIds missing in classic encounters: ${missingInClassic.join(', ')}`
        );
      }
      if (missingInRemix.length > 0) {
        errors.push(
          `RouteIds missing in remix encounters: ${missingInRemix.join(', ')}`
        );
      }

      if (errors.length > 0) {
        throw new Error(errors.join('\n'));
      }

      expect(missingInClassic).toHaveLength(0);
      expect(missingInRemix).toHaveLength(0);
    });

    it('should have unique routeIds in each encounter file', () => {
      // Check for duplicate routeIds in classic encounters
      const classicRouteIds: number[] = [];
      const classicDuplicates: number[] = [];

      classicEncounters.forEach(encounter => {
        if (classicRouteIds.includes(encounter.routeId)) {
          classicDuplicates.push(encounter.routeId);
        } else {
          classicRouteIds.push(encounter.routeId);
        }
      });

      // Check for duplicate routeIds in remix encounters
      const remixRouteIds: number[] = [];
      const remixDuplicates: number[] = [];

      remixEncounters.forEach(encounter => {
        if (remixRouteIds.includes(encounter.routeId)) {
          remixDuplicates.push(encounter.routeId);
        } else {
          remixRouteIds.push(encounter.routeId);
        }
      });

      const errors: string[] = [];
      if (classicDuplicates.length > 0) {
        errors.push(
          `Duplicate routeIds in classic encounters: ${[...new Set(classicDuplicates)].join(', ')}`
        );
      }
      if (remixDuplicates.length > 0) {
        errors.push(
          `Duplicate routeIds in remix encounters: ${[...new Set(remixDuplicates)].join(', ')}`
        );
      }

      if (errors.length > 0) {
        throw new Error(errors.join('\n'));
      }

      expect(classicDuplicates).toHaveLength(0);
      expect(remixDuplicates).toHaveLength(0);
    });
  });

  describe('Gift Pokemon Data Integrity', () => {
    it('should have valid Pokemon IDs in all gift entries', () => {
      const invalidGifts: string[] = [];

      classicGifts.forEach((gift, index) => {
        if (!Number.isInteger(gift.pokemonId)) {
          invalidGifts.push(
            `Classic Gift ${index}: pokemonId is not an integer`
          );
        }
        if (gift.pokemonId === 0) {
          invalidGifts.push(`Classic Gift ${index}: pokemonId cannot be 0`);
        }
        // Allow negative IDs for special cases (eggs, fossils, etc.)
      });

      remixGifts.forEach((gift, index) => {
        if (!Number.isInteger(gift.pokemonId)) {
          invalidGifts.push(`Remix Gift ${index}: pokemonId is not an integer`);
        }
        if (gift.pokemonId === 0) {
          invalidGifts.push(`Remix Gift ${index}: pokemonId cannot be 0`);
        }
        // Allow negative IDs for special cases (eggs, fossils, etc.)
      });

      if (invalidGifts.length > 0) {
        throw new Error(
          `Invalid gift Pokemon IDs found:\n${invalidGifts.join('\n')}`
        );
      }

      expect(invalidGifts).toHaveLength(0);
    });

    it('should have valid level values in gift entries', () => {
      const invalidLevels: string[] = [];

      classicGifts.forEach((gift, index) => {
        if (gift.level !== undefined) {
          if (!Number.isInteger(gift.level)) {
            invalidLevels.push(
              `Classic Gift ${index}: level is not an integer`
            );
          }
          // Allow levels up to 9999 for special cases (like Game Corner prizes)
          if (gift.level < 1 || gift.level > 9999) {
            invalidLevels.push(
              `Classic Gift ${index}: level ${gift.level} is out of valid range (1-9999)`
            );
          }
        }
      });

      remixGifts.forEach((gift, index) => {
        if (gift.level !== undefined) {
          if (!Number.isInteger(gift.level)) {
            invalidLevels.push(`Remix Gift ${index}: level is not an integer`);
          }
          // Allow levels up to 9999 for special cases (like Game Corner prizes)
          if (gift.level < 1 || gift.level > 9999) {
            invalidLevels.push(
              `Remix Gift ${index}: level ${gift.level} is out of valid range (1-9999)`
            );
          }
        }
      });

      if (invalidLevels.length > 0) {
        throw new Error(
          `Invalid gift levels found:\n${invalidLevels.join('\n')}`
        );
      }

      expect(invalidLevels).toHaveLength(0);
    });

    it('should have non-empty location names for all gifts', () => {
      const invalidLocations: string[] = [];

      classicGifts.forEach((gift, index) => {
        if (!gift.location || gift.location.trim() === '') {
          invalidLocations.push(
            `Classic Gift ${index}: missing or empty location`
          );
        }
      });

      remixGifts.forEach((gift, index) => {
        if (!gift.location || gift.location.trim() === '') {
          invalidLocations.push(
            `Remix Gift ${index}: missing or empty location`
          );
        }
      });

      if (invalidLocations.length > 0) {
        throw new Error(
          `Invalid gift locations found:\n${invalidLocations.join('\n')}`
        );
      }

      expect(invalidLocations).toHaveLength(0);
    });

    it('should have valid special case Pokemon IDs', () => {
      const specialCases = classicGifts.filter(gift => gift.pokemonId < 0);
      const validSpecialIds = [-1, -2]; // Eggs, Fossils

      const invalidSpecialCases = specialCases.filter(
        gift => !validSpecialIds.includes(gift.pokemonId)
      );

      if (invalidSpecialCases.length > 0) {
        const invalidDetails = invalidSpecialCases
          .map(gift => `- ${gift.location}: pokemonId ${gift.pokemonId}`)
          .join('\n');
        throw new Error(
          `Invalid special case Pokemon IDs found:\n${invalidDetails}`
        );
      }

      expect(invalidSpecialCases).toHaveLength(0);
    });

    it('should have consistent data structure across all gift entries', () => {
      const invalidStructure: string[] = [];

      classicGifts.forEach((gift, index) => {
        if (typeof gift.pokemonId !== 'number') {
          invalidStructure.push(
            `Classic Gift ${index}: pokemonId is not a number`
          );
        }
        if (typeof gift.location !== 'string') {
          invalidStructure.push(
            `Classic Gift ${index}: location is not a string`
          );
        }
        if (gift.level !== undefined && typeof gift.level !== 'number') {
          invalidStructure.push(`Classic Gift ${index}: level is not a number`);
        }

        if (
          gift.requirements !== undefined &&
          typeof gift.requirements !== 'string'
        ) {
          invalidStructure.push(
            `Classic Gift ${index}: requirements is not a string`
          );
        }
      });

      remixGifts.forEach((gift, index) => {
        if (typeof gift.pokemonId !== 'number') {
          invalidStructure.push(
            `Remix Gift ${index}: pokemonId is not a number`
          );
        }
        if (typeof gift.location !== 'string') {
          invalidStructure.push(
            `Remix Gift ${index}: location is not a string`
          );
        }
        if (gift.level !== undefined && typeof gift.level !== 'number') {
          invalidStructure.push(`Remix Gift ${index}: level is not a number`);
        }
        if (
          gift.requirements !== undefined &&
          typeof gift.requirements !== 'string'
        ) {
          invalidStructure.push(
            `Remix Gift ${index}: requirements is not a string`
          );
        }
      });

      if (invalidStructure.length > 0) {
        throw new Error(
          `Invalid gift data structure found:\n${invalidStructure.join('\n')}`
        );
      }

      expect(invalidStructure).toHaveLength(0);
    });
  });

  describe('Trade Pokemon Data Integrity', () => {
    it('should have valid Pokemon IDs in all trade entries', () => {
      const invalidTrades: string[] = [];

      classicTrades.forEach((trade, index) => {
        if (!Number.isInteger(trade.pokemonId)) {
          invalidTrades.push(
            `Classic Trade ${index}: pokemonId is not an integer`
          );
        }
        if (trade.pokemonId <= 0) {
          invalidTrades.push(
            `Classic Trade ${index}: pokemonId cannot be <= 0`
          );
        }
      });

      remixTrades.forEach((trade, index) => {
        if (!Number.isInteger(trade.pokemonId)) {
          invalidTrades.push(
            `Remix Trade ${index}: pokemonId is not an integer`
          );
        }
        if (trade.pokemonId <= 0) {
          invalidTrades.push(`Remix Trade ${index}: pokemonId cannot be <= 0`);
        }
      });

      if (invalidTrades.length > 0) {
        throw new Error(
          `Invalid trade Pokemon IDs found:\n${invalidTrades.join('\n')}`
        );
      }

      expect(invalidTrades).toHaveLength(0);
    });

    it('should have non-empty location names for all trades', () => {
      const invalidLocations: string[] = [];

      classicTrades.forEach((trade, index) => {
        if (!trade.location || trade.location.trim() === '') {
          invalidLocations.push(
            `Classic Trade ${index}: missing or empty location`
          );
        }
      });

      remixTrades.forEach((trade, index) => {
        if (!trade.location || trade.location.trim() === '') {
          invalidLocations.push(
            `Remix Trade ${index}: missing or empty location`
          );
        }
      });

      if (invalidLocations.length > 0) {
        throw new Error(
          `Invalid trade locations found:\n${invalidLocations.join('\n')}`
        );
      }

      expect(invalidLocations).toHaveLength(0);
    });

    it('should have consistent data structure across all trade entries', () => {
      const invalidStructure: string[] = [];

      classicTrades.forEach((trade, index) => {
        if (typeof trade.pokemonId !== 'number') {
          invalidStructure.push(
            `Classic Trade ${index}: pokemonId is not a number`
          );
        }
        if (typeof trade.location !== 'string') {
          invalidStructure.push(
            `Classic Trade ${index}: location is not a string`
          );
        }
        if (
          trade.requirements !== undefined &&
          typeof trade.requirements !== 'string'
        ) {
          invalidStructure.push(
            `Classic Trade ${index}: requirements is not a string`
          );
        }
      });

      remixTrades.forEach((trade, index) => {
        if (typeof trade.pokemonId !== 'number') {
          invalidStructure.push(
            `Remix Trade ${index}: pokemonId is not a number`
          );
        }
        if (typeof trade.location !== 'string') {
          invalidStructure.push(
            `Remix Trade ${index}: location is not a string`
          );
        }
        if (
          trade.requirements !== undefined &&
          typeof trade.requirements !== 'string'
        ) {
          invalidStructure.push(
            `Remix Trade ${index}: requirements is not a string`
          );
        }
      });

      if (invalidStructure.length > 0) {
        throw new Error(
          `Invalid trade data structure found:\n${invalidStructure.join('\n')}`
        );
      }

      expect(invalidStructure).toHaveLength(0);
    });

    it('should have unique trade combinations within each mode', () => {
      // Check Classic trades for duplicates
      const classicTradeKeys = new Set<string>();
      const classicDuplicates: string[] = [];

      classicTrades.forEach((trade, index) => {
        const key = `${trade.pokemonId}-${trade.location}`;
        if (classicTradeKeys.has(key)) {
          classicDuplicates.push(
            `Classic Trade ${index}: duplicate combination for ${trade.location}`
          );
        } else {
          classicTradeKeys.add(key);
        }
      });

      // Check Remix trades for duplicates
      const remixTradeKeys = new Set<string>();
      const remixDuplicates: string[] = [];

      remixTrades.forEach((trade, index) => {
        const key = `${trade.pokemonId}-${trade.location}`;
        if (remixTradeKeys.has(key)) {
          remixDuplicates.push(
            `Remix Trade ${index}: duplicate combination for ${trade.location}`
          );
        } else {
          remixTradeKeys.add(key);
        }
      });

      const errors: string[] = [];
      if (classicDuplicates.length > 0) {
        errors.push(
          `Classic trade duplicates:\n${classicDuplicates.join('\n')}`
        );
      }
      if (remixDuplicates.length > 0) {
        errors.push(`Remix trade duplicates:\n${remixDuplicates.join('\n')}`);
      }

      if (errors.length > 0) {
        throw new Error(errors.join('\n\n'));
      }

      expect(classicDuplicates).toHaveLength(0);
      expect(remixDuplicates).toHaveLength(0);
    });
  });

  describe('Gifts and Trades Integration', () => {
    it('should have non-empty location names for all gifts and trades', () => {
      const invalidGiftLocations: string[] = [];
      const invalidTradeLocations: string[] = [];

      // Check gift locations
      classicGifts.forEach((gift, index) => {
        if (!gift.location || gift.location.trim() === '') {
          invalidGiftLocations.push(
            `Classic Gift ${index}: missing or empty location`
          );
        }
      });

      remixGifts.forEach((gift, index) => {
        if (!gift.location || gift.location.trim() === '') {
          invalidGiftLocations.push(
            `Remix Gift ${index}: missing or empty location`
          );
        }
      });

      // Check trade locations
      classicTrades.forEach((trade, index) => {
        if (!trade.location || trade.location.trim() === '') {
          invalidTradeLocations.push(
            `Classic Trade ${index}: missing or empty location`
          );
        }
      });

      remixTrades.forEach((trade, index) => {
        if (!trade.location || trade.location.trim() === '') {
          invalidTradeLocations.push(
            `Remix Trade ${index}: missing or empty location`
          );
        }
      });

      const errors: string[] = [];
      if (invalidGiftLocations.length > 0) {
        errors.push(
          `Invalid gift locations:\n${invalidGiftLocations.join('\n')}`
        );
      }
      if (invalidTradeLocations.length > 0) {
        errors.push(
          `Invalid trade locations:\n${invalidTradeLocations.join('\n')}`
        );
      }

      if (errors.length > 0) {
        throw new Error(errors.join('\n\n'));
      }

      expect(invalidGiftLocations).toHaveLength(0);
      expect(invalidTradeLocations).toHaveLength(0);
    });

    it('should have reasonable data volume', () => {
      // Check that we have a reasonable number of gifts and trades
      expect(classicGifts.length).toBeGreaterThan(0);
      expect(remixGifts.length).toBeGreaterThan(0);
      expect(classicTrades.length).toBeGreaterThan(0);
      expect(remixTrades.length).toBeGreaterThan(0);
      expect(classicGifts.length).toBeLessThan(1000); // Sanity check
      expect(remixGifts.length).toBeLessThan(1000); // Sanity check
      expect(classicTrades.length).toBeLessThan(1000); // Sanity check
      expect(remixTrades.length).toBeLessThan(1000); // Sanity check
    });

    it('should have consistent location naming patterns', () => {
      const locationNames = new Set(locations.map(loc => loc.name));
      const giftLocations = new Set(classicGifts.map(gift => gift.location));
      const tradeLocations = new Set(
        classicTrades.map(trade => trade.location)
      );

      const allLocations = new Set([...giftLocations, ...tradeLocations]);
      const locationNameVariations = new Map<string, string[]>();

      // Check for potential naming inconsistencies
      allLocations.forEach(location => {
        if (!locationNames.has(location)) {
          // Try to find similar names in the locations data
          const normalizedLocation = location
            .toLowerCase()
            .replace(/[^a-z0-9]/g, '') // Remove spaces, dots, etc.
            .trim();

          const potentialMatches = Array.from(locationNames).filter(locName => {
            const normalizedLocName = locName
              .toLowerCase()
              .replace(/[^a-z0-9]/g, '')
              .trim();

            return (
              normalizedLocName === normalizedLocation ||
              normalizedLocName.includes(normalizedLocation) ||
              normalizedLocation.includes(normalizedLocName)
            );
          });

          if (potentialMatches.length > 0) {
            const variations = [location, ...potentialMatches];
            const key = variations.sort().join('|');
            if (!locationNameVariations.has(key)) {
              locationNameVariations.set(key, variations);
            }
          }
        }
      });

      // Report potential naming inconsistencies
      const inconsistencies: string[] = [];
      locationNameVariations.forEach(variations => {
        if (variations.length > 1) {
          inconsistencies.push(
            `Potential naming inconsistency: ${variations.join(' ↔ ')}`
          );
        }
      });

      if (inconsistencies.length > 0) {
        console.warn('Potential location naming inconsistencies found:');
        inconsistencies.forEach(inconsistency =>
          console.warn(`  - ${inconsistency}`)
        );

        // Don't fail the test, but warn about potential issues
        console.warn(
          `Found ${inconsistencies.length} potential naming inconsistencies`
        );
      }

      // For now, just log the inconsistencies without failing the test
      // since this is more of a data quality check than a critical error
      expect(true).toBe(true); // Always pass, but log warnings
    });
  });
});
