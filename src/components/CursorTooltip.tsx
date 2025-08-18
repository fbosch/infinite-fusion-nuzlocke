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
import {
  useState,
  cloneElement,
  isValidElement,
  useEffect,
  useRef,
  useMemo,
} from 'react';
import { useWindowVisibility } from '@/hooks/useWindowVisibility';
import { twMerge } from 'tailwind-merge';
import { useSnapshot } from 'valtio';
import { dragStore } from '../stores/dragStore';

// Helper functions to calculate offsets based on placement
function getMainAxisOffset(placement: Placement): number {
  if (placement.startsWith('top')) return -16;
  if (placement.startsWith('bottom')) return 8;
  if (placement.startsWith('left')) return 0;
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
  const [animationState, setAnimationState] = useState<
    'entering' | 'entered' | 'exiting' | null
  >(null);
  const animationBatchRef = useRef(0);
  const animationStateRef = useRef<typeof animationState>(animationState);
  // keep a live ref of animationState for async callbacks
  if (animationStateRef.current !== animationState) {
    animationStateRef.current = animationState;
  }
  const isWindowVisible = useWindowVisibility();
  const dragSnapshot = useSnapshot(dragStore);

  const {
    refs,
    floatingStyles,
    context,
    placement: resolvedPlacement,
  } = useFloating({
    placement,
    open: isOpen,
    onOpenChange: open => {
      if (open) {
        setIsOpen(true);
        setAnimationState('entering');
      } else {
        setAnimationState('exiting');
      }

      const currentBatchId = ++animationBatchRef.current;
      // Wait for the element to mount/update, then observe running animations/transitions
      window.requestAnimationFrame(() => {
        const node = refs.floating.current as HTMLElement | null;
        if (!node) return;
        const allAnimations = node.getAnimations({ subtree: true });

        // Consider only finite animations/transitions (ignore infinite/unknown)
        const finiteAnimations = allAnimations.filter(a => {
          const effect = (a as Animation & { effect?: KeyframeEffect | null })
            .effect;
          if (!effect || typeof effect.getTiming !== 'function') return false;
          const t = effect.getTiming() as KeyframeEffectOptions & {
            duration?: number | string;
            iterations?: number;
          };
          const duration: number =
            typeof t.duration === 'number' ? (t.duration as number) : 0;
          const iterations: number =
            typeof t.iterations === 'number' ? (t.iterations as number) : 1;
          return Number.isFinite(duration) && Number.isFinite(iterations);
        });

        if (!finiteAnimations.length) {
          // No finite animations; finalize immediately
          const state = animationStateRef.current;
          if (state === 'entering') {
            setAnimationState('entered');
          } else if (state === 'exiting') {
            setIsOpen(false);
          }
          return;
        }

        Promise.allSettled(finiteAnimations.map(a => a.finished)).then(() => {
          if (animationBatchRef.current !== currentBatchId) return; // stale
          const state = animationStateRef.current;
          if (state === 'entering') {
            setAnimationState('entered');
          } else if (state === 'exiting') {
            setIsOpen(false);
          }
        });
      });
    },
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

  const clientPointFloating = useClientPoint(context, {
    axis: 'both',
  });

  const hover = useHover(context, {
    delay: { open: delay, close: 50 },
    enabled: !disabled,
    move: true,
    restMs: 16,
  });

  const focus = useFocus(context);
  const dismiss = useDismiss(context);
  const role = useRole(context);

  const { getReferenceProps, getFloatingProps } = useInteractions([
    clientPointFloating, // ensure pointer tracking is active alongside hover
    hover,
    focus,
    dismiss,
    role,
  ]);

  const originClass = useMemo(() => {
    const p = resolvedPlacement || placement;
    const [side, align] = p.split('-') as [
      'top' | 'bottom' | 'left' | 'right' | (string & {}),
      'start' | 'end' | (string & {}),
    ];

    if (side === 'top') {
      if (align === 'start') return 'origin-bottom-left';
      if (align === 'end') return 'origin-bottom-right';
      return 'origin-bottom';
    }
    if (side === 'bottom') {
      if (align === 'start') return 'origin-top-left';
      if (align === 'end') return 'origin-top-right';
      return 'origin-top';
    }
    if (side === 'left') {
      if (align === 'start') return 'origin-top-right';
      if (align === 'end') return 'origin-bottom-right';
      return 'origin-right';
    }
    if (side === 'right') {
      if (align === 'start') return 'origin-top-left';
      if (align === 'end') return 'origin-bottom-left';
      return 'origin-left';
    }
    return 'origin-center';
  }, [resolvedPlacement, placement]);

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

      {isOpen && (
        <FloatingPortal>
          <div
            className='z-110 pointer-events-none'
            ref={refs.setFloating}
            style={floatingStyles}
            {...getFloatingProps()}
          >
            <div
              className={twMerge(
                clsx(
                  'rounded-md px-3 py-2 text-sm shadow-xl/5 w-max max-w-sm dark:pixel-shadow-black-25',
                  'pointer-events-none transform-gpu bg-white/75',
                  'dark:bg-gray-700/80 background-blur dark:text-white text-gray-700',
                  'border dark:border-gray-600 border-gray-200',
                  originClass,
                  'backdrop-blur-xl',
                  'transition duration-150 ease-out',
                  {
                    'opacity-0 scale-95 tooltip-exit':
                      animationState === 'exiting',
                    'opacity-0 scale-95': animationState === 'entering',
                    'opacity-100 scale-100 tooltip-enter':
                      animationState === 'entered',
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
