import type { Pokemon } from '@/loaders/pokemon';

const ALL_TYPES = [
  'grass',
  'fire',
  'water',
  'electric',
  'ice',
  'fighting',
  'poison',
  'ground',
  'psychic',
  'bug',
  'rock',
  'ghost',
  'dragon',
  'dark',
  'steel',
  'fairy',
  'normal',
  'flying',
] as const;

type TypeName = (typeof ALL_TYPES)[number];

function isTypeName(value: string | undefined): value is TypeName {
  if (!value) return false;
  return (ALL_TYPES as readonly string[]).includes(value.toLowerCase());
}

function ensureTypeName(value: string | undefined): TypeName {
  const lowered = value?.toLowerCase();
  if (isTypeName(lowered)) return lowered;
  throw new Error(`Unknown Pokemon type: ${String(value)}`);
}

interface EffectiveTypes {
  primary: TypeName;
  secondary?: TypeName;
}

// Swapped type definitions for the latest ruleset (v6.3+).
// Keys are National Dex IDs; values are the effective [primary, secondary]
// type ordering used in fusion typing.
const latestSwappedTypeMap: Record<number, [TypeName, TypeName]> = {
  // Steel/Electric line
  81: ['steel', 'electric'], // Magnemite
  82: ['steel', 'electric'], // Magneton
  462: ['steel', 'electric'], // Magnezone (v6.1+)
  // Spiritomb
  442: ['dark', 'ghost'],
  // Ferroseed line (v6.3+)
  597: ['steel', 'grass'], // Ferroseed
  598: ['steel', 'grass'], // Ferrothorn
  // Phantump line (v6.3+)
  708: ['grass', 'ghost'], // Phantump
  709: ['grass', 'ghost'], // Trevenant
  // Sandygast line (v6.x)
  769: ['ground', 'ghost'], // Sandygast
  770: ['ground', 'ghost'], // Palossand
};

// Dominant type rule for latest ruleset: only Normal/Flying always passes Flying
function hasTypes(pokemon: Pokemon, a: TypeName, b: TypeName): boolean {
  const names = pokemon.types.map(t => t.name.toLowerCase());
  return names.includes(a) && names.includes(b);
}

function getDominantType(pokemon: Pokemon): TypeName | undefined {
  if (hasTypes(pokemon, 'normal', 'flying')) return 'flying';
  return undefined;
}

function getEffectiveTypeOrder(pokemon: Pokemon): EffectiveTypes {
  const id = pokemon.nationalDexId;
  const types = pokemon.types.map(t => t.name.toLowerCase());

  if (id in latestSwappedTypeMap) {
    const [p, s] = latestSwappedTypeMap[id]!;
    return { primary: p, secondary: s };
  }

  const primary = ensureTypeName(types[0]);
  const secondary = isTypeName(types[1]) ? (types[1] as TypeName) : undefined;
  return { primary, secondary };
}

/**
 * Compute fusion typing based on head/body species and version rules.
 * Latest rules (v6.3+):
 * - Head contributes its primary type (considering latest swaps and dominant overrides)
 * - Body contributes its secondary type if present, otherwise its primary
 * - If body wants to contribute the same type as the head, it falls back to its primary
 *   to avoid redundancy (unless a dominant rule mandates a specific contribution)
 */
export function computeFusionTypes(
  head: Pokemon,
  body: Pokemon
): [TypeName, TypeName] {
  const headOrder = getEffectiveTypeOrder(head);
  const bodyOrder = getEffectiveTypeOrder(body);

  // Dominant overrides (latest)
  const headDominant = getDominantType(head);
  const bodyDominant = getDominantType(body);

  const headType: TypeName = headDominant ?? headOrder.primary;

  // If a dominant rule applies to the body, it takes precedence and always passes that type
  if (bodyDominant) {
    return [headType, bodyDominant];
  }

  // Default body contribution: secondary if present, else primary
  const desiredBody: TypeName = bodyOrder.secondary ?? bodyOrder.primary;

  if (desiredBody === headType) {
    // Avoid redundancy by falling back to body's primary type
    const fallback = bodyOrder.primary;
    return [headType, fallback];
  }

  return [headType, desiredBody];
}

/**
 * Convenience helper returning as an object with keys primary/secondary.
 */
export function getFusionTyping(
  head: Pokemon,
  body: Pokemon
): { primary: TypeName; secondary: TypeName } {
  const [primary, secondary] = computeFusionTypes(head, body);
  return { primary, secondary };
}
