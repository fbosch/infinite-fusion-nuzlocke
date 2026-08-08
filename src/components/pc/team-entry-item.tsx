"use client";

import clsx from "clsx";
import { Box, Plus, Skull } from "lucide-react";
import {
  type MouseEvent,
  type ReactNode,
  type RefObject,
  useEffect,
  useRef,
} from "react";
import BodyIcon from "@/assets/images/body.svg";
import HeadIcon from "@/assets/images/head.svg";
import PokeballIcon from "@/assets/images/pokeball.svg";
import { CursorTooltip } from "@/components/cursor-tooltip";
import { ArtworkVariantButton } from "@/components/PokemonSummaryCard/ArtworkVariantButton";
import {
  FusionSprite,
  type FusionSpriteHandle,
} from "@/components/PokemonSummaryCard/fusion-sprite";
import { TeamMemberContextMenu } from "@/components/PokemonSummaryCard/team-member-context-menu";
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
  onTeamMemberClick?: (position: number, member: TeamMemberSelection) => void;
}

interface TeamMemberSelection {
  bodyPokemon: PokemonOptionType | null;
  headPokemon: PokemonOptionType | null;
  isEmpty: boolean;
  isFusion: boolean;
  position: number;
}

interface EntryDisplay {
  isEmpty: boolean;
  isFusion: boolean;
  isTeamData: boolean;
}

function getEntryDisplay(
  entry: PCEntry,
  encounters: ReturnType<typeof useEncounters>,
): EntryDisplay {
  const isTeamData = "position" in entry && typeof entry.position === "number";
  return isTeamData
    ? getTeamEntryDisplay(entry)
    : getEncounterEntryDisplay(entry, encounters);
}

function getTeamEntryDisplay(entry: PCEntry): EntryDisplay {
  return {
    isEmpty: !(entry.head || entry.body),
    isFusion: entry.isFusion === true,
    isTeamData: true,
  };
}

function getEncounterEntryDisplay(
  entry: PCEntry,
  encounters: ReturnType<typeof useEncounters>,
): EntryDisplay {
  const encounter = encounters?.[entry.locationId];
  return {
    isEmpty: !(isPokemonActive(entry.head) || isPokemonActive(entry.body)),
    isFusion: Boolean(encounter?.isFusion && canFuse(entry.head, entry.body)),
    isTeamData: false,
  };
}

function PokemonInfo({
  icon,
  pokemon,
}: {
  icon?: ReactNode;
  pokemon: PokemonOptionType;
}) {
  const locationName = pokemon.originalLocation
    ? getLocationById(pokemon.originalLocation)?.name || "Unknown Location"
    : "Unknown Location";

  return (
    <div className="flex min-w-0 items-center gap-1 text-gray-500 text-sm dark:text-gray-400">
      {icon}
      <span className="truncate">{pokemon.name || "Unknown"}</span>
      <span className="text-gray-400 text-xs dark:text-gray-500">•</span>
      <span className="ml-0.5 flex-shrink-0 truncate text-gray-400 text-xs dark:text-gray-500">
        {locationName}
      </span>
    </div>
  );
}

function EntrySprite({
  bodyPokemon,
  headPokemon,
  isEmpty,
  isFusion,
  spriteRef,
}: {
  bodyPokemon: PokemonOptionType | null;
  headPokemon: PokemonOptionType | null;
  isEmpty: boolean;
  isFusion: boolean;
  spriteRef: RefObject<FusionSpriteHandle | null>;
}) {
  if (isEmpty) {
    return (
      <div className="flex size-16 items-center justify-center">
        <PokeballIcon className="h-12 w-12 text-gray-400 opacity-60 dark:text-gray-500" />
      </div>
    );
  }

  return (
    <>
      <div
        className="absolute h-full w-full rounded-lg border border-gray-200 text-gray-300 opacity-30 dark:border-gray-600 dark:text-gray-600"
        style={{
          background:
            "repeating-linear-gradient(currentColor 0px, currentColor 2px, rgba(156, 163, 175, 0.3) 1px, rgba(156, 163, 175, 0.3) 3px)",
        }}
      />
      <CursorTooltip
        content={
          <TeamMemberTooltipContent
            bodyPokemon={bodyPokemon}
            headPokemon={headPokemon}
            isFusion={isFusion}
          />
        }
        delay={500}
      >
        <div>
          <FusionSprite
            bodyPokemon={bodyPokemon}
            className="top-1.5"
            headPokemon={headPokemon}
            isFusion={isFusion}
            ref={spriteRef}
            shouldLoad
            showStatusOverlay={false}
          />
        </div>
      </CursorTooltip>
      <ArtworkVariantButton
        bodyId={bodyPokemon?.id}
        className="absolute bottom-1 left-1 z-10 opacity-0 transition-opacity duration-200 focus:opacity-100 group-hover/sprite-container:opacity-50"
        headId={headPokemon?.id}
        isFusion={isFusion}
        shouldLoad
      />
    </>
  );
}

