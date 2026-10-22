import { scrollToLocationById } from "@/features/encounters";
import type { PokemonOptionType } from "@/features/pokemon";

export function scrollToPokemonEntry(
  locationId: string,
  headPokemon: PokemonOptionType | null,
  bodyPokemon: PokemonOptionType | null,
) {
  const highlightUids = [headPokemon?.uid, bodyPokemon?.uid].filter(
    (uid): uid is string => Boolean(uid),
  );

  scrollToLocationById(locationId, {
    behavior: "smooth",
    durationMs: 1200,
    highlightUids,
  });
}
