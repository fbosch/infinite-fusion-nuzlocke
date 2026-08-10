"use client";

import {
  Dialog,
  DialogBackdrop,
  DialogPanel,
  DialogTitle,
} from "@headlessui/react";
import { clsx } from "clsx";
import { ArrowUpDown, Dna, MapPin, Search, X } from "lucide-react";
import { type ChangeEvent, useCallback, useState } from "react";
import BodyIcon from "@/assets/images/body.svg";
import HeadIcon from "@/assets/images/head.svg";
import { TypePills } from "@/components/type-pills";
import {
  type UseFusionTypesResult,
  useFusionTypesFromPokemon,
} from "@/hooks/use-fusion-types";
import {
  type CombinedLocation,
  getLocationsSortedWithCustom,
} from "@/loaders/locations";
import { isEggId, type PokemonOptionType } from "@/loaders/pokemon";
import { useCustomLocations } from "@/stores/playthroughs/hooks";
import { getActivePlaythrough } from "@/stores/playthroughs/playthrough-state";
import { canFuse } from "@/utils/pokemon-predicates";
import { PokemonSprite } from "../pokemon-sprite";

interface LocationSelectorProps {
  currentLocationId: string;
  encounterData: {
    head?: PokemonOptionType | null;
    body?: PokemonOptionType | null;
    artworkVariant?: string;
  } | null;
  isOpen: boolean;
  moveTargetField: "head" | "body";
  onClose: () => void;
  onSelectLocation: (
    targetLocationId: string,
    targetField: "head" | "body",
  ) => void;
}

interface LocationItemProps {
  currentLocationId: string;
  location: CombinedLocation;
  moveTargetField: "head" | "body";
  movingPokemon: PokemonOptionType | null;
  onSelect: (location: CombinedLocation) => void;
  selectedTargetField: "head" | "body";
}

interface ActionPreviewProps {
  existingPokemon: PokemonOptionType | null;
  movingPokemon: PokemonOptionType | null;
  otherFieldPokemon: PokemonOptionType | null;
  remainingPokemon: PokemonOptionType | null;
  selectedTargetField: "head" | "body";
  sourceMoveTargetField: "head" | "body";
}

interface PostMovePokemon {
  body: PokemonOptionType | null;
  head: PokemonOptionType | null;
}

interface SwapActionPreviewProps {
  existingPokemon: PokemonOptionType;
  existingTypes: UseFusionTypesResult;
  otherFieldPokemon: PokemonOptionType | null;
  remainingPokemon: PokemonOptionType | null;
  sourceFusionTypes: UseFusionTypesResult;
  targetFusionTypes: UseFusionTypesResult;
}

export { LocationSelector };

function getSlotPokemon(
  locationId: string,
  field: "head" | "body",
): PokemonOptionType | null {
  const activePlaythrough = getActivePlaythrough();
  const targetEncounter = activePlaythrough?.encounters?.[locationId];
  if (!targetEncounter) {
    return null;
  }

  return field === "head" ? targetEncounter.head : targetEncounter.body;
}

function isEggPokemon(pokemon: PokemonOptionType | null | undefined) {
  return pokemon ? isEggId(pokemon.id) : false;
}

function wouldCreateEggFusionInSingleEncounter(
  isMovingPokemonEgg: boolean,
  targetPokemon: ReadonlyArray<PokemonOptionType | null | undefined>,
) {
  if (isMovingPokemonEgg && targetPokemon.some(Boolean)) {
    return true;
  }

  return targetPokemon.some(isEggPokemon);
}

function wouldCreateEggFusionInFusion(
  isMovingPokemonEgg: boolean,
  oppositeFieldPokemon: PokemonOptionType | null,
) {
  if (!oppositeFieldPokemon) {
    return false;
  }

  return isMovingPokemonEgg || isEggPokemon(oppositeFieldPokemon);
}

function wouldCreateEggFusion(
  movingPokemon: PokemonOptionType | null,
  targetLocationId: string,
  oppositeFieldPokemon: PokemonOptionType | null,
) {
  if (!movingPokemon) {
    return false;
  }

  const isMovingPokemonEgg = isEggId(movingPokemon.id);
  const activePlaythrough = getActivePlaythrough();
  const targetEncounter = activePlaythrough?.encounters?.[targetLocationId];

  if (targetEncounter && !targetEncounter.isFusion) {
    return wouldCreateEggFusionInSingleEncounter(isMovingPokemonEgg, [
      targetEncounter.head,
      targetEncounter.body,
    ]);
  }

  return wouldCreateEggFusionInFusion(isMovingPokemonEgg, oppositeFieldPokemon);
}

