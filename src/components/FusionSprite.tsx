'use client';

import React, { useMemo } from 'react';
import Image from 'next/image';
import type { PokemonOption } from '@/loaders/pokemon';
import clsx from 'clsx';

interface EncounterData {
  head: PokemonOption | null;
  body: PokemonOption | null;
  isFusion: boolean;
}

interface FusionSpriteProps {
  encounterData: EncounterData;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const SPRITE_SIZES = { sm: 32, md: 48, lg: 64, xl: 96 } as const;

function getSpriteUrl(head: PokemonOption | null, body: PokemonOption | null, isFusion: boolean): string {
  const pokemon = head || body;
  if (!pokemon) return '';
  
  if (!isFusion || !body || !head) {
    return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${pokemon.nationalDexId}.png`;
  }
  
  return `https://ifd-spaces.sfo2.cdn.digitaloceanspaces.com/custom/${head.nationalDexId}.${body.nationalDexId}.png`;
}

function getAltText(head: PokemonOption | null, body: PokemonOption | null, isFusion: boolean): string {
  const pokemon = head || body;
  if (!pokemon) return '';
  
  if (!isFusion) return pokemon.name;
  if (!body || !head) return `${pokemon.name} (fusion preview)`;
  return `${head.name}/${body.name} fusion`;
}

export function FusionSprite({ 
  encounterData, 
  size = 'md',
  className 
}: FusionSpriteProps) {
  const { head, body, isFusion } = encounterData;
  
  if (!head && !body) return null;
  
  const spriteUrl = getSpriteUrl(head, body, isFusion);
  const altText = getAltText(head, body, isFusion);
  const spriteSize = SPRITE_SIZES[size];
  
  const imageClasses = clsx(
    'object-fill object-center image-render-pixelated',
    className
  );
  
  const link = useMemo(() => {
    if (head && !body) {
      return `https://infinitefusiondex.com/details/${head.nationalDexId}`
    }
    if (!head && body) {
      return `https://infinitefusiondex.com/details/${body.nationalDexId}`
    }
      if (head && body) {
    return `https://infinitefusiondex.com/details/${head.nationalDexId}.${body.nationalDexId}`
      }
  }, [head,body])
  
  return (
    <a href={link} target='_blank' rel='noopener noreferrer' className='cursor-help' draggable={false} title='Open Pokedex'>
    <Image
      src={spriteUrl}
      alt={altText}
      width={spriteSize}
      height={spriteSize}
      className={imageClasses}
      loading='eager'
      unoptimized
      draggable={false}
      onError={(e) => {
        const target = e.target as HTMLImageElement;
        if (head && body) {
          target.src = `https://ifd-spaces.sfo2.cdn.digitaloceanspaces.com/generated/${head.nationalDexId}.${body.nationalDexId}.png`
        }
      }}
    /></a>
  );
} 