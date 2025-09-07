'use client';

import { useRef, useEffect } from 'react';
import clsx from 'clsx';
import { CursorTooltip } from '@/components/CursorTooltip';
import { TeamMemberContextMenu } from '@/components/PokemonSummaryCard/TeamMemberContextMenu';
import {
  FusionSprite,
  type FusionSpriteHandle,
} from '@/components/PokemonSummaryCard/FusionSprite';
import { TypePills } from '@/components/TypePills';
import { getNicknameText } from '@/components/PokemonSummaryCard/utils';
import HeadIcon from '@/assets/images/head.svg';
import BodyIcon from '@/assets/images/body.svg';
import { Box, Skull, Plus } from 'lucide-react';
import PokeballIcon from '@/assets/images/pokeball.svg';
import { useEncounters, playthroughActions } from '@/stores/playthroughs';
import { canFuse, isPokemonActive } from '@/utils/pokemonPredicates';
import { useFusionTypesFromPokemon } from '@/hooks/useFusionTypes';
import { scrollToLocationById } from '@/utils/scrollToLocation';
import { getLocationById } from '@/loaders/locations';
import type { PCEntry } from './types';
import type { PokemonOptionType } from '@/loaders/pokemon';
import { PokemonStatus } from '@/loaders/pokemon';
import { ArtworkVariantButton } from '@/components/PokemonSummaryCard/ArtworkVariantButton';
import { useSpriteCredits } from '@/hooks/useSprite';
import { Palette, MousePointer } from 'lucide-react';
import { getSpriteId } from '@/lib/sprites';
import { formatArtistCredits } from '@/utils/formatCredits';

interface TeamEntryItemProps {
  entry: PCEntry;
  idToName: Map<string, string>;
  onClose?: () => void;
  onTeamMemberClick?: (
    position: number,
    existingTeamMember: {
      position: number;
      isEmpty: boolean;
      headPokemon: PokemonOptionType | null;
      bodyPokemon: PokemonOptionType | null;
      isFusion: boolean;
    }
  ) => void;
}

// Component to create tooltip content for team members
function TeamMemberTooltipContent({
  headPokemon,
  bodyPokemon,
  isFusion,
}: {
  headPokemon: PokemonOptionType | null;
  bodyPokemon: PokemonOptionType | null;
  isFusion: boolean;
}) {
  const { primary, secondary } = useFusionTypesFromPokemon(
    headPokemon,
    bodyPokemon,
    isFusion
  );

  // Get sprite credits
  const tooltipSpriteId = getSpriteId(headPokemon?.id, bodyPokemon?.id);
  const { data: tooltipCredits } = useSpriteCredits(
    headPokemon?.id,
    bodyPokemon?.id,
    true
  );

  const credit =
    tooltipSpriteId == null
      ? undefined
      : (() => {
          const credits = tooltipCredits?.[tooltipSpriteId];
          return credits && Object.keys(credits).length > 0
            ? formatArtistCredits(credits)
            : undefined;
        })();

  return (
    <div className='min-w-44 max-w-[22rem]'>
      <div className='flex py-0.5'>
        <TypePills primary={primary} secondary={secondary} />
      </div>
      {credit && (
        <>
          <div className='my-2 flex'>
            <div
              className='inline-flex items-center gap-1.5 text-[11px] text-gray-700 dark:text-gray-400'
              role='tooltip'
            >
              <Palette className='h-3 w-3' aria-hidden='true' />
              <span className='opacity-80'>by</span>
              <span className='truncate max-w-[14rem]' title={credit}>
                {credit}
              </span>
            </div>
          </div>
          <div className='w-full h-px bg-gray-200 dark:bg-gray-700 my-1' />
        </>
      )}
      <div className='flex items-center text-xs gap-2'>
        <div className='flex items-center gap-1'>
          <div className='flex items-center gap-0.5 px-1 py-px bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded text-gray-700 dark:text-gray-200'>
            <MousePointer className='h-3 w-3' aria-hidden='true' />
            <span className='font-medium text-xs'>L</span>
          </div>
          <span className='text-gray-600 dark:text-gray-300 text-xs'>
            Change
          </span>
        </div>
        <div className='flex items-center gap-1'>
          <div className='flex items-center gap-0.5 px-1 py-px bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded text-gray-700 dark:text-gray-200'>
            <MousePointer className='h-3 w-3' aria-hidden='true' />
            <span className='font-medium text-xs'>R</span>
          </div>
          <span className='text-gray-600 dark:text-gray-300 text-xs'>
            Options
          </span>
        </div>
      </div>
    </div>
  );
}

