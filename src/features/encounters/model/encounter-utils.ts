import type { EncounterData } from "@/features/playthroughs";
import { type PokemonOptionType, PokemonStatus } from "@/features/pokemon";

/**
 * Find a Pokémon by UID with its location information
 */
export function findPokemonWithLocation(
  encounters: Record<string, EncounterData> | null | undefined,
  uid: string,
): { pokemon: PokemonOptionType; locationId: string } | null {
  if (!encounters) {
    return null;
  }

  for (const [locationId, encounter] of Object.entries(encounters)) {
    if (encounter.head?.uid === uid) {
      return { locationId, pokemon: encounter.head };
    }
    if (encounter.body?.uid === uid) {
      return { locationId, pokemon: encounter.body };
    }
  }
  return null;
}

/**
 * Get all available Pokémon from encounters with location info
 */
export function getAllPokemonWithLocations(
  encounters: Record<string, EncounterData> | null | undefined,
): Array<{ pokemon: PokemonOptionType; locationId: string }> {
  if (!encounters) {
    return [];
  }

  return Object.entries(encounters).flatMap(([locationId, encounter]) => {
    const pokemon: Array<{ pokemon: PokemonOptionType; locationId: string }> =
      [];

    // Always include head Pokémon
    if (encounter.head) {
      pokemon.push({ locationId, pokemon: encounter.head });
    }

    // Only include body Pokémon if this is actually a fusion (isFusion = true)
    // If isFusion = false, the body Pokémon doesn't exist as a valid option
    // and is only stored for UX reasons if the user retoggled the fusion
    if (encounter.body && encounter.isFusion) {
      pokemon.push({ locationId, pokemon: encounter.body });
    }

    return pokemon;
  });
}

function wasOriginallyCaptured(
  pokemon: PokemonOptionType | null | undefined,
): pokemon is PokemonOptionType {
  if (!pokemon) {
    return false;
  }

  if (pokemon.originalReceivalStatus) {
    return pokemon.originalReceivalStatus === PokemonStatus.CAPTURED;
  }

  return (
    pokemon.status === PokemonStatus.CAPTURED ||
    pokemon.status === PokemonStatus.STORED ||
    pokemon.status === PokemonStatus.DECEASED
  );
}

export function buildCapturedSpeciesIdSet(
  encounters: Record<string, EncounterData> | null | undefined,
): Set<number> {
  const capturedSpeciesIds = new Set<number>();

  if (!encounters) {
    return capturedSpeciesIds;
  }

  for (const encounter of Object.values(encounters)) {
    if (wasOriginallyCaptured(encounter.head)) {
      capturedSpeciesIds.add(encounter.head.id);
    }

    if (encounter.isFusion && wasOriginallyCaptured(encounter.body)) {
      capturedSpeciesIds.add(encounter.body.id);
    }
  }

  return capturedSpeciesIds;
}
