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
import { useCallback, useMemo, useState } from "react";
import BodyIcon from "@/assets/images/body.svg";
import HeadIcon from "@/assets/images/head.svg";
import { ContextMenu, type ContextMenuItem } from "@/components/ContextMenu";
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
import { createExternalDexItems } from "./PokemonContextMenu";

const ArtworkVariantModal = dynamic(
  () => import("./ArtworkVariantModal").then((mod) => mod.ArtworkVariantModal),
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
  slot: "head" | "body";
  pokemon: PokemonOptionType | null | undefined;
  evolutions: Pokemon[] | undefined;
  preEvolution: Pokemon | null;
  showHeader: boolean;
  onDevolve: () => void;
  onEvolve: (evolution: Pokemon) => void;
  onGoToEncounter: () => void;
}

interface TeamMemberContextActions {
  onOpenVariantModal: () => void;
  onReverseFusion: () => void;
  onMarkAsDeceased: () => void;
  onMoveToBox: () => void;
  onDevolveHead: () => void;
  onEvolveHead: (evolution: Pokemon) => void;
  onGoToHeadEncounter: () => void;
  onDevolveBody: () => void;
  onEvolveBody: (evolution: Pokemon) => void;
  onGoToBodyEncounter: () => void;
}

interface TeamMemberContextItemOptions {
  headPokemon: PokemonOptionType | null | undefined;
  bodyPokemon: PokemonOptionType | null | undefined;
  headEvolutions: Pokemon[] | undefined;
  headPreEvolution: Pokemon | null;
  bodyEvolutions: Pokemon[] | undefined;
  bodyPreEvolution: Pokemon | null;
  preferredVariant: string | null | undefined;
  hasArtVariants: boolean | undefined;
  isLoadingVariants: boolean;
  actions: TeamMemberContextActions;
}

function createPokemonActionLabel(pokemon: Pokemon, action: string) {
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

// The action list intentionally mirrors the fixed head/body state matrix.
// fallow-ignore-next-line complexity
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
  if (
    !pokemon ||
    (!evolutions?.length && !preEvolution && !pokemon.originalLocation)
  ) {
    return [];
  }

  const sectionName = slot === "head" ? "Head" : "Body";
  const SectionIcon = slot === "head" ? HeadIcon : BodyIcon;
  const items: ContextMenuItem[] = [
    { id: `${slot}-section-separator`, separator: true },
  ];

  if (showHeader) {
    items.push({
      id: `${slot}-section-header`,
      label: (
        <div className="flex items-center gap-1.5 px-1 py-0.5">
          <SectionIcon className="h-3.5 w-3.5 text-gray-500 dark:text-gray-400" />
          <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
            {sectionName}
          </span>
        </div>
      ),
      visualOnly: true,
    });
  }

  if (preEvolution) {
    items.push({
      id: `devolve-${slot}`,
      label: createPokemonActionLabel(preEvolution, "Devolve to"),
      icon: Undo2,
      onClick: onDevolve,
    });
  }

  if (evolutions?.length === 1) {
    const evolution = evolutions[0]!;
    items.push({
      id: `evolve-${slot}-${evolution.id}`,
      label: createPokemonActionLabel(evolution, "Evolve to"),
      icon: Atom,
      onClick: () => onEvolve(evolution),
    });
  } else if (evolutions && evolutions.length > 1) {
    items.push({
      id: `evolve-${slot}`,
      label: "Evolve to…",
      icon: Atom,
      children: evolutions.map((evolution) => ({
        id: `evolve-${slot}-${evolution.id}`,
        label: createPokemonActionLabel(evolution, ""),
        onClick: () => onEvolve(evolution),
      })),
    });
  }

  if (pokemon.originalLocation) {
    items.push({
      id: `go-to-${slot}-encounter`,
      label: "Go to Encounter",
      icon: MapPin,
      onClick: onGoToEncounter,
      tooltip: "Navigate to the location where this Pokémon was encountered",
    });
  }

  return items;
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
    id: "change-variant",
    label: "Change Preferred Artwork",
    disabled: unavailable,
    icon: isLoadingVariants ? Loader2 : Replace,
    tooltip: unavailable
      ? isLoadingVariants
        ? "Loading artwork variants..."
        : "No artwork variants available"
      : undefined,
    iconClassName: isLoadingVariants ? "animate-spin" : "",
    onClick: onOpenVariantModal,
  };
}

