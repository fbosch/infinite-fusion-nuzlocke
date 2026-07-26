import { getLocationsSortedWithCustom } from "@/loaders/locations";
import {
  useActivePlaythrough,
  useCustomLocations,
  useEncounters,
} from "@/stores/playthroughs/hooks";
import { buildPokemonUidIndex } from "@/utils/encounter-utils";
import { getTeamSlots } from "../team/teamSlots";
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
    locationId: `team-slot-${position}`,
    locationName,
    head: headPokemon,
    body: bodyPokemon,
    position,
    isFusion,
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
    team,
    stored: getStoredEntries(encounters, idToName),
    deceased: getDeceasedEntries(encounters, idToName),
    idToName,
  };
}
