import React from 'react';
import clsx from 'clsx';
import { PokemonSprite } from '@/components/PokemonSprite';
import { type PokemonOptionType } from '@/loaders/pokemon';

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
  // Since we now create separate entries for each Pokémon, only one will be present
  const pokemon = entry.head || entry.body;

  const handleClick = () => {
    // Extract the original location ID by removing the -head or -body suffix
    const originalLocationId = entry.locationId.replace(/-head$|-body$/, '');
    onLocationClick(originalLocationId);
  };

  if (!pokemon) {
    return null;
  }

  return (
    <button
      type='button'
      onClick={handleClick}
      aria-label={`View graveyard entry for ${pokemon.nickname || pokemon.name} from ${entry.locationName}`}
      className={clsx(
        'flex flex-col items-center justify-center p-2 rounded-lg border transition-colors h-20',
        'border-gray-200 bg-white dark:bg-gray-800 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer',
        'hover:ring-2 hover:ring-gray-300 dark:hover:ring-gray-600'
      )}
    >
      {/* Pokémon sprite */}
      <div className='h-10 w-10 flex items-center justify-center mb-1'>
        <PokemonSprite
          pokemonId={pokemon.id}
          generation='gen7'
          className='h-10 w-10 opacity-80'
        />
      </div>

      {/* Nickname and location info */}
      <div className='text-center min-w-0'>
        <div className='font-medium text-gray-900 dark:text-white text-xs truncate'>
          {pokemon.nickname || pokemon.name || 'Unknown'}
        </div>
        <div className='text-xs text-gray-500 dark:text-gray-400 truncate'>
          {entry.locationName}
        </div>
      </div>
    </button>
  );
}
