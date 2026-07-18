"use client";

import clsx from "clsx";
import { Box, Plus, Skull } from "lucide-react";
import { useEffect, useRef } from "react";
import BodyIcon from "@/assets/images/body.svg";
import HeadIcon from "@/assets/images/head.svg";
import PokeballIcon from "@/assets/images/pokeball.svg";
import { CursorTooltip } from "@/components/CursorTooltip";
import { ArtworkVariantButton } from "@/components/PokemonSummaryCard/ArtworkVariantButton";
import {
  FusionSprite,
  type FusionSpriteHandle,
} from "@/components/PokemonSummaryCard/FusionSprite";
import { TeamMemberContextMenu } from "@/components/PokemonSummaryCard/TeamMemberContextMenu";
import { getNicknameText } from "@/components/PokemonSummaryCard/utils";
import { TypePills } from "@/components/TypePills";
import { useFusionTypesFromPokemon } from "@/hooks/useFusionTypes";
import { getLocationById } from "@/loaders/locations";
import type { PokemonOptionType } from "@/loaders/pokemon";
import {
  useActivePlaythrough,
  useEncounters,
} from "@/stores/playthroughs/hooks";
import { playthroughActions } from "@/stores/playthroughs/index";
import { canFuse, isPokemonActive } from "@/utils/pokemonPredicates";
import { TeamMemberTooltipContent } from "../team/TeamMemberTooltipContent";
import { scrollToPokemonEntry } from "./entryInteraction";
import type { PCEntry } from "./types";

interface TeamEntryItemProps {
  entry: PCEntry;
  idToName: Map<string, string>;
  onClose?: () => void;
  onTeamMemberClick?: (
    position: number,
    existingTeamMember: {
      position: number;
      isEmpty: boolean;
      headPokemon: PokemonOptionType | null;
      bodyPokemon: PokemonOptionType | null;
      isFusion: boolean;
    },
  ) => void;
}

