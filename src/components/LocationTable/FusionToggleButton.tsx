"use client";

import { useQueryClient } from "@tanstack/react-query";
import clsx from "clsx";
import { Dna, DnaOff } from "lucide-react";
import Image from "next/image";
import type React from "react";
import { useSnapshot } from "valtio";
import { DNA_SPLICER_ICON } from "@/constants/items";
import { pokemonQueries } from "@/lib/queries/pokemon";
import type { PokemonOptionType } from "@/loaders/pokemon";
import { isEgg } from "@/loaders/pokemon";
import { dragActions, dragStore } from "@/stores/dragStore";
import { playthroughActions } from "@/stores/playthroughs/index";
import { CursorTooltip } from "../CursorTooltip";

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

  // Handle drop on fusion button
  const handleFusionDrop = async (e: React.DragEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();

    const pokemonName = e.dataTransfer.getData("text/plain");
    if (!pokemonName) {
      return;
    }

    // Event handlers must use the drag state that is current for this drop.
    // Keep it after the async fusion completes because global drop handlers clear it.
    const dragSource = dragStore.currentDragSource;
    const dragValue = dragStore.currentDragValue;

    // Check if this drop is from a different combobox
    const isFromDifferentCombobox =
      dragSource &&
      dragSource !== `${locationId}-single` &&
      dragSource !== `${locationId}-head` &&
      dragSource !== `${locationId}-body`;

    if (!isFromDifferentCombobox) {
      return;
    }

    // Only allow dropping if this row is not already a fusion and has an existing encounter
    if (isFusion || !selectedPokemon) {
      return;
    }

    // Prevent dropping if the button is disabled (Egg in non-fusion mode)
    if (!isFusion && selectedPokemon && isEgg(selectedPokemon)) {
      return;
    }

    let allPokemon: PokemonOptionType[];
    try {
      allPokemon = await queryClient.fetchQuery(pokemonQueries.all());
    } catch (error) {
      console.error("Error loading Pokemon:", error);
      return;
    }

    const foundPokemon = allPokemon.find(
      (pokemon) => pokemon.name.toLowerCase() === pokemonName.toLowerCase(),
    );

    if (!foundPokemon) {
      return;
    }

    const pokemonOption: PokemonOptionType = {
      id: foundPokemon.id,
      name: pokemonName,
      nationalDexId: foundPokemon.nationalDexId,
      originalLocation: dragValue?.originalLocation || locationId,
      ...(dragValue && {
        nickname: dragValue.nickname,
        status: dragValue.status,
        uid: dragValue.uid,
      }),
    };

    await playthroughActions
      .createFusion(locationId, selectedPokemon, pokemonOption)
      .then(async () => {
        if (!dragSource) {
          return;
        }

        const { locationId: sourceLocationId, field: sourceField } =
          playthroughActions.getLocationFromComboboxId(dragSource);
        await playthroughActions.clearEncounterFromLocation(
          sourceLocationId,
          sourceField,
          { preserveTeamMembership: true },
        );
      })
      .catch((err) => {
        console.error("Error finding Pokemon by name:", err);
      });
  };

  // Handle drag over
  const handleFusionDragOver = (e: React.DragEvent<HTMLButtonElement>) => {
    // Always prevent default to allow drop events to fire
    e.preventDefault();

    // Only allow drop if this row is not already a fusion and has an existing encounter
    if (isFusion || !selectedPokemon) {
      e.dataTransfer.dropEffect = "none";
      return;
    }

    // Prevent drop if the button is disabled (Egg in non-fusion mode)
    if (!isFusion && selectedPokemon && isEgg(selectedPokemon)) {
      e.dataTransfer.dropEffect = "none";
      return;
    }

    // Check if drag is from a different combobox
    const dragSource = dragStore.currentDragSource;
    const isFromDifferentCombobox =
      dragSource &&
      dragSource !== `${locationId}-single` &&
      dragSource !== `${locationId}-head` &&
      dragSource !== `${locationId}-body`;

    if (isFromDifferentCombobox) {
      e.dataTransfer.dropEffect = "copy";
    } else {
      e.dataTransfer.dropEffect = "none";
    }
  };

  // Handle drag end
  const handleFusionDragEnd = () => {
    dragActions.clearDrag();
  };

  const isDropAllowed =
    !isFusion &&
    selectedPokemon &&
    !isEgg(selectedPokemon) &&
    dragSnapshot.isDragging &&
    dragSnapshot.currentDragSource &&
    dragSnapshot.currentDragSource !== `${locationId}-single` &&
    dragSnapshot.currentDragSource !== `${locationId}-head` &&
    dragSnapshot.currentDragSource !== `${locationId}-body`;

  // Disable fusion toggle if not in fusion mode and the selected pokemon is an Egg
  const isDisabled = Boolean(
    !isFusion && selectedPokemon && isEgg(selectedPokemon),
  );

  return (
    <button
      aria-label={
        isDisabled
          ? "Cannot fuse Eggs"
          : `Toggle fusion for ${selectedPokemon?.name || "Pokemon"}`
      }
      className={clsx(
        "group",
        "flex size-10 items-center justify-center self-center",
        "rounded-md border p-2 transition-all duration-200",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2",
        {
          // Drop allowed indicator
          "bg-blue-50 ring-2 ring-blue-500 ring-opacity-50 dark:bg-blue-900/20":
            isDropAllowed && !isDisabled,
          // Disabled state
          "cursor-not-allowed border-gray-200 bg-gray-100 text-gray-400 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-500":
            isDisabled,
          // Non-fusion mode (enabled)
          "cursor-pointer border-gray-300 bg-white text-gray-700 hover:border-green-600 hover:bg-green-700 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-green-700":
            !(isFusion || isDisabled),
          // Fusion mode (enabled)
          "cursor-pointer border-gray-300 bg-white text-gray-700 hover:border-red-600 hover:bg-red-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300":
            isFusion,
        },
      )}
      disabled={isDisabled}
      onClick={onToggleFusion}
      onDragEnd={handleFusionDragEnd}
      onDragOver={handleFusionDragOver}
      onDrop={handleFusionDrop}
      type="button"
    >
      <CursorTooltip
        content={
          <div className="flex items-center gap-2">
            <Image
              alt="DNA Splicer"
              className="image-rendering-pixelated object-contain object-center"
              height={24}
              src={DNA_SPLICER_ICON}
              width={24}
            />
            <span className="text-sm">
              {isDisabled ? "Cannot fuse Eggs" : isFusion ? "Unfuse" : "Fuse"}
            </span>
          </div>
        }
        delay={300}
      >
        {isFusion ? (
          <DnaOff
            className={clsx(
              "size-6",
              isDisabled
                ? "text-gray-400 dark:text-gray-500"
                : "group-hover:text-white",
            )}
          />
        ) : (
          <Dna
            className={clsx(
              "size-6",
              isDisabled
                ? "text-gray-400 dark:text-gray-500"
                : "group-hover:text-white",
            )}
          />
        )}
      </CursorTooltip>
    </button>
  );
}
