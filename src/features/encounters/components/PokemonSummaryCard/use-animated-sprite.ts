import { type RefObject, useLayoutEffect, useRef } from "react";

interface UseAnimatedSpriteOptions {
  canAnimate: boolean;
  reducedMotion: boolean;
}

function cancelAnimations(element: Element | null) {
  for (const animation of element?.getAnimations() ?? []) {
    animation.cancel();
  }
}

function reverseRunningAnimations(animations: Animation[] | undefined) {
  for (const animation of animations ?? []) {
    if (animation.playState === "running") {
      animation.updatePlaybackRate(-1);
    }
  }
}

function isAnimationActive(
  hoverRef: RefObject<boolean>,
  reducedMotionRef: RefObject<boolean>,
) {
  return hoverRef.current === true && reducedMotionRef.current === false;
}

export function useAnimatedSprite({
  canAnimate,
  reducedMotion,
}: UseAnimatedSpriteOptions) {
  const imageRef = useRef<HTMLImageElement>(null);
  const shadowRef = useRef<HTMLImageElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const raysSvgRef = useRef<HTMLDivElement>(null);
  const hoverRef = useRef(false);
  const reducedMotionRef = useRef(reducedMotion);

  useLayoutEffect(() => {
    reducedMotionRef.current = reducedMotion;
    if (!reducedMotion) {
      return;
    }

    hoverRef.current = false;
    for (const ref of [imageRef, shadowRef, overlayRef, raysSvgRef]) {
      cancelAnimations(ref.current);
    }
  }, [reducedMotion]);

  const handleMouseEnter = () => {
    hoverRef.current = true;
    if (canAnimate === false || reducedMotion) {
      return;
    }

    cancelAnimations(imageRef.current);
    cancelAnimations(shadowRef.current);

    const animateSprite = () => {
      if (isAnimationActive(hoverRef, reducedMotionRef) === false) {
        return;
      }

      const animation = imageRef.current?.animate(
        [
          { transform: "translateY(0px)" },
          { transform: "translateY(-4px)" },
          { transform: "translateY(0px)" },
        ],
        {
          duration: 400,
          easing: "linear",
          iterations: 1,
          playbackRate: 1,
        },
      );

      shadowRef.current?.animate(
        [
          { transform: "skewX(-5deg) skewY(-30deg) scale(1) " },
          {
            blur: "0.2px",
            transform: "skewX(-5deg) skewY(-30deg) scale(1.03) translateY(-5%)",
          },
          { transform: "skewX(-5deg) skewY(-30deg) scale(1)" },
        ],
        {
          duration: 400,
          easing: "linear",
          iterations: 1,
          playbackRate: 1,
        },
      );

      animation?.addEventListener("finish", () => {
        if (isAnimationActive(hoverRef, reducedMotionRef)) {
          window.requestAnimationFrame(animateSprite);
        }
      });
    };

    window.requestAnimationFrame(animateSprite);
  };

  const handleMouseLeave = () => {
    hoverRef.current = false;
    const animations = imageRef.current?.getAnimations();
    const shadowAnimations = shadowRef.current?.getAnimations();

    window.requestAnimationFrame(() => {
      reverseRunningAnimations(animations);
      reverseRunningAnimations(shadowAnimations);
    });
  };

  const playEvolutionAnimation = () => {
    if (reducedMotion) {
      return;
    }

    for (const element of [
      imageRef.current,
      shadowRef.current,
      overlayRef.current,
      raysSvgRef.current,
    ]) {
      cancelAnimations(element);
    }

    // Sprite pulsing + brightness flashes without overriding base scale/transform
    imageRef.current?.animate(
      [
        { filter: "brightness(1) contrast(1) saturate(1)", translate: "0 0" },
        {
          filter: "brightness(2) contrast(1.1) saturate(2)",
          translate: "0 -2px",
        },
        { filter: "brightness(1) contrast(1) saturate(1)", translate: "0 0" },
        {
          filter: "brightness(2.5) contrast(1.15) saturate(2.2)",
          translate: "0 -1px",
        },
        { filter: "brightness(1) contrast(1) saturate(1)", translate: "0 0" },
      ],
      {
        duration: 600,
        easing: "ease-in-out",
        iterations: 1,
      },
    );

    // Ground shadow subtle scale pulse
    shadowRef.current?.animate(
      [
        {
          opacity: 0.12,
          transform: "skewX(-5deg) skewY(-30deg) scale(1)",
        },
        {
          opacity: 0.18,
          transform: "skewX(-5deg) skewY(-30deg) scale(1.06)",
        },
        {
          opacity: 0.12,
          transform: "skewX(-5deg) skewY(-30deg) scale(1)",
        },
      ],
      {
        duration: 600,
        easing: "ease-in-out",
        iterations: 1,
      },
    );

    // Particle light rays using SVG overlay
    raysSvgRef.current?.animate(
      [
        {
          opacity: 0,
          transform: "scale(1) rotate(0deg)",
        },
        {
          opacity: 0.2,
          transform: "scale(1) rotate(100deg)",
        },
        {
          opacity: 0.6,
          transform: "scale(1.2) rotate(200deg)",
        },
        {
          opacity: 0.15,
          transform: "scale(1.4) rotate(250deg)",
        },
        {
          opacity: 0,
          transform: "scale(1.7) rotate(300deg)",
        },
      ],
      {
        duration: 650,
        easing: "ease-out",
        iterations: 1,
      },
    );
  };

  return {
    handleMouseEnter,
    handleMouseLeave,
    imageRef,
    overlayRef,
    playEvolutionAnimation,
    raysSvgRef,
    shadowRef,
  };
}
