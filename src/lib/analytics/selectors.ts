import { PokemonStatus } from "@/loaders/pokemon";
import type { Playthrough } from "@/stores/playthroughs/types";
import {
  toCountBucket,
  toEncounterCountBucket,
  toViableRosterBucket,
} from "./buckets";
import type { SharedEventProperties } from "./trackEvent";

const getEncounterEntries = (playthrough: Playthrough) => {
  if (playthrough.encounters == null) {
    return [];
  }

  return Object.values(playthrough.encounters);
};

const getEncounterPokemon = (playthrough: Playthrough) => {
  const pokemon = [];

  for (const encounter of getEncounterEntries(playthrough)) {
    if (encounter.head) {
      pokemon.push(encounter.head);
    }

    if (encounter.body) {
      pokemon.push(encounter.body);
    }
  }

  return pokemon;
};

const getPokemonByUid = (
  playthrough: Playthrough,
): Map<string, { status?: string }> => {
  const index = new Map<string, { status?: string }>();

  for (const pokemon of getEncounterPokemon(playthrough)) {
    if (pokemon.uid) {
      index.set(pokemon.uid, pokemon);
    }
  }

  return index;
};

const toAnalyticsGameMode = (
  gameMode: string,
): SharedEventProperties["game_mode"] => {
  if (gameMode === "remix") {
    return "remix";
  }

  if (gameMode === "randomized") {
    return "randomized";
  }

  return "classic";
};

export const getEncounterCount = (playthrough: Playthrough): number => {
  let count = 0;

  for (const encounter of getEncounterEntries(playthrough)) {
    if (encounter.head || encounter.body) {
      count += 1;
    }
  }

  return count;
};

export const getDeceasedCount = (playthrough: Playthrough): number => {
  return getEncounterPokemon(playthrough).filter(
    (pokemon) => pokemon.status === PokemonStatus.DECEASED,
  ).length;
};

export const getBoxedCount = (playthrough: Playthrough): number => {
  return getEncounterPokemon(playthrough).filter(
    (pokemon) => pokemon.status === PokemonStatus.STORED,
  ).length;
};

export const getFusionCount = (playthrough: Playthrough): number => {
  return getEncounterEntries(playthrough).filter(
    (encounter) => encounter.isFusion && encounter.head && encounter.body,
  ).length;
};

export const getViableRosterSize = (playthrough: Playthrough): number => {
  const pokemonByUid = getPokemonByUid(playthrough);

  let count = 0;
  for (const member of playthrough.team.members) {
    if (member == null) {
      continue;
    }

    const headPokemon = pokemonByUid.get(member.headPokemonUid);
    if (headPokemon == null) {
      continue;
    }

    if (
      headPokemon.status === PokemonStatus.CAPTURED ||
      headPokemon.status === PokemonStatus.RECEIVED ||
      headPokemon.status === PokemonStatus.TRADED
    ) {
      count += 1;
    }
  }

  return count;
};

export const getSharedEventProperties = (
  playthrough: Playthrough,
): SharedEventProperties => {
  const encounterCount = getEncounterCount(playthrough);
  const deceasedCount = getDeceasedCount(playthrough);
  const boxedCount = getBoxedCount(playthrough);
  const fusionCount = getFusionCount(playthrough);
  const viableRosterSize = getViableRosterSize(playthrough);

  return {
    playthrough_id: playthrough.id,
    game_mode: toAnalyticsGameMode(playthrough.gameMode),
    encounter_count_bucket: toEncounterCountBucket(encounterCount),
    deceased_count_bucket: toCountBucket(deceasedCount),
    boxed_count_bucket: toCountBucket(boxedCount),
    fusion_count_bucket: toCountBucket(fusionCount),
    viable_roster_bucket: toViableRosterBucket(viableRosterSize),
  };
};

export const getTeamSizeAfter = (
  playthrough: Playthrough,
): 0 | 1 | 2 | 3 | 4 | 5 | 6 => {
  const size = playthrough.team.members.filter(
    (member) => member != null,
  ).length;

  if (size <= 0) return 0;
  if (size === 1) return 1;
  if (size === 2) return 2;
  if (size === 3) return 3;
  if (size === 4) return 4;
  if (size === 5) return 5;
  return 6;
};
