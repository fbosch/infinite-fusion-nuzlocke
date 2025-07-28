'use client';

import React from 'react';
import { Check, Search } from 'lucide-react';
import { ComboboxOption } from '@headlessui/react';
import clsx from 'clsx';
import Image from 'next/image';
import { dragActions } from '@/stores/dragStore';
import { type PokemonOption } from '@/loaders/pokemon';
import { getPokemonSpriteUrlFromOption } from './PokemonCombobox';

interface PokemonOptionsProps {
  finalOptions: PokemonOption[];
  deferredQuery: string;
  isRoutePokemon: (pokemonId: number) => boolean;
  comboboxId: string;
  gameMode: 'classic' | 'remix' | 'randomized';
}

export const PokemonOptions: React.FC<PokemonOptionsProps> = ({
  finalOptions,
  deferredQuery,
  isRoutePokemon,
  comboboxId,
  gameMode,
}) => {
  const renderPokemonOption = (pokemon: PokemonOption, index: number) => (
    <ComboboxOption
      key={`${pokemon.id}-${pokemon.name}-${index}`}
      value={pokemon}
      className={({ active }) =>
        clsx(
          'relative cursor-pointer select-none py-2 px-4 content-visibility-auto',
          'rounded-md w-full flex items-center',
          'h-14',
          {
            'bg-blue-600 text-white ': active,
            'text-gray-900 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700':
              !active,
          }
        )
      }
    >
      {({ selected }) => (
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
            className={clsx('block truncate flex-1', {
              'font-semibold': selected,
              'font-normal': !selected,
            })}
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
                'text-xs dark:text-gray-400 group-hover:text-white',
                {
                  'group-hover:text-white ': selected,
                }
              )}
            >
              {pokemon.id.toString().padStart(3, '0')}
            </span>
            <div className='w-5 h-5 flex items-center justify-center'>
              {selected && (
                <Check
                  className={clsx(
                    'size-5 group-hover:text-white text-blue-400 dark:text-white'
                  )}
                  aria-hidden='true'
                />
              )}
            </div>
          </div>
        </div>
      )}
    </ComboboxOption>
  );

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

  // Regular rendering for non-virtual mode
  return finalOptions.map((pokemon, index) =>
    renderPokemonOption(pokemon, index)
  );
};

PokemonOptions.displayName = 'PokemonOptions';
