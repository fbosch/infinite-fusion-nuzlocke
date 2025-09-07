'use client';

import clsx from 'clsx';
import { PokemonContextMenu } from '@/components/PokemonSummaryCard/PokemonContextMenu';
import { FusionSprite } from '@/components/PokemonSummaryCard/FusionSprite';
import { getNicknameText } from '@/components/PokemonSummaryCard/utils';
import { TypePills } from '@/components/TypePills';
import { useEncounters } from '@/stores/playthroughs';
import {
  isPokemonDeceased,
  isPokemonStored,
  canFuse,
} from '@/utils/pokemonPredicates';
import { useFusionTypesFromPokemon } from '@/hooks/useFusionTypes';
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

  const fusionTypes = useFusionTypesFromPokemon(
    entry.head,
    entry.body,
    isFusion
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
          'group/pc-entry h-fit relative cursor-pointer rounded-lg border border-gray-200 bg-white transition-all duration-200 hover:ring-1 dark:border-gray-700 dark:bg-gray-800',
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
          <div className='flex flex-shrink-0 items-center justify-center rounded-md relative'>
            {hasAny && (
              <>
                <div
                  className='w-full h-full absolute rounded-md opacity-30 border border-gray-200 dark:border-gray-600 text-gray-300 dark:text-gray-600'
                  style={{
                    background: `repeating-linear-gradient(currentColor 0px, currentColor 2px, rgba(156, 163, 175, 0.3) 1px, rgba(156, 163, 175, 0.3) 3px)`,
                  }}
                />
                <FusionSprite
                  headPokemon={entry.head ?? null}
                  bodyPokemon={entry.body ?? null}
                  isFusion={isFusion}
                  shouldLoad
                  showStatusOverlay={false}
                />
              </>
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
      </li>
    </PokemonContextMenu>
  );
}
