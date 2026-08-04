import type { TypeName } from "@/lib/typings";
import { getTypesForPokemon, type TypeQuery } from "@/lib/typings";
import { useAllPokemon } from "@/loaders/pokemon";

export interface UsePokemonTypesResult {
  primary?: TypeName;
  secondary?: TypeName;
  isLoading: boolean;
}

export function usePokemonTypes(
  query: TypeQuery | undefined,
): UsePokemonTypesResult {
  const { data: allPokemon = [], isLoading } = useAllPokemon(Boolean(query));

  if (!query) return { isLoading };
  if (!allPokemon || allPokemon.length === 0) return { isLoading: true };

  const resolveBy = (q: TypeQuery) => {
    if ("name" in q) {
      const p = allPokemon.find(
        (x) => x.name.toLowerCase() === q.name?.toLowerCase(),
      );
      return p ? getTypesForPokemon(p) : undefined;
    }
    if ("id" in q) {
      const p = allPokemon.find((x) => x.id === q.id);
      return p ? getTypesForPokemon(p) : undefined;
    }
    if ("nationalDexId" in q) {
      const p = allPokemon.find((x) => x.nationalDexId === q.nationalDexId);
      return p ? getTypesForPokemon(p) : undefined;
    }
    return undefined;
  };

  const types = resolveBy(query);
  return types ? { ...types, isLoading: false } : { isLoading };
}

export default usePokemonTypes;
