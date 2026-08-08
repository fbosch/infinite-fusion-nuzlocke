"use client";

import { clsx } from "clsx";
import { useEffect, useRef } from "react";
import PokeballIcon from "@/assets/images/pokeball.svg";
import { CursorTooltip } from "@/components/CursorTooltip";
import { ArtworkVariantButton } from "@/components/PokemonSummaryCard/ArtworkVariantButton";
import {
  FusionSprite,
  type FusionSpriteHandle,
} from "@/components/PokemonSummaryCard/FusionSprite";
import { TeamMemberContextMenu } from "@/components/PokemonSummaryCard/TeamMemberContextMenu";
import { TypePills } from "@/components/TypePills";
import { useFusionTypesFromPokemon } from "@/hooks/useFusionTypes";
import type { PokemonOptionType } from "@/loaders/pokemon";
import {
  useActivePlaythrough,
  useEncounters,
} from "@/stores/playthroughs/hooks";
import { buildPokemonUidIndex } from "@/utils/encounter-utils";
import TeamMemberPickerModal from "./TeamMemberPickerModal";
import { TeamMemberTooltipContent } from "./TeamMemberTooltipContent";
import TeamSlotsSkeleton from "./TeamSlotsSkeleton";
import { getTeamSlots } from "./team-slots";
import { useTeamMemberPicker } from "./useTeamMemberPicker";

// Component to display type indicators and nickname
function TypeIndicators({
  headPokemon,
  bodyPokemon,
  isFusion,
}: {
  headPokemon: PokemonOptionType | null;
  bodyPokemon: PokemonOptionType | null;
  isFusion: boolean;
}) {
  const { primary, secondary } = useFusionTypesFromPokemon(
    headPokemon,
    bodyPokemon,
    isFusion,
  );

  // Get nickname from head Pokémon (or body if no head)
  const nickname = headPokemon?.nickname || bodyPokemon?.nickname;

  return (
    <>
      {/* Type indicators above the slot */}
      {(primary || secondary) && (
        <div className="absolute -top-4 left-1/2 z-20 -translate-x-1/2 transform">
          <TypePills
            primary={primary}
            secondary={secondary}
            showTooltip={true}
            size="xxs"
          />
        </div>
      )}

      {/* Nickname below the slot */}
      {nickname && (
        <div className="absolute -bottom-6 left-1/2 z-20 -translate-x-1/2 transform">
          <span className="pixel-shadow font-ds text-gray-700 text-sm dark:text-gray-200">
            {nickname}
          </span>
        </div>
      )}
    </>
  );
}

