'use client';

import React from 'react';
import { Loader2 } from 'lucide-react';
import { match, P } from 'ts-pattern';
import {
  PokemonStatus,
  type PokemonOptionType,
  isEggId,
} from '@/loaders/pokemon';

function isEgg(pokemon: PokemonOptionType): boolean {
  return isEggId(pokemon.id);
}

export const QUESTION_MARK =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAASAAAAEgBAMAAADmrbOzAAAAD1BMVEUAAAAAAAD////Ozs6tra07B8SZAAAAAXRSTlMAQObYZgAAAcVJREFUeNrt3F1u4jAUgNGwgzFlA6RsYMgKBnn/axq1QG5TQ9q+xLZ6zhsREt/DjRPlhwEAAAAAAAAAAAAAAKhml27+DG0QtCYVhh8RtJ2oaahJ0DdqGmoStG6XwiFP7/K/FL5YtQVtFFTW5Mu4cMrfaBK0dVBR87RpeEjQtkExQPvxqePKGAmqFjTOXqebc2wT1E7QfYCiJo6phxxNxyd7vqBtg8oBSoXVMRJUJSgGaJ6e6fw2TPMk3cdIUP2gxWnQKd9rYgl4+IVhJqhS0GJE9mMoNgqqHLRb7NUfB2j6m9LL9HGMYl2IPV9QpaD9uPzhiCtDx6OgZoJOeT0oXwTVD4pfuu7nq0HpZfp8fBVUJyiW5vh4yrcVPJaDWLgFtRaU9tcjaCzNgloPuopzVkF9BM0nrIIaDMqXp0EpxMFVUIWg1VPYqCy2xMJ9GN61E3Q7p/5dQa9TWjWdBTUTtLwcs7xOXa7dgqoGlRc9Y1Gel+/qV2EFrd1aKIOauNchqOUbeIJ6vU0uqKOHUQR1+MiXoH4frBTUzePLgjp8SUBQf6/iCOrxhTdBHb5WKqjHl7cF9fgXCYIAAAAAAAAAAAAAAIDH/gPtjijCtkSRDwAAAABJRU5ErkJggg==';

// Transparent 1x1 pixel data URL to prevent empty image flashing
export const TRANSPARENT_PIXEL =
  'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';

export function getNicknameText(
  head: PokemonOptionType | null,
  body: PokemonOptionType | null,
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

export function getSpriteUrl(
  head: PokemonOptionType | null,
  body: PokemonOptionType | null,
  isFusion: boolean,
  artworkVariant?: string
): string {
  const pokemon = head || body;
  if (!pokemon) return TRANSPARENT_PIXEL;
  if (isEgg(pokemon)) {
    return '/images/egg.png';
  }

  const variantSuffix = artworkVariant ? artworkVariant : '';

  if (!isFusion || !body || !head) {
    // For single Pokémon, use the same sprite source with variants support
    return `https://ifd-spaces.sfo2.cdn.digitaloceanspaces.com/custom/${pokemon.id}${variantSuffix}.png`;
  }

  // For fusions, use head.body pattern with variant
  return `https://ifd-spaces.sfo2.cdn.digitaloceanspaces.com/custom/${head.id}.${body.id}${variantSuffix}.png`;
}

export function getAltText(
  head: PokemonOptionType | null,
  body: PokemonOptionType | null,
  isFusion: boolean
): string {
  const pokemon = head || body;
  if (!pokemon) return '';

  if (!isFusion) return pokemon.name;
  if (!body || !head) return `${pokemon.name} (fusion preview)`;
  return `${head.name}/${body.name} fusion`;
}

export async function validateImageUrl(url: string): Promise<boolean> {
  return new Promise(resolve => {
    const img = new window.Image();
    img.onload = () => resolve(true);
    img.onerror = () => resolve(false);
    img.src = url;
  });
}

export async function getNextFallbackUrl(
  currentSrc: string,
  head: PokemonOptionType | null,
  body: PokemonOptionType | null,
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

type StatusState = {
  type: 'normal' | 'missed' | 'deceased' | 'stored';
  wrapperClasses: string;
  imageClasses: string;
  overlayContent: React.ReactNode | null;
  canAnimate: boolean;
};

export function getStatusState(
  head: PokemonOptionType | null,
  body: PokemonOptionType | null
): StatusState {
  return match([head?.status, body?.status])
    .with([PokemonStatus.MISSED, P._], [P._, PokemonStatus.MISSED], () => ({
      type: 'missed' as const,
      wrapperClasses: 'opacity-50',
      imageClasses: '',
      overlayContent: (
        <div
          className='absolute -right-1.5 bottom-0 z-20 pl-1.5 rounded-sm flex items-center justify-center pointer-events-none font-ds'
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
          <span className='pixel-shadow text-xs text-white font-ds'>FNT</span>
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
          <div className='absolute -right-1.5 bottom-0 z-10 flex items-center justify-center pointer-events-none font-ds'>
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

export interface DisplayPokemon {
  head: PokemonOptionType | null;
  body: PokemonOptionType | null;
  isFusion: boolean;
}

/**
 * Determines which Pokemon to display based on active/inactive states.
 * If one Pokemon is inactive (dead or stored) and the other is active, shows only the active one.
 */
export function getDisplayPokemon(
  head: PokemonOptionType | null,
  body: PokemonOptionType | null,
  isFusion: boolean
): DisplayPokemon {
  // Early return for non-fusion or incomplete data
  if (!isFusion || !head || !body) {
    return { head, body, isFusion };
  }

  // Check if Pokemon are inactive (dead or stored)
  const headInactive =
    head.status === PokemonStatus.DECEASED ||
    head.status === PokemonStatus.STORED;
  const bodyInactive =
    body.status === PokemonStatus.DECEASED ||
    body.status === PokemonStatus.STORED;

  // If one is inactive and the other is active, show only the active one
  if (headInactive && !bodyInactive) {
    return { head: null, body, isFusion: false };
  }
  if (bodyInactive && !headInactive) {
    return { head, body: null, isFusion: false };
  }

  // If both are inactive or both are active, keep fusion display
  return { head, body, isFusion };
}

export function LoadingSpinner() {
  return (
    <div className='absolute inset-0 flex items-center justify-center bg-gray-100 dark:bg-gray-800 rounded-lg'>
      <Loader2 className='size-8 animate-spin text-gray-400' />
    </div>
  );
}