function getPostMovePokemon(
  targetField: "head" | "body",
  targetPokemon: PokemonOptionType | null,
  otherPokemon: PokemonOptionType | null,
): PostMovePokemon {
  return targetField === "head"
    ? { body: otherPokemon, head: targetPokemon }
    : { body: targetPokemon, head: otherPokemon };
}

function canCreateFusion(
  headPokemon: PokemonOptionType | null,
  bodyPokemon: PokemonOptionType | null,
) {
  return Boolean(
    headPokemon && bodyPokemon && canFuse(headPokemon, bodyPokemon),
  );
}

function matchesPokemonName(
  pokemon: PokemonOptionType | null | undefined,
  query: string,
) {
  if (!pokemon) {
    return false;
  }

  return (
    pokemon.name.toLowerCase().includes(query) ||
    pokemon.nickname?.toLowerCase().includes(query)
  );
}

function matchesLocationSearch(
  location: CombinedLocation,
  query: string,
  activePlaythrough: ReturnType<typeof getActivePlaythrough>,
) {
  const locationMatches =
    location.name.toLowerCase().includes(query) ||
    location.region.toLowerCase().includes(query) ||
    location.description.toLowerCase().includes(query);
  if (locationMatches) {
    return true;
  }

  const encounter = activePlaythrough?.encounters?.[location.id];
  return (
    matchesPokemonName(encounter?.head, query) ||
    matchesPokemonName(encounter?.body, query)
  );
}

// Reusable component for action preview items
function ActionPreviewItem({
  pokemon,
  icon: Icon,
  iconColor,
  text,
  types,
}: {
  pokemon: PokemonOptionType;
  icon: React.ComponentType<{ className?: string }>;
  iconColor: string;
  text: string;
  types: UseFusionTypesResult;
}) {
  return (
    <div className="flex items-center space-x-4">
      <div className="flex size-4 flex-shrink-0 items-center justify-center">
        <PokemonSprite generation="gen7" pokemonId={pokemon.id} />
      </div>
      <p className={`flex gap-x-1 font-medium text-xs ${iconColor}`}>
        <Icon className={`h-3 w-3 ${iconColor} flex-shrink-0`} />
        <span>{text}</span>
      </p>
      {types.primary ? (
        <div className="ml-auto">
          <TypePills
            primary={types.primary}
            secondary={types.secondary}
            showTooltip
            size="xs"
          />
        </div>
      ) : null}
    </div>
  );
}

function SwapActionPreview({
  existingPokemon,
  existingTypes,
  otherFieldPokemon,
  remainingPokemon,
  sourceFusionTypes,
  targetFusionTypes,
}: SwapActionPreviewProps) {
  return (
    <div className="mt-2 space-y-2.5">
      <ActionPreviewItem
        icon={ArrowUpDown}
        iconColor="text-amber-600 dark:text-amber-400"
        pokemon={existingPokemon}
        text={`Will swap with ${existingPokemon.name}`}
        types={existingTypes}
      />

      {targetFusionTypes.primary && otherFieldPokemon ? (
        <ActionPreviewItem
          icon={Dna}
          iconColor="text-purple-600 dark:text-purple-400"
          pokemon={otherFieldPokemon}
          text={`Will fuse with ${otherFieldPokemon.name} here`}
          types={targetFusionTypes}
        />
      ) : null}

      {sourceFusionTypes.primary && remainingPokemon ? (
        <ActionPreviewItem
          icon={Dna}
          iconColor="text-green-600 dark:text-green-400"
          pokemon={remainingPokemon}
          text={`${existingPokemon.name} will fuse with ${remainingPokemon.name} at source`}
          types={sourceFusionTypes}
        />
      ) : null}
    </div>
  );
}

