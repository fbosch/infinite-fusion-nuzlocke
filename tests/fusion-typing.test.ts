import { describe, it, expect } from 'vitest';
import { computeFusionTypes, getFusionTyping } from '@/lib/typings';
import type { Pokemon } from '@/loaders/pokemon';

function makePokemon(
  nationalDexId: number,
  name: string,
  types: [string] | [string, string]
): Pokemon {
  // For tests, we set id == nationalDexId for simplicity
  return {
    id: nationalDexId,
    nationalDexId,
    name,
    types: types.map(t => ({ name: t.toLowerCase() })),
    species: {
      is_legendary: false,
      is_mythical: false,
      generation: null,
      evolution_chain: null,
    },
  } as Pokemon;
}

describe('fusionTyping (latest rules)', () => {
  it('uses head primary and body secondary by default', () => {
    const bulbasaur = makePokemon(1, 'Bulbasaur', ['grass', 'poison']);
    const nidoranM = makePokemon(32, 'Nidoran♂', ['poison', 'ground']);
    // head primary: grass, body secondary: ground
    expect(computeFusionTypes(bulbasaur, nidoranM)).toEqual([
      'grass',
      'ground',
    ]);
  });

  it('uses body primary if it has no secondary', () => {
    const bulbasaur = makePokemon(1, 'Bulbasaur', ['grass', 'poison']);
    const pikachu = makePokemon(25, 'Pikachu', ['electric']);
    expect(getFusionTyping(bulbasaur, pikachu)).toEqual({
      primary: 'grass',
      secondary: 'electric',
    });
  });

  it('avoids redundancy: Grimer/Oddish -> Poison/Grass', () => {
    const grimer = makePokemon(88, 'Grimer', ['poison']);
    const oddish = makePokemon(43, 'Oddish', ['grass', 'poison']);
    // Body would provide poison (secondary), but head already provides poison
    // so body falls back to primary (grass)
    expect(computeFusionTypes(grimer, oddish)).toEqual(['poison', 'grass']);
  });

  it('applies swapped types for Magnezone (Steel/Electric)', () => {
    const magnezone = makePokemon(462, 'Magnezone', ['electric', 'steel']);
    const pikachu = makePokemon(25, 'Pikachu', ['electric']);
    // Head should use swapped order => primary steel
    expect(computeFusionTypes(magnezone, pikachu)).toEqual([
      'steel',
      'electric',
    ]);
  });

  it('applies swapped types for Spiritomb (Dark/Ghost)', () => {
    const spiritomb = makePokemon(442, 'Spiritomb', ['ghost', 'dark']);
    const pikachu = makePokemon(25, 'Pikachu', ['electric']);
    expect(getFusionTyping(spiritomb, pikachu)).toEqual({
      primary: 'dark',
      secondary: 'electric',
    });
  });

  it('applies swapped types for Ferroseed/Ferrothorn (Steel/Grass)', () => {
    const ferroseed = makePokemon(597, 'Ferroseed', ['grass', 'steel']);
    const ferrothorn = makePokemon(598, 'Ferrothorn', ['grass', 'steel']);
    const pikachu = makePokemon(25, 'Pikachu', ['electric']);
    expect(computeFusionTypes(ferroseed, pikachu)).toEqual([
      'steel',
      'electric',
    ]);
    expect(computeFusionTypes(ferrothorn, pikachu)).toEqual([
      'steel',
      'electric',
    ]);
  });

  it('applies swapped types for Phantump/Trevenant (Grass/Ghost)', () => {
    const phantump = makePokemon(708, 'Phantump', ['ghost', 'grass']);
    const trevenant = makePokemon(709, 'Trevenant', ['ghost', 'grass']);
    const pikachu = makePokemon(25, 'Pikachu', ['electric']);
    expect(computeFusionTypes(phantump, pikachu)).toEqual([
      'grass',
      'electric',
    ]);
    expect(computeFusionTypes(trevenant, pikachu)).toEqual([
      'grass',
      'electric',
    ]);
  });

  it('applies swapped types for Sandygast/Palossand (Ground/Ghost)', () => {
    const sandygast = makePokemon(769, 'Sandygast', ['ghost', 'ground']);
    const palossand = makePokemon(770, 'Palossand', ['ghost', 'ground']);
    const pikachu = makePokemon(25, 'Pikachu', ['electric']);
    expect(computeFusionTypes(sandygast, pikachu)).toEqual([
      'ground',
      'electric',
    ]);
    expect(computeFusionTypes(palossand, pikachu)).toEqual([
      'ground',
      'electric',
    ]);
  });

  it('Normal/Flying dominant rule: body always passes Flying', () => {
    const bulbasaur = makePokemon(1, 'Bulbasaur', ['grass', 'poison']);
    const pidgeot = makePokemon(18, 'Pidgeot', ['normal', 'flying']);
    expect(computeFusionTypes(bulbasaur, pidgeot)).toEqual(['grass', 'flying']);
  });

  it('Normal/Flying dominant rule: head passes Flying as primary', () => {
    const pidgeot = makePokemon(18, 'Pidgeot', ['normal', 'flying']);
    const pikachu = makePokemon(25, 'Pikachu', ['electric']);
    expect(getFusionTyping(pidgeot, pikachu)).toEqual({
      primary: 'flying',
      secondary: 'electric',
    });
  });
});
