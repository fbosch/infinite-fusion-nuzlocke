import { describe, it, expect } from 'vitest';
import { PokemonStatus, type PokemonOptionType } from '@/loaders/pokemon';
import { EncounterSource } from '@/loaders/encounters';

// Helper function to simulate the default status logic from PokemonCombobox
function applyDefaultStatus(
  pokemon: PokemonOptionType,
  source: EncounterSource | null
): PokemonOptionType {
  if (!pokemon) return pokemon;

  let defaultStatus = pokemon.status;

  // Always set appropriate status for gift and trade Pokemon
  if (source === EncounterSource.GIFT) {
    defaultStatus = PokemonStatus.RECEIVED;
  } else if (source === EncounterSource.TRADE) {
    defaultStatus = PokemonStatus.TRADED;
  }

  // Only update if we have a new default status and it's different
  if (defaultStatus && defaultStatus !== pokemon.status) {
    return {
      ...pokemon,
      status: defaultStatus,
    };
  }

  return pokemon;
}

describe('Pokemon Default Status Logic', () => {
  describe('Default status application', () => {
    it('should set default status to "received" for gift Pokemon', () => {
      const giftPokemon: PokemonOptionType = {
        id: 102,
        name: 'Exeggcute',
        nationalDexId: 102,
      };

      const result = applyDefaultStatus(giftPokemon, EncounterSource.GIFT);

      expect(result).toEqual({
        id: 102,
        name: 'Exeggcute',
        nationalDexId: 102,
        status: PokemonStatus.RECEIVED,
      });
    });

    it('should set default status to "traded" for trade Pokemon', () => {
      const tradePokemon: PokemonOptionType = {
        id: 79,
        name: 'Slowpoke',
        nationalDexId: 79,
      };

      const result = applyDefaultStatus(tradePokemon, EncounterSource.TRADE);

      expect(result).toEqual({
        id: 79,
        name: 'Slowpoke',
        nationalDexId: 79,
        status: PokemonStatus.TRADED,
      });
    });

    it('should not change status for wild Pokemon without existing status', () => {
      const wildPokemon: PokemonOptionType = {
        id: 1,
        name: 'Bulbasaur',
        nationalDexId: 1,
      };

      const result = applyDefaultStatus(wildPokemon, EncounterSource.WILD);

      expect(result).toEqual({
        id: 1,
        name: 'Bulbasaur',
        nationalDexId: 1,
      });
    });

    it('should preserve existing status for wild Pokemon', () => {
      const wildPokemon: PokemonOptionType = {
        id: 1,
        name: 'Bulbasaur',
        nationalDexId: 1,
        status: PokemonStatus.CAPTURED,
      };

      const result = applyDefaultStatus(wildPokemon, EncounterSource.WILD);

      expect(result).toEqual({
        id: 1,
        name: 'Bulbasaur',
        nationalDexId: 1,
        status: PokemonStatus.CAPTURED,
      });
    });

    it('should override existing status for gift Pokemon', () => {
      const giftPokemonWithStatus: PokemonOptionType = {
        id: 102,
        name: 'Exeggcute',
        nationalDexId: 102,
        status: PokemonStatus.CAPTURED,
      };

      const result = applyDefaultStatus(
        giftPokemonWithStatus,
        EncounterSource.GIFT
      );

      expect(result).toEqual({
        id: 102,
        name: 'Exeggcute',
        nationalDexId: 102,
        status: PokemonStatus.RECEIVED,
      });
    });

    it('should override existing status for trade Pokemon', () => {
      const tradePokemonWithStatus: PokemonOptionType = {
        id: 79,
        name: 'Slowpoke',
        nationalDexId: 79,
        status: PokemonStatus.MISSED,
      };

      const result = applyDefaultStatus(
        tradePokemonWithStatus,
        EncounterSource.TRADE
      );

      expect(result).toEqual({
        id: 79,
        name: 'Slowpoke',
        nationalDexId: 79,
        status: PokemonStatus.TRADED,
      });
    });

    it('should handle Pokemon without source data gracefully', () => {
      const unknownPokemon: PokemonOptionType = {
        id: 999,
        name: 'Unknown',
        nationalDexId: 999,
        status: PokemonStatus.CAPTURED,
      };

      const result = applyDefaultStatus(unknownPokemon, null);

      expect(result).toEqual({
        id: 999,
        name: 'Unknown',
        nationalDexId: 999,
        status: PokemonStatus.CAPTURED,
      });
    });

    it('should not change Pokemon if same status would be applied', () => {
      const giftPokemon: PokemonOptionType = {
        id: 102,
        name: 'Exeggcute',
        nationalDexId: 102,
        status: PokemonStatus.RECEIVED,
      };

      const result = applyDefaultStatus(giftPokemon, EncounterSource.GIFT);

      // Should return the same object reference since no change is needed
      expect(result).toBe(giftPokemon);
    });
  });

  describe('Edge cases', () => {
    it('should handle null Pokemon gracefully', () => {
      const result = applyDefaultStatus(null as any, EncounterSource.GIFT);
      expect(result).toBeNull();
    });

    it('should handle undefined Pokemon gracefully', () => {
      const result = applyDefaultStatus(undefined as any, EncounterSource.GIFT);
      expect(result).toBeUndefined();
    });

    it('should preserve all Pokemon properties when applying status', () => {
      const pokemonWithAllProps: PokemonOptionType = {
        id: 102,
        name: 'Exeggcute',
        nationalDexId: 102,
        nickname: 'Eggy',
        originalLocation: 'test-location',
        uid: 'unique-id-123',
        status: PokemonStatus.CAPTURED,
      };

      const result = applyDefaultStatus(
        pokemonWithAllProps,
        EncounterSource.GIFT
      );

      expect(result).toEqual({
        id: 102,
        name: 'Exeggcute',
        nationalDexId: 102,
        nickname: 'Eggy',
        originalLocation: 'test-location',
        uid: 'unique-id-123',
        status: PokemonStatus.RECEIVED,
      });
    });
  });
});
