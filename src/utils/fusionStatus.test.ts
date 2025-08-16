import { describe, it, expect } from 'vitest';
import { getFusionOverlayStatus, getFusionActivity } from './fusionStatus';
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

describe('getFusionOverlayStatus', () => {
  describe('missed status priority', () => {
    it('should return "missed" when head has missed status', () => {
      const head = createTestPokemon(PokemonStatus.MISSED);
      const body = createTestPokemon(PokemonStatus.CAPTURED);
      expect(getFusionOverlayStatus(head, body)).toBe('missed');
    });

    it('should return "missed" when body has missed status', () => {
      const head = createTestPokemon(PokemonStatus.CAPTURED);
      const body = createTestPokemon(PokemonStatus.MISSED);
      expect(getFusionOverlayStatus(head, body)).toBe('missed');
    });

    it('should return "missed" when both have missed status', () => {
      const head = createTestPokemon(PokemonStatus.MISSED);
      const body = createTestPokemon(PokemonStatus.MISSED);
      expect(getFusionOverlayStatus(head, body)).toBe('missed');
    });
  });

  describe('deceased status priority', () => {
    it('should return "deceased" when head has deceased status', () => {
      const head = createTestPokemon(PokemonStatus.DECEASED);
      const body = createTestPokemon(PokemonStatus.CAPTURED);
      expect(getFusionOverlayStatus(head, body)).toBe('deceased');
    });

    it('should return "deceased" when body has deceased status', () => {
      const head = createTestPokemon(PokemonStatus.CAPTURED);
      const body = createTestPokemon(PokemonStatus.DECEASED);
      expect(getFusionOverlayStatus(head, body)).toBe('deceased');
    });

    it('should return "deceased" when both have deceased status', () => {
      const head = createTestPokemon(PokemonStatus.DECEASED);
      const body = createTestPokemon(PokemonStatus.DECEASED);
      expect(getFusionOverlayStatus(head, body)).toBe('deceased');
    });

    it('should return "deceased" when head is deceased and body is stored', () => {
      const head = createTestPokemon(PokemonStatus.DECEASED);
      const body = createTestPokemon(PokemonStatus.STORED);
      expect(getFusionOverlayStatus(head, body)).toBe('deceased');
    });
  });

  describe('stored status priority', () => {
    it('should return "stored" when head has stored status', () => {
      const head = createTestPokemon(PokemonStatus.STORED);
      const body = createTestPokemon(PokemonStatus.CAPTURED);
      expect(getFusionOverlayStatus(head, body)).toBe('stored');
    });

    it('should return "stored" when body has stored status', () => {
      const head = createTestPokemon(PokemonStatus.CAPTURED);
      const body = createTestPokemon(PokemonStatus.STORED);
      expect(getFusionOverlayStatus(head, body)).toBe('stored');
    });

    it('should return "stored" when both have stored status', () => {
      const head = createTestPokemon(PokemonStatus.STORED);
      const body = createTestPokemon(PokemonStatus.STORED);
      expect(getFusionOverlayStatus(head, body)).toBe('stored');
    });
  });

  describe('normal status (active pokemon)', () => {
    it('should return "normal" when both have active status', () => {
      const head = createTestPokemon(PokemonStatus.CAPTURED);
      const body = createTestPokemon(PokemonStatus.CAPTURED);
      expect(getFusionOverlayStatus(head, body)).toBe('normal');
    });

    it('should return "normal" when head is captured and body is received', () => {
      const head = createTestPokemon(PokemonStatus.CAPTURED);
      const body = createTestPokemon(PokemonStatus.RECEIVED);
      expect(getFusionOverlayStatus(head, body)).toBe('normal');
    });

    it('should return "normal" when head is traded and body is captured', () => {
      const head = createTestPokemon(PokemonStatus.TRADED);
      const body = createTestPokemon(PokemonStatus.CAPTURED);
      expect(getFusionOverlayStatus(head, body)).toBe('normal');
    });
  });

  describe('null and undefined handling', () => {
    it('should return "normal" when both are null', () => {
      expect(getFusionOverlayStatus(null, null)).toBe('normal');
    });

    it('should return "normal" when both are undefined', () => {
      expect(getFusionOverlayStatus(undefined, undefined)).toBe('normal');
    });

    it('should return "normal" when head is null and body is undefined', () => {
      expect(getFusionOverlayStatus(null, undefined)).toBe('normal');
    });

    it('should return "normal" when head has no status and body has no status', () => {
      const head = createTestPokemon(undefined);
      const body = createTestPokemon(undefined);
      expect(getFusionOverlayStatus(head, body)).toBe('normal');
    });

    it('should return "normal" when head has no status and body is null', () => {
      const head = createTestPokemon(undefined);
      expect(getFusionOverlayStatus(head, null)).toBe('normal');
    });
  });

  describe('mixed status scenarios', () => {
    it('should prioritize missed over deceased', () => {
      const head = createTestPokemon(PokemonStatus.MISSED);
      const body = createTestPokemon(PokemonStatus.DECEASED);
      expect(getFusionOverlayStatus(head, body)).toBe('missed');
    });

    it('should prioritize missed over stored', () => {
      const head = createTestPokemon(PokemonStatus.MISSED);
      const body = createTestPokemon(PokemonStatus.STORED);
      expect(getFusionOverlayStatus(head, body)).toBe('missed');
    });

    it('should prioritize deceased over stored', () => {
      const head = createTestPokemon(PokemonStatus.DECEASED);
      const body = createTestPokemon(PokemonStatus.STORED);
      expect(getFusionOverlayStatus(head, body)).toBe('deceased');
    });

    it('should prioritize deceased over normal', () => {
      const head = createTestPokemon(PokemonStatus.DECEASED);
      const body = createTestPokemon(PokemonStatus.CAPTURED);
      expect(getFusionOverlayStatus(head, body)).toBe('deceased');
    });

    it('should prioritize stored over normal', () => {
      const head = createTestPokemon(PokemonStatus.STORED);
      const body = createTestPokemon(PokemonStatus.CAPTURED);
      expect(getFusionOverlayStatus(head, body)).toBe('stored');
    });
  });
});

