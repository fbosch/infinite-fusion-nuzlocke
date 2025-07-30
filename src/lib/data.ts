import { queryClient } from './client';
import { pokemonQueries } from './queries/pokemon';
import { encountersQueries } from './queries/encounters';
import { spriteQueries } from './queries/sprites';

// Utility functions for fetching data outside of React components
export const pokemonData = {
  getAllPokemon: () => queryClient.fetchQuery(pokemonQueries.all()),
  getPokemonById: (id: number) =>
    queryClient.fetchQuery(pokemonQueries.byId(id)),
  getPokemonByIds: (ids: number[]) =>
    queryClient.fetchQuery(pokemonQueries.byIds(ids)),
  getPokemonByType: (type: string) =>
    queryClient.fetchQuery(pokemonQueries.byType(type)),
};

export const encountersData = {
  getEncountersByGameMode: (gameMode: 'classic' | 'remix') =>
    queryClient.fetchQuery(encountersQueries.all(gameMode)),
  getAllEncounters: (gameMode: 'classic' | 'remix') =>
    queryClient
      .fetchQuery(encountersQueries.all(gameMode))
      .then(response => response.data),
};

export const spriteData = {
  getArtworkVariants: (headId?: number | null, bodyId?: number | null) =>
    queryClient.fetchQuery(spriteQueries.variants(headId, bodyId)),
};