export default function TeamEntryItem({
  entry,
  idToName,
  onClose,
  onTeamMemberClick,
}: TeamEntryItemProps) {
  const encounters = useEncounters();
  const activePlaythrough = useActivePlaythrough();

  // Check if this is team data (has position field) or encounter data
  const isTeamData = "position" in entry && typeof entry.position === "number";

  const currentEncounter = isTeamData ? null : encounters?.[entry.locationId];
  const headActive = isTeamData
    ? Boolean(entry.head)
    : isPokemonActive(entry.head);
  const bodyActive = isTeamData
    ? Boolean(entry.body)
    : isPokemonActive(entry.body);
  const hasAny = Boolean(headActive || bodyActive);

  // Use entry.isFusion if available (for team data), otherwise infer from encounter
  const isFusion = isTeamData
    ? entry.isFusion || false
    : Boolean(currentEncounter?.isFusion && canFuse(entry.head, entry.body));

  // Ref for the sprite to play evolution animations
  const spriteRef = useRef<FusionSpriteHandle | null>(null);
  const previousFusionId = useRef<string | null>(null);

  useEffect(() => {
    previousFusionId.current = null;
  }, [activePlaythrough?.id]);

  // Track fusion ID changes and play evolution animations
  useEffect(() => {
    if (isFusion && entry.head && entry.body) {
      const currentFusionId = `${entry.head.id}.${entry.body.id}`;

      // Initialize previous fusion ID if not set
      if (previousFusionId.current === null) {
        previousFusionId.current = currentFusionId;
        return;
      }

      // Play animation if fusion ID changed
      if (previousFusionId.current !== currentFusionId) {
        previousFusionId.current = currentFusionId;
        spriteRef.current?.playEvolution();
      }
    } else {
      // Reset previous fusion ID for non-fusion entries
      previousFusionId.current = null;
    }
  }, [isFusion, entry.head, entry.body]);

  const { primary, secondary } = useFusionTypesFromPokemon(
    entry.head,
    entry.body,
    isFusion,
  );

  // For empty slots, we still want to show them so users can add Pokémon
  const isEmpty = !hasAny;

  const handleClick = () => {
    if (isTeamData && entry.position !== undefined) {
      // For team data, open the team member picker modal
      const existingTeamMember = {
        position: entry.position,
        isEmpty: isEmpty,
        headPokemon: entry.head,
        bodyPokemon: entry.body,
        isFusion: entry.isFusion || false,
      };
      onTeamMemberClick?.(entry.position, existingTeamMember);
      return;
    }

    scrollToPokemonEntry(entry.locationId, entry.head, entry.body);
    onClose?.();
  };

  // Create the main content that will be wrapped by context menus
  const mainContent = (
    <div
      key={entry.locationId}
      className={clsx(
        "group/pc-entry relative cursor-pointer rounded-lg transition-all duration-200",
        {
          "border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:ring-1 hover:ring-blue-400/30":
            !isEmpty,
          "bg-gray-50 dark:bg-gray-900 hover:bg-gray-100 dark:hover:bg-gray-900":
            isEmpty,
        },
      )}
      style={
        isEmpty
          ? {
              boxShadow:
                "inset 0 1px 3px rgba(0, 0, 0, 0.05), inset 0 1px 2px rgba(0, 0, 0, 0.08)",
            }
          : undefined
      }
    >
      <button
        type="button"
        className="absolute inset-0 z-0 rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
        onClick={handleClick}
        aria-label={
          isTeamData && entry.position !== undefined
            ? `Team slot ${entry.position + 1}`
            : `Scroll to ${idToName.get(entry.locationId) || "location"} in table`
        }
      />
      <div className="p-4">
        <div className="flex items-center gap-4">
          <div className="flex flex-shrink-0 items-center justify-center rounded-lg relative group/sprite-container p-2">
            {isEmpty ? (
              <div className="size-16 flex items-center justify-center">
                <PokeballIcon className="h-12 w-12 text-gray-400 dark:text-gray-500 opacity-60" />
              </div>
            ) : (
              <>
                <div
                  className="w-full h-full absolute rounded-lg opacity-30 border border-gray-200 dark:border-gray-600 text-gray-300 dark:text-gray-600"
                  style={{
                    background: `repeating-linear-gradient(currentColor 0px, currentColor 2px, rgba(156, 163, 175, 0.3) 1px, rgba(156, 163, 175, 0.3) 3px)`,
                  }}
                />
                <CursorTooltip
                  delay={500}
                  content={
                    <TeamMemberTooltipContent
                      headPokemon={entry.head}
                      bodyPokemon={entry.body}
                      isFusion={isFusion}
                    />
                  }
                >
                  <div>
                    <FusionSprite
                      ref={spriteRef}
                      headPokemon={entry.head ?? null}
                      bodyPokemon={entry.body ?? null}
                      isFusion={isFusion}
                      shouldLoad
                      className="top-1.5"
                      showStatusOverlay={false}
                    />
                  </div>
                </CursorTooltip>
                <ArtworkVariantButton
                  headId={entry.head?.id}
                  bodyId={entry.body?.id}
                  isFusion={isFusion}
                  shouldLoad={!isEmpty}
                  className="absolute bottom-1 left-1 z-10 opacity-0 group-hover/sprite-container:opacity-50 focus:opacity-100 transition-opacity duration-200"
                />
              </>
            )}
          </div>
          <div className="min-w-0 flex-1">
            {isEmpty ? (
              <div className="flex items-center h-full">
                <button
                  type="button"
                  className="relative z-10 inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 border border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500 rounded-md transition-colors focus:outline-none focus:ring-1 focus:ring-gray-400 focus:ring-offset-1"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (isTeamData && entry.position !== undefined) {
                      const existingTeamMember = {
                        position: entry.position,
                        isEmpty: true,
                        headPokemon: null,
                        bodyPokemon: null,
                        isFusion: false,
                      };
                      onTeamMemberClick?.(entry.position, existingTeamMember);
                    }
                  }}
                >
                  <Plus className="h-3 w-3" />
                  Add
                </button>
              </div>
            ) : (
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">
                    {getNicknameText(entry.head, entry.body, isFusion)}
                  </h3>
                </div>
                {/* Head Pokémon info */}
                {entry.head && (
                  <div className="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400 min-w-0">
                    {entry.body && (
                      <HeadIcon className="h-4 w-4 flex-shrink-0" />
                    )}
                    <span className="truncate">
                      {entry.head.name || "Unknown"}
                    </span>
                    <span className="text-xs text-gray-400 dark:text-gray-500 ">
                      •
                    </span>
                    <span className="text-xs text-gray-400 dark:text-gray-500 ml-0.5 truncate flex-shrink-0">
                      {entry.head.originalLocation
                        ? getLocationById(entry.head.originalLocation)?.name ||
                          "Unknown Location"
                        : "Unknown Location"}
                    </span>
                  </div>
                )}

                {/* Body Pokémon info */}
                {entry.body && (
                  <div className="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400 min-w-0">
                    {entry.head && (
                      <BodyIcon className="h-4 w-4 flex-shrink-0" />
                    )}
                    <span className="truncate">
                      {entry.body.name || "Unknown"}
                    </span>
                    <span className="text-xs text-gray-400 dark:text-gray-500 ">
                      •
                    </span>
                    <span className="text-xs text-gray-400 dark:text-gray-500 ml-0.5 truncate flex-shrink-0">
                      {entry.body.originalLocation
                        ? getLocationById(entry.body.originalLocation)?.name ||
                          "Unknown Location"
                        : "Unknown Location"}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
          {primary && (
            <div className="ml-auto">
              <TypePills
                primary={primary}
                secondary={secondary}
                showTooltip
                size="sm"
              />
            </div>
          )}
        </div>
      </div>
      {!isEmpty && (
        <div className="absolute bottom-2 right-2 z-10 flex gap-1.5 transition-opacity md:pointer-events-none md:opacity-0 md:group-hover/pc-entry:pointer-events-auto md:group-hover/pc-entry:opacity-100 md:group-focus-within/pc-entry:pointer-events-auto md:group-focus-within/pc-entry:opacity-100">
          <CursorTooltip content="Move to Box" placement="top-end" delay={300}>
            <button
              type="button"
              className="inline-flex size-7 items-center justify-center rounded-md border border-transparent bg-transparent text-gray-400 transition-colors hover:border-gray-200/70 hover:bg-gray-100/50 hover:text-gray-600 focus:outline-none focus-visible:ring-1 focus-visible:ring-gray-500 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:bg-gray-700/40 dark:hover:border-gray-600/60 cursor-pointer"
              aria-label="Move to Box"
              onClick={async (e) => {
                e.stopPropagation();
                if (isTeamData && entry.position !== undefined) {
                  // For team members, move to box by updating status and removing from team
                  await playthroughActions.moveTeamMemberToBox(entry.position);
                } else {
                  // For encounters, use the existing encounter logic
                  await playthroughActions.moveEncounterToBox(entry.locationId);
                }
              }}
            >
              <Box className="h-4 w-4" />
            </button>
          </CursorTooltip>
          <CursorTooltip
            content="Move to Graveyard"
            delay={300}
            placement="top-end"
          >
            <button
              type="button"
              className="inline-flex size-7 items-center justify-center rounded-md border border-transparent bg-transparent text-gray-400 transition-colors hover:border-gray-200/70 hover:bg-gray-100/50 hover:text-gray-600 focus:outline-none focus-visible:ring-1 focus-visible:ring-gray-500 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:bg-gray-700/40 dark:hover:border-gray-600/60 cursor-pointer"
              aria-label="Move to Graveyard"
              onClick={async (e) => {
                e.stopPropagation();
                if (isTeamData && entry.position !== undefined) {
                  await playthroughActions.markTeamMemberAsDeceased(
                    entry.position,
                  );
                } else {
                  // For encounters, use the existing encounter logic
                  await playthroughActions.markEncounterAsDeceased(
                    entry.locationId,
                  );
                }
              }}
            >
              <Skull className="h-4 w-4" />
            </button>
          </CursorTooltip>
        </div>
      )}
    </div>
  );

  // Only wrap filled team slots with context menu
  if (isTeamData && !isEmpty) {
    return (
      <TeamMemberContextMenu
        teamMember={{
          position: entry.position || 0,
          isEmpty: isEmpty,
          headPokemon: entry.head,
          bodyPokemon: entry.body,
          isFusion: isFusion,
        }}
        shouldLoad={!isEmpty}
        onClose={onClose}
      >
        {mainContent}
      </TeamMemberContextMenu>
    );
  }

  // For encounter data, just return main content for now
  return mainContent;
}
