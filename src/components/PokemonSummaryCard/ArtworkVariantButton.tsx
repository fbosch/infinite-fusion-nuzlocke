"use client";

import clsx from "clsx";
import { Loader2, RefreshCcw, RefreshCw, RefreshCwOff } from "lucide-react";
import type React from "react";
import { twMerge } from "tailwind-merge";
import { useShiftKey } from "@/hooks/use-key-pressed";
import { usePreferredVariantState, useSpriteVariants } from "@/hooks/useSprite";
import { CursorTooltip } from "../cursor-tooltip";

interface ArtworkVariantButtonProps {
  bodyId?: number;
  className?: string;
  disabled?: boolean;
  headId?: number;
  isFusion?: boolean;
  shouldLoad?: boolean;
}

function ArtworkVariantIcon({
  hasVariants,
  isLoading,
  isShiftPressed,
}: {
  hasVariants: boolean;
  isLoading: boolean;
  isShiftPressed: boolean;
}) {
  if (isLoading) {
    return <Loader2 className="size-3 animate-spin" />;
  }
  if (!hasVariants) {
    return <RefreshCwOff className="size-3" />;
  }
  if (isShiftPressed) {
    return <RefreshCcw className="size-3" />;
  }
  return <RefreshCw className="size-3" />;
}

export function ArtworkVariantButton({
  headId,
  bodyId,
  isFusion = false,
  disabled = false,
  className,
  shouldLoad = true,
}: ArtworkVariantButtonProps) {
  const isShiftPressed = useShiftKey();

  // Determine which Pokemon IDs to use for variants and preferred state
  // When fusion is off, use the single Pokemon ID; when fusion is on, use both
  const effectiveHeadId = isFusion
    ? (headId ?? null)
    : (headId ?? bodyId ?? null);
  const effectiveBodyId = isFusion ? (bodyId ?? null) : null;

  // Use the determined Pokemon IDs for preferred variant state
  const { variant: currentVariant, updateVariant } = usePreferredVariantState(
    effectiveHeadId,
    effectiveBodyId,
  );

  // Use React Query hook for sprite variants with determined Pokemon IDs
  const { data: variants, isLoading } = useSpriteVariants(
    effectiveHeadId,
    effectiveBodyId,
    shouldLoad,
  );

  // Determine if variants are available
  const hasVariants = (variants?.length ?? 0) > 1;

  const handleCycleVariant = async (event: React.MouseEvent) => {
    // Prevent event bubbling to avoid triggering parent click handlers
    event.stopPropagation();

    if (disabled || !hasVariants || !variants) {
      return;
    }

    const currentIndex = variants.indexOf(currentVariant);
    const nextIndex = isShiftPressed
      ? (currentIndex - 1 + variants.length) % variants.length
      : (currentIndex + 1) % variants.length;

    const newVariant = variants[nextIndex] || "";

    await updateVariant(newVariant).catch((error) => {
      console.error("Failed to cycle artwork variant:", error);
    });
  };

  const label = (() => {
    if (isLoading) {
      return "Checking for artwork variants...";
    }
    if (!hasVariants) {
      return "No artwork variants available";
    }
    return "Cycle artwork variants (hold Shift to reverse)";
  })();

  // Don't render the button if there are no variants (unless still loading)
  if (!(isLoading || hasVariants)) {
    return null;
  }

  const isButtonDisabled = disabled || !hasVariants || isLoading;

  return (
    <CursorTooltip
      content={
        <div className="flex flex-col gap-1 text-sm">
          <div className="font-normal">Cycle artwork variants</div>
          <span className="text-gray-400 text-xs">Hold Shift to reverse</span>
        </div>
      }
      delay={1000}
      disabled={!hasVariants}
    >
      <button
        aria-label={label}
        className={twMerge(
          clsx(
            "opacity-0 focus:opacity-100 group-hover:opacity-50",
            "transition-opacity duration-200",
            "flex size-4 cursor-pointer items-center justify-center",
            "rounded-full text-gray-600 dark:text-white",
            "focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500",
            "enabled:hover:text-white enabled:hover:opacity-100 disabled:cursor-not-allowed",
            {
              "enabled:focus:bg-blue-400 enabled:focus:text-white enabled:hover:bg-blue-400 enabled:dark:focus:bg-blue-600 enabled:dark:hover:bg-blue-600":
                !isShiftPressed,
              "enabled:focus:bg-orange-400 enabled:hover:bg-orange-400 enabled:dark:focus:bg-orange-700 enabled:dark:hover:bg-orange-700":
                isShiftPressed,
              "group-hover:opacity-100": isLoading,
            },
          ),
          className,
        )}
        disabled={isButtonDisabled}
        onClick={handleCycleVariant}
        type="button"
      >
        <div className="">
          <ArtworkVariantIcon
            hasVariants={hasVariants}
            isLoading={isLoading}
            isShiftPressed={isShiftPressed}
          />
        </div>
      </button>
    </CursorTooltip>
  );
}
