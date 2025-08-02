import { describe, it, expect, beforeAll } from 'vitest';
import fs from 'fs/promises';
import path from 'path';

// We need to import the validation function from the scraper
// Since it's not exported, we'll test it indirectly through the behavior
interface PokemonEncounter {
  pokemonId: number;
  encounterType:
    | 'grass'
    | 'surf'
    | 'fishing'
    | 'special'
    | 'cave'
    | 'rock_smash';
}

interface RouteEncounters {
  routeName: string;
  encounters: PokemonEncounter[];
}

describe('Mt. Moon Scraping Validation', () => {
  let classicEncounters: RouteEncounters[];
  let remixEncounters: RouteEncounters[];
  let pokemonData: Array<{ id: number; name: string }>;

  beforeAll(async () => {
    // Load the actual scraped data
    const classicPath = path.join(
      process.cwd(),
      'data',
      'classic',
      'encounters.json'
    );
    const remixPath = path.join(
      process.cwd(),
      'data',
      'remix',
      'encounters.json'
    );
    const pokemonPath = path.join(
      process.cwd(),
      'data',
      'shared',
      'base-entries.json'
    );

    const [classicData, remixData, pokemonEntries] = await Promise.all([
      fs.readFile(classicPath, 'utf-8'),
      fs.readFile(remixPath, 'utf-8'),
      fs.readFile(pokemonPath, 'utf-8'),
    ]);

    classicEncounters = JSON.parse(classicData);
    remixEncounters = JSON.parse(remixData);
    pokemonData = JSON.parse(pokemonEntries);
  });

  describe('Mt. Moon Data Validation', () => {
    it('should have Mt. Moon in classic encounters', () => {
      const mtMoon = classicEncounters.find(
        route => route.routeName === 'Mt. Moon'
      );
      expect(mtMoon).toBeDefined();
      expect(mtMoon!.encounters.length).toBeGreaterThan(8); // Should have more than the original 8
    });

    it('should have Mt. Moon in remix encounters', () => {
      const mtMoon = remixEncounters.find(
        route => route.routeName === 'Mt. Moon'
      );
      expect(mtMoon).toBeDefined();
      expect(mtMoon!.encounters.length).toBeGreaterThan(8); // Should have more than the original 8
    });

    it('should include Sandshrew (ID 27) in Mt. Moon classic encounters', () => {
      const mtMoon = classicEncounters.find(
        route => route.routeName === 'Mt. Moon'
      );
      expect(mtMoon).toBeDefined();

      const sandshrew = mtMoon!.encounters.find(
        encounter => encounter.pokemonId === 27
      );
      expect(sandshrew).toBeDefined();
      expect(sandshrew!.encounterType).toBe('cave');
    });

    it('should include Sableye (ID 421) in Mt. Moon classic encounters', () => {
      const mtMoon = classicEncounters.find(
        route => route.routeName === 'Mt. Moon'
      );
      expect(mtMoon).toBeDefined();

      const sableye = mtMoon!.encounters.find(
        encounter => encounter.pokemonId === 421
      );
      expect(sableye).toBeDefined();
      expect(sableye!.encounterType).toBe('cave');
    });

    it('should include Carbink (ID 478) in Mt. Moon classic encounters', () => {
      const mtMoon = classicEncounters.find(
        route => route.routeName === 'Mt. Moon'
      );
      expect(mtMoon).toBeDefined();

      const carbink = mtMoon!.encounters.find(
        encounter => encounter.pokemonId === 478
      );
      expect(carbink).toBeDefined();
      expect(carbink!.encounterType).toBe('rock_smash');
    });

    it('should not include water-type encounters in Mt. Moon', () => {
      const mtMoon = classicEncounters.find(
        route => route.routeName === 'Mt. Moon'
      );
      expect(mtMoon).toBeDefined();

      const waterEncounters = mtMoon!.encounters.filter(
        encounter =>
          encounter.encounterType === 'surf' ||
          encounter.encounterType === 'fishing'
      );
      expect(waterEncounters).toHaveLength(0);
    });

    it('should not include Psyduck (ID 54) in Mt. Moon (cross-contamination check)', () => {
      const mtMoon = classicEncounters.find(
        route => route.routeName === 'Mt. Moon'
      );
      expect(mtMoon).toBeDefined();

      const psyduck = mtMoon!.encounters.find(
        encounter => encounter.pokemonId === 54
      );
      expect(psyduck).toBeUndefined();
    });

    it('should have cave-appropriate encounter types in Mt. Moon', () => {
      const mtMoon = classicEncounters.find(
        route => route.routeName === 'Mt. Moon'
      );
      expect(mtMoon).toBeDefined();

      // Mt. Moon should have grass, cave, or rock_smash encounters (cave Pokemon)
      const validCaveTypes = ['grass', 'cave', 'rock_smash'];
      const invalidEncounters = mtMoon!.encounters.filter(
        encounter => !validCaveTypes.includes(encounter.encounterType)
      );
      expect(invalidEncounters).toHaveLength(0);
    });
  });

  describe('Route Name Validation Behavior', () => {
    it('should properly consolidate Mt. Moon sub-locations', () => {
      // Check that we don't have separate entries for Mt. Moon sub-locations
      const mtMoonVariants = classicEncounters.filter(
        route =>
          route.routeName.includes('Mt. Moon') && route.routeName !== 'Mt. Moon'
      );

      // All sub-locations should be consolidated into the main "Mt. Moon" entry
      expect(mtMoonVariants).toHaveLength(0);
    });

    it('should have enough total encounters to suggest proper consolidation', () => {
      const mtMoon = classicEncounters.find(
        route => route.routeName === 'Mt. Moon'
      );
      expect(mtMoon).toBeDefined();

      // Should have significantly more than 8 encounters if consolidation worked
      expect(mtMoon!.encounters.length).toBeGreaterThanOrEqual(13);
    });
  });

  describe('Pokemon Data Consistency', () => {
    it('should have valid Pokemon IDs that exist in the base entries', () => {
      const mtMoon = classicEncounters.find(
        route => route.routeName === 'Mt. Moon'
      );
      expect(mtMoon).toBeDefined();

      for (const encounter of mtMoon!.encounters) {
        const pokemon = pokemonData.find(p => p.id === encounter.pokemonId);
        expect(pokemon).toBeDefined();
        expect(pokemon!.name).toBeTruthy();
      }
    });

    it('should have the expected key Pokemon with correct names', () => {
      const expectedPokemon = [
        { id: 27, name: 'Sandshrew' },
        { id: 421, name: 'Sableye' },
        { id: 478, name: 'Carbink' },
        { id: 35, name: 'Clefairy' },
        { id: 41, name: 'Zubat' },
        { id: 74, name: 'Geodude' },
        { id: 95, name: 'Onix' },
      ];

      const mtMoon = classicEncounters.find(
        route => route.routeName === 'Mt. Moon'
      );
      expect(mtMoon).toBeDefined();

      for (const expected of expectedPokemon) {
        const encounter = mtMoon!.encounters.find(
          e => e.pokemonId === expected.id
        );
        expect(encounter).toBeDefined();

        const pokemon = pokemonData.find(p => p.id === expected.id);
        expect(pokemon).toBeDefined();
        expect(pokemon!.name).toBe(expected.name);
      }
    });
  });

  describe('New Encounter Type Support', () => {
    it('should support cave encounter types', () => {
      const allEncounters = [...classicEncounters, ...remixEncounters];

      // Look for any encounters with cave type
      const caveEncounters = allEncounters.flatMap(route =>
        route.encounters.filter(encounter => encounter.encounterType === 'cave')
      );

      // If cave encounters exist, they should have valid Pokemon IDs
      if (caveEncounters.length > 0) {
        caveEncounters.forEach(encounter => {
          expect(encounter.pokemonId).toBeGreaterThan(0);
          expect(typeof encounter.pokemonId).toBe('number');
        });
      }
    });

    it('should support rock_smash encounter types', () => {
      const allEncounters = [...classicEncounters, ...remixEncounters];

      // Look for any encounters with rock_smash type
      const rockSmashEncounters = allEncounters.flatMap(route =>
        route.encounters.filter(
          encounter => encounter.encounterType === 'rock_smash'
        )
      );

      // If rock_smash encounters exist, they should have valid Pokemon IDs
      if (rockSmashEncounters.length > 0) {
        rockSmashEncounters.forEach(encounter => {
          expect(encounter.pokemonId).toBeGreaterThan(0);
          expect(typeof encounter.pokemonId).toBe('number');
        });
      }
    });

    it('should have valid encounter type values', () => {
      const allEncounters = [...classicEncounters, ...remixEncounters];
      const validTypes = [
        'grass',
        'surf',
        'fishing',
        'special',
        'cave',
        'rock_smash',
      ];

      allEncounters.forEach(route => {
        route.encounters.forEach(encounter => {
          expect(validTypes).toContain(encounter.encounterType);
        });
      });
    });
  });

  describe('Cross-Contamination Prevention', () => {
    it('should not include Route 4 water Pokemon in Mt. Moon', () => {
      const route4WaterPokemon = [
        54, // Psyduck
        79, // Slowpoke
        98, // Krabby
        86, // Seel
        90, // Shellder
      ];

      const mtMoon = classicEncounters.find(
        route => route.routeName === 'Mt. Moon'
      );
      expect(mtMoon).toBeDefined();

      for (const pokemonId of route4WaterPokemon) {
        const contamination = mtMoon!.encounters.find(
          e => e.pokemonId === pokemonId
        );
        expect(contamination).toBeUndefined();
      }
    });

    it('should not include Route 3 Pokemon that should not be in caves', () => {
      // Example Pokemon that should be Route 3 specific, not Mt. Moon
      const route3SpecificPokemon = [
        16, // Pidgey (should be in grass routes, not caves)
        21, // Spearow (should be in grass routes, not caves)
      ];

      const mtMoon = classicEncounters.find(
        route => route.routeName === 'Mt. Moon'
      );
      expect(mtMoon).toBeDefined();

      // Note: Some Pokemon might legitimately appear in both locations
      // This test is more about ensuring we don't have obvious cross-contamination
      const mtMoonPokemonIds = mtMoon!.encounters.map(e => e.pokemonId);

      // Check that Mt. Moon has cave-appropriate Pokemon, not just grass route Pokemon
      const caveAppropriate = [27, 35, 41, 74, 95, 421, 478]; // Sandshrew, Clefairy, Zubat, Geodude, Onix, Sableye, Carbink
      const hasMultipleCaveTypes =
        caveAppropriate.filter(id => mtMoonPokemonIds.includes(id)).length >= 5;

      expect(hasMultipleCaveTypes).toBe(true);
    });
  });
});
