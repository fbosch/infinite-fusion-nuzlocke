'use client';

import React, { useMemo, useRef } from 'react';
import Image from 'next/image';
import { PokemonStatus, type PokemonOption } from '@/loaders/pokemon';
import type { EncounterData } from '@/loaders/encounters';
import clsx from 'clsx';
import FaintedIcon from './FaintedIcon';

interface FusionSpriteProps {
  encounterData: EncounterData;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const SPRITE_SIZES = { sm: 32, md: 48, lg: 64, xl: 96 } as const;

// Transparent 1x1 pixel data URL to prevent empty image flashing
const TRANSPARENT_PIXEL =
  'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';

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

function getNicknameText(
  head: PokemonOption | null,
  body: PokemonOption | null,
  isFusion: boolean
): string | undefined {
  if (!isFusion) {
    // Single Pokémon - show nickname if available, otherwise show name
    const pokemon = head || body;
    if (!pokemon) return '';
    return pokemon.nickname || pokemon.name;
  }

  // Fusion case
  if (!head || !body) {
    const pokemon = head || body;
    if (!pokemon) return '';
    return pokemon.nickname || pokemon.name;
  }

  return head.nickname || body.nickname || `${head.name}/${body.name}`;
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
  const nicknameText = getNicknameText(head, body, isFusion);
  const spriteSize = SPRITE_SIZES[size];

  const isMissed =
    head?.status === PokemonStatus.MISSED ||
    body?.status === PokemonStatus.MISSED;
  const isDeceased =
    head?.status === PokemonStatus.DECEASED ||
    body?.status === PokemonStatus.DECEASED;

  const imageClasses = clsx(
    'object-fill object-center image-render-pixelated origin-top -translate-y-1/9',
    {
      'grayscale opacity-50': isMissed || isDeceased,
      'blur-[1px]': isDeceased,
    },
    className
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
          if (imageRef.current && !isMissed && !isDeceased) {
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
              className={clsx(imageClasses, 'select-none')}
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
            {/* Deceased overlay */}
            {isDeceased && (
              <div className='absolute inset-0 z-30 flex items-center justify-center pointer-events-none'>
                <FaintedIcon className='size-8' />
              </div>
            )}
          </div>
        </div>
      </a>
      {nicknameText && (
        <div className='mt-4 text-center absolute bottom-0 translate-y-6'>
          <span className='text-xs font-mono font-bold truncate tracking-widest max-w-full block px-1 rounded text-gray-900 dark:text-white '>
            {nicknameText}
          </span>
        </div>
      )}
    </div>
  );
}
