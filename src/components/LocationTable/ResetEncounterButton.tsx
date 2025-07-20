import { X } from 'lucide-react';
import clsx from 'clsx';

interface ResetEncounterButtonProps {
  routeId: number;
  locationName: string;
  hasEncounter: boolean;
  onReset: (routeId: number) => void;
}

export default function ResetEncounterButton({
  routeId,
  locationName,
  hasEncounter,
  onReset,
}: ResetEncounterButtonProps) {
  return (
    <td
      className='p-1 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100 align-top'
      role='cell'
    >
    <div className='flex items-center justify-end'>
      <button
        type='button'
        onClick={() => onReset(routeId)}
        disabled={!hasEncounter}
        className={clsx(
          'size-8 flex items-center justify-center rounded-md transition-colors cursor-pointer',
          'focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2',
          'disabled:opacity-30 disabled:cursor-not-allowed',
          'text-gray-400 hover:text-red-600 hover:bg-red-50',
          'dark:text-gray-500 dark:hover:text-red-400 dark:hover:bg-red-900/20'
        )}
        aria-label={`Reset encounter for ${locationName}`}
        title='Reset encounter'
      >
        <X className='size-4' />
      </button>
</div>
    </td>
  );
} 