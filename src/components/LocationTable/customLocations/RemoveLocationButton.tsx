import { TrashIcon } from 'lucide-react';
import clsx from 'clsx';
import { useState, useCallback } from 'react';
import ConfirmationDialog from '../ConfirmationDialog';
import { playthroughActions } from '@/stores/playthroughs';

interface RemoveLocationButtonProps {
  locationId: string;
  locationName: string;
}

export default function RemoveLocationButton({
  locationId,
  locationName,
}: RemoveLocationButtonProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const handleButtonClick = useCallback(() => {
    setIsDialogOpen(true);
  }, []);

  const handleConfirm = useCallback(() => {
    playthroughActions.removeCustomLocation(locationId);
    setIsDialogOpen(false);
  }, [locationId]);

  const handleCancel = useCallback(() => {
    setIsDialogOpen(false);
  }, []);

  return (
    <>
      <button
        type='button'
        onClick={handleButtonClick}
        className={clsx(
          'size-8 flex items-center justify-center rounded-md transition-colors cursor-pointer',
          'focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2',
          'text-gray-400 hover:text-red-600 hover:bg-red-50',
          'dark:text-gray-500 dark:hover:text-red-400 dark:hover:bg-red-900/20'
        )}
        aria-label={`Remove custom location ${locationName}`}
        title='Remove custom location'
      >
        <TrashIcon className='size-4' />
      </button>

      <ConfirmationDialog
        isOpen={isDialogOpen}
        onClose={handleCancel}
        onConfirm={handleConfirm}
        title='Remove Custom Location'
        message={`Are you sure you want to remove the custom location "${locationName}"? This action cannot be undone.`}
        confirmText='Remove'
        cancelText='Cancel'
        variant='danger'
      />
    </>
  );
}
