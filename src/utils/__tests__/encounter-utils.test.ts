import { describe, it, expect } from 'vitest';
import {
  getAllPokemonWithLocations,
  findPokemonByUid,
  findPokemonWithLocation,
} from '../encounter-utils';
import type { PokemonOptionType } from '@/loaders/pokemon';
import type { EncounterData } from '@/stores/playthroughs/types';

describe('encounter-utils', () => {
  const mockPikachu: PokemonOptionType = {
    id: 25,
    name: 'Pikachu',
    nationalDexId: 25,
    status: 'captured',
    uid: 'pikachu_route1_123',
  };

  const mockCharmander: PokemonOptionType = {
    id: 4,
    name: 'Charmander',
    nationalDexId: 4,
    status: 'captured',
    uid: 'charmander_route1_456',
  };

  const mockBulbasaur: PokemonOptionType = {
    id: 1,
    name: 'Bulbasaur',
    nationalDexId: 1,
    status: 'captured',
    uid: 'bulbasaur_route2_789',
  };

  describe('getAllPokemonWithLocations', () => {
    it('should return empty array for null encounters', () => {
      const result = getAllPokemonWithLocations(null);
      expect(result).toEqual([]);
    });

    it('should return empty array for undefined encounters', () => {
      const result = getAllPokemonWithLocations(undefined);
      expect(result).toEqual([]);
    });

    it('should return empty array for empty encounters', () => {
      const result = getAllPokemonWithLocations({});
      expect(result).toEqual([]);
    });

    it('should include head Pokémon from single Pokémon encounters', () => {
      const encounters: Record<string, EncounterData> = {
        route1: {
          head: mockPikachu,
          body: null,
          isFusion: false,
          updatedAt: Date.now(),
        },
      };

      const result = getAllPokemonWithLocations(encounters);
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        pokemon: mockPikachu,
        locationId: 'route1',
      });
    });

    it('should include both Pokémon from fusion encounters', () => {
      const encounters: Record<string, EncounterData> = {
        route1: {
          head: mockPikachu,
          body: mockCharmander,
          isFusion: true,
          updatedAt: Date.now(),
        },
      };

      const result = getAllPokemonWithLocations(encounters);
      expect(result).toHaveLength(2);
      expect(result).toContainEqual({
        pokemon: mockPikachu,
        locationId: 'route1',
      });
      expect(result).toContainEqual({
        pokemon: mockCharmander,
        locationId: 'route1',
      });
    });

    it('should exclude body Pokémon when isFusion is false', () => {
      const encounters: Record<string, EncounterData> = {
        route1: {
          head: mockPikachu,
          body: mockCharmander, // This should be excluded
          isFusion: false, // Fusion toggled off
          updatedAt: Date.now(),
        },
      };

      const result = getAllPokemonWithLocations(encounters);
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        pokemon: mockPikachu,
        locationId: 'route1',
      });
      // Body Pokémon should not be included
      expect(result.some(item => item.pokemon.uid === mockCharmander.uid)).toBe(
        false
      );
    });

    it('should handle multiple encounters correctly', () => {
      const encounters: Record<string, EncounterData> = {
        route1: {
          head: mockPikachu,
          body: mockCharmander,
          isFusion: true, // Fusion enabled
          updatedAt: Date.now(),
        },
        route2: {
          head: mockBulbasaur,
          body: null,
          isFusion: false, // Single Pokémon
          updatedAt: Date.now(),
        },
      };

      const result = getAllPokemonWithLocations(encounters);
      expect(result).toHaveLength(3); // Pikachu, Charmander, Bulbasaur
      expect(result).toContainEqual({
        pokemon: mockPikachu,
        locationId: 'route1',
      });
      expect(result).toContainEqual({
        pokemon: mockCharmander,
        locationId: 'route1',
      });
      expect(result).toContainEqual({
        pokemon: mockBulbasaur,
        locationId: 'route2',
      });
    });

    it('should handle encounters with null head and body', () => {
      const encounters: Record<string, EncounterData> = {
        route1: {
          head: null,
          body: null,
          isFusion: false,
          updatedAt: Date.now(),
        },
      };

      const result = getAllPokemonWithLocations(encounters);
      expect(result).toHaveLength(0);
    });
  });

  describe('findPokemonByUid', () => {
    it('should find Pokémon in head slot', () => {
      const encounters: Record<string, EncounterData> = {
        route1: {
          head: mockPikachu,
          body: null,
          isFusion: false,
          updatedAt: Date.now(),
        },
      };

      const result = findPokemonByUid(encounters, 'pikachu_route1_123');
      expect(result).toEqual(mockPikachu);
    });

    it('should find Pokémon in body slot', () => {
      const encounters: Record<string, EncounterData> = {
        route1: {
          head: mockPikachu,
          body: mockCharmander,
          isFusion: true,
          updatedAt: Date.now(),
        },
      };

      const result = findPokemonByUid(encounters, 'charmander_route1_456');
      expect(result).toEqual(mockCharmander);
    });

    it('should return null for non-existent UID', () => {
      const encounters: Record<string, EncounterData> = {
        route1: {
          head: mockPikachu,
          body: null,
          isFusion: false,
          updatedAt: Date.now(),
        },
      };

      const result = findPokemonByUid(encounters, 'non-existent-uid');
      expect(result).toBeNull();
    });
  });

  describe('findPokemonWithLocation', () => {
    it('should find Pokémon with location info', () => {
      const encounters: Record<string, EncounterData> = {
        route1: {
          head: mockPikachu,
          body: null,
          isFusion: false,
          updatedAt: Date.now(),
        },
      };

      const result = findPokemonWithLocation(encounters, 'pikachu_route1_123');
      expect(result).toEqual({
        pokemon: mockPikachu,
        locationId: 'route1',
      });
    });

    it('should return null for non-existent UID', () => {
      const encounters: Record<string, EncounterData> = {
        route1: {
          head: mockPikachu,
          body: null,
          isFusion: false,
          updatedAt: Date.now(),
        },
      };

      const result = findPokemonWithLocation(encounters, 'non-existent-uid');
      expect(result).toBeNull();
    });
  });
});
