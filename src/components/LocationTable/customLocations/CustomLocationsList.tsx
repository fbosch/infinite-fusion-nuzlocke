'use client';

import { Trash2, MapPin } from 'lucide-react';
import { playthroughActions, useCustomLocations } from '@/stores/playthroughs';
import { getLocations } from '@/loaders/locations';

interface CustomLocationsListProps {
  className?: string;
}

export default function CustomLocationsList({
  className = '',
}: CustomLocationsListProps) {
  const customLocations = useCustomLocations();
  const allLocations = getLocations();

  // Helper function to get location name from ID
  const getLocationName = (locationId: string): string => {
    const location = allLocations.find(loc => loc.id === locationId);
    return location?.name || 'Unknown Location';
  };

  const handleDelete = (locationId: string, locationName: string) => {
    if (
      confirm(
        `Are you sure you want to delete "${locationName}"? This will also remove any encounters associated with it.`
      )
    ) {
      playthroughActions.removeCustomLocation(locationId);
    }
  };

  if (customLocations.length === 0) {
    return (
      <div
        className={`text-center py-8 text-gray-500 dark:text-gray-400 ${className}`}
      >
        <MapPin className='h-12 w-12 mx-auto mb-3 opacity-50' />
        <p>No custom locations yet.</p>
        <p className='text-sm'>
          Add your first custom location to get started!
        </p>
      </div>
    );
  }

  return (
    <div className={`space-y-3 ${className}`}>
      <h3 className='text-lg  text-gray-900 dark:text-white mb-4'>
        Custom Locations ({customLocations.length})
      </h3>

      <div className='space-y-2'>
        {customLocations.map(location => (
          <div
            key={location.id}
            className='bg-gray-50 dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700 flex items-center justify-between'
          >
            <div className='flex-1 min-w-0'>
              <div className='flex items-center space-x-2 mb-1'>
                <h4 className=' text-gray-900 dark:text-white'>
                  {location.name}
                </h4>
                <span className='inline-flex items-center px-2 py-0.5 rounded text-xs  bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'>
                  Custom
                </span>
              </div>
              <div className='text-sm text-gray-600 dark:text-gray-400'>
                After: {getLocationName(location.insertAfterLocationId)}
              </div>
            </div>
            <button
              onClick={() => handleDelete(location.id, location.name)}
              className='p-2 text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors ml-3'
              aria-label={`Delete ${location.name}`}
            >
              <Trash2 className='h-4 w-4' />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
