"use client";

import {
  autoUpdate,
  FloatingPortal,
  offset,
  type Placement,
  shift,
  useClientPoint,
  useDelayGroup,
  useDismiss,
  useFloating,
  useFocus,
  useHover,
  useInteractions,
  useRole,
} from "@floating-ui/react";
import { clsx } from "clsx";
import {
  cloneElement,
  isValidElement,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { twMerge } from "tailwind-merge";
import { useSnapshot } from "valtio";
import { useGlobalTooltip } from "@/contexts/GlobalTooltipContext";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { useWindowVisibility } from "@/hooks/useWindowVisibility";
import { settingsStore } from "@/stores/settings";
import { dragStore } from "../stores/dragStore";

// Helper functions to calculate offsets based on placement
function getMainAxisOffset(placement: Placement): number {
  if (placement.startsWith("top")) {
    return -16;
  }
  if (placement.startsWith("bottom")) {
    return 8;
  }
  if (placement.startsWith("left")) {
    return 0;
  }
  if (placement.startsWith("right")) {
    return 16;
  }
  return 8; // Default fallback
}

function getCrossAxisOffset(placement: Placement): number {
  if (placement.includes("start")) {
    return 16;
  }
  if (placement.includes("end")) {
    return -16;
  }
  return 0; // Default for center alignments
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

interface CursorTooltipProps {
  children: React.ReactElement;
  className?: string;
  content: React.ReactNode;
  delay?: number;
  disabled?: boolean;
  offset?: {
    mainAxis?: number;
    crossAxis?: number;
  };
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
  placement?: Placement;
  tooltipId?: string;
}

export function CursorTooltip(props: CursorTooltipProps) {
  const {
    content,
    children,
    className,
    delay = 0,
    disabled = false,
    placement = "bottom-start",
    tooltipId,
    onMouseEnter,
    onMouseLeave,
  } = props;
  const instanceId = useId();
  const [isOpen, setIsOpen] = useState(false);
  const [isPausedByContextMenu, setIsPausedByContextMenu] = useState(false);
  const [animationState, setAnimationState] = useState<
    "entering" | "entered" | "exiting" | null
  >(null);
  const animationBatchRef = useRef(0);
  const animationStateRef = useRef<typeof animationState>(animationState);
  useEffect(() => {
    animationStateRef.current = animationState;
  }, [animationState]);
  const isWindowVisible = useWindowVisibility();
  const dragSnapshot = useSnapshot(dragStore);
  const settings = useSnapshot(settingsStore);
  const reducedMotion = useReducedMotion(settings.reducedMotion);
  const { isAnyTooltipVisible, registerTooltip } = useGlobalTooltip();
  const shouldDisableTooltip =
    disabled ||
    !isWindowVisible ||
    dragSnapshot.isDragging ||
    isPausedByContextMenu;
  const isTooltipVisible = isOpen && shouldDisableTooltip === false;

  const {
    refs,
    floatingStyles,
    context,
    placement: resolvedPlacement,
  } = useFloating({
    middleware: [
      offset({
        crossAxis: props.offset?.crossAxis ?? getCrossAxisOffset(placement),
        mainAxis: props.offset?.mainAxis ?? getMainAxisOffset(placement),
      }),
      shift(),
    ],
    onOpenChange: (open) => {
      if (shouldDisableTooltip) {
        setIsOpen(false);
        setAnimationState(null);
        return;
      }

      if (open) {
        if (tooltipId) {
          window.dispatchEvent(
            new CustomEvent("cursor-tooltip-open", {
              detail: { instanceId, tooltipId },
            }),
          );
        }
        setIsOpen(true);
        if (reducedMotion) {
          animationBatchRef.current += 1;
          setAnimationState(null);
          return;
        }
        setAnimationState("entering");
      } else {
        if (reducedMotion) {
          animationBatchRef.current += 1;
          setIsOpen(false);
          setAnimationState(null);
          return;
        }
        setAnimationState("exiting");
      }

      const currentBatchId = ++animationBatchRef.current;
      // Wait for the element to mount/update, then observe running animations/transitions
      window.requestAnimationFrame(() => {
        const node = refs.floating.current as HTMLElement | null;
        if (!node) {
          return;
        }
        const allAnimations = node.getAnimations({ subtree: true });

        // Consider only finite animations/transitions (ignore infinite/unknown)
        const finiteAnimations = allAnimations.filter((a) => {
          const effect = (a as Animation & { effect?: KeyframeEffect | null })
            .effect;
          if (!effect || typeof effect.getTiming !== "function") {
            return false;
          }
          const t = effect.getTiming() as KeyframeEffectOptions & {
            duration?: number | string;
            iterations?: number;
          };
          const duration: number =
            typeof t.duration === "number" ? (t.duration as number) : 0;
          const iterations: number =
            typeof t.iterations === "number" ? (t.iterations as number) : 1;
          return Number.isFinite(duration) && Number.isFinite(iterations);
        });

        if (!finiteAnimations.length) {
          // No finite animations; finalize immediately
          const state = animationStateRef.current;
          if (state === "entering") {
            setAnimationState("entered");
          } else if (state === "exiting") {
            setIsOpen(false);
          }
          return;
        }

        Promise.allSettled(finiteAnimations.map((a) => a.finished)).then(() => {
          if (animationBatchRef.current !== currentBatchId) {
            return; // stale
          }
          const state = animationStateRef.current;
          if (state === "entering") {
            setAnimationState("entered");
          } else if (state === "exiting") {
            setIsOpen(false);
          }
        });
      });
    },
    open: isTooltipVisible,
    placement,
    whileElementsMounted: (reference, floating, update) => {
      const cleanup = autoUpdate(reference, floating, update, {
        ancestorResize: true,
        ancestorScroll: true,
        animationFrame: false,
        elementResize: true,
        layoutShift: true,
      });
      return cleanup;
    },
  });

  useLayoutEffect(() => {
    if (!(reducedMotion && refs.domReference.current)) {
      return;
    }

    refs.setPositionReference(refs.domReference.current);
  }, [reducedMotion, refs]);

  useEffect(() => {
    if (!tooltipId) {
      return;
    }

    const handleTooltipOpen = (event: Event) => {
      const detail = (event as CustomEvent).detail as
        | { tooltipId?: string; instanceId?: string }
        | undefined;
      if (detail?.tooltipId !== tooltipId || detail.instanceId === instanceId) {
        return;
      }

      setIsOpen(false);
      setAnimationState(null);
    };

    window.addEventListener("cursor-tooltip-open", handleTooltipOpen);
    return () => {
      window.removeEventListener("cursor-tooltip-open", handleTooltipOpen);
    };
  }, [instanceId, tooltipId]);

  useEffect(() => {
    const pauseTooltip = () => {
      setIsOpen(false);
      setAnimationState(null);
      setIsPausedByContextMenu(true);
    };
    const resumeTooltip = () => setIsPausedByContextMenu(false);

    window.addEventListener("context-menu-open", pauseTooltip);
    window.addEventListener("context-menu-close", resumeTooltip);
    return () => {
      window.removeEventListener("context-menu-open", pauseTooltip);
      window.removeEventListener("context-menu-close", resumeTooltip);
    };
  }, []);

  // Register tooltip with global state when it opens/closes
  useEffect(() => {
    if (isTooltipVisible) {
      registerTooltip(true);
    }

    return () => {
      if (isTooltipVisible) {
        registerTooltip(false);
      }
    };
  }, [isTooltipVisible, registerTooltip]);

  const clientPointFloating = useClientPoint(context, {
    axis: "both",
    enabled: !reducedMotion,
  });

  // Normalize delay to object format
  const normalizedDelay =
    typeof delay === "number" ? { close: 50, open: delay } : delay;

  // Use delay group context if available, otherwise use the provided delay
  const { delay: delayGroupDelay } = useDelayGroup(context);
  const groupDelay = delayGroupDelay ?? normalizedDelay;

  // If any tooltip is visible globally, skip the open delay
  const effectiveDelay = isAnyTooltipVisible
    ? { close: typeof groupDelay === "number" ? 50 : groupDelay.close, open: 0 }
    : groupDelay;

  const hover = useHover(context, {
    delay: effectiveDelay,
    enabled: shouldDisableTooltip === false,
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
    const [side, align] = p.split("-") as [
      "top" | "bottom" | "left" | "right" | (string & {}),
      "start" | "end" | (string & {}),
    ];

    if (side === "top") {
      if (align === "start") {
        return "origin-bottom-left";
      }
      if (align === "end") {
        return "origin-bottom-right";
      }
      return "origin-bottom";
    }
    if (side === "bottom") {
      if (align === "start") {
        return "origin-top-left";
      }
      if (align === "end") {
        return "origin-top-right";
      }
      return "origin-top";
    }
    if (side === "left") {
      if (align === "start") {
        return "origin-top-right";
      }
      if (align === "end") {
        return "origin-bottom-right";
      }
      return "origin-right";
    }
    if (side === "right") {
      if (align === "start") {
        return "origin-top-left";
      }
      if (align === "end") {
        return "origin-bottom-left";
      }
      return "origin-left";
    }
    return "origin-center";
  }, [resolvedPlacement, placement]);

  if (!content) {
    return children;
  }

  return (
    <>
      {isValidElement(children) &&
        cloneElement(children, {
          ...getReferenceProps({
            ...(isRecord(children.props) ? children.props : {}),
            onMouseEnter,
            onMouseLeave,
            ref: refs.setReference,
          }),
        })}

      {isTooltipVisible && (
        <FloatingPortal>
          {/* react-doctor-disable-next-line react-hooks-js/refs -- Floating UI callback refs run during commit, not render. */}
          <div
            className="pointer-events-none z-[9999]"
            ref={refs.setFloating}
            style={floatingStyles}
            {...getFloatingProps()}
          >
            <div
              className={twMerge(
                clsx(
                  "dark:pixel-shadow-black-25 w-max max-w-sm rounded-md px-3 py-2 text-sm shadow-elevation-4",
                  "pointer-events-none transform-gpu bg-white/75",
                  "background-blur text-gray-700 dark:bg-gray-700/80 dark:text-white",
                  "border border-gray-200 dark:border-gray-600",
                  originClass,
                  "backdrop-blur-xl",
                  "transition duration-150 ease-out",
                  {
                    "scale-95 opacity-0": animationState === "entering",
                    "tooltip-enter scale-100 opacity-100":
                      animationState === "entered",
                    "tooltip-exit scale-95 opacity-0":
                      animationState === "exiting",
                  },
                ),
                className,
              )}
              style={{
                position: "relative",
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
