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
  flip,
  shift,
  autoUpdate,
} from '@floating-ui/react';
import { clsx } from 'clsx';
import { useState, cloneElement, isValidElement } from 'react';

interface CursorTooltipProps {
  content: React.ReactNode;
  children: React.ReactElement;
  delay?: number;
  className?: string;
  disabled?: boolean;
}

export function CursorTooltip({
  content,
  children,
  delay = 500,
  className,
  disabled = false,
}: CursorTooltipProps) {
  const [isOpen, setIsOpen] = useState(false);

  const { refs, floatingStyles, context } = useFloating({
    open: isOpen,
    onOpenChange: setIsOpen,
    placement: 'top',
    middleware: [
      offset(10),
      flip({
        fallbackAxisSideDirection: 'start',
      }),
      shift({ padding: 8 }),
    ],
    whileElementsMounted: autoUpdate,
  });

  const clientPoint = useClientPoint(context, {
    enabled: isOpen,
    axis: 'both',
  });

  const hover = useHover(context, {
    move: false,
    delay: {
      open: delay,
      close: 100,
    },
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

      {isOpen && (
        <FloatingPortal>
          <div
            ref={refs.setFloating}
            style={floatingStyles}
            className={clsx(
              // Base styles
              'z-50 rounded-md px-3 py-2 text-sm font-medium shadow-lg',
              // Dark theme styles
              'bg-gray-900 text-white dark:bg-gray-700',
              // Light theme styles
              'border border-gray-200 dark:border-gray-600',
              // Animation
              'animate-in fade-in-0 zoom-in-95 duration-200',
              // Max width
              'max-w-xs break-words',
              // Custom className
              className
            )}
            {...getFloatingProps()}
          >
            {content}
          </div>
        </FloatingPortal>
      )}
    </>
  );
}