// Component for rendering action preview (swap/fusion indicators)
function ActionPreview({
  existingPokemon,
  otherFieldPokemon,
  remainingPokemon,
  movingPokemon,
  selectedTargetField,
  sourceMoveTargetField,
}: ActionPreviewProps) {
  const targetAfterMove = getPostMovePokemon(
    selectedTargetField,
    movingPokemon,
    otherFieldPokemon,
  );
  const sourceAfterMove = getPostMovePokemon(
    sourceMoveTargetField,
    existingPokemon,
    remainingPokemon,
  );

  const existingTypes = useFusionTypesFromPokemon(existingPokemon, null, false);
  const targetFusionTypes = useFusionTypesFromPokemon(
    targetAfterMove.head,
    targetAfterMove.body,
    canCreateFusion(targetAfterMove.head, targetAfterMove.body),
  );
  const sourceFusionTypes = useFusionTypesFromPokemon(
    sourceAfterMove.head,
    sourceAfterMove.body,
    canCreateFusion(sourceAfterMove.head, sourceAfterMove.body),
  );

  if (!(existingPokemon || otherFieldPokemon)) {
    return null;
  }

  if (!existingPokemon) {
    if (!(movingPokemon && otherFieldPokemon && targetFusionTypes.primary)) {
      return null;
    }

    return (
      <ActionPreviewItem
        icon={Dna}
        iconColor="text-purple-600 dark:text-purple-400"
        pokemon={otherFieldPokemon}
        text={`Will fuse with ${otherFieldPokemon.name}`}
        types={targetFusionTypes}
      />
    );
  }

  return (
    <SwapActionPreview
      existingPokemon={existingPokemon}
      existingTypes={existingTypes}
      otherFieldPokemon={otherFieldPokemon}
      remainingPokemon={remainingPokemon}
      sourceFusionTypes={sourceFusionTypes}
      targetFusionTypes={targetFusionTypes}
    />
  );
}

// Individual location item component
function LocationItem({
  location,
  selectedTargetField,
  currentLocationId,
  moveTargetField,
  onSelect,
  movingPokemon,
}: LocationItemProps) {
  const handleSelect = useCallback(() => {
    onSelect(location);
  }, [location, onSelect]);

  const existingPokemon = getSlotPokemon(location.id, selectedTargetField);

  const otherFieldPokemon = getSlotPokemon(
    location.id,
    selectedTargetField === "head" ? "body" : "head",
  );

  const remainingPokemon = (() => {
    if (!existingPokemon) {
      return null;
    }

    const activePlaythrough = getActivePlaythrough();
    const sourceEncounter = activePlaythrough?.encounters?.[currentLocationId];
    if (!sourceEncounter) {
      return null;
    }

    return moveTargetField === "head"
      ? sourceEncounter.body
      : sourceEncounter.head;
  })();

  const wouldCreateEggFusionAtTarget = wouldCreateEggFusion(
    movingPokemon,
    location.id,
    otherFieldPokemon,
  );

  return (
    <li
      className={clsx(
        "group focus-within:bg-gray-50 hover:bg-gray-50 dark:hover:bg-gray-700 dark:focus-within:bg-gray-700",
        "border-gray-200 border-b last:border-b-0 dark:border-gray-600",
        "last:rounded-b-lg",
      )}
    >
      <button
        className={clsx("w-full p-3 text-left focus:outline-none", {
          "cursor-not-allowed opacity-50": wouldCreateEggFusionAtTarget,
        })}
        disabled={wouldCreateEggFusionAtTarget}
        onClick={handleSelect}
        type="button"
      >
        <div className="flex items-start space-x-3">
          <MapPin className="mt-0.5 h-4 w-4 flex-shrink-0 text-gray-400" />
          <div className="min-w-0 flex-1">
            <p className="truncate font-medium text-gray-900 text-sm dark:text-white">
              {location.name}
            </p>
            <p className="truncate text-gray-500 text-xs dark:text-gray-400">
              {"isCustom" in location && location.isCustom
                ? "Custom location"
                : `${location.region} • ${location.description}`}
            </p>
            {wouldCreateEggFusionAtTarget && (
              <p className="mt-1 text-red-500 text-xs dark:text-red-400">
                Cannot fuse with egg
              </p>
            )}
            {wouldCreateEggFusionAtTarget === false && (
              <ActionPreview
                existingPokemon={existingPokemon}
                movingPokemon={movingPokemon}
                otherFieldPokemon={otherFieldPokemon}
                remainingPokemon={remainingPokemon}
                selectedTargetField={selectedTargetField}
                sourceMoveTargetField={moveTargetField}
              />
            )}
          </div>
        </div>
      </button>
    </li>
  );
}

// Component for displaying information about the Pokemon being moved
function MovingPokemonInfo({
  movingPokemon,
  moveTargetField,
  isFusion,
}: {
  movingPokemon: PokemonOptionType;
  moveTargetField: "head" | "body";
  isFusion: boolean;
}) {
  const fusionTypes = useFusionTypesFromPokemon(movingPokemon, null, false);

  return (
    <div className="rounded-lg bg-gray-50 p-3 dark:bg-gray-700">
      <div className="flex items-center space-x-3">
        <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center">
          <PokemonSprite generation="gen7" pokemonId={movingPokemon.id} />
        </div>
        <p className="font-medium text-gray-900 text-sm dark:text-white">
          Moving: {movingPokemon.name}
          {isFusion ? (
            <> ({moveTargetField === "head" ? "Head" : "Body"})</>
          ) : null}
        </p>
        <div className="ml-auto">
          {fusionTypes.primary ? (
            <TypePills
              primary={fusionTypes.primary}
              secondary={fusionTypes.secondary}
              size="md"
            />
          ) : null}
        </div>
      </div>
    </div>
  );
}

