'use client';

import React, { useMemo } from 'react';
import { Loader2, RefreshCwOff, RefreshCcw, RefreshCw } from 'lucide-react';
import clsx from 'clsx';
import { useEncounter } from '@/stores/playthroughs';
import { useShiftKey } from '@/hooks/useKeyPressed';
import { twMerge } from 'tailwind-merge';
import { CursorTooltip } from '../CursorTooltip';
import { useSpriteVariants, usePreferredVariantState } from '@/hooks/useSprite';
import { getDisplayPokemon } from './utils';

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
  shouldLoad = true,
}: ArtworkVariantButtonProps) {
  // Get encounter data directly - only this button will rerender when this encounter changes
  const encounter = useEncounter(locationId);
  const isShiftPressed = useShiftKey();

  // Determine which Pokemon to display based on active/inactive states
  const displayPokemon = getDisplayPokemon(
    encounter?.head ?? null,
    encounter?.body ?? null,
    encounter?.isFusion ?? false
  );

  // Determine which Pokemon IDs to use for variants and preferred state
  // When fusion is off, use the single Pokemon ID; when fusion is on, use both
  const headId = displayPokemon.isFusion
    ? (displayPokemon.head?.id ?? null)
    : (displayPokemon.head?.id ?? displayPokemon.body?.id ?? null);
  const bodyId = displayPokemon.isFusion
    ? (displayPokemon.body?.id ?? null)
    : null;

  // Use the determined Pokemon IDs for preferred variant state
  const { variant: currentVariant, updateVariant } = usePreferredVariantState(
    headId,
    bodyId
  );

  // Use React Query hook for sprite variants with determined Pokemon IDs
  const { data: variants, isLoading } = useSpriteVariants(
    headId,
    bodyId,
    shouldLoad
  );

  // Determine if variants are available
  const hasVariants = variants && variants.length > 1;

  const handleCycleVariant = React.useCallback(async () => {
    if (disabled || !hasVariants || !variants) return;

    try {
      // Get current variant and find next one
      const currentIndex = variants.indexOf(currentVariant);
      const nextIndex = isShiftPressed
        ? (currentIndex - 1 + variants.length) % variants.length
        : (currentIndex + 1) % variants.length;

      const newVariant = variants[nextIndex] || '';

      // Update the variant
      await updateVariant(newVariant);
    } catch (error) {
      console.error('Failed to cycle artwork variant:', error);
    }
  }, [
    disabled,
    hasVariants,
    variants,
    currentVariant,
    isShiftPressed,
    updateVariant,
  ]);

  const buttonIcon = useMemo(() => {
    if (isLoading) {
      return <Loader2 className='animate-spin size-3' />;
    }
    if (!hasVariants) {
      return <RefreshCwOff className='size-3' />;
    }
    if (isShiftPressed) {
      return <RefreshCcw className='size-3' />;
    }
    return <RefreshCw className='size-3' />;
  }, [hasVariants, isLoading, isShiftPressed]);

  const label = useMemo(() => {
    if (isLoading) {
      return 'Checking for artwork variants...';
    }
    if (!hasVariants) {
      return 'No artwork variants available';
    }
    return 'Cycle artwork variants (hold Shift to reverse)';
  }, [hasVariants, isLoading]);

  // Don't show button if no encounter exists
  if (!encounter) {
    return null;
  }

  const isButtonDisabled = disabled || !hasVariants || isLoading;

  return (
    <CursorTooltip
      disabled={!hasVariants}
      content={
        <div className='text-sm flex flex-col gap-1'>
          <div className='font-normal'>Cycle artwork variants</div>
          <span className='text-xs text-gray-400'>Hold Shift to reverse</span>
        </div>
      }
      delay={1000}
    >
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
              'group-hover:opacity-100': isLoading,
              'enabled:hover:bg-blue-400 enabled:focus:bg-blue-400 enabled:dark:hover:bg-blue-600 enabled:dark:focus:bg-blue-600 enabled:focus:text-white':
                !isShiftPressed,
              'enabled:hover:bg-orange-400 enabled:focus:bg-orange-400 enabled:dark:hover:bg-orange-700 enabled:dark:focus:bg-orange-700':
                isShiftPressed,
            }
          ),
          className
        )}
        aria-label={label}
      >
        <div className=''>{buttonIcon}</div>
      </button>
    </CursorTooltip>
  );
}
