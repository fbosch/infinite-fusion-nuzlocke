import { describe, it, expect } from 'vitest';
import {
  createFusionTypeQuery,
  shouldShowFusion,
  getPrimaryPokemon,
} from '../fusionUtils';
import { PokemonStatus } from '@/loaders/pokemon';
import type { PokemonStatusType } from '@/loaders/pokemon';

// Mock Pokémon data for testing
const createMockPokemon = (id: number, status: PokemonStatusType) => ({
  id,
  name: `Pokemon${id}`,
  status,
  // Add other required fields with minimal values
  nationalDexId: id,
  nickname: undefined,
  originalLocation: undefined,
  uid: undefined,
});

describe('fusionUtils', () => {
  describe('createFusionTypeQuery', () => {
    it('creates fusion query when both Pokémon exist and can fuse', () => {
      const head = createMockPokemon(1, PokemonStatus.CAPTURED);
      const body = createMockPokemon(2, PokemonStatus.CAPTURED);

      const result = createFusionTypeQuery(head, body, true);

      expect(result).toEqual({
        head: { id: 1 },
        body: { id: 2 },
        isFusion: true,
      });
    });

    it('creates single Pokémon query when not a fusion', () => {
      const head = createMockPokemon(1, PokemonStatus.CAPTURED);
      const body = createMockPokemon(2, PokemonStatus.CAPTURED);

      const result = createFusionTypeQuery(head, body, false);

      expect(result).toEqual({
        head: { id: 1 },
        body: null,
        isFusion: false,
      });
    });

    it('uses body Pokémon when head is empty and body exists', () => {
      const head = null;
      const body = createMockPokemon(2, PokemonStatus.CAPTURED);

      const result = createFusionTypeQuery(head, body, false);

      expect(result).toEqual({
        head: { id: 2 }, // Body ID used in head slot for single Pokémon display
        body: null,
        isFusion: false,
      });
    });

    it('uses head Pokémon when body is empty and head exists', () => {
      const head = createMockPokemon(1, PokemonStatus.CAPTURED);
      const body = null;

      const result = createFusionTypeQuery(head, body, false);

      expect(result).toEqual({
        head: { id: 1 },
        body: null,
        isFusion: false,
      });
    });

    it('uses head Pokémon when both exist but cannot fuse', () => {
      const head = createMockPokemon(1, PokemonStatus.CAPTURED);
      const body = createMockPokemon(2, PokemonStatus.DECEASED); // Different status, can't fuse

      const result = createFusionTypeQuery(head, body, true);

      expect(result).toEqual({
        head: { id: 1 }, // Head is used when fusion isn't possible
        body: null,
        isFusion: false,
      });
    });

    it('handles missing Pokémon gracefully', () => {
      const result = createFusionTypeQuery(null, null, true);

      expect(result).toEqual({
        head: null,
        body: null,
        isFusion: false,
      });
    });

    it('handles Pokémon without IDs', () => {
      const head = {
        ...createMockPokemon(1, PokemonStatus.CAPTURED),
        id: undefined as any,
      };
      const body = createMockPokemon(2, PokemonStatus.CAPTURED);

      const result = createFusionTypeQuery(head, body, true);

      expect(result).toEqual({
        head: null,
        body: null,
        isFusion: false,
      });
    });
  });

  describe('shouldShowFusion', () => {
    it('returns true for valid fusion', () => {
      const head = createMockPokemon(1, PokemonStatus.CAPTURED);
      const body = createMockPokemon(2, PokemonStatus.CAPTURED);

      const result = shouldShowFusion(head, body, true);

      expect(result).toBe(true);
    });

    it('returns false when not a fusion', () => {
      const head = createMockPokemon(1, PokemonStatus.CAPTURED);
      const body = createMockPokemon(2, PokemonStatus.CAPTURED);

      const result = shouldShowFusion(head, body, false);

      expect(result).toBe(false);
    });

    it('returns false when Pokémon cannot fuse due to different statuses', () => {
      const head = createMockPokemon(1, PokemonStatus.CAPTURED);
      const body = createMockPokemon(2, PokemonStatus.DECEASED);

      const result = shouldShowFusion(head, body, true);

      expect(result).toBe(false);
    });
  });

  describe('getPrimaryPokemon', () => {
    it('returns head when only head exists', () => {
      const head = createMockPokemon(1, PokemonStatus.CAPTURED);

      const result = getPrimaryPokemon(head, null);

      expect(result).toBe(head);
    });

    it('returns body when only body exists', () => {
      const body = createMockPokemon(2, PokemonStatus.CAPTURED);

      const result = getPrimaryPokemon(null, body);

      expect(result).toBe(body);
    });

    it('prefers active Pokémon over inactive ones', () => {
      const head = createMockPokemon(1, PokemonStatus.DECEASED);
      const body = createMockPokemon(2, PokemonStatus.CAPTURED);

      const result = getPrimaryPokemon(head, body);

      expect(result).toBe(body);
    });

    it('defaults to head when both have same status', () => {
      const head = createMockPokemon(1, PokemonStatus.CAPTURED);
      const body = createMockPokemon(2, PokemonStatus.CAPTURED);

      const result = getPrimaryPokemon(head, body);

      expect(result).toBe(head);
    });

    it('returns null when no Pokémon exist', () => {
      const result = getPrimaryPokemon(null, null);

      expect(result).toBe(null);
    });
  });
});
