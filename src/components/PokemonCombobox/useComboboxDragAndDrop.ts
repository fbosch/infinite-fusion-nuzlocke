import { useCallback, useRef, useEffect, useState, useMemo } from 'react';
import { useSnapshot } from 'valtio';
import { dragStore, dragActions } from '@/stores/dragStore';
import { playthroughActions } from '@/stores/playthroughs';
import { getPokemon, getPokemonNameMap } from '@/loaders';
import type { PokemonOptionType } from '@/loaders/pokemon';

interface UseComboboxDragAndDropProps {
  comboboxId?: string;
  locationId?: string;
  value: PokemonOptionType | null | undefined;
  onChange: (value: PokemonOptionType | null) => void;
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
  const [dragPreview, setDragPreview] = useState<PokemonOptionType | null>(
    null
  );

  // Ref to track pending timeout for drag leave operations
  const dragLeaveAnimationRef = useRef<number | null>(null);

  // Helper function to get location info from combobox ID
  const getLocationInfo = useCallback((id: string) => {
    return playthroughActions.getLocationFromComboboxId(id);
  }, []);

  // Helper function to find Pokemon by name
  const findPokemonByName = useCallback(
    async (pokemonName: string): Promise<PokemonOptionType | null> => {
      try {
        const allPokemon = await getPokemon();
        const nameMap = await getPokemonNameMap();

        const foundPokemon = allPokemon.find(
          p => nameMap.get(p.id)?.toLowerCase() === pokemonName.toLowerCase()
        );

        if (!foundPokemon) return null;

        return {
          id: foundPokemon.id,
          name: pokemonName,
          nationalDexId: foundPokemon.nationalDexId,
          originalLocation: locationId,
          ...(dragSnapshot.currentDragValue && {
            nickname: dragSnapshot.currentDragValue.nickname,
            status: dragSnapshot.currentDragValue.status,
          }),
        };
      } catch (err) {
        console.error('Error finding Pokemon by name:', err);
        return null;
      }
    },
    [locationId, dragSnapshot.currentDragValue]
  );

  // Helper function to perform move operations
  const performMoveOperation = useCallback(
    (pokemon: PokemonOptionType) => {
      if (!dragSnapshot.currentDragSource || !comboboxId) {
        onChange(pokemon);
        return;
      }

      const sourceLocation = getLocationInfo(dragSnapshot.currentDragSource);
      const targetLocation = getLocationInfo(comboboxId);

      playthroughActions.moveEncounterAtomic(
        sourceLocation.locationId,
        sourceLocation.field,
        targetLocation.locationId,
        targetLocation.field,
        pokemon
      );
    },
    [dragSnapshot.currentDragSource, comboboxId, onChange, getLocationInfo]
  );

  // Helper function to perform swap operations
  const performSwapOperation = useCallback(() => {
    if (!dragSnapshot.currentDragSource || !comboboxId) return;

    const sourceLocation = getLocationInfo(dragSnapshot.currentDragSource);
    const targetLocation = getLocationInfo(comboboxId);

    playthroughActions.swapEncounters(
      sourceLocation.locationId,
      targetLocation.locationId,
      sourceLocation.field,
      targetLocation.field
    );
  }, [dragSnapshot.currentDragSource, comboboxId, getLocationInfo]);

  // Memoize drag state calculations
  const dragState = useMemo(() => {
    if (!comboboxId || !dragSnapshot.currentDragSource) {
      return { isFromDifferentCombobox: false, canSwitch: false };
    }

    const isFromDifferentCombobox =
      dragSnapshot.currentDragSource !== comboboxId;
    const canSwitch =
      isFromDifferentCombobox &&
      dragSnapshot.currentDragValue &&
      value &&
      dragSnapshot.currentDragValue.uid !== value.uid;

    return { isFromDifferentCombobox, canSwitch };
  }, [
    comboboxId,
    dragSnapshot.currentDragSource,
    dragSnapshot.currentDragValue,
    value,
  ]);

