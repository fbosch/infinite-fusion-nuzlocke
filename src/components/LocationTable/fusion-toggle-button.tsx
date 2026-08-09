"use client";

import { useQueryClient } from "@tanstack/react-query";
import { type DragEvent, useCallback } from "react";
import { useSnapshot } from "valtio";
import type { PokemonOptionType } from "@/loaders/pokemon";
import { isEgg } from "@/loaders/pokemon";
import { dragActions, dragStore } from "@/stores/drag-store";
import { FusionToggleButtonContent } from "./fusion-toggle-button-content";
import { useFusionDrop } from "./use-fusion-drop";

interface FusionToggleButtonProps {
  isFusion: boolean;
  locationId: string;
  onToggleFusion: () => void;
  selectedPokemon: PokemonOptionType | null;
}

export function FusionToggleButton({
  locationId,
  isFusion,
  selectedPokemon,
  onToggleFusion,
}: FusionToggleButtonProps) {
  const dragSnapshot = useSnapshot(dragStore);
  const queryClient = useQueryClient();
  const cannotFuse =
    isFusion || selectedPokemon === null || isEgg(selectedPokemon);
  const { canDropFromCurrentSource, handleDrop } = useFusionDrop({
    cannotFuse,
    locationId,
    queryClient,
    selectedPokemon,
  });

  const handleFusionDrop = useCallback(
    async (e: DragEvent<HTMLButtonElement>) => {
      e.preventDefault();
      e.stopPropagation();
      await handleDrop(e.dataTransfer.getData("text/plain"));
    },
    [handleDrop],
  );

  // Handle drag over
  const handleFusionDragOver = useCallback(
    (e: DragEvent<HTMLButtonElement>) => {
      // Always prevent default to allow drop events to fire
      e.preventDefault();

      if (cannotFuse) {
        e.dataTransfer.dropEffect = "none";
        return;
      }

      e.dataTransfer.dropEffect = canDropFromCurrentSource() ? "copy" : "none";
    },
    [canDropFromCurrentSource, cannotFuse],
  );

  // Handle drag end
  const handleFusionDragEnd = useCallback(() => {
    dragActions.clearDrag();
  }, []);

  const isDropAllowed =
    !cannotFuse && dragSnapshot.isDragging && canDropFromCurrentSource();

  // Disable fusion toggle if not in fusion mode and the selected pokemon is an Egg
  const isDisabled =
    !isFusion && selectedPokemon !== null && isEgg(selectedPokemon);
  return (
    <FusionToggleButtonContent
      isDisabled={isDisabled}
      isDropAllowed={isDropAllowed}
      isFusion={isFusion}
      onClick={onToggleFusion}
      onDragEnd={handleFusionDragEnd}
      onDragOver={handleFusionDragOver}
      onDrop={handleFusionDrop}
      selectedPokemonName={selectedPokemon?.name}
    />
  );
}
