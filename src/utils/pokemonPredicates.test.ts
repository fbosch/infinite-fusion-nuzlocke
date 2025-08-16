import { describe, it, expect } from 'vitest';
import {
  isActiveStatus,
  isDeceasedStatus,
  isStoredStatus,
  isMissedStatus,
  isInactiveStatus,
  isPokemonActive,
  isPokemonInactive,
  isPokemonDeceased,
  isPokemonStored,
  getFusionStatusCategory,
  canFuse,
  isFusionFullyActive,
  isFusionPartiallyActive,
  isFusionInactive,
  isFusionDeceased,
} from './pokemonPredicates';
import { PokemonStatus } from '@/loaders/pokemon';
import type { PokemonOptionType } from '@/loaders/pokemon';

// Helper function to create test Pokemon data
function createTestPokemon(
  status?: PokemonStatus,
  id: number = 1,
  name: string = 'TestPokemon'
): PokemonOptionType {
  return {
    id,
    name,
    nationalDexId: id,
    status,
  };
}

describe('Status Predicates (status-level)', () => {
  describe('isActiveStatus', () => {
    it('should return true for CAPTURED status', () => {
      expect(isActiveStatus(PokemonStatus.CAPTURED)).toBe(true);
    });

    it('should return true for RECEIVED status', () => {
      expect(isActiveStatus(PokemonStatus.RECEIVED)).toBe(true);
    });

    it('should return true for TRADED status', () => {
      expect(isActiveStatus(PokemonStatus.TRADED)).toBe(true);
    });

    it('should return false for DECEASED status', () => {
      expect(isActiveStatus(PokemonStatus.DECEASED)).toBe(false);
    });

    it('should return false for STORED status', () => {
      expect(isActiveStatus(PokemonStatus.STORED)).toBe(false);
    });

    it('should return false for MISSED status', () => {
      expect(isActiveStatus(PokemonStatus.MISSED)).toBe(false);
    });

    it('should return false for null status', () => {
      expect(isActiveStatus(null)).toBe(false);
    });

    it('should return false for undefined status', () => {
      expect(isActiveStatus(undefined)).toBe(false);
    });
  });

  describe('isDeceasedStatus', () => {
    it('should return true for DECEASED status', () => {
      expect(isDeceasedStatus(PokemonStatus.DECEASED)).toBe(true);
    });

    it('should return false for other statuses', () => {
      expect(isDeceasedStatus(PokemonStatus.CAPTURED)).toBe(false);
      expect(isDeceasedStatus(PokemonStatus.RECEIVED)).toBe(false);
      expect(isDeceasedStatus(PokemonStatus.TRADED)).toBe(false);
      expect(isDeceasedStatus(PokemonStatus.STORED)).toBe(false);
      expect(isDeceasedStatus(PokemonStatus.MISSED)).toBe(false);
    });

    it('should return false for null status', () => {
      expect(isDeceasedStatus(null)).toBe(false);
    });

    it('should return false for undefined status', () => {
      expect(isDeceasedStatus(undefined)).toBe(false);
    });
  });

  describe('isStoredStatus', () => {
    it('should return true for STORED status', () => {
      expect(isStoredStatus(PokemonStatus.STORED)).toBe(true);
    });

    it('should return false for other statuses', () => {
      expect(isStoredStatus(PokemonStatus.CAPTURED)).toBe(false);
      expect(isStoredStatus(PokemonStatus.RECEIVED)).toBe(false);
      expect(isStoredStatus(PokemonStatus.TRADED)).toBe(false);
      expect(isStoredStatus(PokemonStatus.DECEASED)).toBe(false);
      expect(isStoredStatus(PokemonStatus.MISSED)).toBe(false);
    });

    it('should return false for null status', () => {
      expect(isStoredStatus(null)).toBe(false);
    });

    it('should return false for undefined status', () => {
      expect(isStoredStatus(undefined)).toBe(false);
    });
  });

  describe('isMissedStatus', () => {
    it('should return true for MISSED status', () => {
      expect(isMissedStatus(PokemonStatus.MISSED)).toBe(true);
    });

    it('should return false for other statuses', () => {
      expect(isMissedStatus(PokemonStatus.CAPTURED)).toBe(false);
      expect(isMissedStatus(PokemonStatus.RECEIVED)).toBe(false);
      expect(isMissedStatus(PokemonStatus.TRADED)).toBe(false);
      expect(isMissedStatus(PokemonStatus.DECEASED)).toBe(false);
      expect(isMissedStatus(PokemonStatus.STORED)).toBe(false);
    });

    it('should return false for null status', () => {
      expect(isMissedStatus(null)).toBe(false);
    });

    it('should return false for undefined status', () => {
      expect(isMissedStatus(undefined)).toBe(false);
    });
  });

  describe('isInactiveStatus', () => {
    it('should return true for DECEASED status', () => {
      expect(isInactiveStatus(PokemonStatus.DECEASED)).toBe(true);
    });

    it('should return true for STORED status', () => {
      expect(isInactiveStatus(PokemonStatus.STORED)).toBe(true);
    });

    it('should return false for active statuses', () => {
      expect(isInactiveStatus(PokemonStatus.CAPTURED)).toBe(false);
      expect(isInactiveStatus(PokemonStatus.RECEIVED)).toBe(false);
      expect(isInactiveStatus(PokemonStatus.TRADED)).toBe(false);
    });

    it('should return false for MISSED status', () => {
      expect(isInactiveStatus(PokemonStatus.MISSED)).toBe(false);
    });

    it('should return false for null status', () => {
      expect(isInactiveStatus(null)).toBe(false);
    });

    it('should return false for undefined status', () => {
      expect(isInactiveStatus(undefined)).toBe(false);
    });
  });
});

