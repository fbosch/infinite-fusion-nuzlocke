import {
  ArrowLeftRight,
  Atom,
  Computer,
  Loader2,
  MapPin,
  Replace,
  Skull,
  Undo2,
} from "lucide-react";
import dynamic from "next/dynamic";
import { useCallback, useState } from "react";
import BodyIcon from "@/assets/images/body.svg";
import HeadIcon from "@/assets/images/head.svg";
import { ContextMenu, type ContextMenuItem } from "@/components/context-menu";
import { usePreferredVariantState, useSpriteVariants } from "@/hooks/useSprite";
import { emitEvolutionEvent } from "@/lib/events";
import { getSpriteId } from "@/lib/sprites";
import {
  isEggId,
  type Pokemon,
  type PokemonOptionType,
  PokemonStatus,
  type PokemonStatusType,
  usePokemonEvolutionData,
} from "@/loaders/pokemon";
import { playthroughActions } from "@/stores/playthroughs/index";
import { scrollToLocationById } from "@/utils/scrollToLocation";
import { PokemonSprite } from "../PokemonSprite";
import { createExternalDexItems } from "./pokemon-context-menu";

const ArtworkVariantModal = dynamic(
  () =>
    import("./artwork-variant-modal").then((mod) => mod.ArtworkVariantModal),
  {
    ssr: false,
  },
);

const BOXABLE_STATUSES = new Set<PokemonStatusType>([
  PokemonStatus.CAPTURED,
  PokemonStatus.RECEIVED,
  PokemonStatus.TRADED,
  PokemonStatus.DECEASED,
]);

interface PokemonSectionOptions {
  evolutions: Pokemon[] | undefined;
  onDevolve: () => void;
  onEvolve: (evolution: Pokemon) => void;
  onGoToEncounter: () => void;
  pokemon: PokemonOptionType | null | undefined;
  preEvolution: Pokemon | null;
  showHeader: boolean;
  slot: "head" | "body";
}

interface TeamMemberContextActions {
  onDevolveBody: () => void;
  onDevolveHead: () => void;
  onEvolveBody: (evolution: Pokemon) => void;
  onEvolveHead: (evolution: Pokemon) => void;
  onGoToBodyEncounter: () => void;
  onGoToHeadEncounter: () => void;
  onMarkAsDeceased: () => void;
  onMoveToBox: () => void;
  onOpenVariantModal: () => void;
  onReverseFusion: () => void;
}

interface TeamMemberContextItemOptions {
  actions: TeamMemberContextActions;
  bodyEvolutions: Pokemon[] | undefined;
  bodyPokemon: PokemonOptionType | null | undefined;
  bodyPreEvolution: Pokemon | null;
  hasArtVariants: boolean | undefined;
  headEvolutions: Pokemon[] | undefined;
  headPokemon: PokemonOptionType | null | undefined;
  headPreEvolution: Pokemon | null;
  isLoadingVariants: boolean;
  preferredVariant: string | null | undefined;
}

interface TeamMemberContextActionOptions {
  bodyPokemon: PokemonOptionType | null | undefined;
  bodyPreEvolution: Pokemon | null;
  hasFusionPair: boolean;
  headPokemon: PokemonOptionType | null | undefined;
  headPreEvolution: Pokemon | null;
  onClose: (() => void) | undefined;
  onOpenVariantModal: () => void;
  position: number;
}

function createPokemonActionLabel(pokemon: Pokemon, action: string) {
  return (
    <div className="flex w-full items-center gap-x-2">
      <div className="flex size-6 flex-shrink-0 items-center justify-center">
        <PokemonSprite generation="gen7" pokemonId={pokemon.id} />
      </div>
      <span className="truncate">
        {action ? `${action} ` : null}
        {pokemon.name}
      </span>
    </div>
  );
}

function createSectionHeader(
  slot: PokemonSectionOptions["slot"],
): ContextMenuItem {
  const isHead = slot === "head";
  const SectionIcon = isHead ? HeadIcon : BodyIcon;
  const sectionName = isHead ? "Head" : "Body";

  return {
    id: `${slot}-section-header`,
    label: (
      <div className="flex items-center gap-1.5 px-1 py-0.5">
        <SectionIcon className="h-3.5 w-3.5 text-gray-500 dark:text-gray-400" />
        <span className="font-medium text-gray-500 text-xs uppercase tracking-wide dark:text-gray-400">
          {sectionName}
        </span>
      </div>
    ),
    visualOnly: true,
  };
}

