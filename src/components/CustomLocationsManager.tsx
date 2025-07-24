'use client';

import { useState } from 'react';
import { Plus } from 'lucide-react';
import AddCustomLocationModal from './AddCustomLocationModal';
import CustomLocationsList from './CustomLocationsList';
import { useCustomLocations } from '@/stores/playthroughs';

interface CustomLocationsManagerProps {
  className?: string;
}

export default function CustomLocationsManager({
  className = '',
}: CustomLocationsManagerProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const _customLocations = useCustomLocations();

  return (
    <div
      className={`bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-4 ${className}`}
    >
      <div className='flex items-center justify-between mb-4'>
        <h2 className='text-lg font-semibold text-gray-900 dark:text-white'>
          Custom Locations
        </h2>
        <button
          onClick={() => setIsModalOpen(true)}
          className='inline-flex items-center space-x-2 px-3 py-1.5 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors'
        >
          <Plus className='h-4 w-4' />
          <span>Add Location</span>
        </button>
      </div>

      <CustomLocationsList />

      <AddCustomLocationModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </div>
  );
}