function createStatusItems(
  status: PokemonStatusType | undefined,
  actions: Pick<TeamMemberContextActions, "onMarkAsDeceased" | "onMoveToBox">,
): ContextMenuItem[] {
  const canMarkAsDeceased =
    status !== PokemonStatus.DECEASED && status !== PokemonStatus.MISSED;
  const canMoveToBox = status != null && BOXABLE_STATUSES.has(status);

  if (!canMarkAsDeceased && !canMoveToBox) {
    return [];
  }

  return [
    { id: "status-separator", separator: true },
    ...(canMarkAsDeceased
      ? [
          {
            id: "mark-deceased",
            label: "Move to Graveyard",
            icon: Skull,
            onClick: actions.onMarkAsDeceased,
          },
        ]
      : []),
    ...(canMoveToBox
      ? [
          {
            id: "move-to-box",
            label: "Move to Box",
            icon: Computer,
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
  if (!headPokemon || !bodyPokemon || headPokemon.id === bodyPokemon.id) {
    return [];
  }

  return [
    {
      id: "invert-fusion",
      label: "Reverse Fusion",
      icon: ArrowLeftRight,
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
  const hasFusionPair =
    headPokemon != null &&
    bodyPokemon != null &&
    headPokemon.id !== bodyPokemon.id;
  const items = createPokemonSectionItems({
    slot: "head",
    pokemon: headPokemon,
    evolutions: headEvolutions,
    preEvolution: headPreEvolution,
    showHeader: hasFusionPair,
    onDevolve: actions.onDevolveHead,
    onEvolve: actions.onEvolveHead,
    onGoToEncounter: actions.onGoToHeadEncounter,
  });

  if (bodyPokemon?.id === headPokemon?.id) {
    return items;
  }

  return [
    ...items,
    ...createPokemonSectionItems({
      slot: "body",
      pokemon: bodyPokemon,
      evolutions: bodyEvolutions,
      preEvolution: bodyPreEvolution,
      showHeader: true,
      onDevolve: actions.onDevolveBody,
      onEvolve: actions.onEvolveBody,
      onGoToEncounter: actions.onGoToBodyEncounter,
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
      headPokemon,
      bodyPokemon,
      hasArtVariants,
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
      headPokemon,
      bodyPokemon,
      headEvolutions,
      headPreEvolution,
      bodyEvolutions,
      bodyPreEvolution,
      actions,
    }),
    { id: "external-links-separator", separator: true },
    ...createExternalDexItems(
      getSpriteId(headPokemon?.id, bodyPokemon?.id),
      preferredVariant,
    ),
  ];
}

async function evolvePokemon(
  pokemon: PokemonOptionType | null | undefined,
  evolution: Pokemon,
) {
  if (!pokemon?.uid) return;

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

async function devolvePokemon(
  pokemon: PokemonOptionType | null | undefined,
  preEvolution: Pokemon | null,
) {
  if (!pokemon?.uid || !preEvolution) return;

  await playthroughActions.updatePokemonByUID(pokemon.uid, {
    ...pokemon,
    id: preEvolution.id,
    name: preEvolution.name,
    nationalDexId: preEvolution.nationalDexId,
  });

  if (pokemon.originalLocation) {
    emitEvolutionEvent(pokemon.originalLocation);
  }
}

function scrollToPokemonEncounter(
  pokemon: PokemonOptionType | null | undefined,
  onClose: (() => void) | undefined,
) {
  if (!pokemon?.originalLocation || !pokemon.uid) return;

  scrollToLocationById(pokemon.originalLocation, {
    behavior: "smooth",
    highlightUids: [pokemon.uid],
    durationMs: 1200,
  });
  onClose?.();
}

interface TeamMemberContextMenuProps {
  children: React.ReactNode;
  teamMember: {
    position: number;
    isEmpty: boolean;
    headPokemon?: PokemonOptionType | null;
    bodyPokemon?: PokemonOptionType | null;
    isFusion?: boolean;
  };
  shouldLoad?: boolean;
  onClose?: () => void;
}

export function TeamMemberContextMenu({
  children,
  teamMember,
  shouldLoad = true,
  onClose,
}: TeamMemberContextMenuProps) {
  const { headPokemon, bodyPokemon, position } = teamMember;
  const hasFusionPair =
    headPokemon != null &&
    bodyPokemon != null &&
    headPokemon.id !== bodyPokemon.id;

  // Check for art variants using the team member's Pokémon
  const { data: variants, isLoading: isLoadingVariants } = useSpriteVariants(
    headPokemon?.id,
    bodyPokemon?.id,
    shouldLoad && !isEggId(headPokemon?.id) && !isEggId(bodyPokemon?.id),
  );
  const hasArtVariants = variants && variants.length > 1;

  // Get current preferred variant for the team member
  const { variant: preferredVariant } = usePreferredVariantState(
    headPokemon?.id ?? null,
    bodyPokemon?.id ?? null,
  );

  // Get evolution data for both Pokémon
  const { evolutions: headEvolutions, preEvolution: headPreEvolution } =
    usePokemonEvolutionData(headPokemon?.id, true);
  const { evolutions: bodyEvolutions, preEvolution: bodyPreEvolution } =
    usePokemonEvolutionData(bodyPokemon?.id, true);

  const [isVariantModalOpen, setIsVariantModalOpen] = useState(false);

  // Handler to mark team member as deceased
  const handleMarkAsDeceased = useCallback(async () => {
    await playthroughActions.markTeamMemberAsDeceased(position);
  }, [position]);

  // Handler to move team member to box
  const handleMoveToBox = useCallback(async () => {
    await playthroughActions.moveTeamMemberToBox(position);
  }, [position]);

  const handleEvolveHead = useCallback(
    (evolution: Pokemon) => evolvePokemon(headPokemon, evolution),
    [headPokemon],
  );

  const handleEvolveBody = useCallback(
    (evolution: Pokemon) => evolvePokemon(bodyPokemon, evolution),
    [bodyPokemon],
  );

  const handleDevolveHead = useCallback(
    () => devolvePokemon(headPokemon, headPreEvolution),
    [headPokemon, headPreEvolution],
  );

  const handleDevolveBody = useCallback(
    () => devolvePokemon(bodyPokemon, bodyPreEvolution),
    [bodyPokemon, bodyPreEvolution],
  );

  // Handler to flip fusion (swap head and body)
  const handleFlipFusion = useCallback(async () => {
    if (hasFusionPair === false) return;

    await playthroughActions.flipTeamMemberFusion(position);
  }, [hasFusionPair, position]);

  const handleGoToHeadEncounter = useCallback(
    () => scrollToPokemonEncounter(headPokemon, onClose),
    [headPokemon, onClose],
  );

  const handleGoToBodyEncounter = useCallback(
    () => scrollToPokemonEncounter(bodyPokemon, onClose),
    [bodyPokemon, onClose],
  );

  const contextItems = useMemo<ContextMenuItem[]>(() => {
    return createTeamMemberContextItems({
      headPokemon,
      bodyPokemon,
      headEvolutions,
      headPreEvolution,
      bodyEvolutions,
      bodyPreEvolution,
      preferredVariant,
      hasArtVariants,
      isLoadingVariants,
      actions: {
        onOpenVariantModal: () => setIsVariantModalOpen(true),
        onReverseFusion: handleFlipFusion,
        onMarkAsDeceased: handleMarkAsDeceased,
        onMoveToBox: handleMoveToBox,
        onDevolveHead: handleDevolveHead,
        onEvolveHead: handleEvolveHead,
        onGoToHeadEncounter: handleGoToHeadEncounter,
        onDevolveBody: handleDevolveBody,
        onEvolveBody: handleEvolveBody,
        onGoToBodyEncounter: handleGoToBodyEncounter,
      },
    });
  }, [
    headPokemon,
    bodyPokemon,
    preferredVariant,
    hasArtVariants,
    isLoadingVariants,
    handleMarkAsDeceased,
    handleMoveToBox,
    headEvolutions,
    headPreEvolution,
    bodyEvolutions,
    bodyPreEvolution,
    handleEvolveHead,
    handleEvolveBody,
    handleDevolveHead,
    handleDevolveBody,
    handleFlipFusion,
    handleGoToHeadEncounter,
    handleGoToBodyEncounter,
  ]);

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
        isOpen={isVariantModalOpen}
        onClose={() => setIsVariantModalOpen(false)}
        headId={headPokemon?.id}
        bodyId={bodyPokemon?.id}
        isFusion={hasFusionPair}
      />
    </>
  );
}
