"use client";

import {
  DndContext,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
  PointerSensor,
  closestCenter,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { clsx } from "clsx";
import { GripVertical, MousePointer, Palette } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
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
import { useSpriteCredits } from "@/hooks/useSprite";
import { getSpriteId } from "@/lib/sprites";
import { getLocationById } from "@/loaders/locations";
import type { PokemonOptionType } from "@/loaders/pokemon";
import { playthroughActions } from "@/stores/playthroughs";
import {
  useActivePlaythrough,
  useEncounters,
} from "@/stores/playthroughs/hooks";
import {
  buildPokemonUidIndex,
  findPokemonByUid,
} from "@/utils/encounter-utils";
import { formatArtistCredits } from "@/utils/formatCredits";
import TeamMemberPickerModal from "./TeamMemberPickerModal";
import TeamSlotsSkeleton from "./TeamSlotsSkeleton";

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
        <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 z-20">
          <TypePills
            primary={primary}
            secondary={secondary}
            size="xxs"
            showTooltip={true}
          />
        </div>
      )}

      {/* Nickname below the slot */}
      {nickname && (
        <div className="absolute -bottom-6 left-1/2 transform -translate-x-1/2 z-20">
          <span className="text-sm font-ds text-gray-700 dark:text-gray-200 pixel-shadow">
            {nickname}
          </span>
        </div>
      )}
    </>
  );
}

// Component to create tooltip content for team members
function TeamMemberTooltipContent({
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

  // Get sprite credits
  const tooltipSpriteId = getSpriteId(headPokemon?.id, bodyPokemon?.id);
  const { data: tooltipCredits } = useSpriteCredits(
    headPokemon?.id,
    bodyPokemon?.id,
    true,
  );

  const credit =
    tooltipSpriteId == null
      ? undefined
      : (() => {
          const credits = tooltipCredits?.[tooltipSpriteId];
          return credits && Object.keys(credits).length > 0
            ? formatArtistCredits(credits)
            : undefined;
        })();

  return (
    <div className="min-w-44 max-w-[22rem]" role="tooltip">
      <div className="flex py-0.5">
        <TypePills primary={primary} secondary={secondary} />
      </div>
      {credit && (
        <>
          <div className="my-2 flex">
            <div className="inline-flex items-center gap-1.5 text-[11px] text-gray-700 dark:text-gray-400">
              <Palette
                className="h-3 w-3"
                aria-hidden="true"
                focusable={false}
              />
              <span className="opacity-80">by</span>
              <span className="truncate max-w-[14rem]" title={credit}>
                {credit}
              </span>
            </div>
          </div>
          <div className="w-full h-px bg-gray-200 dark:bg-gray-700 my-1" />
        </>
      )}
      <div className="flex items-center text-xs gap-2">
        <div className="flex items-center gap-1">
          <div className="flex items-center gap-0.5 px-1 py-px bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded text-gray-700 dark:text-gray-200">
            <MousePointer
              className="h-3 w-3"
              aria-hidden="true"
              focusable={false}
            />
            <span className="font-medium text-xs">L</span>
          </div>
          <span className="text-gray-600 dark:text-gray-300 text-xs">
            Change
          </span>
        </div>
        <div className="flex items-center gap-1">
          <div className="flex items-center gap-0.5 px-1 py-px bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded text-gray-700 dark:text-gray-200">
            <MousePointer
              className="h-3 w-3"
              aria-hidden="true"
              focusable={false}
            />
            <span className="font-medium text-xs">R</span>
          </div>
          <span className="text-gray-600 dark:text-gray-300 text-xs">
            Options
          </span>
        </div>
      </div>
    </div>
  );
}

// Drop zone wrapper that makes each slot a valid DnD drop target
function SlotDropZone({
  position,
  isDraggingActive,
  isKbTarget,
  children,
}: {
  position: number;
  isDraggingActive: boolean;
  isKbTarget: boolean;
  children: React.ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: position,
    data: { position },
    disabled: !isDraggingActive,
  });

  return (
    <div
      ref={setNodeRef}
      className={clsx(
        "relative rounded-full transition-all duration-150",
        isOver && "ring-2 ring-blue-400 ring-offset-1",
        isKbTarget && "ring-2 ring-violet-400 ring-offset-1",
      )}
    >
      {children}
    </div>
  );
}