function EntryActions({
  onMoveToBox,
  onMoveToGraveyard,
}: {
  onMoveToBox: (event: MouseEvent<HTMLButtonElement>) => void;
  onMoveToGraveyard: (event: MouseEvent<HTMLButtonElement>) => void;
}) {
  const buttonClassName =
    "inline-flex size-7 cursor-pointer items-center justify-center rounded-md border border-transparent bg-transparent text-gray-400 transition-colors hover:border-gray-200/70 hover:bg-gray-100/50 hover:text-gray-600 focus:outline-none focus-visible:ring-1 focus-visible:ring-gray-500 dark:text-gray-400 dark:hover:border-gray-600/60 dark:hover:bg-gray-700/40 dark:hover:text-gray-200";

  return (
    <div className="absolute right-2 bottom-2 z-10 flex gap-1.5 transition-opacity md:pointer-events-none md:opacity-0 md:group-hover/pc-entry:pointer-events-auto md:group-hover/pc-entry:opacity-100 md:group-focus-within/pc-entry:pointer-events-auto md:group-focus-within/pc-entry:opacity-100">
      <CursorTooltip content="Move to Box" delay={300} placement="top-end">
        <button
          aria-label="Move to Box"
          className={buttonClassName}
          onClick={onMoveToBox}
          type="button"
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
          aria-label="Move to Graveyard"
          className={buttonClassName}
          onClick={onMoveToGraveyard}
          type="button"
        >
          <Skull className="h-4 w-4" />
        </button>
      </CursorTooltip>
    </div>
  );
}

