import { useRef } from 'react';

interface UseAnimatedSpriteOptions {
  canAnimate: boolean;
}

export function useAnimatedSprite({ canAnimate }: UseAnimatedSpriteOptions) {
  const imageRef = useRef<HTMLImageElement>(null);
  const shadowRef = useRef<HTMLImageElement>(null);
  const hoverRef = useRef<boolean>(false);

  const handleMouseEnter = () => {
    hoverRef.current = true;
    if (imageRef.current && canAnimate) {
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

  return {
    imageRef,
    shadowRef,
    handleMouseEnter,
    handleMouseLeave,
  };
}
