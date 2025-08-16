import React, { useMemo } from 'react';
import Image from 'next/image';
import spritesheetMetadata from '@/assets/pokemon-gen8-spritesheet-metadata.json';
import gen7SpritesheetMetadata from '@/assets/pokemon-gen7-spritesheet-metadata.json';
import { twMerge } from 'tailwind-merge';
import { getCacheBuster } from '../lib/persistence';

const version = getCacheBuster();

interface PokemonSpriteProps extends React.HTMLAttributes<HTMLImageElement> {
  pokemonId: number;
  /**
   * Sprite generation to use.
   * - 'gen8': Standard size sprites (default)
   * - 'gen7': More compact sprites for space efficiency
   */
  generation?: 'gen7' | 'gen8';
  className?: string;
  draggable?: boolean;
}

export function PokemonSprite({
  pokemonId,
  generation = 'gen8',
  className = '',
  ...rest
}: PokemonSpriteProps) {
  const metadata = useMemo(() => {
    return generation === 'gen7'
      ? gen7SpritesheetMetadata
      : spritesheetMetadata;
  }, [generation]);

  const spriteData = useMemo(
    () => metadata.sprites.find(sprite => sprite.id === pokemonId),
    [pokemonId, metadata]
  );

  if (!spriteData?.exists) {
    return null;
  }

  const spritesheetSrc =
    generation === 'gen7'
      ? `/images/pokemon-gen7-spritesheet.png?v=${version}`
      : `/images/pokemon-gen8-spritesheet.png?v=${version}`;

  return (
    <Image
      src={spritesheetSrc}
      alt={`${spriteData.name} sprite (${generation})`}
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
        height: spriteData.height,
        width: spriteData.width,
        imageRendering: 'pixelated',
      }}
      {...rest}
    />
  );
}
