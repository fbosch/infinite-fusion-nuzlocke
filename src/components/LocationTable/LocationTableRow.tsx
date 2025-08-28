import { Row, flexRender } from '@tanstack/react-table';
import type { CombinedLocation } from '@/loaders/locations';
import { isCustomLocation } from '@/loaders/locations';
import ResetEncounterButton from './ResetEncounterButton';
import RemoveLocationButton from './customLocations/RemoveLocationButton';
import { match } from 'ts-pattern';
import { useInView } from 'react-intersection-observer';
import { useEncounter } from '@/stores/playthroughs';
import { EncounterCell } from './EncounterCell';
import PokemonSummaryCard from '../PokemonSummaryCard';
import { useRef, useEffect } from 'react';
import { addEvolutionListener } from '@/lib/events';
import type { FusionSpriteHandle } from '../PokemonSummaryCard/FusionSprite';
import { canFuse } from '@/utils/pokemonPredicates';

interface LocationTableRowProps {
  row: Row<CombinedLocation>;
}

export default function LocationTableRow({ row }: LocationTableRowProps) {
  const locationId = row.original.id;
  const { ref, inView } = useInView();
  const spriteRef = useRef<FusionSpriteHandle | null>(null);
  const previousFusionId = useRef<string | null>(null);

  const aboveTheFold = row.index < 8;
  const shouldLoad = inView || aboveTheFold;

  // Get encounter data directly - only this row will rerender when this encounter changes
  const encounterData = useEncounter(locationId) || {
    head: null,
    body: null,
    isFusion: false,
    updatedAt: Date.now(),
  };

  // Play evolution animation when this location evolves, but only if the Pokémon can form an effective fusion
  useEffect(() => {
    return addEvolutionListener(({ locationId: evolvedLocation }) => {
      if (evolvedLocation === locationId) {
        // Only play evolution animation if the Pokémon can actually fuse
        // This matches the same logic used to determine if the sprite should show
        if (
          encounterData.isFusion &&
          encounterData.head &&
          encounterData.body
        ) {
          const canActuallyFuse = canFuse(
            encounterData.head,
            encounterData.body
          );
          if (canActuallyFuse) {
            spriteRef.current?.playEvolution();
          }
        } else if (encounterData.head || encounterData.body) {
          // For single Pokémon, always play evolution animation
          spriteRef.current?.playEvolution();
        }
      }
    });
  }, [locationId]); // Only depend on locationId since the listener is static

  // Initialize the previous fusion ID on first render to prevent animation on page load
  useEffect(() => {
    if (encounterData.isFusion && encounterData.head && encounterData.body) {
      const canActuallyFuse = canFuse(encounterData.head, encounterData.body);
      if (canActuallyFuse) {
        const currentFusionId = `${encounterData.head.id}.${encounterData.body.id}`;
        if (previousFusionId.current === null) {
          // First time rendering - just set the ID without playing animation
          previousFusionId.current = currentFusionId;
        }
      }
    }
  }, [encounterData.isFusion, encounterData.head?.id, encounterData.body?.id]);

  // Play evolution animation only when the effective fusion ID changes
  useEffect(() => {
    if (encounterData.isFusion && encounterData.head && encounterData.body) {
      const canActuallyFuse = canFuse(encounterData.head, encounterData.body);
      if (canActuallyFuse) {
        // Calculate the effective fusion ID based on current state
        const currentFusionId = `${encounterData.head.id}.${encounterData.body.id}`;

        // Only play animation if this is a new fusion combination (and not the first render)
        if (
          previousFusionId.current !== null &&
          currentFusionId !== previousFusionId.current
        ) {
          previousFusionId.current = currentFusionId;
          spriteRef.current?.playEvolution();
        }
      }
    }
  }, [encounterData.isFusion, encounterData.head?.id, encounterData.body?.id]);

  return (
    <tr
      key={row.id}
      role='row'
      className='hover:bg-gray-50/60 dark:hover:bg-gray-800/60 transition-colors content-visibility-auto group/row contain-intrinsic-height-[150px]'
      ref={ref}
      data-location-id={locationId}
    >
      {row.getVisibleCells().map(cell =>
        match(cell.column.id)
          .with('sprite', () => (
            <td
              key={cell.id}
              className='p-1 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100 relative group'
              role='cell'
            >
              <PokemonSummaryCard
                ref={spriteRef}
                headPokemon={encounterData.head}
                bodyPokemon={encounterData.body}
                isFusion={encounterData.isFusion}
                shouldLoad={shouldLoad}
              />
            </td>
          ))
          .with('encounter', () => (
            <EncounterCell
              key={cell.id}
              locationId={locationId}
              shouldLoad={shouldLoad}
            />
          ))
          .with('actions', () => {
            const hasEncounter = !!(encounterData.head || encounterData.body);
            return (
              <td
                key={cell.id}
                className='p-2 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100 align-top'
                role='cell'
              >
                <div className='flex flex-col items-center justify-center gap-1 opacity-0 group-hover/row:opacity-100 transition-opacity duration-200 group-focus-within/row:opacity-100'>
                  {hasEncounter && (
                    <ResetEncounterButton
                      locationId={locationId}
                      locationName={row.original.name}
                      hasEncounter={hasEncounter}
                    />
                  )}
                  {isCustomLocation(row.original) && (
                    <RemoveLocationButton
                      locationId={locationId}
                      locationName={row.original.name}
                    />
                  )}
                </div>
              </td>
            );
          })
          .otherwise(() => (
            <td
              key={cell.id}
              className='px-4 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100'
              role='cell'
            >
              {flexRender(cell.column.columnDef.cell, cell.getContext())}
            </td>
          ))
      )}
    </tr>
  );
}
