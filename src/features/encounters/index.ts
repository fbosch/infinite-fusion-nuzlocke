"use client";

// biome-ignore lint/performance/noBarrelFile: This is the feature's deliberate curated public API.
export { findPokemonByUid, getDisplayPokemon } from "@/features/playthroughs";
export { emitEvolutionEvent } from "@/shared/utils/encounter-events";
export { dragActions, dragStore } from "./components/drag-store";
export { default as LocationTable } from "./components/LocationTable";
export { default as PokemonSummaryCard } from "./components/PokemonSummaryCard";
export { ArtworkVariantButton } from "./components/PokemonSummaryCard/artwork-variant-button";
export {
  FusionSprite,
  type FusionSpriteHandle,
} from "./components/PokemonSummaryCard/fusion-sprite";
export { PokemonContextMenu } from "./components/PokemonSummaryCard/pokemon-context-menu";
export { TeamMemberContextMenu } from "./components/PokemonSummaryCard/team-member-context-menu";
export { getNicknameText } from "./components/PokemonSummaryCard/utils";
export { default as ProgressBar } from "./components/progress-bar";
export type { RouteEncounterPokemon } from "./data/encounters";
export { useEncountersForLocation } from "./data/encounters";
export { encountersQueries } from "./data/encounters-queries";
export type {
  CombinedLocation,
  CustomLocation,
  Location,
} from "./data/locations";
export {
  createCustomLocation,
  getAvailableAfterLocations,
  getLocationById,
  getLocationByIdFromMerged,
  getLocations,
  getLocationsSortedWithCustom,
  isCustomLocation,
  updateCustomLocationDependencies,
  validateCustomLocationPlacement,
} from "./data/locations";
export {
  buildCapturedSpeciesIdSet,
  findPokemonWithLocation,
  getAllPokemonWithLocations,
} from "./model/encounter-utils";
export type {
  EncounterSource as EncounterSourceType,
  EncounterType,
  PokemonEncounter,
  RouteEncounter,
} from "./model/encounters";
export { ENCOUNTER_TYPES, EncounterSource } from "./model/encounters";
export { RouteEncountersArraySchema } from "./model/encounters-schema";
export { scrollToLocationById } from "./model/scroll-to-location";
export {
  isStarterLocation,
  SPECIAL_LOCATIONS,
} from "./model/special-locations";