// Component for target field selection (head/body)
function TargetFieldSelector({
  selectedTargetField,
  onTargetFieldChange,
}: {
  selectedTargetField: "head" | "body";
  onTargetFieldChange: (field: "head" | "body") => void;
}) {
  const selectHead = useCallback(() => {
    onTargetFieldChange("head");
  }, [onTargetFieldChange]);
  const selectBody = useCallback(() => {
    onTargetFieldChange("body");
  }, [onTargetFieldChange]);

  return (
    <fieldset>
      <legend className="mb-2 block font-medium text-gray-700 text-sm dark:text-gray-300">
        Move to slot:
      </legend>
      <div className="flex space-x-2">
        <button
          className={clsx(
            "flex-1 rounded-md px-3 py-2 font-medium text-sm focus:outline-none focus:ring-2 focus:ring-blue-500",
            "flex items-center justify-center gap-x-1",
            selectedTargetField === "head"
              ? "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300"
              : "bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-600 dark:text-gray-300 dark:hover:bg-gray-500",
          )}
          onClick={selectHead}
          type="button"
        >
          <HeadIcon className="size-5" />
          <span className="mr-2.5">Head Slot</span>
        </button>
        <button
          className={clsx(
            "flex-1 rounded-md px-3 py-2 font-medium text-sm focus:outline-none focus:ring-2 focus:ring-blue-500",
            "flex items-center justify-center gap-x-1",
            selectedTargetField === "body"
              ? "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300"
              : "bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-600 dark:text-gray-300 dark:hover:bg-gray-500",
          )}
          onClick={selectBody}
          type="button"
        >
          <BodyIcon className="size-5" />
          <span className="mr-2.5">Body Slot</span>
        </button>
      </div>
    </fieldset>
  );
}

// Custom hook for managing location selector logic
function useLocationSelector({
  currentLocationId,
  moveTargetField,
  encounterData,
}: {
  currentLocationId: string;
  moveTargetField: "head" | "body";
  encounterData: LocationSelectorProps["encounterData"];
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTargetFieldOverride, setSelectedTargetFieldOverride] =
    useState<"head" | "body" | null>(null);
  const selectedTargetField = selectedTargetFieldOverride ?? moveTargetField;

  const setSelectedTargetField = (field: "head" | "body") => {
    setSelectedTargetFieldOverride(field);
  };

  // Get custom locations and create merged locations
  const customLocations = useCustomLocations();

  // Get all locations except the current one
  const availableLocations = (() => {
    const allLocations = getLocationsSortedWithCustom(customLocations);
    return allLocations.filter((location) => location.id !== currentLocationId);
  })();

  // Filter locations based on search query (including Pokemon names)
  const filteredLocations = (() => {
    if (!searchQuery.trim()) {
      return availableLocations;
    }

    const query = searchQuery.toLowerCase();
    const activePlaythrough = getActivePlaythrough();

    return availableLocations.filter((location) =>
      matchesLocationSearch(location, query, activePlaythrough),
    );
  })();

  // Determine what Pokemon is being moved
  const movingPokemon = (() => {
    if (!encounterData) {
      return null;
    }

    if (moveTargetField === "head" && encounterData.head) {
      return encounterData.head;
    }
    if (moveTargetField === "body" && encounterData.body) {
      return encounterData.body;
    }
    return encounterData.head ?? encounterData.body ?? null;
  })();

  // Check if the Pokemon being moved is an egg
  const isMovingPokemonEgg = movingPokemon ? isEggId(movingPokemon.id) : false;

  // Determine if this should be treated as a fusion
  // Disable fusion mode when moving an egg to the head slot
  const isFusion = (() => {
    if (!(encounterData?.head && encounterData?.body)) {
      return false;
    }

    // If moving an egg to head slot, disable fusion mode
    if (moveTargetField === "head" && isMovingPokemonEgg) {
      return false;
    }

    return true;
  })();

  const resetState = () => {
    setSearchQuery("");
    setSelectedTargetFieldOverride(null);
  };

  return {
    filteredLocations,
    isFusion,
    movingPokemon,
    resetState,
    searchQuery,
    selectedTargetField,
    setSearchQuery,
    setSelectedTargetField,
  };
}

