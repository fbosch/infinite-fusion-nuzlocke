// biome-ignore lint/performance/noBarrelFile: Feature boundaries expose explicit public APIs.
export { PokemonSprite } from "./components/pokemon-sprite";
export { TypePills } from "./components/type-pills";
export type { UseFusionTypesResult } from "./components/use-fusion-types";
export { useFusionTypesFromPokemon } from "./components/use-fusion-types";
export type { UsePokemonTypesResult } from "./components/use-pokemon-types";
export { usePokemonTypes } from "./components/use-pokemon-types";
export {
  getPokemon,
  getPokemonById,
  getPokemonByName,
  getPokemonByNationalDexId,
  getPokemonEvolutionIds,
  getPokemonNameMap,
  getPokemonPreEvolutionId,
  isPokemonEvolution,
  isPokemonPreEvolution,
  searchPokemon,
  useAllPokemon,
  usePokemonEvolutionData,
  usePokemonNameMap,
  usePokemonSearch,
} from "./data/pokemon";
export type {
  PokemonApiParams,
  PokemonApiResponse,
} from "./data/pokemon-api-service";
export { default as pokemonApiService } from "./data/pokemon-api-service";
export { pokemonData } from "./data/pokemon-data";
export { pokemonQueries } from "./data/pokemon-queries";
export { DNA_REVERSER_ICON, DNA_SPLICER_ICON } from "./model/fusion-items";
export type {
  FusionActivity,
  FusionOverlayStatus,
} from "./model/fusion-status";
export {
  getFusionActivity,
  getFusionOverlayStatus,
} from "./model/fusion-status";
export type { TypeName, TypeQuery } from "./model/fusion-typing";
export {
  ALL_TYPES,
  computeFusionTypes,
  getFusionTyping,
  getTypesForPokemon,
} from "./model/fusion-typing";
export type { EvolutionDetail, Pokemon, PokemonType } from "./model/pokemon";
export type { FusionStatusCategory } from "./model/pokemon-predicates";
export {
  canFuse,
  getFusionStatusCategory,
  isActiveStatus,
  isDeceasedStatus,
  isFusionDeceased,
  isFusionFullyActive,
  isFusionInactive,
  isFusionPartiallyActive,
  isInactiveStatus,
  isMissedStatus,
  isPokemonActive,
  isPokemonDeceased,
  isPokemonInactive,
  isPokemonStored,
  isStoredStatus,
} from "./model/pokemon-predicates";
export {
  PokemonApiResponseSchema,
  PokemonSchema,
} from "./model/pokemon-schema";
export type {
  PokemonOptionType,
  PokemonStatusType,
} from "./model/pokemon-status";
export {
  createEggEncounter,
  generatePokemonUID,
  getEncounterDisplayName,
  isEgg,
  isEggId,
  PokemonStatus,
} from "./model/pokemon-status";
export { SearchCore } from "./search/search-core";
export { default as searchService } from "./search/search-service";
export {
  getPreferredVariant,
  preferredVariants,
  setPreferredVariant,
} from "./sprites/preferred-variants";
export { spriteKeys, spriteQueries } from "./sprites/sprite-queries";
export {
  generateSpriteVariantUrl,
  getSpriteVariantSuffix,
} from "./sprites/sprite-variants";
export type { SpriteCreditsResponse } from "./sprites/sprites";
export {
  checkSpriteExists,
  generateSpriteUrl,
  getArtworkVariants,
  getFormattedCreditsFromResponse,
  getSpriteCredits,
  getSpriteId,
} from "./sprites/sprites";
export type {
  SpriteVariantsError,
  SpriteVariantsResponse,
} from "./sprites/sprites.types";
export {
  usePreferredVariantState,
  useSpriteCredits,
  useSpriteVariants,
} from "./sprites/use-sprite";
