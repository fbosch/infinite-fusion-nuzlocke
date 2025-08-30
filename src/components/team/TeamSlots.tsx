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
import { findPokemonByUid } from '@/utils/encounter-utils';
import { TypePills } from '@/components/TypePills';
import { useFusionTypesFromPokemon } from '@/hooks/useFusionTypes';

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
    isFusion
  );

  // Get nickname from head Pokémon (or body if no head)
  const nickname = headPokemon?.nickname || bodyPokemon?.nickname;

  return (
    <>
      {/* Type indicators above the slot */}
      {(primary || secondary) && (
        <div className='absolute -top-4 left-1/2 transform -translate-x-1/2 z-20'>
          <TypePills
            primary={primary}
            secondary={secondary}
            size='xxs'
            showTooltip={true}
          />
        </div>
      )}

      {/* Nickname below the slot */}
      {nickname && (
        <div className='absolute -bottom-6 left-1/2 transform -translate-x-1/2 z-20'>
          <span className='text-sm font-ds text-gray-700 dark:text-gray-200 pixel-shadow'>
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

      const headPokemon = member.headPokemonUid
        ? findPokemonByUid(encounters, member.headPokemonUid)
        : null;
      const bodyPokemon = member.bodyPokemonUid
        ? findPokemonByUid(encounters, member.bodyPokemonUid)
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
  }, [activePlaythrough?.team, encounters]);

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
    _existingSlot: {
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

    // Create team member references
    const headRef = headPokemon ? { uid: headPokemon.uid! } : null;
    const bodyRef = bodyPokemon ? { uid: bodyPokemon.uid! } : null;

    const success = playthroughActions.updateTeamMember(
      selectedPosition,
      headRef,
      bodyRef
    );

    if (!success) {
      console.error(
        'Failed to update team member at position:',
        selectedPosition
      );
      return;
    }

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
        <div className='flex gap-3 sm:gap-4 md:gap-5'>
          {teamSlots.map(slot => (
            <div
              key={slot.position}
              className={clsx(
                'flex flex-col items-center justify-center relative',
                'size-16 sm:size-18 md:size-20 rounded-full border transition-all duration-200',
                slot.isEmpty
                  ? 'border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-500 cursor-pointer'
                  : 'border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-500 cursor-pointer'
              )}
              onClick={() =>
                handleSlotClick(slot.position, slot.isEmpty ? null : slot)
              }
            >
              {!slot.isEmpty &&
                slot.headPokemon !== undefined &&
                slot.bodyPokemon !== undefined &&
                slot.isFusion !== undefined && (
                  <TypeIndicators
                    headPokemon={slot.headPokemon}
                    bodyPokemon={slot.bodyPokemon}
                    isFusion={slot.isFusion}
                  />
                )}
              {slot.isEmpty ? (
                <div className='flex flex-col items-center justify-center text-center relative w-full h-full'>
                  <div
                    className='w-full h-full absolute rounded-full opacity-30 border border-gray-200 dark:border-gray-600 text-gray-300 dark:text-gray-500'
                    style={{
                      background: `repeating-linear-gradient(currentColor 0px, currentColor 2px, rgba(156, 163, 175, 0.3) 1px, rgba(156, 163, 175, 0.3) 3px)`,
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
                    className='w-full h-full absolute rounded-full opacity-30 border border-gray-200 dark:border-gray-600 text-gray-300 dark:text-gray-500'
                    style={{
                      background: `repeating-linear-gradient(currentColor 0px, currentColor 2px, rgba(156, 163, 175, 0.3) 1px, rgba(156, 163, 175, 0.3) 3px)`,
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
