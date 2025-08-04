'use client';

import React, { useMemo, useState, useRef, useEffect } from 'react';
import {
  Dialog,
  DialogPanel,
  DialogTitle,
  DialogBackdrop,
} from '@headlessui/react';
import { RadioGroup, Radio, Field } from '@headlessui/react';
import { X, Check, ArrowUpRight } from 'lucide-react';
import clsx from 'clsx';
import { playthroughActions } from '@/stores/playthroughs';
import {
  useSpriteVariants,
  useSetPrefferedVariant,
  useSpriteCredits,
} from '@/hooks/useSprite';
import {
  generateSpriteUrl,
  getFormattedCreditsFromResponse,
} from '@/lib/sprites';
import Image from 'next/image';
import ContextMenu from '../ContextMenu';

interface ArtworkVariantModalProps {
  isOpen: boolean;
  onClose: () => void;
  locationId: string;
  headId?: number | null;
  bodyId?: number | null;
  currentVariant?: string;
}

export function ArtworkVariantModal({
  isOpen,
  onClose,
  locationId,
  headId,
  bodyId,
  currentVariant,
}: ArtworkVariantModalProps) {
  const spriteId = headId && bodyId ? `${headId}.${bodyId}` : headId || bodyId;
  const [localVariant, setLocalVariant] = useState<string | null>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Use local state for immediate updates, fallback to prop
  const displayVariant = localVariant ?? currentVariant;

  // Mutation hook for setting preferred variants
  const setPreferredVariantMutation = useSetPrefferedVariant();

  const { data: variants, isLoading: variantsLoading } = useSpriteVariants(
    headId,
    bodyId,
    isOpen
  );

  const { data: credits, isLoading: creditsLoading } = useSpriteCredits(
    headId,
    bodyId,
    isOpen
  );

  const isLoading = creditsLoading || variantsLoading;

  const availableVariants = useMemo(() => {
    if (!variants || variants.length <= 1) return [];
    return variants;
  }, [variants]);

  // Reset local state when modal opens/closes or currentVariant changes
  useEffect(() => {
    if (!isOpen) {
      setLocalVariant(null);
    }
  }, [isOpen]);

  // Debounced save function
  const debouncedSave = React.useCallback(
    async (variant: string) => {
      try {
        // Set the variant for this specific encounter
        playthroughActions.setArtworkVariant(locationId, variant);

        // Also set it as the preferred variant for future encounters
        await setPreferredVariantMutation.mutateAsync({
          headId,
          bodyId,
          variant,
        });
      } catch (error) {
        console.error('Failed to set artwork variant:', error);
      }
    },
    [locationId, headId, bodyId, setPreferredVariantMutation]
  );

  const handleSelectVariant = React.useCallback(
    (variant: string) => {
      // Immediately update the local state for instant UI feedback
      setLocalVariant(variant);

      // Clear any existing timeout
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }

      // Set a new timeout to save after 500ms of no changes
      saveTimeoutRef.current = setTimeout(() => {
        debouncedSave(variant);
      }, 500);
    },
    [debouncedSave]
  );

  const handleClearVariant = React.useCallback(async () => {
    // Immediately update the local state
    setLocalVariant('');

    // Clear any existing timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    try {
      // Clear the variant for this specific encounter
      playthroughActions.setArtworkVariant(locationId, undefined);

      // Also clear the preferred variant
      await setPreferredVariantMutation.mutateAsync({
        headId,
        bodyId,
        variant: undefined,
      });

      onClose();
    } catch (error) {
      console.error('Failed to clear artwork variant:', error);
    }
  }, [locationId, headId, bodyId, onClose, setPreferredVariantMutation]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  return (
    <Dialog open={isOpen} onClose={onClose} className='relative z-50 group'>
      <DialogBackdrop
        transition
        className='fixed inset-0 bg-black/30 dark:bg-black/50 backdrop-blur-[2px] data-closed:opacity-0 data-enter:opacity-100 '
        aria-hidden='true'
      />

      <div className='fixed inset-0 flex w-screen items-center justify-center p-4'>
        <DialogPanel
          transition
          id='artwork-variant-modal'
          className={clsx(
            'max-w-5xl w-full max-h-[80vh] space-y-4 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 p-6 flex flex-col',
            'transition duration-150 ease-out data-closed:opacity-0 data-closed:scale-98'
          )}
        >
          <div className='flex items-center justify-between'>
            <DialogTitle className='text-xl font-semibold text-gray-900 dark:text-white'>
              Select Artwork Variant
            </DialogTitle>
            <button
              onClick={onClose}
              className={clsx(
                'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300',
                'focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-500 focus-visible:ring-offset-2',
                'p-1 rounded-md transition-colors cursor-pointer'
              )}
              aria-label='Close modal'
            >
              <X className='h-5 w-5' />
            </button>
          </div>

          {isLoading ? (
            <div className='flex items-center justify-center py-8 flex-1'>
              <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600'></div>
              <span className='ml-3 text-gray-600 dark:text-gray-300'>
                Loading variants...
              </span>
            </div>
          ) : availableVariants.length === 0 ? (
            <div className='text-center py-8 flex-1'>
              <p className='text-gray-600 dark:text-gray-300'>
                No artwork variants available for this Pokémon.
              </p>
            </div>
          ) : (
            <>
              <RadioGroup
                value={displayVariant || ''}
                onChange={handleSelectVariant}
                data-scroll-container
                className='grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 overflow-y-auto overflow-x-hidden flex-1 min-h-0 scrollbar-thin p-3 relative'
                aria-label='Artwork variant options'
              >
                {availableVariants.map(variant => {
                  const spriteUrl = generateSpriteUrl(headId, bodyId, variant);
                  return (
                    <Field key={variant} className='contents'>
                      <Radio
                        value={variant}
                        id={`artwork-variant-${variant}`}
                        className={({ checked }) =>
                          clsx(
                            'relative group p-2 rounded-lg border-2 transition-color duration-200 cursor-pointer flex flex-col',
                            'hover:border-blue-500 hover:shadow-md',
                            'focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2',
                            {
                              'border-blue-500 bg-blue-50 dark:bg-blue-900/20':
                                checked,
                              'border-gray-200 dark:border-gray-600': !checked,
                            }
                          )
                        }
                      >
                        {({ checked }) => (
                          <figure className='flex flex-col items-center space-y-2 relative user-select-none group/figure'>
                            <div className=''>
                              <Image
                                src={spriteUrl}
                                alt={`Artwork variant ${variant || 'default'}`}
                                className='w-24 h-24 object-fill image-render-pixelated'
                                width={100}
                                height={100}
                                loading='lazy'
                                decoding='async'
                                unoptimized
                              />
                              {checked && (
                                <div className='absolute top-0.5 right-0.5 bg-blue-500 text-white rounded-full p-1.5 shadow-lg'>
                                  <Check className='h-3 w-3' />
                                </div>
                              )}
                              <ContextMenu
                                items={[
                                  {
                                    label: 'View on FusionDex',
                                    id: 'artist',
                                    href: `https://www.fusiondex.org/sprite/pif/${spriteId}${variant}`,
                                    target: '_blank',
                                    icon: ArrowUpRight,
                                    iconClassName:
                                      'dark:text-blue-300 text-blue-400',
                                    favicon:
                                      'https://www.fusiondex.org/favicon.ico',
                                    onClick: (
                                      event: React.MouseEvent<HTMLAnchorElement>
                                    ) => {
                                      event.stopPropagation();
                                    },
                                  },
                                ]}
                              >
                                <div className='absolute inset-0 bg-transparent' />
                              </ContextMenu>
                            </div>
                            <figcaption className='w-full text-center px-1'>
                              <div className='text-xs font-normal text-gray-500 dark:text-gray-400 cursor-pointer block leading-tight break-words select-none'>
                                <div
                                  className='text-lg transition-colors uppercase absolute -top-1 left-0.5 text-gray-500/40 dark:text-gray-400/30 group-hover/figure:text-blue-500/80 dark:group-hover/figure:text-gray-400/30 pointer-events-none'
                                  aria-hidden='true'
                                >
                                  {variant}
                                </div>
                                <div className='pointer-events-none'>
                                  {getFormattedCreditsFromResponse(
                                    credits,
                                    headId,
                                    bodyId,
                                    variant
                                  )}
                                </div>
                              </div>
                            </figcaption>
                          </figure>
                        )}
                      </Radio>
                    </Field>
                  );
                })}
              </RadioGroup>
              <div className='flex justify-between items-center pt-4 border-t border-gray-200 dark:border-gray-700'>
                <button
                  onClick={onClose}
                  className={clsx(
                    'px-4 py-2 text-sm rounded-md transition-colors',
                    'bg-gray-100 hover:bg-gray-200 text-gray-900 cursor-pointer',
                    'dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-gray-100',
                    'focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-500 focus-visible:ring-offset-2'
                  )}
                >
                  Cancel
                </button>
                <button
                  onClick={handleClearVariant}
                  className={clsx(
                    'px-4 py-2 text-sm rounded-md transition-colors',
                    'bg-gray-100 hover:bg-gray-200 text-gray-900 cursor-pointer',
                    'dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-gray-100',
                    'focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2'
                  )}
                >
                  Use Default
                </button>
              </div>
            </>
          )}
        </DialogPanel>
      </div>
    </Dialog>
  );
}
