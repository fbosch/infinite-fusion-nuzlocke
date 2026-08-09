import { getLocationById } from "@/loaders/locations";
import type { PokemonOptionType } from "@/loaders/pokemon";
import type { PendingOverwrite } from "./use-confirmation-dialog-state";

const getPokemonDataText = (pokemon: PokemonOptionType) => {
  const details = [
    pokemon.status &&
      `with the status "${pokemon.status.charAt(0).toUpperCase() + pokemon.status.slice(1)}"`,
    pokemon.originalLocation &&
      `which was encountered at the location: "${getLocationById(pokemon.originalLocation)?.name}"`,
  ].filter(Boolean);

  return details.length > 1
    ? `${details.slice(0, -1).join(", ")} and ${details.at(-1)}`
    : (details[0] ?? "");
};

export const getClearConfirmationMessage = (pokemon: PokemonOptionType) => {
  const dataText = getPokemonDataText(pokemon);
  return `This will permanently remove ${pokemon.nickname ? `${pokemon.nickname} ` : ""}the ${pokemon.name}${dataText ? ` ${dataText}` : ""}.`;
};

const getPokemonOverwriteMessage = (
  currentPokemon: PokemonOptionType,
  newPokemon: PokemonOptionType,
) => {
  const dataText = getPokemonDataText(currentPokemon);
  return `This will replace ${currentPokemon.nickname ? `${currentPokemon.nickname} the ` : ""}${currentPokemon.name}${dataText ? ` ${dataText}` : ""} with ${newPokemon.name}?`;
};

const getFusionOverwriteMessage = (
  currentPokemon: PokemonOptionType[],
  head: PokemonOptionType,
  body: PokemonOptionType,
) => {
  const replacedPokemon = currentPokemon
    .map((pokemon) => {
      const name = pokemon.nickname
        ? `${pokemon.nickname} the ${pokemon.name}`
        : pokemon.name;
      const dataText = getPokemonDataText(pokemon);
      return `${name}${dataText ? ` ${dataText}` : ""}`;
    })
    .join(" and ");
  return `This will replace ${replacedPokemon} with the fusion ${head.name}/${body.name}?`;
};

export const getOverwriteConfirmationMessage = (
  pendingOverwrite: PendingOverwrite | null,
) => {
  if (!pendingOverwrite) {
    return "";
  }

  return pendingOverwrite.kind === "fusion"
    ? getFusionOverwriteMessage(
        pendingOverwrite.currentPokemon,
        pendingOverwrite.head,
        pendingOverwrite.body,
      )
    : getPokemonOverwriteMessage(
        pendingOverwrite.currentPokemon,
        pendingOverwrite.newPokemon,
      );
};
