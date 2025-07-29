import { describe, it, expect } from 'vitest';
import {
  isEgg,
  createEggEncounter,
  getEncounterDisplayName,
} from '@/loaders/pokemon';
import type { PokemonOptionType } from '@/loaders/pokemon';

describe('Egg Pokemon functionality', () => {
  it('should identify Egg Pokemon correctly', () => {
    const eggPokemon: PokemonOptionType = {
      id: -1,
      name: 'Egg',
      nationalDexId: -1,
    };

    const regularPokemon: PokemonOptionType = {
      id: 1,
      name: 'Bulbasaur',
      nationalDexId: 1,
    };

    expect(isEgg(eggPokemon)).toBe(true);
    expect(isEgg(regularPokemon)).toBe(false);
  });

  it('should create Egg encounter correctly', () => {
    const eggEncounter = createEggEncounter('route-1', 'My Egg');

    expect(eggEncounter.id).toBe(-1);
    expect(eggEncounter.name).toBe('Egg');
    expect(eggEncounter.nationalDexId).toBe(-1);
    expect(eggEncounter.nickname).toBe('My Egg');
    expect(eggEncounter.originalLocation).toBe('route-1');
    expect(eggEncounter.uid).toBeDefined();
  });

  it('should get correct display name for Egg encounters', () => {
    const eggWithNickname: PokemonOptionType = {
      id: -1,
      name: 'Egg',
      nationalDexId: -1,
      nickname: 'My Egg',
    };

    const eggWithoutNickname: PokemonOptionType = {
      id: -1,
      name: 'Egg',
      nationalDexId: -1,
    };

    const regularPokemon: PokemonOptionType = {
      id: 1,
      name: 'Bulbasaur',
      nationalDexId: 1,
      nickname: 'Bulby',
    };

    expect(getEncounterDisplayName(eggWithNickname)).toBe('My Egg');
    expect(getEncounterDisplayName(eggWithoutNickname)).toBe('Egg');
    expect(getEncounterDisplayName(regularPokemon)).toBe('Bulby');
  });

  it('should detect egg hatching correctly', () => {
    const eggPokemon: PokemonOptionType = {
      id: -1,
      name: 'Egg',
      nationalDexId: -1,
      nickname: 'My Egg',
    };

    const hatchedPokemon: PokemonOptionType = {
      id: 1,
      name: 'Bulbasaur',
      nationalDexId: 1,
      nickname: 'Bulby',
    };

    // Egg hatching: replacing egg with regular pokemon
    expect(isEgg(eggPokemon) && !isEgg(hatchedPokemon)).toBe(true);

    // Regular replacement: replacing regular pokemon with another
    expect(isEgg(hatchedPokemon) && !isEgg(eggPokemon)).toBe(false);

    // Egg to egg: should not be considered hatching
    const anotherEgg: PokemonOptionType = {
      id: -1,
      name: 'Egg',
      nationalDexId: -1,
      nickname: 'Another Egg',
    };
    expect(isEgg(eggPokemon) && !isEgg(anotherEgg)).toBe(false);
  });
});
