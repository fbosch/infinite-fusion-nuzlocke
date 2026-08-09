import type { QueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import { pokemonQueries } from "@/lib/queries/pokemon";
import type { PokemonOptionType } from "@/loaders/pokemon";
import { dragStore } from "@/stores/drag-store";
import { playthroughActions } from "@/stores/playthroughs/index";

const isDifferentCombobox = (
  dragSource: string | null,
  locationId: string,
): dragSource is string =>
  dragSource !== null &&
  dragSource !== `${locationId}-single` &&
  dragSource !== `${locationId}-head` &&
  dragSource !== `${locationId}-body`;

const findPokemon = (allPokemon: PokemonOptionType[], pokemonName: string) =>
  allPokemon.find(
    (option) => option.name.toLowerCase() === pokemonName.toLowerCase(),
  );

const createFusionPokemon = (
  pokemon: PokemonOptionType,
  pokemonName: string,
  dragValue: PokemonOptionType | null,
  locationId: string,
): PokemonOptionType => ({
  id: pokemon.id,
  name: pokemonName,
  nationalDexId: pokemon.nationalDexId,
  originalLocation: dragValue?.originalLocation || locationId,
  ...(dragValue && {
    nickname: dragValue.nickname,
    status: dragValue.status,
    uid: dragValue.uid,
  }),
});

const clearDragSourceEncounter = async (dragSource: string) => {
  const { locationId, field } =
    playthroughActions.getLocationFromComboboxId(dragSource);
  await playthroughActions.clearEncounterFromLocation(locationId, field, {
    preserveTeamMembership: true,
  });
};

interface UseFusionDropProps {
  cannotFuse: boolean;
  locationId: string;
  queryClient: QueryClient;
  selectedPokemon: PokemonOptionType | null;
}

export function useFusionDrop({
  cannotFuse,
  locationId,
  queryClient,
  selectedPokemon,
}: UseFusionDropProps) {
  const handleDrop = useCallback(
    async (pokemonName: string) => {
      const dragSource = dragStore.currentDragSource;
      const dragValue = dragStore.currentDragValue;
      if (
        !pokemonName ||
        cannotFuse ||
        !selectedPokemon ||
        !isDifferentCombobox(dragSource, locationId)
      ) {
        return;
      }

      let allPokemon: PokemonOptionType[];
      try {
        allPokemon = await queryClient.fetchQuery(pokemonQueries.all());
      } catch (error) {
        console.error("Error loading Pokemon:", error);
        return;
      }

      const pokemon = findPokemon(allPokemon, pokemonName);
      if (!pokemon) {
        return;
      }

      const fusionPokemon = createFusionPokemon(
        pokemon,
        pokemonName,
        dragValue ?? null,
        locationId,
      );
      try {
        await playthroughActions.createFusion(
          locationId,
          selectedPokemon,
          fusionPokemon,
        );
        await clearDragSourceEncounter(dragSource);
      } catch (error) {
        console.error("Error finding Pokemon by name:", error);
      }
    },
    [cannotFuse, locationId, queryClient, selectedPokemon],
  );

  const canDropFromCurrentSource = useCallback(
    () =>
      !cannotFuse &&
      isDifferentCombobox(dragStore.currentDragSource, locationId),
    [cannotFuse, locationId],
  );

  return { canDropFromCurrentSource, handleDrop };
}
