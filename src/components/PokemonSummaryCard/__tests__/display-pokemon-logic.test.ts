import { describe, it, expect } from 'vitest';
import { getDisplayPokemon } from '../utils';
import { type PokemonOptionType } from '@/loaders/pokemon';

describe('Display Pokemon Logic - Artwork Variant Bug Prevention', () => {
  const mockPikachu: PokemonOptionType = {
    id: 25,
    name: 'Pikachu',
    nationalDexId: 25,
    types: ['Electric'],
    status: 'CAPTURED',
  };

  const mockBulbasaur: PokemonOptionType = {
    id: 1,
    name: 'Bulbasaur',
    nationalDexId: 1,
    types: ['Grass', 'Poison'],
    status: 'CAPTURED',
  };

  const mockCharizard: PokemonOptionType = {
    id: 6,
    name: 'Charizard',
    nationalDexId: 6,
    types: ['Fire', 'Flying'],
    status: 'STORED',
  };

  describe('Pokemon ID selection logic consistency', () => {
    it('should return correct IDs for fusion mode', () => {
      const displayPokemon = getDisplayPokemon(
        mockPikachu,
        mockBulbasaur,
        true
      );

      // Apply the same logic used in components for ID selection
      const headId = displayPokemon.isFusion
        ? (displayPokemon.head?.id ?? null)
        : (displayPokemon.head?.id ?? displayPokemon.body?.id ?? null);
      const bodyId = displayPokemon.isFusion
        ? (displayPokemon.body?.id ?? null)
        : null;

      expect(headId).toBe(25); // Pikachu
      expect(bodyId).toBe(1); // Bulbasaur
      expect(displayPokemon.isFusion).toBe(true);
    });

    it('should return correct IDs for single Pokemon mode (fusion toggled off)', () => {
      const displayPokemon = getDisplayPokemon(
        mockPikachu,
        mockBulbasaur,
        false
      );

      // Apply the same logic used in components for ID selection
      const headId = displayPokemon.isFusion
        ? (displayPokemon.head?.id ?? null)
        : (displayPokemon.head?.id ?? displayPokemon.body?.id ?? null);
      const bodyId = displayPokemon.isFusion
        ? (displayPokemon.body?.id ?? null)
        : null;

      expect(headId).toBe(25); // Should use head Pokemon (Pikachu)
      expect(bodyId).toBe(null); // Should be null for single Pokemon
      expect(displayPokemon.isFusion).toBe(false);
    });

    it('should use body Pokemon ID when head is null', () => {
      const displayPokemon = getDisplayPokemon(null, mockBulbasaur, false);

      // Apply the same logic used in components for ID selection
      const headId = displayPokemon.isFusion
        ? (displayPokemon.head?.id ?? null)
        : (displayPokemon.head?.id ?? displayPokemon.body?.id ?? null);
      const bodyId = displayPokemon.isFusion
        ? (displayPokemon.body?.id ?? null)
        : null;

      expect(headId).toBe(1); // Should use body Pokemon (Bulbasaur)
      expect(bodyId).toBe(null); // Should be null for single Pokemon
      expect(displayPokemon.isFusion).toBe(false);
    });

    it('should handle inactive Pokemon correctly when fusion is toggled off', () => {
      // Scenario: Pikachu is active (CAPTURED), Charizard is inactive (STORED)
      const displayPokemon = getDisplayPokemon(
        mockPikachu,
        mockCharizard,
        false
      );

      // Apply the same logic used in components for ID selection
      const headId = displayPokemon.isFusion
        ? (displayPokemon.head?.id ?? null)
        : (displayPokemon.head?.id ?? displayPokemon.body?.id ?? null);
      const bodyId = displayPokemon.isFusion
        ? (displayPokemon.body?.id ?? null)
        : null;

      expect(headId).toBe(25); // Should use active Pokemon (Pikachu)
      expect(bodyId).toBe(null); // Should be null for single Pokemon
      expect(displayPokemon.isFusion).toBe(false);
    });
  });

  describe('Regression test: Bug prevention', () => {
    it('should prevent bug where fusion IDs are used for single Pokemon', () => {
      // This test specifically prevents the regression of the original bug
      // where the artwork variant system would use fusion IDs even when
      // fusion was toggled off

      // Set up scenario where fusion exists but is toggled off
      const displayPokemon = getDisplayPokemon(
        mockPikachu,
        mockBulbasaur,
        false
      );

      // Apply the same logic used in components for ID selection
      const headId = displayPokemon.isFusion
        ? (displayPokemon.head?.id ?? null)
        : (displayPokemon.head?.id ?? displayPokemon.body?.id ?? null);
      const bodyId = displayPokemon.isFusion
        ? (displayPokemon.body?.id ?? null)
        : null;

      // Critical assertion: When fusion is off, should NOT use fusion IDs (25, 1)
      // Should use single Pokemon ID instead (25, null)
      expect(headId).toBe(25);
      expect(bodyId).toBe(null);
      expect(displayPokemon.isFusion).toBe(false);

      // Ensure we're not accidentally creating fusion combinations
      expect(`${headId}.${bodyId}`).not.toBe('25.1');
      expect(`${headId}${bodyId ? `.${bodyId}` : ''}`).toBe('25');
    });

    it('should use consistent logic across different scenarios', () => {
      const testScenarios = [
        {
          name: 'fusion enabled',
          head: mockPikachu,
          body: mockBulbasaur,
          isFusion: true,
          expectedHeadId: 25,
          expectedBodyId: 1,
          expectedKey: '25.1',
        },
        {
          name: 'fusion disabled with head',
          head: mockPikachu,
          body: mockBulbasaur,
          isFusion: false,
          expectedHeadId: 25,
          expectedBodyId: null,
          expectedKey: '25',
        },
        {
          name: 'fusion disabled with body only',
          head: null,
          body: mockBulbasaur,
          isFusion: false,
          expectedHeadId: 1,
          expectedBodyId: null,
          expectedKey: '1',
        },
        {
          name: 'fusion disabled head only',
          head: mockPikachu,
          body: null,
          isFusion: false,
          expectedHeadId: 25,
          expectedBodyId: null,
          expectedKey: '25',
        },
      ];

      testScenarios.forEach(scenario => {
        const displayPokemon = getDisplayPokemon(
          scenario.head,
          scenario.body,
          scenario.isFusion
        );

        // Apply the same logic used in components
        const headId = displayPokemon.isFusion
          ? (displayPokemon.head?.id ?? null)
          : (displayPokemon.head?.id ?? displayPokemon.body?.id ?? null);
        const bodyId = displayPokemon.isFusion
          ? (displayPokemon.body?.id ?? null)
          : null;

        // Generate the key that would be used for preferred variants
        const key =
          headId && bodyId
            ? `${headId}.${bodyId}`
            : String(headId || bodyId || '');

        expect(headId, `${scenario.name}: headId`).toBe(
          scenario.expectedHeadId
        );
        expect(bodyId, `${scenario.name}: bodyId`).toBe(
          scenario.expectedBodyId
        );
        expect(key, `${scenario.name}: variant key`).toBe(scenario.expectedKey);
      });
    });
  });

  describe('Edge cases', () => {
    it('should handle null/undefined Pokemon gracefully', () => {
      const displayPokemon = getDisplayPokemon(null, null, false);

      const headId = displayPokemon.isFusion
        ? (displayPokemon.head?.id ?? null)
        : (displayPokemon.head?.id ?? displayPokemon.body?.id ?? null);
      const bodyId = displayPokemon.isFusion
        ? (displayPokemon.body?.id ?? null)
        : null;

      expect(headId).toBe(null);
      expect(bodyId).toBe(null);
      expect(displayPokemon.isFusion).toBe(false);
    });

    it('should handle fusion request with missing Pokemon', () => {
      const displayPokemon = getDisplayPokemon(mockPikachu, null, true);

      const headId = displayPokemon.isFusion
        ? (displayPokemon.head?.id ?? null)
        : (displayPokemon.head?.id ?? displayPokemon.body?.id ?? null);
      const bodyId = displayPokemon.isFusion
        ? (displayPokemon.body?.id ?? null)
        : null;

      // Should fall back to single Pokemon mode
      expect(headId).toBe(25);
      expect(bodyId).toBe(null);
      // Note: getDisplayPokemon actually returns isFusion as passed in when one Pokemon is missing
      // This is the expected behavior according to the implementation
      expect(displayPokemon.isFusion).toBe(true);
      expect(displayPokemon.head?.id).toBe(25);
      expect(displayPokemon.body).toBe(null);
    });
  });
});
