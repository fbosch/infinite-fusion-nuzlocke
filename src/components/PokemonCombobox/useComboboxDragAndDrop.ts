import { useCallback, useRef, useEffect, useState } from 'react';
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

  // Handle drop events on the input
  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation(); // Prevent event bubbling to parent elements

      const pokemonName = e.dataTransfer.getData('text/plain');
      if (pokemonName) {
        // Clear the preview
        setDragPreview(null);

        const isFromDifferentCombobox =
          dragSnapshot.currentDragSource &&
          dragSnapshot.currentDragSource !== comboboxId;

        const canSwitch =
          isFromDifferentCombobox &&
          dragSnapshot.currentDragValue &&
          value &&
          dragSnapshot.currentDragValue.uid !== value.uid;

        if (canSwitch && dragSnapshot.currentDragSource) {
          const { locationId: sourceLocationId, field: sourceField } =
            playthroughActions.getLocationFromComboboxId(
              dragSnapshot.currentDragSource
            );
          const { locationId: targetLocationId, field: targetField } =
            playthroughActions.getLocationFromComboboxId(comboboxId || '');

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
                    nameMap.get(p.id)?.toLowerCase() ===
                    pokemonName.toLowerCase()
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

                  if (
                    isFromDifferentCombobox &&
                    dragSnapshot.currentDragSource
                  ) {
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
      }
    },
    [onChange, comboboxId, value, dragSnapshot, locationId]
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

      if (
        dragSnapshot.currentDragValue &&
        (!dragPreview ||
          dragPreview.name !== dragSnapshot.currentDragValue.name)
      ) {
        setDragPreview(dragSnapshot.currentDragValue);
      } else if (
        dragSnapshot.currentDragData &&
        (!dragPreview || dragPreview.name !== dragSnapshot.currentDragData)
      ) {
        const pokemonName = dragSnapshot.currentDragData;
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
              setDragPreview(pokemonOption);
            }
          } catch (err) {
            console.error('Error finding Pokemon for preview:', err);
          }
        };

        findPokemonForPreview();
      }
    },
    [dragPreview, dragSnapshot.currentDragValue, dragSnapshot.currentDragData]
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

  // Clean up timeout on unmount
  useEffect(() => {
    return () => {
      if (dragLeaveAnimationRef.current !== null) {
        clearTimeout(dragLeaveAnimationRef.current);
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
