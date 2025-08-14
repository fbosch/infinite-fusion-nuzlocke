'use client';

import clsx from 'clsx';
import { CursorTooltip } from '@/components/CursorTooltip';
import { PokemonContextMenu } from '@/components/PokemonSummaryCard/PokemonContextMenu';
import { FusionSprite } from '@/components/PokemonSummaryCard/FusionSprite';
import { TypePills } from '@/components/TypePills';
import { getNicknameText } from '@/components/PokemonSummaryCard/utils';
import HeadIcon from '@/assets/images/head.svg';
import BodyIcon from '@/assets/images/body.svg';
import { Box, Skull } from 'lucide-react';
import { useEncounters, playthroughActions } from '@/stores/playthroughs';
import { canFuse, isPokemonActive } from '@/utils/pokemonPredicates';
import { useFusionTypes } from '@/hooks/useFusionTypes';
import type { PCEntry } from './types';

interface TeamEntryItemProps {
  entry: PCEntry;
  idToName: Map<string, string>;
  isOverLimit: boolean;
  onClose?: () => void;
}

export default function TeamEntryItem({
  entry,
  idToName,
  isOverLimit,
  onClose,
}: TeamEntryItemProps) {
  const encounters = useEncounters();
  const currentEncounter = encounters?.[entry.locationId];
  const headActive = isPokemonActive(entry.head);
  const bodyActive = isPokemonActive(entry.body);
  const hasAny = Boolean(headActive || bodyActive);
  const isFusion = Boolean(
    currentEncounter?.isFusion && canFuse(entry.head, entry.body)
  );

  const fusionTypes = useFusionTypes(
    entry.head ? { id: entry.head.id } : undefined,
    isFusion && entry.body ? { id: entry.body.id } : undefined
  );
  if (!hasAny) return null;

  const handleClick = () => {
    onClose?.();
  };

  return (
    <PokemonContextMenu
      locationId={entry.locationId}
      encounterData={{
        head: entry.head,
        body: entry.body,
        isFusion: currentEncounter?.isFusion || false,
      }}
      shouldLoad={true}
    >
      <li
        key={entry.locationId}
        role='listitem'
        className={clsx(
          'group/pc-entry relative cursor-pointer rounded-lg border transition-all duration-200',
          {
            'border-red-500 bg-red-50 dark:bg-red-900/20 hover:ring-1 hover:ring-red-400/30':
              isOverLimit,
            'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:ring-1 hover:ring-blue-400/30':
              !isOverLimit,
          }
        )}
        onClick={handleClick}
        tabIndex={0}
        aria-label={`Scroll to ${idToName.get(entry.locationId) || 'location'} in table`}
      >
        <div className='p-4'>
          <div className='flex items-start gap-4'>
            <div
              className={clsx(
                'flex flex-shrink-0 items-center justify-center rounded-lg bg-gray-50 p-2 dark:bg-gray-700',
                { 'bg-red-50 dark:bg-red-900/20': isOverLimit }
              )}
            >
              <FusionSprite
                headPokemon={entry.head ?? null}
                bodyPokemon={entry.body ?? null}
                isFusion={isFusion}
                shouldLoad
                className='top-1.5'
                showStatusOverlay={false}
                showTooltip={false}
              />
            </div>
            <div className='min-w-0 flex-1 space-y-2.5'>
              <div className='flex items-center gap-2'>
                <h3 className='text-base font-semibold text-gray-900 dark:text-gray-100'>
                  {getNicknameText(entry.head, entry.body, isFusion)}
                </h3>
              </div>
              {isFusion && (
                <div className='align-center flex gap-x-3'>
                  {headActive && (
                    <div className='flex items-center gap-1 text-sm text-gray-700 dark:text-gray-400'>
                      <HeadIcon className='h-4 w-4' />
                      <span>{entry.head?.name || 'Unknown'}</span>
                    </div>
                  )}
                  {bodyActive && (
                    <div className='flex items-center gap-1 text-sm text-gray-700 dark:text-gray-400'>
                      <BodyIcon className='h-4 w-4' />
                      <span>{entry.body?.name || 'Unknown'}</span>
                    </div>
                  )}
                </div>
              )}
              <div className='text-xs text-gray-500 dark:text-gray-400'>
                {idToName.get(entry.locationId) || 'Unknown Location'}
              </div>
            </div>
            {fusionTypes.primary && (
              <div className='ml-auto'>
                <TypePills
                  primary={fusionTypes.primary}
                  secondary={fusionTypes.secondary}
                  showTooltip
                  size='sm'
                />
              </div>
            )}
          </div>
        </div>
        <div className='absolute bottom-2 right-2 flex gap-1.5 transition-opacity md:opacity-0 md:group-hover/pc-entry:opacity-100 md:pointer-events-none md:group-hover/pc-entry:pointer-events-auto'>
          <CursorTooltip content='Move to Box' placement='top-end'>
            <button
              type='button'
              className='inline-flex size-7 items-center justify-center rounded-md border border-transparent bg-transparent text-gray-400 transition-colors hover:border-gray-200/70 hover:bg-gray-100/50 hover:text-gray-600 focus:outline-none focus-visible:ring-1 focus-visible:ring-gray-500 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:bg-gray-700/40 dark:hover:border-gray-600/60 cursor-pointer'
              aria-label='Move to Box'
              onClick={async e => {
                e.stopPropagation();
                await playthroughActions.moveEncounterToBox(entry.locationId);
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
      </li>
    </PokemonContextMenu>
  );
}
