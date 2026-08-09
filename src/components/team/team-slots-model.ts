import { getLocationById } from "@/loaders/locations";
import type { PokemonOptionType } from "@/loaders/pokemon";
import type { EncounterData } from "@/stores/playthroughs/types";
import {
  findPokemonByUid,
  type PokemonUidIndex,
} from "@/utils/encounter-utils";

interface TeamMemberReference {
  bodyPokemonUid: string;
  headPokemonUid: string;
}

export interface TeamSlot {
  bodyPokemon: PokemonOptionType | null;
  headPokemon: PokemonOptionType | null;
  isEmpty: boolean;
  isFusion: boolean;
  locationName: string;
  position: number;
}

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
  if (!(member?.headPokemonUid || member?.bodyPokemonUid)) {
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
    bodyPokemon,
    headPokemon,
    isEmpty: false,
    isFusion: Boolean(headPokemon && bodyPokemon),
    locationName: getTeamSlotLocationName(headPokemon, bodyPokemon),
    position,
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
    bodyPokemon: null,
    headPokemon: null,
    isEmpty: true,
    isFusion: false,
    locationName: `Team Slot ${position + 1}`,
    position,
  };
}
