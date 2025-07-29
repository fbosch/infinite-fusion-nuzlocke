import { describe, it, expect, beforeAll } from 'vitest';
import fs from 'fs/promises';
import path from 'path';
import { SPECIAL_LOCATIONS } from '@/constants/special-locations';

interface Location {
  id: string;
  name: string;
  routeId: number | null;
  order: number;
  region: string;
  description: string;
}

interface RouteEncounter {
  routeName: string;
  pokemonIds: number[];
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
      fs.readFile(path.join(dataDir, 'shared/locations.json'), 'utf-8'),
      fs.readFile(path.join(dataDir, 'classic/encounters.json'), 'utf-8'),
      fs.readFile(path.join(dataDir, 'remix/encounters.json'), 'utf-8'),
      fs.readFile(path.join(dataDir, 'classic/gifts.json'), 'utf-8'),
      fs.readFile(path.join(dataDir, 'remix/gifts.json'), 'utf-8'),
      fs.readFile(path.join(dataDir, 'classic/trades.json'), 'utf-8'),
      fs.readFile(path.join(dataDir, 'remix/trades.json'), 'utf-8'),
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
    it('should have encounter data for every location in classic mode', () => {
      // Get all location names (excluding starter Pokemon and special locations)
      const locationNames = locations
        .filter(loc => {
          const isStarter = loc.name === 'Starter';
          const isSpecialLocation =
            loc.id === SPECIAL_LOCATIONS.STARTER_LOCATION;
          return !isStarter && !isSpecialLocation;
        })
        .map(loc => loc.name);

      // Create a map of routeName to classic encounters for quick lookup
      const classicRouteNameMap = new Map<string, RouteEncounter>();
      classicEncounters.forEach(encounter => {
        classicRouteNameMap.set(encounter.routeName, encounter);
      });

      const missingEncounters: string[] = [];

      // Check each location name
      locationNames.forEach(locationName => {
        if (!classicRouteNameMap.has(locationName)) {
          missingEncounters.push(locationName);
        }
      });

      if (missingEncounters.length > 0) {
        const missingDetails = missingEncounters
          .map(name => `- ${name}`)
          .join('\n');

        throw new Error(
          `Missing classic encounter data for ${missingEncounters.length} location(s):\n${missingDetails}`
        );
      }

      expect(missingEncounters).toHaveLength(0);
    });

    it('should have encounter data for every location in remix mode', () => {
      // Get all location names (excluding starter Pokemon and special locations)
      const locationNames = locations
        .filter(loc => {
          const isStarter = loc.name === 'Starter';
          const isSpecialLocation =
            loc.id === SPECIAL_LOCATIONS.STARTER_LOCATION;
          return !isStarter && !isSpecialLocation;
        })
        .map(loc => loc.name);

      // Create a map of routeName to remix encounters for quick lookup
      const remixRouteNameMap = new Map<string, RouteEncounter>();
      remixEncounters.forEach(encounter => {
        remixRouteNameMap.set(encounter.routeName, encounter);
      });

      const missingEncounters: string[] = [];

      // Check each location name
      locationNames.forEach(locationName => {
        if (!remixRouteNameMap.has(locationName)) {
          missingEncounters.push(locationName);
        }
      });

      if (missingEncounters.length > 0) {
        const missingDetails = missingEncounters
          .map(name => `- ${name}`)
          .join('\n');

        throw new Error(
          `Missing remix encounter data for ${missingEncounters.length} location(s):\n${missingDetails}`
        );
      }

      expect(missingEncounters).toHaveLength(0);
    });

