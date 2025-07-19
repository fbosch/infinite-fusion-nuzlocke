'use client';

import React, { useMemo, useRef} from 'react';
import Image from 'next/image';
import type { PokemonOption } from '@/loaders/pokemon';
import clsx from 'clsx';

interface EncounterData {
  head: PokemonOption | null;
  body: PokemonOption | null;
  isFusion: boolean;
}

interface FusionSpriteProps {
  encounterData: EncounterData;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const SPRITE_SIZES = { sm: 32, md: 48, lg: 64, xl: 96 } as const;

function getSpriteUrl(head: PokemonOption | null, body: PokemonOption | null, isFusion: boolean): string {
  const pokemon = head || body;
  if (!pokemon) return '';
  
  if (!isFusion || !body || !head) {
    return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${pokemon.nationalDexId}.png`;
  }
  
  return `https://ifd-spaces.sfo2.cdn.digitaloceanspaces.com/custom/${head.nationalDexId}.${body.nationalDexId}.png`;
}

function getAltText(head: PokemonOption | null, body: PokemonOption | null, isFusion: boolean): string {
  const pokemon = head || body;
  if (!pokemon) return '';
  
  if (!isFusion) return pokemon.name;
  if (!body || !head) return `${pokemon.name} (fusion preview)`;
  return `${head.name}/${body.name} fusion`;
}

export function FusionSprite({ 
  encounterData, 
  size = 'md',
  className 
}: FusionSpriteProps) {
  const imageRef = useRef<HTMLImageElement>(null);
  const shadowRef = useRef<HTMLDivElement>(null);
  const hoverRef = useRef<boolean>(false);
  const { head, body, isFusion } = encounterData;
  
  if (!head && !body) return null;
  
  const spriteUrl = getSpriteUrl(head, body, isFusion);
  const altText = getAltText(head, body, isFusion);
  const spriteSize = SPRITE_SIZES[size];
  
  const imageClasses = clsx(
    'object-fill object-center image-render-pixelated origin-top -translate-y-1/9',
    className
  );
  
  const link = useMemo(() => {
    if (head && !body) {
      return `https://infinitefusiondex.com/details/${head.nationalDexId}`
    }
    if (!head && body) {
      return `https://infinitefusiondex.com/details/${body.nationalDexId}`
    }
      if (head && body) {
    return `https://infinitefusiondex.com/details/${head.nationalDexId}.${body.nationalDexId}`
      }
  }, [head,body])
  
  return (
    <a href={link} target='_blank' rel='noopener noreferrer' className='cursor-help' draggable={false} title='Open Pokedex'
    
    onMouseEnter={() => {
      hoverRef.current = true;
     if (imageRef.current) {
       // Cancel any running animations so the new one will replay
       imageRef.current.getAnimations().forEach(anim => anim.cancel());
       if (shadowRef.current) {
         shadowRef.current.getAnimations().forEach(anim => anim.cancel());
       }
       
       const animateSprite = () => {
         const animation = imageRef.current?.animate([
           { transform: 'translateY(0px)' },
           { transform: 'translateY(-4px)' },
           { transform: 'translateY(0px)' },
         ], {
           duration: 300,
           easing: 'linear',
           playbackRate: 1,
           iterations: 1,
         });
         
         const shadowAnimation = shadowRef.current?.animate([
           { transform: 'translateY(-40%) translateX(-50%) scale(1)' },
           { transform: 'translateY(-38%) translateX(-50%) scale(1.03)' },
           { transform: 'translateY(-40%) translateX(-50%) scale(1)' },
         ], {
           duration: 300,
           easing: 'linear',
           playbackRate: 1,
           iterations: 1,
         });
         
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
            className='absolute opacity-60'
            style={{ 
              width: spriteSize * 0.6, 
              height: spriteSize * 0.3,
              borderRadius: '50%',
              bottom: -spriteSize * 0.18,
              left: '50%',
              transformOrigin: 'center',
              transform: 'translateY(-40%) translateX(-50%)',
              background: 'radial-gradient(ellipse, rgba(0,0,0,0.3) 0%, rgba(0,0,0,0.1) 60%, transparent 100%)'
            }}
          />
        {/* Sprite positioned above the shadow */}
        <div className='relative z-10'>
          <Image
            ref={imageRef}
            src={spriteUrl}
            alt={altText}
            width={spriteSize}
            height={spriteSize}
            className={imageClasses}
            loading='eager'
            unoptimized
            draggable={false}
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              if (head && body) {
                target.src = `https://ifd-spaces.sfo2.cdn.digitaloceanspaces.com/generated/${head.nationalDexId}.${body.nationalDexId}.png`
              }
            }}
          />
        </div>
      </div>
    </a>
  );
} 