'use client';

import React, { useMemo, useRef } from 'react';
import Image from 'next/image';
import { PokemonStatus, type PokemonOption } from '@/loaders/pokemon';
import type { EncounterData } from '@/loaders/encounters';
import { match, P } from 'ts-pattern';
import clsx from 'clsx';

interface FusionSpriteProps {
  encounterData: EncounterData;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const SPRITE_SIZES = { sm: 32, md: 48, lg: 64, xl: 96 } as const;

// Transparent 1x1 pixel data URL to prevent empty image flashing
const TRANSPARENT_PIXEL =
  'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';

// Status state type for pattern matching
type StatusState = {
  type: 'normal' | 'missed' | 'deceased' | 'stored';
  imageClasses: string;
  overlayContent: React.ReactNode | null;
  canAnimate: boolean;
};

function getStatusState(
  head: PokemonOption | null,
  body: PokemonOption | null,
  baseImageClasses: string
): StatusState {
  return match([head?.status, body?.status])
    .with(
      [PokemonStatus.MISSED, P._],
      [P._, PokemonStatus.MISSED],
      [PokemonStatus.MISSED, PokemonStatus.MISSED],
      () => ({
        type: 'missed' as const,
        imageClasses: clsx(baseImageClasses, 'opacity-40'),
        overlayContent: (
          <div className='absolute -right-1.5 -bottom-3 z-30 flex items-center justify-center pointer-events-none font-mono'>
            <span className='dark:pixel-shadow text-gray-500 text-xs dark:text-gray-white'>
              ď
            </span>
          </div>
        ),
        canAnimate: false,
      })
    )
    .with(
      [PokemonStatus.DECEASED, P._],
      [P._, PokemonStatus.DECEASED],
      [PokemonStatus.DECEASED, PokemonStatus.DECEASED],
      () => ({
        type: 'deceased' as const,
        imageClasses: clsx(
          baseImageClasses,
          'blur-[0.4px] opacity-50 grayscale'
        ),
        overlayContent: (
          <div className='absolute pixel-shadow -right-1.5 -bottom-3 z-30 bg-red-500 flex items-center justify-center pointer-events-none dark:bg-red-900 h-fit w-fit px-1 rounded-xs'>
            <span className='pixel-shadow text-xs text-white font-mono'>
              FNT
            </span>
          </div>
        ),
        canAnimate: false,
      })
    )
    .with(
      [PokemonStatus.STORED, P._],
      [P._, PokemonStatus.STORED],
      [PokemonStatus.STORED, PokemonStatus.STORED],
      () => ({
        type: 'stored' as const,
        imageClasses: baseImageClasses,
        overlayContent: (
          <div className='absolute -right-1.5 -bottom-3 z-30 flex items-center justify-center pointer-events-none font-mono'>
            <span className='dark:pixel-shadow text-xs dark:text-white'>Ą</span>
          </div>
        ),
        canAnimate: true,
      })
    )
    .otherwise(() => ({
      type: 'normal' as const,
      imageClasses: baseImageClasses,
      overlayContent: null,
      canAnimate: true,
    }));
}

function getSpriteUrl(
  head: PokemonOption | null,
  body: PokemonOption | null,
  isFusion: boolean
): string {
  const pokemon = head || body;
  if (!pokemon) return TRANSPARENT_PIXEL;

  if (!isFusion || !body || !head) {
    return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${pokemon.nationalDexId}.png`;
  }

  return `https://ifd-spaces.sfo2.cdn.digitaloceanspaces.com/custom/${head.id}.${body.id}.png`;
}

function getAltText(
  head: PokemonOption | null,
  body: PokemonOption | null,
  isFusion: boolean
): string {
  const pokemon = head || body;
  if (!pokemon) return '';

  if (!isFusion) return pokemon.name;
  if (!body || !head) return `${pokemon.name} (fusion preview)`;
  return `${head.name}/${body.name} fusion`;
}

export function FusionSprite({
  encounterData,
  size = 'md',
  className,
}: FusionSpriteProps) {
  const imageRef = useRef<HTMLImageElement>(null);
  const shadowRef = useRef<HTMLDivElement>(null);
  const hoverRef = useRef<boolean>(false);
  const { head, body, isFusion } = encounterData;

  // Calculate all values before early return to maintain hook order
  const spriteUrl = getSpriteUrl(head, body, isFusion);
  const altText = getAltText(head, body, isFusion);
  const spriteSize = SPRITE_SIZES[size];

  const baseImageClasses =
    'object-fill object-center image-render-pixelated origin-top -translate-y-1/9 transition-all duration-200';

  const statusState = getStatusState(
    head,
    body,
    clsx(baseImageClasses, className)
  );

  const link = useMemo(() => {
    if (head && !body) {
      return `https://infinitefusiondex.com/details/${head.id}`;
    }
    if (!head && body) {
      return `https://infinitefusiondex.com/details/${body.id}`;
    }
    if (head && body) {
      return `https://infinitefusiondex.com/details/${head.id}.${body.id}`;
    }
  }, [head, body]);

  if (!head && !body) return null;

  return (
    <div className='flex flex-col items-center relative'>
      <a
        href={link}
        target='_blank'
        rel='noopener noreferrer'
        className='cursor-help'
        draggable={false}
        title='Open Pokedex'
        onMouseEnter={() => {
          hoverRef.current = true;
          if (imageRef.current && statusState.canAnimate) {
            // Cancel any running animations so the new one will replay
            imageRef.current.getAnimations().forEach(anim => anim.cancel());
            if (shadowRef.current) {
              shadowRef.current.getAnimations().forEach(anim => anim.cancel());
            }

            const animateSprite = () => {
              const animation = imageRef.current?.animate(
                [
                  { transform: 'translateY(0px)' },
                  { transform: 'translateY(-4px)' },
                  { transform: 'translateY(0px)' },
                ],
                {
                  duration: 400,
                  easing: 'linear',
                  playbackRate: 1,
                  iterations: 1,
                }
              );

              shadowRef.current?.animate(
                [
                  { transform: 'translateY(-40%) translateX(-60%) scale(1)' },
                  {
                    transform: 'translateY(-38%) translateX(-60%) scale(1.03)',
                  },
                  { transform: 'translateY(-40%) translateX(-60%) scale(1)' },
                ],
                {
                  duration: 400,
                  easing: 'linear',
                  playbackRate: 1,
                  iterations: 1,
                }
              );

              if (animation) {
                animation.onfinish = () => {
                  if (hoverRef.current) {
                    animateSprite();
                  }
                };
              }
            };
            animateSprite();
          }
        }}
        onMouseLeave={() => {
          hoverRef.current = false;
          const animation = imageRef.current?.getAnimations();
          const shadowAnimation = shadowRef.current?.getAnimations();

          if (animation) {
            animation.forEach(a => {
              if (a.playState === 'running') {
                a.updatePlaybackRate(-1);
              }
            });
          }

          if (shadowAnimation) {
            shadowAnimation.forEach(a => {
              if (a.playState === 'running') {
                a.updatePlaybackRate(-1);
              }
            });
          }
        }}
      >
        <div className='relative w-full flex justify-center'>
          <div
            ref={shadowRef}
            className='absolute opacity-60 dark:opacity-90'
            style={{
              width: spriteSize * 0.55,
              height: spriteSize * 0.2,
              borderRadius: '50%',
              bottom: 5,
              left: '50%',
              transformOrigin: 'center',
              transform: 'translateY(-40%) translateX(-60%)',
              background:
                'radial-gradient(ellipse, rgba(0,0,0,0.3) 0%, rgba(0,0,0,0.1) 60%, transparent 100%)',
            }}
          />
          {/* Sprite positioned above the shadow */}
          <div className='relative z-10 -translate-y-1/5'>
            <Image
              ref={imageRef}
              src={spriteUrl}
              alt={altText}
              width={spriteSize}
              height={spriteSize}
              className={clsx(statusState.imageClasses, 'select-none')}
              loading='eager'
              unoptimized
              draggable={false}
              placeholder='blur'
              blurDataURL={TRANSPARENT_PIXEL}
              onError={e => {
                const target = e.target as HTMLImageElement;
                if (head && body) {
                  target.src = `https://ifd-spaces.sfo2.cdn.digitaloceanspaces.com/generated/${head.id}.${body.id}.png`;
                }
              }}
            />
            {/* Status overlay */}
            {statusState.overlayContent}
          </div>
        </div>
      </a>
    </div>
  );
}
