'use client';

import React, { useMemo, useRef } from 'react';
import Image from 'next/image';
import { PokemonStatus, type PokemonOption } from '@/loaders/pokemon';
import type { EncounterData } from '@/loaders/encounters';
import { match, P } from 'ts-pattern';
import { twMerge } from 'tailwind-merge';

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
  wrapperClasses: string;
  imageClasses: string;
  overlayContent: React.ReactNode | null;
  canAnimate: boolean;
};

function getStatusState(
  head: PokemonOption | null,
  body: PokemonOption | null
): StatusState {
  return match([head?.status, body?.status])
    .with(
      [PokemonStatus.MISSED, P._],
      [P._, PokemonStatus.MISSED],
      [PokemonStatus.MISSED, PokemonStatus.MISSED],
      () => ({
        type: 'missed' as const,
        wrapperClasses: 'opacity-40',
        imageClasses: '',
        overlayContent: (
          <div className='absolute -right-1.5 bottom-0 z-5 flex items-center justify-center pointer-events-none font-mono'>
            <span className='dark:pixel-shadow text-gray-500 text-xs dark:text-gray-400'>
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
        wrapperClasses: 'opacity-30',
        imageClasses: 'saturate-30',
        overlayContent: (
          <div className='absolute pixel-shadow -right-2 bottom-0 z-10 bg-red-500 flex items-center justify-center pointer-events-none dark:bg-red-900 h-fit w-fit px-1 rounded-xs'>
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
        wrapperClasses: '',
        imageClasses: '',
        overlayContent: (
          <div className='absolute -right-1.5 bottom-0 z-5 flex items-center justify-center pointer-events-none font-mono'>
            <span className='dark:pixel-shadow text-xs text-gray-500 dark:text-gray-400'>
              Ą
            </span>
          </div>
        ),
        canAnimate: true,
      })
    )
    .otherwise(() => ({
      type: 'normal' as const,
      wrapperClasses: '',
      imageClasses: '',
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
  const shadowRef = useRef<HTMLImageElement>(null);
  const hoverRef = useRef<boolean>(false);
  const { head, body, isFusion } = encounterData;

  // Calculate all values before early return to maintain hook order
  const spriteUrl = getSpriteUrl(head, body, isFusion);
  const altText = getAltText(head, body, isFusion);
  const spriteSize = SPRITE_SIZES[size];

  const baseImageClasses =
    'object-fill object-center image-render-pixelated origin-top -translate-y-1/9 transition-all duration-200 scale-150 select-none';

  const statusState = getStatusState(head, body);

  const link = useMemo(() => {
    return match([head, body])
      .with(
        [P.not(P.nullish), P.nullish],
        ([head]) => `https://infinitefusiondex.com/details/${head.id}`
      )
      .with(
        [P.nullish, P.not(P.nullish)],
        ([, body]) => `https://infinitefusiondex.com/details/${body.id}`
      )
      .with(
        [P.not(P.nullish), P.not(P.nullish)],
        ([head, body]) =>
          `https://infinitefusiondex.com/details/${head.id}.${body.id}`
      )
      .otherwise(() => undefined);
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
                  { transform: 'skewX(-17deg) skewY(-40deg) scale(1) ' },
                  {
                    transform:
                      'skewX(-17deg) skewY(-40deg) scale(1.03) translateY(-5%)',
                    blur: '0.2px',
                  },
                  { transform: 'skewX(-17deg) skewY(-40deg) scale(1)' },
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
            className={twMerge(
              'relative z-10 -translate-y-1/5',
              statusState.wrapperClasses
            )}
          >
            <Image
              ref={shadowRef}
              src={spriteUrl}
              alt={altText}
              width={spriteSize}
              height={spriteSize}
              className={twMerge(
                baseImageClasses,
                'absolute translate-x-[60%] translate-y-[45%] skew-x-[-17deg] skew-y-[-40deg] scale-100 rotate-[34deg] brightness-0 opacity-10 dark:opacity-15'
              )}
              loading='eager'
              unoptimized
              draggable={false}
              placeholder='empty'
              blurDataURL={TRANSPARENT_PIXEL}
              onError={e => {
                const target = e.target as HTMLImageElement;
                if (head && body) {
                  target.src = `https://ifd-spaces.sfo2.cdn.digitaloceanspaces.com/generated/${head.id}.${body.id}.png`;
                }
              }}
            />
            <Image
              ref={imageRef}
              src={spriteUrl}
              alt={altText}
              width={spriteSize}
              height={spriteSize}
              className={twMerge(baseImageClasses, statusState.imageClasses)}
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
          </div>
          {statusState.overlayContent}
        </div>
      </a>
    </div>
  );
}
