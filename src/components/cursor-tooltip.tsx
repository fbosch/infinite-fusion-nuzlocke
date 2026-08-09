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
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { twMerge } from "tailwind-merge";
import { useSnapshot } from "valtio";
import { useGlobalTooltip } from "@/contexts/global-tooltip-context";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { useWindowVisibility } from "@/hooks/use-window-visibility";
import { settingsStore } from "@/stores/settings";
import { dragStore } from "../stores/drag-store";

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

const transformOriginClasses = {
  bottom: {
    center: "origin-top",
    end: "origin-top-right",
    start: "origin-top-left",
  },
  left: {
    center: "origin-right",
    end: "origin-bottom-right",
    start: "origin-top-right",
  },
  right: {
    center: "origin-left",
    end: "origin-bottom-left",
    start: "origin-top-left",
  },
  top: {
    center: "origin-bottom",
    end: "origin-bottom-right",
    start: "origin-bottom-left",
  },
} as const;

function getTransformOriginClass(placement: Placement): string {
  const [side, alignment = "center"] = placement.split("-");
  return (
    transformOriginClasses[side as keyof typeof transformOriginClasses]?.[
      alignment as "center" | "end" | "start"
    ] ?? "origin-center"
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function getFiniteAnimations(node: HTMLElement): Animation[] {
  return node.getAnimations({ subtree: true }).filter((animation) => {
    const { effect } = animation as Animation & {
      effect?: KeyframeEffect | null;
    };
    if (!effect || typeof effect.getTiming !== "function") {
      return false;
    }

    const timing = effect.getTiming() as KeyframeEffectOptions & {
      duration?: number | string;
      iterations?: number;
    };
    const duration = typeof timing.duration === "number" ? timing.duration : 0;
    const iterations =
      typeof timing.iterations === "number" ? timing.iterations : 1;
    return Number.isFinite(duration) && Number.isFinite(iterations);
  });
}

function useTooltipAnimation({
  instanceId,
  reducedMotion,
  shouldDisableTooltip,
  tooltipId,
}: {
  instanceId: string;
  reducedMotion: boolean;
  shouldDisableTooltip: boolean;
  tooltipId?: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [animationState, setAnimationState] = useState<
    "entering" | "entered" | "exiting" | null
  >(null);
  const animationBatchRef = useRef(0);
  const animationStateRef = useRef<typeof animationState>(animationState);
  const floatingElementRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    animationStateRef.current = animationState;
  }, [animationState]);

  const finishAnimation = useCallback(() => {
    if (animationStateRef.current === "entering") {
      setAnimationState("entered");
      return;
    }

    if (animationStateRef.current === "exiting") {
      setIsOpen(false);
    }
  }, []);
  const waitForAnimation = useCallback(() => {
    const batchId = animationBatchRef.current;
    window.requestAnimationFrame(() => {
      const node = floatingElementRef.current;
      if (node === null) {
        return;
      }

      const animations = getFiniteAnimations(node);
      if (animations.length === 0) {
        finishAnimation();
        return;
      }

      Promise.allSettled(
        animations.map((animation) => animation.finished),
      ).then(() => {
        if (animationBatchRef.current === batchId) {
          finishAnimation();
        }
      });
    });
  }, [finishAnimation]);
  const onOpenChange = useCallback(
    (open: boolean) => {
      if (shouldDisableTooltip) {
        setIsOpen(false);
        setAnimationState(null);
        return;
      }

      if (open && tooltipId) {
        window.dispatchEvent(
          new CustomEvent("cursor-tooltip-open", {
            detail: { instanceId, tooltipId },
          }),
        );
      }

      if (reducedMotion) {
        animationBatchRef.current += 1;
        setIsOpen(open);
        setAnimationState(null);
        return;
      }

      if (open) {
        setIsOpen(true);
        setAnimationState("entering");
      } else {
        setAnimationState("exiting");
      }

      animationBatchRef.current += 1;
      waitForAnimation();
    },
    [
      instanceId,
      reducedMotion,
      shouldDisableTooltip,
      tooltipId,
      waitForAnimation,
    ],
  );

  const closeImmediately = useCallback(() => {
    setIsOpen(false);
    setAnimationState(null);
  }, []);

  return {
    animationState,
    closeImmediately,
    floatingElementRef,
    isOpen,
    onOpenChange,
  };
}

function useExclusiveTooltip(
  tooltipId: string | undefined,
  instanceId: string,
  closeImmediately: () => void,
) {
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

      closeImmediately();
    };

    window.addEventListener("cursor-tooltip-open", handleTooltipOpen);
    return () => {
      window.removeEventListener("cursor-tooltip-open", handleTooltipOpen);
    };
  }, [closeImmediately, instanceId, tooltipId]);
}

