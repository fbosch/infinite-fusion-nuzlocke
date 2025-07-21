import { describe, it, expect } from 'vitest';
import { getPokemon, searchPokemon, getPokemonEvolutionIds } from '../pokemon';

describe('Pokemon Loader with Evolution Data', () => {
  it('should get evolution IDs for specific Pokemon', async () => {
    const pokemon = await getPokemon();

    // Find a Pokemon with evolution data (Bulbasaur evolves to Ivysaur)
    const bulbasaur = pokemon.find(p => p.name === 'Bulbasaur');
    expect(bulbasaur).toBeDefined();
    expect(bulbasaur?.evolution?.evolves_to).toBeDefined();
    expect(bulbasaur?.evolution?.evolves_to.length).toBeGreaterThan(0);

    // Test that searchPokemon returns basic PokemonOption objects
    const searchResults = await searchPokemon('Bulbasaur');
    expect(searchResults.length).toBeGreaterThan(0);

    const bulbasaurOption = searchResults.find(p => p.name === 'Bulbasaur');
    expect(bulbasaurOption).toBeDefined();
    expect(bulbasaurOption?.id).toBeDefined();
    expect(bulbasaurOption?.name).toBeDefined();
    expect(bulbasaurOption?.nationalDexId).toBeDefined();

    // Test getting evolution IDs separately
    const evolutionIds = await getPokemonEvolutionIds(bulbasaurOption!.id);
    expect(evolutionIds).toEqual([2]); // Ivysaur's ID

    // Test a Pokemon without evolutions (Venusaur is final evolution)
    const venusaurResults = await searchPokemon('Venusaur');
    const venusaurOption = venusaurResults.find(p => p.name === 'Venusaur');
    expect(venusaurOption).toBeDefined();

    const venusaurEvolutionIds = await getPokemonEvolutionIds(
      venusaurOption!.id
    );
    expect(venusaurEvolutionIds).toEqual([]); // No evolutions
  });

  it('should handle Pokemon with multiple evolution options', async () => {
    // Eevee has multiple evolution options
    const searchResults = await searchPokemon('Eevee');
    const eeveeOption = searchResults.find(p => p.name === 'Eevee');

    expect(eeveeOption).toBeDefined();

    // Test getting evolution IDs separately
    const evolutionIds = await getPokemonEvolutionIds(eeveeOption!.id);
    expect(evolutionIds.length).toBeGreaterThan(1); // Multiple evolutions

    // Check that it includes some known Eevee evolutions
    const expectedEvolutions = [134, 135, 136]; // Vaporeon, Jolteon, Flareon
    expectedEvolutions.forEach(evolutionId => {
      expect(evolutionIds).toContain(evolutionId);
    });
  });

  it('should handle Pokemon with no evolution data', async () => {
    // Some Pokemon might not have evolution data
    const searchResults = await searchPokemon('Pikachu');
    const pikachuOption = searchResults.find(p => p.name === 'Pikachu');

    expect(pikachuOption).toBeDefined();
    // Pikachu should have evolution data (evolves to Raichu)
    const evolutionIds = await getPokemonEvolutionIds(pikachuOption!.id);
    expect(evolutionIds).toEqual([26]); // Raichu's ID
  });
});
