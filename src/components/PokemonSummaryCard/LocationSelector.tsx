"use client";

import {
  Dialog,
  DialogBackdrop,
  DialogPanel,
  DialogTitle,
} from "@headlessui/react";
import { clsx } from "clsx";
import { ArrowUpDown, Dna, MapPin, Search, X } from "lucide-react";
import { useState } from "react";
import BodyIcon from "@/assets/images/body.svg";
import HeadIcon from "@/assets/images/head.svg";
import { TypePills } from "@/components/TypePills";
import {
  type UseFusionTypesResult,
  useFusionTypesFromPokemon,
} from "@/hooks/useFusionTypes";
import {
  type CombinedLocation,
  getLocationsSortedWithCustom,
} from "@/loaders/locations";
import { isEggId, type PokemonOptionType } from "@/loaders/pokemon";
import { useCustomLocations } from "@/stores/playthroughs/hooks";
import { getActivePlaythrough } from "@/stores/playthroughs/store";
import { canFuse } from "@/utils/pokemonPredicates";
import { PokemonSprite } from "../PokemonSprite";

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

export { LocationSelector };

// Helper function to get Pokemon in a specific slot
function getSlotPokemon(
  locationId: string,
  field: "head" | "body",
): PokemonOptionType | null {
  const activePlaythrough = getActivePlaythrough();
  const targetEncounter = activePlaythrough?.encounters?.[locationId];
  return targetEncounter
    ? field === "head"
      ? targetEncounter.head
      : targetEncounter.body
    : null;
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
      {types.primary && (
        <div className="ml-auto">
          <TypePills
            primary={types.primary}
            secondary={types.secondary}
            showTooltip
            size="xs"
          />
        </div>
      )}
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
  // Compute target and source post-move states for typing previews
  const { targetHeadAfter, targetBodyAfter } = (() => {
    const headAfter =
      selectedTargetField === "head" ? movingPokemon : otherFieldPokemon;
    const bodyAfter =
      selectedTargetField === "body" ? movingPokemon : otherFieldPokemon;
    return { targetBodyAfter: bodyAfter, targetHeadAfter: headAfter };
  })();

  const { sourceHeadAfter, sourceBodyAfter } = (() => {
    const headAfter =
      sourceMoveTargetField === "head" ? existingPokemon : remainingPokemon;
    const bodyAfter =
      sourceMoveTargetField === "body" ? existingPokemon : remainingPokemon;
    return { sourceBodyAfter: bodyAfter, sourceHeadAfter: headAfter };
  })();

  // Resolve typings with fusion hook (falls back to single when one side is missing)
  const existingTypes = useFusionTypesFromPokemon(existingPokemon, null, false);

  // Compute fusion types conditionally but always at the top level
  const targetFusionTypes = useFusionTypesFromPokemon(
    targetHeadAfter,
    targetBodyAfter,
    Boolean(
      targetHeadAfter &&
        targetBodyAfter &&
        canFuse(targetHeadAfter, targetBodyAfter),
    ),
  );
  const sourceFusionTypes = useFusionTypesFromPokemon(
    sourceHeadAfter,
    sourceBodyAfter,
    Boolean(
      sourceHeadAfter &&
        sourceBodyAfter &&
        canFuse(sourceHeadAfter, sourceBodyAfter),
    ),
  );

  if (!(existingPokemon || otherFieldPokemon)) {
    return null;
  }

  if (existingPokemon) {
    // This is a swap operation - types are already computed above
    return (
      <div className="mt-2 space-y-2.5">
        <ActionPreviewItem
          icon={ArrowUpDown}
          iconColor="text-amber-600 dark:text-amber-400"
          pokemon={existingPokemon}
          text={`Will swap with ${existingPokemon.name}`}
          types={existingTypes}
        />

        {targetFusionTypes.primary && otherFieldPokemon && (
          <ActionPreviewItem
            icon={Dna}
            iconColor="text-purple-600 dark:text-purple-400"
            pokemon={otherFieldPokemon}
            text={`Will fuse with ${otherFieldPokemon.name} here`}
            types={targetFusionTypes}
          />
        )}

        {sourceFusionTypes.primary && remainingPokemon && (
          <ActionPreviewItem
            icon={Dna}
            iconColor="text-green-600 dark:text-green-400"
            pokemon={remainingPokemon}
            text={`${existingPokemon.name} will fuse with ${remainingPokemon.name} at source`}
            types={sourceFusionTypes}
          />
        )}
      </div>
    );
  }

  // Simple fusion case (no existing Pokemon in target slot): simulate post-move target
  if (movingPokemon && otherFieldPokemon) {
    // Only show if fusion types were computed (meaning fusion is possible)
    if (!targetFusionTypes.primary) {
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

  return null;
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
  const handleSelect = () => {
    onSelect(location);
  };

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
    return sourceEncounter
      ? moveTargetField === "head"
        ? sourceEncounter.body
        : sourceEncounter.head
      : null;
  })();

  // Check if this move would result in egg fusion
  const wouldCreateEggFusion = (() => {
    if (!movingPokemon) {
      return false;
    }

    // Check if the Pokemon being moved is an egg
    const isMovingPokemonEgg = isEggId(movingPokemon.id);

    // Get the encounter at the target location to check fusion status
    const activePlaythrough = getActivePlaythrough();
    const targetEncounter = activePlaythrough?.encounters?.[location.id];

    // If the target encounter is not a fusion (isFusion = false),
    // then no fusion will be created regardless of what's in the body slot
    // UNLESS we're moving an egg or there's an egg in the target location
    if (targetEncounter && !targetEncounter.isFusion) {
      // For non-fusion encounters, only prevent if there's an egg involved
      const headPokemon = targetEncounter.head;
      const bodyPokemon = targetEncounter.body;

      // If moving an egg and there's any Pokemon in the target location
      if (isMovingPokemonEgg && (headPokemon || bodyPokemon)) {
        return true;
      }

      // If there's an egg in the target location and we're moving a Pokemon
      if (
        (headPokemon && isEggId(headPokemon.id)) ||
        (bodyPokemon && isEggId(bodyPokemon.id))
      ) {
        return true;
      }

      return false;
    }

    // For fusion encounters, check the opposite slot
    const oppositeFieldPokemon = getSlotPokemon(
      location.id,
      selectedTargetField === "head" ? "body" : "head",
    );

    // If moving Pokemon is an egg and there's a Pokemon in the opposite slot, it would create egg fusion
    if (isMovingPokemonEgg && oppositeFieldPokemon) {
      return true;
    }

    // If there's an egg in the opposite slot and we're moving a Pokemon, it would create egg fusion
    if (oppositeFieldPokemon && isEggId(oppositeFieldPokemon.id)) {
      return true;
    }

    return false;
  })();

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
          "cursor-not-allowed opacity-50": wouldCreateEggFusion,
        })}
        disabled={wouldCreateEggFusion}
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
            {wouldCreateEggFusion && (
              <p className="mt-1 text-red-500 text-xs dark:text-red-400">
                Cannot fuse with egg
              </p>
            )}
            {!wouldCreateEggFusion && (
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
          {isFusion && <> ({moveTargetField === "head" ? "Head" : "Body"})</>}
        </p>
        <div className="ml-auto">
          {fusionTypes.primary && (
            <TypePills
              primary={fusionTypes.primary}
              secondary={fusionTypes.secondary}
              size="md"
            />
          )}
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
          onClick={() => onTargetFieldChange("head")}
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
          onClick={() => onTargetFieldChange("body")}
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

    return availableLocations.filter((location) => {
      // Search by location properties
      const locationMatch =
        location.name.toLowerCase().includes(query) ||
        location.region.toLowerCase().includes(query) ||
        location.description.toLowerCase().includes(query);

      if (locationMatch) {
        return true;
      }

      // Search by Pokemon names at this location
      const encounter = activePlaythrough?.encounters?.[location.id];
      if (encounter) {
        const headPokemon = encounter.head;
        const bodyPokemon = encounter.body;

        const pokemonMatch =
          headPokemon?.name?.toLowerCase().includes(query) ||
          headPokemon?.nickname?.toLowerCase().includes(query) ||
          bodyPokemon?.name?.toLowerCase().includes(query) ||
          bodyPokemon?.nickname?.toLowerCase().includes(query);

        if (pokemonMatch) {
          return true;
        }
      }

      return false;
    });
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

  const handleLocationSelect = (location: CombinedLocation) => {
    onSelectLocation(location.id, selectedTargetField);
    resetState();
    onClose();
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

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
            "max-h-[80vh] w-full max-w-lg space-y-4 rounded-lg border border-gray-200 bg-white p-6 shadow-xl dark:border-gray-700 dark:bg-gray-800",
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

          {movingPokemon && (
            <MovingPokemonInfo
              isFusion={isFusion}
              moveTargetField={moveTargetField}
              movingPokemon={movingPokemon}
            />
          )}

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
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search locations or Pokemon names..."
              type="text"
              value={searchQuery}
            />
          </div>

          <ul className="scrollbar-thin h-[46vh] min-h-96 overflow-y-auto rounded-lg border border-gray-200 dark:border-gray-600">
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