function useContextMenuTooltipPause(
  closeImmediately: () => void,
  setIsPaused: (isPaused: boolean) => void,
) {
  useEffect(() => {
    const pauseTooltip = () => {
      closeImmediately();
      setIsPaused(true);
    };
    const resumeTooltip = () => setIsPaused(false);

    window.addEventListener("context-menu-open", pauseTooltip);
    window.addEventListener("context-menu-close", resumeTooltip);
    return () => {
      window.removeEventListener("context-menu-open", pauseTooltip);
      window.removeEventListener("context-menu-close", resumeTooltip);
    };
  }, [closeImmediately, setIsPaused]);
}

function useGlobalTooltipRegistration(
  isTooltipVisible: boolean,
  registerTooltip: (isVisible: boolean) => void,
) {
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
}

function useTooltipFloating({
  floatingElementRef,
  isTooltipVisible,
  onOpenChange,
  placement,
  reducedMotion,
  tooltipOffset,
}: {
  floatingElementRef: ReturnType<
    typeof useTooltipAnimation
  >["floatingElementRef"];
  isTooltipVisible: boolean;
  onOpenChange: ReturnType<typeof useTooltipAnimation>["onOpenChange"];
  placement: Placement;
  reducedMotion: boolean;
  tooltipOffset: CursorTooltipProps["offset"];
}) {
  const {
    refs,
    floatingStyles,
    context,
    placement: resolvedPlacement,
  } = useFloating({
    middleware: [
      offset({
        crossAxis: tooltipOffset?.crossAxis ?? getCrossAxisOffset(placement),
        mainAxis: tooltipOffset?.mainAxis ?? getMainAxisOffset(placement),
      }),
      shift(),
    ],
    onOpenChange,
    open: isTooltipVisible,
    placement,
    whileElementsMounted: (reference, floating, update) =>
      autoUpdate(reference, floating, update, {
        ancestorResize: true,
        ancestorScroll: true,
        animationFrame: false,
        elementResize: true,
        layoutShift: true,
      }),
  });
  const setFloatingRef = useCallback(
    (node: HTMLDivElement | null) => {
      floatingElementRef.current = node;
      refs.setFloating(node);
    },
    [floatingElementRef, refs],
  );

  useLayoutEffect(() => {
    if (!(reducedMotion && refs.domReference.current)) {
      return;
    }

    refs.setPositionReference(refs.domReference.current);
  }, [reducedMotion, refs]);

  return {
    context,
    floatingStyles,
    refs,
    resolvedPlacement,
    setFloatingRef,
  };
}

function getEffectiveDelay(
  delay: number | { close?: number; open?: number },
  delayGroupDelay: number | { close?: number; open?: number } | undefined,
  isAnyTooltipVisible: boolean,
) {
  const normalizedDelay =
    typeof delay === "number" ? { close: 50, open: delay } : delay;
  const groupDelay = delayGroupDelay ?? normalizedDelay;

  if (isAnyTooltipVisible === false) {
    return groupDelay;
  }

  return {
    close: typeof groupDelay === "number" ? 50 : groupDelay.close,
    open: 0,
  };
}

function useTooltipInteractions({
  context,
  delay,
  isAnyTooltipVisible,
  reducedMotion,
  shouldDisableTooltip,
}: {
  context: ReturnType<typeof useFloating>["context"];
  delay: number;
  isAnyTooltipVisible: boolean;
  reducedMotion: boolean;
  shouldDisableTooltip: boolean;
}) {
  const clientPointFloating = useClientPoint(context, {
    axis: "both",
    enabled: !reducedMotion,
  });
  const { delay: delayGroupDelay } = useDelayGroup(context);
  const hover = useHover(context, {
    delay: getEffectiveDelay(delay, delayGroupDelay, isAnyTooltipVisible),
    enabled: shouldDisableTooltip === false,
    move: true,
    restMs: 16,
  });
  const focus = useFocus(context);
  const dismiss = useDismiss(context);
  const role = useRole(context);

  return useInteractions([clientPointFloating, hover, focus, dismiss, role]);
}

