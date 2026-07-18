import type { PokemonOptionType } from "@/loaders/pokemon";
import { scrollToLocationById } from "@/utils/scrollToLocation";

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
    highlightUids,
    durationMs: 1200,
  });
}
