'use client';

import React from 'react';
import { Check, Search } from 'lucide-react';
import { ComboboxOption } from '@headlessui/react';
import clsx from 'clsx';
import Image from 'next/image';
import { dragActions } from '@/stores/dragStore';
import { type PokemonOptionType } from '@/loaders/pokemon';
import { getPokemonSpriteUrlFromOption } from './PokemonCombobox';

interface PokemonOptionsProps {
  finalOptions: PokemonOptionType[];
  deferredQuery: string;
  isRoutePokemon: (pokemonId: number) => boolean;
  comboboxId: string;
  gameMode: 'classic' | 'remix' | 'randomized';
}

interface PokemonOptionProps {
  pokemon: PokemonOptionType;
  index: number;
  isRoutePokemon: (pokemonId: number) => boolean;
  comboboxId: string;
  gameMode: 'classic' | 'remix' | 'randomized';
  style?: React.CSSProperties;
  disabled?: boolean;
  className?: string;
}

interface PokemonOptionContentProps {
  pokemon: PokemonOptionType;
  index: number;
  isRoutePokemon: (pokemonId: number) => boolean;
  comboboxId: string;
  gameMode: 'classic' | 'remix' | 'randomized';
  isActive?: boolean;
  isSelected?: boolean;
}

// Extracted content component that can be reused
function PokemonOptionContent({
  pokemon,
  index,
  isRoutePokemon,
  comboboxId,
  gameMode,
  isActive = false,
  isSelected = false,
}: PokemonOptionContentProps) {
  return (
    <div className={'gap-8 group w-full flex items-center'}>
      <Image
        src={getPokemonSpriteUrlFromOption(pokemon)}
        alt={pokemon.name}
        width={40}
        height={40}
        className='object-contain object-center scale-140 image-render-high-quality cursor-grab active:cursor-grabbing'
        loading={index < 5 || isRoutePokemon(pokemon.id) ? 'eager' : 'lazy'}
        draggable
        unoptimized
        decoding='async'
        priority={index < 5 || isRoutePokemon(pokemon.id) ? true : false}
        onDragStart={e => {
          e.dataTransfer.setData('text/plain', pokemon.name);
          e.dataTransfer.effectAllowed = 'copy';
          dragActions.startDrag(pokemon.name, comboboxId || '', pokemon);
        }}
      />
      <span
        className={clsx(
          'block truncate flex-1',
          'group-data-selected:font-semibold',
          'not:group-data-selected:font-normal',
          isSelected && 'font-semibold'
        )}
      >
        {pokemon.name}
      </span>
      <div className='flex items-center gap-3'>
        {gameMode !== 'randomized' && isRoutePokemon(pokemon.id) && (
          <span className='text-xs text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900 px-2 py-1 rounded'>
            Route
          </span>
        )}
        <span
          className={clsx(
            'text-xs dark:text-gray-400',
            isActive &&
              'group-hover:text-white group-data-selected:group-hover:text-white'
          )}
        >
          {pokemon.id.toString().padStart(3, '0')}
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
  comboboxId,
  gameMode,
  style,
  disabled,
  className,
}: PokemonOptionProps) {
  const baseClassName = clsx(
    'relative cursor-pointer select-none py-2 px-4 my-1 content-visibility-auto',
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
          pokemon={pokemon}
          index={index}
          isRoutePokemon={isRoutePokemon}
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
  comboboxId,
  gameMode,
}) => {
  if (finalOptions.length === 0) {
    return (
      <div className='relative cursor-default select-none py-2 px-4 text-center'>
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
      isRoutePokemon={isRoutePokemon}
      comboboxId={comboboxId}
      gameMode={gameMode}
    />
  ));
};

PokemonOptions.displayName = 'PokemonOptions';
