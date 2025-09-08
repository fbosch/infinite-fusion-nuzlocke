import { describe, it, expect } from 'vitest';
import {
  generateFusionName,
  hasFusionNameParts,
  getFusionDisplayName,
  getFusionDisplayNameFromOptions,
} from '../fusionNaming';
import type { DexEntry } from '../../../scripts/utils/data-loading-utils';
import type { PokemonOptionType } from '@/loaders/pokemon';

// Mock data for testing
const mockDexEntryWithParts: DexEntry = {
  id: 1,
  name: 'Bulbasaur',
  headNamePart: 'Bulba',
  bodyNamePart: 'saur',
  nationalDexId: 1,
  types: ['Grass', 'Poison'],
  baseStats: {
    hp: 45,
    attack: 49,
    defense: 49,
    specialAttack: 65,
    specialDefense: 65,
    speed: 45,
  },
  abilities: ['Overgrow'],
  hiddenAbility: 'Chlorophyll',
  eggGroups: ['Monster', 'Grass'],
  genderRatio: { male: 87.5, female: 12.5 },
  catchRate: 45,
  baseFriendship: 50,
  baseExp: 64,
  growthRate: 'Medium Slow',
  evYield: {
    hp: 0,
    attack: 0,
    defense: 0,
    specialAttack: 0,
    specialDefense: 0,
    speed: 1,
  },
  height: 0.7,
  weight: 6.9,
  color: 'Green',
  habitat: 'Grassland',
  generation: 1,
  isLegendary: false,
  isMythical: false,
  isUltraBeast: false,
  isMega: false,
  isGigantamax: false,
  isRegional: false,
  isStarter: true,
  isPseudoLegendary: false,
  isBaby: false,
  isEvolveFromBaby: false,
  isEvolveToBaby: false,
  isEvolveFromOther: false,
  isEvolveToOther: false,
  isEvolveFromTrade: false,
  isEvolveToTrade: false,
  isEvolveFromItem: false,
  isEvolveToItem: false,
  isEvolveFromLevel: false,
  isEvolveToLevel: false,
  isEvolveFromFriendship: false,
  isEvolveToFriendship: false,
  isEvolveFromTime: false,
  isEvolveToTime: false,
  isEvolveFromLocation: false,
  isEvolveToLocation: false,
  isEvolveFromOtherConditions: false,
  isEvolveToOtherConditions: false,
  isEvolveFromOtherPokemon: false,
  isEvolveToOtherPokemon: false,
  isEvolveFromOtherPokemonAndItem: false,
  isEvolveToOtherPokemonAndItem: false,
  isEvolveFromOtherPokemonAndLevel: false,
  isEvolveToOtherPokemonAndLevel: false,
  isEvolveFromOtherPokemonAndTime: false,
  isEvolveToOtherPokemonAndTime: false,
  isEvolveFromOtherPokemonAndLocation: false,
  isEvolveToOtherPokemonAndLocation: false,
  isEvolveFromOtherPokemonAndFriendship: false,
  isEvolveToOtherPokemonAndFriendship: false,
  isEvolveFromOtherPokemonAndItemAndLevel: false,
  isEvolveToOtherPokemonAndItemAndLevel: false,
  isEvolveFromOtherPokemonAndItemAndTime: false,
  isEvolveToOtherPokemonAndItemAndTime: false,
  isEvolveFromOtherPokemonAndItemAndLocation: false,
  isEvolveToOtherPokemonAndItemAndLocation: false,
  isEvolveFromOtherPokemonAndItemAndFriendship: false,
  isEvolveToOtherPokemonAndItemAndFriendship: false,
  isEvolveFromOtherPokemonAndLevelAndTime: false,
  isEvolveToOtherPokemonAndLevelAndTime: false,
  isEvolveFromOtherPokemonAndLevelAndLocation: false,
  isEvolveToOtherPokemonAndLevelAndLocation: false,
  isEvolveFromOtherPokemonAndLevelAndFriendship: false,
  isEvolveToOtherPokemonAndLevelAndFriendship: false,
  isEvolveFromOtherPokemonAndTimeAndLocation: false,
  isEvolveToOtherPokemonAndTimeAndLocation: false,
  isEvolveFromOtherPokemonAndTimeAndFriendship: false,
  isEvolveToOtherPokemonAndTimeAndFriendship: false,
  isEvolveFromOtherPokemonAndLocationAndFriendship: false,
  isEvolveToOtherPokemonAndLocationAndFriendship: false,
  isEvolveFromOtherPokemonAndItemAndLevelAndTime: false,
  isEvolveToOtherPokemonAndItemAndLevelAndTime: false,
  isEvolveFromOtherPokemonAndItemAndLevelAndLocation: false,
  isEvolveToOtherPokemonAndItemAndLevelAndLocation: false,
  isEvolveFromOtherPokemonAndItemAndLevelAndFriendship: false,
  isEvolveToOtherPokemonAndItemAndLevelAndFriendship: false,
  isEvolveFromOtherPokemonAndItemAndTimeAndLocation: false,
  isEvolveToOtherPokemonAndItemAndTimeAndLocation: false,
  isEvolveFromOtherPokemonAndItemAndTimeAndFriendship: false,
  isEvolveToOtherPokemonAndItemAndTimeAndFriendship: false,
  isEvolveFromOtherPokemonAndItemAndLocationAndFriendship: false,
  isEvolveToOtherPokemonAndItemAndLocationAndFriendship: false,
  isEvolveFromOtherPokemonAndLevelAndTimeAndLocation: false,
  isEvolveToOtherPokemonAndLevelAndTimeAndLocation: false,
  isEvolveFromOtherPokemonAndLevelAndTimeAndFriendship: false,
  isEvolveToOtherPokemonAndLevelAndTimeAndFriendship: false,
  isEvolveFromOtherPokemonAndLevelAndLocationAndFriendship: false,
  isEvolveToOtherPokemonAndLevelAndLocationAndFriendship: false,
  isEvolveFromOtherPokemonAndTimeAndLocationAndFriendship: false,
  isEvolveToOtherPokemonAndTimeAndLocationAndFriendship: false,
  isEvolveFromOtherPokemonAndItemAndLevelAndTimeAndLocation: false,
  isEvolveToOtherPokemonAndItemAndLevelAndTimeAndLocation: false,
  isEvolveFromOtherPokemonAndItemAndLevelAndTimeAndFriendship: false,
  isEvolveToOtherPokemonAndItemAndLevelAndTimeAndFriendship: false,
  isEvolveFromOtherPokemonAndItemAndLevelAndLocationAndFriendship: false,
  isEvolveToOtherPokemonAndItemAndLevelAndLocationAndFriendship: false,
  isEvolveFromOtherPokemonAndItemAndTimeAndLocationAndFriendship: false,
  isEvolveToOtherPokemonAndItemAndTimeAndLocationAndFriendship: false,
  isEvolveFromOtherPokemonAndLevelAndTimeAndLocationAndFriendship: false,
  isEvolveToOtherPokemonAndLevelAndTimeAndLocationAndFriendship: false,
  isEvolveFromOtherPokemonAndItemAndLevelAndTimeAndLocationAndFriendship: false,
  isEvolveToOtherPokemonAndItemAndLevelAndTimeAndLocationAndFriendship: false,
};