function createEvolutionItems({
  evolutions,
  onEvolve,
  slot,
}: Pick<
  PokemonSectionOptions,
  "evolutions" | "onEvolve" | "slot"
>): ContextMenuItem[] {
  if (evolutions === undefined || evolutions.length === 0) {
    return [];
  }

  if (evolutions.length === 1) {
    const [evolution] = evolutions;
    return [
      {
        icon: Atom,
        id: `evolve-${slot}-${evolution.id}`,
        label: createPokemonActionLabel(evolution, "Evolve to"),
        onClick: () => onEvolve(evolution),
      },
    ];
  }

  return [
    {
      children: evolutions.map((evolution) => ({
        id: `evolve-${slot}-${evolution.id}`,
        label: createPokemonActionLabel(evolution, ""),
        onClick: () => onEvolve(evolution),
      })),
      icon: Atom,
      id: `evolve-${slot}`,
      label: "Evolve to…",
    },
  ];
}

function createPokemonSectionItems({
  slot,
  pokemon,
  evolutions,
  preEvolution,
  showHeader,
  onDevolve,
  onEvolve,
  onGoToEncounter,
}: PokemonSectionOptions): ContextMenuItem[] {
  const hasActions = Boolean(
    evolutions?.length || preEvolution || pokemon?.originalLocation,
  );
  if (!(pokemon && hasActions)) {
    return [];
  }

  return [
    ...createSectionStartItems(slot, showHeader),
    ...createDevolutionItems(slot, preEvolution, onDevolve),
    ...createEvolutionItems({ evolutions, onEvolve, slot }),
    ...createEncounterNavigationItems(slot, pokemon, onGoToEncounter),
  ];
}

function createSectionStartItems(
  slot: PokemonSectionOptions["slot"],
  showHeader: boolean,
): ContextMenuItem[] {
  const separator = { id: `${slot}-section-separator`, separator: true };
  return showHeader ? [separator, createSectionHeader(slot)] : [separator];
}

function createDevolutionItems(
  slot: PokemonSectionOptions["slot"],
  preEvolution: Pokemon | null,
  onDevolve: () => void,
): ContextMenuItem[] {
  if (!preEvolution) {
    return [];
  }

  return [
    {
      icon: Undo2,
      id: `devolve-${slot}`,
      label: createPokemonActionLabel(preEvolution, "Devolve to"),
      onClick: onDevolve,
    },
  ];
}

function createEncounterNavigationItems(
  slot: PokemonSectionOptions["slot"],
  pokemon: PokemonOptionType,
  onGoToEncounter: () => void,
): ContextMenuItem[] {
  if (!pokemon.originalLocation) {
    return [];
  }

  return [
    {
      icon: MapPin,
      id: `go-to-${slot}-encounter`,
      label: "Go to Encounter",
      onClick: onGoToEncounter,
      tooltip: "Navigate to the location where this Pokémon was encountered",
    },
  ];
}

function getVariantTooltip(isUnavailable: boolean, isLoadingVariants: boolean) {
  if (isUnavailable === false) {
    return;
  }

  if (isLoadingVariants) {
    return "Loading artwork variants...";
  }

  return "No artwork variants available";
}

function createVariantItem({
  headPokemon,
  bodyPokemon,
  hasArtVariants,
  isLoadingVariants,
  onOpenVariantModal,
}: Pick<
  TeamMemberContextItemOptions,
  "headPokemon" | "bodyPokemon" | "hasArtVariants" | "isLoadingVariants"
> &
  Pick<TeamMemberContextActions, "onOpenVariantModal">): ContextMenuItem {
  const unavailable =
    !hasArtVariants || isEggId(headPokemon?.id) || isEggId(bodyPokemon?.id);

  return {
    disabled: unavailable,
    icon: isLoadingVariants ? Loader2 : Replace,
    iconClassName: isLoadingVariants ? "animate-spin" : "",
    id: "change-variant",
    label: "Change Preferred Artwork",
    onClick: onOpenVariantModal,
    tooltip: getVariantTooltip(unavailable, isLoadingVariants),
  };
}

function createStatusItems(
  status: PokemonStatusType | undefined,
  actions: Pick<TeamMemberContextActions, "onMarkAsDeceased" | "onMoveToBox">,
): ContextMenuItem[] {
  const canMarkAsDeceased =
    status !== PokemonStatus.DECEASED && status !== PokemonStatus.MISSED;
  const canMoveToBox = status !== undefined && BOXABLE_STATUSES.has(status);

  if (!(canMarkAsDeceased || canMoveToBox)) {
    return [];
  }

  return [
    { id: "status-separator", separator: true },
    ...(canMarkAsDeceased
      ? [
          {
            icon: Skull,
            id: "mark-deceased",
            label: "Move to Graveyard",
            onClick: actions.onMarkAsDeceased,
          },
        ]
      : []),
    ...(canMoveToBox
      ? [
          {
            icon: Computer,
            id: "move-to-box",
            label: "Move to Box",
            onClick: actions.onMoveToBox,
          },
        ]
      : []),
  ];
}

