import { flexRender, type Row } from "@tanstack/react-table";
import { ChevronDown, Dna } from "lucide-react";
import { useEffect, useRef } from "react";
import { useInView } from "react-intersection-observer";
import { match } from "ts-pattern";
import { addEvolutionListener } from "@/lib/events";
import type { CombinedLocation } from "@/loaders/locations";
import { isCustomLocation } from "@/loaders/locations";
import {
  useActivePlaythroughId,
  useEncounter,
} from "@/stores/playthroughs/hooks";
import { canFuse } from "@/utils/pokemonPredicates";
import PokemonSummaryCard from "../PokemonSummaryCard";
import type { FusionSpriteHandle } from "../PokemonSummaryCard/FusionSprite";
import RemoveLocationButton from "./customLocations/RemoveLocationButton";
import { EncounterCell } from "./EncounterCell";
import ResetEncounterButton from "./ResetEncounterButton";

interface LocationTableRowProps {
  row: Row<CombinedLocation>;
}

const EMPTY_ENCOUNTER = {
  head: null,
  body: null,
  isFusion: false,
  updatedAt: 0,
};

const DEFERRED_ENCOUNTER_INPUT_CLASS_NAME =
  "w-full cursor-pointer rounded-md border border-gray-300 bg-white px-3 py-3.5 text-sm text-gray-900 outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-white";
const DEFERRED_NICKNAME_INPUT_CLASS_NAME =
  "relative flex-1 rounded-bl-md rounded-t-none border border-r-0 border-t-0 border-gray-300 bg-white px-3 py-3.5 text-sm text-gray-900 outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-white";
const DEFERRED_STATUS_BUTTON_CLASS_NAME =
  "flex min-w-[140px] items-center justify-between rounded-br-md rounded-t-none border border-t-0 border-gray-300 bg-white px-4 py-3.5 text-sm capitalize text-gray-900 outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-gray-400";
const LOCATION_ROW_HEIGHT_PX = 150;
const LOCATION_ROW_OVERSCAN_COUNT = 4;
const LOCATION_ROW_OVERSCAN_MARGIN = `${LOCATION_ROW_HEIGHT_PX * LOCATION_ROW_OVERSCAN_COUNT}px 0px`;

function DeferredPokemonFields({
  label,
  pokemon,
}: {
  label?: string;
  pokemon: NonNullable<ReturnType<typeof useEncounter>>["head"];
}) {
  return (
    <div className="relative flex-1 min-w-0 max-w-full">
      {label && (
        <span className="absolute -top-6 left-0 text-xs text-gray-500 dark:text-gray-400">
          {label}
        </span>
      )}
      <input
        aria-hidden="true"
        className={DEFERRED_ENCOUNTER_INPUT_CLASS_NAME}
        placeholder="Select Pokémon"
        readOnly
        tabIndex={-1}
        value={pokemon?.name || ""}
      />
      <div className="flex">
        <input
          aria-hidden="true"
          className={DEFERRED_NICKNAME_INPUT_CLASS_NAME}
          placeholder="Enter nickname"
          readOnly
          tabIndex={-1}
          value={pokemon?.nickname || ""}
        />
        <button
          aria-hidden="true"
          className={DEFERRED_STATUS_BUTTON_CLASS_NAME}
          disabled
          tabIndex={-1}
          type="button"
        >
          <span>{pokemon?.status || "Status"}</span>
          <ChevronDown className="h-4 w-4 text-gray-400" />
        </button>
      </div>
    </div>
  );
}

const getEffectiveFusionId = ({
  isFusion,
  head,
  body,
}: Pick<
  NonNullable<ReturnType<typeof useEncounter>>,
  "isFusion" | "head" | "body"
>) => {
  if (!isFusion || !head || !body || !canFuse(head, body)) {
    return null;
  }

  return `${head.id}.${body.id}`;
};

export default function LocationTableRow({ row }: LocationTableRowProps) {
  const locationId = row.original.id;
  const { ref, inView } = useInView({
    rootMargin: LOCATION_ROW_OVERSCAN_MARGIN,
  });
  const spriteRef = useRef<FusionSpriteHandle | null>(null);
  const previousFusionId = useRef<string | null>(null);
  const hasInitializedFusionId = useRef(false);
  const activePlaythroughId = useActivePlaythroughId();

  const aboveTheFold = row.index < 8;
  const shouldLoad = inView || aboveTheFold;
  const visibleCells = row.getVisibleCells();

  // Get encounter data directly - only this row will rerender when this encounter changes
  const encounterData = useEncounter(locationId) || EMPTY_ENCOUNTER;

  useEffect(() => {
    previousFusionId.current = null;
    hasInitializedFusionId.current = false;
  }, [activePlaythroughId]);

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

  // Play evolution animation only when the effective fusion ID changes after initialization.
  useEffect(() => {
    const currentFusionId = getEffectiveFusionId(encounterData);

    if (!hasInitializedFusionId.current) {
      previousFusionId.current = currentFusionId;
      hasInitializedFusionId.current = true;
      return;
    }

    if (currentFusionId && currentFusionId !== previousFusionId.current) {
      spriteRef.current?.playEvolution();
    }
    previousFusionId.current = currentFusionId;
  }, [encounterData.isFusion, encounterData.head, encounterData.body]);

  return (
    <tr
      key={row.id}
      className="h-[150px] hover:bg-gray-50/60 dark:hover:bg-gray-800/60 transition-colors content-visibility-auto group/row contain-intrinsic-height-[150px]"
      ref={ref}
      data-location-id={locationId}
    >
      {visibleCells.map((cell) =>
        match(cell.column.id)
          .with("sprite", () => (
            <td
              key={cell.id}
              className="p-1 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100 relative group"
            >
              {shouldLoad && (
                <PokemonSummaryCard
                  ref={spriteRef}
                  headPokemon={encounterData.head}
                  bodyPokemon={encounterData.body}
                  isFusion={encounterData.isFusion}
                  locationId={locationId}
                  shouldLoad={shouldLoad}
                />
              )}
            </td>
          ))
          .with("encounter", () =>
            shouldLoad ? (
              <EncounterCell
                key={cell.id}
                locationId={locationId}
                shouldLoad={shouldLoad}
              />
            ) : (
              <td
                key={cell.id}
                aria-hidden="true"
                className="w-full px-4 pt-8.5 pb-4 text-sm"
              >
                <div className="pointer-events-none flex w-full flex-row justify-center gap-4">
                  {encounterData.isFusion ? (
                    <div className="flex flex-1 items-center gap-2">
                      <DeferredPokemonFields
                        label="Head"
                        pokemon={encounterData.head}
                      />
                      <DeferredPokemonFields
                        label="Body"
                        pokemon={encounterData.body}
                      />
                    </div>
                  ) : (
                    <DeferredPokemonFields pokemon={encounterData.head} />
                  )}
                  <div className="flex size-10 self-center items-center justify-center rounded-md border border-gray-300 bg-white text-gray-700 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300">
                    <Dna className="size-6" />
                  </div>
                </div>
              </td>
            ),
          )
          .with("actions", () => {
            const hasEncounter = !!(encounterData.head || encounterData.body);
            return (
              <td
                key={cell.id}
                className="p-2 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100 align-top"
              >
                <div className="flex flex-col items-center justify-center gap-1 opacity-0 group-hover/row:opacity-100 transition-opacity duration-200 group-focus-within/row:opacity-100">
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
              className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100"
            >
              {flexRender(cell.column.columnDef.cell, cell.getContext())}
            </td>
          )),
      )}
    </tr>
  );
}
