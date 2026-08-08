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

  for (const [locationId, data] of Object.entries(encounters || {})) {
    const locationName = getPCEntryLocationName(locationId, idToName);

    if (isPokemonDeceased(data.head)) {
      entries.push({
        body: null,
        head: data.head,
        locationId: `${locationId}-head`,
        locationName,
      });
    }

    if (isPokemonDeceased(data.body)) {
      entries.push({
        body: data.body,
        head: null,
        locationId: `${locationId}-body`,
        locationName,
      });
    }
  }

  return entries;
}

export function getStoredEntries(
  encounters: Record<string, EncounterData> | null | undefined,
  idToName: Map<string, string>,
): PCEntry[] {
  const entries: PCEntry[] = [];

  for (const [locationId, data] of Object.entries(encounters || {})) {
    const headStored = isPokemonStored(data.head);
    const bodyStored = isPokemonStored(data.body);

    if (headStored || bodyStored) {
      entries.push({
        body: bodyStored ? data.body : null,
        head: headStored ? data.head : null,
        locationId,
        locationName: getPCEntryLocationName(locationId, idToName),
      });
    }
  }

  return entries;
}

export function getPCTabIndex(tab: PCTab) {
  return ["team", "box", "graveyard"].indexOf(tab);
}

export function getPCTab(index: number): PCTab {
  return (["team", "box", "graveyard"][index] as PCTab | undefined) ?? "team";
}
