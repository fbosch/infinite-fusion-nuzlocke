'use client';

import React, { useMemo, useState } from 'react';
import { Loader2, RefreshCwOff, RefreshCcw, RefreshCw } from 'lucide-react';
import clsx from 'clsx';
import { playthroughActions, useEncounter } from '@/stores/playthroughs';
import { useShiftKey } from '@/hooks/useKeyPressed';
import { twMerge } from 'tailwind-merge';

interface ArtworkVariantButtonProps {
  locationId: string;
  disabled?: boolean;
  className?: string;
  shouldLoad?: boolean;
}

export function ArtworkVariantButton({
  locationId,
  disabled = false,
  className,
  shouldLoad,
}: ArtworkVariantButtonProps) {
  // Get encounter data directly - only this button will rerender when this encounter changes
  const encounter = useEncounter(locationId);
  const [hasVariants, setHasVariants] = useState<boolean | null>(null);
  const isShiftPressed = useShiftKey();

  React.useEffect(() => {
    if (!shouldLoad) return;

    const checkVariants = async () => {
      try {
        const spriteService = (await import('@/services/spriteService'))
          .default;
        let variants: string[] = [];
        variants = await spriteService.getArtworkVariants(
          encounter?.head?.id,
          encounter?.body?.id
        );

        setHasVariants(variants.length > 1);
      } catch (error) {
        console.warn('Failed to check artwork variants:', error);
        setHasVariants(false);
      }
    };

    window.requestIdleCallback(checkVariants, { timeout: 1000 });
  }, [encounter?.head, encounter?.body, encounter?.isFusion, shouldLoad]);

  const handleCycleVariant = React.useCallback(async () => {
    if (disabled || hasVariants === false) return;

    try {
      await playthroughActions.cycleArtworkVariant(locationId, isShiftPressed);
    } catch (error) {
      console.error('Failed to cycle artwork variant:', error);
    }
  }, [disabled, hasVariants, locationId, isShiftPressed]);

  const buttonIcon = useMemo(() => {
    if (hasVariants === null) {
      return <Loader2 className='animate-spin size-3' />;
    }
    if (hasVariants === false) {
      return <RefreshCwOff className='size-3' />;
    }
    if (isShiftPressed) {
      return <RefreshCcw className='size-3' />;
    }
    return <RefreshCw className='size-3' />;
  }, [hasVariants, isShiftPressed]);

  const label = useMemo(() => {
    if (hasVariants === null) {
      return 'Checking for artwork variants...';
    }
    if (hasVariants === false) {
      return 'No artwork variants available';
    }
    return 'Cycle artwork variants (hold Shift to reverse)';
  }, [hasVariants]);

  // Don't show button if no encounter exists
  if (!encounter) {
    return null;
  }

  const isButtonDisabled =
    disabled || hasVariants === false || hasVariants === null;

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
          'focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500',
          'disabled:cursor-not-allowed enabled:hover:opacity-100 enabled:hover:text-white',
          {
            'group-hover:opacity-100': hasVariants === null,
            'enabled:hover:bg-blue-400 enabled:focus:bg-blue-400 enabled:dark:hover:bg-blue-600 enabled:dark:focus:bg-blue-600':
              !isShiftPressed,
            'enabled:hover:bg-orange-400 enabled:focus:bg-orange-400 enabled:dark:hover:bg-orange-700 enabled:dark:focus:bg-orange-700':
              isShiftPressed,
          }
        ),
        className
      )}
      aria-label={label}
      title={label}
    >
      <div className=''>{buttonIcon}</div>
    </button>
  );
}
