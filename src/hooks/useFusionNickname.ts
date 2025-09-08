import { useMemo } from 'react';
import { type PokemonOptionType } from '@/loaders/pokemon';
import { useBaseEntries } from './useBaseEntries';
import { getFusionDisplayNameFromOptions } from '@/utils/fusionNaming';

export function useFusionNickname(
  head: PokemonOptionType | null,
  body: PokemonOptionType | null,
  isFusion: boolean
): string {
  const { getBaseEntryById } = useBaseEntries();

  return useMemo(() => {
    if (!isFusion) {
      // Single Pokémon - show nickname if available, otherwise show name
      const pokemon = head || body;
      if (!pokemon) return '';
      return pokemon.nickname || pokemon.name;
    }

    // Fusion case
    if (!head || !body) {
      const pokemon = head || body;
      if (!pokemon) return '';
      return pokemon.nickname || pokemon.name;
    }

    // For fusions, always prioritize head Pokémon nickname if it exists
    if (head.nickname) {
      return head.nickname;
    }

    // If no head nickname, fall back to body nickname
    if (body.nickname) {
      return body.nickname;
    }

    // If neither has a nickname, generate the fusion name
    return getFusionDisplayNameFromOptions(head, body, getBaseEntryById);
  }, [head, body, isFusion, getBaseEntryById]);
}
