import type { PokemonOptionType } from "@/features/pokemon";
import type { EncounterData } from "./types";

export type PokemonUidIndex = Map<string, PokemonOptionType>;

export function buildPokemonUidIndex(
  encounters: Record<string, EncounterData> | null | undefined,
): PokemonUidIndex {
  "use memo";

  const pokemonByUid: PokemonUidIndex = new Map();

  if (!encounters) {
    return pokemonByUid;
  }

  for (const encounter of Object.values(encounters)) {
    if (encounter.head?.uid) {
      pokemonByUid.set(encounter.head.uid, encounter.head);
    }

    if (encounter.body?.uid) {
      pokemonByUid.set(encounter.body.uid, encounter.body);
    }
  }

  return pokemonByUid;
}
