import React from 'react';
import clsx from 'clsx';
import { X } from 'lucide-react';
import { PokemonSprite } from '@/components/PokemonSprite';
import { type PokemonOptionType } from '@/loaders/pokemon';
import HeadIcon from '@/assets/images/head.svg';
import BodyIcon from '@/assets/images/body.svg';

interface PokemonSlotSelectorProps {
  slot: 'head' | 'body';
  selectedPokemon: { pokemon: PokemonOptionType; locationId: string } | null;
  isActive: boolean;
  onSlotSelect: (slot: 'head' | 'body') => void;
  onRemovePokemon: () => void;
}

export function PokemonSlotSelector({
  slot,
  selectedPokemon,
  isActive,
  onSlotSelect,
  onRemovePokemon,
}: PokemonSlotSelectorProps) {
  const isHead = slot === 'head';
  const Icon = isHead ? HeadIcon : BodyIcon;
  const slotLabel = isHead ? 'Head Pokémon' : 'Body Pokémon';

  const getSlotStyles = () => {
    if (isActive) {
      return isHead
        ? 'border-blue-400 bg-blue-50/30 dark:bg-blue-900/20 dark:border-blue-500'
        : 'border-green-400 bg-green-50/30 dark:bg-green-900/20 dark:border-green-500';
    }
    return 'border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-500';
  };

  const getIconColor = () => {
    return isHead
      ? 'text-blue-600 dark:text-blue-400'
      : 'text-green-600 dark:text-green-400';
  };

  const getLabelColor = () => {
    if (selectedPokemon) {
      return isHead
        ? 'text-blue-700 dark:text-blue-300'
        : 'text-green-700 dark:text-green-300';
    }
    return 'text-gray-500 dark:text-gray-400';
  };

  const getPokemonNameColor = () => {
    return isHead
      ? 'text-blue-900 dark:text-blue-100'
      : 'text-green-900 dark:text-green-100';
  };

  const getPokemonSpeciesColor = () => {
    return isHead
      ? 'text-blue-700 dark:text-blue-300'
      : 'text-green-700 dark:text-green-300';
  };

  return (
    <div
      onClick={() => onSlotSelect(slot)}
      className={clsx(
        'border-2 rounded-lg p-2 transition-colors text-left h-24 relative cursor-pointer',
        getSlotStyles()
      )}
    >
      <div className='absolute top-2 left-2'>
        <div className='flex items-center space-x-2'>
          <Icon className={`h-5 w-5 ${getIconColor()}`} />
          <h3 className={clsx('font-medium text-sm', getLabelColor())}>
            {slotLabel}
          </h3>
        </div>
      </div>

      {selectedPokemon ? (
        <div className='absolute inset-0 flex items-center justify-center space-x-3 pt-6'>
          <PokemonSprite
            pokemonId={selectedPokemon.pokemon.id}
            className='h-12 w-12'
          />
          <div className='text-center'>
            <div className={clsx('font-medium text-sm', getPokemonNameColor())}>
              {selectedPokemon.pokemon.nickname || selectedPokemon.pokemon.name}
            </div>
            {selectedPokemon.pokemon.nickname && (
              <div className={clsx('text-xs', getPokemonSpeciesColor())}>
                ({selectedPokemon.pokemon.name})
              </div>
            )}
          </div>
          <button
            onClick={e => {
              e.stopPropagation();
              onRemovePokemon();
            }}
            className='absolute top-2 right-2 text-gray-400 hover:text-red-600 dark:text-gray-500 dark:hover:text-red-400 p-1 bg-white dark:bg-gray-700 rounded-full shadow-sm'
          >
            <X className='h-4 w-4' />
          </button>
        </div>
      ) : (
        <div className='absolute inset-0 flex items-center justify-center text-gray-400 dark:text-gray-500 pt-6'>
          {isActive
            ? 'Click a Pokémon below to assign'
            : `Click to select ${slot}`}
        </div>
      )}
    </div>
  );
}
