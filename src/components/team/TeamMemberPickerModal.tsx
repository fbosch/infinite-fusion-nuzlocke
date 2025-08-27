'use client';

import React, { useState, useMemo } from 'react';
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
import { PokemonSprite } from '@/components/PokemonSprite';
import { FusionSprite } from '@/components/PokemonSummaryCard/FusionSprite';
import { type PokemonOptionType } from '@/loaders/pokemon';
import BodyIcon from '@/assets/images/body.svg';
import HeadIcon from '@/assets/images/head.svg';

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

  // Get all available Pokémon from encounters
  const availablePokemon = useMemo(() => {
    if (!encounters) return [];

    const pokemon: Array<{
      pokemon: PokemonOptionType;
      locationId: string;
    }> = [];

    Object.entries(encounters).forEach(([locationId, encounter]) => {
      // Only include Pokémon with selectable statuses
      if (
        encounter.head &&
        encounter.head.status &&
        ['captured', 'stored', 'traded', 'received'].includes(
          encounter.head.status
        )
      ) {
        pokemon.push({
          pokemon: encounter.head,
          locationId,
        });
      }
      if (
        encounter.body &&
        encounter.body.status &&
        ['captured', 'stored', 'traded', 'received'].includes(
          encounter.body.status
        )
      ) {
        pokemon.push({
          pokemon: encounter.body,
          locationId,
        });
      }
    });

    if (searchQuery.trim()) {
      return pokemon.filter(
        p =>
          p.pokemon.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          p.pokemon.nickname?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    return pokemon;
  }, [encounters, searchQuery]);

  const handleSlotSelect = (slot: 'head' | 'body') => {
    setActiveSlot(slot);
  };

  const handlePokemonSelect = (
    pokemon: PokemonOptionType,
    locationId: string
  ) => {
    // Check if this Pokémon is already selected in either slot
    const isSelectedHead =
      selectedHead?.pokemon.id === pokemon.id &&
      selectedHead?.locationId === locationId;
    const isSelectedBody =
      selectedBody?.pokemon.id === pokemon.id &&
      selectedBody?.locationId === locationId;

    if (isSelectedHead) {
      // Unselect head Pokémon and toggle head selection mode
      setSelectedHead(null);
      setActiveSlot(activeSlot === 'head' ? null : 'head');
      return;
    }

    if (isSelectedBody) {
      // Unselect body Pokémon and toggle body selection mode
      setSelectedBody(null);
      setActiveSlot(activeSlot === 'body' ? null : 'body');
      return;
    }

    // Normal selection logic
    if (activeSlot === 'head') {
      setSelectedHead({ pokemon, locationId });
      // If no body Pokémon is selected, automatically switch to body selection mode
      if (!selectedBody) {
        setActiveSlot('body');
      } else {
        setActiveSlot(null);
      }
    } else if (activeSlot === 'body') {
      setSelectedBody({ pokemon, locationId });
      // If no head Pokémon is selected, automatically switch to head selection mode
      if (!selectedHead) {
        setActiveSlot('head');
      } else {
        setActiveSlot(null);
      }
    }
  };

  const handleUpdateTeamMember = () => {
    if (selectedHead && selectedBody) {
      // Fusion case
      onSelect(
        selectedHead.pokemon,
        selectedBody.pokemon,
        selectedHead.locationId,
        selectedBody.locationId
      );
      onClose();
    } else if (selectedHead && !selectedBody) {
      // Non-fusion case - just head Pokémon
      onSelect(
        selectedHead.pokemon,
        selectedHead.pokemon,
        selectedHead.locationId,
        selectedHead.locationId
      );
      onClose();
    } else if (selectedBody && !selectedHead) {
      // Non-fusion case - just body Pokémon
      onSelect(
        selectedBody.pokemon,
        selectedBody.pokemon,
        selectedBody.locationId,
        selectedBody.locationId
      );
      onClose();
    }
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
                <div
                  onClick={() => handleSlotSelect('head')}
                  className={clsx(
                    'border-2 rounded-lg p-2 transition-colors text-left h-24 relative cursor-pointer',
                    activeSlot === 'head'
                      ? 'border-blue-400 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-500'
                      : 'border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-500'
                  )}
                >
                  <div className='absolute top-2 left-2'>
                    <div className='flex items-center space-x-2'>
                      <HeadIcon className='h-5 w-5 text-blue-600 dark:text-blue-400' />
                      <h3
                        className={clsx(
                          'font-medium text-sm',
                          selectedHead
                            ? 'text-blue-700 dark:text-blue-300'
                            : 'text-gray-500 dark:text-gray-400'
                        )}
                      >
                        Head Pokémon
                      </h3>
                    </div>
                  </div>
                  {selectedHead ? (
                    <div className='absolute inset-0 flex items-center justify-center space-x-3 pt-6'>
                      <PokemonSprite
                        pokemonId={selectedHead.pokemon.id}
                        className='h-12 w-12'
                      />
                      <div className='text-center'>
                        <div className='font-medium text-blue-900 dark:text-blue-100 text-sm'>
                          {selectedHead.pokemon.nickname ||
                            selectedHead.pokemon.name}
                        </div>
                        {selectedHead.pokemon.nickname && (
                          <div className='text-xs text-blue-700 dark:text-blue-300'>
                            ({selectedHead.pokemon.name})
                          </div>
                        )}
                      </div>
                      {selectedHead && (
                        <button
                          onClick={e => {
                            e.stopPropagation();
                            setSelectedHead(null);
                          }}
                          className='absolute top-2 right-2 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-200 p-1 bg-white dark:bg-gray-700 rounded-full shadow-sm'
                        >
                          <X className='h-4 w-4' />
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className='absolute inset-0 flex items-center justify-center text-gray-400 dark:text-gray-500 pt-6'>
                      {activeSlot === 'head'
                        ? 'Click a Pokémon below to assign'
                        : 'Click to select head'}
                    </div>
                  )}
                </div>

                <div
                  onClick={() => handleSlotSelect('body')}
                  className={clsx(
                    'border-2 rounded-lg p-2 transition-colors text-left h-24 relative cursor-pointer',
                    activeSlot === 'body'
                      ? 'border-green-400 bg-green-50 dark:bg-green-900/20 dark:border-green-500'
                      : 'border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-500'
                  )}
                >
                  <div className='absolute top-2 left-2'>
                    <div className='flex items-center space-x-2'>
                      <BodyIcon className='h-5 w-5 text-green-600 dark:text-green-400' />
                      <h3
                        className={clsx(
                          'font-medium text-sm',
                          selectedBody
                            ? 'text-green-700 dark:text-green-300'
                            : 'text-gray-500 dark:text-gray-400'
                        )}
                      >
                        Body Pokémon
                      </h3>
                    </div>
                  </div>
                  {selectedBody ? (
                    <div className='absolute inset-0 flex items-center justify-center space-x-3 pt-6'>
                      <PokemonSprite
                        pokemonId={selectedBody.pokemon.id}
                        className='h-12 w-12'
                      />
                      <div className='text-center'>
                        <div className='font-medium text-green-900 dark:text-green-100 text-sm'>
                          {selectedBody.pokemon.nickname ||
                            selectedBody.pokemon.name}
                        </div>
                        {selectedBody.pokemon.nickname && (
                          <div className='text-xs text-green-700 dark:text-green-300'>
                            ({selectedBody.pokemon.name})
                          </div>
                        )}
                      </div>
                      {selectedBody && (
                        <button
                          onClick={e => {
                            e.stopPropagation();
                            setSelectedBody(null);
                          }}
                          className='absolute top-2 right-2 text-green-600 hover:text-green-800 dark:text-green-400 dark:hover:text-green-200 p-1 bg-white dark:bg-gray-700 rounded-full shadow-sm'
                        >
                          <X className='h-4 w-4' />
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className='absolute inset-0 flex items-center justify-center text-gray-400 dark:text-gray-500 pt-6'>
                      {activeSlot === 'body'
                        ? 'Click a Pokémon below to assign'
                        : 'Click to select body'}
                    </div>
                  )}
                </div>
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
                      const isActiveSlot = activeSlot && !isSelected;

                      return (
                        <button
                          key={`${pokemon.uid || pokemon.id}-${locationId}`}
                          onClick={() =>
                            handlePokemonSelect(pokemon, locationId)
                          }
                          disabled={!activeSlot && !isSelected}
                          className={clsx(
                            'flex flex-col items-center justify-center p-2 rounded-lg border transition-colors h-20 relative',
                            isSelectedHead
                              ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 cursor-pointer hover:bg-blue-100 dark:hover:bg-blue-900/30'
                              : isSelectedBody
                                ? 'border-green-500 bg-green-50 dark:bg-green-900/20 cursor-pointer hover:bg-green-100 dark:hover:bg-green-900/30'
                                : isActiveSlot
                                  ? 'border-gray-300 bg-gray-100 dark:bg-gray-700 dark:border-gray-500 hover:bg-gray-200 dark:hover:bg-gray-600 cursor-pointer'
                                  : 'border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 cursor-not-allowed opacity-60'
                          )}
                        >
                          <div className='h-12 w-12 flex items-center justify-center mb-1'>
                            <PokemonSprite
                              pokemonId={pokemon.id}
                              className='h-12 w-12'
                            />
                          </div>
                          <div className='text-center min-w-0'>
                            <div className='font-medium text-gray-900 dark:text-white text-xs truncate'>
                              {pokemon.nickname || pokemon.name}
                            </div>
                            {pokemon.nickname && (
                              <div className='text-xs text-gray-500 dark:text-gray-400 truncate'>
                                ({pokemon.name})
                              </div>
                            )}
                          </div>

                          <div className='absolute top-1 right-1'>
                            {isSelectedHead && (
                              <div className='px-2 py-1 bg-blue-600 text-white text-xs font-medium rounded-full flex items-center space-x-1'>
                                <HeadIcon className='h-3 w-3' />
                              </div>
                            )}
                            {isSelectedBody && (
                              <div className='px-2 py-1 bg-green-600 text-white text-xs font-medium rounded-full flex items-center space-x-1'>
                                <BodyIcon className='h-3 w-3' />
                              </div>
                            )}
                          </div>
                        </button>
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
              <div className='h-28 w-28 flex items-center justify-center relative mx-auto'>
                <div
                  className='size-28 absolute -translate-y-2 rounded-lg opacity-30 border border-gray-200 dark:border-gray-400 text-gray-300 dark:text-gray-400'
                  style={{
                    background: `repeating-linear-gradient(currentColor 0px, currentColor 2px, rgba(156, 163, 175, 0.3) 1px, rgba(156, 163, 175, 0.3) 3px)`,
                  }}
                />
                <div className='flex items-center justify-center'>
                  <FusionSprite
                    headPokemon={selectedHead?.pokemon || null}
                    bodyPokemon={selectedBody?.pokemon || null}
                    isFusion={Boolean(selectedHead && selectedBody)}
                    shouldLoad={true}
                    className='h-16 w-16'
                  />
                </div>
              </div>

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
