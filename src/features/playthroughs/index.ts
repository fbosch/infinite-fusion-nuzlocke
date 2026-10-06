"use client";

// biome-ignore lint/performance/noBarrelFile: This is the feature's deliberate curated public API.
export { ActivePlaythroughTitle } from "./components/active-playthrough-title";
export { default as PlaythroughMenu } from "./components/playthrough-menu";
export { default as PlaythroughSelector } from "./components/playthrough-selector";
export { usePlaythroughImportExport } from "./components/use-playthrough-import-export";
export { playthroughActions } from "./model/actions";
export { getSharedEventProperties } from "./model/analytics-selectors";
export {
  createCustomLocation,
  getLocationsSortedWithCustom,
  isCustomLocationPlacementValid,
  mergeLocationsWithCustom,
  updateCustomLocationDependencies,
  validateCustomLocationPlacement,
} from "./model/custom-locations";
export type { DisplayPokemon } from "./model/display-pokemon";
export { getDisplayPokemon } from "./model/display-pokemon";
export { findPokemonByUid } from "./model/encounter-utils";
export {
  useActivePlaythrough,
  useActivePlaythroughId,
  useAllPlaythroughs,
  useCustomLocations,
  useEncounter,
  useEncounters,
  useGameMode,
  useIsLoading,
  useIsRandomizedMode,
  useIsRemixMode,
  usePlaythroughById,
  usePlaythroughsSnapshot,
} from "./model/hooks";
export { getPlaythroughPageTitle } from "./model/page-title";
export {
  getDaysSinceLastActive,
  markLandingViewedTracked,
  markPlaythroughResumedTracked,
  shouldTrackLandingViewed,
  shouldTrackPlaythroughResumed,
} from "./model/playthrough-event-data";
export { getActivePlaythrough } from "./model/playthrough-state";
export type { PokemonUidIndex } from "./model/pokemon-uid-index";
export { buildPokemonUidIndex } from "./model/pokemon-uid-index";
export { playthroughsStore } from "./model/store";
export type {
  CustomLocation,
  EncounterData,
  ExportedPlaythrough,
  GameMode,
  ImportedPlaythrough,
  Playthrough,
  PlaythroughsState,
  Team,
  TeamMember,
} from "./model/types";
