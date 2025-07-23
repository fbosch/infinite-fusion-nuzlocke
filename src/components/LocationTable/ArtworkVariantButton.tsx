'use client';

import React from 'react';
import { Loader2, RefreshCcwDot, RefreshCwOff } from 'lucide-react';
import clsx from 'clsx';
import { playthroughActions, useEncounters } from '@/stores/playthroughs';
import { twMerge } from 'tailwind-merge';

interface ArtworkVariantButtonProps {
  locationId: string;
  isFusion: boolean;
  currentVariant?: string;
  disabled?: boolean;
  className?: string;
}

export function ArtworkVariantButton({
  locationId,
  isFusion,
  currentVariant,
  disabled = false,
  className,
}: ArtworkVariantButtonProps) {
  const [isLoading, setIsLoading] = React.useState(false);
  const [hasVariants, setHasVariants] = React.useState<boolean | null>(null);
  const encounters = useEncounters();
  const encounterData = encounters[locationId];

  // Preload available variants when the fusion is created
  React.useEffect(() => {
    if (!isFusion || !encounterData?.head || !encounterData?.body) {
      setHasVariants(null);
      return;
    }

    let cancelled = false;

    const preloadVariants = async () => {
      try {
        const { getAvailableArtworkVariants } = await import(
          '@/utils/spriteValidation'
        );
        const availableVariants = await getAvailableArtworkVariants(
          encounterData.head!.id,
          encounterData.body!.id
        );

        if (!cancelled) {
          setHasVariants(availableVariants.length > 1);
        }
      } catch (error) {
        console.error('Failed to preload variants:', error);
        if (!cancelled) {
          setHasVariants(false);
        }
      }
    };

    preloadVariants();

    return () => {
      cancelled = true;
    };
  }, [isFusion, encounterData?.head?.id, encounterData?.body?.id]);

  const handleCycleVariant = React.useCallback(async () => {
    if (!isFusion || disabled || isLoading) return;

    setIsLoading(true);
    try {
      await playthroughActions.cycleArtworkVariant(locationId);
    } catch (error) {
      console.error('Failed to cycle artwork variant:', error);
    } finally {
      setIsLoading(false);
    }
  }, [locationId, isFusion, disabled, isLoading]);

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
          : `Cycle artwork variants`
      }
      title={
        isButtonDisabled
          ? `No alternative artwork variants available`
          : `Cycle artwork variants`
      }
    >
      <div className='dark:pixel-shadow'>
        {isLoading ? (
          <Loader2 className='size-4 animate-spin' />
        ) : isButtonDisabled ? (
          <RefreshCwOff className='size-3' />
        ) : (
          <RefreshCcwDot className='size-3' />
        )}
      </div>
    </button>
  );
}
