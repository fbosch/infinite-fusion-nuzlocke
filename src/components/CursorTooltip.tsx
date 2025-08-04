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

type TooltipState = 'closed' | 'opening' | 'open' | 'closing';

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
  const [tooltipState, setTooltipState] = useState<TooltipState>('closed');
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isWindowVisible = useWindowVisibility();

  // Cleanup function to clear timeout
  const clearCurrentTimeout = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  // Handle opening the tooltip
  const handleOpen = useCallback(() => {
    clearCurrentTimeout();

    // Start with opening state (element rendered but hidden)
    setTooltipState('opening');
    onMouseEnter?.();

    // If there's a delay, wait before showing
    if (delay > 0) {
      timeoutRef.current = setTimeout(() => {
        setTooltipState('open');
        timeoutRef.current = null;
      }, delay);
    } else {
      // No delay, show immediately
      setTooltipState('open');
    }
  }, [clearCurrentTimeout, onMouseEnter, delay]);

  // Handle closing the tooltip
  const handleClose = useCallback(() => {
    clearCurrentTimeout();

    // Start closing animation
    setTooltipState('closing');

    // Wait for animation to complete, then close
    timeoutRef.current = setTimeout(() => {
      setTooltipState('closed');
      timeoutRef.current = null;
    }, 50); // Match CSS animation duration (0.05s)

    onMouseLeave?.();
  }, [clearCurrentTimeout, onMouseLeave]);

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
      clearCurrentTimeout();
    };
  }, [clearCurrentTimeout]);

  // Handle window visibility changes
  useEffect(() => {
    if (!isWindowVisible && tooltipState !== 'closed') {
      handleOpenChange(false);
    }
  }, [isWindowVisible, tooltipState, handleOpenChange]);

  const isOpen = tooltipState !== 'closed';

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
    whileElementsMounted: (reference, floating, update) => {
      const cleanup = autoUpdate(reference, floating, update, {
        layoutShift: true,
        animationFrame: true,
      });
      return cleanup;
    },
  });

  const clientPointFloating = useClientPoint(context, {
    axis: 'both',
  });

  const hover = useHover(context, {
    delay: { open: 0, close: 0 },
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

  if (!content) return children;

  return (
    <>
      {isValidElement(children) &&
        cloneElement(children, {
          ...getReferenceProps({
            ref: refs.setReference,
          }),
        })}

      {isOpen && (
        <FloatingPortal>
          <div
            className='z-110'
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
                  {
                    'opacity-0 scale-95': tooltipState === 'opening',
                    'tooltip-enter': tooltipState === 'open',
                    'tooltip-exit': tooltipState === 'closing',
                  }
                ),
                className
              )}
              style={{
                // Ensure the tooltip stays in place during animations
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
