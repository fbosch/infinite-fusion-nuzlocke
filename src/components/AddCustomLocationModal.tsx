'use client';

import { useState } from 'react';
import { X, Plus } from 'lucide-react';
import { playthroughActions, useCustomLocations } from '@/stores/playthroughs';
import { getCombinedLocationsSortedByOrder } from '@/loaders';

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

  // Get all locations (default + custom) for placement selection
  const allLocations = getCombinedLocationsSortedByOrder(customLocations);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!locationName.trim() || !selectedAfterLocationId) {
      return;
    }

    // Find the selected location to determine region
    const afterLocation = allLocations.find(
      loc => loc.id === selectedAfterLocationId
    );
    const region = afterLocation?.region || 'Custom';

    const newLocationId = playthroughActions.addCustomLocation(
      locationName.trim(),
      region,
      `Custom location: ${locationName.trim()}`
    );

    // Now update the order to place it after the selected location
    if (newLocationId && afterLocation) {
      playthroughActions.moveCustomLocationAfter(
        newLocationId,
        selectedAfterLocationId
      );
    }

    // Reset form and close modal
    setLocationName('');
    setSelectedAfterLocationId('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className='fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50'>
      <div className='bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md mx-4'>
        <div className='flex items-center justify-between mb-4'>
          <h2 className='text-xl font-semibold text-gray-900 dark:text-white'>
            Add Custom Location
          </h2>
          <button
            onClick={onClose}
            className='text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
            aria-label='Close modal'
          >
            <X className='h-5 w-5' />
          </button>
        </div>

        <form onSubmit={handleSubmit} className='space-y-4'>
          <div>
            <label
              htmlFor='locationName'
              className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'
            >
              Location Name*
            </label>
            <input
              type='text'
              id='locationName'
              value={locationName}
              onChange={e => setLocationName(e.target.value)}
              required
              className='w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white'
              placeholder='e.g., Hidden Grotto, Secret Cave'
            />
          </div>

          <div>
            <label
              htmlFor='afterLocation'
              className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'
            >
              Place After*
            </label>
            <select
              id='afterLocation'
              value={selectedAfterLocationId}
              onChange={e => setSelectedAfterLocationId(e.target.value)}
              required
              className='w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white'
            >
              <option value=''>Select location to place after...</option>
              {allLocations.map(location => (
                <option key={location.id} value={location.id}>
                  {location.name} ({location.region})
                </option>
              ))}
            </select>
          </div>

          <div className='flex space-x-3 pt-4'>
            <button
              type='button'
              onClick={onClose}
              className='flex-1 px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors'
            >
              Cancel
            </button>
            <button
              type='submit'
              className='flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors flex items-center justify-center space-x-2'
            >
              <Plus className='h-4 w-4' />
              <span>Add Location</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