describe('getFusionActivity', () => {
  describe('both active', () => {
    it('should return "both-active" when both pokemon are active', () => {
      const head = createTestPokemon(PokemonStatus.CAPTURED);
      const body = createTestPokemon(PokemonStatus.CAPTURED);
      expect(getFusionActivity(head, body)).toBe('both-active');
    });

    it('should return "both-active" when head is captured and body is received', () => {
      const head = createTestPokemon(PokemonStatus.CAPTURED);
      const body = createTestPokemon(PokemonStatus.RECEIVED);
      expect(getFusionActivity(head, body)).toBe('both-active');
    });

    it('should return "both-active" when head is traded and body is captured', () => {
      const head = createTestPokemon(PokemonStatus.TRADED);
      const body = createTestPokemon(PokemonStatus.CAPTURED);
      expect(getFusionActivity(head, body)).toBe('both-active');
    });
  });

  describe('one active', () => {
    it('should return "one-active" when only head is active', () => {
      const head = createTestPokemon(PokemonStatus.CAPTURED);
      const body = createTestPokemon(PokemonStatus.DECEASED);
      expect(getFusionActivity(head, body)).toBe('one-active');
    });

    it('should return "one-active" when only body is active', () => {
      const head = createTestPokemon(PokemonStatus.DECEASED);
      const body = createTestPokemon(PokemonStatus.CAPTURED);
      expect(getFusionActivity(head, body)).toBe('one-active');
    });

    it('should return "one-active" when only head is active (body is stored)', () => {
      const head = createTestPokemon(PokemonStatus.CAPTURED);
      const body = createTestPokemon(PokemonStatus.STORED);
      expect(getFusionActivity(head, body)).toBe('one-active');
    });

    it('should return "one-active" when only body is active (head is missed)', () => {
      const head = createTestPokemon(PokemonStatus.MISSED);
      const body = createTestPokemon(PokemonStatus.CAPTURED);
      expect(getFusionActivity(head, body)).toBe('one-active');
    });
  });

  describe('none active', () => {
    it('should return "none-active" when both pokemon are deceased', () => {
      const head = createTestPokemon(PokemonStatus.DECEASED);
      const body = createTestPokemon(PokemonStatus.DECEASED);
      expect(getFusionActivity(head, body)).toBe('none-active');
    });

    it('should return "none-active" when both pokemon are stored', () => {
      const head = createTestPokemon(PokemonStatus.STORED);
      const body = createTestPokemon(PokemonStatus.STORED);
      expect(getFusionActivity(head, body)).toBe('none-active');
    });

    it('should return "none-active" when both pokemon are missed', () => {
      const head = createTestPokemon(PokemonStatus.MISSED);
      const body = createTestPokemon(PokemonStatus.MISSED);
      expect(getFusionActivity(head, body)).toBe('none-active');
    });

    it('should return "none-active" when head is deceased and body is stored', () => {
      const head = createTestPokemon(PokemonStatus.DECEASED);
      const body = createTestPokemon(PokemonStatus.STORED);
      expect(getFusionActivity(head, body)).toBe('none-active');
    });

    it('should return "none-active" when head is missed and body is deceased', () => {
      const head = createTestPokemon(PokemonStatus.MISSED);
      const body = createTestPokemon(PokemonStatus.DECEASED);
      expect(getFusionActivity(head, body)).toBe('none-active');
    });
  });

  describe('null and undefined handling', () => {
    it('should return "none-active" when both are null', () => {
      expect(getFusionActivity(null, null)).toBe('none-active');
    });

    it('should return "none-active" when both are undefined', () => {
      expect(getFusionActivity(undefined, undefined)).toBe('none-active');
    });

    it('should return "none-active" when head is null and body is undefined', () => {
      expect(getFusionActivity(null, undefined)).toBe('none-active');
    });

    it('should return "none-active" when head has no status and body has no status', () => {
      const head = createTestPokemon(undefined);
      const body = createTestPokemon(undefined);
      expect(getFusionActivity(head, body)).toBe('none-active');
    });

    it('should return "none-active" when head has no status and body is null', () => {
      const head = createTestPokemon(undefined);
      expect(getFusionActivity(head, null)).toBe('none-active');
    });
  });

  describe('mixed scenarios', () => {
    it('should handle head with no status and active body', () => {
      const head = createTestPokemon(undefined);
      const body = createTestPokemon(PokemonStatus.CAPTURED);
      expect(getFusionActivity(head, body)).toBe('one-active');
    });

    it('should handle active head and body with no status', () => {
      const head = createTestPokemon(PokemonStatus.CAPTURED);
      const body = createTestPokemon(undefined);
      expect(getFusionActivity(head, body)).toBe('one-active');
    });

    it('should handle inactive head and active body', () => {
      const head = createTestPokemon(PokemonStatus.DECEASED);
      const body = createTestPokemon(PokemonStatus.CAPTURED);
      expect(getFusionActivity(head, body)).toBe('one-active');
    });

    it('should handle active head and inactive body', () => {
      const head = createTestPokemon(PokemonStatus.CAPTURED);
      const body = createTestPokemon(PokemonStatus.STORED);
      expect(getFusionActivity(head, body)).toBe('one-active');
    });
  });
});
