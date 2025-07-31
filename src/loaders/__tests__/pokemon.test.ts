import { describe, it, expect, vi } from 'vitest';
import {
  getPokemon,
  searchPokemon,
  getPokemonEvolutionIds,
  getPokemonPreEvolutionId,
} from '../pokemon';

// Mock the query client and SearchCore
vi.mock('@/lib/queryClient', () => {
  const mockPokemonData = [
    {
      id: 1,
      nationalDexId: 1,
      name: 'Bulbasaur',
      types: [{ name: 'grass' }, { name: 'poison' }],
      evolution: {
        evolves_to: [{ id: 2 }],
        evolves_from: null,
      },
    },
    {
      id: 2,
      nationalDexId: 2,
      name: 'Ivysaur',
      types: [{ name: 'grass' }, { name: 'poison' }],
      evolution: {
        evolves_to: [{ id: 3 }],
        evolves_from: { id: 1 },
      },
    },
    {
      id: 3,
      nationalDexId: 3,
      name: 'Venusaur',
      types: [{ name: 'grass' }, { name: 'poison' }],
      evolution: {
        evolves_to: [],
        evolves_from: { id: 2 },
      },
    },
    {
      id: 25,
      nationalDexId: 25,
      name: 'Pikachu',
      types: [{ name: 'electric' }],
      evolution: {
        evolves_to: [{ id: 26 }],
        evolves_from: null,
      },
    },
    {
      id: 26,
      nationalDexId: 26,
      name: 'Raichu',
      types: [{ name: 'electric' }],
      evolution: {
        evolves_to: [],
        evolves_from: { id: 25 },
      },
    },
    {
      id: 133,
      nationalDexId: 133,
      name: 'Eevee',
      types: [{ name: 'normal' }],
      evolution: {
        evolves_to: [
          { id: 134 }, // Vaporeon
          { id: 135 }, // Jolteon
          { id: 136 }, // Flareon
        ],
        evolves_from: null,
      },
    },
    {
      id: 134,
      nationalDexId: 134,
      name: 'Vaporeon',
      types: [{ name: 'water' }],
      evolution: {
        evolves_to: [],
        evolves_from: { id: 133 },
      },
    },
    {
      id: 135,
      nationalDexId: 135,
      name: 'Jolteon',
      types: [{ name: 'electric' }],
      evolution: {
        evolves_to: [],
        evolves_from: { id: 133 },
      },
    },
    {
      id: 136,
      nationalDexId: 136,
      name: 'Flareon',
      types: [{ name: 'fire' }],
      evolution: {
        evolves_to: [],
        evolves_from: { id: 133 },
      },
    },
  ];

  return {
    pokemonData: {
      getAllPokemon: vi.fn().mockResolvedValue(mockPokemonData),
      getPokemonById: vi
        .fn()
        .mockImplementation((id: number) =>
          Promise.resolve(mockPokemonData.find(p => p.id === id) || null)
        ),
      getPokemonByIds: vi
        .fn()
        .mockImplementation((ids: number[]) =>
          Promise.resolve(mockPokemonData.filter(p => ids.includes(p.id)))
        ),
      getPokemonByType: vi
        .fn()
        .mockImplementation((type: string) =>
          Promise.resolve(
            mockPokemonData.filter(p =>
              p.types.some(t => t.name === type.toLowerCase())
            )
          )
        ),
    },
  };
});

vi.mock('@/lib/searchCore', () => {
  return {
    SearchCore: vi.fn().mockImplementation(() => ({
      initialize: vi.fn().mockResolvedValue(undefined),
      search: vi.fn().mockImplementation((query: string) => {
        const mockPokemonData = [
          { id: 1, name: 'Bulbasaur', nationalDexId: 1 },
          { id: 2, name: 'Ivysaur', nationalDexId: 2 },
          { id: 3, name: 'Venusaur', nationalDexId: 3 },
          { id: 25, name: 'Pikachu', nationalDexId: 25 },
          { id: 26, name: 'Raichu', nationalDexId: 26 },
          { id: 133, name: 'Eevee', nationalDexId: 133 },
          { id: 134, name: 'Vaporeon', nationalDexId: 134 },
          { id: 135, name: 'Jolteon', nationalDexId: 135 },
          { id: 136, name: 'Flareon', nationalDexId: 136 },
        ];

        return mockPokemonData.filter(p =>
          p.name.toLowerCase().includes(query.toLowerCase())
        );
      }),
    })),
  };
});

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

  it('should get pre-evolution ID for specific Pokemon', async () => {
    // Test with Ivysaur - should devolve to Bulbasaur
    const ivysaurResults = await searchPokemon('Ivysaur');
    const ivysaurOption = ivysaurResults.find(p => p.name === 'Ivysaur');
    expect(ivysaurOption).toBeDefined();

    const preEvolutionId = await getPokemonPreEvolutionId(ivysaurOption!.id);
    expect(preEvolutionId).toBe(1); // Bulbasaur's ID

    // Test with Venusaur - should devolve to Ivysaur
    const venusaurResults = await searchPokemon('Venusaur');
    const venusaurOption = venusaurResults.find(p => p.name === 'Venusaur');
    expect(venusaurOption).toBeDefined();

    const venusaurPreEvolutionId = await getPokemonPreEvolutionId(
      venusaurOption!.id
    );
    expect(venusaurPreEvolutionId).toBe(2); // Ivysaur's ID

    // Test with Bulbasaur - should have no pre-evolution (base Pokemon)
    const bulbasaurResults = await searchPokemon('Bulbasaur');
    const bulbasaurOption = bulbasaurResults.find(p => p.name === 'Bulbasaur');
    expect(bulbasaurOption).toBeDefined();

    const bulbasaurPreEvolutionId = await getPokemonPreEvolutionId(
      bulbasaurOption!.id
    );
    expect(bulbasaurPreEvolutionId).toBe(null); // No pre-evolution
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