function createReverseFusionItems(
  headPokemon: PokemonOptionType | null | undefined,
  bodyPokemon: PokemonOptionType | null | undefined,
  onReverseFusion: () => void,
): ContextMenuItem[] {
  if (!(headPokemon && bodyPokemon) || headPokemon.id === bodyPokemon.id) {
    return [];
  }

  return [
    {
      icon: ArrowLeftRight,
      id: "invert-fusion",
      label: "Reverse Fusion",
      onClick: onReverseFusion,
      tooltip: "Swap head and body Pokémon positions",
    },
  ];
}

function createPokemonSectionItemsForTeamMember({
  headPokemon,
  bodyPokemon,
  headEvolutions,
  headPreEvolution,
  bodyEvolutions,
  bodyPreEvolution,
  actions,
}: Pick<
  TeamMemberContextItemOptions,
  | "headPokemon"
  | "bodyPokemon"
  | "headEvolutions"
  | "headPreEvolution"
  | "bodyEvolutions"
  | "bodyPreEvolution"
  | "actions"
>): ContextMenuItem[] {
  const hasFusionPair = Boolean(
    headPokemon && bodyPokemon && headPokemon.id !== bodyPokemon.id,
  );
  const items = createPokemonSectionItems({
    evolutions: headEvolutions,
    onDevolve: actions.onDevolveHead,
    onEvolve: actions.onEvolveHead,
    onGoToEncounter: actions.onGoToHeadEncounter,
    pokemon: headPokemon,
    preEvolution: headPreEvolution,
    showHeader: hasFusionPair,
    slot: "head",
  });

  if (bodyPokemon?.id === headPokemon?.id) {
    return items;
  }

  return [
    ...items,
    ...createPokemonSectionItems({
      evolutions: bodyEvolutions,
      onDevolve: actions.onDevolveBody,
      onEvolve: actions.onEvolveBody,
      onGoToEncounter: actions.onGoToBodyEncounter,
      pokemon: bodyPokemon,
      preEvolution: bodyPreEvolution,
      showHeader: true,
      slot: "body",
    }),
  ];
}

function createTeamMemberContextItems({
  headPokemon,
  bodyPokemon,
  headEvolutions,
  headPreEvolution,
  bodyEvolutions,
  bodyPreEvolution,
  preferredVariant,
  hasArtVariants,
  isLoadingVariants,
  actions,
}: TeamMemberContextItemOptions): ContextMenuItem[] {
  const status = headPokemon?.status || bodyPokemon?.status;
  return [
    createVariantItem({
      bodyPokemon,
      hasArtVariants,
      headPokemon,
      isLoadingVariants,
      onOpenVariantModal: actions.onOpenVariantModal,
    }),
    ...createReverseFusionItems(
      headPokemon,
      bodyPokemon,
      actions.onReverseFusion,
    ),
    ...createStatusItems(status, actions),
    ...createPokemonSectionItemsForTeamMember({
      actions,
      bodyEvolutions,
      bodyPokemon,
      bodyPreEvolution,
      headEvolutions,
      headPokemon,
      headPreEvolution,
    }),
    { id: "external-links-separator", separator: true },
    ...createExternalDexItems(
      getSpriteId(headPokemon?.id, bodyPokemon?.id),
      preferredVariant,
    ),
  ];
}

async function updatePokemonToEvolution(
  pokemon: PokemonOptionType | null | undefined,
  evolution: Pokemon | null,
) {
  if (!(pokemon?.uid && evolution)) {
    return;
  }

  await playthroughActions.updatePokemonByUID(pokemon.uid, {
    ...pokemon,
    id: evolution.id,
    name: evolution.name,
    nationalDexId: evolution.nationalDexId,
  });

  if (pokemon.originalLocation) {
    emitEvolutionEvent(pokemon.originalLocation);
  }
}

function scrollToPokemonEncounter(
  pokemon: PokemonOptionType | null | undefined,
  onClose: (() => void) | undefined,
) {
  if (!(pokemon?.originalLocation && pokemon.uid)) {
    return;
  }

  scrollToLocationById(pokemon.originalLocation, {
    behavior: "smooth",
    durationMs: 1200,
    highlightUids: [pokemon.uid],
  });
  onClose?.();
}

