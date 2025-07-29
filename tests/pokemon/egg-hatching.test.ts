import { describe, it, expect } from 'vitest';
import { isEgg } from '@/loaders/pokemon';

// Mock the Pokemon data types
interface PokemonOptionType {
  id: number;
  name: string;
  nationalDexId: number;
  nickname?: string;
  status?: string;
  uid?: string;
}

describe('Egg Hatching Logic', () => {
  it('should identify eggs correctly', () => {
    const eggPokemon: PokemonOptionType = {
      id: -1,
      name: 'Egg',
      nationalDexId: -1,
      nickname: 'MyEgg',
      status: 'captured',
      uid: 'egg--1',
    };

    const regularPokemon: PokemonOptionType = {
      id: 1,
      name: 'Bulbasaur',
      nationalDexId: 1,
      nickname: 'Bulby',
      status: 'captured',
      uid: 'bulbasaur-1',
    };

    expect(isEgg(eggPokemon)).toBe(true);
    expect(isEgg(regularPokemon)).toBe(false);
  });

  it('should detect egg hatching scenario', () => {
    const eggPokemon: PokemonOptionType = {
      id: -1,
      name: 'Egg',
      nationalDexId: -1,
      nickname: 'MyEgg',
      status: 'captured',
      uid: 'egg--1',
    };

    const newPokemon: PokemonOptionType = {
      id: 1,
      name: 'Bulbasaur',
      nationalDexId: 1,
      uid: 'bulbasaur-1',
    };

    const isEggHatching = isEgg(eggPokemon) && !isEgg(newPokemon);
    expect(isEggHatching).toBe(true);
  });

  it('should preserve nickname and status when hatching egg', () => {
    const eggPokemon: PokemonOptionType = {
      id: -1,
      name: 'Egg',
      nationalDexId: -1,
      nickname: 'MyEgg',
      status: 'captured',
      uid: 'egg--1',
    };

    const newPokemon: PokemonOptionType = {
      id: 1,
      name: 'Bulbasaur',
      nationalDexId: 1,
      uid: 'bulbasaur-1',
    };

    // Simulate the egg hatching logic
    const isEggHatching = isEgg(eggPokemon) && !isEgg(newPokemon);
    let finalValue = newPokemon;

    if (isEggHatching) {
      finalValue = {
        ...newPokemon,
        nickname: eggPokemon.nickname || newPokemon.nickname,
        status: eggPokemon.status || newPokemon.status,
      };
    }

    expect(finalValue).toEqual({
      id: 1,
      name: 'Bulbasaur',
      nationalDexId: 1,
      nickname: 'MyEgg',
      status: 'captured',
      uid: 'bulbasaur-1',
    });
  });

  it('should not preserve nickname and status when replacing regular Pokémon', () => {
    const currentPokemon: PokemonOptionType = {
      id: 1,
      name: 'Bulbasaur',
      nationalDexId: 1,
      nickname: 'Bulby',
      status: 'captured',
      uid: 'bulbasaur-1',
    };

    const newPokemon: PokemonOptionType = {
      id: 2,
      name: 'Ivysaur',
      nationalDexId: 2,
      uid: 'ivysaur-2',
    };

    // Simulate the regular replacement logic
    const isEggHatching = isEgg(currentPokemon) && !isEgg(newPokemon);
    let finalValue = newPokemon;

    if (isEggHatching) {
      finalValue = {
        ...newPokemon,
        nickname: currentPokemon.nickname || newPokemon.nickname,
        status: currentPokemon.status || newPokemon.status,
      };
    }

    // Should not preserve nickname and status since it's not an egg hatching
    expect(finalValue).toEqual(newPokemon);
  });

  it('should handle egg hatching with undefined nickname and status', () => {
    const eggPokemon: PokemonOptionType = {
      id: -1,
      name: 'Egg',
      nationalDexId: -1,
      uid: 'egg--1',
    };

    const newPokemon: PokemonOptionType = {
      id: 1,
      name: 'Bulbasaur',
      nationalDexId: 1,
      nickname: 'Bulby',
      status: 'captured',
      uid: 'bulbasaur-1',
    };

    // Simulate the egg hatching logic
    const isEggHatching = isEgg(eggPokemon) && !isEgg(newPokemon);
    let finalValue = newPokemon;

    if (isEggHatching) {
      finalValue = {
        ...newPokemon,
        nickname: eggPokemon.nickname || newPokemon.nickname,
        status: eggPokemon.status || newPokemon.status,
      };
    }

    // Should keep the new Pokémon's nickname and status since egg has none
    expect(finalValue).toEqual({
      id: 1,
      name: 'Bulbasaur',
      nationalDexId: 1,
      nickname: 'Bulby',
      status: 'captured',
      uid: 'bulbasaur-1',
    });
  });
});
