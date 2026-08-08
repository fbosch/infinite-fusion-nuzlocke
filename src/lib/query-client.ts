// Re-export everything from the new modular structure
// This file is kept for backward compatibility with existing imports

// Re-export data utilities
export { encountersData, pokemonData } from "./data";
// Re-export queries and client
export {
  encountersQueries,
  pokemonQueries,
  queryClient,
} from "./queries";
