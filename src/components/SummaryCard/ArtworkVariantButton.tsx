'use client';

import React, { useState } from 'react';
import { Loader2, RefreshCwOff, RefreshCcw } from 'lucide-react';
import clsx from 'clsx';
import { playthroughActions, useEncounters } from '@/stores/playthroughs';
import { twMerge } from 'tailwind-merge';

interface ArtworkVariantButtonProps {
  locationId: string;
  isFusion: boolean;
  currentVariant?: string;
  disabled?: boolean;
  className?: string;
  shouldLoad?: boolean;
}

export function ArtworkVariantButton({
  locationId,
  isFusion,
  currentVariant,
  disabled = false,
  className,
  shouldLoad,
}: ArtworkVariantButtonProps) {
  const [isLoading, setIsLoading] = React.useState(false);
  const encounters = useEncounters();
  const encounterData = encounters[locationId];
  const [hasVariants, setHasVariants] = useState<boolean | null>(null);

  React.useEffect(() => {
    if (
      !isFusion ||
      !encounterData?.head ||
      !encounterData?.body ||
      !shouldLoad
    ) {
      return;
    }
    const preloadVariants = async () => {
      const { getAvailableArtworkVariants } = await import(
        '@/utils/spriteValidation'
      );
      const availableVariants = await getAvailableArtworkVariants(
        encounterData.head!.id,
        encounterData.body!.id
      );

      setHasVariants(availableVariants.length > 1);
    };
    preloadVariants();
  }, [isFusion, encounterData?.head?.id, encounterData?.body?.id, shouldLoad]);

  const handleCycleVariant = React.useCallback(
    async (event: React.MouseEvent) => {
      if (!isFusion || disabled || isLoading) return;
      const reverse = event.shiftKey;
      setIsLoading(true);
      await playthroughActions.cycleArtworkVariant(locationId, reverse);
      setIsLoading(false);
    },
    [locationId, isFusion, disabled, isLoading]
  );

  // Don't render if it's not a fusion
  if (!isFusion) return null;

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
