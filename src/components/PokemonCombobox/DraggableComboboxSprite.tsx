"use client";

import clsx from "clsx";
import dynamic from "next/dynamic";
import type React from "react";
import { useState } from "react";
import { useSnapshot } from "valtio";
import spritesheetMetadata from "@/assets/pokemon-gen8-spritesheet-metadata.json";
import { getLocationByIdFromMerged } from "@/loaders/locations";
import {
  type PokemonOptionType,
  usePokemonEvolutionData,
} from "@/loaders/pokemon";
import { dragActions } from "@/stores/dragStore";
import { playthroughActions } from "@/stores/playthroughs";
import { useCustomLocations } from "@/stores/playthroughs/hooks";
import { settingsStore } from "@/stores/settings";
import usePokemonTypes from "../../hooks/usePokemonTypes";
import ContextMenu from "../context-menu";
import { CursorTooltip } from "../cursor-tooltip";
import { PokemonSprite } from "../PokemonSprite";
import { DraggableSpriteTooltipContent } from "./DraggableSpriteTooltipContent";
import { getDraggableComboboxSpriteMenuOptions } from "./draggable-combobox-sprite-menu";

const LocationSelector = dynamic(
  () =>
    import("../PokemonSummaryCard/LocationSelector").then(
      (mod) => mod.LocationSelector,
    ),
  { ssr: false },
);

interface DraggableComboboxSpriteProps {
  comboboxId?: string;
  disabled?: boolean;
  dragPreview: PokemonOptionType | null;
  locationId?: string;
  value: PokemonOptionType | null | undefined;
}

export function DraggableComboboxSprite({
  value,
  dragPreview,
  comboboxId,
  disabled = false,
  locationId,
}: DraggableComboboxSpriteProps) {
  const pokemon = dragPreview || value;
  const [isMoveModalOpen, setIsMoveModalOpen] = useState(false);
  const customLocations = useCustomLocations();
  const settings = useSnapshot(settingsStore);
  const { primary, secondary } = usePokemonTypes(
    pokemon ? { id: pokemon.id } : undefined,
  );
  const { evolutions, preEvolution } = usePokemonEvolutionData(
    pokemon?.id,
    Boolean(pokemon),
  );
  const field = comboboxId?.includes("-body") ? "body" : "head";

  const menuOptions = getDraggableComboboxSpriteMenuOptions({
    customLocations,
    evolutions,
    field,
    locationId,
    moveEncountersBetweenLocations: settings.moveEncountersBetweenLocations,
    onOpenMoveModal: () => setIsMoveModalOpen(true),
    preEvolution,
    value,
  });

  const originalLocationName =
    !pokemon?.originalLocation || pokemon.originalLocation === locationId
      ? null
      : (getLocationByIdFromMerged(pokemon.originalLocation, customLocations)
          ?.name ?? pokemon.originalLocation);

  if (!pokemon) {
    return null;
  }

  const handleDragStart = (event: React.DragEvent<HTMLDivElement>) => {
    if (disabled || !settingsStore.moveEncountersBetweenLocations) {
      event.preventDefault();
      return;
    }

    const sprite = event.currentTarget.querySelector("img") as HTMLImageElement;
    const spriteMetadata = spritesheetMetadata.sprites.find(
      (metadata) => metadata.id === pokemon.id,
    );
    if (sprite && spriteMetadata) {
      const dragElement = document.createElement("div");
      dragElement.style.cssText = `
        width: ${spriteMetadata.width}px;
        height: ${spriteMetadata.height}px;
        background-image: url(${sprite.src});
        background-position: -${spriteMetadata.x}px -${spriteMetadata.y}px;
        background-repeat: no-repeat;
        position: absolute;
        top: -1000px;
        image-rendering: pixelated;
      `;
      document.body.appendChild(dragElement);
      event.dataTransfer.setDragImage(
        dragElement,
        spriteMetadata.width / 2,
        spriteMetadata.height / 2,
      );
      setTimeout(() => document.body.removeChild(dragElement), 0);
    }

    event.dataTransfer.setData("text/plain", pokemon.name);
    dragActions.startDrag(pokemon.name, comboboxId || "", pokemon);
  };

  return (
    <>
      <ContextMenu items={menuOptions}>
        <div>
          <CursorTooltip
            content={
              <DraggableSpriteTooltipContent
                originalLocationName={originalLocationName}
                primary={primary}
                secondary={secondary}
                showGrabHint={settings.moveEncountersBetweenLocations}
              />
            }
            delay={500}
            disabled={!!dragPreview || disabled}
            offset={{ crossAxis: 8, mainAxis: 8 }}
            placement="bottom-start"
          >
            <div
              className={clsx(
                "absolute inset-y-0 flex items-center rounded-tl-md border-gray-300 border-r bg-gray-300/20 px-1.5 dark:border-gray-600 dark:bg-gray-500/20",
                "flex size-12.5 items-center justify-center",
                "group-focus-within/input:border-blue-500",
                {
                  "cursor-grab active:cursor-grabbing":
                    !disabled && settings.moveEncountersBetweenLocations,
                  "cursor-not-allowed opacity-50": disabled,
                  "pointer-events-none": dragPreview || disabled,
                },
              )}
              draggable={!disabled && settings.moveEncountersBetweenLocations}
              onDragStart={handleDragStart}
            >
              <PokemonSprite
                className={clsx(
                  dragPreview && "pointer-events-none opacity-60",
                )}
                draggable={false}
                pokemonId={pokemon.id}
              />
            </div>
          </CursorTooltip>
        </div>
      </ContextMenu>

      <LocationSelector
        currentLocationId={locationId || ""}
        encounterData={value ? { [field]: value } : null}
        isOpen={isMoveModalOpen}
        moveTargetField={field}
        onClose={() => setIsMoveModalOpen(false)}
        onSelectLocation={(targetLocationId, targetField) => {
          if (value && locationId) {
            void playthroughActions.relocateEncounterSlot({
              sourceField: field,
              sourceLocationId: locationId,
              targetField,
              targetLocationId,
            });
          }
          setIsMoveModalOpen(false);
        }}
      />
    </>
  );
}
