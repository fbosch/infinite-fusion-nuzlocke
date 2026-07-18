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

  // Handler to evolve head Pokémon
  const handleEvolveHead = useCallback(
    async (
      evolutionId: number,
      evolutionName: string,
      evolutionNationalDexId: number,
    ) => {
      if (!headPokemon?.uid) return;

      const evolved: PokemonOptionType = {
        ...headPokemon,
        id: evolutionId,
        name: evolutionName,
        nationalDexId: evolutionNationalDexId,
      };

      await playthroughActions.updatePokemonByUID(headPokemon.uid, evolved);

      // Emit evolution event for the head Pokémon's original location
      if (headPokemon.originalLocation) {
        emitEvolutionEvent(headPokemon.originalLocation);
      }
    },
    [headPokemon],
  );

  // Handler to evolve body Pokémon
  const handleEvolveBody = useCallback(
    async (
      evolutionId: number,
      evolutionName: string,
      evolutionNationalDexId: number,
    ) => {
      if (!bodyPokemon?.uid) return;

      const evolved: PokemonOptionType = {
        ...bodyPokemon,
        id: evolutionId,
        name: evolutionName,
        nationalDexId: evolutionNationalDexId,
      };

      await playthroughActions.updatePokemonByUID(bodyPokemon.uid, evolved);

      // Emit evolution event for the body Pokémon's original location
      if (bodyPokemon.originalLocation) {
        emitEvolutionEvent(bodyPokemon.originalLocation);
      }
    },
    [bodyPokemon],
  );

  // Handler to devolve head Pokémon
  const handleDevolveHead = useCallback(async () => {
    if (!headPokemon?.uid || !headPreEvolution) return;

    const devolved: PokemonOptionType = {
      ...headPokemon,
      id: headPreEvolution.id,
      name: headPreEvolution.name,
      nationalDexId: headPreEvolution.nationalDexId,
    };

    await playthroughActions.updatePokemonByUID(headPokemon.uid, devolved);
  }, [headPokemon, headPreEvolution]);

  // Handler to devolve body Pokémon
  const handleDevolveBody = useCallback(async () => {
    if (!bodyPokemon?.uid || !bodyPreEvolution) return;

    const devolved: PokemonOptionType = {
      ...bodyPokemon,
      id: bodyPreEvolution.id,
      name: bodyPreEvolution.name,
      nationalDexId: bodyPreEvolution.nationalDexId,
    };

    await playthroughActions.updatePokemonByUID(bodyPokemon.uid, devolved);
  }, [bodyPokemon, bodyPreEvolution]);

  // Handler to flip fusion (swap head and body)
  const handleFlipFusion = useCallback(async () => {
    if (hasFusionPair === false) return;

    await playthroughActions.flipTeamMemberFusion(position);
  }, [hasFusionPair, position]);

  // Handler to navigate to head encounter
  const handleGoToHeadEncounter = useCallback(() => {
    if (!headPokemon?.originalLocation || !headPokemon.uid) return;

    scrollToLocationById(headPokemon.originalLocation, {
      behavior: "smooth",
      highlightUids: [headPokemon.uid],
      durationMs: 1200,
    });

    // Close any parent modal/sheet
    onClose?.();
  }, [headPokemon, onClose]);

  // Handler to navigate to body encounter
  const handleGoToBodyEncounter = useCallback(() => {
    if (!bodyPokemon?.originalLocation || !bodyPokemon.uid) return;

    scrollToLocationById(bodyPokemon.originalLocation, {
      behavior: "smooth",
      highlightUids: [bodyPokemon.uid],
      durationMs: 1200,
    });

    // Close any parent modal/sheet
    onClose?.();
  }, [bodyPokemon, onClose]);

  const contextItems = useMemo<ContextMenuItem[]>(() => {
    // Use team member Pokémon for links
    const id = getSpriteId(headPokemon?.id, bodyPokemon?.id);

    // Get current status (check both Pokémon, they should have the same status)
    const currentStatus = headPokemon?.status || bodyPokemon?.status;

    const items: ContextMenuItem[] = [
      {
        id: "change-variant",
        label: "Change Preferred Artwork",
        disabled:
          !hasArtVariants ||
          isEggId(headPokemon?.id) ||
          isEggId(bodyPokemon?.id),
        icon: isLoadingVariants ? Loader2 : Replace,
        tooltip:
          !hasArtVariants ||
          isEggId(headPokemon?.id) ||
          isEggId(bodyPokemon?.id)
            ? isLoadingVariants
              ? "Loading artwork variants..."
              : "No artwork variants available"
            : undefined,
        iconClassName: isLoadingVariants ? "animate-spin" : "",
        onClick: () => {
          setIsVariantModalOpen(true);
        },
      },
    ];

    // Check if this is a fusion (both head and body exist and are different)
    const isFusionPair =
      headPokemon && bodyPokemon && headPokemon.id !== bodyPokemon.id;

    // Add inverse fusion option if this is a fusion
    if (isFusionPair) {
      items.push({
        id: "invert-fusion",
        label: "Invert Fusion",
        icon: ArrowLeftRight,
        onClick: handleFlipFusion,
        tooltip: "Swap head and body Pokémon positions",
      });
    }

    // Add status actions (moved before head/body sections)
    const canMarkAsDeceased =
      currentStatus !== PokemonStatus.DECEASED &&
      currentStatus !== PokemonStatus.MISSED;
    const canMoveToBox =
      currentStatus === PokemonStatus.CAPTURED ||
      currentStatus === PokemonStatus.RECEIVED ||
      currentStatus === PokemonStatus.TRADED ||
      currentStatus === PokemonStatus.DECEASED;
    const hasStatusActions = canMarkAsDeceased || canMoveToBox;

    if (hasStatusActions) {
      items.push({
        id: "status-separator",
        separator: true,
      });

      // Show "Mark as Deceased" unless already deceased or missed
      if (canMarkAsDeceased) {
        items.push({
          id: "mark-deceased",
          label: "Move to Graveyard",
          icon: Skull,
          onClick: handleMarkAsDeceased,
        });
      }

      // Show "Move to Box" only if captured, received, traded, or deceased
      if (canMoveToBox) {
        items.push({
          id: "move-to-box",
          label: "Move to Box",
          icon: Computer,
          onClick: handleMoveToBox,
        });
      }
    }

    items.push(
      ...createPokemonSectionItems({
        slot: "head",
        pokemon: headPokemon,
        evolutions: headEvolutions,
        preEvolution: headPreEvolution,
        showHeader: Boolean(isFusionPair),
        onDevolve: handleDevolveHead,
        onEvolve: (evolution) =>
          handleEvolveHead(
            evolution.id,
            evolution.name,
            evolution.nationalDexId,
          ),
        onGoToEncounter: handleGoToHeadEncounter,
      }),
    );

    if (bodyPokemon?.id !== headPokemon?.id) {
      items.push(
        ...createPokemonSectionItems({
          slot: "body",
          pokemon: bodyPokemon,
          evolutions: bodyEvolutions,
          preEvolution: bodyPreEvolution,
          showHeader: true,
          onDevolve: handleDevolveBody,
          onEvolve: (evolution) =>
            handleEvolveBody(
              evolution.id,
              evolution.name,
              evolution.nationalDexId,
            ),
          onGoToEncounter: handleGoToBodyEncounter,
        }),
      );
    }

    // Add external links separator
    items.push({
      id: "external-links-separator",
      separator: true,
    });

    items.push(...createExternalDexItems(id, preferredVariant));

    return items;
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
