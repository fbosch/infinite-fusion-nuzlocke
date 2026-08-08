"use client";

import clsx from "clsx";
import { FusionSprite } from "@/components/PokemonSummaryCard/FusionSprite";
import { PokemonContextMenu } from "@/components/PokemonSummaryCard/PokemonContextMenu";
import { getNicknameText } from "@/components/PokemonSummaryCard/utils";
import { TypePills } from "@/components/TypePills";
import { useFusionTypesFromPokemon } from "@/hooks/useFusionTypes";
import { useEncounters } from "@/stores/playthroughs/hooks";
import {
  canFuse,
  isPokemonDeceased,
  isPokemonStored,
} from "@/utils/pokemonPredicates";
import { scrollToPokemonEntry } from "./entryInteraction";
import type { PCEntry } from "./types";

interface PCEntryItemProps {
  className?: string;
  entry: PCEntry;
  fallbackLabel: string;
  hoverRingClass: string;
  idToName: Map<string, string>;
  mode: "stored" | "graveyard";
  onClose?: () => void;
}

export default function PCEntryItem(props: PCEntryItemProps) {
  const {
    entry,
    idToName,
    mode,
    hoverRingClass,
    fallbackLabel,
    className,
    onClose,
  } = props;
  const encounters = useEncounters();
  const currentEncounter = encounters?.[entry.locationId];
  const isStoredMode = mode === "stored";
  const headActive = isStoredMode
    ? isPokemonStored(entry.head)
    : isPokemonDeceased(entry.head);
  const bodyActive = isStoredMode
    ? isPokemonStored(entry.body)
    : isPokemonDeceased(entry.body);
  const hasAny = Boolean(headActive || bodyActive);
  const isFusion = Boolean(
    currentEncounter?.isFusion && canFuse(entry.head, entry.body),
  );
  const label = getNicknameText(entry.head, entry.body, isFusion);

  const fusionTypes = useFusionTypesFromPokemon(
    entry.head,
    entry.body,
    isFusion,
  );

  const handleClick = () => {
    scrollToPokemonEntry(entry.locationId, entry.head, entry.body);
    onClose?.();
  };

  return (
    <PokemonContextMenu
      encounterData={{
        body: entry.body,
        head: entry.head,
        isFusion: currentEncounter?.isFusion,
      }}
      locationId={entry.locationId}
      shouldLoad={true}
    >
      <div
        aria-label={`Scroll to ${idToName.get(entry.locationId) || "location"} in table`}
        className={clsx(
          "group/pc-entry relative h-fit cursor-pointer rounded-lg border border-gray-200 bg-white transition-all duration-200 hover:ring-1 dark:border-gray-700 dark:bg-gray-800",
          hoverRingClass,
          className,
        )}
        key={entry.locationId}
        onClick={handleClick}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            handleClick();
          }
        }}
        role="button"
        tabIndex={0}
      >
        {fusionTypes.primary && (
          <div className="absolute top-2 right-2">
            <TypePills
              primary={fusionTypes.primary}
              secondary={fusionTypes.secondary}
              showTooltip
              size="xs"
            />
          </div>
        )}
        <div className="flex items-center gap-3 p-3">
          <div className="relative flex flex-shrink-0 items-center justify-center rounded-md">
            {hasAny && (
              <>
                <div
                  className="absolute h-full w-full rounded-md border border-gray-200 text-gray-300 opacity-30 dark:border-gray-600 dark:text-gray-600"
                  style={{
                    background:
                      "repeating-linear-gradient(currentColor 0px, currentColor 2px, rgba(156, 163, 175, 0.3) 1px, rgba(156, 163, 175, 0.3) 3px)",
                  }}
                />
                <FusionSprite
                  bodyPokemon={entry.body ?? null}
                  headPokemon={entry.head ?? null}
                  isFusion={isFusion}
                  shouldLoad
                  showStatusOverlay={false}
                />
              </>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate font-medium text-gray-900 text-sm dark:text-gray-100">
              {label || fallbackLabel}
            </div>
            <div className="truncate text-gray-500 text-xs dark:text-gray-400">
              {idToName.get(entry.locationId) || "Unknown Location"}
            </div>
          </div>
        </div>
      </div>
    </PokemonContextMenu>
  );
}
