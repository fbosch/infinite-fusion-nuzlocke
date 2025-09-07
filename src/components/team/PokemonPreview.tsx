import React from 'react';
import { FusionSprite } from '@/components/PokemonSummaryCard/FusionSprite';
import { type PokemonOptionType } from '@/loaders/pokemon';

interface PokemonPreviewProps {
  headPokemon: PokemonOptionType | null;
  bodyPokemon: PokemonOptionType | null;
}

export function PokemonPreview({
  headPokemon,
  bodyPokemon,
}: PokemonPreviewProps) {
  const isFusion = Boolean(headPokemon && bodyPokemon);

  return (
    <div className='h-28 w-28 flex items-center justify-center relative mx-auto'>
      <div
        className='size-28 absolute -translate-y-2 rounded-lg opacity-30 border border-gray-200 dark:border-gray-400 text-gray-300 dark:text-gray-400'
        style={{
          background: `repeating-linear-gradient(currentColor 0px, currentColor 2px, rgba(156, 163, 175, 0.3) 1px, rgba(156, 163, 175, 0.3) 3px)`,
        }}
      />
      <div className='flex items-center justify-center'>
        <FusionSprite
          headPokemon={headPokemon}
          bodyPokemon={bodyPokemon}
          isFusion={isFusion}
          shouldLoad={true}
          className='h-16 w-16'
        />
      </div>
    </div>
  );
}
