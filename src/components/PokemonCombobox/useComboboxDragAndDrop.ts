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

  // Memoize expensive computations to avoid recalculating on every render
  const memoizedComputations = useMemo(() => {
    if (!comboboxId) return null;

    return {
      isFromDifferentCombobox:
        dragSnapshot.currentDragSource &&
        dragSnapshot.currentDragSource !== comboboxId,
      comboboxLocation:
        playthroughActions.getLocationFromComboboxId(comboboxId),
    };
  }, [comboboxId, dragSnapshot.currentDragSource]);

  // Memoize can switch computation
  const canSwitch = useMemo(() => {
    return (
      memoizedComputations?.isFromDifferentCombobox &&
      dragSnapshot.currentDragValue &&
      value &&
      dragSnapshot.currentDragValue.uid !== value.uid
    );
  }, [
    memoizedComputations?.isFromDifferentCombobox,
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
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation(); // Prevent event bubbling to parent elements

      // Clear debounced preview immediately
      if (dragPreviewTimeout) {
        clearTimeout(dragPreviewTimeout);
        dragPreviewTimeout = null;
      }
      setDragPreview(null);

      const pokemonName = e.dataTransfer.getData('text/plain');
      if (!pokemonName) return;

      const isFromDifferentCombobox =
        memoizedComputations?.isFromDifferentCombobox;

      if (canSwitch && dragSnapshot.currentDragSource && memoizedComputations) {
        const { locationId: sourceLocationId, field: sourceField } =
          playthroughActions.getLocationFromComboboxId(
            dragSnapshot.currentDragSource
          );
        const { locationId: targetLocationId, field: targetField } =
          memoizedComputations.comboboxLocation;

        playthroughActions.swapEncounters(
          sourceLocationId,
          targetLocationId,
          sourceField,
          targetField
        );
      } else {
        if (dragSnapshot.currentDragValue) {
          if (isFromDifferentCombobox && dragSnapshot.currentDragSource) {
            // Use atomic move to avoid duplicate intermediate states
            const { locationId: sourceLocationId, field: sourceField } =
              playthroughActions.getLocationFromComboboxId(
                dragSnapshot.currentDragSource
              );
            const { locationId: targetLocationId, field: targetField } =
              playthroughActions.getLocationFromComboboxId(comboboxId || '');

            playthroughActions.moveEncounterAtomic(
              sourceLocationId,
              sourceField,
              targetLocationId,
              targetField,
              dragSnapshot.currentDragValue
            );
          } else {
            // Not from different combobox, just set normally
            onChange(dragSnapshot.currentDragValue);
          }
        } else {
          const findPokemonByName = async () => {
            try {
              const allPokemon = await getPokemon();
              const nameMap = await getPokemonNameMap();

              const foundPokemon = allPokemon.find(
                p =>
                  nameMap.get(p.id)?.toLowerCase() === pokemonName.toLowerCase()
              );

              if (foundPokemon) {
                const pokemonOption: PokemonOptionType = {
                  id: foundPokemon.id,
                  name: pokemonName,
                  nationalDexId: foundPokemon.nationalDexId,
                  originalLocation: locationId,
                  ...(dragSnapshot.currentDragValue && {
                    nickname: dragSnapshot.currentDragValue.nickname,
                    status: dragSnapshot.currentDragValue.status,
                  }),
                };

                if (isFromDifferentCombobox && dragSnapshot.currentDragSource) {
                  // Use atomic move to avoid duplicate intermediate states
                  const { locationId: sourceLocationId, field: sourceField } =
                    playthroughActions.getLocationFromComboboxId(
                      dragSnapshot.currentDragSource
                    );
                  const { locationId: targetLocationId, field: targetField } =
                    playthroughActions.getLocationFromComboboxId(
                      comboboxId || ''
                    );

                  playthroughActions.moveEncounterAtomic(
                    sourceLocationId,
                    sourceField,
                    targetLocationId,
                    targetField,
                    pokemonOption
                  );
                } else {
                  // Not from different combobox, just set normally
                  onChange(pokemonOption);
                }
              }
            } catch (err) {
              console.error('Error finding Pokemon by name:', err);
            }
          };

          findPokemonByName();
        }
      }
    },
    [
      onChange,
      canSwitch,
      memoizedComputations,
      dragSnapshot,
      locationId,
      comboboxId,
    ]
  );

  const handleDragOver = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation(); // Prevent event bubbling
      e.dataTransfer.dropEffect = 'copy';

      // Cancel any pending drag leave timeout since we're now hovering over this component
      if (dragLeaveAnimationRef.current !== null) {
        clearTimeout(dragLeaveAnimationRef.current);
        dragLeaveAnimationRef.current = null;
      }

      // Early exit if no drag data to prevent unnecessary work
      if (!dragSnapshot.currentDragValue && !dragSnapshot.currentDragData) {
        return;
      }

      // Optimize preview updates with debouncing and early returns
      if (
        dragSnapshot.currentDragValue &&
        (!dragPreview ||
          dragPreview.name !== dragSnapshot.currentDragValue.name)
      ) {
        setDragPreviewDebounced(dragSnapshot.currentDragValue);
      } else if (
        dragSnapshot.currentDragData &&
        (!dragPreview || dragPreview.name !== dragSnapshot.currentDragData)
      ) {
        const pokemonName = dragSnapshot.currentDragData;

        // Use debounced async operation to avoid expensive repeated lookups
        setDragPreviewDebounced(null); // Clear current preview immediately

        const findPokemonForPreview = async () => {
          try {
            const allPokemon = await getPokemon();
            const nameMap = await getPokemonNameMap();

            // Find Pokemon by name (case insensitive)
            const foundPokemon = allPokemon.find(
              p =>
                nameMap.get(p.id)?.toLowerCase() === pokemonName.toLowerCase()
            );

            if (foundPokemon) {
              const pokemonOption: PokemonOptionType = {
                id: foundPokemon.id,
                name: pokemonName,
                nationalDexId: foundPokemon.nationalDexId,
                // Preserve existing properties for preview
                ...(dragSnapshot.currentDragValue && {
                  nickname: dragSnapshot.currentDragValue.nickname,
                  status: dragSnapshot.currentDragValue.status,
                  originalLocation:
                    dragSnapshot.currentDragValue.originalLocation,
                }),
              };

              // Only update if the drag data hasn't changed
              if (dragSnapshot.currentDragData === pokemonName) {
                setDragPreview(pokemonOption);
              }
            }
          } catch (err) {
            console.error('Error finding Pokemon for preview:', err);
          }
        };

        // Debounce the expensive async operation
        if (dragPreviewTimeout) {
          clearTimeout(dragPreviewTimeout);
        }

        dragPreviewTimeout = window.setTimeout(() => {
          findPokemonForPreview();
          dragPreviewTimeout = null;
        }, DRAG_PREVIEW_DEBOUNCE);
      }
    },
    [
      dragPreview,
      dragSnapshot.currentDragValue,
      dragSnapshot.currentDragData,
      setDragPreviewDebounced,
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
