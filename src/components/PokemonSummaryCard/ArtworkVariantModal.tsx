'use client';

import React, { useMemo } from 'react';
import { Dialog, DialogPanel, DialogTitle } from '@headlessui/react';
import { X, Check } from 'lucide-react';
import clsx from 'clsx';
import { playthroughActions } from '@/stores/playthroughs';
import { useSpriteVariants } from '@/hooks/useSprite';
import { generateSpriteUrl } from '@/lib/spriteCore';

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
  const { data: variants, isLoading } = useSpriteVariants(
    headId,
    bodyId,
    isOpen
  );

  const availableVariants = useMemo(() => {
    if (!variants || variants.length <= 1) return [];
    return variants;
  }, [variants]);

  const handleSelectVariant = React.useCallback(
    async (variant: string) => {
      try {
        // Set the variant for this specific encounter
        playthroughActions.setArtworkVariant(locationId, variant);

        // Also set it as the preferred variant for future encounters
        await playthroughActions.setPreferredVariant(headId, bodyId, variant);

        onClose();
      } catch (error) {
        console.error('Failed to set artwork variant:', error);
      }
    },
    [locationId, headId, bodyId, onClose]
  );

  const handleClearVariant = React.useCallback(async () => {
    try {
      // Clear the variant for this specific encounter
      playthroughActions.setArtworkVariant(locationId, undefined);

      // Also clear the preferred variant
      await playthroughActions.setPreferredVariant(headId, bodyId, undefined);

      onClose();
    } catch (error) {
      console.error('Failed to clear artwork variant:', error);
    }
  }, [locationId, headId, bodyId, onClose]);

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onClose={onClose} className='relative z-50'>
      {/* Backdrop */}
      <div
        className='fixed inset-0 bg-black/30 dark:bg-black/50'
        aria-hidden='true'
      />

      {/* Full-screen container to center the panel */}
      <div className='fixed inset-0 flex w-screen items-center justify-center p-4'>
        <DialogPanel className='max-w-2xl w-full space-y-4 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 p-6'>
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
            <div className='flex items-center justify-center py-8'>
              <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600'></div>
              <span className='ml-3 text-gray-600 dark:text-gray-300'>
                Loading variants...
              </span>
            </div>
          ) : availableVariants.length === 0 ? (
            <div className='text-center py-8'>
              <p className='text-gray-600 dark:text-gray-300'>
                No artwork variants available for this Pokémon.
              </p>
            </div>
          ) : (
            <>
              <div className='grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 max-h-96 overflow-y-auto'>
                {availableVariants.map(variant => {
                  const isSelected = variant === currentVariant;
                  const spriteUrl = generateSpriteUrl(headId, bodyId, variant);

                  return (
                    <button
                      key={variant}
                      onClick={() => handleSelectVariant(variant)}
                      className={clsx(
                        'relative group p-2 rounded-lg border-2 transition-all duration-200',
                        'hover:border-blue-500 hover:shadow-md',
                        'focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2',
                        {
                          'border-blue-500 bg-blue-50 dark:bg-blue-900/20':
                            isSelected,
                          'border-gray-200 dark:border-gray-600': !isSelected,
                        }
                      )}
                      aria-label={`Select variant ${variant || 'default'}`}
                    >
                      <div className='flex flex-col items-center space-y-2'>
                        <div className='relative'>
                          <img
                            src={spriteUrl}
                            alt={`Artwork variant ${variant || 'default'}`}
                            className='w-16 h-16 object-contain'
                            loading='lazy'
                          />
                          {isSelected && (
                            <div className='absolute -top-1 -right-1 bg-blue-500 text-white rounded-full p-1'>
                              <Check className='h-3 w-3' />
                            </div>
                          )}
                        </div>
                        <span className='text-xs text-gray-600 dark:text-gray-300'>
                          {variant || 'Default'}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className='flex justify-between items-center pt-4 border-t border-gray-200 dark:border-gray-700'>
                <button
                  onClick={handleClearVariant}
                  className={clsx(
                    'px-4 py-2 text-sm rounded-md transition-colors',
                    'bg-gray-100 hover:bg-gray-200 text-gray-900 cursor-pointer',
                    'dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-gray-100',
                    'focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-500 focus-visible:ring-offset-2'
                  )}
                >
                  Use Default
                </button>
                <button
                  onClick={onClose}
                  className={clsx(
                    'px-4 py-2 text-sm rounded-md transition-colors',
                    'bg-blue-600 hover:bg-blue-700 text-white cursor-pointer',
                    'focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2'
                  )}
                >
                  Cancel
                </button>
              </div>
            </>
          )}
        </DialogPanel>
      </div>
    </Dialog>
  );
}
