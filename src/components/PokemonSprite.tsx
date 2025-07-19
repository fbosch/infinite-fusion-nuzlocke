'use client';

import React from 'react';
import Image from 'next/image';
import type { PokemonOption } from '@/loaders/pokemon';
import clsx from 'clsx';

interface EncounterData {
  head: PokemonOption | null;
  body: PokemonOption | null;
  isFusion: boolean;
}

interface PokemonSpriteProps {
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

export function PokemonSprite({ 
  encounterData, 
  size = 'md',
  className 
}: PokemonSpriteProps) {
  const { head, body, isFusion } = encounterData;
  
  if (!head && !body) return null;
  
  const spriteUrl = getSpriteUrl(head, body, isFusion);
  const altText = getAltText(head, body, isFusion);
  const spriteSize = SPRITE_SIZES[size];
  
  const imageClasses = clsx(
    'object-fill object-center image-render-pixelated',
    className
  );
  
  return (
    <Image
      src={spriteUrl}
      alt={altText}
      width={spriteSize}
      height={spriteSize}
      className={imageClasses}
      loading='eager'
      unoptimized
      draggable={false}
    />
  );
} 