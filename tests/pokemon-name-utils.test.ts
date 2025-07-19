import { describe, it, expect, beforeEach } from 'vitest';
import {
  createNameVariations,
  buildPokemonNameMap,
  findPokemonId,
  normalizePokemonNameForAPI,
  isPotentialPokemonName,
  type PokemonNameMap,
} from '../scripts/utils/pokemon-name-utils';

describe('Pokemon Name Utilities', () => {
  describe('createNameVariations', () => {
    it('should handle basic Pokemon names', () => {
      const variations = createNameVariations('Pidgey');

      expect(variations).toContain('Pidgey');
      expect(variations).toContain('pidgey');
      expect(variations).toContain('pidgey'); // clean version (no non-letter chars to remove)
    });

    it('should handle gender symbols', () => {
      const variations = createNameVariations('Nidoran♀');

      expect(variations).toContain('Nidoran♀');
      expect(variations).toContain('NidoranF');
      expect(variations).toContain('Nidoran');
      expect(variations).toContain('nidoran');
      expect(variations).toContain('nidoranf');
    });

    it('should handle special characters', () => {
      const variations = createNameVariations("Farfetch'd");

      expect(variations).toContain("Farfetch'd");
      expect(variations).toContain('Farfetchd');
      expect(variations).toContain('farfetchd');
    });

    it('should handle names with dots', () => {
      const variations = createNameVariations('Mr. Mime');

      expect(variations).toContain('Mr. Mime');
      expect(variations).toContain('Mr Mime');
      expect(variations).toContain('MrMime');
      expect(variations).toContain('mrmime');
    });

    it('should handle empty or invalid input', () => {
      expect(createNameVariations('')).toEqual([]);
      expect(createNameVariations(null as any)).toEqual([]);
      expect(createNameVariations(undefined as any)).toEqual([]);
    });

    it('should remove duplicates', () => {
      const variations = createNameVariations('Test');
      const uniqueVariations = [...new Set(variations)];
      expect(variations).toEqual(uniqueVariations);
    });
  });

  describe('buildPokemonNameMap', () => {
    const mockPokemonData = [
      { id: 1, name: 'Bulbasaur' },
      { id: 25, name: 'Pikachu' },
      { id: 32, name: 'Nidoran♂' },
      { id: 29, name: 'Nidoran♀' },
      { id: 122, name: 'Mr. Mime' },
    ];

    let nameMap: PokemonNameMap;

    beforeEach(() => {
      nameMap = buildPokemonNameMap(mockPokemonData);
    });

    it('should create bidirectional mapping', () => {
      expect(nameMap.nameToId.get('Bulbasaur')).toBe(1);
      expect(nameMap.idToName.get(1)).toBe('Bulbasaur');
    });

    it('should handle case variations', () => {
      expect(nameMap.nameToId.get('pikachu')).toBe(25);
      expect(nameMap.nameToId.get('PIKACHU')).toBe(25);
    });

    it('should handle gender symbols', () => {
      expect(nameMap.nameToId.get('NidoranM')).toBe(32);
      expect(nameMap.nameToId.get('NidoranF')).toBe(29);
      expect(nameMap.nameToId.get('Nidoran')).toBe(29); // First one without gender
    });

    it('should handle special characters', () => {
      expect(nameMap.nameToId.get('MrMime')).toBe(122);
      expect(nameMap.nameToId.get('Mr Mime')).toBe(122);
    });

    it('should handle invalid data gracefully', () => {
      const invalidData = [
        { id: null, name: 'Invalid' },
        { id: 1, name: null },
        { id: 2, name: '' },
      ];
      const map = buildPokemonNameMap(invalidData as any);
      expect(map.nameToId.size).toBe(0);
      expect(map.idToName.size).toBe(0);
    });
  });

  describe('findPokemonId', () => {
    const mockPokemonData = [
      { id: 1, name: 'Bulbasaur' },
      { id: 25, name: 'Pikachu' },
      { id: 83, name: "Farfetch'd" },
      { id: 122, name: 'Mr. Mime' },
      { id: 29, name: 'Nidoran♀' },
    ];

    let nameMap: PokemonNameMap;

    beforeEach(() => {
      nameMap = buildPokemonNameMap(mockPokemonData);
    });

    it('should find exact matches', () => {
      expect(findPokemonId('Pikachu', nameMap)).toBe(25);
    });

    it('should find case-insensitive matches', () => {
      expect(findPokemonId('pikachu', nameMap)).toBe(25);
      expect(findPokemonId('PIKACHU', nameMap)).toBe(25);
    });

    it('should find matches with special characters removed', () => {
      expect(findPokemonId('Farfetchd', nameMap)).toBe(83);
      expect(findPokemonId('MrMime', nameMap)).toBe(122);
    });

    it('should find matches with spaces removed', () => {
      expect(findPokemonId('Mr Mime', nameMap)).toBe(122);
    });

    it('should handle gender symbols', () => {
      expect(findPokemonId('NidoranF', nameMap)).toBe(29);
      expect(findPokemonId('Nidoran♀', nameMap)).toBe(29);
    });

    it('should return null for invalid input', () => {
      expect(findPokemonId('', nameMap)).toBeNull();
      expect(findPokemonId(null as any, nameMap)).toBeNull();
      expect(findPokemonId(undefined as any, nameMap)).toBeNull();
    });

    it('should return null for non-existent Pokemon', () => {
      expect(findPokemonId('NotAPokemon', nameMap)).toBeNull();
    });
  });

  describe('normalizePokemonNameForAPI', () => {
    it('should handle basic names', () => {
      expect(normalizePokemonNameForAPI('Pikachu')).toBe('pikachu');
    });

    it('should handle gender symbols', () => {
      expect(normalizePokemonNameForAPI('Nidoran♀')).toBe('nidoran-f');
      expect(normalizePokemonNameForAPI('Nidoran♂')).toBe('nidoran-m');
    });

    it('should handle special characters', () => {
      expect(normalizePokemonNameForAPI("Farfetch'd")).toBe('farfetchd');
      expect(normalizePokemonNameForAPI('Mr. Mime')).toBe('mr-mime');
    });

    it('should handle accented characters', () => {
      expect(normalizePokemonNameForAPI('Flabébé')).toBe('flabebe');
    });

    it('should handle special Pokemon forms', () => {
      expect(normalizePokemonNameForAPI('Aegislash Blade Forme')).toBe(
        'aegislash-shield'
      );
      expect(normalizePokemonNameForAPI('Oricorio (Baile Style)')).toBe(
        'oricorio-baile'
      );
      expect(normalizePokemonNameForAPI('Deoxys Normal Forme')).toBe(
        'deoxys-normal'
      );
      expect(normalizePokemonNameForAPI('Gourgeist Large Size')).toBe(
        'gourgeist-average'
      );
      expect(normalizePokemonNameForAPI('Castform (Normal)')).toBe('castform');
    });

    it('should handle invalid input', () => {
      expect(normalizePokemonNameForAPI('')).toBe('');
      expect(normalizePokemonNameForAPI(null as any)).toBe('');
      expect(normalizePokemonNameForAPI(undefined as any)).toBe('');
    });
  });

  describe('isPotentialPokemonName', () => {
    it('should accept valid Pokemon names', () => {
      expect(isPotentialPokemonName('Pikachu')).toBe(true);
      expect(isPotentialPokemonName('Mr. Mime')).toBe(true);
      expect(isPotentialPokemonName("Farfetch'd")).toBe(true);
      expect(isPotentialPokemonName('Nidoran♀')).toBe(true);
    });

    it('should reject too short names', () => {
      expect(isPotentialPokemonName('AB')).toBe(false);
      expect(isPotentialPokemonName('X')).toBe(false);
    });

    it('should reject too long names', () => {
      expect(isPotentialPokemonName('ThisIsWayTooLongToBeAPokemonName')).toBe(
        false
      );
    });

    it('should reject metadata terms', () => {
      expect(isPotentialPokemonName('Level 15')).toBe(false);
      expect(isPotentialPokemonName('5% Rate')).toBe(false);
      expect(isPotentialPokemonName('Electric Type')).toBe(false);
      expect(isPotentialPokemonName('Pokémon')).toBe(false);
    });

    it('should reject pure numbers', () => {
      expect(isPotentialPokemonName('123')).toBe(false);
      expect(isPotentialPokemonName('15-20')).toBe(false);
      expect(isPotentialPokemonName('50%')).toBe(false);
    });

    it('should reject invalid input', () => {
      expect(isPotentialPokemonName('')).toBe(false);
      expect(isPotentialPokemonName(null as any)).toBe(false);
      expect(isPotentialPokemonName(undefined as any)).toBe(false);
    });

    it('should handle edge cases around length limits', () => {
      expect(isPotentialPokemonName('ABC')).toBe(true); // exactly 3 chars
      expect(isPotentialPokemonName('PokemonNameTwentyCha')).toBe(true); // exactly 20 chars
      expect(isPotentialPokemonName('12345678901234567890')).toBe(false); // 20 digits should be rejected as metadata
      expect(isPotentialPokemonName('123456789012345678901')).toBe(false); // 21 chars
    });
  });
});