function createTeamMemberContextActions({
  headPokemon,
  bodyPokemon,
  headPreEvolution,
  bodyPreEvolution,
  position,
  hasFusionPair,
  onClose,
  onOpenVariantModal,
}: TeamMemberContextActionOptions): TeamMemberContextActions {
  return {
    onDevolveBody: () =>
      updatePokemonToEvolution(bodyPokemon, bodyPreEvolution),
    onDevolveHead: () =>
      updatePokemonToEvolution(headPokemon, headPreEvolution),
    onEvolveBody: (evolution) =>
      updatePokemonToEvolution(bodyPokemon, evolution),
    onEvolveHead: (evolution) =>
      updatePokemonToEvolution(headPokemon, evolution),
    onGoToBodyEncounter: () => scrollToPokemonEncounter(bodyPokemon, onClose),
    onGoToHeadEncounter: () => scrollToPokemonEncounter(headPokemon, onClose),
    onMarkAsDeceased: () =>
      playthroughActions.markTeamMemberAsDeceased(position),
    onMoveToBox: () => playthroughActions.moveTeamMemberToBox(position),
    onOpenVariantModal,
    onReverseFusion: async () => {
      if (hasFusionPair === false) {
        return;
      }

      await playthroughActions.flipTeamMemberFusion(position);
    },
  };
}

function useTeamMemberArtworkVariants(
  headPokemon: PokemonOptionType | null | undefined,
  bodyPokemon: PokemonOptionType | null | undefined,
  shouldLoad: boolean,
): Pick<TeamMemberContextItemOptions, "hasArtVariants" | "isLoadingVariants"> {
  const headId = headPokemon?.id;
  const bodyId = bodyPokemon?.id;
  const { data: variants, isLoading: isLoadingVariants } = useSpriteVariants(
    headId,
    bodyId,
    shouldLoad && !isEggId(headId) && !isEggId(bodyId),
  );

  return {
    hasArtVariants: variants && variants.length > 1,
    isLoadingVariants,
  };
}

interface TeamMemberContextMenuProps {
  children: React.ReactNode;
  onClose?: () => void;
  shouldLoad?: boolean;
  teamMember: {
    position: number;
    isEmpty: boolean;
    headPokemon?: PokemonOptionType | null;
    bodyPokemon?: PokemonOptionType | null;
    isFusion?: boolean;
  };
}

export function TeamMemberContextMenu({
  children,
  teamMember,
  shouldLoad = true,
  onClose,
}: TeamMemberContextMenuProps) {
  const { headPokemon, bodyPokemon, position } = teamMember;
  const hasFusionPair = Boolean(
    headPokemon && bodyPokemon && headPokemon.id !== bodyPokemon.id,
  );
  const [isVariantModalOpen, setIsVariantModalOpen] = useState(false);
  const { hasArtVariants, isLoadingVariants } = useTeamMemberArtworkVariants(
    headPokemon,
    bodyPokemon,
    shouldLoad,
  );
  const headPokemonId = headPokemon ? headPokemon.id : null;
  const bodyPokemonId = bodyPokemon ? bodyPokemon.id : null;
  const { variant: preferredVariant } = usePreferredVariantState(
    headPokemonId,
    bodyPokemonId,
  );
  const { evolutions: headEvolutions, preEvolution: headPreEvolution } =
    usePokemonEvolutionData(headPokemon?.id, true);
  const { evolutions: bodyEvolutions, preEvolution: bodyPreEvolution } =
    usePokemonEvolutionData(bodyPokemon?.id, true);
  const closeVariantModal = useCallback(() => {
    setIsVariantModalOpen(false);
  }, []);
  const openVariantModal = useCallback(() => {
    setIsVariantModalOpen(true);
  }, []);
  const contextItems = createTeamMemberContextItems({
    actions: createTeamMemberContextActions({
      bodyPokemon,
      bodyPreEvolution,
      hasFusionPair,
      headPokemon,
      headPreEvolution,
      onClose,
      onOpenVariantModal: openVariantModal,
      position,
    }),
    bodyEvolutions,
    bodyPokemon,
    bodyPreEvolution,
    hasArtVariants,
    headEvolutions,
    headPokemon,
    headPreEvolution,
    isLoadingVariants,
    preferredVariant,
  });

  return (
    <>
      <ContextMenu
        disabled={isEggId(headPokemon?.id) || isEggId(bodyPokemon?.id)}
        items={contextItems}
        portalRootId="team-slots"
      >
        {children}
      </ContextMenu>

      <ArtworkVariantModal
        bodyId={bodyPokemon?.id}
        headId={headPokemon?.id}
        isFusion={hasFusionPair}
        isOpen={isVariantModalOpen}
        onClose={closeVariantModal}
      />
    </>
  );
}
