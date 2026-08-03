import { getLocationById } from "@/loaders/locations";
import type { EncounterData } from "@/stores/playthroughs/types";
import { isPokemonDeceased, isPokemonStored } from "@/utils/pokemonPredicates";
import type { PCEntry } from "./types";

export type PCTab = "team" | "box" | "graveyard";

function getPCEntryLocationName(
  locationId: string,
  idToName: Map<string, string>,
) {
  return (
    idToName.get(locationId) ||
    getLocationById(locationId)?.name ||
    "Unknown Location"
  );
}

export function getDeceasedEntries(
  encounters: Record<string, EncounterData> | null | undefined,
  idToName: Map<string, string>,
): PCEntry[] {
  const entries: PCEntry[] = [];

  Object.entries(encounters || {}).forEach(([locationId, data]) => {
    const locationName = getPCEntryLocationName(locationId, idToName);

    if (isPokemonDeceased(data.head)) {
      entries.push({
        locationId: `${locationId}-head`,
        locationName,
        head: data.head,
        body: null,
      });
    }

    if (isPokemonDeceased(data.body)) {
      entries.push({
        locationId: `${locationId}-body`,
        locationName,
        head: null,
        body: data.body,
      });
    }
  });

  return entries;
}

export function getStoredEntries(
  encounters: Record<string, EncounterData> | null | undefined,
  idToName: Map<string, string>,
): PCEntry[] {
  const entries: PCEntry[] = [];

  Object.entries(encounters || {}).forEach(([locationId, data]) => {
    const headStored = isPokemonStored(data.head);
    const bodyStored = isPokemonStored(data.body);

    if (headStored || bodyStored) {
      entries.push({
        locationId,
        locationName: getPCEntryLocationName(locationId, idToName),
        head: headStored ? data.head : null,
        body: bodyStored ? data.body : null,
      });
    }
  });

  return entries;
}

export function getPCTabIndex(tab: PCTab) {
  return ["team", "box", "graveyard"].indexOf(tab);
}

export function getPCTab(index: number): PCTab {
  return (["team", "box", "graveyard"][index] as PCTab | undefined) ?? "team";
}
