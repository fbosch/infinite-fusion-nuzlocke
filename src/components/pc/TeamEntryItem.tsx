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
import { useEncounters, playthroughActions } from '@/stores/playthroughs';
import { canFuse, isPokemonActive } from '@/utils/pokemonPredicates';
import { useFusionTypesFromPokemon } from '@/hooks/useFusionTypes';
import { scrollToLocationById } from '@/utils/scrollToLocation';
import { getLocationById } from '@/loaders/locations';
import type { PCEntry } from './types';
import type { PokemonOptionType } from '@/loaders/pokemon';

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
          'bg-gray-50 dark:bg-gray-900 shadow-inner hover:bg-gray-100 dark:hover:bg-gray-900':
            isEmpty,
        }
      )}
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
        <div className='flex items-start gap-4'>
          <div
            className={clsx(
              'flex flex-shrink-0 items-center justify-center rounded-lg',
              isEmpty
                ? 'bg-gray-50 dark:bg-gray-800 p-2'
                : 'bg-gray-50 dark:bg-gray-700 p-2'
            )}
          >
            {isEmpty ? (
              <div className='size-16 flex flex-col items-center justify-center text-center text-gray-400 dark:text-gray-500'>
                <Plus className='h-8 w-8 mb-1 text-gray-400 dark:text-gray-500' />
                <span className='text-xs text-gray-400 dark:text-gray-400'>
                  Add
                </span>
              </div>
            ) : (
              <FusionSprite
                ref={spriteRef}
                headPokemon={entry.head ?? null}
                bodyPokemon={entry.body ?? null}
                isFusion={isFusion}
                shouldLoad
                className='top-1.5'
                showStatusOverlay={false}
              />
            )}
          </div>
          <div className='min-w-0 flex-1 space-y-2.5'>
            <div className='flex items-center gap-2'>
              <h3 className='text-base font-semibold text-gray-900 dark:text-gray-100'>
                {isEmpty
                  ? ''
                  : getNicknameText(entry.head, entry.body, isFusion)}
              </h3>
            </div>
            {isEmpty ? (
              <div className='text-sm text-gray-400 dark:text-gray-300 font-medium'>
                Click to add a Pokémon to this slot
              </div>
            ) : (
              <>
                {/* Head Pokémon info */}
                {entry.head && (
                  <div className='flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400 min-w-0'>
                    <HeadIcon className='h-4 w-4 flex-shrink-0' />
                    <span className='truncate'>
                      {entry.head.name || 'Unknown'}
                    </span>
                    <span className='text-xs text-gray-400 dark:text-gray-500 ml-2 truncate flex-shrink-0'>
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
                    <BodyIcon className='h-4 w-4 flex-shrink-0' />
                    <span className='truncate'>
                      {entry.body.name || 'Unknown'}
                    </span>
                    <span className='text-xs text-gray-400 dark:text-gray-500 ml-2 truncate flex-shrink-0'>
                      {entry.body.originalLocation
                        ? getLocationById(entry.body.originalLocation)?.name ||
                          'Unknown Location'
                        : 'Unknown Location'}
                    </span>
                  </div>
                )}
              </>
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
          <CursorTooltip content='Move to Box' placement='top-end'>
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
          <CursorTooltip content='Move to Graveyard' placement='top-end'>
            <button
              type='button'
              className='inline-flex size-7 items-center justify-center rounded-md border border-transparent bg-transparent text-gray-400 transition-colors hover:border-gray-200/70 hover:bg-gray-100/50 hover:text-gray-600 focus:outline-none focus-visible:ring-1 focus-visible:ring-gray-500 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:bg-gray-700/40 dark:hover:border-gray-600/60 cursor-pointer'
              aria-label='Move to Graveyard'
              onClick={async e => {
                e.stopPropagation();
                await playthroughActions.markEncounterAsDeceased(
                  entry.locationId
                );
              }}
            >
              <Skull className='h-4 w-4' />
            </button>
          </CursorTooltip>
        </div>
      )}
    </li>
  );

  // Start with just TeamMemberContextMenu to isolate the issue
  if (isTeamData) {
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
