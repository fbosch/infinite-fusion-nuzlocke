import {
  PokemonStatus,
  type PokemonOptionType,
  type PokemonStatusType,
} from '@/loaders/pokemon';

// Status predicates (status-level)
export function isActiveStatus(
  status: PokemonStatusType | null | undefined
): boolean {
  return (
    status === PokemonStatus.CAPTURED ||
    status === PokemonStatus.RECEIVED ||
    status === PokemonStatus.STORED ||
    status === PokemonStatus.TRADED
  );
}

export function isDeceasedStatus(
  status: PokemonStatusType | null | undefined
): boolean {
  return status === PokemonStatus.DECEASED;
}

export function isStoredStatus(
  status: PokemonStatusType | null | undefined
): boolean {
  return status === PokemonStatus.STORED;
}

export function isMissedStatus(
  status: PokemonStatusType | null | undefined
): boolean {
  return status === PokemonStatus.MISSED;
}

export function isInactiveStatus(
  status: PokemonStatusType | null | undefined
): boolean {
  return isDeceasedStatus(status);
}

// Object-level predicates (pokemon-level)
export function isPokemonActive(pokemon: PokemonOptionType | null | undefined) {
  return isActiveStatus(pokemon?.status);
}

export function isPokemonInactive(
  pokemon: PokemonOptionType | null | undefined
) {
  return isInactiveStatus(pokemon?.status);
}

export function isPokemonDeceased(
  pokemon: PokemonOptionType | null | undefined
) {
  return isDeceasedStatus(pokemon?.status);
}

export function isPokemonStored(pokemon: PokemonOptionType | null | undefined) {
  return isStoredStatus(pokemon?.status);
}

// Fusion status categories to simplify gating logic
export type FusionStatusCategory = 'none' | 'active' | 'inactive' | 'missed';

export function getFusionStatusCategory(
  status: PokemonStatusType | null | undefined
): FusionStatusCategory {
  if (!status) return 'none';
  if (isActiveStatus(status)) return 'active';
  if (isInactiveStatus(status)) return 'inactive';
  if (isMissedStatus(status)) return 'missed';
  return 'none';
}

// Fusion gating predicate
export function canFuse(
  head: PokemonOptionType | null | undefined,
  body: PokemonOptionType | null | undefined
): boolean {
  if (!head || !body) return false;
  const headCategory = getFusionStatusCategory(head.status ?? null);
  const bodyCategory = getFusionStatusCategory(body.status ?? null);
  return headCategory === bodyCategory;
}

export function isFusionFullyActive(
  head: PokemonOptionType | null | undefined,
  body: PokemonOptionType | null | undefined
): boolean {
  const headActive = isPokemonActive(head);
  const bodyActive = isPokemonActive(body);
  return headActive && bodyActive;
}

export function isFusionPartiallyActive(
  head: PokemonOptionType | null | undefined,
  body: PokemonOptionType | null | undefined
): boolean {
  const headActive = isPokemonActive(head);
  const bodyActive = isPokemonActive(body);
  return (headActive || bodyActive) && !(headActive && bodyActive);
}

export function isFusionInactive(
  head: PokemonOptionType | null | undefined,
  body: PokemonOptionType | null | undefined
): boolean {
  return !isPokemonActive(head) && !isPokemonActive(body);
}

export function isFusionDeceased(
  head: PokemonOptionType | null | undefined,
  body: PokemonOptionType | null | undefined,
  isFusion?: boolean
): boolean {
  if (isFusion && head && body) {
    return isPokemonDeceased(head) && isPokemonDeceased(body);
  }
  return isPokemonDeceased(head) || isPokemonDeceased(body);
}
