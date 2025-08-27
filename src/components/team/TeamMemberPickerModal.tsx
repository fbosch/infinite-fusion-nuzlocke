'use client';

import React, { useEffect, useState, useMemo } from 'react';
import {
  Dialog,
  DialogPanel,
  DialogTitle,
  DialogBackdrop,
} from '@headlessui/react';
import { X, Search } from 'lucide-react';
import clsx from 'clsx';
import { useActivePlaythrough } from '@/stores/playthroughs';
import { useEncounters } from '@/stores/playthroughs/hooks';
import { type PokemonOptionType, PokemonStatus } from '@/loaders/pokemon';
import { PokemonSlotSelector } from './PokemonSlotSelector';
import { PokemonGridItem } from './PokemonGridItem';
import { PokemonPreview } from './PokemonPreview';

interface TeamMemberPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (
    headPokemon: PokemonOptionType,
    bodyPokemon: PokemonOptionType,
    headLocationId: string,
    bodyLocationId: string
  ) => void;
  position: number;
}

export default function TeamMemberPickerModal({
  isOpen,
  onClose,
  onSelect,
  position,
}: TeamMemberPickerModalProps) {
  const activePlaythrough = useActivePlaythrough();
  const encounters = useEncounters();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedHead, setSelectedHead] = useState<{
    pokemon: PokemonOptionType;
    locationId: string;
  } | null>(null);
  const [selectedBody, setSelectedBody] = useState<{
    pokemon: PokemonOptionType;
    locationId: string;
  } | null>(null);
  const [activeSlot, setActiveSlot] = useState<'head' | 'body' | null>('head');

  // Auto-switch to head selection mode when both slots are empty
  useEffect(() => {
    if (!selectedHead && !selectedBody && !activeSlot) {
      setActiveSlot('head');
    }
  }, [selectedHead, selectedBody, activeSlot]);

  // Get all available Pokémon from encounters
  const availablePokemon = useMemo(() => {
    if (!encounters) return [];

    const pokemon = Object.entries(encounters).flatMap(
      ([locationId, encounter]) => {
        const validPokemon = [];

        if (
          encounter.head?.status &&
          encounter.head.status !== PokemonStatus.MISSED &&
          encounter.head.status !== PokemonStatus.DECEASED
        ) {
          validPokemon.push({ pokemon: encounter.head, locationId });
        }
        if (
          encounter.body?.status &&
          encounter.body.status !== PokemonStatus.MISSED &&
          encounter.body.status !== PokemonStatus.DECEASED
        ) {
          validPokemon.push({ pokemon: encounter.body, locationId });
        }

        return validPokemon;
      }
    );

    if (!searchQuery.trim()) return pokemon;

    const query = searchQuery.toLowerCase();
    return pokemon.filter(
      p =>
        p.pokemon.name.toLowerCase().includes(query) ||
        p.pokemon.nickname?.toLowerCase().includes(query)
    );
  }, [encounters, searchQuery]);

  const handleSlotSelect = (slot: 'head' | 'body') => {
    setActiveSlot(slot);
  };

  const handlePokemonSelect = (
    pokemon: PokemonOptionType,
    locationId: string
  ) => {
    const isSelectedHead =
      selectedHead?.pokemon.id === pokemon.id &&
      selectedHead?.locationId === locationId;
    const isSelectedBody =
      selectedBody?.pokemon.id === pokemon.id &&
      selectedBody?.locationId === locationId;

    // Handle unselecting
    if (isSelectedHead) {
      setSelectedHead(null);
      setActiveSlot(activeSlot === 'head' ? null : 'head');
      return;
    }
    if (isSelectedBody) {
      setSelectedBody(null);
      setActiveSlot(activeSlot === 'body' ? null : 'body');
      return;
    }

    // Handle selecting
    const slot = activeSlot;
    if (slot === 'head') {
      setSelectedHead({ pokemon, locationId });
      setActiveSlot(selectedBody ? null : 'body');
    } else if (slot === 'body') {
      setSelectedBody({ pokemon, locationId });
      setActiveSlot(selectedHead ? null : 'head');
    }
  };

  const handleUpdateTeamMember = () => {
    const headPokemon = selectedHead?.pokemon;
    const bodyPokemon = selectedBody?.pokemon;
    const headLocationId = selectedHead?.locationId;
    const bodyLocationId = selectedBody?.locationId;

    if (!headPokemon && !bodyPokemon) return;

    onSelect(
      headPokemon || bodyPokemon!,
      bodyPokemon || headPokemon!,
      headLocationId || bodyLocationId!,
      bodyLocationId || headLocationId!
    );
    onClose();
  };

  const handleClose = () => {
    setSearchQuery('');
    setSelectedHead(null);
    setSelectedBody(null);
    setActiveSlot('head');
    onClose();
  };

  const canUpdateTeam = selectedHead || selectedBody;

  if (!activePlaythrough) return null;

  return (
    <Dialog open={isOpen} onClose={handleClose} className='relative z-50 group'>
      <DialogBackdrop
        transition
        className='fixed inset-0 bg-black/30 dark:bg-black/50 backdrop-blur-[2px] data-closed:opacity-0 data-enter:opacity-100'
        aria-hidden='true'
      />

      <div className='fixed inset-0 flex w-screen items-center justify-center p-2 sm:p-4'>
        <DialogPanel
          transition
          className={clsx(
            'w-full max-w-5xl max-h-[90vh] sm:max-h-[80vh] space-y-4 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 p-4 sm:p-6 flex flex-col',
            'transition duration-150 ease-out data-closed:opacity-0 data-closed:scale-98'
          )}
        >
          <div className='flex items-center justify-between'>
            <DialogTitle className='text-xl font-semibold text-gray-900 dark:text-white'>
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

          <div className='flex flex-col lg:flex-row gap-4 lg:gap-6 flex-1 min-h-0'>
            <div className='flex-1 flex flex-col space-y-4'>
              <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
                <PokemonSlotSelector
                  slot='head'
                  selectedPokemon={selectedHead}
                  isActive={activeSlot === 'head'}
                  onSlotSelect={handleSlotSelect}
                  onRemovePokemon={() => setSelectedHead(null)}
                />

                <PokemonSlotSelector
                  slot='body'
                  selectedPokemon={selectedBody}
                  isActive={activeSlot === 'body'}
                  onSlotSelect={handleSlotSelect}
                  onRemovePokemon={() => setSelectedBody(null)}
                />
              </div>

              <div className='relative'>
                <Search className='absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400' />
                <input
                  type='text'
                  placeholder='Search Pokémon...'
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className='w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent'
                />
              </div>

              <div className='flex-1 max-h-64 overflow-y-auto scrollbar-thin pr-1'>
                {availablePokemon.length > 0 ? (
                  <div className='grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-5 gap-2'>
                    {availablePokemon.map(({ pokemon, locationId }) => {
                      const isSelectedHead =
                        selectedHead?.pokemon.id === pokemon.id &&
                        selectedHead?.locationId === locationId;
                      const isSelectedBody =
                        selectedBody?.pokemon.id === pokemon.id &&
                        selectedBody?.locationId === locationId;
                      const isSelected = isSelectedHead || isSelectedBody;
                      const isActiveSlot = Boolean(activeSlot && !isSelected);

                      return (
                        <PokemonGridItem
                          key={`${pokemon.uid || pokemon.id}-${locationId}`}
                          pokemon={pokemon}
                          locationId={locationId}
                          isSelectedHead={isSelectedHead}
                          isSelectedBody={isSelectedBody}
                          isActiveSlot={isActiveSlot}
                          onSelect={handlePokemonSelect}
                        />
                      );
                    })}
                  </div>
                ) : (
                  <div className='text-center py-8 text-gray-500 dark:text-gray-400'>
                    {searchQuery.trim()
                      ? 'No Pokémon found matching your search.'
                      : 'No Pokémon available.'}
                  </div>
                )}
              </div>
            </div>

            <div className='hidden lg:block w-px bg-gray-200 dark:bg-gray-600'></div>

            <div className='w-full lg:w-64 flex flex-col space-y-4'>
              <PokemonPreview
                headPokemon={selectedHead?.pokemon || null}
                bodyPokemon={selectedBody?.pokemon || null}
              />

              <button
                onClick={handleUpdateTeamMember}
                disabled={!canUpdateTeam}
                className={clsx(
                  'w-full px-6 py-3 rounded-lg font-medium transition-colors',
                  canUpdateTeam
                    ? 'bg-blue-600 text-white hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed dark:bg-gray-600 dark:text-gray-400'
                )}
              >
                Update Team Member
              </button>
            </div>
          </div>
        </DialogPanel>
      </div>
    </Dialog>
  );
}