function useTooltipState(disabled: boolean, isPausedByContextMenu: boolean) {
  const isWindowVisible = useWindowVisibility();
  const dragSnapshot = useSnapshot(dragStore);
  const settings = useSnapshot(settingsStore);
  const reducedMotion = useReducedMotion(settings.reducedMotion);
  const { isAnyTooltipVisible: tooltipVisible, registerTooltip } =
    useGlobalTooltip();

  return {
    isAnyTooltipVisible: Boolean(tooltipVisible),
    reducedMotion,
    registerTooltip,
    shouldDisableTooltip:
      disabled ||
      !isWindowVisible ||
      dragSnapshot.isDragging ||
      isPausedByContextMenu,
  };
}

interface TooltipSurfaceProps {
  animationState: "entering" | "entered" | "exiting" | null;
  className?: string;
  content: React.ReactNode;
  floatingStyles: React.CSSProperties;
  getFloatingProps: () => Record<string, unknown>;
  originClass: string;
  setFloatingRef: (node: HTMLDivElement | null) => void;
}

function TooltipSurface({
  animationState,
  className,
  content,
  floatingStyles,
  getFloatingProps,
  originClass,
  setFloatingRef,
}: TooltipSurfaceProps) {
  return (
    <FloatingPortal>
      {/* react-doctor-disable-next-line react-hooks-js/refs -- Floating UI callback refs run during commit, not render. */}
      <div
        className="pointer-events-none z-[9999]"
        ref={setFloatingRef}
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
                "tooltip-exit scale-95 opacity-0": animationState === "exiting",
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
  );
}

interface TooltipReferenceProps {
  children: React.ReactElement;
  getReferenceProps: ReturnType<typeof useInteractions>["getReferenceProps"];
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
  setReference: ReturnType<typeof useFloating>["refs"]["setReference"];
}

function TooltipReference({
  children,
  getReferenceProps,
  onMouseEnter,
  onMouseLeave,
  setReference,
}: TooltipReferenceProps) {
  if (isValidElement(children) === false) {
    return null;
  }

  return cloneElement(children, {
    ...getReferenceProps({
      ...(isRecord(children.props) ? children.props : {}),
      onMouseEnter,
      onMouseLeave,
      ref: setReference,
    }),
  });
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
  const [isPausedByContextMenu, setIsPausedByContextMenu] = useState(false);
  const {
    isAnyTooltipVisible,
    reducedMotion,
    registerTooltip,
    shouldDisableTooltip,
  } = useTooltipState(disabled, isPausedByContextMenu);
  const {
    animationState,
    closeImmediately,
    floatingElementRef,
    isOpen,
    onOpenChange,
  } = useTooltipAnimation({
    instanceId,
    reducedMotion,
    shouldDisableTooltip,
    tooltipId,
  });
  const isTooltipVisible = isOpen && shouldDisableTooltip === false;

  const { context, floatingStyles, refs, resolvedPlacement, setFloatingRef } =
    useTooltipFloating({
      floatingElementRef,
      isTooltipVisible,
      onOpenChange,
      placement,
      reducedMotion,
      tooltipOffset: props.offset,
    });

  useExclusiveTooltip(tooltipId, instanceId, closeImmediately);
  useContextMenuTooltipPause(closeImmediately, setIsPausedByContextMenu);
  useGlobalTooltipRegistration(isTooltipVisible, registerTooltip);

  const { getReferenceProps, getFloatingProps } = useTooltipInteractions({
    context,
    delay,
    isAnyTooltipVisible,
    reducedMotion,
    shouldDisableTooltip,
  });

  const originClass = getTransformOriginClass(resolvedPlacement || placement);

  if (!content) {
    return children;
  }

  return (
    <>
      <TooltipReference
        getReferenceProps={getReferenceProps}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
        setReference={refs.setReference}
      >
        {children}
      </TooltipReference>

      {isTooltipVisible ? (
        <TooltipSurface
          animationState={animationState}
          className={className}
          content={content}
          floatingStyles={floatingStyles}
          getFloatingProps={getFloatingProps}
          originClass={originClass}
          setFloatingRef={setFloatingRef}
        />
      ) : null}
    </>
  );
}
