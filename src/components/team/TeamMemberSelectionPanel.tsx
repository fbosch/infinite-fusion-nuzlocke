'use client';

import React from 'react';
import { PokemonSlotSelector } from './PokemonSlotSelector';
import { PokemonGridItem } from './PokemonGridItem';
import { TeamMemberSearchBar } from './TeamMemberSearchBar';
import { useTeamMemberSelection } from './TeamMemberSelectionContext';

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
      <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
        <PokemonSlotSelector
          slot='head'
          selectedPokemon={selectedHead}
          isActive={activeSlot === 'head'}
          onSlotSelect={handleSlotSelect}
          onRemovePokemon={handleRemoveHeadPokemon}
        />

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
