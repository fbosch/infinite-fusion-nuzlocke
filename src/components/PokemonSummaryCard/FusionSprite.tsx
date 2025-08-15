'use client';

import React, {
  useCallback,
  useImperativeHandle,
  useRef,
  forwardRef,
} from 'react';
import Image from 'next/image';

import { CursorTooltip } from '@/components/CursorTooltip';
import { twMerge } from 'tailwind-merge';
import { Palette, MousePointer } from 'lucide-react';

import { useAnimatedSprite } from './useAnimatedSprite';
import {
  getAltText,
  getSpriteUrl,
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
import Rays from '@/assets/images/rays.svg';
import { TypePills } from '../TypePills';
import { useFusionTypesFromQuery } from '@/hooks/useFusionTypes';
import { createFusionTypeQuery } from '@/utils/fusionUtils';

export interface FusionSpriteHandle {
  playEvolution: (durationMs?: number) => void;
}

interface FusionSpriteProps {
  headPokemon: PokemonOptionType | null;
  bodyPokemon: PokemonOptionType | null;
  isFusion?: boolean;
  className?: string;
  shouldLoad?: boolean;
  showStatusOverlay?: boolean;
  showTooltip?: boolean;
}

export const FusionSprite = forwardRef<FusionSpriteHandle, FusionSpriteProps>(
  function FusionSprite(
    {
      headPokemon,
      bodyPokemon,
      isFusion = false,
      shouldLoad,
      showStatusOverlay = true,
      showTooltip = true,
      className,
    }: FusionSpriteProps,
    ref
  ) {
    const hasHovered = useRef(false);

    const head = headPokemon;
    const body = bodyPokemon;

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

    const fusionQuery = createFusionTypeQuery(head, body, isFusion);
    const { primary, secondary } = useFusionTypesFromQuery(fusionQuery);

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
    const {
      imageRef,
      shadowRef,
      raysSvgRef,
      handleMouseEnter,
      handleMouseLeave,
      playEvolutionAnimation,
    } = useAnimatedSprite({
      canAnimate: statusState.canAnimate,
    });

    useImperativeHandle(
      ref,
      () => ({
        playEvolution: playEvolutionAnimation,
      }),
      [playEvolutionAnimation]
    );

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
                <div className='min-w-44 max-w-[22rem]'>
                  <div className='flex py-0.5'>
                    <TypePills primary={primary} secondary={secondary} />
                  </div>
                  <div className='my-2 flex'>
                    <div className='inline-flex items-center gap-1.5 text-[11px] text-gray-700 dark:text-gray-400'>
                      <Palette className='size-3' />
                      <span className='opacity-80'>by</span>
                      <span className='truncate max-w-[14rem]' title={credit}>
                        {credit}
                      </span>
                    </div>
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
              ) : undefined
            }
          >
            <div
              className={twMerge(
                'relative z-10 -translate-y-6',
                statusState.wrapperClasses
              )}
            >
              <div
                ref={raysSvgRef as unknown as React.RefObject<HTMLDivElement>}
                aria-hidden='true'
                className='absolute size-35 left-1/2 top-2/3 -translate-x-1/2 -translate-y-1/2 pointer-events-none opacity-0 bg-radial from-5% to-35% from-white/50 to-transparent'
              >
                <Rays className='w-full h-full dark:text-white/50 text-sky-300' />
              </div>
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
);
