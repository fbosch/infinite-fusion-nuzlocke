import { ArrowDownToDot, ArrowUpRight, Atom, Home, Undo2 } from "lucide-react";
import { emitEvolutionEvent } from "@/lib/events";
import { getLocationByIdFromMerged, getLocations } from "@/loaders/locations";
import { isEggId, type PokemonOptionType } from "@/loaders/pokemon";
import { playthroughActions } from "@/stores/playthroughs";
import { getActivePlaythrough } from "@/stores/playthroughs/store";
import type { EncounterData } from "@/stores/playthroughs/types";
import type { ContextMenuItem } from "../ContextMenu";
import { PokemonSprite } from "../PokemonSprite";

type EncounterField = "head" | "body";

interface DraggableComboboxSpriteMenuOptions {
  value: PokemonOptionType | null | undefined;
  locationId?: string;
  field: EncounterField;
  customLocations: Parameters<typeof getLocationByIdFromMerged>[1];
  moveEncountersBetweenLocations: boolean;
  preEvolution: PokemonOptionType | null;
  evolutions: PokemonOptionType[];
  onOpenMoveModal: () => void;
}

function wouldCreateEggFusionAtOriginalLocation(
  value: PokemonOptionType | null | undefined,
  locationId: string | undefined,
  field: EncounterField,
) {
  if (!value?.originalLocation || !locationId) return false;

  const encounters = getActivePlaythrough()?.encounters as
    | Record<string, EncounterData>
    | undefined;
  const originalEncounter = encounters?.[value.originalLocation];
  if (!originalEncounter) return false;

  return originalEncounter.isFusion
    ? wouldCreateEggFusionInFusion(originalEncounter, value.id, field)
    : wouldCreateEggFusionInSingleEncounter(originalEncounter, value.id);
}

function wouldCreateEggFusionInFusion(
  encounter: EncounterData,
  pokemonId: number,
  field: EncounterField,
) {
  const oppositeField = field === "head" ? "body" : "head";
  const oppositePokemon = encounter[oppositeField];
  return Boolean(
    (isEggId(pokemonId) && oppositePokemon) ||
      (oppositePokemon && isEggId(oppositePokemon.id)),
  );
}

function wouldCreateEggFusionInSingleEncounter(
  encounter: EncounterData,
  pokemonId: number,
) {
  const { head: headPokemon, body: bodyPokemon } = encounter;
  return Boolean(
    (isEggId(pokemonId) && (headPokemon || bodyPokemon)) ||
      (headPokemon && isEggId(headPokemon.id)) ||
      (bodyPokemon && isEggId(bodyPokemon.id)),
  );
}

function getEvolutionLabel(pokemon: PokemonOptionType, action: string) {
  return (
    <div className="flex items-center gap-x-2 w-full">
      <div className="flex items-center justify-center size-6 flex-shrink-0">
        <PokemonSprite pokemonId={pokemon.id} generation="gen7" />
      </div>
      <span className="truncate">
        {action && `${action} `}
        {pokemon.name}
      </span>
    </div>
  );
}

async function updateEvolution(
  value: PokemonOptionType,
  locationId: string,
  field: EncounterField,
  evolution: PokemonOptionType,
  emitEvent: boolean,
) {
  await playthroughActions.updateEncounter(
    locationId,
    {
      ...value,
      id: evolution.id,
      name: evolution.name,
      nationalDexId: evolution.nationalDexId,
    },
    field,
    false,
  );

  if (emitEvent) emitEvolutionEvent(locationId);
}

function getEvolutionMenuItem(
  evolution: PokemonOptionType,
  value: PokemonOptionType,
  locationId: string,
  field: EncounterField,
  action: "Devolve to" | "Evolve to",
  emitEvent: boolean,
  icon?: typeof Atom | typeof Undo2,
): ContextMenuItem {
  return {
    id: `${action === "Devolve to" ? "devolve" : "evolve"}-${evolution.id}`,
    label: getEvolutionLabel(evolution, action),
    ...(icon ? { icon } : {}),
    onClick: () =>
      updateEvolution(value, locationId, field, evolution, emitEvent),
  };
}

