'use client';

import React from 'react';
import { ArrowLeftRight } from 'lucide-react';
import { PokemonSlotSelector } from './PokemonSlotSelector';
import { PokemonGridItem } from './PokemonGridItem';
import { TeamMemberSearchBar } from './TeamMemberSearchBar';
import { useTeamMemberSelection } from './TeamMemberSelectionContext';
import { CursorTooltip } from '@/components/CursorTooltip';
import { DNA_REVERSER_ICON } from '@/constants/items';
import Image from 'next/image';

export function TeamMemberSelectionPanel() {
  const { state, actions } = useTeamMemberSelection();
  const {
    selectedHead,
    selectedBody,
    activeSlot,
    searchQuery,
    availablePokemon,
  } = state;
  const {
    handleSlotSelect,
    handleRemoveHeadPokemon,
    handleRemoveBodyPokemon,
    handlePokemonSelect,
  } = actions;

  // Handler to flip fusion (swap head and body)
  const handleFlipFusion = React.useCallback(() => {
    // Always swap the selections, regardless of whether they're filled or empty
    const tempHead = selectedHead;
    const tempBody = selectedBody;

    // Swap the selections directly
    actions.setSelectedHead(tempBody);
    actions.setSelectedBody(tempHead);
  }, [selectedHead, selectedBody, actions]);

  // Filter Pokémon based on search query locally (no need to update state)
  const filteredPokemon = React.useMemo(() => {
    if (!searchQuery.trim()) return availablePokemon;

    const query = searchQuery.toLowerCase();
    return availablePokemon.filter(
      ({ pokemon }) =>
        pokemon.name.toLowerCase().includes(query) ||
        pokemon.nickname?.toLowerCase().includes(query)
    );
  }, [availablePokemon, searchQuery]);
  return (
    <div className='flex-1 flex flex-col space-y-5'>
      <div className='grid grid-cols-1 sm:grid-cols-[1fr_auto_1fr] gap-4 items-center'>
        {/* Head Slot */}
        <PokemonSlotSelector
          slot='head'
          selectedPokemon={selectedHead}
          isActive={activeSlot === 'head'}
          onSlotSelect={handleSlotSelect}
          onRemovePokemon={handleRemoveHeadPokemon}
        />

        {/* Inverse Fusion Button - always visible */}
        <div className='flex items-center justify-center'>
          <CursorTooltip
            placement='bottom'
            className='origin-top'
            content={
              <div className='flex items-center gap-2'>
                <Image
                  src={DNA_REVERSER_ICON}
                  alt='DNA Reverser'
                  width={24}
                  height={24}
                  className='object-contain object-center image-rendering-pixelated'
                />
                <span className='text-sm'>Invert Fusion</span>
              </div>
            }
            delay={300}
          >
            <button
              type='button'
              onClick={handleFlipFusion}
              className='group size-6 flex items-center justify-center p-1 rounded-md border border-gray-300 dark:border-gray-600 transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 hover:bg-blue-500 hover:border-blue-600 bg-white dark:bg-gray-800'
              aria-label='Flip head and body'
            >
              <ArrowLeftRight className='size-4 text-gray-600 dark:text-gray-300 group-hover:text-white' />
            </button>
          </CursorTooltip>
        </div>

        {/* Body Slot */}
        <PokemonSlotSelector
          slot='body'
          selectedPokemon={selectedBody}
          isActive={activeSlot === 'body'}
          onSlotSelect={handleSlotSelect}
          onRemovePokemon={handleRemoveBodyPokemon}
        />
      </div>

      <TeamMemberSearchBar
        searchQuery={searchQuery}
        onSearchChange={actions.setSearchQuery}
      />

      <div className='h-72 overflow-y-auto scrollbar-thin pr-1'>
        <div
          className='grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 h-full'
          style={{ gridTemplateRows: 'repeat(4, 1fr)' }}
        >
          {filteredPokemon.length > 0 ? (
            filteredPokemon.map(({ pokemon, locationId }) => {
              const isSelectedHead = selectedHead?.pokemon?.uid === pokemon.uid;
              const isSelectedBody = selectedBody?.pokemon?.uid === pokemon.uid;
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
            })
          ) : (
            <div className='text-center py-8 text-gray-500 dark:text-gray-400 col-span-full row-span-full flex items-center justify-center'>
              {searchQuery.trim()
                ? 'No Pokémon found matching your search.'
                : 'No Pokémon available.'}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
