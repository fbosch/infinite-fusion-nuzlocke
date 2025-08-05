import React, { useCallback, useMemo } from 'react';
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
  onDragStart,
  draggable = false,
  ...rest
}: PokemonSpriteProps) {
  const spriteData = useMemo(
    () => spritesheetMetadata.sprites.find(sprite => sprite.id === pokemonId),
    [pokemonId]
  );

  const handleDragStart = useCallback(
    (e: React.DragEvent<HTMLImageElement>) => {
      if (!spriteData || !draggable) return;
      const dragElement = document.createElement('div');
      dragElement.style.cssText = `
        width: ${spriteData.width}px;
        height: ${spriteData.height}px;
        background-image: url(${e.currentTarget.src});
        background-position: -${spriteData.x}px -${spriteData.y}px;
        background-repeat: no-repeat;
        position: absolute;
        top: -1000px;
        image-rendering: pixelated;
      `;
      document.body.appendChild(dragElement);
      e.dataTransfer.setDragImage(
        dragElement,
        spriteData.width / 2,
        spriteData.height / 2
      );
      setTimeout(() => document.body.removeChild(dragElement), 0);
      onDragStart?.(e);
    },
    [spriteData, onDragStart, draggable]
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
      draggable={draggable}
      onDragStart={draggable ? handleDragStart : undefined}
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
