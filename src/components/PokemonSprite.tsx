import React, { useMemo } from 'react';
import Image from 'next/image';
import spritesheetMetadata from '@/assets/pokemon-spritesheet-metadata.json';
import { twMerge } from 'tailwind-merge';
import { getCacheBuster } from '../lib/persistence';

const version = getCacheBuster();

interface PokemonSpriteProps extends React.HTMLAttributes<HTMLImageElement> {
  pokemonId: number;
  className?: string;
  draggable?: boolean;
}

export function PokemonSprite({
  pokemonId,
  className = '',
  ...rest
}: PokemonSpriteProps) {
  const spriteData = useMemo(
    () => spritesheetMetadata.sprites.find(sprite => sprite.id === pokemonId),
    [pokemonId]
  );

  if (!spriteData?.exists) {
    return null;
  }

  return (
    <Image
      src={`/images/pokemon-spritesheet.png?v=${version}`}
      alt={`${spriteData.name} sprite`}
      width={spriteData.width}
      height={spriteData.height}
      className={twMerge('object-none ', className)}
      unoptimized
      decoding='async'
      loading='eager'
      priority={true}
      style={{
        objectPosition: `-${spriteData.x}px -${spriteData.y}px`,
        minWidth: spriteData.width,
        minHeight: spriteData.height,
        imageRendering: 'pixelated',
      }}
      {...rest}
    />
  );
}
