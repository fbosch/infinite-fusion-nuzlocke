import type { PokemonOptionType } from '@/loaders/pokemon';
import { canFuse, isPokemonActive } from './pokemonPredicates';

export interface FusionTypeQuery {
  head?: { id: number } | null;
  body?: { id: number } | null;
  isFusion: boolean;
}

/**
 * Creates a clean query object for useFusionTypes based on fusion state and Pokémon data.
 * This centralizes the complex conditional logic that was previously duplicated across components.
 */
export function createFusionTypeQuery(
  head: PokemonOptionType | null,
  body: PokemonOptionType | null,
  isFusion: boolean
): FusionTypeQuery {
  // If it's a fusion and both Pokémon can fuse, include both
  if (isFusion && head && body && canFuse(head, body)) {
    return {
      head: head.id ? { id: head.id } : null,
      body: body.id ? { id: body.id } : null,
      isFusion: true,
    };
  }

  // If it's not a fusion or can't fuse, handle single Pokémon scenarios
  // Use XOR logic: if head exists, use head; if only body exists, use body
  if (head?.id) {
    return {
      head: { id: head.id },
      body: null,
      isFusion: false,
    };
  }

  if (body?.id) {
    return {
      head: { id: body.id }, // Use body ID in head slot for single Pokémon display
      body: null,
      isFusion: false,
    };
  }

  // Fallback: no valid Pokémon
  return {
    head: null,
    body: null,
    isFusion: false,
  };
}

/**
 * Determines if a fusion should be displayed based on Pokémon availability and fusion state.
 */
export function shouldShowFusion(
  head: PokemonOptionType | null,
  body: PokemonOptionType | null,
  isFusion: boolean
): boolean {
  return isFusion && Boolean(head && body && canFuse(head, body));
}

/**
 * Gets the primary Pokémon for display when fusion isn't possible.
 * Prioritizes active Pokémon over inactive ones.
 */
export function getPrimaryPokemon(
  head: PokemonOptionType | null,
  body: PokemonOptionType | null
): PokemonOptionType | null {
  if (!head && !body) return null;
  if (!head) return body;
  if (!body) return head;

  // If both exist, prefer the active one
  const headActive = isPokemonActive(head);
  const bodyActive = isPokemonActive(body);

  if (headActive && !bodyActive) return head;
  if (bodyActive && !headActive) return body;

  // If both have same status, default to head
  return head;
}
