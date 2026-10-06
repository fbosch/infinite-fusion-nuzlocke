import {
  canFuse,
  isPokemonActive,
  isPokemonInactive,
  type PokemonOptionType,
} from "@/features/pokemon";

export interface DisplayPokemon {
  body: PokemonOptionType | null;
  head: PokemonOptionType | null;
  isFusion: boolean;
}

export function getDisplayPokemon(
  head: PokemonOptionType | null,
  body: PokemonOptionType | null,
  isFusion: boolean,
): DisplayPokemon {
  if (!(isFusion && head && body)) {
    return { body, head, isFusion };
  }

  if (canFuse(head, body)) {
    return { body, head, isFusion: true };
  }

  const headIsActive = isPokemonActive(head);
  const bodyIsActive = isPokemonActive(body);
  const headIsInactive = isPokemonInactive(head);
  const bodyIsInactive = isPokemonInactive(body);

  if (headIsActive && !bodyIsActive) {
    return { body: null, head, isFusion: false };
  }
  if (bodyIsActive && !headIsActive) {
    return { body, head: null, isFusion: false };
  }
  if (headIsInactive && !bodyIsInactive) {
    return { body: null, head, isFusion: false };
  }
  if (bodyIsInactive && headIsActive) {
    return { body: null, head, isFusion: false };
  }

  return { body: null, head, isFusion: false };
}
