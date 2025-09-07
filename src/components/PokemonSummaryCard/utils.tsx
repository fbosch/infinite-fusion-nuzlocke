'use client';

import React from 'react';
import { Loader2 } from 'lucide-react';
import { type PokemonOptionType, isEggId } from '@/loaders/pokemon';
import {
  isPokemonActive,
  isPokemonInactive,
  canFuse,
} from '@/utils/pokemonPredicates';
import { getFusionOverlayStatus } from '@/utils/fusionStatus';

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

  // For fusions, always prioritize head Pokémon nickname if it exists
  if (head.nickname) {
    return head.nickname;
  }

  // If no head nickname, fall back to body nickname or the fusion name format
  return body.nickname || `${head.name}/${body.name}`;
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
  const overlayStatus = getFusionOverlayStatus(head, body);

  switch (overlayStatus) {
    case 'missed':
      return {
        type: 'missed',
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
      };
    case 'deceased':
      return {
        type: 'deceased',
        wrapperClasses: 'opacity-50',
        imageClasses: 'saturate-30',
        overlayContent: (
          <div className='absolute pixel-shadow -right-2 bottom-0 z-10 bg-red-500 flex items-center justify-center pointer-events-none dark:bg-red-900 h-fit w-fit px-1 rounded-xs'>
            <span className='pixel-shadow text-xs text-white font-ds'>FNT</span>
          </div>
        ),
        canAnimate: false,
      };
    case 'normal':
    case 'stored':
    default:
      // Allow animation for active Pokemon (CAPTURED, RECEIVED, TRADED)
      // For single Pokemon: animate if the Pokemon is active
      // For fusion Pokemon: animate if both are active
      const headIsActive = isPokemonActive(head);
      const bodyIsActive = isPokemonActive(body);

      // If we have both Pokemon (fusion case), both must be active
      // If we only have one Pokemon (single case), that one must be active
      // Also ensure the Pokemon have status values (not undefined/null)
      const hasValidStatus = Boolean(head?.status || body?.status);
      const canAnimate = Boolean(
        hasValidStatus &&
          (head && body
            ? headIsActive && bodyIsActive
            : headIsActive || bodyIsActive)
      );

      return {
        type: 'normal',
        wrapperClasses: '',
        imageClasses: '',
        overlayContent: null,
        canAnimate,
      };
  }
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
  // If either slot missing, or fusion not requested, return as-is
  if (!isFusion || !head || !body) {
    return { head, body, isFusion };
  }

  // Enforce fusion gating: both must have statuses and be both active or both inactive
  const canShowFusion = canFuse(head, body);
  if (!canShowFusion) {
    const headIsActive = isPokemonActive(head);
    const bodyIsActive = isPokemonActive(body);
    const headIsInactive = isPokemonInactive(head);
    const bodyIsInactive = isPokemonInactive(body);

    // Prefer showing a single with a known status; prioritize active over inactive
    if (headIsActive && !bodyIsActive)
      return { head, body: null, isFusion: false };
    if (bodyIsActive && !headIsActive)
      return { head: null, body, isFusion: false };
    if (headIsInactive && !bodyIsInactive)
      return { head, body: null, isFusion: false };
    if (bodyIsInactive && headIsActive)
      return { head, body: null, isFusion: false };

    // If statuses are missing or ambiguous, default to showing head only when present
    return { head, body: null, isFusion: false };
  }

  return { head, body, isFusion: true };
}

export function LoadingSpinner() {
  return (
    <div className='absolute inset-0 flex items-center justify-center bg-gray-100 dark:bg-gray-800 rounded-lg'>
      <Loader2 className='size-8 animate-spin text-gray-400' />
    </div>
  );
}
