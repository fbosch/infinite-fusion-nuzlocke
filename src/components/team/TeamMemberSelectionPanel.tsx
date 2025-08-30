'use client';

import React from 'react';
import { PokemonSlotSelector } from './PokemonSlotSelector';
import { PokemonGridItem } from './PokemonGridItem';
import { TeamMemberSearchBar } from './TeamMemberSearchBar';
import { type PokemonOptionType } from '@/loaders/pokemon';

interface TeamMemberSelectionPanelProps {
  selectedHead: {
    pokemon: PokemonOptionType;
    locationId: string;
  } | null;
  selectedBody: {
    pokemon: PokemonOptionType;
    locationId: string;
  } | null;
  activeSlot: 'head' | 'body' | null;
  searchQuery: string;
  availablePokemon: Array<{
    pokemon: PokemonOptionType;
    locationId: string;
  }>;
  onSlotSelect: (slot: 'head' | 'body') => void;
  onRemoveHeadPokemon: () => void;
  onRemoveBodyPokemon: () => void;
  onSearchChange: (query: string) => void;
  onPokemonSelect: (pokemon: PokemonOptionType, locationId: string) => void;
}

export function TeamMemberSelectionPanel({
  selectedHead,
  selectedBody,
  activeSlot,
  searchQuery,
  availablePokemon,
  onSlotSelect,
  onRemoveHeadPokemon,
  onRemoveBodyPokemon,
  onSearchChange,
  onPokemonSelect,
}: TeamMemberSelectionPanelProps) {
  return (
    <div className='flex-1 flex flex-col space-y-5'>
      <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
        <PokemonSlotSelector
          slot='head'
          selectedPokemon={selectedHead}
          isActive={activeSlot === 'head'}
          onSlotSelect={onSlotSelect}
          onRemovePokemon={onRemoveHeadPokemon}
        />

        <PokemonSlotSelector
          slot='body'
          selectedPokemon={selectedBody}
          isActive={activeSlot === 'body'}
          onSlotSelect={onSlotSelect}
          onRemovePokemon={onRemoveBodyPokemon}
        />
      </div>

      <TeamMemberSearchBar
        searchQuery={searchQuery}
        onSearchChange={onSearchChange}
      />

      <div className='h-72 overflow-y-auto scrollbar-thin pr-1'>
        <div
          className='grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3 h-full'
          style={{ gridTemplateRows: 'repeat(4, 1fr)' }}
        >
          {availablePokemon.length > 0 ? (
            availablePokemon.map(({ pokemon, locationId }) => {
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
                  onSelect={onPokemonSelect}
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
