import { FusionSprite, type FusionSpriteHandle } from './FusionSprite';
import { PokemonContextMenu } from './PokemonContextMenu';
import { isEggId } from '@/loaders/pokemon';
import { Fragment, useEffect, useRef } from 'react';
import clsx from 'clsx';
import { ArtworkVariantButton } from './ArtworkVariantButton';
import { useEncounter } from '@/stores/playthroughs';
import { useSpriteCredits } from '@/hooks/useSprite';
import { CursorTooltip } from '@/components/CursorTooltip';
import { SquareArrowUpRight } from 'lucide-react';
import { getDisplayPokemon, getNicknameText } from './utils';
import { addEvolutionListener } from '@/lib/events';
import { isPokemonDeceased } from '@/utils/pokemonPredicates';

interface SummaryCardProps {
  locationId: string;
  shouldLoad?: boolean;
}

export default function SummaryCard({
  locationId,
  shouldLoad,
}: SummaryCardProps) {
  const spriteRef = useRef<FusionSpriteHandle | null>(null);
  const encounterData = useEncounter(locationId);
  const eitherPokemonIsEgg =
    isEggId(encounterData?.head?.id) || isEggId(encounterData?.body?.id);

  // Preload credits for the artwork variants when they exist
  useSpriteCredits(
    encounterData?.head?.id,
    encounterData?.body?.id,
    shouldLoad && !eitherPokemonIsEgg
  );

  // Play evolution animation when this location evolves
  useEffect(() => {
    return addEvolutionListener(({ locationId: evolvedLocation }) => {
      if (evolvedLocation === locationId) {
        spriteRef.current?.playEvolution();
      }
    });
  }, [locationId]);

  if (!encounterData?.head && !encounterData?.body) {
    return null;
  }

  // Determine which Pokemon to display based on active/inactive states
  const displayPokemon = getDisplayPokemon(
    encounterData?.head ?? null,
    encounterData?.body ?? null,
    encounterData?.isFusion ?? false
  );

  const name = getNicknameText(
    displayPokemon.head,
    displayPokemon.body,
    displayPokemon.isFusion
  );

  // Only consider deceased if both Pokemon are dead (for fusion) or the single Pokemon is dead
  // Note: stored Pokemon are not considered deceased, only actually dead Pokemon
  const headDead = isPokemonDeceased(encounterData?.head);
  const bodyDead = isPokemonDeceased(encounterData?.body);

  const isDeceased =
    encounterData?.isFusion && encounterData?.head && encounterData?.body
      ? headDead && bodyDead
      : headDead || bodyDead;

  const head = displayPokemon.head;
  const body = displayPokemon.body;
  const link = eitherPokemonIsEgg
    ? '#'
    : `https://infinitefusiondex.com/details/${head?.id && body?.id ? `${head.id}.${body.id}` : head?.id || body?.id}`;

  const SpriteWrapper = eitherPokemonIsEgg ? 'div' : 'a';
  const spriteWrapperProps = eitherPokemonIsEgg
    ? {
        className: 'group/fusion focus:outline-none',
        draggable: false,
      }
    : {
        href: link,
        target: '_blank',
        rel: 'noopener noreferrer',
        className: 'group/fusion focus:outline-none relative',
        draggable: false,
      };

  return (
    <PokemonContextMenu
      locationId={locationId}
      encounterData={encounterData}
      shouldLoad={shouldLoad}
    >
      <div className='flex flex-col items-center justify-center relative'>
        <Fragment>
          <div
            className={clsx(
              'size-22 absolute -translate-y-2 rounded-lg opacity-30 border border-gray-200 dark:border-gray-40 ',
              {
                'text-rose-200 dark:text-red-700 dark:mix-blend-color-dodge opacity-90 dark:border-red-800':
                  isDeceased,
                'dark:mix-blend-soft-light text-white': !isDeceased,
              }
            )}
            style={{
              background: `repeating-linear-gradient(currentColor 0px, currentColor 2px, rgba(154, 163, 175, 0.3) 1px, rgba(156, 163, 175, 0.3) 3px)`,
            }}
          />
          <SpriteWrapper {...spriteWrapperProps}>
            <FusionSprite
              ref={spriteRef}
              headPokemon={head}
              bodyPokemon={body}
              isFusion={displayPokemon.isFusion}
              shouldLoad={shouldLoad}
            />
            {!eitherPokemonIsEgg && (
              <CursorTooltip
                delay={1000}
                content={
                  <div className='flex flex-col gap-1'>
                    <span className='text-sm'>
                      Open Pokédex entry in new tab
                    </span>
                    <span className='text-xs text-gray-400'>{link}</span>
                  </div>
                }
              >
                <div
                  className={clsx(
                    'absolute -top-4 -right-2 text-blue-400 dark:text-blue-300 z-10 bg-gray-200 dark:bg-gray-800 rounded-sm opacity-0',
                    'group-focus-visible/fusion:opacity-100 group-hover/fusion:opacity-100 transition-opacity duration-200',
                    'group-focus-visible/fusion:ring-1 group-focus-visible/fusion:ring-blue-400'
                  )}
                >
                  <SquareArrowUpRight className='size-4' />
                </div>
              </CursorTooltip>
            )}
          </SpriteWrapper>
        </Fragment>
        {eitherPokemonIsEgg ? null : (
          <ArtworkVariantButton
            key={`${encounterData?.head?.id}-${encounterData?.body?.id} `}
            className='absolute bottom-0 right-1/2 -translate-x-6 z-10'
            locationId={locationId}
            shouldLoad={shouldLoad}
          />
        )}
        {name && (
          <div className='z-5 p-0.5 text-center absolute bottom-0 translate-y-8.5 rounded-sm'>
            <span className='text-md dark:font-normal font-ds truncate max-w-full block px-1 rounded text-gray-900 dark:text-white dark:pixel-shadow-black tracking-[0.0025em] pixel-shadow-gray-300'>
              {name}
            </span>
          </div>
        )}
      </div>
    </PokemonContextMenu>
  );
}