export default function TeamSlots() {
  const activePlaythrough = useActivePlaythrough();
  const encounters = useEncounters();
  const {
    pickerModalOpen,
    selectedPosition,
    openPicker,
    closePicker,
    selectTeamMember,
  } = useTeamMemberPicker();

  // Refs for team member sprites to play evolution animations
  const teamSpriteRefs = useRef<(FusionSpriteHandle | null)[]>([]);
  const previousFusionIds = useRef<(string | null)[]>([]);

  const pokemonByUid = buildPokemonUidIndex(encounters);

  useEffect(() => {
    previousFusionIds.current = new Array(6).fill(null);
  }, [activePlaythrough?.id]);

  const teamSlots = activePlaythrough?.team
    ? getTeamSlots(activePlaythrough.team.members, encounters, pokemonByUid)
    : [];

  // Track fusion ID changes and play evolution animations for team members
  useEffect(() => {
    // Initialize refs arrays if needed
    if (teamSpriteRefs.current.length !== 6) {
      teamSpriteRefs.current = new Array(6).fill(null);
    }
    if (previousFusionIds.current.length !== 6) {
      previousFusionIds.current = new Array(6).fill(null);
    }
    // Use requestAnimationFrame to ensure proper timing
    const animationFrame = requestAnimationFrame(() => {
      const animationSlots = activePlaythrough?.team
        ? getTeamSlots(activePlaythrough.team.members, encounters, pokemonByUid)
        : [];

      animationSlots.forEach((slot, index) => {
        if (
          !slot.isEmpty &&
          slot.isFusion &&
          slot.headPokemon &&
          slot.bodyPokemon
        ) {
          const currentFusionId = `${slot.headPokemon.id}.${slot.bodyPokemon.id}`;

          // Initialize previous fusion ID if not set
          if (previousFusionIds.current[index] === null) {
            previousFusionIds.current[index] = currentFusionId;
            return;
          }

          // Play animation if fusion ID changed and ref exists
          if (previousFusionIds.current[index] !== currentFusionId) {
            previousFusionIds.current[index] = currentFusionId;
            teamSpriteRefs.current[index]?.playEvolution();
          }
        } else if (slot.isEmpty) {
          // Reset previous fusion ID for empty slots
          previousFusionIds.current[index] = null;
        }
      });
    });

    // Cleanup animation frame on unmount
    return () => {
      cancelAnimationFrame(animationFrame);
    };
  }, [activePlaythrough?.team, encounters, pokemonByUid]);

  // Show skeleton while loading
  if (!(activePlaythrough && encounters)) {
    return <TeamSlotsSkeleton />;
  }

  return (
    <>
      <div className="hidden flex-col items-center lg:flex">
        <div className="flex gap-3 sm:gap-4 md:gap-5">
          {teamSlots.map((slot) =>
            slot.isEmpty ? (
              <CursorTooltip
                content="Click to add a Pokémon"
                delay={300}
                key={slot.position}
                offset={{ mainAxis: 16 }}
                placement="bottom-start"
              >
                <div
                  aria-label={`Add Pokémon to team slot ${slot.position + 1}`}
                  className={clsx(
                    "group/team-slot relative flex flex-col items-center justify-center",
                    "size-16 rounded-full border transition-all duration-200 sm:size-18 md:size-20",
                    "cursor-pointer border-gray-100 bg-white hover:border-gray-200 dark:border-gray-800/30 dark:bg-gray-900 dark:hover:border-gray-700/50",
                  )}
                  onClick={() => openPicker(slot.position)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      openPicker(slot.position);
                    }
                  }}
                  role="button"
                  tabIndex={0}
                >
                  <div className="relative flex h-full w-full flex-col items-center justify-center text-center">
                    <div
                      className="absolute h-full w-full rounded-full border border-gray-100 text-gray-300 opacity-30 dark:border-gray-800/20 dark:text-gray-600"
                      style={{
                        background:
                          "repeating-linear-gradient(currentColor 0px, currentColor 2px, rgba(156, 163, 175, 0.3) 1px, rgba(156, 163, 175, 0.3) 3px)",
                      }}
                    />
                    <div className="relative z-10 flex items-center justify-center">
                      <PokeballIcon
                        aria-hidden="true"
                        className="h-8 w-8 text-gray-400 opacity-60 dark:text-gray-500"
                        focusable={false}
                      />
                    </div>
                  </div>
                </div>
              </CursorTooltip>
            ) : (
              <TeamMemberContextMenu
                key={slot.position}
                onClose={() => {
                  // Context menu closed, no specific action needed
                }}
                shouldLoad={!slot.isEmpty}
                teamMember={slot}
              >
                <div
                  className={clsx(
                    "group/team-slot relative flex flex-col items-center justify-center",
                    "size-16 rounded-full border transition-all duration-200 sm:size-18 md:size-20",
                    "cursor-pointer border-gray-100 bg-white hover:border-gray-200 dark:border-gray-800/30 dark:bg-gray-900 dark:hover:border-gray-700/50",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2",
                  )}
                  onClick={() => openPicker(slot.position)}
                  onKeyDown={(e) => {
                    if (
                      e.target === e.currentTarget &&
                      (e.key === "Enter" || e.key === " ")
                    ) {
                      e.preventDefault();
                      openPicker(slot.position);
                    }
                  }}
                  role="button"
                  tabIndex={0}
                >
                  {slot.headPokemon !== undefined &&
                    slot.bodyPokemon !== undefined &&
                    slot.isFusion !== undefined && (
                      <TypeIndicators
                        bodyPokemon={slot.bodyPokemon}
                        headPokemon={slot.headPokemon}
                        isFusion={slot.isFusion}
                      />
                    )}

                  <div className="relative flex h-full w-full flex-col items-center justify-center">
                    <div
                      className="absolute h-full w-full rounded-full border border-gray-200 text-gray-300 opacity-30 dark:border-gray-600 dark:text-gray-600"
                      style={{
                        background:
                          "repeating-linear-gradient(currentColor 0px, currentColor 2px, rgba(156, 163, 175, 0.3) 1px, rgba(156, 163, 175, 0.3) 3px)",
                      }}
                    />

                    <div className="relative z-10">
                      <CursorTooltip
                        content={
                          <TeamMemberTooltipContent
                            bodyPokemon={slot.bodyPokemon || null}
                            headPokemon={slot.headPokemon || null}
                            isFusion={slot.isFusion === true}
                          />
                        }
                        delay={500}
                      >
                        <div>
                          <FusionSprite
                            bodyPokemon={slot.bodyPokemon || null}
                            headPokemon={slot.headPokemon || null}
                            isFusion={slot.isFusion}
                            ref={(ref) => {
                              teamSpriteRefs.current[slot.position] = ref;
                            }}
                            shouldLoad={true}
                            showStatusOverlay={true}
                          />
                        </div>
                      </CursorTooltip>
                    </div>

                    <ArtworkVariantButton
                      bodyId={slot.bodyPokemon?.id}
                      className="absolute right-1/2 bottom-0 z-20 -translate-x-6 opacity-0 transition-opacity duration-200 focus:opacity-100 group-hover/team-slot:opacity-50"
                      headId={slot.headPokemon?.id}
                      isFusion={slot.isFusion}
                      shouldLoad={true}
                    />
                  </div>
                </div>
              </TeamMemberContextMenu>
            ),
          )}
        </div>
      </div>

      <TeamMemberPickerModal
        existingTeamMember={
          selectedPosition === null ? null : teamSlots[selectedPosition]
        }
        isOpen={pickerModalOpen}
        onClose={closePicker}
        onSelect={selectTeamMember}
        position={selectedPosition || 0}
      />
    </>
  );
}
