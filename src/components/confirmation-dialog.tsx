import { Button, Dialog, DialogBackdrop, DialogTitle } from "@headlessui/react";
import clsx from "clsx";
import { AlertTriangle } from "lucide-react";
import { useEffect, useRef } from "react";

interface ConfirmationDialogProps {
  cancelText?: string;
  children?: React.ReactNode;
  confirmText?: string;
  isOpen: boolean;
  message: string;
  onClose: () => void;
  onConfirm: () => void;
  showCancel?: boolean;
  title: string;
  variant?: "danger" | "warning" | "info";
}

export default function ConfirmationDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  children,
  confirmText = "Confirm",
  cancelText = "Cancel",
  variant = "danger",
}: ConfirmationDialogProps) {
  const confirmButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (isOpen === false) {
      return;
    }

    confirmButtonRef.current?.focus();
  }, [isOpen]);

  const handleConfirm = () => {
    onConfirm();
    onClose();
  };

  const variantStyles = {
    danger: {
      confirmButton:
        "bg-red-600 hover:bg-red-700 focus-visible:ring-red-500 text-white",
      icon: "text-red-600 dark:text-red-400",
    },
    info: {
      confirmButton:
        "bg-blue-600 hover:bg-blue-700 focus-visible:ring-blue-500 text-white",
      icon: "text-blue-600 dark:text-blue-400",
    },
    warning: {
      confirmButton:
        "bg-yellow-600 hover:bg-yellow-700 focus-visible:ring-yellow-500 text-white",
      icon: "text-yellow-600 dark:text-yellow-400",
    },
  };

  const styles = variantStyles[variant];

  return (
    <Dialog className="group relative z-[70]" onClose={onClose} open={isOpen}>
      <DialogBackdrop
        aria-hidden="true"
        className="fixed inset-0 bg-black/30 backdrop-blur-[2px] data-closed:opacity-0 data-enter:opacity-100 dark:bg-black/50"
        transition
      />

      <div className="fixed inset-0 flex w-screen items-center justify-center p-4">
        <div
          className={clsx(
            children ? "max-w-2xl" : "max-w-md",
            "space-y-4 rounded-lg border border-gray-200 bg-white p-6 shadow-modal dark:border-gray-700 dark:bg-gray-800",
            "transform transition-all duration-200 ease-out",
            isOpen
              ? "translate-y-0 scale-100 opacity-100"
              : "translate-y-4 scale-95 opacity-0",
          )}
        >
          <div className="flex items-start space-x-3">
            <div className={clsx("flex-shrink-0", styles.icon)}>
              <AlertTriangle className="h-6 w-6" />
            </div>
            <div className="flex-1">
              <DialogTitle className="text-gray-900 text-lg dark:text-white">
                {title}
              </DialogTitle>
              <p className="mt-2 max-w-inherit break-words text-gray-600 text-sm dark:text-gray-300">
                {children || message}
              </p>
            </div>
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <Button
              className={clsx(
                "rounded-md px-4 py-2 text-sm transition-colors",
                "bg-gray-100 text-gray-900 hover:bg-gray-200",
                "dark:bg-gray-700 dark:text-gray-100 dark:hover:bg-gray-600",
                "focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-500 focus-visible:ring-offset-2",
              )}
              onClick={onClose}
            >
              {cancelText}
            </Button>
            <Button
              className={clsx(
                "rounded-md px-4 py-2 text-sm transition-colors",
                "focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
                styles.confirmButton,
              )}
              onClick={handleConfirm}
              ref={confirmButtonRef}
            >
              {confirmText}
            </Button>
          </div>
        </div>
      </div>
    </Dialog>
  );
}
