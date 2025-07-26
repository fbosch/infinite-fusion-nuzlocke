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
} from '@floating-ui/react';
import { clsx } from 'clsx';
import { useState, cloneElement, isValidElement } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

interface CursorTooltipProps {
  content: React.ReactNode;
  children: React.ReactElement;
  className?: string;
  disabled?: boolean;
}

export function CursorTooltip({
  content,
  children,
  className,
  disabled = false,
}: CursorTooltipProps) {
  const [isOpen, setIsOpen] = useState(false);

  const { refs, floatingStyles, context } = useFloating({
    open: isOpen,
    onOpenChange: setIsOpen,
    placement: 'bottom-start', // Position bottom-right relative to cursor point
    middleware: [
      offset(10), // Small offset from cursor
      shift({ padding: 8 }), // Keep within viewport
    ],
    whileElementsMounted: (referenceEl, floatingEl, update) => {
      return autoUpdate(referenceEl, floatingEl, update, {
        animationFrame: true,
      });
    },
  });

  const clientPoint = useClientPoint(context, {
    enabled: true, // Always enabled to track mouse, not just when open
    axis: 'both',
  });

  const hover = useHover(context, {
    move: false,
    delay: 0, // Instant show/hide for no lag
    enabled: !disabled,
  });

  const focus = useFocus(context, {
    enabled: !disabled,
  });

  const dismiss = useDismiss(context);

  const role = useRole(context, {
    role: 'tooltip',
  });

  const { getReferenceProps, getFloatingProps } = useInteractions([
    hover,
    focus,
    dismiss,
    role,
    clientPoint,
  ]);

  if (disabled || !content) {
    return children;
  }

  return (
    <>
      {isValidElement(children) &&
        cloneElement(children, {
          ...getReferenceProps({
            ref: refs.setReference,
          }),
        })}

      <FloatingPortal>
        <AnimatePresence>
          {isOpen && (
            <div
              ref={refs.setFloating}
              style={floatingStyles}
              {...getFloatingProps()}
            >
              <motion.div
                className={clsx(
                  // Base styles
                  'z-50 rounded-md px-3 py-2 text-sm font-medium shadow-lg',
                  // Pointer events - crucial for cursor following
                  'pointer-events-none',
                  // Dark theme styles
                  'bg-gray-900 text-white dark:bg-gray-700',
                  // Light theme styles
                  'border border-gray-200 dark:border-gray-600',
                  // Max width
                  'max-w-xs break-words origin-top-left',
                  // Custom className
                  className
                )}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{
                  duration: 0.15,
                  ease: 'easeOut',
                }}
              >
                {content}
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </FloatingPortal>
    </>
  );
}