const mockDexEntryWithoutParts: DexEntry = {
  ...mockDexEntryWithParts,
  id: 2,
  name: 'Charmander',
  headNamePart: undefined,
  bodyNamePart: undefined,
};

const _mockPokemonWithNickname: PokemonOptionType = {
  id: 1,
  name: 'Bulbasaur',
  nickname: 'Bulby',
  nationalDexId: 1,
};

const mockPokemonWithoutNickname: PokemonOptionType = {
  id: 1,
  name: 'Bulbasaur',
  nationalDexId: 1,
};

describe('fusionNaming utilities', () => {
  describe('generateFusionName', () => {
    it('should generate fusion name from head and body parts', () => {
      const result = generateFusionName(
        mockDexEntryWithParts,
        mockDexEntryWithParts
      );
      expect(result).toBe('Bulbasaur');
    });

    it('should fall back to slash format when parts are missing', () => {
      const result = generateFusionName(
        mockDexEntryWithoutParts,
        mockDexEntryWithoutParts
      );
      expect(result).toBe('Charmander/Charmander');
    });
  });

  describe('hasFusionNameParts', () => {
    it('should return true when both parts exist', () => {
      expect(hasFusionNameParts(mockDexEntryWithParts)).toBe(true);
    });

    it('should return false when parts are missing', () => {
      expect(hasFusionNameParts(mockDexEntryWithoutParts)).toBe(false);
    });
  });

  describe('getFusionDisplayName', () => {
    it('should use fusion names when available and enabled', () => {
      const result = getFusionDisplayName(
        mockDexEntryWithParts,
        mockDexEntryWithParts,
        true
      );
      expect(result).toBe('Bulbasaur');
    });

    it('should fall back to slash format when fusion names disabled', () => {
      const result = getFusionDisplayName(
        mockDexEntryWithParts,
        mockDexEntryWithParts,
        false
      );
      expect(result).toBe('Bulbasaur/Bulbasaur');
    });

    it('should fall back to slash format when parts missing', () => {
      const result = getFusionDisplayName(
        mockDexEntryWithoutParts,
        mockDexEntryWithoutParts,
        true
      );
      expect(result).toBe('Charmander/Charmander');
    });
  });

  describe('getFusionDisplayNameFromOptions', () => {
    const mockGetPokemonById = (id: number) => {
      if (id === 1) return mockDexEntryWithParts;
      if (id === 2) return mockDexEntryWithoutParts;
      return undefined;
    };

    it('should return empty string when no pokemon provided', () => {
      const result = getFusionDisplayNameFromOptions(
        null,
        null,
        mockGetPokemonById
      );
      expect(result).toBe('');
    });

    it('should return head pokemon name when no body', () => {
      const result = getFusionDisplayNameFromOptions(
        mockPokemonWithoutNickname,
        null,
        mockGetPokemonById
      );
      expect(result).toBe('Bulbasaur');
    });

    it('should return body pokemon name when no head', () => {
      const result = getFusionDisplayNameFromOptions(
        null,
        mockPokemonWithoutNickname,
        mockGetPokemonById
      );
      expect(result).toBe('Bulbasaur');
    });

    it('should return slash format when dex entries not found', () => {
      const result = getFusionDisplayNameFromOptions(
        mockPokemonWithoutNickname,
        mockPokemonWithoutNickname,
        () => undefined
      );
      expect(result).toBe('Bulbasaur/Bulbasaur');
    });

    it('should return slash format when fusion names disabled', () => {
      const result = getFusionDisplayNameFromOptions(
        mockPokemonWithoutNickname,
        mockPokemonWithoutNickname,
        mockGetPokemonById,
        false
      );
      expect(result).toBe('Bulbasaur/Bulbasaur');
    });

    it('should return fusion name when available', () => {
      const result = getFusionDisplayNameFromOptions(
        mockPokemonWithoutNickname,
        mockPokemonWithoutNickname,
        mockGetPokemonById,
        true
      );
      expect(result).toBe('Bulbasaur');
    });
  });
});
