import { useEffect, useRef, useState } from "react";
import { useSnapshot } from "valtio";
import { getPokemon, getPokemonNameMap } from "@/loaders";
import type { PokemonOptionType } from "@/loaders/pokemon";
import { dragActions, dragStore } from "@/stores/dragStore";
import { playthroughActions } from "@/stores/playthroughs";
import { settingsStore } from "@/stores/settings";

interface UseComboboxDragAndDropProps {
  comboboxId?: string;
  locationId?: string;
  onChange: (value: PokemonOptionType | null) => void;
  value: PokemonOptionType | null | undefined;
}

// Debounce drag preview updates to reduce expensive operations
let dragPreviewTimeout: number | null = null;
const DRAG_PREVIEW_DEBOUNCE = 16; // ~1 frame at 60fps

export function useComboboxDragAndDrop({
  comboboxId,
  locationId,
  value,
  onChange,
}: UseComboboxDragAndDropProps) {
  const dragSnapshot = useSnapshot(dragStore);
  const settings = useSnapshot(settingsStore);
  const [dragPreview, setDragPreview] = useState<PokemonOptionType | null>(
    null,
  );

  // Ref to track pending timeout for drag leave operations
  const dragLeaveAnimationRef = useRef<number | null>(null);

  // Helper function to get location info from combobox ID
  const getLocationInfo = (id: string) =>
    playthroughActions.getLocationFromComboboxId(id);

  // Helper function to find Pokemon by name
  const findPokemonByName = async (
    pokemonName: string,
    dragValue?: PokemonOptionType | null,
  ): Promise<PokemonOptionType | null> => {
    try {
      const allPokemon = await getPokemon();
      const nameMap = await getPokemonNameMap();

      const foundPokemon = allPokemon.find(
        (p) => nameMap.get(p.id)?.toLowerCase() === pokemonName.toLowerCase(),
      );

      if (!foundPokemon) {
        return null;
      }

      return {
        id: foundPokemon.id,
        name: pokemonName,
        nationalDexId: foundPokemon.nationalDexId,
        originalLocation: locationId,
        ...(dragValue && {
          nickname: dragValue.nickname,
          status: dragValue.status,
        }),
      };
    } catch (err) {
      console.error("Error finding Pokemon by name:", err);
      return null;
    }
  };

  // Helper function to perform move operations
  const performMoveOperation = (pokemon: PokemonOptionType) => {
    if (!(dragSnapshot.currentDragSource && comboboxId)) {
      onChange(pokemon);
      return;
    }

    const sourceLocation = getLocationInfo(dragSnapshot.currentDragSource);
    const targetLocation = getLocationInfo(comboboxId);

    playthroughActions.relocateEncounterSlot({
      sourceField: sourceLocation.field,
      sourceLocationId: sourceLocation.locationId,
      targetField: targetLocation.field,
      targetLocationId: targetLocation.locationId,
    });
  };

  // Helper function to perform swap operations
  const performSwapOperation = () => {
    if (!(dragSnapshot.currentDragSource && comboboxId)) {
      return;
    }

    const sourceLocation = getLocationInfo(dragSnapshot.currentDragSource);
    const targetLocation = getLocationInfo(comboboxId);

    playthroughActions.relocateEncounterSlot({
      sourceField: sourceLocation.field,
      sourceLocationId: sourceLocation.locationId,
      targetField: targetLocation.field,
      targetLocationId: targetLocation.locationId,
    });
  };

  const isFromDifferentCombobox = Boolean(
    comboboxId &&
      dragSnapshot.currentDragSource &&
      dragSnapshot.currentDragSource !== comboboxId,
  );
  const canSwitch =
    isFromDifferentCombobox &&
    dragSnapshot.currentDragValue &&
    value &&
    dragSnapshot.currentDragValue.uid !== value.uid;

  // Debounced drag preview setter
  const setDragPreviewDebounced = (preview: PokemonOptionType | null) => {
    if (dragPreviewTimeout) {
      clearTimeout(dragPreviewTimeout);
    }

    dragPreviewTimeout = window.setTimeout(() => {
      setDragPreview(preview);
      dragPreviewTimeout = null;
    }, DRAG_PREVIEW_DEBOUNCE);
  };

  // Handle drop events on the input
  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();

    // Clear debounced preview immediately
    if (dragPreviewTimeout) {
      clearTimeout(dragPreviewTimeout);
      dragPreviewTimeout = null;
    }
    setDragPreview(null);

    const pokemonName = e.dataTransfer.getData("text/plain");
    if (!pokemonName) {
      return;
    }

    // Preserve the drag value that initiated this drop while async lookup runs.
    const dragValue = dragStore.currentDragValue;

    // Check if move operations are allowed
    if (isFromDifferentCombobox && !settings.moveEncountersBetweenLocations) {
      // If trying to move between different locations but setting is disabled, just set the Pokemon
      let pokemon = dragValue;
      if (!pokemon) {
        pokemon = await findPokemonByName(pokemonName, dragValue);
        if (!pokemon) {
          return;
        }
      }
      onChange(pokemon);
      return;
    }

    // Handle swap operation if conditions are met
    if (canSwitch && settings.moveEncountersBetweenLocations) {
      performSwapOperation();
      return;
    }

    // Determine the Pokemon to use (existing drag value or lookup by name)
    let pokemon = dragValue;
    if (!pokemon) {
      pokemon = await findPokemonByName(pokemonName, dragValue);
      if (!pokemon) {
        return;
      }
    }

    // Perform move or set operation
    if (isFromDifferentCombobox && settings.moveEncountersBetweenLocations) {
      performMoveOperation(pokemon);
    } else {
      onChange(pokemon);
    }
  };

  // Helper function to update preview for drag data
  const updatePreviewForDragData = async (pokemonName: string) => {
    const pokemon = await findPokemonByName(pokemonName);
    if (pokemon && dragStore.currentDragData === pokemonName) {
      setDragPreview(pokemon);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();

    // If move operations are disabled, show appropriate drop effect
    if (settings.moveEncountersBetweenLocations) {
      e.dataTransfer.dropEffect = "copy";
    } else {
      e.dataTransfer.dropEffect = "copy";
    }

    // Cancel pending drag leave timeout
    if (dragLeaveAnimationRef.current !== null) {
      clearTimeout(dragLeaveAnimationRef.current);
      dragLeaveAnimationRef.current = null;
    }

    // Early exit if no drag data
    if (!(dragSnapshot.currentDragValue || dragSnapshot.currentDragData)) {
      return;
    }

    // Handle existing Pokemon drag value
    if (dragSnapshot.currentDragValue) {
      const shouldUpdate =
        !dragPreview || dragPreview.name !== dragSnapshot.currentDragValue.name;

      if (shouldUpdate) {
        setDragPreviewDebounced(dragSnapshot.currentDragValue);
      }
      return;
    }

    // Handle Pokemon name drag data
    if (dragSnapshot.currentDragData) {
      const dragData = dragSnapshot.currentDragData;
      const shouldUpdate = !dragPreview || dragPreview.name !== dragData;

      if (shouldUpdate) {
        setDragPreviewDebounced(null); // Clear current preview immediately

        // Debounce the expensive async operation
        if (dragPreviewTimeout) {
          clearTimeout(dragPreviewTimeout);
        }

        dragPreviewTimeout = window.setTimeout(() => {
          updatePreviewForDragData(dragData);
          dragPreviewTimeout = null;
        }, DRAG_PREVIEW_DEBOUNCE);
      }
    }
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.stopPropagation(); // Prevent event bubbling

    // Cancel any pending timeout
    if (dragLeaveAnimationRef.current !== null) {
      clearTimeout(dragLeaveAnimationRef.current);
    }

    // Use a timeout-based approach that works reliably across all browsers
    // This gives time for dragEnter to fire on the new target before clearing
    dragLeaveAnimationRef.current = window.setTimeout(() => {
      setDragPreview(null);
      dragLeaveAnimationRef.current = null;
    }, 50); // Short delay to allow for dragEnter on new targets
  };

  const handleDragEnd = () => {
    // Clear global drag data when drag ends
    dragActions.clearDrag();
    // Also clear any lingering drag preview
    setDragPreview(null);
  };

  // Clean up timeouts on unmount
  useEffect(
    () => () => {
      if (dragLeaveAnimationRef.current !== null) {
        clearTimeout(dragLeaveAnimationRef.current);
      }
      if (dragPreviewTimeout !== null) {
        clearTimeout(dragPreviewTimeout);
        dragPreviewTimeout = null;
      }
    },
    [],
  );

  return {
    dragPreview,
    handleDragEnd,
    handleDragLeave,
    handleDragOver,
    handleDrop,
  };
}
