import React, { Fragment, useRef } from 'react';
import { FusionSprite, type FusionSpriteHandle } from './FusionSprite';
import { PokemonContextMenu } from './PokemonContextMenu';
import { isEggId, type PokemonOptionType } from '@/loaders/pokemon';
import clsx from 'clsx';
import { ArtworkVariantButton } from './ArtworkVariantButton';
import { useSpriteCredits, usePreferredVariantState } from '@/hooks/useSprite';
import { CursorTooltip } from '@/components/CursorTooltip';
import { SquareArrowUpRight, Palette, MousePointer } from 'lucide-react';
import { getDisplayPokemon, getNicknameText } from './utils';
import { isPokemonDeceased } from '@/utils/pokemonPredicates';
import { TypePills } from '../TypePills';
import { useFusionTypesFromPokemon } from '@/hooks/useFusionTypes';
import { formatArtistCredits } from '@/utils/formatCredits';
import { getSpriteId } from '@/lib/sprites';

interface SummaryCardProps {
  headPokemon?: PokemonOptionType | null;
  bodyPokemon?: PokemonOptionType | null;
  isFusion?: boolean;
  shouldLoad?: boolean;
  nickname?: string; // Optional nickname to override the Pokémon's existing nickname
  showStatusActions?: boolean; // Whether to show status-changing actions in context menu
  ref?: React.Ref<FusionSpriteHandle>;
}

