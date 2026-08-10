import { flexRender, type Row } from "@tanstack/react-table";
import clsx from "clsx";
import { useEffect, useRef } from "react";
import { match } from "ts-pattern";
import { addEvolutionListener } from "@/lib/events";
import type { CombinedLocation } from "@/loaders/locations";
import { isCustomLocation } from "@/loaders/locations";
import {
  useActivePlaythroughId,
  useEncounter,
} from "@/stores/playthroughs/hooks";
import { canFuse } from "@/utils/pokemon-predicates";
import PokemonSummaryCard from "../PokemonSummaryCard";
import type { FusionSpriteHandle } from "../PokemonSummaryCard/fusion-sprite";
import RemoveLocationButton from "./customLocations/remove-location-button";
import { EncounterCell } from "./encounter-cell";
import ResetEncounterButton from "./reset-encounter-button";

interface LocationTableRowProps {
  measureElement?: (element: HTMLElement | null) => void;
  row: Row<CombinedLocation>;
  rowIndex?: number;
}

const EMPTY_ENCOUNTER = {
  body: null,
  head: null,
  isFusion: false,
  updatedAt: 0,
};

const getEffectiveFusionId = ({
  isFusion,
  head,
  body,
}: Pick<
  NonNullable<ReturnType<typeof useEncounter>>,
  "isFusion" | "head" | "body"
>) => {
  if (!(isFusion && head && body && canFuse(head, body))) {
    return null;
  }

  return `${head.id}.${body.id}`;
};

export default function LocationTableRow({
  measureElement,
  row,
  rowIndex,
}: LocationTableRowProps) {
  const locationId = row.original.id;
  const resolvedRowIndex = rowIndex ?? row.index;
  const spriteRef = useRef<FusionSpriteHandle | null>(null);
  const previousEncounter = useRef<{
    fusionId: string | null;
    playthroughId: string | null;
  } | null>(null);
  const activePlaythroughId = useActivePlaythroughId();
  const visibleCells = row.getVisibleCells();

  // Get encounter data directly - only this row will rerender when this encounter changes
  const encounterData = useEncounter(locationId) || EMPTY_ENCOUNTER;
  const effectiveFusionId = getEffectiveFusionId(encounterData);

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
            encounterData.body,
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
  }, [
    locationId,
    encounterData.isFusion,
    encounterData.head,
    encounterData.body,
  ]);

  // Play evolution animation only when the effective fusion ID changes within one playthrough.
  useEffect(() => {
    const previous = previousEncounter.current;
    if (previous === null || previous.playthroughId !== activePlaythroughId) {
      previousEncounter.current = {
        fusionId: effectiveFusionId,
        playthroughId: activePlaythroughId,
      };
      return;
    }

    if (effectiveFusionId && effectiveFusionId !== previous.fusionId) {
      spriteRef.current?.playEvolution();
    }
    previousEncounter.current = {
      fusionId: effectiveFusionId,
      playthroughId: activePlaythroughId,
    };
  }, [activePlaythroughId, effectiveFusionId]);

  return (
    <tr
      aria-rowindex={resolvedRowIndex + 2}
      className={clsx(
        "group/row transition-colors hover:bg-gray-50/60 dark:hover:bg-gray-800/60",
        encounterData.isFusion
          ? "h-[432px] sm:h-location-row"
          : "h-[200px] sm:h-location-row",
      )}
      data-location-id={locationId}
      data-index={resolvedRowIndex}
      key={row.id}
      ref={measureElement}
    >
      {visibleCells.map((cell) =>
        match(cell.column.id)
          .with("sprite", () => (
            <td
              className="group relative whitespace-nowrap p-1 text-gray-900 text-sm dark:text-gray-100"
              key={cell.id}
            >
              <PokemonSummaryCard
                bodyPokemon={encounterData.body}
                headPokemon={encounterData.head}
                isFusion={encounterData.isFusion}
                locationId={locationId}
                ref={spriteRef}
              />
            </td>
          ))
          .with("encounter", () => (
            <EncounterCell key={cell.id} locationId={locationId} />
          ))
          .with("actions", () => {
            const hasEncounter = !!(encounterData.head || encounterData.body);
            return (
              <td
                className="whitespace-nowrap p-2 align-top text-gray-900 text-sm dark:text-gray-100"
                key={cell.id}
              >
                <div className="flex flex-col items-center justify-center gap-1 opacity-100 transition-opacity duration-200 sm:opacity-0 sm:group-hover/row:opacity-100 sm:group-focus-within/row:opacity-100">
                  {hasEncounter && (
                    <ResetEncounterButton
                      hasEncounter={hasEncounter}
                      locationId={locationId}
                      locationName={row.original.name}
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
              className="whitespace-nowrap px-4 py-3 text-gray-900 text-sm dark:text-gray-100"
              key={cell.id}
            >
              {flexRender(cell.column.columnDef.cell, cell.getContext())}
            </td>
          )),
      )}
    </tr>
  );
}
