import {
  ArrowUpRight,
  Computer,
  Gift,
  Loader2,
  Replace,
  Skull,
} from "lucide-react";
import dynamic from "next/dynamic";
import { useState } from "react";
import { useSnapshot } from "valtio";
import BodyIcon from "@/assets/images/body.svg";
import EscapeIcon from "@/assets/images/escape-cloud.svg";
import HeadIcon from "@/assets/images/head.svg";
import PokeballIcon from "@/assets/images/pokeball.svg";
import { ContextMenu, type ContextMenuItem } from "@/components/ContextMenu";
import { usePreferredVariantState, useSpriteVariants } from "@/hooks/useSprite";
import {
  isEggId,
  type PokemonOptionType,
  PokemonStatus,
  type PokemonStatusType,
} from "@/loaders/pokemon";
import { playthroughActions } from "@/stores/playthroughs";
import { settingsStore } from "@/stores/settings";
import { getSpriteId } from "../../lib/sprites";
import { getDisplayPokemon } from "./utils";

const LocationSelector = dynamic(
  () => import("./LocationSelector").then((mod) => mod.LocationSelector),
  {
    ssr: false,
  },
);

const ArtworkVariantModal = dynamic(
  () => import("./ArtworkVariantModal").then((mod) => mod.ArtworkVariantModal),
  {
    ssr: false,
  },
);

export function createExternalDexItems(
  spriteId: string,
  preferredVariant: string | null | undefined,
): ContextMenuItem[] {
  const variantSuffix = preferredVariant ?? "";

  return [
    {
      favicon: "https://infinitefusiondex.com/images/favicon.ico",
      href: `https://infinitefusiondex.com/details/${spriteId}`,
      icon: ArrowUpRight,
      iconClassName: "dark:text-blue-300 text-blue-400",
      id: "infinitefusiondex",
      label: "Open InfiniteDex entry",
      target: "_blank",
    },
    {
      favicon: "https://www.fusiondex.org/favicon.ico",
      href: `https://fusiondex.org/sprite/pif/${spriteId}${variantSuffix}/`,
      icon: ArrowUpRight,
      iconClassName: "dark:text-blue-300 text-blue-400",
      id: "fusiondex",
      label: "Open FusionDex entry",
      target: "_blank",
    },
  ];
}

interface EncounterStatusActions {
  onMarkAsCaptured: () => void;
  onMarkAsDeceased: () => void;
  onMarkAsMissed: () => void;
  onMarkAsReceived: () => void;
  onMoveToBox: () => void;
}

// The five status transitions form the fixed Nuzlocke encounter status matrix.
// fallow-ignore-next-line complexity
function createEncounterStatusItems(
  currentStatus: PokemonStatusType | undefined,
  actions: EncounterStatusActions,
): ContextMenuItem[] {
  const items: ContextMenuItem[] = [{ id: "separator-1", separator: true }];

  if (
    currentStatus !== PokemonStatus.DECEASED &&
    currentStatus !== PokemonStatus.MISSED
  ) {
    items.push({
      icon: Skull,
      id: "mark-deceased",
      label: "Mark as Deceased",
      onClick: actions.onMarkAsDeceased,
    });
  }

  if (
    currentStatus === PokemonStatus.CAPTURED ||
    currentStatus === PokemonStatus.RECEIVED ||
    currentStatus === PokemonStatus.TRADED ||
    currentStatus === PokemonStatus.DECEASED
  ) {
    items.push({
      icon: Computer,
      id: "move-to-box",
      label: "Move to Box",
      onClick: actions.onMoveToBox,
    });
  }

  if (
    currentStatus !== PokemonStatus.CAPTURED &&
    currentStatus !== PokemonStatus.RECEIVED
  ) {
    items.push({
      icon: PokeballIcon,
      id: "mark-captured",
      label: "Mark as Captured",
      onClick: actions.onMarkAsCaptured,
    });
  }

  if (!currentStatus) {
    items.push({
      icon: EscapeIcon,
      id: "mark-missed",
      label: "Mark as Missed",
      onClick: actions.onMarkAsMissed,
    });
  }

  if (
    currentStatus !== PokemonStatus.RECEIVED &&
    currentStatus !== PokemonStatus.CAPTURED
  ) {
    items.push({
      icon: Gift,
      id: "mark-received",
      label: "Mark as Received",
      onClick: actions.onMarkAsReceived,
    });
  }

  return items;
}

interface PokemonContextMenuProps {
  children: React.ReactNode;
  encounterData: {
    head?: PokemonOptionType | null;
    body?: PokemonOptionType | null;
    isFusion?: boolean;
  } | null;
  locationId: string;
  shouldLoad?: boolean;
  showStatusActions?: boolean; // Whether to show status-changing actions in context menu
}

