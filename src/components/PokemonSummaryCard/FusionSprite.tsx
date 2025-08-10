'use client';

import React, { useCallback, useRef } from 'react';
import Image from 'next/image';

import { CursorTooltip } from '@/components/CursorTooltip';
import { twMerge } from 'tailwind-merge';
import { Palette, MousePointer } from 'lucide-react';

import { useAnimatedSprite } from './useAnimatedSprite';
import {
  getSpriteUrl,
  getAltText,
  TRANSPARENT_PIXEL,
  getNextFallbackUrl,
  getStatusState,
} from './utils';
import { isEggId } from '../../loaders';
import { useSpriteCredits } from '@/hooks/useSprite';
import { formatArtistCredits } from '../../utils/formatCredits';
import { getSpriteId } from '../../lib/sprites';
import { type PokemonOptionType } from '@/loaders/pokemon';
import { usePreferredVariantState } from '@/hooks/useSprite';

interface FusionSpriteProps {
  headPokemon: PokemonOptionType | null;
  bodyPokemon: PokemonOptionType | null;
  isFusion?: boolean;
  className?: string;
  shouldLoad?: boolean;
  showStatusOverlay?: boolean;
  showTooltip?: boolean;
}

export function FusionSprite({
  headPokemon,
  bodyPokemon,
  isFusion: isFusionProp,
  shouldLoad,
  showStatusOverlay = true,
  showTooltip = true,
  className,
}: FusionSpriteProps) {
  const hasHovered = useRef(false);

  const head = headPokemon;
  const body = bodyPokemon;
  const isFusion = isFusionProp ?? Boolean(head && body);

  const spriteId = getSpriteId(head?.id, body?.id);
  const hasEgg = isEggId(head?.id) || isEggId(body?.id);

  const { data: credits, isLoading: isLoadingCredits } = useSpriteCredits(
    head?.id,
    body?.id,
    shouldLoad && hasHovered.current === true && !hasEgg
  );

  const { variant: preferredVariant } = usePreferredVariantState(
    head?.id ?? null,
    body?.id ?? null
  );

  const credit =
    hasEgg || isLoadingCredits
      ? undefined
      : formatArtistCredits(credits?.[spriteId + (preferredVariant ?? '')]);

  const handleImageError = useCallback(
    async (e: React.SyntheticEvent<HTMLImageElement>) => {
      const target = e.target as HTMLImageElement;
      target.style.visibility = 'hidden';
      const failingUrl = target.src;
      target.src = TRANSPARENT_PIXEL;
      const newUrl = await getNextFallbackUrl(
        failingUrl,
        head,
        body,
        preferredVariant
      );
      if (newUrl) {
        target.src = newUrl;
      }
      window.requestAnimationFrame(() => {
        target.style.visibility = 'visible';
      });
    },
    [head, body, preferredVariant]
  );

  const statusState = getStatusState(head, body);
  const { imageRef, shadowRef, handleMouseEnter, handleMouseLeave } =
    useAnimatedSprite({
      canAnimate: statusState.canAnimate,
    });

  if (!head && !body) return null;

  const spriteUrl = getSpriteUrl(head, body, isFusion, preferredVariant);
  const altText = getAltText(head, body, isFusion);
  const baseImageClasses =
    'object-fill object-center image-render-pixelated origin-top transition-all duration-200 scale-150 select-none transform-gpu';

  const imageProps = {
    src: spriteUrl,
    width: 64,
    height: 64,
    loading: shouldLoad ? ('eager' as const) : ('lazy' as const),
    unoptimized: true,
    decoding: shouldLoad ? ('auto' as const) : ('async' as const),
    draggable: false,
    placeholder: 'blur' as const,
    blurDataURL: TRANSPARENT_PIXEL,
    onError: handleImageError,
  };

  return (
    <div className='flex flex-col items-center relative'>
      <div
        className={twMerge('relative w-full flex justify-center', className)}
        onMouseEnter={() => {
          if (!hasHovered.current) {
            hasHovered.current = true;
          }
          handleMouseEnter();
        }}
        onMouseLeave={handleMouseLeave}
      >
        <CursorTooltip
          disabled={!credit || !showTooltip}
          delay={500}
          content={
            credit ? (
              <div>
                <div className='flex flex-col gap-1'>
                  <div className='text-xs font-normal tracking-tight flex gap-1 items-center'>
                    <Palette className='size-3' />
                    <span>{credit}</span>
                  </div>
                  <div className='w-full h-px bg-gray-200 dark:bg-gray-700 my-1' />
                  <div className='flex items-center text-xs gap-2'>
                    <div className='flex items-center gap-1'>
                      <div className='flex items-center gap-0.5 px-1 py-px bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded text-gray-700 dark:text-gray-200'>
                        <MousePointer className='size-2.5' />
                        <span className='font-medium text-xs'>L</span>
                      </div>
                      <span className='text-gray-600 dark:text-gray-300 text-xs'>
                        Pokédex
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
              </div>
            ) : undefined
          }
        >
          <div
            className={twMerge(
              'relative z-10 -translate-y-6',
              statusState.wrapperClasses
            )}
          >
            <Image
              ref={shadowRef}
              aria-hidden={true}
              className={twMerge(
                baseImageClasses,
                'absolute translate-x-[45%] translate-y-[35%] skew-x-[-5deg] skew-y-[-30deg] scale-100 rotate-[24deg] brightness-0 opacity-10 dark:opacity-15'
              )}
              {...imageProps}
              alt={altText}
            />
            <Image
              ref={imageRef}
              className={twMerge(
                baseImageClasses,
                statusState.imageClasses,
                'rounded-md'
              )}
              {...imageProps}
              alt={altText}
            />
          </div>
        </CursorTooltip>
        {showStatusOverlay && statusState.overlayContent}
      </div>
    </div>
  );
}
