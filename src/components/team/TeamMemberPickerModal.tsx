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
import {
  useActivePlaythrough,
  playthroughActions,
} from '@/stores/playthroughs';
import { useEncounters } from '@/stores/playthroughs/hooks';
import { type PokemonOptionType, PokemonStatus } from '@/loaders/pokemon';
import { PokemonSlotSelector } from './PokemonSlotSelector';
import { PokemonGridItem } from './PokemonGridItem';
import PokemonSummaryCard from '@/components/PokemonSummaryCard';

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
  const [nickname, setNickname] = useState('');
  const [previewNickname, setPreviewNickname] = useState('');

  // Auto-switch to head selection mode when both slots are empty
  useEffect(() => {
    if (!selectedHead && !selectedBody && !activeSlot) {
      setActiveSlot('head');
    }
  }, [selectedHead, selectedBody, activeSlot]);

  // Pre-populate selections when editing existing team member
  useEffect(() => {
    if (existingTeamMember && !existingTeamMember.isEmpty && encounters) {
      console.log('Pre-populating modal with:', existingTeamMember);

      // Use the availablePokemon array which is already computed from encounters
      const availablePokemon = Object.entries(encounters).flatMap(
        ([locationId, encounter]) => {
          const validPokemon = [];

          if (
            encounter.head?.status &&
            encounter.head.status !== PokemonStatus.MISSED &&
            encounter.head.status !== PokemonStatus.DECEASED
          ) {
            const pokemonWithUid = {
              ...encounter.head,
              uid:
                encounter.head.uid ||
                `${encounter.head.id}_${locationId}_${Date.now()}`,
            };
            validPokemon.push({ pokemon: pokemonWithUid, locationId });
          }
          if (
            encounter.body?.status &&
            encounter.body.status !== PokemonStatus.MISSED &&
            encounter.body.status !== PokemonStatus.DECEASED
          ) {
            const pokemonWithUid = {
              ...encounter.body,
              uid:
                encounter.body.uid ||
                `${encounter.body.id}_${locationId}_${Date.now()}`,
            };
            validPokemon.push({ pokemon: pokemonWithUid, locationId });
          }

          return validPokemon;
        }
      );

      console.log(
        'Available Pokémon:',
        availablePokemon.map(p => ({
          name: p.pokemon.name,
          uid: p.pokemon.uid,
        }))
      );

      // Find Pokémon by UID from the available list
      const headMatch = availablePokemon.find(
        p => p.pokemon.uid === existingTeamMember.headPokemon?.uid
      );
      const bodyMatch = availablePokemon.find(
        p => p.pokemon.uid === existingTeamMember.bodyPokemon?.uid
      );

      console.log('Found matches:', {
        headMatch: headMatch
          ? { name: headMatch.pokemon.name, uid: headMatch.pokemon.uid }
          : null,
        bodyMatch: bodyMatch
          ? { name: bodyMatch.pokemon.name, uid: bodyMatch.pokemon.uid }
          : null,
      });

      if (headMatch) {
        setSelectedHead({
          pokemon: headMatch.pokemon,
          locationId: headMatch.locationId,
        });
        console.log('Set head Pokémon:', headMatch.pokemon.name);

        // Set the nickname from the current encounter data (which may have been updated)
        const currentEncounter = encounters[headMatch.locationId];
        if (currentEncounter?.head?.nickname) {
          setNickname(currentEncounter.head.nickname);
          setPreviewNickname(currentEncounter.head.nickname);
        } else if (!bodyMatch) {
          // Only clear nickname if there's no body Pokémon
          setNickname('');
          setPreviewNickname('');
        }
        console.log(
          'Set nickname from encounter:',
          currentEncounter?.head?.nickname
        );
      }

      if (bodyMatch) {
        setSelectedBody({
          pokemon: bodyMatch.pokemon,
          locationId: bodyMatch.locationId,
        });
        console.log('Set body Pokémon:', bodyMatch.pokemon.name);

        // Set the nickname from the current encounter data for body Pokémon
        const currentEncounter = encounters[bodyMatch.locationId];
        if (currentEncounter?.body?.nickname) {
          setNickname(currentEncounter.body.nickname);
          setPreviewNickname(currentEncounter.body.nickname);
        } else if (!headMatch) {
          // Only clear nickname if there's no head Pokémon
          setNickname('');
          setPreviewNickname('');
        }
        console.log(
          'Set nickname from encounter:',
          currentEncounter?.body?.nickname
        );
      }

      // Set active slot to head if we have both, or to the empty slot
      if (existingTeamMember.headPokemon && existingTeamMember.bodyPokemon) {
        setActiveSlot(null);
      } else if (existingTeamMember.headPokemon) {
        setActiveSlot('body');
      } else if (existingTeamMember.bodyPokemon) {
        setActiveSlot('head');
      }
    }
  }, [existingTeamMember, encounters]);

  // Get all available Pokémon from encounters
  const availablePokemon = useMemo(() => {
    if (!encounters) return [];

    const pokemon = Object.entries(encounters).flatMap(
      ([locationId, encounter]) => {
        const validPokemon = [];

        if (
          encounter.head?.status &&
          encounter.head.status !== PokemonStatus.MISSED &&
          encounter.head.status !== PokemonStatus.DECEASED &&
          encounter.head.uid // Only include Pokémon that already have UIDs
        ) {
          validPokemon.push({ pokemon: encounter.head, locationId });
        }
        if (
          encounter.body?.status &&
          encounter.body.status !== PokemonStatus.MISSED &&
          encounter.body.status !== PokemonStatus.DECEASED &&
          encounter.body.uid // Only include Pokémon that already have UIDs
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
    const isSelectedHead = selectedHead?.pokemon?.uid === pokemon.uid;
    const isSelectedBody = selectedBody?.pokemon?.uid === pokemon.uid;

    // Handle unselecting
    if (isSelectedHead) {
      setSelectedHead(null);
      setActiveSlot(activeSlot === 'head' ? null : 'head');
      // Clear nickname when head Pokémon is removed
      setNickname('');
      setPreviewNickname('');
      return;
    }
    if (isSelectedBody) {
      setSelectedBody(null);
      setActiveSlot(activeSlot === 'body' ? null : 'body');
      // Clear nickname when body Pokémon is removed
      setNickname('');
      setPreviewNickname('');
      return;
    }

    // Handle selecting
    const slot = activeSlot;
    if (slot === 'head') {
      setSelectedHead({ pokemon, locationId });
      setActiveSlot(selectedBody ? null : 'body');
      // Set nickname from the encounter data (which may have been updated)
      if (encounters && encounters[locationId]?.head?.nickname) {
        setNickname(encounters[locationId].head.nickname);
        setPreviewNickname(encounters[locationId].head.nickname);
      } else {
        setNickname('');
        setPreviewNickname('');
      }
    } else if (slot === 'body') {
      setSelectedBody({ pokemon, locationId });
      setActiveSlot(selectedHead ? null : 'head');
      // Set nickname from the encounter data for body Pokémon
      if (encounters && encounters[locationId]?.body?.nickname) {
        setNickname(encounters[locationId].body.nickname);
        setPreviewNickname(encounters[locationId].body.nickname);
      } else {
        setNickname('');
        setPreviewNickname('');
      }
    }
  };

  const handleUpdateTeamMember = async () => {
    const headPokemon = selectedHead?.pokemon;
    const bodyPokemon = selectedBody?.pokemon;

    // If both are empty, this functions the same as clearing
    if (!headPokemon && !bodyPokemon) {
      // Pass null for both to indicate clearing the team member
      onSelect(null, null);
      onClose();
      return;
    }

    // Apply nickname to the selected Pokémon using the proper store update method
    if (nickname.trim() && encounters) {
      // Determine which Pokémon to update with the nickname
      let pokemonToUpdate: PokemonOptionType | null = null;
      let locationId: string | null = null;
      let targetField: 'head' | 'body' | null = null;

      if (headPokemon && selectedHead?.locationId) {
        pokemonToUpdate = headPokemon;
        locationId = selectedHead.locationId;
        // For head Pokémon, we know it's in the head field of the encounter
        targetField = 'head';
      } else if (bodyPokemon && selectedBody?.locationId) {
        pokemonToUpdate = bodyPokemon;
        locationId = selectedBody.locationId;
        // For body Pokémon, we know it's in the body field of the encounter
        targetField = 'body';
      }

      if (pokemonToUpdate && locationId && targetField) {
        try {
          // Create updated Pokémon object with new nickname
          const updatedPokemon = {
            ...pokemonToUpdate,
            nickname: nickname.trim() || undefined,
          };

          // Use the proper store action to update the encounter
          // When updating just the nickname, preserve the existing fusion state
          const currentEncounter = encounters[locationId];
          const shouldPreserveFusion = currentEncounter?.isFusion || false;

          console.log('Updating encounter:', {
            locationId,
            targetField,
            pokemonName: pokemonToUpdate.name,
            newNickname: updatedPokemon.nickname,
            currentFusionState: currentEncounter?.isFusion,
            preserveFusion: shouldPreserveFusion,
          });

          await playthroughActions.updateEncounter(
            locationId,
            updatedPokemon,
            targetField,
            shouldPreserveFusion
          );

          console.log(
            `Updated nickname for ${pokemonToUpdate.name} in ${targetField} field to:`,
            updatedPokemon.nickname
          );
        } catch (error) {
          console.error('Failed to update nickname:', error);
        }
      }
    }

    // Pass the selected Pokémon to the parent component
    // Only pass the Pokémon that are actually selected, don't duplicate them
    onSelect(headPokemon || null, bodyPokemon || null);
    onClose();
  };

  const handleClearTeamMember = () => {
    // Clear the team member by passing null for both
    onSelect(null, null);
    onClose();
  };

  const handleClose = () => {
    setSearchQuery('');
    setSelectedHead(null);
    setSelectedBody(null);
    setActiveSlot('head');
    setNickname('');
    setPreviewNickname('');
    onClose();
  };

  // Helper function to determine which Pokémon's nickname to display
  const getDisplayNickname = () => {
    if (selectedHead?.pokemon?.nickname) {
      return selectedHead.pokemon.nickname;
    }
    if (selectedBody?.pokemon?.nickname) {
      return selectedBody.pokemon.nickname;
    }
    return '';
  };

  // Allow update when there are selections OR when both are empty (clearing)
  const canUpdateTeam =
    selectedHead || selectedBody || (!selectedHead && !selectedBody);

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
            <div className='flex-1 flex flex-col space-y-5'>
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
                  className='w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors duration-200'
                />
              </div>

              <div className='flex-1 max-h-72 overflow-y-auto scrollbar-thin pr-1'>
                {availablePokemon.length > 0 ? (
                  <div className='grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3'>
                    {availablePokemon.map(({ pokemon, locationId }) => {
                      const isSelectedHead =
                        selectedHead?.pokemon?.uid === pokemon.uid;
                      const isSelectedBody =
                        selectedBody?.pokemon?.uid === pokemon.uid;
                      const isSelected = isSelectedHead || isSelectedBody;
                      const isActiveSlot = Boolean(activeSlot && !isSelected);

                      return (
                        <PokemonGridItem
                          key={`${pokemon.uid}-${locationId}`}
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

            <div className='w-full lg:w-72 flex flex-col justify-between'>
              <div className='flex-1 flex items-center justify-center min-h-0 py-4'>
                <PokemonSummaryCard
                  headPokemon={selectedHead?.pokemon || null}
                  bodyPokemon={selectedBody?.pokemon || null}
                  isFusion={Boolean(
                    selectedHead?.pokemon && selectedBody?.pokemon
                  )}
                  shouldLoad={true}
                  nickname={previewNickname || undefined}
                />
              </div>

              <div className='space-y-4 mt-auto'>
                {/* Nickname Input */}
                {(selectedHead?.pokemon || selectedBody?.pokemon) && (
                  <div className='space-y-2'>
                    <label
                      htmlFor='nickname'
                      className='block text-sm font-medium text-gray-700 dark:text-gray-300'
                    >
                      Nickname for{' '}
                      {selectedHead?.pokemon
                        ? selectedHead.pokemon.name
                        : selectedBody?.pokemon?.name}
                    </label>
                    <input
                      id='nickname'
                      type='text'
                      placeholder='Enter nickname...'
                      value={nickname}
                      onChange={e => setNickname(e.target.value)}
                      onBlur={() => {
                        console.log('Nickname input onBlur:', {
                          current: nickname,
                          setting: nickname,
                        });
                        setPreviewNickname(nickname);
                      }}
                      className='w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors duration-200'
                      maxLength={12}
                    />
                  </div>
                )}

                <div className='space-y-3'>
                  <button
                    onClick={handleUpdateTeamMember}
                    disabled={!canUpdateTeam}
                    className={clsx(
                      'w-full px-4 py-3 rounded-lg font-medium transition-all duration-200 border shadow-sm',
                      canUpdateTeam
                        ? 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100 hover:text-blue-800 hover:border-blue-300 hover:shadow-md dark:bg-blue-950/50 dark:text-blue-300 dark:border-blue-800 dark:hover:bg-blue-900/50 dark:hover:text-blue-200 dark:hover:border-blue-700'
                        : 'bg-gray-50 text-gray-400 border-gray-200 cursor-not-allowed dark:bg-gray-800/50 dark:border-gray-700 dark:text-gray-500'
                    )}
                  >
                    Update Team Member
                  </button>

                  <button
                    onClick={handleClearTeamMember}
                    disabled={!selectedHead && !selectedBody}
                    className={clsx(
                      'w-full px-4 py-3 rounded-lg font-medium transition-all duration-200 border shadow-sm',
                      selectedHead || selectedBody
                        ? 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-red-50 hover:text-red-700 hover:border-red-200 hover:shadow-md dark:bg-gray-800/50 dark:text-gray-400 dark:border-gray-700 dark:hover:bg-red-950/50 dark:hover:text-red-300 dark:hover:border-red-800'
                        : 'bg-gray-50 text-gray-400 border-gray-200 cursor-not-allowed dark:bg-gray-800/50 dark:border-gray-700 dark:text-gray-500'
                    )}
                  >
                    Clear Team Member
                  </button>
                </div>
              </div>
            </div>
          </div>
        </DialogPanel>
      </div>
    </Dialog>
  );
}