// Main LocationSelector component
function LocationSelector({
  isOpen,
  onClose,
  currentLocationId,
  onSelectLocation,
  encounterData,
  moveTargetField,
}: LocationSelectorProps) {
  const {
    searchQuery,
    setSearchQuery,
    selectedTargetField,
    setSelectedTargetField,
    filteredLocations,
    movingPokemon,
    isFusion,
    resetState,
  } = useLocationSelector({
    currentLocationId,
    encounterData,
    moveTargetField,
  });

  const handleLocationSelect = useCallback(
    (location: CombinedLocation) => {
      onSelectLocation(location.id, selectedTargetField);
      resetState();
      onClose();
    },
    [onClose, onSelectLocation, resetState, selectedTargetField],
  );

  const handleClose = useCallback(() => {
    resetState();
    onClose();
  }, [onClose, resetState]);

  const handleSearchChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      setSearchQuery(event.target.value);
    },
    [setSearchQuery],
  );

  return (
    <Dialog
      className="group relative z-[70]"
      onClose={handleClose}
      open={isOpen}
    >
      <DialogBackdrop
        aria-hidden="true"
        className="fixed inset-0 bg-black/30 backdrop-blur-[2px] data-closed:opacity-0 data-enter:opacity-100 dark:bg-black/50"
        transition
      />

      <div className="fixed inset-0 flex w-screen items-center justify-center p-4">
        <DialogPanel
          className={clsx(
            "max-h-[calc(100dvh-2rem)] w-full max-w-lg space-y-4 overflow-y-auto rounded-lg border border-gray-200 bg-white p-4 shadow-xl sm:max-h-[80vh] sm:p-6 dark:border-gray-700 dark:bg-gray-800",
            "transition duration-150 ease-out data-closed:scale-98 data-closed:opacity-0",
          )}
          transition
        >
          <div className="flex items-center justify-between">
            <DialogTitle className="font-semibold text-gray-900 text-xl dark:text-white">
              Move Pokemon to Location
            </DialogTitle>
            <button
              aria-label="Close modal"
              className={clsx(
                "text-gray-400 hover:text-gray-600 dark:hover:text-gray-300",
                "focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-500 focus-visible:ring-offset-2",
                "cursor-pointer rounded-md p-1 transition-colors",
              )}
              onClick={handleClose}
              type="button"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {movingPokemon ? (
            <MovingPokemonInfo
              isFusion={isFusion}
              moveTargetField={moveTargetField}
              movingPokemon={movingPokemon}
            />
          ) : null}

          <TargetFieldSelector
            onTargetFieldChange={setSelectedTargetField}
            selectedTargetField={selectedTargetField}
          />

          <div className="relative">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
              <Search className="h-4 w-4 text-gray-400" />
            </div>
            <label className="sr-only" htmlFor="location-selector-search">
              Search locations or Pokemon names
            </label>
            <input
              className="w-full rounded-md border border-gray-300 py-2 pr-3 pl-10 placeholder-gray-400 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              id="location-selector-search"
              onChange={handleSearchChange}
              placeholder="Search locations or Pokemon names..."
              type="text"
              value={searchQuery}
            />
          </div>

          <ul className="scrollbar-thin h-[46dvh] min-h-0 overflow-y-auto rounded-lg border border-gray-200 sm:min-h-96 dark:border-gray-600">
            {filteredLocations.length === 0 ? (
              <li className="list-none p-4 text-center text-gray-500 dark:text-gray-400">
                {searchQuery.trim()
                  ? "No locations found matching your search for locations or Pokemon names."
                  : "No available locations."}
              </li>
            ) : (
              filteredLocations.map((location) => (
                <LocationItem
                  currentLocationId={currentLocationId}
                  key={location.id}
                  location={location}
                  moveTargetField={moveTargetField}
                  movingPokemon={movingPokemon}
                  onSelect={handleLocationSelect}
                  selectedTargetField={selectedTargetField}
                />
              ))
            )}
          </ul>

          <div className="flex justify-end">
            <button
              className="rounded-md bg-gray-100 px-4 py-2 font-medium text-gray-700 text-sm hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-600 dark:text-gray-300 dark:hover:bg-gray-500"
              onClick={handleClose}
              type="button"
            >
              Cancel
            </button>
          </div>
        </DialogPanel>
      </div>
    </Dialog>
  );
}
