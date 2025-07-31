'use client';

import React from 'react';
import { ArrowUpDown, Check, Search, Loader2, Gift } from 'lucide-react';
import { ComboboxOption } from '@headlessui/react';
import clsx from 'clsx';
import Image from 'next/image';
import { dragActions } from '@/stores/dragStore';
import {
  type PokemonOptionType,
  getEncounterDisplayName,
  isEgg,
} from '@/loaders/pokemon';
import { getPokemonSpriteUrlFromOption } from './PokemonCombobox';
import { EncounterSource } from '@/loaders/encounters';
import WildIcon from '@/assets/images/tall-grass.svg';
interface SourceTagProps {
  source: EncounterSource | null;
}

function SourceTag({ source }: SourceTagProps) {
  if (!source) return null;

  const tagConfig: Record<
    EncounterSource,
    { text: string; className: string; icon: React.ReactNode; tooltip?: string }
  > = {
    [EncounterSource.WILD]: {
      text: 'Wild',
      className:
        'transition-colors duration-200 text-green-700 dark:text-green-300 bg-green-50 dark:bg-green-900/20 border border-green-200/60 dark:border-green-700/40 hover:bg-green-100 dark:hover:bg-green-900/70',
      icon: <WildIcon className='size-3' />,
    },
    [EncounterSource.GIFT]: {
      text: 'Gift',
      className:
        'transition-colors duration-200 text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-900/20 border border-purple-200/60 dark:border-purple-700/40 hover:bg-purple-100 dark:hover:bg-purple-900/70',
      icon: <Gift className='size-3' />,
    },
    [EncounterSource.TRADE]: {
      text: 'Trade',
      className:
        'transition-colors duration-200 text-orange-700 dark:text-orange-300 bg-orange-50 dark:bg-orange-900/20 border border-orange-200/60 dark:border-orange-700/40 hover:bg-orange-100 dark:hover:bg-orange-900/70',
      icon: <ArrowUpDown className='size-3' />,
    },
  };

  const config = tagConfig[source];

  return (
    <span
      className={clsx(
        'text-xs px-1.5 py-0.5 rounded-sm font-normal leading-none flex items-center gap-1',
        config.className
      )}
    >
      {config.text}
      {config.icon}
    </span>
  );
}

interface PokemonOptionsProps {
  finalOptions: PokemonOptionType[];
  deferredQuery: string;
  isRoutePokemon: (pokemonId: number) => boolean;
  getPokemonSource: (pokemonId: number) => EncounterSource | null;
  comboboxId: string;
  gameMode: 'classic' | 'remix' | 'randomized';
  isLoading?: boolean;
}

interface PokemonOptionProps {
  pokemon: PokemonOptionType;
  index: number;
  isRoutePokemon: (pokemonId: number) => boolean;
  getPokemonSource: (pokemonId: number) => EncounterSource | null;
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
  getPokemonSource: (pokemonId: number) => EncounterSource | null;
  comboboxId: string;
  gameMode: 'classic' | 'remix' | 'randomized';
  isActive?: boolean;
  isSelected?: boolean;
}

function PokemonOptionContent({
  pokemon,
  index,
  isRoutePokemon,
  getPokemonSource,
  comboboxId,
  gameMode,
  isActive = false,
  isSelected = false,
}: PokemonOptionContentProps) {
  const displayName = getEncounterDisplayName(pokemon);

  return (
    <div className={'gap-8 group w-full flex items-center'}>
      <Image
        src={getPokemonSpriteUrlFromOption(pokemon)}
        alt={pokemon.name}
        width={40}
        height={40}
        className='object-contain object-center scale-140 image-render-high-quality'
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
          'group-data-selected:',
          'not:group-data-selected:font-normal',
          isSelected && ''
        )}
      >
        {displayName}
      </span>
      <div className='flex items-center gap-2'>
        {gameMode !== 'randomized' && isRoutePokemon(pokemon.id) && (
          <SourceTag source={getPokemonSource(pokemon.id)} />
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
  comboboxId,
  gameMode,
  isLoading = false,
}) => {
  if (isLoading) {
    return (
      <div className='relative cursor-default select-none py-2 px-4 text-center'>
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
      getPokemonSource={getPokemonSource}
      comboboxId={comboboxId}
      gameMode={gameMode}
    />
  ));
};

PokemonOptions.displayName = 'PokemonOptions';
