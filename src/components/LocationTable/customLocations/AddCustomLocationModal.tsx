'use client';

import { useState, useMemo } from 'react';
import { Dialog, DialogPanel, DialogTitle } from '@headlessui/react';
import { X, Plus, Loader2 } from 'lucide-react';
import clsx from 'clsx';
import { playthroughActions, useCustomLocations } from '@/stores/playthroughs';
import { getLocationsSortedWithCustom } from '@/loaders';

interface AddCustomLocationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AddCustomLocationModal({
  isOpen,
  onClose,
}: AddCustomLocationModalProps) {
  const [locationName, setLocationName] = useState('');
  const [selectedAfterLocationId, setSelectedAfterLocationId] = useState('');
  const customLocations = useCustomLocations();

  // Only process locations when modal is open to improve performance
  const allLocations = useMemo(() => {
    if (!isOpen) return [];
    return getLocationsSortedWithCustom(customLocations);
  }, [isOpen, customLocations]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!locationName.trim() || !selectedAfterLocationId) {
      return;
    }

    const newLocationId = await playthroughActions.addCustomLocation(
      locationName.trim(),
      selectedAfterLocationId
    );

    if (newLocationId !== null) {
      // Reset form and close modal
      setLocationName('');
      setSelectedAfterLocationId('');
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onClose={onClose} className='relative z-50'>
      {/* Backdrop */}
      <div
        className='fixed inset-0 bg-black/30 dark:bg-black/50'
        aria-hidden='true'
      />

      {/* Full-screen container to center the panel */}
      <div className='fixed inset-0 flex w-screen items-center justify-center p-4'>
        <DialogPanel className='max-w-md w-full space-y-4 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 p-6'>
          <div className='flex items-center justify-between'>
            <DialogTitle className='text-xl font-semibold text-gray-900 dark:text-white'>
              Add Custom Location
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

          <form onSubmit={handleSubmit} className='space-y-4 pt-2'>
            <div>
              <label
                htmlFor='locationName'
                className='block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1'
              >
                Location Name
              </label>
              <input
                type='text'
                id='locationName'
                value={locationName}
                onChange={e => setLocationName(e.target.value)}
                required
                className={clsx(
                  'w-full px-3 py-2 border rounded-md transition-colors',
                  'border-gray-300 dark:border-gray-600',
                  'bg-white dark:bg-gray-700',
                  'text-gray-900 dark:text-white',
                  'placeholder-gray-500 dark:placeholder-gray-400',
                  'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500',
                  'dark:focus:ring-blue-400 dark:focus:border-blue-400'
                )}
                placeholder='e.g., Hidden Grotto, Secret Cave'
              />
            </div>

            <div>
              <label
                htmlFor='afterLocation'
                className='block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1'
              >
                Place After
              </label>
              <select
                id='afterLocation'
                value={selectedAfterLocationId}
                onChange={e => setSelectedAfterLocationId(e.target.value)}
                required
                disabled={allLocations.length === 0}
                className={clsx(
                  'w-full px-3 py-2 border rounded-md transition-colors cursor-pointer',
                  'border-gray-300 dark:border-gray-600',
                  'bg-white dark:bg-gray-700',
                  'text-gray-900 dark:text-white',
                  'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500',
                  'dark:focus:ring-blue-400 dark:focus:border-blue-400',
                  'disabled:opacity-50 disabled:cursor-not-allowed'
                )}
              >
                <option value=''>
                  {allLocations.length === 0
                    ? 'Loading locations...'
                    : 'Select location to place after...'}
                </option>
                {allLocations.map(location => (
                  <option key={location.id} value={location.id}>
                    {location.name} (
                    {'region' in location ? location.region : 'Custom'})
                  </option>
                ))}
              </select>
            </div>

            <div className='flex pt-4 flex-row-reverse gap-x-3'>
              <button
                type='submit'
                disabled={allLocations.length === 0}
                className={clsx(
                  'flex-1 px-4 py-2 text-sm font-semibold rounded-md transition-colors',
                  'bg-blue-600 hover:bg-blue-700 text-white',
                  'focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2',
                  'flex items-center justify-center space-x-2',
                  'disabled:opacity-50 disabled:cursor-not-allowed'
                )}
              >
                {allLocations.length === 0 ? (
                  <Loader2 className='h-4 w-4 animate-spin' />
                ) : (
                  <Plus className='h-4 w-4' />
                )}
                <span>Add Location</span>
              </button>
              <button
                type='button'
                onClick={onClose}
                className={clsx(
                  'flex-1 px-4 py-2 text-sm font-semibold rounded-md transition-colors cursor-pointer',
                  'bg-gray-100 hover:bg-gray-200 text-gray-900',
                  'dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-gray-100',
                  'focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-500 focus-visible:ring-offset-2'
                )}
              >
                Cancel
              </button>
            </div>
          </form>
        </DialogPanel>
      </div>
    </Dialog>
  );
}
