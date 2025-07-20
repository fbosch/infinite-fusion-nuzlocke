import { X } from 'lucide-react';
import clsx from 'clsx';
import { useState, useCallback } from 'react';
import ConfirmationDialog from '../ConfirmationDialog';
import { playthroughActions } from '@/stores/playthroughs';

interface ResetEncounterButtonProps {
  locationId: string;
  locationName: string;
  hasEncounter: boolean;
}

export default function ResetEncounterButton({
  locationId,
  locationName,
  hasEncounter,
}: ResetEncounterButtonProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const handleButtonClick = useCallback(() => {
    setIsDialogOpen(true);
  }, []);

  const handleConfirm = useCallback(() => {
    playthroughActions.resetEncounter(locationId);
    setIsDialogOpen(false);
  }, [locationId]);

  const handleCancel = useCallback(() => {
    setIsDialogOpen(false);
  }, []);

  return (
    <td
      className='p-2 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100 align-top'
      role='cell'
    >
      <div className='flex items-center justify-end'>
        <button
          type='button'
          onClick={handleButtonClick}
          disabled={!hasEncounter}
          className={clsx(
            'size-8 flex items-center justify-center rounded-md transition-colors cursor-pointer',
            'focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2',
            'disabled:opacity-30 disabled:cursor-not-allowed',
            'text-gray-400 enabled:hover:text-red-600 enabled:hover:bg-red-50',
            'dark:text-gray-500 dark:enabled:hover:text-red-400 dark:enabled:hover:bg-red-900/20'
          )}
          aria-label={`Reset encounter for ${locationName}`}
          title='Reset encounter'
        >
          <X className='size-4' />
        </button>
      </div>

      <ConfirmationDialog
        isOpen={isDialogOpen}
        onClose={handleCancel}
        onConfirm={handleConfirm}
        title='Reset Encounter'
        message={`Are you sure you want to reset the encounter for ${locationName}?`}
        confirmText='Reset'
        cancelText='Cancel'
        variant='danger'
      />
    </td>
  );
}
