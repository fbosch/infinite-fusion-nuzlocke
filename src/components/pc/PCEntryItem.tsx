'use client';

import clsx from 'clsx';
import { CursorTooltip } from '@/components/CursorTooltip';
import { PokemonContextMenu } from '@/components/PokemonSummaryCard/PokemonContextMenu';
import { FusionSprite } from '@/components/PokemonSummaryCard/FusionSprite';
import { getNicknameText } from '@/components/PokemonSummaryCard/utils';
import { TypePills } from '@/components/TypePills';
import PokeballIcon from '@/assets/images/pokeball.svg';
import { useEncounters, playthroughActions } from '@/stores/playthroughs';
import {
  isPokemonDeceased,
  isPokemonStored,
  canFuse,
} from '@/utils/pokemonPredicates';
import { useFusionTypes } from '@/hooks/useFusionTypes';
import { scrollToLocationById } from '@/utils/scrollToLocation';
import type { PCEntry } from './types';

interface PCEntryItemProps {
  entry: PCEntry;
  idToName: Map<string, string>;
  mode: 'stored' | 'graveyard';
  hoverRingClass: string;
  fallbackLabel: string;
  className?: string;
  onClose?: () => void;
}

export default function PCEntryItem(props: PCEntryItemProps) {
  const {
    entry,
    idToName,
    mode,
    hoverRingClass,
    fallbackLabel,
    className,
    onClose,
  } = props;
  const encounters = useEncounters();
  const currentEncounter = encounters?.[entry.locationId];
  const isStoredMode = mode === 'stored';
  const headActive = isStoredMode
    ? isPokemonStored(entry.head)
    : isPokemonDeceased(entry.head);
  const bodyActive = isStoredMode
    ? isPokemonStored(entry.body)
    : isPokemonDeceased(entry.body);
  const hasAny = Boolean(headActive || bodyActive);
  const isFusion = Boolean(
    currentEncounter?.isFusion && canFuse(entry.head, entry.body)
  );
  const label = getNicknameText(entry.head, entry.body, isFusion);

  const fusionTypes = useFusionTypes(
    entry.head ? { id: entry.head.id } : undefined,
    entry.body ? { id: entry.body.id } : undefined
  );

  const handleClick = () => {
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
          'group/pc-entry relative cursor-pointer rounded-lg border border-gray-200 bg-white transition-all duration-200 hover:ring-1 dark:border-gray-700 dark:bg-gray-800',
          hoverRingClass,
          className
        )}
        onClick={handleClick}
        onKeyDown={e => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleClick();
          }
        }}
        tabIndex={0}
        aria-label={`Scroll to ${idToName.get(entry.locationId) || 'location'} in table`}
      >
        {fusionTypes.primary && (
          <div className='absolute right-2 top-2'>
            <TypePills
              primary={fusionTypes.primary}
              secondary={fusionTypes.secondary}
              showTooltip
              size='xs'
            />
          </div>
        )}
        <div className='flex items-center gap-3 p-3'>
          <div className='flex flex-shrink-0 items-center justify-center rounded-md bg-gray-50 dark:bg-gray-700'>
            {hasAny && (
              <FusionSprite
                headPokemon={entry.head ?? null}
                bodyPokemon={entry.body ?? null}
                isFusion={Boolean(
                  currentEncounter?.isFusion && canFuse(entry.head, entry.body)
                )}
                shouldLoad
                showStatusOverlay={false}
                showTooltip={false}
              />
            )}
          </div>
          <div className='min-w-0 flex-1'>
            <div className='truncate text-sm font-medium text-gray-900 dark:text-gray-100'>
              {label || fallbackLabel}
            </div>
            <div className='truncate text-xs text-gray-500 dark:text-gray-400'>
              {idToName.get(entry.locationId) || 'Unknown Location'}
            </div>
          </div>
        </div>
        {mode === 'stored' && (
          <div className='absolute bottom-2 right-2 transition-opacity md:opacity-0 md:group-hover/pc-entry:opacity-100 md:pointer-events-none md:group-hover/pc-entry:pointer-events-auto'>
            <CursorTooltip content='Move to Team' placement='top-end'>
              <button
                type='button'
                className='inline-flex size-7 items-center justify-center rounded-md border border-transparent bg-transparent text-gray-400 transition-colors hover:border-gray-200/70 hover:bg-gray-100/50 hover:text-gray-600 focus:outline-none focus-visible:ring-1 focus-visible:ring-gray-500 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:bg-gray-700/40 dark:hover:border-gray-600/60 cursor-pointer'
                aria-label='Move to Team'
                onClick={async e => {
                  e.stopPropagation();
                  await playthroughActions.markEncounterAsCaptured(
                    entry.locationId
                  );
                }}
              >
                <PokeballIcon className='h-4 w-4' />
              </button>
            </CursorTooltip>
          </div>
        )}
      </li>
    </PokemonContextMenu>
  );
}
