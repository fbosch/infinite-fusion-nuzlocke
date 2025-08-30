'use client';

import { useMemo, useState, useRef, useEffect } from 'react';
import {
  useActivePlaythrough,
  useEncounters,
} from '@/stores/playthroughs/hooks';

import { getLocationById } from '@/loaders/locations';
import {
  FusionSprite,
  type FusionSpriteHandle,
} from '@/components/PokemonSummaryCard/FusionSprite';
import { clsx } from 'clsx';
import { Plus } from 'lucide-react';
import TeamMemberPickerModal from './TeamMemberPickerModal';
import { type PokemonOptionType } from '@/loaders/pokemon';
import { playthroughActions } from '@/stores/playthroughs';

export default function TeamSlots() {
  const activePlaythrough = useActivePlaythrough();
  const encounters = useEncounters();
  const [pickerModalOpen, setPickerModalOpen] = useState(false);
  const [selectedPosition, setSelectedPosition] = useState<number | null>(null);

  // Refs for team member sprites to play evolution animations
  const teamSpriteRefs = useRef<(FusionSpriteHandle | null)[]>([]);
  const previousFusionIds = useRef<(string | null)[]>([]);

  const teamSlots = useMemo(() => {
    if (!activePlaythrough?.team) return [];

    return activePlaythrough.team.members.map((member, index) => {
      if (!member) {
        return {
          position: index,
          isEmpty: true,
        };
      }

      // Get encounter data directly from encounters to ensure reactivity
      // Search ALL Pokémon (both head and body) from all encounters by UID
      const allPokemon = Object.values(encounters || {}).flatMap(enc => {
        const pokemon = [];
        if (enc.head) pokemon.push(enc.head);
        if (enc.body) pokemon.push(enc.body);
        return pokemon;
      });

      const headPokemon = member.headPokemonUid
        ? allPokemon.find(pokemon => pokemon.uid === member.headPokemonUid) ||
          null
        : null;
      const bodyPokemon = member.bodyPokemonUid
        ? allPokemon.find(pokemon => pokemon.uid === member.bodyPokemonUid) ||
          null
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
        headPokemon?.originalLocation || bodyPokemon?.originalLocation || ''
      );

      // Determine fusion state: true if both Pokémon exist and can form a fusion
      const isFusion = Boolean(headPokemon && bodyPokemon);

      return {
        position: index,
        isEmpty: false,
        location: location?.name || 'Unknown Location',
        headPokemon,
        bodyPokemon,
        isFusion,
      };
    });
  }, [activePlaythrough?.team?.members, encounters]);

  // Track fusion ID changes and play evolution animations for team members
  useEffect(() => {
    // Initialize refs arrays if needed
    if (teamSpriteRefs.current.length !== 6) {
      teamSpriteRefs.current = new Array(6).fill(null);
    }
    if (previousFusionIds.current.length !== 6) {
      previousFusionIds.current = new Array(6).fill(null);
    }

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

        // Play animation if fusion ID changed
        if (previousFusionIds.current[index] !== currentFusionId) {
          previousFusionIds.current[index] = currentFusionId;
          teamSpriteRefs.current[index]?.playEvolution();
        }
      } else if (slot.isEmpty) {
        // Reset previous fusion ID for empty slots
        previousFusionIds.current[index] = null;
      }
    });
  }, [teamSlots]);

  const handleSlotClick = (
    position: number,
    existingSlot: {
      position: number;
      isEmpty: boolean;
      location?: string;
      headPokemon?: PokemonOptionType | null;
      bodyPokemon?: PokemonOptionType | null;
      isFusion?: boolean;
    } | null
  ) => {
    setSelectedPosition(position);
    setPickerModalOpen(true);
  };

  const handlePokemonSelect = (
    headPokemon: PokemonOptionType | null,
    bodyPokemon: PokemonOptionType | null
  ) => {
    if (selectedPosition === null) return;

    // Use the proper store action instead of direct mutation
    // Extract UID information for the store action
    // For single Pokémon selections, we need to handle this properly
    let headPokemonRef: { uid: string } | null = null;
    let bodyPokemonRef: { uid: string } | null = null;

    if (headPokemon && bodyPokemon) {
      // Both Pokémon selected - this is a fusion
      headPokemonRef = { uid: headPokemon.uid! };
      bodyPokemonRef = { uid: bodyPokemon.uid! };
    } else if (headPokemon) {
      // Only head Pokémon selected - this is a single Pokémon
      headPokemonRef = { uid: headPokemon.uid! };
      bodyPokemonRef = null;
    } else if (bodyPokemon) {
      // Only body Pokémon selected - this is a single Pokémon
      // Store it as the body Pokémon, not the head
      headPokemonRef = null;
      bodyPokemonRef = { uid: bodyPokemon.uid! };
    }

    const success = playthroughActions.updateTeamMember(
      selectedPosition,
      headPokemonRef,
      bodyPokemonRef
    );

    if (!success) {
      console.error(
        'Failed to update team member at position:',
        selectedPosition
      );
      return;
    }

    // Close the modal
    handleCloseModal();
  };

  const handleCloseModal = () => {
    setPickerModalOpen(false);
    setSelectedPosition(null);
  };

  if (!activePlaythrough) {
    return null;
  }

  return (
    <>
      <div className='hidden lg:flex flex-col items-center'>
        <div className='flex gap-1 sm:gap-2 md:gap-3'>
          {teamSlots.map(slot => (
            <div
              key={slot.position}
              className={clsx(
                'flex flex-col items-center justify-center relative',
                'size-16 sm:size-18 md:size-22 rounded-full border transition-all duration-200',
                slot.isEmpty
                  ? 'border-gray-200 dark:border-gray-700 bg-transparent hover:border-gray-300 dark:hover:border-gray-600 cursor-pointer'
                  : 'border-gray-200 dark:border-gray-700 bg-transparent hover:border-gray-300 dark:hover:border-gray-600 cursor-pointer'
              )}
              onClick={() =>
                handleSlotClick(slot.position, slot.isEmpty ? null : slot)
              }
            >
              {slot.isEmpty ? (
                <div className='flex flex-col items-center justify-center text-center relative w-full h-full'>
                  <div
                    className='w-full h-full absolute rounded-full opacity-30 border border-gray-200 dark:border-gray-600 text-white dark:mix-blend-soft-light'
                    style={{
                      background: `repeating-linear-gradient(currentColor 0px, currentColor 2px, rgba(154, 163, 175, 0.3) 1px, rgba(156, 163, 175, 0.3) 3px)`,
                    }}
                  />
                  <div className='flex flex-col items-center justify-center text-center relative z-10'>
                    <Plus className='h-6 w-6 text-gray-400 dark:text-gray-500' />
                    <span className='text-xs text-gray-500 dark:text-gray-400 mt-1'>
                      Add
                    </span>
                  </div>
                </div>
              ) : (
                <div className='flex flex-col items-center justify-center relative w-full h-full'>
                  <div
                    className='w-full h-full absolute rounded-full opacity-30 border border-gray-200 dark:border-gray-600 text-white dark:mix-blend-soft-light'
                    style={{
                      background: `repeating-linear-gradient(currentColor 0px, currentColor 2px, rgba(154, 163, 175, 0.3) 1px, rgba(156, 163, 175, 0.3) 3px)`,
                    }}
                  />

                  <div className='relative z-10'>
                    <FusionSprite
                      ref={ref => {
                        teamSpriteRefs.current[slot.position] = ref;
                      }}
                      headPokemon={slot.headPokemon || null}
                      bodyPokemon={slot.bodyPokemon || null}
                      isFusion={slot.isFusion}
                      shouldLoad={true}
                      showStatusOverlay={true}
                    />
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <TeamMemberPickerModal
        key={`team-member-picker-${selectedPosition}`}
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
