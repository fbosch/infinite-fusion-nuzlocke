import React, { useEffect, useState } from 'react';
import clsx from 'clsx';
import { PokemonSprite } from '@/components/PokemonSprite';
import {
  type PokemonOptionType,
  type Pokemon,
  getPokemonById,
} from '@/loaders/pokemon';
import { TypePills } from '@/components/TypePills';

interface GraveyardGridItemProps {
  entry: {
    locationId: string;
    locationName: string;
    head: PokemonOptionType | null;
    body: PokemonOptionType | null;
  };
  onLocationClick: (locationId: string) => void;
}

export function GraveyardGridItem({
  entry,
  onLocationClick,
}: GraveyardGridItemProps) {
  const [headPokemonData, setHeadPokemonData] = useState<Pokemon | null>(null);
  const [bodyPokemonData, setBodyPokemonData] = useState<Pokemon | null>(null);

  // Fetch full Pokemon data to get types
  useEffect(() => {
    const fetchPokemonData = async () => {
      try {
        if (entry.head) {
          const data = await getPokemonById(entry.head.id);
          setHeadPokemonData(data);
        }
        if (entry.body) {
          const data = await getPokemonById(entry.body.id);
          setBodyPokemonData(data);
        }
      } catch (error) {
        console.error('Failed to fetch Pokemon data:', error);
      }
    };

    fetchPokemonData();
  }, [entry.head?.id, entry.body?.id]);

  const isFusion = Boolean(entry.head && entry.body);
  const hasHead = Boolean(entry.head);
  const hasBody = Boolean(entry.body);

  const handleClick = () => {
    onLocationClick(entry.locationId);
  };

  return (
    <button
      onClick={handleClick}
      className={clsx(
        'flex flex-col items-center justify-center p-2 rounded-lg border transition-colors h-20 relative',
        'border-gray-200 bg-white dark:bg-gray-800 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer',
        'hover:ring-2 hover:ring-gray-300 dark:hover:ring-gray-600'
      )}
    >
      {/* Pokémon sprites */}
      <div className='flex items-center justify-center gap-1 mb-1'>
        {hasHead && (
          <div className='h-10 w-10 flex items-center justify-center'>
            <PokemonSprite
              pokemonId={entry.head!.id}
              generation='gen7'
              className='h-10 w-10 opacity-80'
            />
          </div>
        )}
        {isFusion && <div className='text-red-500 text-xs font-bold'>+</div>}
        {hasBody && (
          <div className='h-10 w-10 flex items-center justify-center'>
            <PokemonSprite
              pokemonId={entry.body!.id}
              generation='gen7'
              className='h-10 w-10 opacity-80'
            />
          </div>
        )}
      </div>

      {/* Nickname and location info */}
      <div className='text-center min-w-0'>
        <div className='font-medium text-gray-900 dark:text-white text-xs truncate'>
          {entry.head?.nickname ||
            entry.head?.name ||
            entry.body?.nickname ||
            entry.body?.name ||
            'Unknown'}
        </div>
        <div className='text-xs text-gray-500 dark:text-gray-400 truncate'>
          {entry.locationName}
        </div>
      </div>

      {/* Type indicators in top right corner */}
      {isFusion && headPokemonData && bodyPokemonData && (
        <div className='absolute top-1 right-1'>
          <TypePills
            primary={
              headPokemonData.types[0]?.name?.toLowerCase() as
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
              bodyPokemonData.types[0]?.name?.toLowerCase() as
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
    </button>
  );
}