const SummaryCard = React.forwardRef<FusionSpriteHandle, SummaryCardProps>(
  (
    {
      headPokemon,
      bodyPokemon,
      isFusion = false,
      shouldLoad = true,
      nickname,
      showStatusActions = true,
    },
    ref
  ) => {
    SummaryCard.displayName = 'SummaryCard';
    const spriteRef = useRef<FusionSpriteHandle | null>(null);

    const effectiveHeadPokemon = headPokemon;
    const effectiveBodyPokemon = bodyPokemon;
    const effectiveIsFusion = isFusion;

    const eitherPokemonIsEgg =
      isEggId(effectiveHeadPokemon?.id) || isEggId(effectiveBodyPokemon?.id);

    // Determine which Pokemon to display based on active/inactive states
    const displayPokemon = getDisplayPokemon(
      effectiveHeadPokemon || null,
      effectiveBodyPokemon || null,
      effectiveIsFusion
    );

    // Preload credits for the artwork variants when they exist
    useSpriteCredits(
      displayPokemon.head?.id,
      displayPokemon.body?.id,
      shouldLoad && !eitherPokemonIsEgg
    );

    // Get sprite credits and types for tooltip (using displayPokemon values)
    const { variant: preferredVariant } = usePreferredVariantState(
      displayPokemon.head?.id ?? null,
      displayPokemon.body?.id ?? null
    );
    const tooltipSpriteId = getSpriteId(
      displayPokemon.head?.id,
      displayPokemon.body?.id
    );
    const variantSpriteId = tooltipSpriteId + (preferredVariant ?? '');
    const { data: tooltipCredits } = useSpriteCredits(
      displayPokemon.head?.id,
      displayPokemon.body?.id,
      shouldLoad && !eitherPokemonIsEgg
    );
    const { primary, secondary } = useFusionTypesFromPokemon(
      displayPokemon.head,
      displayPokemon.body,
      effectiveIsFusion
    );
    const credit = eitherPokemonIsEgg
      ? undefined
      : formatArtistCredits(tooltipCredits?.[variantSpriteId]);

    // If no Pokémon are provided and no encounter data exists, don't render
    if (!effectiveHeadPokemon && !effectiveBodyPokemon) {
      return null;
    }

    // Use the nickname prop if provided, otherwise use the Pokémon's existing nickname
    const name =
      nickname !== undefined
        ? nickname ||
          displayPokemon.head?.name ||
          displayPokemon.body?.name ||
          ''
        : getNicknameText(
            displayPokemon.head,
            displayPokemon.body,
            displayPokemon.isFusion
          );

    // Only consider deceased if both Pokemon are dead (for fusion) or the single Pokemon is dead
    // Note: boxed Pokemon are not considered deceased, only actually dead Pokemon
    const headDead = isPokemonDeceased(effectiveHeadPokemon);
    const bodyDead = isPokemonDeceased(effectiveBodyPokemon);

    const isDeceased =
      effectiveIsFusion && effectiveHeadPokemon && effectiveBodyPokemon
        ? headDead && bodyDead
        : headDead || bodyDead;

    const head = displayPokemon.head;
    const body = displayPokemon.body;

    // Determine which Pokemon IDs to use for the link based on display state
    // When fusion is off, use the single Pokemon ID; when fusion is on, use both
    const linkHeadId = displayPokemon.isFusion
      ? (displayPokemon.head?.id ?? null)
      : (displayPokemon.head?.id ?? displayPokemon.body?.id ?? null);
    const linkBodyId = displayPokemon.isFusion
      ? (displayPokemon.body?.id ?? null)
      : null;

    const link = eitherPokemonIsEgg
      ? '#'
      : `https://infinitefusiondex.com/details/${linkHeadId && linkBodyId ? `${linkHeadId}.${linkBodyId}` : linkHeadId || linkBodyId}`;

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
        locationId='preview'
        encounterData={{
          head: effectiveHeadPokemon,
          body: effectiveBodyPokemon,
          isFusion: effectiveIsFusion,
        }}
        shouldLoad={shouldLoad}
        showStatusActions={showStatusActions}
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
              <CursorTooltip
                delay={500}
                content={
                  credit ? (
                    <div className='min-w-44 max-w-[22rem]'>
                      <div className='flex py-0.5'>
                        <TypePills primary={primary} secondary={secondary} />
                      </div>
                      <div className='my-2 flex'>
                        <div className='inline-flex items-center gap-1.5 text-[11px] text-gray-700 dark:text-gray-400'>
                          <Palette className='size-3' />
                          <span className='opacity-80'>by</span>
                          <span
                            className='truncate max-w-[14rem]'
                            title={credit}
                          >
                            {credit}
                          </span>
                        </div>
                      </div>
                      <div className='w-full h-px bg-gray-200 dark:bg-gray-700 my-1' />
                      <div className='flex items-center text-xs gap-2'>
                        <div className='flex items-center gap-1'>
                          <div className='flex items-center gap-0.5 px-1 py-px bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded text-gray-700 dark:text-gray-200'>
                            <MousePointer className='size-2.5' />
                            <span className='font-medium text-xs'>L</span>
                          </div>
                          <span className='text-gray-600 dark:text-gray-300 text-xs'>
                            Pokédex
                          </span>
                        </div>
                        <div className='flex items-center gap-1'>
                          <div className='flex items-center gap-0.5 px-1 py-px bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded text-gray-700 dark:text-gray-200'>
                            <MousePointer className='size-2.5' />
                            <span className='font-medium text-xs'>R</span>
                          </div>
                          <span className='text-gray-600 dark:text-gray-300 text-xs'>
                            Options
                          </span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className='min-w-44 max-w-[22rem]'>
                      <div className='my-2 flex'>
                        <div className='inline-flex items-center gap-1.5 text-[11px] text-gray-700 dark:text-gray-400'>
                          <span className='opacity-80'>Pokémon sprite</span>
                        </div>
                      </div>
                      <div className='w-full h-px bg-gray-200 dark:bg-gray-700 my-1' />
                      <div className='flex items-center text-xs gap-2'>
                        <div className='flex items-center gap-1'>
                          <div className='flex items-center gap-0.5 px-1 py-px bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded text-gray-700 dark:text-gray-200'>
                            <span className='font-medium text-xs'>L</span>
                          </div>
                          <span className='text-gray-600 dark:text-gray-300 text-xs'>
                            Pokédex
                          </span>
                        </div>
                        <div className='flex items-center gap-1'>
                          <div className='flex items-center gap-0.5 px-1 py-px bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded text-gray-700 dark:text-gray-200'>
                            <span className='font-medium text-xs'>R</span>
                          </div>
                          <span className='text-gray-600 dark:text-gray-300 text-xs'>
                            Options
                          </span>
                        </div>
                      </div>
                    </div>
                  )
                }
              >
                <div>
                  <FusionSprite
                    ref={ref || spriteRef}
                    headPokemon={head}
                    bodyPokemon={body}
                    isFusion={effectiveIsFusion}
                    shouldLoad={shouldLoad}
                  />
                </div>
              </CursorTooltip>

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
              key={`${effectiveHeadPokemon?.id}-${effectiveBodyPokemon?.id}`}
              className='absolute bottom-0 right-1/2 -translate-x-6 z-10'
              locationId='preview'
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
);

export default SummaryCard;
