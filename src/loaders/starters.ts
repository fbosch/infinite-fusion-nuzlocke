type StarterPokemon = { classic: number[]; remix: number[] };

function isStarterPokemon(value: unknown): value is StarterPokemon {
  if (typeof value !== "object" || value === null) return false;

  const candidate = value as { classic?: unknown; remix?: unknown };
  const isValidIds = (ids: unknown): ids is number[] =>
    Array.isArray(ids) && ids.every((id) => Number.isInteger(id) && id > 0);

  return isValidIds(candidate.classic) && isValidIds(candidate.remix);
}

// Cache for loaded data
let starterPokemonCache: StarterPokemon | null = null;

// Data loader for starter Pokémon
async function getStarterPokemon(): Promise<StarterPokemon> {
  if (starterPokemonCache) {
    return starterPokemonCache;
  }

  try {
    const starterPokemonData = await import(
      "@data/shared/starter-pokemon.json"
    );
    const data = starterPokemonData.default;
    if (!isStarterPokemon(data)) {
      throw new Error("Invalid starter Pokémon data format");
    }
    starterPokemonCache = data;
    return data;
  } catch (error) {
    console.error("Failed to validate starter Pokémon data:", error);
    throw new Error("Invalid starter Pokémon data format");
  }
}

// Get starter Pokémon for a specific game mode
export async function getStarterPokemonByGameMode(
  gameMode: "classic" | "remix",
): Promise<number[]> {
  const starters = await getStarterPokemon();
  return starters[gameMode];
}
