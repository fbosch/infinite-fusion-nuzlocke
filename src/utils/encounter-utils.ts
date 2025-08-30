import type { PokemonOptionType } from '@/loaders/pokemon';
import type { EncounterData } from '@/stores/playthroughs/types';

/**
 * Find a Pokémon by UID from all encounters (both head and body slots)
 */
export function findPokemonByUid(
  encounters: Record<string, EncounterData> | null | undefined,
  uid: string
): PokemonOptionType | null {
  if (!encounters) return null;

  for (const encounter of Object.values(encounters)) {
    if (encounter.head?.uid === uid) return encounter.head;
    if (encounter.body?.uid === uid) return encounter.body;
  }
  return null;
}

/**
 * Find a Pokémon by UID with its location information
 */
export function findPokemonWithLocation(
  encounters: Record<string, EncounterData> | null | undefined,
  uid: string
): { pokemon: PokemonOptionType; locationId: string } | null {
  if (!encounters) return null;

  for (const [locationId, encounter] of Object.entries(encounters)) {
    if (encounter.head?.uid === uid)
      return { pokemon: encounter.head, locationId };
    if (encounter.body?.uid === uid)
      return { pokemon: encounter.body, locationId };
  }
  return null;
}

/**
 * Get all available Pokémon from encounters with location info
 */
export function getAllPokemonWithLocations(
  encounters: Record<string, EncounterData> | null | undefined
): Array<{ pokemon: PokemonOptionType; locationId: string }> {
  if (!encounters) return [];

  return Object.entries(encounters).flatMap(([locationId, encounter]) => {
    const pokemon = [];
    
    // Always include head Pokémon
    if (encounter.head) pokemon.push({ pokemon: encounter.head, locationId });
    
    // Only include body Pokémon if this is actually a fusion (isFusion = true)
    // If isFusion = false, the body Pokémon doesn't exist as a valid option
    // and is only stored for UX reasons if the user retoggled the fusion
    if (encounter.body && encounter.isFusion) {
      pokemon.push({ pokemon: encounter.body, locationId });
    }
    
    return pokemon;
  });
}
