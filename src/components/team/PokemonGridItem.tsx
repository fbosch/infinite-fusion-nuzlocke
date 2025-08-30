import React, { useEffect, useState } from 'react';
import clsx from 'clsx';
import { PokemonSprite } from '@/components/PokemonSprite';
import {
  type PokemonOptionType,
  type Pokemon,
  getPokemonById,
} from '@/loaders/pokemon';
import HeadIcon from '@/assets/images/head.svg';
import BodyIcon from '@/assets/images/body.svg';
import { TypePills } from '@/components/TypePills';

interface PokemonGridItemProps {
  pokemon: PokemonOptionType;
  locationId: string;
  isSelectedHead: boolean;
  isSelectedBody: boolean;
  isActiveSlot: boolean;
  onSelect: (pokemon: PokemonOptionType, locationId: string) => void;
}

export function PokemonGridItem({
  pokemon,
  locationId,
  isSelectedHead,
  isSelectedBody,
  isActiveSlot,
  onSelect,
}: PokemonGridItemProps) {
  const [pokemonData, setPokemonData] = useState<Pokemon | null>(null);
  const isSelected = isSelectedHead || isSelectedBody;

  // Fetch full Pokemon data to get types
  useEffect(() => {
    const fetchPokemonData = async () => {
      try {
        const data = await getPokemonById(pokemon.id);
        setPokemonData(data);
      } catch (error) {
        console.error('Failed to fetch Pokemon data:', error);
      }
    };

    fetchPokemonData();
  }, [pokemon.id]);

  const getButtonStyles = () => {
    if (isSelectedHead) {
      return 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 cursor-pointer hover:bg-blue-100 dark:hover:bg-blue-900/30';
    }
    if (isSelectedBody) {
      return 'border-green-500 bg-green-50 dark:bg-green-900/20 cursor-pointer hover:bg-green-100 dark:hover:bg-green-900/30';
    }
    if (isActiveSlot) {
      return 'border-gray-200 bg-white dark:bg-gray-700 dark:border-gray-500 hover:bg-gray-50 dark:hover:bg-gray-600 cursor-pointer';
    }
    return 'border-gray-100 dark:border-gray-600 bg-white dark:bg-gray-800 cursor-not-allowed opacity-60';
  };

  const getStatusBadge = () => {
    if (isSelectedHead) {
      return (
        <div className='px-2 py-1 bg-blue-600 text-white text-xs font-medium rounded-full flex items-center space-x-1'>
          <HeadIcon className='h-3 w-3' />
        </div>
      );
    }
    if (isSelectedBody) {
      return (
        <div className='px-2 py-1 bg-green-600 text-white text-xs font-medium rounded-full flex items-center space-x-1'>
          <BodyIcon className='h-3 w-3' />
        </div>
      );
    }
    return null;
  };

  return (
    <button
      onClick={() => onSelect(pokemon, locationId)}
      disabled={!isActiveSlot && !isSelected}
      className={clsx(
        'flex flex-col items-center justify-center p-2 rounded-lg border transition-colors h-20 relative',
        getButtonStyles()
      )}
    >
      <div className='h-12 w-12 flex items-center justify-center mb-1'>
        <PokemonSprite pokemonId={pokemon.id} className='h-12 w-12' />
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

      {/* Type indicators in top left corner */}
      {pokemonData && (
        <div className='absolute top-1 left-1'>
          <TypePills
            primary={
              pokemonData.types[0]?.name?.toLowerCase() as
                | 'grass'
                | 'poison'
                | 'fire'
                | 'flying'
                | 'water'
                | 'bug'
                | 'normal'
                | 'electric'
                | 'ground'
                | 'fairy'
                | 'fighting'
                | 'psychic'
                | 'rock'
                | 'steel'
                | 'ice'
                | 'ghost'
                | 'dragon'
                | 'dark'
            }
            secondary={
              pokemonData.types[1]?.name?.toLowerCase() as
                | 'grass'
                | 'poison'
                | 'fire'
                | 'flying'
                | 'water'
                | 'bug'
                | 'normal'
                | 'electric'
                | 'ground'
                | 'fairy'
                | 'fighting'
                | 'psychic'
                | 'rock'
                | 'steel'
                | 'ice'
                | 'ghost'
                | 'dragon'
                | 'dark'
            }
            size='xxs'
            showTooltip={false}
          />
        </div>
      )}

      {/* Status badge in top right corner */}
      <div className='absolute top-1 right-1'>{getStatusBadge()}</div>
    </button>
  );
}