function getMoveMenuOptions({
  value,
  locationId,
  field,
  customLocations,
  onOpenMoveModal,
}: Pick<
  DraggableComboboxSpriteMenuOptions,
  "value" | "locationId" | "field" | "customLocations" | "onOpenMoveModal"
>) {
  if (!value || !locationId) return [];

  const menuOptions: ContextMenuItem[] = [];
  if (value.originalLocation && value.originalLocation !== locationId) {
    const originalLocation = getLocationByIdFromMerged(
      value.originalLocation,
      customLocations,
    );
    if (originalLocation) {
      const disabled = wouldCreateEggFusionAtOriginalLocation(
        value,
        locationId,
        field,
      );
      menuOptions.push({
        id: "move-to-original",
        label: "Move to Original Location",
        tooltip: disabled
          ? "Cannot move to original location - would create egg fusion"
          : originalLocation.name,
        icon: Home,
        onClick: () =>
          playthroughActions.moveToOriginalLocation(locationId, field, value),
        disabled,
      });
    }
  }

  if (getLocations().some((location) => location.id !== locationId)) {
    menuOptions.push({
      id: "move",
      label: "Move to Location",
      icon: ArrowDownToDot,
      onClick: onOpenMoveModal,
    });
  }
  return menuOptions;
}

function getEvolutionMenuOptions({
  value,
  locationId,
  field,
  preEvolution,
  evolutions,
  includeSeparator,
}: Pick<
  DraggableComboboxSpriteMenuOptions,
  "value" | "locationId" | "field" | "preEvolution" | "evolutions"
> & { includeSeparator: boolean }) {
  if (!value || !locationId) return [];

  const menuOptions: ContextMenuItem[] = [];
  if (includeSeparator && (preEvolution || evolutions.length > 0)) {
    menuOptions.push({ id: "evolve-separator", separator: true });
  }
  if (preEvolution) {
    menuOptions.push(
      getEvolutionMenuItem(
        preEvolution,
        value,
        locationId,
        field,
        "Devolve to",
        false,
        Undo2,
      ),
    );
  }
  if (evolutions.length === 0) return menuOptions;

  const evolutionItems = evolutions.map((evolution) =>
    getEvolutionMenuItem(
      evolution,
      value,
      locationId,
      field,
      "Evolve to",
      true,
    ),
  );
  menuOptions.push(
    evolutions.length === 1
      ? getEvolutionMenuItem(
          evolutions[0]!,
          value,
          locationId,
          field,
          "Evolve to",
          true,
          Atom,
        )
      : {
          id: "evolve",
          label: "Evolve to…",
          icon: Atom,
          children: evolutionItems.map((item, index) => ({
            ...item,
            label: getEvolutionLabel(evolutions[index]!, ""),
          })),
        },
  );
  return menuOptions;
}

export function getDraggableComboboxSpriteMenuOptions({
  value,
  locationId,
  field,
  customLocations,
  moveEncountersBetweenLocations,
  preEvolution,
  evolutions,
  onOpenMoveModal,
}: DraggableComboboxSpriteMenuOptions) {
  const menuOptions: ContextMenuItem[] = [];
  if (moveEncountersBetweenLocations) {
    menuOptions.push(
      ...getMoveMenuOptions({
        value,
        locationId,
        field,
        customLocations,
        onOpenMoveModal,
      }),
    );
  }
  menuOptions.push(
    ...getEvolutionMenuOptions({
      value,
      locationId,
      field,
      preEvolution,
      evolutions,
      includeSeparator: moveEncountersBetweenLocations,
    }),
  );

  if (!value) return menuOptions;

  menuOptions.push(
    { id: "separator", separator: true },
    {
      id: "infinitefusiondex",
      label: "Open InfiniteDex entry",
      href: `https://infinitefusiondex.com/details/${value.id}`,
      target: "_blank",
      favicon: "https://infinitefusiondex.com/images/favicon.ico",
      icon: ArrowUpRight,
      iconClassName: "dark:text-blue-300 text-blue-400",
    },
    {
      id: "fusiondex",
      label: "Open FusionDex entry",
      href: `https://fusiondex.org/sprite/pif/${value.id}/`,
      target: "_blank",
      favicon: "https://www.fusiondex.org/favicon.ico",
      icon: ArrowUpRight,
      iconClassName: "dark:text-blue-300 text-blue-400",
    },
  );

  return menuOptions;
}