export function PokemonContextMenu({
  children,
  locationId,
  encounterData,
  shouldLoad,
  showStatusActions = true,
}: PokemonContextMenuProps) {
  const settings = useSnapshot(settingsStore);

  // Determine which Pokemon to display based on active/inactive states
  const displayPokemon = getDisplayPokemon(
    encounterData?.head ?? null,
    encounterData?.body ?? null,
    encounterData?.isFusion ?? false,
  );

  const eitherPokemonIsEgg =
    isEggId(encounterData?.head?.id) || isEggId(encounterData?.body?.id);

  // Check for art variants using display Pokemon
  const { data: variants, isLoading: isLoadingVariants } = useSpriteVariants(
    displayPokemon.head?.id,
    displayPokemon.body?.id,
    shouldLoad && !eitherPokemonIsEgg,
  );
  const hasArtVariants = variants && variants.length > 1;

  // Get current preferred variant for the display Pokemon
  const { variant: preferredVariant } = usePreferredVariantState(
    displayPokemon.head?.id ?? null,
    displayPokemon.body?.id ?? null,
  );

  const [isVariantModalOpen, setIsVariantModalOpen] = useState(false);
  const [isMoveHeadModalOpen, setIsMoveHeadModalOpen] = useState(false);
  const [isMoveBodyModalOpen, setIsMoveBodyModalOpen] = useState(false);

  // Handler to mark both Pokemon in the fusion as deceased
  const handleMarkAsDeceased = async () => {
    await playthroughActions.markEncounterAsDeceased(locationId);
  };

  // Handler to move both Pokemon in the fusion to box (stored status)
  const handleMoveToBox = async () => {
    await playthroughActions.moveEncounterToBox(locationId);
  };

  // Handler to mark both Pokemon in the fusion as captured
  const handleMarkAsCaptured = async () => {
    await playthroughActions.markEncounterAsCaptured(locationId);
  };

  // Handler to mark both Pokemon in the fusion as missed
  const handleMarkAsMissed = async () => {
    await playthroughActions.markEncounterAsMissed(locationId);
  };

  // Handler to mark both Pokemon in the fusion as received
  const handleMarkAsReceived = async () => {
    await playthroughActions.markEncounterAsReceived(locationId);
  };

  // Handler for moving head Pokemon
  const handleMoveHead = async (
    targetLocationId: string,
    targetField: "head" | "body",
  ) => {
    await playthroughActions.relocateEncounterSlot({
      sourceField: "head",
      sourceLocationId: locationId,
      targetField,
      targetLocationId,
    });
  };

  // Handler for moving body Pokemon
  const handleMoveBody = async (
    targetLocationId: string,
    targetField: "head" | "body",
  ) => {
    await playthroughActions.relocateEncounterSlot({
      sourceField: "body",
      sourceLocationId: locationId,
      targetField,
      targetLocationId,
    });
  };

  const contextItems: ContextMenuItem[] = (() => {
    // Use display Pokemon for links instead of raw encounter data
    const id = getSpriteId(displayPokemon.head?.id, displayPokemon.body?.id);

    // Get current status (both Pokemon should have the same status in a fusion)
    const currentStatus =
      encounterData?.head?.status || encounterData?.body?.status;
    const hasPokemon = encounterData?.head || encounterData?.body;

    const items: ContextMenuItem[] = [
      {
        disabled: eitherPokemonIsEgg || !hasArtVariants,
        icon: isLoadingVariants ? Loader2 : Replace,
        iconClassName: isLoadingVariants ? "animate-spin" : "",
        id: "change-variant",
        label: "Change Preferred Artwork",
        onClick: () => {
          setIsVariantModalOpen(true);
        },
        tooltip:
          eitherPokemonIsEgg || !hasArtVariants
            ? isLoadingVariants
              ? "Loading artwork variants..."
              : "No artwork variants available"
            : undefined,
      },
    ];

    // Only show status options if there are Pokemon, they're not eggs, and status actions are enabled
    if (hasPokemon && !eitherPokemonIsEgg && showStatusActions) {
      items.push(
        ...createEncounterStatusItems(currentStatus, {
          onMarkAsCaptured: handleMarkAsCaptured,
          onMarkAsDeceased: handleMarkAsDeceased,
          onMarkAsMissed: handleMarkAsMissed,
          onMarkAsReceived: handleMarkAsReceived,
          onMoveToBox: handleMoveToBox,
        }),
      );

      // Add move actions if there are Pokemon and setting is enabled
      if (
        hasPokemon &&
        !eitherPokemonIsEgg &&
        settings.moveEncountersBetweenLocations
      ) {
        const moveActions = [];

        // Show "Move Head" if head Pokemon exists
        if (encounterData?.head) {
          moveActions.push({
            icon: HeadIcon,
            id: "move-head",
            label: "Move Head",
            onClick: () => {
              setIsMoveHeadModalOpen(true);
            },
          });
        }

        // Show "Move Body" if body Pokemon exists
        if (encounterData?.body) {
          moveActions.push({
            icon: BodyIcon,
            id: "move-body",
            label: "Move Body",
            onClick: () => {
              setIsMoveBodyModalOpen(true);
            },
          });
        }

        // Only add separator and move actions if there are actually move actions to show
        if (moveActions.length > 0) {
          items.push({
            id: "separator-move",
            separator: true,
          });
          items.push(...moveActions);
        }
      }
    }

    items.push({
      id: "separator-2",
      separator: true,
    });

    items.push(...createExternalDexItems(id, preferredVariant));

    return items;
  })();

  return (
    <>
      <ContextMenu
        disabled={eitherPokemonIsEgg}
        items={contextItems}
        portalRootId="location-table"
      >
        {children}
      </ContextMenu>

      <ArtworkVariantModal
        bodyId={displayPokemon.body?.id}
        headId={displayPokemon.head?.id}
        isFusion={encounterData?.isFusion}
        isOpen={isVariantModalOpen}
        onClose={() => setIsVariantModalOpen(false)}
      />

      {encounterData?.head && (
        <LocationSelector
          currentLocationId={locationId}
          encounterData={
            encounterData?.head ? { head: encounterData.head } : null
          }
          isOpen={isMoveHeadModalOpen}
          moveTargetField="head"
          onClose={() => setIsMoveHeadModalOpen(false)}
          onSelectLocation={handleMoveHead}
        />
      )}

      {encounterData?.body && (
        <LocationSelector
          currentLocationId={locationId}
          encounterData={
            encounterData?.body ? { body: encounterData.body } : null
          }
          isOpen={isMoveBodyModalOpen}
          moveTargetField="body"
          onClose={() => setIsMoveBodyModalOpen(false)}
          onSelectLocation={handleMoveBody}
        />
      )}
    </>
  );
}
