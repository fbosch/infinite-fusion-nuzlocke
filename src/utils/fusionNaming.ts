/**
 * Fusion Naming Utilities
 *
 * Utilities for generating and working with Pokémon fusion names
 * based on the head and body name parts from Pokemon data.
 */

import type { DexEntry } from '../../scripts/utils/data-loading-utils';

/**
 * Merges two strings, removing overlapping characters at the boundary
 * Only merges if there's exactly a 1-character overlap
 * Example: mergeOverlappingStrings("Sphe", "eal") = "Spheal" (1-char overlap: "e")
 * Example: mergeOverlappingStrings("Rapi", "pius") = "Rapipius" (2-char overlap: "pi" - no merge)
 */
function mergeOverlappingStrings(str1: string, str2: string): string {
  // Only merge if there's exactly a 1-character overlap
  // If overlap is more than 1 character, don't merge (just concatenate)

  // Check for 1-character overlap first
  if (str1.length > 0 && str2.length > 0) {
    const lastChar = str1.slice(-1);
    const firstChar = str2.slice(0, 1);

    if (lastChar === firstChar) {
      // Found 1-character overlap - merge by removing the overlapping character from str2
      return str1 + str2.slice(1);
    }
  }

  // No 1-character overlap found - simple concatenation
  return str1 + str2;
}

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

  // Combine head part with body part using overlap-aware merging
  return mergeOverlappingStrings(
    headPokemon.headNamePart,
    bodyPokemon.bodyNamePart
  );
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

/**
 * Gets the display name for a fusion from PokemonOptionType objects
 * This is the UI-friendly version that works with the component system
 */
export function getFusionDisplayNameFromOptions(
  headPokemon: { id: number; name: string } | null,
  bodyPokemon: { id: number; name: string } | null,
  getPokemonById: (id: number) => DexEntry | undefined,
  useFusionNames: boolean = true
): string {
  if (!headPokemon || !bodyPokemon) {
    return headPokemon?.name || bodyPokemon?.name || '';
  }

  const headDexEntry = getPokemonById(headPokemon.id);
  const bodyDexEntry = getPokemonById(bodyPokemon.id);

  if (!headDexEntry || !bodyDexEntry) {
    return `${headPokemon.name}/${bodyPokemon.name}`;
  }

  return getFusionDisplayName(headDexEntry, bodyDexEntry, useFusionNames);
}

/**
 * Gets the display name for a fusion from PokemonOptionType objects (non-hook version)
 * This is for use in contexts where hooks cannot be used
 */
export function getFusionDisplayNameFromOptionsSync(
  headPokemon: { id: number; name: string; nickname?: string } | null,
  bodyPokemon: { id: number; name: string; nickname?: string } | null,
  isFusion: boolean,
  getPokemonById: (id: number) => DexEntry | undefined
): string {
  if (!isFusion) {
    // Single Pokémon - show nickname if available, otherwise show name
    const pokemon = headPokemon || bodyPokemon;
    if (!pokemon) return '';
    return pokemon.nickname || pokemon.name;
  }

  // Fusion case
  if (!headPokemon || !bodyPokemon) {
    const pokemon = headPokemon || bodyPokemon;
    if (!pokemon) return '';
    return pokemon.nickname || pokemon.name;
  }

  // For fusions, always prioritize head Pokémon nickname if it exists
  if (headPokemon.nickname) {
    return headPokemon.nickname;
  }

  // If no head nickname, fall back to body nickname
  if (bodyPokemon.nickname) {
    return bodyPokemon.nickname;
  }

  // If neither has a nickname, generate the fusion name
  return getFusionDisplayNameFromOptions(
    headPokemon,
    bodyPokemon,
    getPokemonById
  );
}
