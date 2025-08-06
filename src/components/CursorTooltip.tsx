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
  shift,
  autoUpdate,
  Placement,
  offset,
} from '@floating-ui/react';
import { clsx } from 'clsx';
import { useState, cloneElement, isValidElement, useEffect } from 'react';
import { useWindowVisibility } from '@/hooks/useWindowVisibility';
import { twMerge } from 'tailwind-merge';
import { useSnapshot } from 'valtio';
import { dragStore } from '../stores/dragStore';

// Helper functions to calculate offsets based on placement
function getMainAxisOffset(placement: Placement): number {
  if (placement.startsWith('top')) return -16;
  if (placement.startsWith('bottom')) return 8;
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
  offset?: {
    mainAxis?: number;
    crossAxis?: number;
  };
}

export function CursorTooltip(props: CursorTooltipProps) {
  const {
    content,
    children,
    className,
    delay = 0,
    disabled = false,
    placement = 'bottom-start',
    onMouseEnter,
    onMouseLeave,
  } = props;
  const [isOpen, setIsOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [animationState, setAnimationState] = useState<
    'entering' | 'entered' | 'exiting'
  >('entering');
  const isWindowVisible = useWindowVisibility();
  const dragSnapshot = useSnapshot(dragStore);

  const { refs, floatingStyles, context } = useFloating({
    placement,
    open: isOpen,
    onOpenChange: setIsOpen,
    middleware: [
      offset({
        mainAxis: props.offset?.mainAxis ?? getMainAxisOffset(placement),
        crossAxis: props.offset?.crossAxis ?? getCrossAxisOffset(placement),
      }),
      shift(),
    ],
    whileElementsMounted: (reference, floating, update) => {
      const cleanup = autoUpdate(reference, floating, update, {
        layoutShift: true,
        animationFrame: true,
        elementResize: true,
        ancestorScroll: true,
        ancestorResize: true,
      });
      return cleanup;
    },
  });

  // Handle window visibility changes - close tooltip if window becomes hidden
  useEffect(() => {
    if (isOpen) {
      if (!isWindowVisible || dragSnapshot.isDragging) {
        setIsOpen(false);
      }
    }
  }, [isWindowVisible, isOpen, dragSnapshot.isDragging]);

  // Handle animation states and mounting/unmounting
  useEffect(() => {
    if (isOpen) {
      // Mount the tooltip and start entering animation
      setIsMounted(true);
      setAnimationState('entering');
      // Force immediate position update when tooltip opens
      const timer = setTimeout(() => {
        setAnimationState('entered');
        // Force a position update after the tooltip is rendered
        if (refs.floating.current) {
          refs.floating.current.getBoundingClientRect();
        }
      }, delay || 16);
      return () => clearTimeout(timer);
    } else if (isMounted) {
      // Start exit animation
      setAnimationState('exiting');
      // Unmount after animation completes
      const timer = setTimeout(() => {
        setIsMounted(false);
      }, 100); // Allow time for exit animation
      return () => clearTimeout(timer);
    }
  }, [isOpen, isMounted, refs.floating, delay]);

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
            onMouseEnter: onMouseEnter,
            onMouseLeave: onMouseLeave,
          }),
        })}

      {isMounted && (
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
                    'opacity-0 scale-95': animationState === 'entering',
                    'tooltip-enter': animationState === 'entered',
                    'tooltip-exit': animationState === 'exiting',
                  }
                ),
                className
              )}
              style={{
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
