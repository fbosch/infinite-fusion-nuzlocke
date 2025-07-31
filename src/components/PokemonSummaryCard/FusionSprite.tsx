'use client';

import React, { useCallback } from 'react';
import Image from 'next/image';
import clsx from 'clsx';
import { CursorTooltip } from '@/components/CursorTooltip';
import { twMerge } from 'tailwind-merge';
import { SquareArrowUpRight } from 'lucide-react';
import { useEncounter } from '@/stores/playthroughs';
import { useAnimatedSprite } from './useAnimatedSprite';
import {
  getSpriteUrl,
  getAltText,
  TRANSPARENT_PIXEL,
  getNextFallbackUrl,
  getStatusState,
} from './utils';
import { isEggId } from '../../loaders';

interface FusionSpriteProps {
  locationId: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  shouldLoad?: boolean;
}

const SPRITE_SIZES = { sm: 32, md: 48, lg: 64, xl: 96 } as const;

export function FusionSprite({
  locationId,
  size = 'md',
  shouldLoad,
}: FusionSpriteProps) {
  const encounterData = useEncounter(locationId);
  const { head, body, isFusion, artworkVariant } = encounterData || {
    head: null,
    body: null,
    isFusion: false,
    artworkVariant: undefined,
  };

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
        artworkVariant
      );
      if (newUrl) {
        target.src = newUrl;
      }
      window.requestAnimationFrame(() => {
        target.style.visibility = 'visible';
      });
    },
    [head, body, artworkVariant]
  );

  const statusState = getStatusState(head, body);
  const { imageRef, shadowRef, handleMouseEnter, handleMouseLeave } =
    useAnimatedSprite({
      canAnimate: statusState.canAnimate,
    });

  if (!head && !body) return null;

  const spriteUrl = getSpriteUrl(head, body, isFusion, artworkVariant);
  const altText = getAltText(head, body, isFusion);
  const spriteSize = SPRITE_SIZES[size];
  const baseImageClasses =
    'object-fill object-center image-render-pixelated origin-top transition-all duration-200 scale-150 select-none transform-gpu';

  const hasEgg = isEggId(head?.id) || isEggId(body?.id);

  const link = hasEgg
    ? '#'
    : `https://infinitefusiondex.com/details/${head?.id && body?.id ? `${head.id}.${body.id}` : head?.id || body?.id}`;

  const imageProps = {
    src: spriteUrl,
    width: spriteSize,
    height: spriteSize,
    loading: shouldLoad ? ('eager' as const) : ('lazy' as const),
    unoptimized: true,
    decoding: shouldLoad ? ('auto' as const) : ('async' as const),
    draggable: false,
    placeholder: 'blur' as const,
    blurDataURL: TRANSPARENT_PIXEL,
    onError: handleImageError,
  };

  const renderLinkConditionally = (children: React.ReactNode) => {
    if (hasEgg) {
      return (
        <div
          className='group focus:outline-none'
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          draggable={false}
        >
          {children}
        </div>
      );
    }
    return (
      <a
        href={link}
        target='_blank'
        rel='noopener noreferrer'
        className='group focus:outline-none'
        draggable={false}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {children}
      </a>
    );
  };

  return (
    <div className='flex flex-col items-center relative'>
      {renderLinkConditionally(
        <>
          <div className='relative w-full flex justify-center'>
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
                  'group-focus-visible:ring-1 ring-blue-400 rounded-md'
                )}
                {...imageProps}
                alt={altText}
              />
            </div>
            {statusState.overlayContent}
          </div>
          {!hasEgg && (
            <CursorTooltip
              delay={1000}
              content={
                <div className='flex flex-col gap-1'>
                  <span className='text-sm'>Open Pokédex entry in new tab</span>
                  <span className='text-xs text-gray-400'>{link}</span>
                </div>
              }
            >
              <div
                className={clsx(
                  'absolute -top-4 -right-2 text-blue-400 dark:text-blue-300 z-10 bg-gray-200 dark:bg-gray-800 rounded-sm opacity-0',
                  'group-focus-visible:opacity-100 group-hover:opacity-100 transition-opacity duration-200',
                  'group-focus-visible:ring-1 group-focus-visible:ring-blue-400'
                )}
              >
                <SquareArrowUpRight className='size-4' />
              </div>
            </CursorTooltip>
          )}
        </>
      )}
    </div>
  );
}