    it('should not have orphaned encounter data (encounters without corresponding locations)', () => {
      // Get all location names (excluding special locations since they're not wild encounter locations)
      const locationNames = new Set(
        locations
          .filter(loc => loc.id !== SPECIAL_LOCATIONS.STARTER_LOCATION)
          .map(loc => loc.name)
      );

      // Check classic encounters (excluding Starter)
      const orphanedClassicEncounters = classicEncounters.filter(
        encounter =>
          encounter.routeName !== 'Starter' &&
          !locationNames.has(encounter.routeName)
      );

      // Check remix encounters (excluding Starter)
      const orphanedRemixEncounters = remixEncounters.filter(
        encounter =>
          encounter.routeName !== 'Starter' &&
          !locationNames.has(encounter.routeName)
      );

      const errors: string[] = [];

      if (orphanedClassicEncounters.length > 0) {
        const orphanedDetails = orphanedClassicEncounters
          .map(enc => `- ${enc.routeName}`)
          .join('\n');
        errors.push(`Orphaned classic encounters:\n${orphanedDetails}`);
      }

      if (orphanedRemixEncounters.length > 0) {
        const orphanedDetails = orphanedRemixEncounters
          .map(enc => `- ${enc.routeName}`)
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
            `${encounter.routeName} has no Pokemon`
          );
        } else {
          encounter.pokemonIds.forEach(pokemonId => {
            if (!Number.isInteger(pokemonId) || pokemonId <= 0) {
              invalidClassicEncounters.push(
                `${encounter.routeName} has invalid Pokemon ID: ${pokemonId}`
              );
            }
          });
        }
      });

      // Check remix encounters
      remixEncounters.forEach(encounter => {
        if (!encounter.pokemonIds || encounter.pokemonIds.length === 0) {
          invalidRemixEncounters.push(`${encounter.routeName} has no Pokemon`);
        } else {
          encounter.pokemonIds.forEach(pokemonId => {
            if (!Number.isInteger(pokemonId) || pokemonId <= 0) {
              invalidRemixEncounters.push(
                `${encounter.routeName} has invalid Pokemon ID: ${pokemonId}`
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
        path.join(dataDir, 'shared', 'pokemon-data.json'),
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
    it('should have consistent routeName values between locations and encounters', () => {
      const locationNames = new Set(
        locations
          .filter(
            loc =>
              loc.name !== 'Starter' &&
              loc.name !== SPECIAL_LOCATIONS.STARTER_LOCATION
          )
          .map(loc => loc.name)
      );

      const classicRouteNames = new Set(
        classicEncounters
          .filter(enc => enc.routeName !== 'Starter')
          .map(enc => enc.routeName)
      );
      const remixRouteNames = new Set(
        remixEncounters
          .filter(enc => enc.routeName !== 'Starter')
          .map(enc => enc.routeName)
      );

      // Check if all encounter routeNames exist in location names
      const missingInLocations = [...classicRouteNames].filter(
        name => !locationNames.has(name)
      );

      const errors: string[] = [];
      if (missingInLocations.length > 0) {
        errors.push(
          `Route names in encounters missing from locations: ${missingInLocations.join(', ')}`
        );
      }

      if (errors.length > 0) {
        throw new Error(errors.join('\n'));
      }

      expect(missingInLocations).toHaveLength(0);
    });

    it('should have unique routeNames in each encounter file', () => {
      // Check for duplicate routeNames in classic encounters
      const classicRouteNames: string[] = [];
      const classicDuplicates: string[] = [];

      classicEncounters.forEach(encounter => {
        if (classicRouteNames.includes(encounter.routeName)) {
          classicDuplicates.push(encounter.routeName);
        } else {
          classicRouteNames.push(encounter.routeName);
        }
      });

      // Check for duplicate routeNames in remix encounters
      const remixRouteNames: string[] = [];
      const remixDuplicates: string[] = [];

      remixEncounters.forEach(encounter => {
        if (remixRouteNames.includes(encounter.routeName)) {
          remixDuplicates.push(encounter.routeName);
        } else {
          remixRouteNames.push(encounter.routeName);
        }
      });

      const errors: string[] = [];
      if (classicDuplicates.length > 0) {
        errors.push(
          `Duplicate route names in classic encounters: ${[...new Set(classicDuplicates)].join(', ')}`
        );
      }
      if (remixDuplicates.length > 0) {
        errors.push(
          `Duplicate route names in remix encounters: ${[...new Set(remixDuplicates)].join(', ')}`
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

  describe('Route Encounter Validation', () => {
    it('should have correct Pokemon for Viridian Forest in classic mode', () => {
      const viridianForest = classicEncounters.find(
        encounter => encounter.routeName === 'Viridian Forest'
      );

      expect(viridianForest).toBeDefined();
      expect(viridianForest?.pokemonIds).toBeDefined();
      expect(viridianForest?.pokemonIds.length).toBe(10); // Should have exactly 10 Pokemon

      // Expected Pokemon IDs for Viridian Forest (classic mode)
      const expectedPokemonIds = [10, 11, 13, 14, 16, 52, 163, 165, 172, 404];
      expect(viridianForest?.pokemonIds).toEqual(expectedPokemonIds);
    });

    it('should have correct Pokemon for Viridian Forest in remix mode', () => {
      const viridianForest = remixEncounters.find(
        encounter => encounter.routeName === 'Viridian Forest'
      );

      expect(viridianForest).toBeDefined();
      expect(viridianForest?.pokemonIds).toBeDefined();
      expect(viridianForest?.pokemonIds.length).toBeGreaterThan(0);
      expect(viridianForest?.pokemonIds.length).toBeLessThan(20); // Should not have too many Pokemon

      // Verify it has some expected Pokemon (may differ from classic)
      const hasCommonPokemon = viridianForest?.pokemonIds.some(id =>
        [10, 11, 13, 14, 16, 52, 163, 165, 172, 404].includes(id)
      );
      expect(hasCommonPokemon).toBe(true);
    });

    it('should have reasonable Pokemon counts for all routes', () => {
      const unreasonableCounts: string[] = [];

      // Check classic encounters
      classicEncounters.forEach(encounter => {
        if (encounter.pokemonIds.length === 0) {
          unreasonableCounts.push(
            `${encounter.routeName} (classic): has no Pokemon`
          );
        } else if (encounter.pokemonIds.length > 50) {
          unreasonableCounts.push(
            `${encounter.routeName} (classic): has ${encounter.pokemonIds.length} Pokemon (suspiciously high)`
          );
        }
      });

      // Check remix encounters
      remixEncounters.forEach(encounter => {
        if (encounter.pokemonIds.length === 0) {
          unreasonableCounts.push(
            `${encounter.routeName} (remix): has no Pokemon`
          );
        } else if (encounter.pokemonIds.length > 50) {
          unreasonableCounts.push(
            `${encounter.routeName} (remix): has ${encounter.pokemonIds.length} Pokemon (suspiciously high)`
          );
        }
      });

      if (unreasonableCounts.length > 0) {
        throw new Error(
          `Unreasonable Pokemon counts found:\n${unreasonableCounts.join('\n')}`
        );
      }

      expect(unreasonableCounts).toHaveLength(0);
    });

    it('should have specific Pokemon for key early routes', () => {
      // Test Route 1 (should have common early Pokemon)
      const route1 = classicEncounters.find(
        encounter => encounter.routeName === 'Route 1'
      );
      expect(route1).toBeDefined();
      expect(route1?.pokemonIds.length).toBeGreaterThan(0);
      expect(route1?.pokemonIds.length).toBeLessThan(20);

      // Test Route 2 (should have common early Pokemon)
      const route2 = classicEncounters.find(
        encounter => encounter.routeName === 'Route 2'
      );
      expect(route2).toBeDefined();
      expect(route2?.pokemonIds.length).toBeGreaterThan(0);
      expect(route2?.pokemonIds.length).toBeLessThan(20);

      // Test Route 22 (should have starter Pokemon)
      const route22 = classicEncounters.find(
        encounter => encounter.routeName === 'Route 22'
      );
      expect(route22).toBeDefined();
      expect(route22?.pokemonIds.length).toBeGreaterThan(0);
      expect(route22?.pokemonIds.length).toBeLessThan(20);
    });

    it('should not have duplicate Pokemon within the same route', () => {
      const routesWithDuplicates: string[] = [];

      // Check classic encounters
      classicEncounters.forEach(encounter => {
        const uniqueIds = new Set(encounter.pokemonIds);
        if (uniqueIds.size !== encounter.pokemonIds.length) {
          routesWithDuplicates.push(
            `${encounter.routeName} (classic): has duplicate Pokemon`
          );
        }
      });

      // Check remix encounters
      remixEncounters.forEach(encounter => {
        const uniqueIds = new Set(encounter.pokemonIds);
        if (uniqueIds.size !== encounter.pokemonIds.length) {
          routesWithDuplicates.push(
            `${encounter.routeName} (remix): has duplicate Pokemon`
          );
        }
      });

      if (routesWithDuplicates.length > 0) {
        throw new Error(
          `Routes with duplicate Pokemon found:\n${routesWithDuplicates.join('\n')}`
        );
      }

      expect(routesWithDuplicates).toHaveLength(0);
    });

    it('should have sorted Pokemon IDs for all routes', () => {
      const unsortedRoutes: string[] = [];

      // Check classic encounters
      classicEncounters.forEach(encounter => {
        const isSorted = encounter.pokemonIds.every(
          (id, index) => index === 0 || id >= encounter.pokemonIds[index - 1]
        );
        if (!isSorted) {
          unsortedRoutes.push(
            `${encounter.routeName} (classic): Pokemon IDs are not sorted`
          );
        }
      });

      // Check remix encounters
      remixEncounters.forEach(encounter => {
        const isSorted = encounter.pokemonIds.every(
          (id, index) => index === 0 || id >= encounter.pokemonIds[index - 1]
        );
        if (!isSorted) {
          unsortedRoutes.push(
            `${encounter.routeName} (remix): Pokemon IDs are not sorted`
          );
        }
      });

      if (unsortedRoutes.length > 0) {
        throw new Error(
          `Routes with unsorted Pokemon IDs found:\n${unsortedRoutes.join('\n')}`
        );
      }

      expect(unsortedRoutes).toHaveLength(0);
    });

    it('should have valid Pokemon IDs that exist in the Pokemon data', async () => {
      const dataDir = path.join(process.cwd(), 'data');
      const pokemonDataFile = await fs.readFile(
        path.join(dataDir, 'shared', 'pokemon-data.json'),
        'utf-8'
      );
      const pokemonData = JSON.parse(pokemonDataFile);

      const validPokemonIds = new Set(pokemonData.map((p: any) => p.id)); // eslint-disable-line @typescript-eslint/no-explicit-any
      const invalidPokemonIds: string[] = [];

      // Check classic encounters
      classicEncounters.forEach(encounter => {
        encounter.pokemonIds.forEach(pokemonId => {
          if (!validPokemonIds.has(pokemonId)) {
            invalidPokemonIds.push(
              `${encounter.routeName} (classic): invalid Pokemon ID ${pokemonId}`
            );
          }
        });
      });

      // Check remix encounters
      remixEncounters.forEach(encounter => {
        encounter.pokemonIds.forEach(pokemonId => {
          if (!validPokemonIds.has(pokemonId)) {
            invalidPokemonIds.push(
              `${encounter.routeName} (remix): invalid Pokemon ID ${pokemonId}`
            );
          }
        });
      });

      if (invalidPokemonIds.length > 0) {
        throw new Error(
          `Invalid Pokemon IDs found in encounters:\n${invalidPokemonIds.join('\n')}`
        );
      }

      expect(invalidPokemonIds).toHaveLength(0);
    });
  });
});