export default function TeamEntryItem({
  entry,
  idToName,
  onClose,
  onTeamMemberClick,
}: TeamEntryItemProps) {
  const encounters = useEncounters();

  // Check if this is team data (has position field) or encounter data
  const isTeamData = 'position' in entry && typeof entry.position === 'number';

  const currentEncounter = isTeamData ? null : encounters?.[entry.locationId];
  const headActive = isTeamData
    ? Boolean(entry.head)
    : isPokemonActive(entry.head);
  const bodyActive = isTeamData
    ? Boolean(entry.body)
    : isPokemonActive(entry.body);
  const hasAny = Boolean(headActive || bodyActive);

  // Use entry.isFusion if available (for team data), otherwise infer from encounter
  const isFusion = isTeamData
    ? entry.isFusion || false
    : Boolean(currentEncounter?.isFusion && canFuse(entry.head, entry.body));

  // Ref for the sprite to play evolution animations
  const spriteRef = useRef<FusionSpriteHandle | null>(null);
  const previousFusionId = useRef<string | null>(null);

  // Track fusion ID changes and play evolution animations
  useEffect(() => {
    if (isFusion && entry.head && entry.body) {
      const currentFusionId = `${entry.head.id}.${entry.body.id}`;

      // Initialize previous fusion ID if not set
      if (previousFusionId.current === null) {
        previousFusionId.current = currentFusionId;
        return;
      }

      // Play animation if fusion ID changed
      if (previousFusionId.current !== currentFusionId) {
        previousFusionId.current = currentFusionId;
        spriteRef.current?.playEvolution();
      }
    } else {
      // Reset previous fusion ID for non-fusion entries
      previousFusionId.current = null;
    }
  }, [isFusion, entry.head, entry.body]);

  const { primary, secondary } = useFusionTypesFromPokemon(
    entry.head,
    entry.body,
    isFusion
  );

  // For empty slots, we still want to show them so users can add Pokémon
  const isEmpty = !hasAny;

  const handleClick = () => {
    if (isTeamData && entry.position !== undefined) {
      // For team data, open the team member picker modal
      const existingTeamMember = {
        position: entry.position,
        isEmpty: isEmpty,
        headPokemon: entry.head,
        bodyPokemon: entry.body,
        isFusion: entry.isFusion || false,
      };
      onTeamMemberClick?.(entry.position, existingTeamMember);
      return;
    }

    // For encounter data, scroll to location
    const highlightUids: string[] = [];
    if (entry.head?.uid) highlightUids.push(entry.head.uid);
    if (entry.body?.uid) highlightUids.push(entry.body.uid);

    scrollToLocationById(entry.locationId, {
      behavior: 'smooth',
      highlightUids,
      durationMs: 1200,
    });

    onClose?.();
  };

  // Create the main content that will be wrapped by context menus
  const mainContent = (
    <li
      key={entry.locationId}
      role='listitem'
      className={clsx(
        'group/pc-entry relative cursor-pointer rounded-lg transition-all duration-200',
        {
          'border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:ring-1 hover:ring-blue-400/30':
            !isEmpty,
          'bg-gray-50 dark:bg-gray-900 hover:bg-gray-100 dark:hover:bg-gray-900':
            isEmpty,
        }
      )}
      style={
        isEmpty
          ? {
              boxShadow:
                'inset 0 1px 3px rgba(0, 0, 0, 0.05), inset 0 1px 2px rgba(0, 0, 0, 0.08)',
            }
          : undefined
      }
      onClick={handleClick}
      onKeyDown={e => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleClick();
        }
      }}
      tabIndex={0}
      aria-label={
        isTeamData && entry.position !== undefined
          ? `Team slot ${entry.position + 1}`
          : `Scroll to ${idToName.get(entry.locationId) || 'location'} in table`
      }
    >
      <div className='p-4'>
        <div className='flex items-center gap-4'>
          <div className='flex flex-shrink-0 items-center justify-center rounded-lg relative group/sprite-container p-2'>
            {isEmpty ? (
              <div className='size-16 flex items-center justify-center'>
                <PokeballIcon className='h-12 w-12 text-gray-400 dark:text-gray-500 opacity-60' />
              </div>
            ) : (
              <>
                <div
                  className='w-full h-full absolute rounded-lg opacity-30 border border-gray-200 dark:border-gray-600 text-gray-300 dark:text-gray-600'
                  style={{
                    background: `repeating-linear-gradient(currentColor 0px, currentColor 2px, rgba(156, 163, 175, 0.3) 1px, rgba(156, 163, 175, 0.3) 3px)`,
                  }}
                />
                <CursorTooltip
                  delay={500}
                  content={
                    <TeamMemberTooltipContent
                      headPokemon={entry.head}
                      bodyPokemon={entry.body}
                      isFusion={isFusion}
                    />
                  }
                >
                  <div>
                    <FusionSprite
                      ref={spriteRef}
                      headPokemon={entry.head ?? null}
                      bodyPokemon={entry.body ?? null}
                      isFusion={isFusion}
                      shouldLoad
                      className='top-1.5'
                      showStatusOverlay={false}
                    />
                  </div>
                </CursorTooltip>
                <ArtworkVariantButton
                  headId={entry.head?.id}
                  bodyId={entry.body?.id}
                  isFusion={isFusion}
                  shouldLoad={!isEmpty}
                  className='absolute bottom-1 left-1 z-10 opacity-0 group-hover/sprite-container:opacity-50 focus:opacity-100 transition-opacity duration-200'
                />
              </>
            )}
          </div>
          <div className='min-w-0 flex-1'>
            {isEmpty ? (
              <div className='flex items-center h-full'>
                <button
                  type='button'
                  className='inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 border border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500 rounded-md transition-colors focus:outline-none focus:ring-1 focus:ring-gray-400 focus:ring-offset-1'
                  onClick={e => {
                    e.stopPropagation();
                    if (isTeamData && entry.position !== undefined) {
                      const existingTeamMember = {
                        position: entry.position,
                        isEmpty: true,
                        headPokemon: null,
                        bodyPokemon: null,
                        isFusion: false,
                      };
                      onTeamMemberClick?.(entry.position, existingTeamMember);
                    }
                  }}
                >
                  <Plus className='h-3 w-3' />
                  Add
                </button>
              </div>
            ) : (
              <div className='space-y-1.5'>
                <div className='flex items-center gap-2'>
                  <h3 className='text-base font-semibold text-gray-900 dark:text-gray-100'>
                    {getNicknameText(entry.head, entry.body, isFusion)}
                  </h3>
                </div>
                {/* Head Pokémon info */}
                {entry.head && (
                  <div className='flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400 min-w-0'>
                    {entry.body && (
                      <HeadIcon className='h-4 w-4 flex-shrink-0' />
                    )}
                    <span className='truncate'>
                      {entry.head.name || 'Unknown'}
                    </span>
                    <span className='text-xs text-gray-400 dark:text-gray-500 '>
                      •
                    </span>
                    <span className='text-xs text-gray-400 dark:text-gray-500 ml-0.5 truncate flex-shrink-0'>
                      {entry.head.originalLocation
                        ? getLocationById(entry.head.originalLocation)?.name ||
                          'Unknown Location'
                        : 'Unknown Location'}
                    </span>
                  </div>
                )}

                {/* Body Pokémon info */}
                {entry.body && (
                  <div className='flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400 min-w-0'>
                    {entry.head && (
                      <BodyIcon className='h-4 w-4 flex-shrink-0' />
                    )}
                    <span className='truncate'>
                      {entry.body.name || 'Unknown'}
                    </span>
                    <span className='text-xs text-gray-400 dark:text-gray-500 '>
                      •
                    </span>
                    <span className='text-xs text-gray-400 dark:text-gray-500 ml-0.5 truncate flex-shrink-0'>
                      {entry.body.originalLocation
                        ? getLocationById(entry.body.originalLocation)?.name ||
                          'Unknown Location'
                        : 'Unknown Location'}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
          {primary && (
            <div className='ml-auto'>
              <TypePills
                primary={primary}
                secondary={secondary}
                showTooltip
                size='sm'
              />
            </div>
          )}
        </div>
      </div>
      {!isEmpty && (
        <div className='absolute bottom-2 right-2 flex gap-1.5 transition-opacity md:opacity-0 md:group-hover/pc-entry:opacity-100 md:pointer-events-none md:group-hover/pc-entry:pointer-events-auto'>
          <CursorTooltip content='Move to Box' placement='top-end' delay={300}>
            <button
              type='button'
              className='inline-flex size-7 items-center justify-center rounded-md border border-transparent bg-transparent text-gray-400 transition-colors hover:border-gray-200/70 hover:bg-gray-100/50 hover:text-gray-600 focus:outline-none focus-visible:ring-1 focus-visible:ring-gray-500 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:bg-gray-700/40 dark:hover:border-gray-600/60 cursor-pointer'
              aria-label='Move to Box'
              onClick={async e => {
                e.stopPropagation();
                if (isTeamData && entry.position !== undefined) {
                  // For team members, move to box by updating status and removing from team
                  await playthroughActions.moveTeamMemberToBox(entry.position);
                } else {
                  // For encounters, use the existing encounter logic
                  await playthroughActions.moveEncounterToBox(entry.locationId);
                }
              }}
            >
              <Box className='h-4 w-4' />
            </button>
          </CursorTooltip>
          <CursorTooltip
            content='Move to Graveyard'
            delay={300}
            placement='top-end'
          >
            <button
              type='button'
              className='inline-flex size-7 items-center justify-center rounded-md border border-transparent bg-transparent text-gray-400 transition-colors hover:border-gray-200/70 hover:bg-gray-100/50 hover:text-gray-600 focus:outline-none focus-visible:ring-1 focus-visible:ring-gray-500 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:bg-gray-700/40 dark:hover:border-gray-600/60 cursor-pointer'
              aria-label='Move to Graveyard'
              onClick={async e => {
                e.stopPropagation();
                if (isTeamData && entry.position !== undefined) {
                  // For team members, mark as deceased and clear the slot
                  if (entry.head?.uid) {
                    await playthroughActions.updatePokemonByUID(
                      entry.head.uid,
                      {
                        status: PokemonStatus.DECEASED,
                      }
                    );
                  }
                  if (entry.body?.uid) {
                    await playthroughActions.updatePokemonByUID(
                      entry.body.uid,
                      {
                        status: PokemonStatus.DECEASED,
                      }
                    );
                  }
                  // Clear the team member slot
                  await playthroughActions.updateTeamMember(
                    entry.position,
                    null,
                    null
                  );
                } else {
                  // For encounters, use the existing encounter logic
                  await playthroughActions.markEncounterAsDeceased(
                    entry.locationId
                  );
                }
              }}
            >
              <Skull className='h-4 w-4' />
            </button>
          </CursorTooltip>
        </div>
      )}
    </li>
  );

  // Only wrap filled team slots with context menu
  if (isTeamData && !isEmpty) {
    return (
      <TeamMemberContextMenu
        teamMember={{
          position: entry.position || 0,
          isEmpty: isEmpty,
          headPokemon: entry.head,
          bodyPokemon: entry.body,
          isFusion: isFusion,
        }}
        shouldLoad={!isEmpty}
        onClose={onClose}
      >
        {mainContent}
      </TeamMemberContextMenu>
    );
  }

  // For encounter data, just return main content for now
  return mainContent;
}
