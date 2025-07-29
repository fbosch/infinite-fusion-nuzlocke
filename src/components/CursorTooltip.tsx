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
  useEffect,
  useRef,
  startTransition,
} from 'react';
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
  const isAnimatingRef = useRef(false);
  const exitAnimationRef = useRef<number | null>(null);
  const exitTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const { refs, floatingStyles, context } = useFloating({
    placement,
    open: isOpen,
    onOpenChange: setIsOpen,
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

  // Handle animation states and callbacks
  useEffect(() => {
    if (isOpen) {
      // Clear any existing exit animations when opening
      if (exitAnimationRef.current) {
        cancelAnimationFrame(exitAnimationRef.current);
        exitAnimationRef.current = null;
      }
      if (exitTimeoutRef.current) {
        clearTimeout(exitTimeoutRef.current);
        exitTimeoutRef.current = null;
      }

      // Start enter animation immediately when isOpen becomes true
      if (!isVisible) {
        startTransition(() => {
          setIsVisible(true);
          isAnimatingRef.current = true;
        });
        onMouseEnter?.();
      }
    } else {
      // Only start exit animation if we're currently visible
      if (isVisible) {
        isAnimatingRef.current = false;
        exitAnimationRef.current = requestAnimationFrame(() => {
          // Add a small delay to allow the exit animation to play
          exitTimeoutRef.current = setTimeout(() => {
            setIsVisible(false);
            exitTimeoutRef.current = null;
          }, 150); // Match the CSS animation duration
        });
        onMouseLeave?.();
      }
    }
  }, [isOpen, onMouseEnter, onMouseLeave, isVisible]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (exitAnimationRef.current) {
        cancelAnimationFrame(exitAnimationRef.current);
      }
      if (exitTimeoutRef.current) {
        clearTimeout(exitTimeoutRef.current);
      }
    };
  }, []);

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
                  isAnimatingRef.current ? 'tooltip-enter' : 'tooltip-exit'
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
