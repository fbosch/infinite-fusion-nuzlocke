import { Dialog, DialogPanel, DialogTitle, Button } from '@headlessui/react';
import { AlertTriangle } from 'lucide-react';
import clsx from 'clsx';

interface ConfirmationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'info';
}

export default function ConfirmationDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'danger',
}: ConfirmationDialogProps) {
  const handleConfirm = () => {
    onConfirm();
    onClose();
  };

  const variantStyles = {
    danger: {
      icon: 'text-red-600 dark:text-red-400',
      confirmButton:
        'bg-red-600 hover:bg-red-700 focus-visible:ring-red-500 text-white',
    },
    warning: {
      icon: 'text-yellow-600 dark:text-yellow-400',
      confirmButton:
        'bg-yellow-600 hover:bg-yellow-700 focus-visible:ring-yellow-500 text-white',
    },
    info: {
      icon: 'text-blue-600 dark:text-blue-400',
      confirmButton:
        'bg-blue-600 hover:bg-blue-700 focus-visible:ring-blue-500 text-white',
    },
  };

  const styles = variantStyles[variant];

  return (
    <Dialog open={isOpen} onClose={onClose} className='relative z-50'>
      {/* Backdrop */}
      <div
        className='fixed inset-0 bg-black/30 dark:bg-black/50'
        aria-hidden='true'
      />

      {/* Full-screen container to center the panel */}
      <div className='fixed inset-0 flex w-screen items-center justify-center p-4'>
        <DialogPanel className='max-w-md space-y-4 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 p-6'>
          <div className='flex items-start space-x-3'>
            <div className={clsx('flex-shrink-0', styles.icon)}>
              <AlertTriangle className='h-6 w-6' />
            </div>
            <div className='flex-1'>
              <DialogTitle className='text-lg font-semibold text-gray-900 dark:text-white'>
                {title}
              </DialogTitle>
              <p className='mt-2 text-sm text-gray-600 dark:text-gray-300'>
                {message}
              </p>
            </div>
          </div>

          <div className='flex space-x-3 justify-end pt-4'>
            <Button
              onClick={onClose}
              className={clsx(
                'px-4 py-2 text-sm font-medium rounded-md transition-colors',
                'bg-gray-100 hover:bg-gray-200 text-gray-900',
                'dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-gray-100',
                'focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-500 focus-visible:ring-offset-2'
              )}
            >
              {cancelText}
            </Button>
            <Button
              onClick={handleConfirm}
              className={clsx(
                'px-4 py-2 text-sm font-medium rounded-md transition-colors',
                'focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
                styles.confirmButton
              )}
            >
              {confirmText}
            </Button>
          </div>
        </DialogPanel>
      </div>
    </Dialog>
  );
}
