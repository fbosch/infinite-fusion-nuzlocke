import { describe, it, expect } from 'vitest';
import {
  getNationalDexIdFromInfiniteFusionId,
  getInfiniteFusionIdFromNationalDexId,
  getPokemonByNationalDexId,
  getPokemonById,
  getNationalDexToInfiniteFusionMap,
  getInfiniteFusionToNationalDexMap
} from '@/loaders/pokemon';

describe('Pokemon ID Conversion Helpers', () => {
  describe('getNationalDexIdFromInfiniteFusionId', () => {
    it('should convert Infinite Fusion ID to National Pokédex number', () => {
      // Test with Bulbasaur (Infinite Fusion ID: 1, National Dex: 1)
      const nationalDexId = getNationalDexIdFromInfiniteFusionId(1);
      expect(nationalDexId).toBe(1);
    });

    it('should return null for invalid Infinite Fusion ID', () => {
      const nationalDexId = getNationalDexIdFromInfiniteFusionId(999999);
      expect(nationalDexId).toBeNull();
    });

    it('should handle multiple known Pokémon', () => {
      // Test a few known conversions
      expect(getNationalDexIdFromInfiniteFusionId(1)).toBe(1); // Bulbasaur
      expect(getNationalDexIdFromInfiniteFusionId(4)).toBe(4); // Charmander
      expect(getNationalDexIdFromInfiniteFusionId(25)).toBe(25); // Pikachu
    });
  });

  describe('getInfiniteFusionIdFromNationalDexId', () => {
    it('should convert National Pokédex number to Infinite Fusion ID', () => {
      // Test with Bulbasaur (National Dex: 1, Infinite Fusion ID: 1)
      const infiniteFusionId = getInfiniteFusionIdFromNationalDexId(1);
      expect(infiniteFusionId).toBe(1);
    });

    it('should return null for invalid National Pokédex number', () => {
      const infiniteFusionId = getInfiniteFusionIdFromNationalDexId(999999);
      expect(infiniteFusionId).toBeNull();
    });

    it('should handle multiple known Pokémon', () => {
      // Test a few known conversions
      expect(getInfiniteFusionIdFromNationalDexId(1)).toBe(1); // Bulbasaur
      expect(getInfiniteFusionIdFromNationalDexId(4)).toBe(4); // Charmander
      expect(getInfiniteFusionIdFromNationalDexId(25)).toBe(25); // Pikachu
    });
  });

  describe('getPokemonByNationalDexId', () => {
    it('should return Pokémon by National Pokédex number', () => {
      const pokemon = getPokemonByNationalDexId(1);
      expect(pokemon).toBeDefined();
      expect(pokemon?.name).toBe('Bulbasaur');
      expect(pokemon?.nationalDexId).toBe(1);
      expect(pokemon?.id).toBe(1);
    });

    it('should return null for invalid National Pokédex number', () => {
      const pokemon = getPokemonByNationalDexId(999999);
      expect(pokemon).toBeNull();
    });
  });

  describe('ID Conversion Consistency', () => {
    it('should maintain consistency between conversion functions', () => {
      // Test that converting back and forth gives the same result
      const originalId = 1; // Bulbasaur
      const nationalDexId = getNationalDexIdFromInfiniteFusionId(originalId);
      const convertedBackId = getInfiniteFusionIdFromNationalDexId(nationalDexId!);

      expect(convertedBackId).toBe(originalId);
    });

    it('should work with multiple Pokémon', () => {
      const testIds = [1, 4, 25, 133]; // Bulbasaur, Charmander, Pikachu, Eevee

      testIds.forEach(id => {
        const nationalDexId = getNationalDexIdFromInfiniteFusionId(id);
        const convertedBackId = getInfiniteFusionIdFromNationalDexId(nationalDexId!);

        expect(convertedBackId).toBe(id);
      });
    });
  });

  describe('Map Functions', () => {
    it('should create correct National Dex to Infinite Fusion map', () => {
      const map = getNationalDexToInfiniteFusionMap();

      // Test a few known mappings
      expect(map.get(1)).toBe(1); // Bulbasaur
      expect(map.get(4)).toBe(4); // Charmander
      expect(map.get(25)).toBe(25); // Pikachu

      // Test that map has reasonable size (should have all Pokémon)
      expect(map.size).toBeGreaterThan(0);
    });

    it('should create correct Infinite Fusion to National Dex map', () => {
      const map = getInfiniteFusionToNationalDexMap();

      // Test a few known mappings
      expect(map.get(1)).toBe(1); // Bulbasaur
      expect(map.get(4)).toBe(4); // Charmander
      expect(map.get(25)).toBe(25); // Pikachu

      // Test that map has reasonable size (should have all Pokémon)
      expect(map.size).toBeGreaterThan(0);
    });

    it('should have consistent mappings between both maps', () => {
      const nationalToInfinite = getNationalDexToInfiniteFusionMap();
      const infiniteToNational = getInfiniteFusionToNationalDexMap();

      // Test that mappings are consistent (some National Dex IDs may have multiple Infinite Fusion IDs)
      for (const [nationalId, infiniteId] of nationalToInfinite) {
        expect(infiniteToNational.get(infiniteId)).toBe(nationalId);
      }
    });
  });
}); 