// Drag handle button — only rendered on filled slots
function SlotDragHandle({
  position,
  label,
  kbReorderFrom,
  kbReorderTarget,
  onKeyDown,
}: {
  position: number;
  label: string;
  kbReorderFrom: number | null;
  kbReorderTarget: number;
  onKeyDown: (
    position: number,
    e: React.KeyboardEvent<HTMLButtonElement>,
  ) => void;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: position,
    data: { position },
  });

  const isKbActive = kbReorderFrom === position;

  return (
    <button
      ref={setNodeRef}
      type="button"
      {...listeners}
      {...attributes}
      onClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => onKeyDown(position, e)}
      aria-label={
        kbReorderFrom === null
          ? `Drag to reorder ${label} (slot ${position + 1})`
          : isKbActive
            ? `Reordering ${label}. Press arrow keys to choose target, Space to confirm, Escape to cancel.`
            : undefined
      }
      aria-pressed={isKbActive}
      className={clsx(
        "absolute -top-1 -right-1 z-30 p-0.5 rounded-full",
        "cursor-grab active:cursor-grabbing",
        "opacity-0 group-hover/team-slot:opacity-100 focus-visible:opacity-100",
        "bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700",
        "text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300",
        "transition-opacity duration-200",
        "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-blue-500",
        isDragging && "opacity-100 cursor-grabbing",
        isKbActive && "opacity-100 ring-2 ring-violet-500",
      )}
    >
      <GripVertical className="h-3 w-3" aria-hidden="true" focusable={false} />
    </button>
  );
}

