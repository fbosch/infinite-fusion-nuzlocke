import type { PokemonOptionType } from '@/loaders/pokemon';
import {
  isMissedStatus,
  isDeceasedStatus,
  isStoredStatus,
  isPokemonActive,
} from '@/utils/pokemonPredicates';

export type FusionOverlayStatus = 'normal' | 'missed' | 'deceased' | 'stored';

export function getFusionOverlayStatus(
  head: PokemonOptionType | null | undefined,
  body: PokemonOptionType | null | undefined
): FusionOverlayStatus {
  const headStatus = head?.status ?? null;
  const bodyStatus = body?.status ?? null;

  if (isMissedStatus(headStatus) || isMissedStatus(bodyStatus)) return 'missed';
  if (isDeceasedStatus(headStatus) || isDeceasedStatus(bodyStatus))
    return 'deceased';
  if (isStoredStatus(headStatus) || isStoredStatus(bodyStatus)) return 'stored';
  return 'normal';
}

export type FusionActivity = 'none-active' | 'one-active' | 'both-active';

export function getFusionActivity(
  head: PokemonOptionType | null | undefined,
  body: PokemonOptionType | null | undefined
): FusionActivity {
  const headActive = isPokemonActive(head);
  const bodyActive = isPokemonActive(body);
  if (headActive && bodyActive) return 'both-active';
  if (headActive || bodyActive) return 'one-active';
  return 'none-active';
}
