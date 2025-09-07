'use client';

import React from 'react';
import { Check, Search, Loader2 } from 'lucide-react';
import { ComboboxOption } from '@headlessui/react';
import clsx from 'clsx';
import {
  type PokemonOptionType,
  getEncounterDisplayName,
  isEgg,
} from '@/loaders/pokemon';
import { SourceTag } from './SourceTag';
import { EncounterSource } from '@/loaders/encounters';
import { PokemonSprite } from '../PokemonSprite';

interface PokemonOptionsProps {
  finalOptions: PokemonOptionType[];
  deferredQuery: string;
  locationId: string | undefined;
  isRoutePokemon: (pokemonId: number) => boolean;
  getPokemonSource: (pokemonId: number) => EncounterSource[];
  comboboxId: string;
  gameMode: 'classic' | 'remix' | 'randomized';
  isLoading?: boolean;
}

interface PokemonOptionProps {
  pokemon: PokemonOptionType;
  index: number;
  locationId: string | undefined;
  isRoutePokemon: (pokemonId: number) => boolean;
  getPokemonSource: (pokemonId: number) => EncounterSource[];
  comboboxId: string;
  gameMode: 'classic' | 'remix' | 'randomized';
  style?: React.CSSProperties;
  disabled?: boolean;
  className?: string;
}

interface PokemonOptionContentProps {
  pokemon: PokemonOptionType;
  index: number;
  locationId: string | undefined;
  isRoutePokemon: (pokemonId: number) => boolean;
  getPokemonSource: (pokemonId: number) => EncounterSource[];
  comboboxId: string;
  gameMode: 'classic' | 'remix' | 'randomized';
  isActive?: boolean;
  isSelected?: boolean;
}

function PokemonOptionContent({
  pokemon,
  isRoutePokemon,
  getPokemonSource,
  gameMode,
  locationId,
  isActive = false,
  isSelected = false,
}: PokemonOptionContentProps) {
  const displayName = getEncounterDisplayName(pokemon);

  return (
    <div className={'gap-4 group w-full flex items-center'}>
      <div className='size-10 flex justify-center items-center'>
        <PokemonSprite pokemonId={pokemon.id} />
      </div>
      <span
        className={clsx(
          'block truncate flex-1',
          'group-data-selected:',
          'not:group-data-selected:font-normal',
          isSelected && ''
        )}
      >
        {displayName}
      </span>
      <div className='flex items-center gap-2 group'>
        {gameMode !== 'randomized' && isRoutePokemon(pokemon.id) && (
          <SourceTag
            sources={getPokemonSource(pokemon.id)}
            locationId={locationId}
          />
        )}
        <span
          className={clsx(
            'text-xs dark:text-gray-400 w-8 text-right inline-block',
            isActive &&
              'group-hover:text-white group-data-selected:group-hover:text-white'
          )}
        >
          {isEgg(pokemon) ? '???' : pokemon.id.toString().padStart(3, '0')}
        </span>
        <div className='w-5 h-5 flex items-center justify-center'>
          <Check
            className={clsx(
              'size-5 text-blue-400 dark:text-white',
              isActive && 'group-hover:text-white',
              isSelected ? 'visible' : 'invisible group-data-selected:visible'
            )}
            aria-hidden='true'
          />
        </div>
      </div>
    </div>
  );
}

export function PokemonOption({
  pokemon,
  index,
  isRoutePokemon,
  getPokemonSource,
  comboboxId,
  gameMode,
  style,
  disabled,
  locationId,
  className,
}: PokemonOptionProps) {
  const baseClassName = clsx(
    'relative cursor-pointer select-none p-2 my-1 content-visibility-auto',
    'rounded-md w-full flex items-center',
    'h-14 group',
    className
  );

  return (
    <ComboboxOption
      key={`${pokemon.id}-${pokemon.name}-${index}`}
      value={pokemon}
      className={({ active }) =>
        clsx(
          baseClassName,
          {
            // Disable active state when user is scrolling to prevent auto-scroll
            'bg-blue-600 text-white ': active,
            'text-gray-900 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700':
              !active,
          },
          className
        )
      }
      style={style}
      disabled={disabled}
    >
      {({ active, selected }) => (
        <PokemonOptionContent
          locationId={locationId}
          pokemon={pokemon}
          index={index}
          isRoutePokemon={isRoutePokemon}
          getPokemonSource={getPokemonSource}
          comboboxId={comboboxId}
          gameMode={gameMode}
          isActive={active}
          isSelected={selected}
        />
      )}
    </ComboboxOption>
  );
}

export const PokemonOptions: React.FC<PokemonOptionsProps> = ({
  finalOptions,
  deferredQuery,
  isRoutePokemon,
  getPokemonSource,
  locationId,
  comboboxId,
  gameMode,
  isLoading = false,
}) => {
  if (isLoading) {
    return (
      <div className='relative cursor-default select-none p-2 text-center'>
        <div className='text-gray-500 dark:text-gray-400'>
          <p className='text-sm flex items-center gap-2 justify-center py-2'>
            <Loader2 className='w-4 h-4 animate-spin' />
            <span>Loading Pokémon...</span>
          </p>
        </div>
      </div>
    );
  }

  if (finalOptions.length === 0) {
    return (
      <div className='relative cursor-default select-none p-2 text-center'>
        <div className='text-gray-500 dark:text-gray-400'>
          {deferredQuery ? (
            <>
              <p className='text-sm'>
                No Pokémon found for &quot;{deferredQuery}&quot;
              </p>
              <p className='text-xs mt-1'>Try a different search term</p>
            </>
          ) : (
            <p className='text-sm flex items-center gap-2 justify-center py-2'>
              <Search className='w-4 h-4' />
              <span>Search for Pokémon</span>
            </p>
          )}
        </div>
      </div>
    );
  }

  // Use the PokemonOption component
  return finalOptions.map((pokemon, index) => (
    <PokemonOption
      key={`${pokemon.id}-${pokemon.name}-${index}`}
      pokemon={pokemon}
      index={index}
      locationId={locationId}
      isRoutePokemon={isRoutePokemon}
      getPokemonSource={getPokemonSource}
      comboboxId={comboboxId}
      gameMode={gameMode}
    />
  ));
};

PokemonOptions.displayName = 'PokemonOptions';
