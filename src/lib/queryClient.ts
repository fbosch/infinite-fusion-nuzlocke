// Re-export everything from the new modular structure
// This file is kept for backward compatibility with existing imports

// Re-export queries and client
export {
  pokemonQueries,
  pokemonKeys,
  encountersQueries,
  encountersKeys,
  spriteQueries,
  spriteKeys,
  queryClient,
} from './queries';

// Re-export data utilities
export { pokemonData, encountersData, spriteData } from './data';
