'use client';

import {
  useFloating,
  useClientPoint,
  useInteractions,
  useHover,
  useFocus,
  useDismiss,
  useRole,
  FloatingPortal,
  offset,
  shift,
  autoUpdate,
  Placement,
} from '@floating-ui/react';
import { clsx } from 'clsx';
import {
  useState,
  cloneElement,
  isValidElement,
  useRef,
  useEffect,
  useCallback,
} from 'react';
import { useWindowVisibility } from '@/hooks/useWindowVisibility';
import { twMerge } from 'tailwind-merge';

// Helper functions to calculate offsets based on placement
function getMainAxisOffset(placement: Placement): number {
  if (placement.startsWith('top')) return -16;
  if (placement.startsWith('bottom')) return 16;
  if (placement.startsWith('left')) return -16;
  if (placement.startsWith('right')) return 16;
  return 8; // Default fallback
}

function getCrossAxisOffset(placement: Placement): number {
  if (placement.includes('start')) return 16;
  if (placement.includes('end')) return -16;
  return 0; // Default for center alignments
}

interface CursorTooltipProps {
  content: React.ReactNode;
  children: React.ReactElement;
  className?: string;
  delay?: number;
  disabled?: boolean;
  placement?: Placement;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
}

export function CursorTooltip({
  content,
  children,
  className,
  delay = 0,
  disabled = false,
  placement = 'bottom-start',
  onMouseEnter,
  onMouseLeave,
}: CursorTooltipProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const exitTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isWindowVisible = useWindowVisibility();

  // Cleanup function to clear timeouts
  const clearExitTimeout = useCallback(() => {
    if (exitTimeoutRef.current) {
      clearTimeout(exitTimeoutRef.current);
      exitTimeoutRef.current = null;
    }
  }, []);

  // Handle opening the tooltip
  const handleOpen = useCallback(() => {
    clearExitTimeout();
    setIsVisible(true);
    setIsOpen(true);
    onMouseEnter?.();
  }, [clearExitTimeout, onMouseEnter]);

  // Handle closing the tooltip
  const handleClose = useCallback(() => {
    setIsOpen(false);

    // Start exit animation
    exitTimeoutRef.current = setTimeout(() => {
      setIsVisible(false);
      exitTimeoutRef.current = null;
    }, 150); // Match CSS animation duration

    onMouseLeave?.();
  }, [onMouseLeave]);

  // Handle open/close state changes
  const handleOpenChange = useCallback(
    (open: boolean) => {
      if (open) {
        handleOpen();
      } else {
        handleClose();
      }
    },
    [handleOpen, handleClose]
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearExitTimeout();
    };
  }, [clearExitTimeout]);

  // Handle window visibility changes
  useEffect(() => {
    if (!isWindowVisible && isOpen) {
      handleOpenChange(false);
    }
  }, [isWindowVisible, isOpen, handleOpenChange]);

  const { refs, floatingStyles, context } = useFloating({
    placement,
    open: isOpen,
    onOpenChange: handleOpenChange,
    middleware: [
      offset({
        mainAxis: getMainAxisOffset(placement),
        crossAxis: getCrossAxisOffset(placement),
      }),
      shift(),
    ],
    whileElementsMounted: autoUpdate,
  });

  const clientPointFloating = useClientPoint(context, {
    axis: 'both',
  });

  const hover = useHover(context, {
    delay: { open: delay, close: 0 },
    enabled: !disabled,
  });

  const focus = useFocus(context);
  const dismiss = useDismiss(context);
  const role = useRole(context);

  const { getReferenceProps, getFloatingProps } = useInteractions([
    hover,
    focus,
    dismiss,
    role,
    clientPointFloating,
  ]);

  return (
    <>
      {isValidElement(children) &&
        cloneElement(children, {
          ...getReferenceProps({
            ref: refs.setReference,
          }),
        })}

      {isVisible && (
        <FloatingPortal>
          <div
            className='z-100'
            ref={refs.setFloating}
            style={floatingStyles}
            {...getFloatingProps()}
          >
            <div
              className={twMerge(
                clsx(
                  'rounded-md px-3 py-2 text-sm shadow-xl/5 w-max max-w-sm dark:pixel-shadow-black-25',
                  'pointer-events-none transform-gpu bg-white',
                  'dark:bg-gray-700/80 background-blur dark:text-white text-gray-700',
                  'border dark:border-gray-600 border-gray-200',
                  'origin-top-left backdrop-blur-xl',
                  isOpen ? 'tooltip-enter' : 'tooltip-exit'
                ),
                className
              )}
              style={{
                // Ensure the tooltip stays in place during exit animation
                position: 'relative',
                zIndex: 1000,
              }}
            >
              {content}
            </div>
          </div>
        </FloatingPortal>
      )}
    </>
  );
}
