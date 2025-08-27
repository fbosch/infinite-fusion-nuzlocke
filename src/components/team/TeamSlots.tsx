'use client';

import { useMemo, useState } from 'react';
import { useActivePlaythrough } from '@/stores/playthroughs/hooks';
import { getTeamMemberDetails } from '@/stores/playthroughs/store';
import { getLocationById } from '@/loaders/locations';
import { FusionSprite } from '@/components/PokemonSummaryCard/FusionSprite';
import { clsx } from 'clsx';
import { Plus } from 'lucide-react';
import TeamMemberPickerModal from './TeamMemberPickerModal';
import { type PokemonOptionType } from '@/loaders/pokemon';

export default function TeamSlots() {
  const activePlaythrough = useActivePlaythrough();
  const [pickerModalOpen, setPickerModalOpen] = useState(false);
  const [selectedPosition, setSelectedPosition] = useState<number | null>(null);

  const teamSlots = useMemo(() => {
    if (!activePlaythrough?.team) return [];

    return activePlaythrough.team.members.map((member, index) => {
      if (!member) {
        return {
          position: index,
          isEmpty: true,
        };
      }

      const details = getTeamMemberDetails(index);
      if (!details) {
        return {
          position: index,
          isEmpty: true,
        };
      }

      const location = getLocationById(details.teamMember.headEncounterId);
      const headPokemon = details.encounter.head;
      const bodyPokemon = details.encounter.body;

      return {
        position: index,
        isEmpty: false,
        location: location?.name || 'Unknown Location',
        headPokemon,
        bodyPokemon,
        isFusion: details.encounter.isFusion,
      };
    });
  }, [activePlaythrough]);

  const handleEmptySlotClick = (position: number) => {
    setSelectedPosition(position);
    setPickerModalOpen(true);
  };

  const handlePokemonSelect = (
    headPokemon: PokemonOptionType,
    bodyPokemon: PokemonOptionType,
    headLocationId: string,
    bodyLocationId: string
  ) => {
    console.log('Selected fusion:', {
      head: headPokemon.name,
      body: bodyPokemon.name,
      headLocation: headLocationId,
      bodyLocation: bodyLocationId,
      position: selectedPosition,
    });
    // TODO: Implement team addition logic for fusion
    // This will create a fusion with the selected head and body Pokémon
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
                  : 'border-gray-200 dark:border-gray-700 bg-transparent hover:border-gray-300 dark:hover:border-gray-600'
              )}
              onClick={
                slot.isEmpty
                  ? () => handleEmptySlotClick(slot.position)
                  : undefined
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
        isOpen={pickerModalOpen}
        onClose={handleCloseModal}
        onSelect={handlePokemonSelect}
        position={selectedPosition || 0}
      />
    </>
  );
}
