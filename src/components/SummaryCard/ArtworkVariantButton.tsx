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

  React.useEffect(() => {
    if (
      encounter?.head === undefined ||
      encounter?.body === undefined ||
      !shouldLoad
    ) {
      return;
    }

    const preloadVariants = async () => {
      const { getAvailableArtworkVariants } = await import(
        '@/utils/spriteService'
      );
      const availableVariants = await getAvailableArtworkVariants(
        encounter.head!.id,
        encounter.body!.id
      );

      setHasVariants(availableVariants.length > 1);
    };
    window.requestAnimationFrame(preloadVariants);
  }, [encounter.head, encounter.body, shouldLoad]);

  const handleCycleVariant = React.useCallback(
    async (event: React.MouseEvent) => {
      if (disabled || isLoading) return;
      const reverse = event.shiftKey;
      setIsLoading(true);
      await playthroughActions.cycleArtworkVariant(locationId, reverse);
      setIsLoading(false);
    },
    [locationId, disabled, isLoading]
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
        isButtonDisabled
          ? `No alternative artwork variants available`
          : `Cycle artwork variants (hold Shift to reverse)`
      }
      title={
        isButtonDisabled
          ? `No alternative artwork variants available`
          : `Cycle artwork variants (hold Shift to reverse)`
      }
    >
      <div className='dark:pixel-shadow'>
        {isLoading ? (
          <Loader2 className='size-4 animate-spin' />
        ) : isButtonDisabled ? (
          <RefreshCwOff className='size-3' />
        ) : (
          <RefreshCcw className='size-3' />
        )}
      </div>
    </button>
  );
}
