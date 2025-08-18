import { useRef } from 'react';

interface UseAnimatedSpriteOptions {
  canAnimate: boolean;
}

export function useAnimatedSprite({ canAnimate }: UseAnimatedSpriteOptions) {
  const imageRef = useRef<HTMLImageElement>(null);
  const shadowRef = useRef<HTMLImageElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const raysSvgRef = useRef<HTMLElement | SVGElement>(null);
  const hoverRef = useRef<boolean>(false);

  const handleMouseEnter = () => {
    console.log('handleMouseEnter called, canAnimate:', canAnimate);
    hoverRef.current = true;
    if (imageRef.current && canAnimate) {
      console.log('Starting hover animation');
      // Cancel any running animations so the new one will replay
      imageRef.current.getAnimations().forEach(anim => anim.cancel());
      if (shadowRef.current) {
        shadowRef.current.getAnimations().forEach(anim => anim.cancel());
      }

      const animateSprite = () => {
        const animation = imageRef.current?.animate(
          [
            { transform: 'translateY(0px)' },
            { transform: 'translateY(-4px)' },
            { transform: 'translateY(0px)' },
          ],
          {
            duration: 400,
            easing: 'linear',
            playbackRate: 1,
            iterations: 1,
          }
        );

        shadowRef.current?.animate(
          [
            { transform: 'skewX(-5deg) skewY(-30deg) scale(1) ' },
            {
              transform:
                'skewX(-5deg) skewY(-30deg) scale(1.03) translateY(-5%)',
              blur: '0.2px',
            },
            { transform: 'skewX(-5deg) skewY(-30deg) scale(1)' },
          ],
          {
            duration: 400,
            easing: 'linear',
            playbackRate: 1,
            iterations: 1,
          }
        );

        if (animation) {
          animation.onfinish = () => {
            if (hoverRef.current) {
              window.requestAnimationFrame(animateSprite);
            }
          };
        }
      };

      window.requestAnimationFrame(animateSprite);
    }
  };

  const handleMouseLeave = () => {
    hoverRef.current = false;
    const animation = imageRef.current?.getAnimations();
    const shadowAnimation = shadowRef.current?.getAnimations();

    window.requestAnimationFrame(() => {
      if (animation) {
        animation.forEach(a => {
          if (a.playState === 'running') {
            a.updatePlaybackRate(-1);
          }
        });
      }

      if (shadowAnimation) {
        shadowAnimation.forEach(a => {
          if (a.playState === 'running') {
            a.updatePlaybackRate(-1);
          }
        });
      }
    });
  };

  const playEvolutionAnimation = () => {
    // Evolution animations should always play regardless of canAnimate state
    // Cancel any existing animations
    imageRef.current?.getAnimations().forEach(a => a.cancel());
    shadowRef.current?.getAnimations().forEach(a => a.cancel());
    overlayRef.current?.getAnimations().forEach(a => a.cancel());

    // Sprite pulsing + brightness flashes without overriding base scale/transform
    imageRef.current?.animate(
      [
        { filter: 'brightness(1) contrast(1) saturate(1)', translate: '0 0' },
        {
          filter: 'brightness(2) contrast(1.1) saturate(2)',
          translate: '0 -2px',
        },
        { filter: 'brightness(1) contrast(1) saturate(1)', translate: '0 0' },
        {
          filter: 'brightness(2.5) contrast(1.15) saturate(2.2)',
          translate: '0 -1px',
        },
        { filter: 'brightness(1) contrast(1) saturate(1)', translate: '0 0' },
      ],
      {
        duration: 600,
        easing: 'ease-in-out',
        iterations: 1,
      }
    );

    // Ground shadow subtle scale pulse
    shadowRef.current?.animate(
      [
        {
          transform: 'skewX(-5deg) skewY(-30deg) scale(1)',
          opacity: 0.12 as unknown as string,
        },
        {
          transform: 'skewX(-5deg) skewY(-30deg) scale(1.06)',
          opacity: 0.18 as unknown as string,
        },
        {
          transform: 'skewX(-5deg) skewY(-30deg) scale(1)',
          opacity: 0.12 as unknown as string,
        },
      ],
      {
        duration: 600,
        easing: 'ease-in-out',
        iterations: 1,
      }
    );

    // Particle light rays using SVG overlay
    raysSvgRef.current?.animate(
      [
        {
          opacity: 0,
          transform: 'scale(1) rotate(0deg)',
        },
        {
          opacity: 0.2,
          transform: 'scale(1) rotate(100deg)',
        },
        {
          opacity: 0.6,
          transform: 'scale(1.2) rotate(200deg)',
        },
        {
          opacity: 0.15,
          transform: 'scale(1.4) rotate(250deg)',
        },
        {
          opacity: 0,
          transform: 'scale(1.7) rotate(300deg)',
        },
      ],
      {
        duration: 650,
        easing: 'ease-out',
        iterations: 1,
      }
    );
  };

  return {
    imageRef,
    shadowRef,
    overlayRef,
    raysSvgRef,
    handleMouseEnter,
    handleMouseLeave,
    playEvolutionAnimation,
  };
}
