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
import { useState, cloneElement, isValidElement, startTransition } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { twMerge } from 'tailwind-merge';

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

  const { refs, floatingStyles, context } = useFloating({
    open: isOpen,
    onOpenChange: open => {
      startTransition(() => {
        setIsOpen(open);
      });
      // Call the external callbacks when the tooltip state changes
      if (open) {
        onMouseEnter?.();
      } else {
        onMouseLeave?.();
      }
    },
    placement: placement, // Position bottom-right relative to cursor point
    middleware: [
      offset({ mainAxis: 20, crossAxis: 20 }),

      shift({ padding: 8 }), // Keep within viewport
    ],
    whileElementsMounted: (referenceEl, floatingEl, update) => {
      return autoUpdate(referenceEl, floatingEl, update, {
        animationFrame: isOpen,
      });
    },
  });

  const clientPoint = useClientPoint(context, {
    enabled: true,
    axis: 'both',
  });

  const hover = useHover(context, {
    move: false,
    delay: isOpen ? 0 : delay,
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
                    'rounded-md px-3 py-2 text-sm shadow-xl/5 w-max max-w-sm dark:pixel-shadow-black-25',
                    'pointer-events-none transform-gpu bg-white',
                    'dark:bg-gray-700/80 background-blur dark:text-white text-gray-700',
                    'border dark:border-gray-600 border-gray-200',
                    'origin-top-left backdrop-blur-xl'
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
