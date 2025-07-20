'use client';

import { useState, useRef } from 'react';
import {
  useFloating,
  autoUpdate,
  offset,
  flip,
  shift,
  useHover,
  useFocus,
  useDismiss,
  useRole,
  useInteractions,
  FloatingPortal,
  arrow,
  FloatingArrow,
} from '@floating-ui/react';
import clsx from 'clsx';

export interface UseTooltipOptions {
  /** Placement of the tooltip relative to the trigger */
  placement?: 'top' | 'bottom' | 'left' | 'right';
  /** Delay before showing the tooltip (in ms) */
  delay?: number;
  /** Whether the tooltip is disabled */
  disabled?: boolean;
  /** Whether to show an arrow pointing to the trigger */
  showArrow?: boolean;
  /** Maximum width of the tooltip */
  maxWidth?: string;
}

export function useTooltip({
  placement = 'top',
  delay = 500,
  disabled = false,
  showArrow = true,
  maxWidth = '300px',
}: UseTooltipOptions = {}) {
  const [isOpen, setIsOpen] = useState(false);
  const arrowRef = useRef<SVGSVGElement>(null);

  const { refs, floatingStyles, context } = useFloating({
    open: isOpen && !disabled,
    onOpenChange: setIsOpen,
    placement,
    whileElementsMounted: autoUpdate,
    middleware: [
      offset(showArrow ? 8 : 4),
      flip(),
      shift({ padding: 4 }),
      ...(showArrow ? [arrow({ element: arrowRef })] : []),
    ],
  });

  const hover = useHover(context, {
    delay: {
      open: delay,
      close: 0,
    },
  });
  const focus = useFocus(context);
  const dismiss = useDismiss(context);
  const role = useRole(context, { role: 'tooltip' });

  const { getReferenceProps, getFloatingProps } = useInteractions([
    hover,
    focus,
    dismiss,
    role,
  ]);

  const TooltipWrapper = ({
    content,
    className,
  }: {
    content: React.ReactNode;
    className?: string;
  }) => (
    <>
      {isOpen && (
        <FloatingPortal>
          <div
            ref={refs.setFloating}
            style={{
              ...floatingStyles,
              maxWidth,
            }}
            {...getFloatingProps()}
            className={clsx(
              // Base styles
              'z-50 px-2 py-1.5 text-sm font-medium rounded-md shadow-lg',
              // Background and text colors with theme support
              'bg-gray-900 text-white',
              'dark:bg-gray-700 dark:text-gray-100',
              // Border for better visibility
              'border border-gray-700 dark:border-gray-600',
              // Animation
              'animate-in fade-in-0 zoom-in-95 duration-200',
              // Custom className
              className
            )}
          >
            {content}
            {showArrow && (
              <FloatingArrow
                ref={arrowRef}
                context={context}
                className="fill-gray-900 dark:fill-gray-700"
                strokeWidth={1}
                stroke="rgb(55 65 81)" // gray-700
              />
            )}
          </div>
        </FloatingPortal>
      )}
    </>
  );

  return {
    isOpen,
    setIsOpen,
    refs,
    floatingStyles,
    context,
    getReferenceProps,
    getFloatingProps,
    TooltipWrapper,
    arrowRef,
  };
}

export default useTooltip; 