describe('Object Predicates (pokemon-level)', () => {
  describe('isPokemonActive', () => {
    it('should return true for pokemon with active status', () => {
      expect(isPokemonActive(createTestPokemon(PokemonStatus.CAPTURED))).toBe(
        true
      );
      expect(isPokemonActive(createTestPokemon(PokemonStatus.RECEIVED))).toBe(
        true
      );
      expect(isPokemonActive(createTestPokemon(PokemonStatus.TRADED))).toBe(
        true
      );
    });

    it('should return false for pokemon with inactive status', () => {
      expect(isPokemonActive(createTestPokemon(PokemonStatus.DECEASED))).toBe(
        false
      );
      expect(isPokemonActive(createTestPokemon(PokemonStatus.STORED))).toBe(
        false
      );
    });

    it('should return false for pokemon with missed status', () => {
      expect(isPokemonActive(createTestPokemon(PokemonStatus.MISSED))).toBe(
        false
      );
    });

    it('should return false for pokemon with no status', () => {
      expect(isPokemonActive(createTestPokemon(undefined))).toBe(false);
    });

    it('should return false for null pokemon', () => {
      expect(isPokemonActive(null)).toBe(false);
    });

    it('should return false for undefined pokemon', () => {
      expect(isPokemonActive(undefined)).toBe(false);
    });
  });

  describe('isPokemonInactive', () => {
    it('should return true for pokemon with inactive status', () => {
      expect(isPokemonInactive(createTestPokemon(PokemonStatus.DECEASED))).toBe(
        true
      );
      expect(isPokemonInactive(createTestPokemon(PokemonStatus.STORED))).toBe(
        true
      );
    });

    it('should return false for pokemon with active status', () => {
      expect(isPokemonInactive(createTestPokemon(PokemonStatus.CAPTURED))).toBe(
        false
      );
      expect(isPokemonInactive(createTestPokemon(PokemonStatus.RECEIVED))).toBe(
        false
      );
      expect(isPokemonInactive(createTestPokemon(PokemonStatus.TRADED))).toBe(
        false
      );
    });

    it('should return false for pokemon with missed status', () => {
      expect(isPokemonInactive(createTestPokemon(PokemonStatus.MISSED))).toBe(
        false
      );
    });

    it('should return false for pokemon with no status', () => {
      expect(isPokemonInactive(createTestPokemon(undefined))).toBe(false);
    });

    it('should return false for null pokemon', () => {
      expect(isPokemonInactive(null)).toBe(false);
    });

    it('should return false for undefined pokemon', () => {
      expect(isPokemonInactive(undefined)).toBe(false);
    });
  });

  describe('isPokemonDeceased', () => {
    it('should return true for pokemon with deceased status', () => {
      expect(isPokemonDeceased(createTestPokemon(PokemonStatus.DECEASED))).toBe(
        true
      );
    });

    it('should return false for pokemon with other statuses', () => {
      expect(isPokemonDeceased(createTestPokemon(PokemonStatus.CAPTURED))).toBe(
        false
      );
      expect(isPokemonDeceased(createTestPokemon(PokemonStatus.STORED))).toBe(
        false
      );
      expect(isPokemonDeceased(createTestPokemon(PokemonStatus.MISSED))).toBe(
        false
      );
    });

    it('should return false for pokemon with no status', () => {
      expect(isPokemonDeceased(createTestPokemon(undefined))).toBe(false);
    });

    it('should return false for null pokemon', () => {
      expect(isPokemonDeceased(null)).toBe(false);
    });

    it('should return false for undefined pokemon', () => {
      expect(isPokemonDeceased(undefined)).toBe(false);
    });
  });

  describe('isPokemonStored', () => {
    it('should return true for pokemon with stored status', () => {
      expect(isPokemonStored(createTestPokemon(PokemonStatus.STORED))).toBe(
        true
      );
    });

    it('should return false for pokemon with other statuses', () => {
      expect(isPokemonStored(createTestPokemon(PokemonStatus.CAPTURED))).toBe(
        false
      );
      expect(isPokemonStored(createTestPokemon(PokemonStatus.DECEASED))).toBe(
        false
      );
      expect(isPokemonStored(createTestPokemon(PokemonStatus.MISSED))).toBe(
        false
      );
    });

    it('should return false for pokemon with no status', () => {
      expect(isPokemonStored(createTestPokemon(undefined))).toBe(false);
    });

    it('should return false for null pokemon', () => {
      expect(isPokemonStored(null)).toBe(false);
    });

    it('should return false for undefined pokemon', () => {
      expect(isPokemonStored(undefined)).toBe(false);
    });
  });
});

