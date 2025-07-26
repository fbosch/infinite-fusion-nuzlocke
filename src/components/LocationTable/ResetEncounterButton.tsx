import clsx from 'clsx';
import { useState, useCallback, Fragment } from 'react';
import ConfirmationDialog from '../ConfirmationDialog';
import { playthroughActions } from '@/stores/playthroughs';
import { Eraser } from 'lucide-react';

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
    <Fragment>
      <button
        type='button'
        onClick={handleButtonClick}
        disabled={!hasEncounter}
        className={clsx(
          'size-8 flex items-center justify-center rounded-md transition-colors cursor-pointer',
          'focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2',
          'disabled:opacity-30 disabled:cursor-not-allowed',
          'text-gray-400 enabled:hover:text-orange-600 enabled:hover:bg-orange-50',
          'dark:text-gray-500 dark:enabled:hover:text-orange-400 dark:enabled:hover:bg-orange-900/20'
        )}
        aria-label={`Reset encounter for ${locationName}`}
        title='Reset encounter'
      >
        <Eraser className='size-4' />
      </button>

      <ConfirmationDialog
        isOpen={isDialogOpen}
        onClose={handleCancel}
        onConfirm={handleConfirm}
        title='Reset Encounter'
        message={`Are you sure you want to reset the encounter for ${locationName}?`}
        confirmText='Reset'
        cancelText='Cancel'
        variant='warning'
      />
    </Fragment>
  );
}