export default function TeamSlots() {
  const activePlaythrough = useActivePlaythrough();
  const encounters = useEncounters();
  const [pickerModalOpen, setPickerModalOpen] = useState(false);
  const [selectedPosition, setSelectedPosition] = useState<number | null>(null);

  // Drag-and-drop state
  const [draggingFromPos, setDraggingFromPos] = useState<number | null>(null);
  const [draggingOverPos, setDraggingOverPos] = useState<number | null>(null);

  // Keyboard reorder state
  const [kbReorderFrom, setKbReorderFrom] = useState<number | null>(null);
  const [kbReorderTarget, setKbReorderTarget] = useState<number>(0);

  // Screen-reader live region
  const [announcement, setAnnouncement] = useState<string>("");

  // Refs for team member sprites to play evolution animations
  const teamSpriteRefs = useRef<(FusionSpriteHandle | null)[]>([]);
  const previousFusionIds = useRef<(string | null)[]>([]);

  const pokemonByUid = useMemo(
    () => buildPokemonUidIndex(encounters),
    [encounters],
  );

  const teamSlots = useMemo(() => {
    if (!activePlaythrough?.team) return [];

    return activePlaythrough.team.members.map((member, index) => {
      if (!member) {
        return {
          position: index,
          isEmpty: true,
        };
      }

      const headPokemon = member.headPokemonUid
        ? findPokemonByUid(encounters, member.headPokemonUid, pokemonByUid)
        : null;
      const bodyPokemon = member.bodyPokemonUid
        ? findPokemonByUid(encounters, member.bodyPokemonUid, pokemonByUid)
        : null;

      // A slot is empty only if both UIDs are empty strings
      if (!member.headPokemonUid && !member.bodyPokemonUid) {
        return {
          position: index,
          isEmpty: true,
        };
      }

      // Get location from the head Pokémon's original location, fallback to body if head doesn't exist
      const location = getLocationById(
        headPokemon?.originalLocation || bodyPokemon?.originalLocation || "",
      );

      // Determine fusion state: true if both Pokémon exist and can form a fusion
      const isFusion = Boolean(headPokemon && bodyPokemon);

      return {
        position: index,
        isEmpty: false,
        location: location?.name || "Unknown Location",
        headPokemon,
        bodyPokemon,
        isFusion,
      };
    });
  }, [activePlaythrough, encounters, pokemonByUid]);

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
      teamSlots.forEach((slot, index) => {
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

            // Add small delay to ensure ref is properly set
            setTimeout(() => {
              if (teamSpriteRefs.current[index]) {
                teamSpriteRefs.current[index]?.playEvolution();
              }
            }, 50);
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
  }, [teamSlots]);

  // Escape key cancels keyboard reorder when focus leaves the slot area
  useEffect(() => {
    if (kbReorderFrom === null) return;
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setKbReorderFrom(null);
        setAnnouncement("Reorder cancelled.");
      }
    };
    window.addEventListener("keydown", handleGlobalKeyDown);
    return () => window.removeEventListener("keydown", handleGlobalKeyDown);
  }, [kbReorderFrom]);

  // dnd-kit sensors (pointer only; keyboard reorder is handled via state)
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
  );

  // Show skeleton while loading
  if (!activePlaythrough || !encounters) {
    return <TeamSlotsSkeleton />;
  }

  const handleSlotClick = (position: number) => {
    // If in keyboard reorder mode, confirm the reorder instead of opening picker
    if (kbReorderFrom !== null) {
      if (kbReorderFrom !== position) {
        playthroughActions.reorderTeam(kbReorderFrom, position);
        const fromSlot = teamSlots[kbReorderFrom];
        const fromName = !fromSlot.isEmpty
          ? (fromSlot.headPokemon?.name ??
            fromSlot.bodyPokemon?.name ??
            "Pokémon")
          : "Pokémon";
        setAnnouncement(`Moved ${fromName} to slot ${position + 1}.`);
      }
      setKbReorderFrom(null);
      return;
    }
    setSelectedPosition(position);
    setPickerModalOpen(true);
  };

  const handlePokemonSelect = async (
    headPokemon: PokemonOptionType | null,
    bodyPokemon: PokemonOptionType | null,
  ) => {
    if (selectedPosition === null) return;

    // Create team member references
    const headRef = headPokemon ? { uid: headPokemon.uid! } : null;
    const bodyRef = bodyPokemon ? { uid: bodyPokemon.uid! } : null;

    const success = await playthroughActions.updateTeamMember(
      selectedPosition,
      headRef,
      bodyRef,
    );

    if (!success) {
      console.error(
        "Failed to update team member at position:",
        selectedPosition,
      );
      return;
    }

    handleCloseModal();
  };

  const handleCloseModal = () => {
    setPickerModalOpen(false);
    setSelectedPosition(null);
  };

  // Keyboard reorder handler for drag handle buttons
  const handleDragHandleKeyDown = (
    position: number,
    e: React.KeyboardEvent<HTMLButtonElement>,
  ) => {
    if (kbReorderFrom === null) {
      // Start keyboard reorder mode
      if (e.key === " " || e.key === "Enter") {
        e.preventDefault();
        e.stopPropagation();
        const slot = teamSlots[position];
        const name = !slot.isEmpty
          ? (slot.headPokemon?.name ?? slot.bodyPokemon?.name ?? "Pokémon")
          : "Pokémon";
        const initialTarget = position === 5 ? 0 : position + 1;
        setKbReorderFrom(position);
        setKbReorderTarget(initialTarget);
        setAnnouncement(
          `Picked up ${name} from slot ${position + 1}. Press Left or Right arrow to choose target, Space to confirm, Escape to cancel.`,
        );
      }
    } else {
      // Already in reorder mode
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        setKbReorderFrom(null);
        setAnnouncement("Reorder cancelled.");
      } else if (e.key === " " || e.key === "Enter") {
        e.preventDefault();
        e.stopPropagation();
        const from = kbReorderFrom;
        const to = kbReorderTarget;
        setKbReorderFrom(null);
        if (from !== to) {
          playthroughActions.reorderTeam(from, to);
          setAnnouncement(`Moved to slot ${to + 1}.`);
        } else {
          setAnnouncement("Dropped in the same position.");
        }
      } else if (e.key === "ArrowRight" || e.key === "ArrowDown") {
        e.preventDefault();
        const next = (kbReorderTarget + 1) % 6;
        setKbReorderTarget(next);
        setAnnouncement(`Target: slot ${next + 1}.`);
      } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
        e.preventDefault();
        const prev = (kbReorderTarget - 1 + 6) % 6;
        setKbReorderTarget(prev);
        setAnnouncement(`Target: slot ${prev + 1}.`);
      }
    }
  };

  const handleDragStart = (event: DragStartEvent) => {
    const pos = event.active.data.current?.position as number;
    setDraggingFromPos(pos);
    const slot = teamSlots[pos];
    const name = !slot.isEmpty
      ? (slot.headPokemon?.name ?? slot.bodyPokemon?.name ?? "Pokémon")
      : "Pokémon";
    setAnnouncement(`Picked up ${name} from slot ${pos + 1}.`);
  };

  const handleDragOver = (event: DragOverEvent) => {
    const overPos = event.over?.data.current?.position as number | undefined;
    setDraggingOverPos(overPos ?? null);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const from = event.active.data.current?.position as number;
    const to = event.over?.data.current?.position as number | undefined;
    setDraggingFromPos(null);
    setDraggingOverPos(null);
    if (to == null || from === to) {
      setAnnouncement(
        from === to ? "Dropped in the same position." : "Move cancelled.",
      );
      return;
    }
    playthroughActions.reorderTeam(from, to);
    setAnnouncement(`Moved slot ${from + 1} to position ${to + 1}.`);
  };

  const handleDragCancel = () => {
    setDraggingFromPos(null);
    setDraggingOverPos(null);
    setAnnouncement("Move cancelled.");
  };

  const isDraggingActive = draggingFromPos !== null;

  return (
    <>
      {/* Polite live region for screen-reader announcements */}
      {/* biome-ignore lint/a11y/useAriaPropsForRole: aria-live regions don't require additional ARIA properties */}
      <div
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
        role="status"
      >
        {announcement}
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
      >
        <div className="hidden lg:flex flex-col items-center">
          <div className="flex gap-3 sm:gap-4 md:gap-5">
            {teamSlots.map((slot) => {
              const isKbTarget =
                kbReorderFrom !== null && kbReorderTarget === slot.position;
              const isDraggingThisSlot = draggingFromPos === slot.position;

              return slot.isEmpty ? (
                <SlotDropZone
                  key={slot.position}
                  position={slot.position}
                  isDraggingActive={isDraggingActive}
                  isKbTarget={isKbTarget}
                >
                  <CursorTooltip
                    content={
                      kbReorderFrom !== null
                        ? "Press Space to move here"
                        : "Click to add a Pokémon"
                    }
                    placement="bottom-start"
                    delay={300}
                    offset={{ mainAxis: 16 }}
                  >
                    <div
                      className={clsx(
                        "flex flex-col items-center justify-center relative group/team-slot",
                        "size-16 sm:size-18 md:size-20 rounded-full border transition-all duration-200",
                        "border-gray-100 dark:border-gray-800/30 bg-white dark:bg-gray-900 hover:border-gray-200 dark:hover:border-gray-700/50 cursor-pointer",
                      )}
                      onClick={() => handleSlotClick(slot.position)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          handleSlotClick(slot.position);
                        }
                      }}
                      role="button"
                      tabIndex={0}
                    >
                      <div className="flex flex-col items-center justify-center text-center relative w-full h-full">
                        <div
                          className="w-full h-full absolute rounded-full opacity-30 border border-gray-100 dark:border-gray-800/20 text-gray-300 dark:text-gray-600"
                          style={{
                            background: `repeating-linear-gradient(currentColor 0px, currentColor 2px, rgba(156, 163, 175, 0.3) 1px, rgba(156, 163, 175, 0.3) 3px)`,
                          }}
                        />
                        <div className="flex items-center justify-center relative z-10">
                          <PokeballIcon
                            className="h-8 w-8 text-gray-400 dark:text-gray-500 opacity-60"
                            aria-hidden="true"
                            focusable={false}
                          />
                        </div>
                      </div>
                    </div>
                  </CursorTooltip>
                </SlotDropZone>
              ) : (
                <SlotDropZone
                  key={slot.position}
                  position={slot.position}
                  isDraggingActive={isDraggingActive}
                  isKbTarget={isKbTarget}
                >
                  <TeamMemberContextMenu
                    teamMember={slot}
                    shouldLoad={!slot.isEmpty}
                    onClose={() => {
                      // Context menu closed, no specific action needed
                    }}
                  >
                    <div
                      role="button"
                      tabIndex={0}
                      className={clsx(
                        "flex flex-col items-center justify-center relative group/team-slot",
                        "size-16 sm:size-18 md:size-20 rounded-full border transition-all duration-200",
                        "border-gray-100 dark:border-gray-800/30 bg-white dark:bg-gray-900 hover:border-gray-200 dark:hover:border-gray-700/50 cursor-pointer",
                        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2",
                        isDraggingThisSlot && "opacity-50",
                      )}
                      onClick={() => handleSlotClick(slot.position)}
                      onKeyDown={(e) => {
                        if (
                          e.target === e.currentTarget &&
                          (e.key === "Enter" || e.key === " ")
                        ) {
                          e.preventDefault();
                          handleSlotClick(slot.position);
                        }
                      }}
                    >
                      {slot.headPokemon !== undefined &&
                        slot.bodyPokemon !== undefined &&
                        slot.isFusion !== undefined && (
                          <TypeIndicators
                            headPokemon={slot.headPokemon}
                            bodyPokemon={slot.bodyPokemon}
                            isFusion={slot.isFusion}
                          />
                        )}

                      <div className="flex flex-col items-center justify-center relative w-full h-full">
                        <div
                          className="w-full h-full absolute rounded-full opacity-30 border border-gray-200 dark:border-gray-600 text-gray-300 dark:text-gray-600"
                          style={{
                            background: `repeating-linear-gradient(currentColor 0px, currentColor 2px, rgba(156, 163, 175, 0.3) 1px, rgba(156, 163, 175, 0.3) 3px)`,
                          }}
                        />

                        <div className="relative z-10">
                          <CursorTooltip
                            delay={500}
                            content={
                              <TeamMemberTooltipContent
                                headPokemon={slot.headPokemon || null}
                                bodyPokemon={slot.bodyPokemon || null}
                                isFusion={slot.isFusion || false}
                              />
                            }
                          >
                            <div>
                              <FusionSprite
                                ref={(ref) => {
                                  teamSpriteRefs.current[slot.position] = ref;
                                }}
                                headPokemon={slot.headPokemon || null}
                                bodyPokemon={slot.bodyPokemon || null}
                                isFusion={slot.isFusion}
                                shouldLoad={true}
                                showStatusOverlay={true}
                              />
                            </div>
                          </CursorTooltip>
                        </div>

                        <ArtworkVariantButton
                          headId={slot.headPokemon?.id}
                          bodyId={slot.bodyPokemon?.id}
                          isFusion={slot.isFusion}
                          shouldLoad={true}
                          className="absolute bottom-0 right-1/2 -translate-x-6 z-20 opacity-0 group-hover/team-slot:opacity-50 focus:opacity-100 transition-opacity duration-200"
                        />
                      </div>
                    </div>
                  </TeamMemberContextMenu>

                  {/* Drag handle — only on filled slots, desktop only */}
                  <SlotDragHandle
                    position={slot.position}
                    label={
                      slot.headPokemon?.name ??
                      slot.bodyPokemon?.name ??
                      `slot ${slot.position + 1}`
                    }
                    kbReorderFrom={kbReorderFrom}
                    kbReorderTarget={kbReorderTarget}
                    onKeyDown={handleDragHandleKeyDown}
                  />
                </SlotDropZone>
              );
            })}
          </div>
        </div>
      </DndContext>

      <TeamMemberPickerModal
        isOpen={pickerModalOpen}
        onClose={handleCloseModal}
        onSelect={handlePokemonSelect}
        position={selectedPosition || 0}
        existingTeamMember={
          selectedPosition !== null ? teamSlots[selectedPosition] : null
        }
      />
    </>
  );
}
