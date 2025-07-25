'use client';

import React, { useMemo, useState } from 'react';
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
  const [hasVariants, setHasVariants] = useState<boolean | null>(null);

  // Check for variants on mount and when encounter changes
  React.useEffect(() => {
    if (!shouldLoad) return;
    const checkVariants = async () => {
      try {
        const { default: spriteService } = await import(
          '@/services/spriteService'
        );

        let variants: string[] = [];
        variants = await spriteService.getArtworkVariants(
          encounter.head?.id,
          encounter.body?.id
        );

        setHasVariants(variants.length > 1);
      } catch (error) {
        console.warn('Failed to check artwork variants:', error);
        setHasVariants(false);
      }
    };

    window.requestIdleCallback(checkVariants, { timeout: 1000 });
  }, [encounter.head, encounter.body, encounter.isFusion, shouldLoad]);

  const handleCycleVariant = React.useCallback(
    async (event: React.MouseEvent) => {
      if (disabled || hasVariants === false) return;
      const reverse = event.shiftKey;

      playthroughActions.cycleArtworkVariant(locationId, reverse);
    },
    [locationId, disabled, hasVariants]
  );

  const isButtonDisabled = disabled || hasVariants === false;

  const label = useMemo(() => {
    if (hasVariants === null) {
      return 'Loading...';
    }
    if (hasVariants === false) {
      return 'No alternative artwork variants available';
    }
    return 'Cycle artwork variants (hold Shift to reverse)';
  }, [hasVariants]);

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
          'disabled:cursor-not-allowed enabled:hover:opacity-100 enabled:hover:text-white',
          { 'group-hover:opacity-100': hasVariants === null }
        ),
        className
      )}
      aria-label={label}
      title={label}
    >
      <div className='dark:pixel-shadow'>
        {hasVariants === null ? (
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
