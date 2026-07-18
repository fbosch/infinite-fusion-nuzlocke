import { getLocationById } from "@/loaders/locations";
import type { PokemonOptionType } from "@/loaders/pokemon";
import type { EncounterData } from "@/stores/playthroughs/types";
import {
  findPokemonByUid,
  type PokemonUidIndex,
} from "@/utils/encounter-utils";

type TeamMemberReference = {
  headPokemonUid: string;
  bodyPokemonUid: string;
};

export type TeamSlot = {
  position: number;
  isEmpty: boolean;
  locationName: string;
  headPokemon: PokemonOptionType | null;
  bodyPokemon: PokemonOptionType | null;
  isFusion: boolean;
};

export function getTeamSlots(
  members: (TeamMemberReference | null)[],
  encounters: Record<string, EncounterData> | null | undefined,
  pokemonByUid: PokemonUidIndex,
): TeamSlot[] {
  return members.map((member, position) =>
    getTeamSlot(member, position, encounters, pokemonByUid),
  );
}

function getTeamSlot(
  member: TeamMemberReference | null,
  position: number,
  encounters: Record<string, EncounterData> | null | undefined,
  pokemonByUid: PokemonUidIndex,
): TeamSlot {
  if (!member?.headPokemonUid && !member?.bodyPokemonUid) {
    return createEmptyTeamSlot(position);
  }

  const headPokemon = getTeamPokemon(
    member.headPokemonUid,
    encounters,
    pokemonByUid,
  );
  const bodyPokemon = getTeamPokemon(
    member.bodyPokemonUid,
    encounters,
    pokemonByUid,
  );

  return {
    position,
    isEmpty: false,
    locationName: getTeamSlotLocationName(headPokemon, bodyPokemon),
    headPokemon,
    bodyPokemon,
    isFusion: Boolean(headPokemon && bodyPokemon),
  };
}

function getTeamPokemon(
  uid: string,
  encounters: Record<string, EncounterData> | null | undefined,
  pokemonByUid: PokemonUidIndex,
) {
  return uid ? findPokemonByUid(encounters, uid, pokemonByUid) : null;
}

function getTeamSlotLocationName(
  headPokemon: PokemonOptionType | null,
  bodyPokemon: PokemonOptionType | null,
) {
  const locationId =
    headPokemon?.originalLocation || bodyPokemon?.originalLocation;
  return getLocationById(locationId || "")?.name || "Unknown Location";
}

function createEmptyTeamSlot(position: number): TeamSlot {
  return {
    position,
    isEmpty: true,
    locationName: `Team Slot ${position + 1}`,
    headPokemon: null,
    bodyPokemon: null,
    isFusion: false,
  };
}
