import { getLocationsSortedWithCustom } from "@/features/encounters";
import {
  buildPokemonUidIndex,
  useActivePlaythrough,
  useCustomLocations,
  useEncounters,
} from "@/features/playthroughs";
import type { PCEntry } from "../model/pc-entry";
import { getDeceasedEntries, getStoredEntries } from "../model/pc-sheet-domain";
import { getTeamSlots } from "../model/team-slots-model";

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
