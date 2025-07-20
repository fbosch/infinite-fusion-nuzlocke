'use client';

import React from 'react';
import Image from 'next/image';
import { Heart, Zap, Shield, Swords } from 'lucide-react';
import clsx from 'clsx';
import { Tooltip, TooltipProps } from './Tooltip';
import { type PokemonOption } from '@/loaders/pokemon';

// Extended Pokemon data for detailed tooltips
export interface PokemonWithDetails extends PokemonOption {
  types?: string[];
  stats?: {
    hp?: number;
    attack?: number;
    defense?: number;
    speed?: number;
  };
  abilities?: string[];
}

export interface PokemonTooltipProps extends Omit<TooltipProps, 'content'> {
  /** The Pokemon data to display */
  pokemon: PokemonWithDetails;
  /** Whether to show detailed stats */
  showStats?: boolean;
  /** Whether to show the Pokemon sprite */
  showSprite?: boolean;
  /** Custom sprite URL override */
  spriteUrl?: string;
}

export function PokemonTooltip({
  pokemon,
  showStats = true,
  showSprite = true,
  spriteUrl,
  className,
  maxWidth = '280px',
  ...tooltipProps
}: PokemonTooltipProps) {
  const pokemonSpriteUrl = spriteUrl || 
    `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${pokemon.id}.png`;

  const content = (
    <div className="space-y-2">
      {/* Pokemon header with sprite */}
      <div className="flex items-center space-x-3">
        {showSprite && (
          <Image
            src={pokemonSpriteUrl}
            alt={pokemon.name}
            width={48}
            height={48}
            className="object-contain"
            unoptimized
          />
        )}
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-white dark:text-gray-100 truncate">
            {pokemon.name}
          </div>
          {pokemon.nickname && (
            <div className="text-xs text-gray-300 dark:text-gray-400 truncate">
              "{pokemon.nickname}"
            </div>
          )}
          <div className="text-xs text-gray-400 dark:text-gray-500">
            #{pokemon.id.toString().padStart(3, '0')}
          </div>
        </div>
      </div>

      {/* Pokemon types */}
      {pokemon.types && pokemon.types.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {pokemon.types.map((type, index) => (
            <span
              key={index}
              className={clsx(
                'px-2 py-0.5 text-xs font-medium rounded-full',
                'bg-gray-700 text-gray-200 dark:bg-gray-600 dark:text-gray-100'
              )}
            >
              {type}
            </span>
          ))}
        </div>
      )}

      {/* Pokemon stats (if available) */}
      {showStats && pokemon.stats && (
        <div className="space-y-1.5 pt-1 border-t border-gray-600 dark:border-gray-500">
          <div className="text-xs font-medium text-gray-300 dark:text-gray-400">
            Base Stats
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            {pokemon.stats.hp && (
              <div className="flex items-center space-x-1">
                <Heart className="w-3 h-3 text-red-400" />
                <span className="text-gray-300">HP: {pokemon.stats.hp}</span>
              </div>
            )}
            {pokemon.stats.attack && (
              <div className="flex items-center space-x-1">
                <Swords className="w-3 h-3 text-orange-400" />
                <span className="text-gray-300">ATK: {pokemon.stats.attack}</span>
              </div>
            )}
            {pokemon.stats.defense && (
              <div className="flex items-center space-x-1">
                <Shield className="w-3 h-3 text-blue-400" />
                <span className="text-gray-300">DEF: {pokemon.stats.defense}</span>
              </div>
            )}
            {pokemon.stats.speed && (
              <div className="flex items-center space-x-1">
                <Zap className="w-3 h-3 text-yellow-400" />
                <span className="text-gray-300">SPD: {pokemon.stats.speed}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Abilities (if available) */}
      {pokemon.abilities && pokemon.abilities.length > 0 && (
        <div className="space-y-1 pt-1 border-t border-gray-600 dark:border-gray-500">
          <div className="text-xs font-medium text-gray-300 dark:text-gray-400">
            Abilities
          </div>
          <div className="text-xs text-gray-300">
            {pokemon.abilities.join(', ')}
          </div>
        </div>
      )}
    </div>
  );

  return (
    <Tooltip
      content={content}
      className={clsx(
        'bg-gray-800 dark:bg-gray-900 border-gray-600 dark:border-gray-700',
        className
      )}
      maxWidth={maxWidth}
      {...tooltipProps}
    />
  );
}

export default PokemonTooltip; 