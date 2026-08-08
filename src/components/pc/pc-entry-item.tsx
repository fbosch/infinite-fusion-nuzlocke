"use client";

import clsx from "clsx";
import { FusionSprite } from "@/components/PokemonSummaryCard/FusionSprite";
import { PokemonContextMenu } from "@/components/PokemonSummaryCard/pokemon-context-menu";
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

function getActivePokemon(entry: PCEntry, mode: PCEntryItemProps["mode"]) {
  const isActive = mode === "stored" ? isPokemonStored : isPokemonDeceased;
  return isActive(entry.head) || isActive(entry.body);
}

function PCEntrySprite({
  entry,
  hasActivePokemon,
  isFusion,
}: {
  entry: PCEntry;
  hasActivePokemon: boolean;
  isFusion: boolean;
}) {
  if (hasActivePokemon === false) {
    return null;
  }

  return (
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
  );
}

export default function PCEntryItem({
  entry,
  idToName,
  mode,
  hoverRingClass,
  fallbackLabel,
  className,
  onClose,
}: PCEntryItemProps) {
  const encounters = useEncounters();
  const currentEncounter = encounters?.[entry.locationId];
  const hasActivePokemon = getActivePokemon(entry, mode);
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

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== "Enter" && event.key !== " ") {
      return;
    }

    event.preventDefault();
    handleClick();
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
        onKeyDown={handleKeyDown}
        role="button"
        tabIndex={0}
      >
        {fusionTypes.primary ? (
          <div className="absolute top-2 right-2">
            <TypePills
              primary={fusionTypes.primary}
              secondary={fusionTypes.secondary}
              showTooltip
              size="xs"
            />
          </div>
        ) : null}
        <div className="flex items-center gap-3 p-3">
          <div className="relative flex flex-shrink-0 items-center justify-center rounded-md">
            <PCEntrySprite
              entry={entry}
              hasActivePokemon={hasActivePokemon}
              isFusion={isFusion}
            />
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
