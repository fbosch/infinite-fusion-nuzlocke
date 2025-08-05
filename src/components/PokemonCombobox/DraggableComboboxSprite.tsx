'use client';

import React from 'react';
import clsx from 'clsx';
import { Hand, MousePointer } from 'lucide-react';
import { type PokemonOptionType } from '@/loaders/pokemon';
import { dragActions } from '@/stores/dragStore';
import { PokemonSprite } from '../PokemonSprite';
import { CursorTooltip } from '../CursorTooltip';
import spritesheetMetadata from '@/assets/pokemon-spritesheet-metadata.json';

interface DraggableComboboxSpriteProps {
  value: PokemonOptionType | null | undefined;
  dragPreview: PokemonOptionType | null;
  comboboxId?: string;
  disabled?: boolean;
}

export function DraggableComboboxSprite({
  value,
  dragPreview,
  comboboxId,
  disabled = false,
}: DraggableComboboxSpriteProps) {
  const pokemon = dragPreview || value;

  if (!pokemon) return null;

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>) => {
    if (disabled) {
      e.preventDefault();
      return;
    }
    const sprite = e.currentTarget.querySelector('img') as HTMLImageElement;
    if (sprite && pokemon) {
      const spriteMetadata = spritesheetMetadata.sprites.find(
        s => s.id === pokemon.id
      );
      if (spriteMetadata) {
        const dragElement = document.createElement('div');
        dragElement.style.cssText = `
          width: ${spriteMetadata.width}px;
          height: ${spriteMetadata.height}px;
          background-image: url(${sprite.src});
          background-position: -${spriteMetadata.x}px -${spriteMetadata.y}px;
          background-repeat: no-repeat;
          position: absolute;
          top: -1000px;
          image-rendering: pixelated;
        `;
        document.body.appendChild(dragElement);
        e.dataTransfer.setDragImage(
          dragElement,
          spriteMetadata.width / 2,
          spriteMetadata.height / 2
        );
        setTimeout(() => document.body.removeChild(dragElement), 0);
      }
    }
    e.dataTransfer.setData('text/plain', pokemon.name);
    e.dataTransfer.effectAllowed = 'copy';
    dragActions.startDrag(pokemon.name, comboboxId || '', pokemon);
  };

  return (
    <CursorTooltip
      disabled={!!dragPreview || disabled}
      content={
        <div>
          <div className='flex items-center text-xs gap-2'>
            <div className='flex items-center gap-1'>
              <div className='flex items-center gap-0.5 px-1 py-px bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded text-gray-700 dark:text-gray-200'>
                <Hand className='size-2.5' />
                <span className='font-medium text-xs'>L</span>
              </div>
              <span className='text-gray-600 dark:text-gray-300 text-xs'>
                Grab
              </span>
            </div>
            <div className='flex items-center gap-1'>
              <div className='flex items-center gap-0.5 px-1 py-px bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded text-gray-700 dark:text-gray-200'>
                <MousePointer className='size-2.5' />
                <span className='font-medium text-xs'>R</span>
              </div>
              <span className='text-gray-600 dark:text-gray-300 text-xs'>
                Options
              </span>
            </div>
          </div>
        </div>
      }
    >
      <div
        className={clsx(
          'absolute inset-y-0 px-1.5 flex items-center bg-gray-300/20 border-r border-gray-300 dark:bg-gray-500/20 dark:border-gray-600 rounded-tl-md',
          'size-12.5 flex items-center justify-center',
          'group-focus-within/input:border-blue-500',
          {
            'cursor-grab': !disabled,
            'cursor-not-allowed opacity-50': disabled,
          }
        )}
        draggable={!disabled}
        onDragStart={handleDragStart}
      >
        <PokemonSprite
          pokemonId={pokemon.id}
          className={clsx(
            dragPreview && 'opacity-60 pointer-none' // Make preview sprite opaque
          )}
          draggable={false}
        />
      </div>
    </CursorTooltip>
  );
}
