"use client";

import Image from "next/image";
import type React from "react";
import { forwardRef, useImperativeHandle, useRef } from "react";

import { twMerge } from "tailwind-merge";
import { useSnapshot } from "valtio";
import Rays from "@/assets/images/rays.svg";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { usePreferredVariantState } from "@/hooks/useSprite";
import type { PokemonOptionType } from "@/loaders/pokemon";
import { settingsStore } from "@/stores/settings";
import { useAnimatedSprite } from "./useAnimatedSprite";
import {
  getAltText,
  getNextFallbackUrl,
  getSpriteUrl,
  getStatusState,
  TRANSPARENT_PIXEL,
} from "./utils";

export interface FusionSpriteHandle {
  playEvolution: (durationMs?: number) => void;
}

interface FusionSpriteProps {
  bodyPokemon: PokemonOptionType | null;
  className?: string;
  headPokemon: PokemonOptionType | null;
  isFusion?: boolean;
  shouldLoad?: boolean;
  showStatusOverlay?: boolean;
}

export const FusionSprite = forwardRef<FusionSpriteHandle, FusionSpriteProps>(
  function FusionSprite(
    {
      headPokemon,
      bodyPokemon,
      isFusion = false,
      shouldLoad,
      showStatusOverlay = true,
      className,
    },
    ref,
  ) {
  const hasHovered = useRef(false);
  const settings = useSnapshot(settingsStore);
  const reducedMotion = useReducedMotion(settings.reducedMotion);

  const head = headPokemon;
  const body = bodyPokemon;

  // Determine which Pokemon IDs to use for preferred variant based on fusion state
  // When fusion is off, use the single Pokemon ID; when fusion is on, use both
  const variantHeadId = isFusion
    ? (head?.id ?? null)
    : (head?.id ?? body?.id ?? null);
  const variantBodyId = isFusion ? (body?.id ?? null) : null;

  const { variant: preferredVariant } = usePreferredVariantState(
    variantHeadId,
    variantBodyId,
  );

  const handleImageError = async (
    e: React.SyntheticEvent<HTMLImageElement>,
  ) => {
    const target = e.target as HTMLImageElement;
    target.style.visibility = "hidden";
    const failingUrl = target.src;
    target.src = TRANSPARENT_PIXEL;
    const newUrl = await getNextFallbackUrl(
      failingUrl,
      head,
      body,
      preferredVariant,
    );
    if (newUrl) {
      target.src = newUrl;
    }
    window.requestAnimationFrame(() => {
      target.style.visibility = "visible";
    });
  };

  const statusState = getStatusState(head, body);
  const {
    imageRef,
    shadowRef,
    raysSvgRef,
    handleMouseEnter,
    handleMouseLeave,
    playEvolutionAnimation,
  } = useAnimatedSprite({
    canAnimate: statusState.canAnimate,
    reducedMotion,
  });

  useImperativeHandle(
    ref,
    () => ({
      playEvolution: playEvolutionAnimation,
    }),
    [playEvolutionAnimation],
  );

  if (!(head || body)) {
    return null;
  }

  const spriteUrl = getSpriteUrl(head, body, isFusion, preferredVariant);
  const altText = getAltText(head, body, isFusion);
  const baseImageClasses =
    "object-fill object-center image-render-pixelated origin-top transition-all duration-200 scale-150 select-none transform-gpu";

  const imageProps = {
    blurDataURL: TRANSPARENT_PIXEL,
    decoding: shouldLoad ? ("auto" as const) : ("async" as const),
    draggable: false,
    height: 64,
    loading: shouldLoad ? ("eager" as const) : ("lazy" as const),
    onError: handleImageError,
    placeholder: "blur" as const,
    src: spriteUrl,
    unoptimized: true,
    width: 64,
  };

  return (
    <div className="relative flex flex-col items-center">
      <div
        className={twMerge("relative flex w-full justify-center", className)}
        onMouseEnter={() => {
          if (!hasHovered.current) {
            hasHovered.current = true;
          }
          handleMouseEnter();
        }}
        onMouseLeave={handleMouseLeave}
      >
        <div
          className={twMerge(
            "relative z-10 -translate-y-6",
            statusState.wrapperClasses,
          )}
        >
          <div
            aria-hidden="true"
            className="pointer-events-none absolute top-2/3 left-1/2 size-35 -translate-x-1/2 -translate-y-1/2 bg-radial from-5% from-white/50 to-35% to-transparent opacity-0"
            ref={raysSvgRef}
          >
            <Rays className="h-full w-full text-sky-300 dark:text-white/50" />
          </div>
          <Image
            aria-hidden={true}
            className={twMerge(
              baseImageClasses,
              "absolute translate-x-[45%] translate-y-[35%] rotate-[24deg] skew-x-[-5deg] skew-y-[-30deg] scale-100 opacity-10 brightness-0 dark:opacity-15",
            )}
            ref={shadowRef}
            {...imageProps}
            alt={altText}
          />
          <Image
            className={twMerge(
              baseImageClasses,
              statusState.imageClasses,
              "rounded-md",
            )}
            ref={imageRef}
            {...imageProps}
            alt={altText}
          />
        </div>
        {showStatusOverlay && statusState.overlayContent}
      </div>
    </div>
  );
  },
);
