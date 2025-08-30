'use client';

import React from 'react';
import {
  Dialog,
  DialogPanel,
  DialogTitle,
  DialogBackdrop,
} from '@headlessui/react';
import { X } from 'lucide-react';
import clsx from 'clsx';
import { useActivePlaythrough } from '@/stores/playthroughs';
import { type PokemonOptionType } from '@/loaders/pokemon';
import { TeamMemberSelectionPanel } from './TeamMemberSelectionPanel';
import { TeamMemberPreviewPanel } from './TeamMemberPreviewPanel';
import { TeamMemberSelectionProvider } from './TeamMemberSelectionContext';

interface TeamMemberPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (
    headPokemon: PokemonOptionType | null,
    bodyPokemon: PokemonOptionType | null
  ) => void;
  position: number;
  existingTeamMember?: {
    position: number;
    isEmpty: boolean;
    location?: string;
    headPokemon?: PokemonOptionType | null;
    bodyPokemon?: PokemonOptionType | null;
    isFusion?: boolean;
  } | null;
}

export default function TeamMemberPickerModal({
  isOpen,
  onClose,
  onSelect,
  position,
  existingTeamMember,
}: TeamMemberPickerModalProps) {
  const activePlaythrough = useActivePlaythrough();

  const handleUpdateTeamMember = async () => {
    // This will be handled by the context
    onClose();
  };

  const handleClearTeamMember = () => {
    // This will be handled by the context
    onClose();
  };

  const handleClose = () => {
    onClose();
  };

  if (!activePlaythrough) return null;

  return (
    <TeamMemberSelectionProvider
      position={position}
      existingTeamMember={existingTeamMember}
      onSelect={onSelect}
    >
      <Dialog
        open={isOpen}
        onClose={handleClose}
        className='relative z-50 group'
      >
        <DialogBackdrop
          transition
          className='fixed inset-0 bg-black/30 dark:bg-black/50 backdrop-blur-[2px] data-closed:opacity-0 data-enter:opacity-100'
          aria-hidden='true'
        />

        <div className='fixed inset-0 flex w-screen items-center justify-center p-2 sm:p-4'>
          <DialogPanel
            transition
            className={clsx(
              'w-full max-w-6xl max-h-[90vh] sm:max-h-[80vh] space-y-6 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 p-6 sm:p-8 flex flex-col',
              'transition duration-150 ease-out data-closed:opacity-0 data-closed:scale-98'
            )}
          >
            <div className='flex items-center justify-between'>
              <DialogTitle className='text-2xl font-semibold text-gray-900 dark:text-white'>
                Select Pokémon for Team Slot {position + 1}
              </DialogTitle>
              <button
                onClick={handleClose}
                className={clsx(
                  'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300',
                  'focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-500 focus-visible:ring-offset-2',
                  'p-1 rounded-md transition-colors cursor-pointer'
                )}
                aria-label='Close modal'
              >
                <X className='h-5 w-5' />
              </button>
            </div>

            <div className='flex flex-col lg:flex-row gap-6 flex-1 min-h-0'>
              <TeamMemberSelectionPanel />
              <div className='hidden lg:block w-px bg-gray-200 dark:bg-gray-600'></div>
              <TeamMemberPreviewPanel />
            </div>
          </DialogPanel>
        </div>
      </Dialog>
    </TeamMemberSelectionProvider>
  );
}
