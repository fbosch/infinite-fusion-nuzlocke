import { Dialog, DialogTitle, Button, DialogBackdrop } from '@headlessui/react';
import { AlertTriangle } from 'lucide-react';
import clsx from 'clsx';

interface ConfirmationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  children?: React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'info';
  showCancel?: boolean;
}

export default function ConfirmationDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  children,
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
    <Dialog open={isOpen} onClose={onClose} className='relative z-50 group'>
      <DialogBackdrop
        transition
        className='fixed inset-0 bg-black/30 dark:bg-black/50 backdrop-blur-[2px] data-closed:opacity-0 data-enter:opacity-100'
        aria-hidden='true'
      />

      <div className='fixed inset-0 flex w-screen items-center justify-center p-4'>
        <div
          className={clsx(
            children ? 'max-w-2xl' : 'max-w-md',
            'space-y-4 bg-white dark:bg-gray-800 rounded-lg shadow-modal border border-gray-200 dark:border-gray-700 p-6',
            'transform transition-all duration-200 ease-out',
            isOpen
              ? 'opacity-100 scale-100 translate-y-0'
              : 'opacity-0 scale-95 translate-y-4'
          )}
        >
          <div className='flex items-start space-x-3'>
            <div className={clsx('flex-shrink-0', styles.icon)}>
              <AlertTriangle className='h-6 w-6' />
            </div>
            <div className='flex-1'>
              <DialogTitle className='text-lg  text-gray-900 dark:text-white'>
                {title}
              </DialogTitle>
              <p className='mt-2 text-sm text-gray-600 dark:text-gray-300 break-words max-w-inherit'>
                {children || message}
              </p>
            </div>
          </div>

          <div className='flex space-x-3 justify-end pt-4'>
            <Button
              onClick={onClose}
              className={clsx(
                'px-4 py-2 text-sm  rounded-md transition-colors',
                'bg-gray-100 hover:bg-gray-200 text-gray-900',
                'dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-gray-100',
                'focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-500 focus-visible:ring-offset-2'
              )}
            >
              {cancelText}
            </Button>
            <Button
              onClick={handleConfirm}
              autoFocus
              className={clsx(
                'px-4 py-2 text-sm  rounded-md transition-colors',
                'focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
                styles.confirmButton
              )}
            >
              {confirmText}
            </Button>
          </div>
        </div>
      </div>
    </Dialog>
  );
}
