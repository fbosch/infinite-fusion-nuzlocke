"use client";

import clsx from "clsx";
import dynamic from "next/dynamic";
import type React from "react";
import { useCallback, useState } from "react";
import { useSnapshot } from "valtio";
import spritesheetMetadata from "@/assets/pokemon-gen8-spritesheet-metadata.json";
import type { TypeName } from "@/lib/typings";
import { getLocationByIdFromMerged } from "@/loaders/locations";
import {
  type PokemonOptionType,
  usePokemonEvolutionData,
} from "@/loaders/pokemon";
import { dragActions } from "@/stores/drag-store";
import { playthroughActions } from "@/stores/playthroughs";
import { useCustomLocations } from "@/stores/playthroughs/hooks";
import { settingsStore } from "@/stores/settings";
import { usePokemonTypes } from "../../hooks/use-pokemon-types";
import ContextMenu from "../context-menu";
import { CursorTooltip } from "../cursor-tooltip";
import { PokemonSprite } from "../pokemon-sprite";
import { getDraggableComboboxSpriteMenuOptions } from "./draggable-combobox-sprite-menu";
import { DraggableSpriteTooltipContent } from "./draggable-sprite-tooltip-content";

const LocationSelector = dynamic(
  () =>
    import("../PokemonSummaryCard/location-selector").then(
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

interface DraggableSpriteProps {
  comboboxId?: string;
  disabled: boolean;
  dragPreview: PokemonOptionType | null;
  moveEncountersBetweenLocations: boolean;
  originalLocationName: string | null;
  pokemon: PokemonOptionType;
  primary?: TypeName;
  secondary?: TypeName;
}

function setSpriteDragImage(
  event: React.DragEvent<HTMLImageElement>,
  pokemonId: number,
) {
  const spriteMetadata = spritesheetMetadata.sprites.find(
    (metadata) => metadata.id === pokemonId,
  );
  if (!spriteMetadata) {
    return;
  }

  const dragElement = document.createElement("div");
  dragElement.style.cssText = `
    width: ${spriteMetadata.width}px;
    height: ${spriteMetadata.height}px;
    background-image: url(${event.currentTarget.src});
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

function DraggableSprite({
  comboboxId,
  disabled,
  dragPreview,
  moveEncountersBetweenLocations,
  originalLocationName,
  pokemon,
  primary,
  secondary,
}: DraggableSpriteProps) {
  const canDrag = disabled === false && moveEncountersBetweenLocations;
  const handleDragStart = useCallback(
    (event: React.DragEvent<HTMLImageElement>) => {
      if (disabled || !settingsStore.moveEncountersBetweenLocations) {
        event.preventDefault();
        return;
      }

      setSpriteDragImage(event, pokemon.id);
      event.dataTransfer.setData("text/plain", pokemon.name);
      dragActions.startDrag(pokemon.name, comboboxId || "", pokemon);
    },
    [comboboxId, disabled, pokemon],
  );

  return (
    <div>
      <CursorTooltip
        content={
          <DraggableSpriteTooltipContent
            originalLocationName={originalLocationName}
            primary={primary}
            secondary={secondary}
            showGrabHint={moveEncountersBetweenLocations}
          />
        }
        delay={500}
        disabled={Boolean(dragPreview) || disabled}
        offset={{ crossAxis: 8, mainAxis: 8 }}
        placement="bottom-start"
      >
        <div
          className={clsx(
            "absolute inset-y-0 flex items-center rounded-tl-md border-gray-300 border-r bg-gray-300/20 px-1.5 dark:border-gray-600 dark:bg-gray-500/20",
            "flex size-12.5 items-center justify-center",
            "group-focus-within/input:border-blue-500",
            {
              "cursor-grab active:cursor-grabbing": canDrag,
              "cursor-not-allowed opacity-50": disabled,
              "pointer-events-none": Boolean(dragPreview) || disabled,
            },
          )}
          draggable={canDrag}
        >
          <PokemonSprite
            className={clsx(dragPreview && "pointer-events-none opacity-60")}
            draggable={canDrag}
            onDragStart={handleDragStart}
            pokemonId={pokemon.id}
          />
        </div>
      </CursorTooltip>
    </div>
  );
}

function useMoveModal(
  field: "body" | "head",
  locationId: string | undefined,
  value: PokemonOptionType | null | undefined,
) {
  const [isMoveModalOpen, setIsMoveModalOpen] = useState(false);

  const openMoveModal = useCallback(() => setIsMoveModalOpen(true), []);
  const closeMoveModal = useCallback(() => setIsMoveModalOpen(false), []);
  const selectLocation = useCallback(
    (targetLocationId: string, targetField: "body" | "head") => {
      if (value && locationId) {
        playthroughActions.relocateEncounterSlot({
          sourceField: field,
          sourceLocationId: locationId,
          targetField,
          targetLocationId,
        });
      }
      closeMoveModal();
    },
    [closeMoveModal, field, locationId, value],
  );

  return { closeMoveModal, isMoveModalOpen, openMoveModal, selectLocation };
}

export function DraggableComboboxSprite({
  value,
  dragPreview,
  comboboxId,
  disabled = false,
  locationId,
}: DraggableComboboxSpriteProps) {
  const pokemon = dragPreview || value;
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
  const { closeMoveModal, isMoveModalOpen, openMoveModal, selectLocation } =
    useMoveModal(field, locationId, value);

  const menuOptions = getDraggableComboboxSpriteMenuOptions({
    customLocations,
    evolutions,
    field,
    locationId,
    moveEncountersBetweenLocations: settings.moveEncountersBetweenLocations,
    onOpenMoveModal: openMoveModal,
    preEvolution,
    value,
  });

  const originalLocationId = pokemon?.originalLocation;
  const originalLocation =
    originalLocationId && originalLocationId !== locationId
      ? getLocationByIdFromMerged(originalLocationId, customLocations)
      : null;
  const originalLocationName = originalLocation ? originalLocation.name : null;

  if (!pokemon) {
    return null;
  }

  return (
    <>
      <ContextMenu items={menuOptions}>
        <DraggableSprite
          comboboxId={comboboxId}
          disabled={disabled}
          dragPreview={dragPreview}
          moveEncountersBetweenLocations={
            settings.moveEncountersBetweenLocations
          }
          originalLocationName={originalLocationName}
          pokemon={pokemon}
          primary={primary}
          secondary={secondary}
        />
      </ContextMenu>

      <LocationSelector
        currentLocationId={locationId || ""}
        encounterData={value ? { [field]: value } : null}
        isOpen={isMoveModalOpen}
        moveTargetField={field}
        onClose={closeMoveModal}
        onSelectLocation={selectLocation}
      />
    </>
  );
}