export default function TeamEntryItem({
  entry,
  idToName,
  onClose,
  onTeamMemberClick,
}: TeamEntryItemProps) {
  const encounters = useEncounters();
  const activePlaythrough = useActivePlaythrough();

  const { isEmpty, isFusion, isTeamData } = getEntryDisplay(entry, encounters);

  // Ref for the sprite to play evolution animations
  const spriteRef = useRef<FusionSpriteHandle | null>(null);
  const previousFusionId = useRef<string | null>(null);
  const previousPlaythroughId = useRef(activePlaythrough?.id);

  useEffect(() => {
    if (previousPlaythroughId.current === activePlaythrough?.id) {
      return;
    }

    previousPlaythroughId.current = activePlaythrough?.id;
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

  const handleClick = () => {
    if (isTeamData && entry.position !== undefined) {
      // For team data, open the team member picker modal
      const existingTeamMember = {
        bodyPokemon: entry.body,
        headPokemon: entry.head,
        isEmpty,
        isFusion,
        position: entry.position,
      };
      onTeamMemberClick?.(entry.position, existingTeamMember);
      return;
    }

    scrollToPokemonEntry(entry.locationId, entry.head, entry.body);
    onClose?.();
  };

  const handleAddClick = (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();

    if (!isTeamData || entry.position === undefined) {
      return;
    }

    onTeamMemberClick?.(entry.position, {
      bodyPokemon: null,
      headPokemon: null,
      isEmpty: true,
      isFusion: false,
      position: entry.position,
    });
  };

  const handleMoveToBox = async (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();

    if (isTeamData && entry.position !== undefined) {
      await playthroughActions.moveTeamMemberToBox(entry.position);
      return;
    }

    await playthroughActions.moveEncounterToBox(entry.locationId);
  };

  const handleMoveToGraveyard = async (
    event: MouseEvent<HTMLButtonElement>,
  ) => {
    event.stopPropagation();

    if (isTeamData && entry.position !== undefined) {
      await playthroughActions.markTeamMemberAsDeceased(entry.position);
      return;
    }

    await playthroughActions.markEncounterAsDeceased(entry.locationId);
  };

  const mainContent = (
    <div
      className={clsx(
        "group/pc-entry relative cursor-pointer rounded-lg transition-all duration-200",
        {
          "bg-gray-50 hover:bg-gray-100 dark:bg-gray-900 dark:hover:bg-gray-900":
            isEmpty,
          "border border-gray-200 bg-white hover:ring-1 hover:ring-blue-400/30 dark:border-gray-700 dark:bg-gray-800":
            !isEmpty,
        },
      )}
      key={entry.locationId}
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
        aria-label={
          isTeamData && entry.position !== undefined
            ? `Team slot ${entry.position + 1}`
            : `Scroll to ${idToName.get(entry.locationId) || "location"} in table`
        }
        className="absolute inset-0 z-0 rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
        onClick={handleClick}
        type="button"
      />
      <div className="p-4">
        <div className="flex items-center gap-4">
          <div className="group/sprite-container relative flex flex-shrink-0 items-center justify-center rounded-lg p-2">
            <EntrySprite
              bodyPokemon={entry.body}
              headPokemon={entry.head}
              isEmpty={isEmpty}
              isFusion={isFusion}
              spriteRef={spriteRef}
            />
          </div>
          <div className="min-w-0 flex-1">
            {isEmpty ? (
              <div className="flex h-full items-center">
                <button
                  className="relative z-10 inline-flex items-center gap-1.5 rounded-md border border-gray-200 px-3 py-1.5 font-medium text-gray-500 text-sm transition-colors hover:border-gray-300 hover:text-gray-700 focus:outline-none focus:ring-1 focus:ring-gray-400 focus:ring-offset-1 dark:border-gray-600 dark:text-gray-400 dark:hover:border-gray-500 dark:hover:text-gray-200"
                  onClick={handleAddClick}
                  type="button"
                >
                  <Plus className="h-3 w-3" />
                  Add
                </button>
              </div>
            ) : (
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-base text-gray-900 dark:text-gray-100">
                    {getNicknameText(entry.head, entry.body, isFusion)}
                  </h3>
                </div>
                {entry.head ? (
                  <PokemonInfo
                    icon={
                      entry.body ? (
                        <HeadIcon className="h-4 w-4 flex-shrink-0" />
                      ) : undefined
                    }
                    pokemon={entry.head}
                  />
                ) : null}
                {entry.body ? (
                  <PokemonInfo
                    icon={
                      entry.head ? (
                        <BodyIcon className="h-4 w-4 flex-shrink-0" />
                      ) : undefined
                    }
                    pokemon={entry.body}
                  />
                ) : null}
              </div>
            )}
          </div>
          {primary ? (
            <div className="ml-auto">
              <TypePills
                primary={primary}
                secondary={secondary}
                showTooltip
                size="sm"
              />
            </div>
          ) : null}
        </div>
      </div>
      {isEmpty ? null : (
        <EntryActions
          onMoveToBox={handleMoveToBox}
          onMoveToGraveyard={handleMoveToGraveyard}
        />
      )}
    </div>
  );

  // Only wrap filled team slots with context menu
  if (isTeamData && !isEmpty) {
    return (
      <TeamMemberContextMenu
        onClose={onClose}
        shouldLoad={!isEmpty}
        teamMember={{
          bodyPokemon: entry.body,
          headPokemon: entry.head,
          isEmpty,
          isFusion,
          position: entry.position || 0,
        }}
      >
        {mainContent}
      </TeamMemberContextMenu>
    );
  }

  // For encounter data, just return main content for now
  return mainContent;
}
