/**
 * Fusion Naming Utilities
 *
 * Utilities for generating and working with Pokémon fusion names
 * based on the head and body name parts from base entries.
 */

import type { DexEntry } from '../../scripts/utils/data-loading-utils';

/**
 * Generates a fusion name from head and body Pokémon
 */
export function generateFusionName(
  headPokemon: DexEntry,
  bodyPokemon: DexEntry
): string {
  // If either Pokémon doesn't have name parts, fall back to the old format
  if (!headPokemon.headNamePart || !bodyPokemon.bodyNamePart) {
    return `${headPokemon.name}/${bodyPokemon.name}`;
  }

  // Combine head part with body part
  return `${headPokemon.headNamePart}${bodyPokemon.bodyNamePart}`;
}

/**
 * Generates a fusion name from head and body Pokémon IDs
 * Requires a lookup function to get the Pokémon data
 */
export function generateFusionNameByIds(
  headId: number,
  bodyId: number,
  getPokemonById: (id: number) => DexEntry | undefined
): string {
  const headPokemon = getPokemonById(headId);
  const bodyPokemon = getPokemonById(bodyId);

  if (!headPokemon || !bodyPokemon) {
    return `Unknown/${headId}.${bodyId}`;
  }

  return generateFusionName(headPokemon, bodyPokemon);
}

/**
 * Checks if a Pokémon has fusion name parts available
 */
export function hasFusionNameParts(pokemon: DexEntry): boolean {
  return !!(pokemon.headNamePart && pokemon.bodyNamePart);
}

/**
 * Gets the display name for a fusion, with fallback to old format
 */
export function getFusionDisplayName(
  headPokemon: DexEntry,
  bodyPokemon: DexEntry,
  useFusionNames: boolean = true
): string {
  if (
    useFusionNames &&
    hasFusionNameParts(headPokemon) &&
    hasFusionNameParts(bodyPokemon)
  ) {
    return generateFusionName(headPokemon, bodyPokemon);
  }

  return `${headPokemon.name}/${bodyPokemon.name}`;
}
