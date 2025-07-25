'use client';

import React, { useState } from 'react';
import { Loader2, RefreshCwOff, RefreshCcw } from 'lucide-react';
import clsx from 'clsx';
import { playthroughActions } from '@/stores/playthroughs';
import { twMerge } from 'tailwind-merge';
import { EncounterData } from '../../loaders/encounters';

interface ArtworkVariantButtonProps {
  locationId: string;
  encounter: EncounterData;
  disabled?: boolean;
  className?: string;
  shouldLoad?: boolean;
}

export function ArtworkVariantButton({
  locationId,
  disabled = false,
  encounter,
  className,
  shouldLoad,
}: ArtworkVariantButtonProps) {
  const [isLoading, setIsLoading] = React.useState(false);
  const [hasVariants, setHasVariants] = useState<boolean | null>(null);

  // Check cached variants without making HTTP requests
  React.useEffect(() => {
    if (!encounter?.head || !shouldLoad) {
      setHasVariants(null);
      return;
    }

    const checkCachedVariants = async () => {
      const isFusion = encounter.isFusion && encounter.head && encounter.body;
      const isSinglePokemon = !encounter.isFusion && encounter.head;

      if (!isFusion && !isSinglePokemon) {
        setHasVariants(null);
        return;
      }

      if (isFusion && encounter.head?.id && encounter.body?.id) {
        const { getCachedArtworkVariants } = await import(
          '@/services/spriteService'
        );
        const cachedVariants = await getCachedArtworkVariants(
          encounter.head.id,
          encounter.body.id
        );

        // Only update state if we have cached data
        if (cachedVariants !== null) {
          setHasVariants(cachedVariants.length > 1);
        }
      } else if (isSinglePokemon && encounter.head?.id) {
        const { getCachedPokemonArtworkVariants } = await import(
          '@/services/spriteService'
        );
        const cachedVariants = await getCachedPokemonArtworkVariants(
          encounter.head.id
        );

        // Only update state if we have cached data
        if (cachedVariants !== null) {
          setHasVariants(cachedVariants.length > 1);
        }
      }
    };
    checkCachedVariants();
  }, [encounter.head, encounter.body, encounter.isFusion, shouldLoad]);

  const handleCycleVariant = React.useCallback(
    async (event: React.MouseEvent) => {
      if (disabled || isLoading) return;
      const reverse = event.shiftKey;
      setIsLoading(true);

      try {
        await playthroughActions.cycleArtworkVariant(locationId, reverse);

        // After cycling, check if we discovered that there are no variants
        if (hasVariants === null && encounter?.head?.id) {
          const isFusion =
            encounter.isFusion && encounter.head && encounter.body;
          const isSinglePokemon = !encounter.isFusion && encounter.head;

          if (isFusion && encounter.body?.id) {
            const { getCachedArtworkVariants } = await import(
              '@/services/spriteService'
            );
            const cachedVariants = await getCachedArtworkVariants(
              encounter.head.id,
              encounter.body.id
            );
            if (cachedVariants !== null) {
              setHasVariants(cachedVariants.length > 1);
            }
          } else if (isSinglePokemon) {
            const { getCachedPokemonArtworkVariants } = await import(
              '@/services/spriteService'
            );
            const cachedVariants = await getCachedPokemonArtworkVariants(
              encounter.head.id
            );
            if (cachedVariants !== null) {
              setHasVariants(cachedVariants.length > 1);
            }
          }
        }
      } finally {
        setIsLoading(false);
      }
    },
    [
      locationId,
      disabled,
      isLoading,
      hasVariants,
      encounter?.head?.id,
      encounter?.body?.id,
      encounter?.isFusion,
    ]
  );

  const isButtonDisabled = disabled || isLoading || hasVariants === false;

  return (
    <button
      type='button'
      onClick={handleCycleVariant}
      disabled={isButtonDisabled}
      className={twMerge(
        clsx(
          'group-hover:opacity-50 opacity-0 focus:opacity-100',
          'transition-opacity duration-200',
          'size-4 cursor-pointer flex items-center justify-center',
          'rounded-full text-gray-600 dark:text-white',
          'focus:outline-none focus:ring-2 focus:ring-blue-500',
          'enabled:hover:bg-gray-400 dark:enabled:hover:bg-gray-600',
          'disabled:cursor-not-allowed enabled:hover:opacity-100 enabled:hover:text-white'
        ),
        className
      )}
      aria-label={
        hasVariants === false
          ? `No alternative artwork variants available`
          : `Cycle artwork variants (hold Shift to reverse)`
      }
      title={
        hasVariants === false
          ? `No alternative artwork variants available`
          : `Cycle artwork variants (hold Shift to reverse)`
      }
    >
      <div className='dark:pixel-shadow'>
        {isLoading ? (
          <Loader2 className='size-4 animate-spin' />
        ) : hasVariants === false ? (
          <RefreshCwOff className='size-3' />
        ) : (
          <RefreshCcw className='size-3' />
        )}
      </div>
    </button>
  );
}
