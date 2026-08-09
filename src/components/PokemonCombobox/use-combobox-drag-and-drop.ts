import { useEffect, useRef, useState } from "react";
import { useSnapshot } from "valtio";
import type { PokemonOptionType } from "@/loaders/pokemon";
import { getPokemon, getPokemonNameMap } from "@/loaders/pokemon";
import { dragActions, dragStore } from "@/stores/drag-store";
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

  const relocateEncounterSlot = () => {
    if (!(dragSnapshot.currentDragSource && comboboxId)) {
      return false;
    }

    const sourceLocation = playthroughActions.getLocationFromComboboxId(
      dragSnapshot.currentDragSource,
    );
    const targetLocation =
      playthroughActions.getLocationFromComboboxId(comboboxId);

    playthroughActions.relocateEncounterSlot({
      sourceField: sourceLocation.field,
      sourceLocationId: sourceLocation.locationId,
      targetField: targetLocation.field,
      targetLocationId: targetLocation.locationId,
    });
    return true;
  };

  // Helper function to perform move operations
  const performMoveOperation = (pokemon: PokemonOptionType) => {
    if (relocateEncounterSlot() === false) {
      onChange(pokemon);
    }
  };

  // Helper function to perform swap operations
  const performSwapOperation = () => {
    relocateEncounterSlot();
  };

  const resolveDropPokemon = async (
    pokemonName: string,
    dragValue: PokemonOptionType | null | undefined,
  ) => dragValue ?? findPokemonByName(pokemonName, dragValue);

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

    const canMoveEncounters =
      isFromDifferentCombobox && settings.moveEncountersBetweenLocations;
    if (canSwitch && canMoveEncounters) {
      performSwapOperation();
      return;
    }

    const pokemon = await resolveDropPokemon(pokemonName, dragValue);
    if (!pokemon) {
      return;
    }

    if (canMoveEncounters) {
      performMoveOperation(pokemon);
      return;
    }

    onChange(pokemon);
  };

  // Helper function to update preview for drag data
  const updatePreviewForDragData = async (pokemonName: string) => {
    const pokemon = await findPokemonByName(pokemonName);
    if (pokemon && dragStore.currentDragData === pokemonName) {
      setDragPreview(pokemon);
    }
  };

  const updatePreviewForDragValue = (pokemon: PokemonOptionType) => {
    if (!dragPreview || dragPreview.name !== pokemon.name) {
      setDragPreviewDebounced(pokemon);
    }
  };

  const schedulePreviewForDragData = (pokemonName: string) => {
    if (dragPreview?.name === pokemonName) {
      return;
    }

    setDragPreviewDebounced(null);
    if (dragPreviewTimeout) {
      clearTimeout(dragPreviewTimeout);
    }

    dragPreviewTimeout = window.setTimeout(() => {
      updatePreviewForDragData(pokemonName);
      dragPreviewTimeout = null;
    }, DRAG_PREVIEW_DEBOUNCE);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();

    e.dataTransfer.dropEffect = "copy";

    // Cancel pending drag leave timeout
    if (dragLeaveAnimationRef.current !== null) {
      clearTimeout(dragLeaveAnimationRef.current);
      dragLeaveAnimationRef.current = null;
    }

    const { currentDragData, currentDragValue } = dragSnapshot;
    if (currentDragValue) {
      updatePreviewForDragValue(currentDragValue);
      return;
    }

    if (currentDragData) {
      schedulePreviewForDragData(currentDragData);
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
