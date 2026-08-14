import type { PokemonOptionType } from "@/features/pokemon";
import type { EncounterData } from "./types";

export function findPokemonByUid(
  encounters: Record<string, EncounterData> | null | undefined,
  uid: string,
  pokemonByUid?: ReadonlyMap<string, PokemonOptionType>,
): PokemonOptionType | null {
  const indexedPokemon = pokemonByUid?.get(uid);
  if (indexedPokemon) {
    return indexedPokemon;
  }

  if (!encounters) {
    return null;
  }

  for (const encounter of Object.values(encounters)) {
    if (encounter.head?.uid === uid) {
      return encounter.head;
    }
    if (encounter.body?.uid === uid) {
      return encounter.body;
    }
  }

  return null;
}
