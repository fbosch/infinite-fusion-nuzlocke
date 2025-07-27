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
import { twMerge } from 'tailwind-merge';

interface CursorTooltipProps {
  content: React.ReactNode;
  children: React.ReactElement;
  className?: string;
  disabled?: boolean;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
}

export function CursorTooltip({
  content,
  children,
  className,
  disabled = false,
  onMouseEnter,
  onMouseLeave,
}: CursorTooltipProps) {
  const [isOpen, setIsOpen] = useState(false);

  const { refs, floatingStyles, context } = useFloating({
    open: isOpen,
    onOpenChange: open => {
      setIsOpen(open);
      // Call the external callbacks when the tooltip state changes
      if (open) {
        onMouseEnter?.();
      } else {
        onMouseLeave?.();
      }
    },
    placement: 'bottom-start', // Position bottom-right relative to cursor point
    middleware: [
      offset({ mainAxis: 20, crossAxis: 20 }),
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
        <AnimatePresence mode='wait'>
          {isOpen && (
            <div
              className='z-100'
              ref={refs.setFloating}
              style={floatingStyles}
              {...getFloatingProps()}
            >
              <motion.div
                className={twMerge(
                  clsx(
                    'rounded-md px-3 py-2 text-sm font-normalt shadow-lg w-max max-w-sm',
                    'pointer-events-none transform-gpu',
                    'bg-gray-700/50 background-blur text-white',
                    'border border-gray-600',
                    'origin-top-left backdrop-blur-md'
                  ),
                  className
                )}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{
                  duration: 0.05,
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
