import { isEggId, type PokemonOptionType } from "@/loaders/pokemon";
import { isPokemonDeceased } from "@/utils/pokemonPredicates";
import {
  type DisplayPokemon,
  getDisplayPokemon,
  getNicknameText,
} from "./utils";

type SummaryCardDisplayInput = {
  headPokemon?: PokemonOptionType | null;
  bodyPokemon?: PokemonOptionType | null;
  isFusion: boolean;
  isTeamMember: boolean;
  nickname?: string;
};

export type SummaryCardDisplay = {
  displayPokemon: DisplayPokemon;
  eitherPokemonIsEgg: boolean;
  isDeceased: boolean;
  link: string;
  name: string;
};

function getDisplayPokemonForSummary(
  headPokemon: PokemonOptionType | null | undefined,
  bodyPokemon: PokemonOptionType | null | undefined,
  isFusion: boolean,
  isTeamMember: boolean,
) {
  if (isTeamMember) {
    return { head: headPokemon ?? null, body: bodyPokemon ?? null, isFusion };
  }

  return getDisplayPokemon(headPokemon ?? null, bodyPokemon ?? null, isFusion);
}

function getSummaryCardName(
  displayPokemon: DisplayPokemon,
  nickname: string | undefined,
) {
  if (nickname !== undefined) {
    return (
      nickname || displayPokemon.head?.name || displayPokemon.body?.name || ""
    );
  }

  return (
    getNicknameText(
      displayPokemon.head,
      displayPokemon.body,
      displayPokemon.isFusion,
    ) || ""
  );
}

function isSummaryCardDeceased(
  headPokemon: PokemonOptionType | null | undefined,
  bodyPokemon: PokemonOptionType | null | undefined,
  isFusion: boolean,
) {
  const headDead = isPokemonDeceased(headPokemon);
  const bodyDead = isPokemonDeceased(bodyPokemon);

  return isFusion && headPokemon && bodyPokemon
    ? headDead && bodyDead
    : headDead || bodyDead;
}

function getSummaryCardLink(
  displayPokemon: DisplayPokemon,
  eitherPokemonIsEgg: boolean,
) {
  if (eitherPokemonIsEgg) return "#";

  const headId = displayPokemon.head?.id;
  const bodyId = displayPokemon.body?.id;
  const pokemonId = displayPokemon.isFusion
    ? headId && bodyId
      ? `${headId}.${bodyId}`
      : headId || bodyId
    : headId || bodyId;

  return `https://infinitefusiondex.com/details/${pokemonId}`;
}

export function getSummaryCardDisplay({
  headPokemon,
  bodyPokemon,
  isFusion,
  isTeamMember,
  nickname,
}: SummaryCardDisplayInput): SummaryCardDisplay {
  const eitherPokemonIsEgg =
    isEggId(headPokemon?.id) || isEggId(bodyPokemon?.id);
  const displayPokemon = getDisplayPokemonForSummary(
    headPokemon,
    bodyPokemon,
    isFusion,
    isTeamMember,
  );
  const name = getSummaryCardName(displayPokemon, nickname);
  const isDeceased = isSummaryCardDeceased(headPokemon, bodyPokemon, isFusion);
  const link = getSummaryCardLink(displayPokemon, eitherPokemonIsEgg);

  return { displayPokemon, eitherPokemonIsEgg, isDeceased, link, name };
}
