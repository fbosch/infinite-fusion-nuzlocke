'use client';

import React, { useMemo, useRef } from 'react';
import Image from 'next/image';
import { PokemonStatus, type PokemonOption } from '@/loaders/pokemon';
import clsx from 'clsx';
import { match, P } from 'ts-pattern';
import { twMerge } from 'tailwind-merge';
import { SquareArrowUpRight } from 'lucide-react';
import { useEncounter } from '@/stores/playthroughs';

interface FusionSpriteProps {
  locationId: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const SPRITE_SIZES = { sm: 32, md: 48, lg: 64, xl: 96 } as const;

// Transparent 1x1 pixel data URL to prevent empty image flashing
const TRANSPARENT_PIXEL =
  'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';

const QUESTION_MARK =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAASAAAAEgBAMAAADmrbOzAAAAD1BMVEUAAAAAAAD////Ozs6tra07B8SZAAAAAXRSTlMAQObYZgAAAcVJREFUeNrt3F1u4jAUgNGwgzFlA6RsYMgKBnn/axq1QG5TQ9q+xLZ6zhsREt/DjRPlhwEAAAAAAAAAAAAAAKhml27+DG0QtCYVhh8RtJ2oaahJ0DdqGmoStG6XwiFP7/K/FL5YtQVtFFTW5Mu4cMrfaBK0dVBR87RpeEjQtkExQPvxqePKGAmqFjTOXqebc2wT1E7QfYCiJo6phxxNxyd7vqBtg8oBSoXVMRJUJSgGaJ6e6fw2TPMk3cdIUP2gxWnQKd9rYgl4+IVhJqhS0GJE9mMoNgqqHLRb7NUfB2j6m9LL9HGMYl2IPV9QpaD9uPzhiCtDx6OgZoJOeT0oXwTVD4pfuu7nq0HpZfp8fBVUJyiW5vh4yrcVPJaDWLgFtRaU9tcjaCzNgloPuopzVkF9BM0nrIIaDMqXp0EpxMFVUIWg1VPYqCy2xMJ9GN61E3Q7p/5dQa9TWjWdBTUTtLwcs7xOXa7dgqoGlRc9Y1Gel+/qV2EFrd1aKIOauNchqOUbeIJ6vU0uqKOHUQR1+MiXoH4frBTUzePLgjp8SUBQf6/iCOrxhTdBHb5WKqjHl7cF9fgXCYIAAAAAAAAAAAAAAIDH/gPtjijCtkSRDwAAAABJRU5ErkJggg==';

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
    .with([PokemonStatus.MISSED, P._], [P._, PokemonStatus.MISSED], () => ({
      type: 'missed' as const,
      wrapperClasses: 'opacity-50',
      imageClasses: '',
      overlayContent: (
        <div
          className='absolute -right-1.5 bottom-0 z-20 pl-1.5 rounded-sm flex items-center justify-center pointer-events-none font-mono'
          title='Missed!'
        >
          <span className='dark:pixel-shadow text-gray-500 text-xs dark:text-gray-200'>
            ď
          </span>
        </div>
      ),
      canAnimate: false,
    }))
    .with([PokemonStatus.DECEASED, P._], [P._, PokemonStatus.DECEASED], () => ({
      type: 'deceased' as const,
      wrapperClasses: 'opacity-50',
      imageClasses: 'saturate-30',
      overlayContent: (
        <div className='absolute pixel-shadow -right-2 bottom-0 z-10 bg-red-500 flex items-center justify-center pointer-events-none dark:bg-red-900 h-fit w-fit px-1 rounded-xs'>
          <span className='pixel-shadow text-xs text-white font-mono'>FNT</span>
        </div>
      ),
      canAnimate: false,
    }))
    .with(
      [PokemonStatus.STORED, P._],
      [P._, PokemonStatus.STORED],
      [PokemonStatus.STORED, PokemonStatus.STORED],
      () => ({
        type: 'stored' as const,
        wrapperClasses: '',
        imageClasses: '',
        overlayContent: (
          <div className='absolute -right-1.5 bottom-0 z-10 flex items-center justify-center pointer-events-none font-mono'>
            <span className='dark:pixel-shadow text-xs text-gray-500 dark:text-white'>
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
  isFusion: boolean,
  artworkVariant?: string
): string {
  const pokemon = head || body;
  if (!pokemon) return TRANSPARENT_PIXEL;

  const variantSuffix = artworkVariant ? artworkVariant : '';

  if (!isFusion || !body || !head) {
    // For single Pokémon, use the same sprite source with variants support
    return `https://ifd-spaces.sfo2.cdn.digitaloceanspaces.com/custom/${pokemon.id}${variantSuffix}.png`;
  }

  // For fusions, use head.body pattern with variant
  return `https://ifd-spaces.sfo2.cdn.digitaloceanspaces.com/custom/${head.id}.${body.id}${variantSuffix}.png`;
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

async function validateImageUrl(url: string): Promise<boolean> {
  return new Promise(resolve => {
    const img = new window.Image();
    img.onload = () => resolve(true);
    img.onerror = () => resolve(false);
    img.src = url;
  });
}

async function getNextFallbackUrl(
  currentSrc: string,
  head: PokemonOption | null,
  body: PokemonOption | null,
  artworkVariant?: string
): Promise<string | null> {
  const pokemon = head || body;
  if (!pokemon) return null;

  // If we're already using the question mark, don't try again
  if (currentSrc === QUESTION_MARK) return null;

  const candidateUrls: string[] = [];

  if (head && body) {
    // Fusion fallback chain
    if (!currentSrc.includes('/generated/')) {
      candidateUrls.push(
        `https://ifd-spaces.sfo2.cdn.digitaloceanspaces.com/generated/${head.id}.${body.id}${artworkVariant ?? ''}.png`
      );
      if (artworkVariant) {
        candidateUrls.push(
          `https://ifd-spaces.sfo2.cdn.digitaloceanspaces.com/generated/${head.id}.${body.id}.png`
        );
      }
    }
  } else {
    // Single Pokémon fallback chain
    if (currentSrc.includes('/custom/') && artworkVariant) {
      candidateUrls.push(
        `https://ifd-spaces.sfo2.cdn.digitaloceanspaces.com/custom/${pokemon.id}.png`
      );
    } else if (
      !currentSrc.includes('/generated/') &&
      !currentSrc.includes('raw.githubusercontent.com')
    ) {
      candidateUrls.push(
        `https://ifd-spaces.sfo2.cdn.digitaloceanspaces.com/generated/${pokemon.id}${artworkVariant ?? ''}.png`
      );
      if (artworkVariant) {
        candidateUrls.push(
          `https://ifd-spaces.sfo2.cdn.digitaloceanspaces.com/generated/${pokemon.id}.png`
        );
      }
    } else if (currentSrc.includes('/generated/')) {
      candidateUrls.push(
        `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${pokemon.nationalDexId}.png`
      );
    }
  }

  const result = await Promise.any(
    candidateUrls.map(async url => {
      if (await validateImageUrl(url)) {
        return url;
      }
    })
  );

  if (result) {
    return result;
  }

  return QUESTION_MARK;
}

export function FusionSprite({ locationId, size = 'md' }: FusionSpriteProps) {
  const imageRef = useRef<HTMLImageElement>(null);
  const shadowRef = useRef<HTMLImageElement>(null);
  const hoverRef = useRef<boolean>(false);

  // Get encounter data directly - only this sprite will rerender when this encounter changes
  const encounterData = useEncounter(locationId);
  const { head, body, isFusion, artworkVariant } = encounterData || {
    head: null,
    body: null,
    isFusion: false,
    artworkVariant: undefined,
  };

  // Calculate all values before early return to maintain hook order
  const spriteUrl = getSpriteUrl(head, body, isFusion, artworkVariant);
  const altText = getAltText(head, body, isFusion);
  const spriteSize = SPRITE_SIZES[size];

  const fallbackUrl =
    head && body
      ? `https://ifd-spaces.sfo2.cdn.digitaloceanspaces.com/generated/${head.id}.${body.id}.png`
      : `https://ifd-spaces.sfo2.cdn.digitaloceanspaces.com/generated/${head?.id || body?.id}.png`;

  const baseImageClasses =
    'object-fill object-center image-render-pixelated origin-top transition-all duration-200 scale-150 select-none transform-gpu';

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
        className='group focus:outline-none'
        draggable={false}
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
                  { transform: 'skewX(-5deg) skewY(-30deg) scale(1) ' },
                  {
                    transform:
                      'skewX(-5deg) skewY(-30deg) scale(1.03) translateY(-5%)',
                    blur: '0.2px',
                  },
                  { transform: 'skewX(-5deg) skewY(-30deg) scale(1)' },
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
              'relative z-10 -translate-y-6',
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
                'absolute translate-x-[45%] translate-y-[35%] skew-x-[-5deg] skew-y-[-30deg] scale-100 rotate-[24deg] brightness-0 opacity-10 dark:opacity-15'
              )}
              loading='eager'
              unoptimized
              aria-hidden={true}
              decoding='async'
              draggable={false}
              placeholder='blur'
              blurDataURL={TRANSPARENT_PIXEL}
              onError={async e => {
                const target = e.target as HTMLImageElement;
                target.style.visibility = 'hidden';
                const failingUrl = target.src;
                target.src = TRANSPARENT_PIXEL;
                const nextUrl = await getNextFallbackUrl(
                  failingUrl,
                  head,
                  body,
                  artworkVariant
                );
                if (nextUrl) {
                  target.src = nextUrl;
                }
                target.style.visibility = 'visible';
              }}
            />
            <Image
              ref={imageRef}
              src={spriteUrl}
              alt={altText}
              width={spriteSize}
              height={spriteSize}
              className={twMerge(
                baseImageClasses,
                statusState.imageClasses,
                'group-focus-visible:ring-1 ring-blue-400 rounded-md'
              )}
              loading='eager'
              unoptimized
              decoding='async'
              draggable={false}
              placeholder='blur'
              blurDataURL={TRANSPARENT_PIXEL}
              onError={async e => {
                const target = e.target as HTMLImageElement;
                target.style.visibility = 'hidden';
                const failingUrl = target.src;
                target.src = TRANSPARENT_PIXEL;
                const nextUrl = await getNextFallbackUrl(
                  failingUrl,
                  head,
                  body,
                  artworkVariant
                );
                if (nextUrl) {
                  target.src = nextUrl;
                }
                target.style.visibility = 'visible';
              }}
            />
          </div>
          {statusState.overlayContent}
        </div>
        <div
          className={clsx(
            'absolute -top-4 -right-2 text-blue-400 dark:text-blue-300 z-10 bg-gray-200 dark:bg-gray-800 rounded-sm opacity-0',
            'group-focus-visible:opacity-100 group-hover:opacity-100 transition-opacity duration-200',
            'group-focus-visible:ring-1 group-focus-visible:ring-blue-400'
          )}
        >
          <SquareArrowUpRight className='size-4' />
        </div>
      </a>
    </div>
  );
}
