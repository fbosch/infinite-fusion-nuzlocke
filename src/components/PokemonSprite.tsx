import React, { useCallback, useMemo } from 'react';
import Image from 'next/image';
import spritesheetMetadata from '@/assets/pokemon-spritesheet-metadata.json';
import { twMerge } from 'tailwind-merge';
import { getCacheBuster } from '../lib/persistence';

const version = getCacheBuster();

interface PokemonSpriteProps extends React.HTMLAttributes<HTMLDivElement> {
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
  // Memoize sprite lookup
  const spriteData = useMemo(
    () => spritesheetMetadata.sprites.find(sprite => sprite.id === pokemonId),
    [pokemonId]
  );

  const handleDragStart = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      if (!spriteData || !draggable) return;

      const dragImage = document.createElement('div');
      dragImage.style.cssText = `
      width: ${spriteData.width}px;
      height: ${spriteData.height}px;
      background-image: url(/images/pokemon-spritesheet.png?v=${version});
      background-position: -${spriteData.x}px -${spriteData.y}px;
      background-repeat: no-repeat;
      position: absolute;
      top: -1000px;
      image-rendering: pixelated;
    `;

      document.body.appendChild(dragImage);

      e.dataTransfer.setDragImage(
        dragImage,
        spriteData.width / 2,
        spriteData.height / 2
      );

      requestAnimationFrame(() => {
        if (document.body.contains(dragImage)) {
          document.body.removeChild(dragImage);
        }
      });

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