describe('Fusion Status Categories', () => {
  describe('getFusionStatusCategory', () => {
    it('should return "none" for null status', () => {
      expect(getFusionStatusCategory(null)).toBe('none');
    });

    it('should return "none" for undefined status', () => {
      expect(getFusionStatusCategory(undefined)).toBe('none');
    });

    it('should return "active" for active statuses', () => {
      expect(getFusionStatusCategory(PokemonStatus.CAPTURED)).toBe('active');
      expect(getFusionStatusCategory(PokemonStatus.RECEIVED)).toBe('active');
      expect(getFusionStatusCategory(PokemonStatus.TRADED)).toBe('active');
    });

    it('should return "inactive" for inactive statuses', () => {
      expect(getFusionStatusCategory(PokemonStatus.DECEASED)).toBe('inactive');
      expect(getFusionStatusCategory(PokemonStatus.STORED)).toBe('inactive');
    });

    it('should return "missed" for missed status', () => {
      expect(getFusionStatusCategory(PokemonStatus.MISSED)).toBe('missed');
    });
  });
});

describe('Fusion Gating Predicates', () => {
  describe('canFuse', () => {
    it('should return false when head is null', () => {
      const body = createTestPokemon(PokemonStatus.CAPTURED);
      expect(canFuse(null, body)).toBe(false);
    });

    it('should return false when body is null', () => {
      const head = createTestPokemon(PokemonStatus.CAPTURED);
      expect(canFuse(head, null)).toBe(false);
    });

    it('should return false when both are null', () => {
      expect(canFuse(null, null)).toBe(false);
    });

    it('should return true when both have active status', () => {
      const head = createTestPokemon(PokemonStatus.CAPTURED);
      const body = createTestPokemon(PokemonStatus.CAPTURED);
      expect(canFuse(head, body)).toBe(true);
    });

    it('should return true when both have inactive status', () => {
      const head = createTestPokemon(PokemonStatus.DECEASED);
      const body = createTestPokemon(PokemonStatus.STORED);
      expect(canFuse(head, body)).toBe(true);
    });

    it('should return true when both have missed status', () => {
      const head = createTestPokemon(PokemonStatus.MISSED);
      const body = createTestPokemon(PokemonStatus.MISSED);
      expect(canFuse(head, body)).toBe(true);
    });

    it('should return false when statuses are different', () => {
      const head = createTestPokemon(PokemonStatus.CAPTURED);
      const body = createTestPokemon(PokemonStatus.DECEASED);
      expect(canFuse(head, body)).toBe(false);
    });

    it('should return false when head has no status and body is active', () => {
      const head = createTestPokemon(undefined);
      const body = createTestPokemon(PokemonStatus.CAPTURED);
      expect(canFuse(head, body)).toBe(false);
    });
  });

  describe('isFusionFullyActive', () => {
    it('should return true when both pokemon are active', () => {
      const head = createTestPokemon(PokemonStatus.CAPTURED);
      const body = createTestPokemon(PokemonStatus.CAPTURED);
      expect(isFusionFullyActive(head, body)).toBe(true);
    });

    it('should return false when only head is active', () => {
      const head = createTestPokemon(PokemonStatus.CAPTURED);
      const body = createTestPokemon(PokemonStatus.DECEASED);
      expect(isFusionFullyActive(head, body)).toBe(false);
    });

    it('should return false when only body is active', () => {
      const head = createTestPokemon(PokemonStatus.DECEASED);
      const body = createTestPokemon(PokemonStatus.CAPTURED);
      expect(isFusionFullyActive(head, body)).toBe(false);
    });

    it('should return false when neither is active', () => {
      const head = createTestPokemon(PokemonStatus.DECEASED);
      const body = createTestPokemon(PokemonStatus.STORED);
      expect(isFusionFullyActive(head, body)).toBe(false);
    });

    it('should return false when head is null', () => {
      const body = createTestPokemon(PokemonStatus.CAPTURED);
      expect(isFusionFullyActive(null, body)).toBe(false);
    });

    it('should return false when body is null', () => {
      const head = createTestPokemon(PokemonStatus.CAPTURED);
      expect(isFusionFullyActive(head, null)).toBe(false);
    });
  });

  describe('isFusionPartiallyActive', () => {
    it('should return true when only head is active', () => {
      const head = createTestPokemon(PokemonStatus.CAPTURED);
      const body = createTestPokemon(PokemonStatus.DECEASED);
      expect(isFusionPartiallyActive(head, body)).toBe(true);
    });

    it('should return true when only body is active', () => {
      const head = createTestPokemon(PokemonStatus.DECEASED);
      const body = createTestPokemon(PokemonStatus.CAPTURED);
      expect(isFusionPartiallyActive(head, body)).toBe(true);
    });

    it('should return false when both are active', () => {
      const head = createTestPokemon(PokemonStatus.CAPTURED);
      const body = createTestPokemon(PokemonStatus.CAPTURED);
      expect(isFusionPartiallyActive(head, body)).toBe(false);
    });

    it('should return false when neither is active', () => {
      const head = createTestPokemon(PokemonStatus.DECEASED);
      const body = createTestPokemon(PokemonStatus.STORED);
      expect(isFusionPartiallyActive(head, body)).toBe(false);
    });

    it('should return false when head is null', () => {
      const body = createTestPokemon(PokemonStatus.CAPTURED);
      expect(isFusionPartiallyActive(null, body)).toBe(true);
    });

    it('should return false when body is null', () => {
      const head = createTestPokemon(PokemonStatus.CAPTURED);
      expect(isFusionPartiallyActive(head, null)).toBe(true);
    });
  });

  describe('isFusionInactive', () => {
    it('should return true when neither pokemon is active', () => {
      const head = createTestPokemon(PokemonStatus.DECEASED);
      const body = createTestPokemon(PokemonStatus.STORED);
      expect(isFusionInactive(head, body)).toBe(true);
    });

    it('should return false when head is active', () => {
      const head = createTestPokemon(PokemonStatus.CAPTURED);
      const body = createTestPokemon(PokemonStatus.DECEASED);
      expect(isFusionInactive(head, body)).toBe(false);
    });

    it('should return false when body is active', () => {
      const head = createTestPokemon(PokemonStatus.DECEASED);
      const body = createTestPokemon(PokemonStatus.CAPTURED);
      expect(isFusionInactive(head, body)).toBe(false);
    });

    it('should return false when both are active', () => {
      const head = createTestPokemon(PokemonStatus.CAPTURED);
      const body = createTestPokemon(PokemonStatus.CAPTURED);
      expect(isFusionInactive(head, body)).toBe(false);
    });

    it('should return true when head is null', () => {
      const body = createTestPokemon(PokemonStatus.DECEASED);
      expect(isFusionInactive(null, body)).toBe(true);
    });

    it('should return true when body is null', () => {
      const head = createTestPokemon(PokemonStatus.DECEASED);
      expect(isFusionInactive(head, null)).toBe(true);
    });
  });

  describe('isFusionDeceased', () => {
    it('should return true when head is deceased (non-fusion mode)', () => {
      const head = createTestPokemon(PokemonStatus.DECEASED);
      const body = createTestPokemon(PokemonStatus.CAPTURED);
      expect(isFusionDeceased(head, body)).toBe(true);
    });

    it('should return true when body is deceased (non-fusion mode)', () => {
      const head = createTestPokemon(PokemonStatus.CAPTURED);
      const body = createTestPokemon(PokemonStatus.DECEASED);
      expect(isFusionDeceased(head, body)).toBe(true);
    });

    it('should return false when neither is deceased (non-fusion mode)', () => {
      const head = createTestPokemon(PokemonStatus.CAPTURED);
      const body = createTestPokemon(PokemonStatus.CAPTURED);
      expect(isFusionDeceased(head, body)).toBe(false);
    });

    it('should return true when both are deceased (fusion mode)', () => {
      const head = createTestPokemon(PokemonStatus.DECEASED);
      const body = createTestPokemon(PokemonStatus.DECEASED);
      expect(isFusionDeceased(head, body, true)).toBe(true);
    });

    it('should return false when only one is deceased (fusion mode)', () => {
      const head = createTestPokemon(PokemonStatus.DECEASED);
      const body = createTestPokemon(PokemonStatus.CAPTURED);
      expect(isFusionDeceased(head, body, true)).toBe(false);
    });

    it('should return false when neither is deceased (fusion mode)', () => {
      const head = createTestPokemon(PokemonStatus.CAPTURED);
      const body = createTestPokemon(PokemonStatus.CAPTURED);
      expect(isFusionDeceased(head, body, true)).toBe(false);
    });

    it('should handle null pokemon', () => {
      expect(
        isFusionDeceased(null, createTestPokemon(PokemonStatus.DECEASED))
      ).toBe(true);
      expect(
        isFusionDeceased(createTestPokemon(PokemonStatus.DECEASED), null)
      ).toBe(true);
      expect(isFusionDeceased(null, null)).toBe(false);
    });

    it('should handle undefined pokemon', () => {
      expect(
        isFusionDeceased(undefined, createTestPokemon(PokemonStatus.DECEASED))
      ).toBe(true);
      expect(
        isFusionDeceased(createTestPokemon(PokemonStatus.DECEASED), undefined)
      ).toBe(true);
      expect(isFusionDeceased(undefined, undefined)).toBe(false);
    });
  });
});
