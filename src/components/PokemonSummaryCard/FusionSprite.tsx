'use client';

import React, {
  useCallback,
  useImperativeHandle,
  useRef,
  forwardRef,
} from 'react';
import Image from 'next/image';

import { twMerge } from 'tailwind-merge';

import { useAnimatedSprite } from './useAnimatedSprite';
import {
  getSpriteUrl,
  TRANSPARENT_PIXEL,
  getNextFallbackUrl,
  getStatusState,
} from './utils';

import { type PokemonOptionType } from '@/loaders/pokemon';
import { usePreferredVariantState } from '@/hooks/useSprite';
import Rays from '@/assets/images/rays.svg';

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
}

export const FusionSprite = forwardRef<FusionSpriteHandle, FusionSpriteProps>(
  function FusionSprite(
    {
      headPokemon,
      bodyPokemon,
      isFusion = false,
      shouldLoad,
      showStatusOverlay = true,
      className,
    }: FusionSpriteProps,
    ref
  ) {
    const hasHovered = useRef(false);

    const head = headPokemon;
    const body = bodyPokemon;

    // Determine which Pokemon IDs to use for preferred variant based on fusion state
    // When fusion is off, use the single Pokemon ID; when fusion is on, use both
    const variantHeadId = isFusion
      ? (head?.id ?? null)
      : (head?.id ?? body?.id ?? null);
    const variantBodyId = isFusion ? (body?.id ?? null) : null;

    const { variant: preferredVariant } = usePreferredVariantState(
      variantHeadId,
      variantBodyId
    );

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

    // Simple alt text logic
    const altText =
      isFusion && head && body
        ? `${head.name}/${body.name} fusion`
        : head?.name || body?.name || 'Pokemon';
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
          {showStatusOverlay && statusState.overlayContent}
        </div>
      </div>
    );
  }
);