  // Debounced drag preview setter
  const setDragPreviewDebounced = useCallback(
    (preview: PokemonOptionType | null) => {
      if (dragPreviewTimeout) {
        clearTimeout(dragPreviewTimeout);
      }

      dragPreviewTimeout = window.setTimeout(() => {
        setDragPreview(preview);
        dragPreviewTimeout = null;
      }, DRAG_PREVIEW_DEBOUNCE);
    },
    []
  );

  // Handle drop events on the input
  const handleDrop = useCallback(
    async (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();

      // Clear debounced preview immediately
      if (dragPreviewTimeout) {
        clearTimeout(dragPreviewTimeout);
        dragPreviewTimeout = null;
      }
      setDragPreview(null);

      const pokemonName = e.dataTransfer.getData('text/plain');
      if (!pokemonName) return;

      // Handle swap operation if conditions are met
      if (dragState.canSwitch) {
        performSwapOperation();
        return;
      }

      // Determine the Pokemon to use (existing drag value or lookup by name)
      let pokemon = dragSnapshot.currentDragValue;
      if (!pokemon) {
        pokemon = await findPokemonByName(pokemonName);
        if (!pokemon) return;
      }

      // Perform move or set operation
      if (dragState.isFromDifferentCombobox) {
        performMoveOperation(pokemon);
      } else {
        onChange(pokemon);
      }
    },
    [
      dragState.canSwitch,
      dragState.isFromDifferentCombobox,
      dragSnapshot.currentDragValue,
      performSwapOperation,
      performMoveOperation,
      findPokemonByName,
      onChange,
    ]
  );

  // Helper function to update preview for drag data
  const updatePreviewForDragData = useCallback(
    async (pokemonName: string) => {
      const pokemon = await findPokemonByName(pokemonName);
      if (pokemon && dragSnapshot.currentDragData === pokemonName) {
        setDragPreview(pokemon);
      }
    },
    [findPokemonByName, dragSnapshot.currentDragData]
  );

  const handleDragOver = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      e.dataTransfer.dropEffect = 'copy';

      // Cancel pending drag leave timeout
      if (dragLeaveAnimationRef.current !== null) {
        clearTimeout(dragLeaveAnimationRef.current);
        dragLeaveAnimationRef.current = null;
      }

      // Early exit if no drag data
      if (!dragSnapshot.currentDragValue && !dragSnapshot.currentDragData) {
        return;
      }

      // Handle existing Pokemon drag value
      if (dragSnapshot.currentDragValue) {
        const shouldUpdate =
          !dragPreview ||
          dragPreview.name !== dragSnapshot.currentDragValue.name;

        if (shouldUpdate) {
          setDragPreviewDebounced(dragSnapshot.currentDragValue);
        }
        return;
      }

      // Handle Pokemon name drag data
      if (dragSnapshot.currentDragData) {
        const shouldUpdate =
          !dragPreview || dragPreview.name !== dragSnapshot.currentDragData;

        if (shouldUpdate) {
          setDragPreviewDebounced(null); // Clear current preview immediately

          // Debounce the expensive async operation
          if (dragPreviewTimeout) {
            clearTimeout(dragPreviewTimeout);
          }

          dragPreviewTimeout = window.setTimeout(() => {
            updatePreviewForDragData(dragSnapshot.currentDragData!);
            dragPreviewTimeout = null;
          }, DRAG_PREVIEW_DEBOUNCE);
        }
      }
    },
    [
      dragPreview,
      dragSnapshot.currentDragValue,
      dragSnapshot.currentDragData,
      setDragPreviewDebounced,
      updatePreviewForDragData,
    ]
  );

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
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
  }, []);

  const handleDragEnd = useCallback(() => {
    // Clear global drag data when drag ends
    dragActions.clearDrag();
    // Also clear any lingering drag preview
    setDragPreview(null);
  }, []);

  // Clean up timeouts on unmount
  useEffect(() => {
    return () => {
      if (dragLeaveAnimationRef.current !== null) {
        clearTimeout(dragLeaveAnimationRef.current);
      }
      if (dragPreviewTimeout !== null) {
        clearTimeout(dragPreviewTimeout);
        dragPreviewTimeout = null;
      }
    };
  }, []);

  return {
    dragPreview,
    handleDrop,
    handleDragOver,
    handleDragLeave,
    handleDragEnd,
  };
}
