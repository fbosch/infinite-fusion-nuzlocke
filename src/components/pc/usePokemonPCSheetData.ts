import { getLocationsSortedWithCustom } from "@/loaders/locations";
import {
  useActivePlaythrough,
  useCustomLocations,
  useEncounters,
} from "@/stores/playthroughs/hooks";
import { buildPokemonUidIndex } from "@/utils/encounter-utils";
import { getTeamSlots } from "../team/team-slots";
import { getDeceasedEntries, getStoredEntries } from "./pcSheetDomain";
import type { PCEntry } from "./types";

function toTeamEntry({
  position,
  locationName,
  headPokemon,
  bodyPokemon,
  isFusion,
}: ReturnType<typeof getTeamSlots>[number]): PCEntry {
  return {
    body: bodyPokemon,
    head: headPokemon,
    isFusion,
    locationId: `team-slot-${position}`,
    locationName,
    position,
  };
}

export function usePokemonPCSheetData() {
  const activePlaythrough = useActivePlaythrough();
  const encounters = useEncounters();
  const customLocations = useCustomLocations();
  const idToName = new Map(
    getLocationsSortedWithCustom(customLocations).map((location) => [
      location.id,
      location.name,
    ]),
  );
  const pokemonByUid = buildPokemonUidIndex(encounters);
  const team = activePlaythrough?.team
    ? getTeamSlots(
        activePlaythrough.team.members,
        encounters,
        pokemonByUid,
      ).map(toTeamEntry)
    : [];

  return {
    deceased: getDeceasedEntries(encounters, idToName),
    idToName,
    stored: getStoredEntries(encounters, idToName),
    team,
  };
}
