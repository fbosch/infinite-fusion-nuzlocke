import {
  ArrowUpRight,
  Computer,
  Gift,
  Loader2,
  Replace,
  Skull,
} from "lucide-react";
import dynamic from "next/dynamic";
import { useCallback, useState } from "react";
import { useSnapshot } from "valtio";
import BodyIcon from "@/assets/images/body.svg";
import EscapeIcon from "@/assets/images/escape-cloud.svg";
import HeadIcon from "@/assets/images/head.svg";
import PokeballIcon from "@/assets/images/pokeball.svg";
import { ContextMenu, type ContextMenuItem } from "@/components/context-menu";
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
  () =>
    import("./artwork-variant-modal").then((mod) => mod.ArtworkVariantModal),
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

function createEncounterStatusItems(
  currentStatus: PokemonStatusType | undefined,
  actions: EncounterStatusActions,
): ContextMenuItem[] {
  return [
    { id: "separator-1", separator: true },
    ...getDeceasedStatusItem(currentStatus, actions.onMarkAsDeceased),
    ...getMoveToBoxStatusItem(currentStatus, actions.onMoveToBox),
    ...getCapturedStatusItem(currentStatus, actions.onMarkAsCaptured),
    ...getMissedStatusItem(currentStatus, actions.onMarkAsMissed),
    ...getReceivedStatusItem(currentStatus, actions.onMarkAsReceived),
  ];
}

function getDeceasedStatusItem(
  status: PokemonStatusType | undefined,
  onClick: () => void,
): ContextMenuItem[] {
  const blockedStatuses: (PokemonStatusType | undefined)[] = [
    PokemonStatus.DECEASED,
    PokemonStatus.MISSED,
  ];
  if (blockedStatuses.includes(status)) {
    return [];
  }

  return [
    {
      icon: Skull,
      id: "mark-deceased",
      label: "Mark as Deceased",
      onClick,
    },
  ];
}

function getMoveToBoxStatusItem(
  status: PokemonStatusType | undefined,
  onClick: () => void,
): ContextMenuItem[] {
  const movableStatuses: (PokemonStatusType | undefined)[] = [
    PokemonStatus.CAPTURED,
    PokemonStatus.RECEIVED,
    PokemonStatus.TRADED,
    PokemonStatus.DECEASED,
  ];
  if (movableStatuses.includes(status) === false) {
    return [];
  }

  return [
    {
      icon: Computer,
      id: "move-to-box",
      label: "Move to Box",
      onClick,
    },
  ];
}

function getCapturedStatusItem(
  status: PokemonStatusType | undefined,
  onClick: () => void,
): ContextMenuItem[] {
  const blockingStatuses: (PokemonStatusType | undefined)[] = [
    PokemonStatus.CAPTURED,
    PokemonStatus.RECEIVED,
  ];
  if (blockingStatuses.includes(status)) {
    return [];
  }

  return [
    {
      icon: PokeballIcon,
      id: "mark-captured",
      label: "Mark as Captured",
      onClick,
    },
  ];
}

function getMissedStatusItem(
  status: PokemonStatusType | undefined,
  onClick: () => void,
): ContextMenuItem[] {
  if (status) {
    return [];
  }

  return [
    {
      icon: EscapeIcon,
      id: "mark-missed",
      label: "Mark as Missed",
      onClick,
    },
  ];
}

function getReceivedStatusItem(
  status: PokemonStatusType | undefined,
  onClick: () => void,
): ContextMenuItem[] {
  const blockingStatuses: (PokemonStatusType | undefined)[] = [
    PokemonStatus.RECEIVED,
    PokemonStatus.CAPTURED,
  ];
  if (blockingStatuses.includes(status)) {
    return [];
  }

  return [
    {
      icon: Gift,
      id: "mark-received",
      label: "Mark as Received",
      onClick,
    },
  ];
}

interface PokemonContextMenuActions {
  onMarkAsCaptured: () => void;
  onMarkAsDeceased: () => void;
  onMarkAsMissed: () => void;
  onMarkAsReceived: () => void;
  onMoveToBox: () => void;
  onOpenMoveBodyModal: () => void;
  onOpenMoveHeadModal: () => void;
  onOpenVariantModal: () => void;
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

function createMoveItems(
  encounterData: PokemonContextMenuProps["encounterData"],
  actions: Pick<
    PokemonContextMenuActions,
    "onOpenMoveBodyModal" | "onOpenMoveHeadModal"
  >,
): ContextMenuItem[] {
  const moveItems: ContextMenuItem[] = [];

  if (encounterData?.head) {
    moveItems.push({
      icon: HeadIcon,
      id: "move-head",
      label: "Move Head",
      onClick: actions.onOpenMoveHeadModal,
    });
  }

  if (encounterData?.body) {
    moveItems.push({
      icon: BodyIcon,
      id: "move-body",
      label: "Move Body",
      onClick: actions.onOpenMoveBodyModal,
    });
  }

  if (moveItems.length === 0) {
    return [];
  }

  return [{ id: "separator-move", separator: true }, ...moveItems];
}

interface PokemonContextItemOptions {
  actions: PokemonContextMenuActions;
  displayPokemon: ReturnType<typeof getDisplayPokemon>;
  eitherPokemonIsEgg: boolean;
  encounterData: PokemonContextMenuProps["encounterData"];
  hasArtVariants: boolean | undefined;
  isLoadingVariants: boolean;
  moveEncountersBetweenLocations: boolean;
  preferredVariant: string | null | undefined;
  showStatusActions: boolean;
}

function createPokemonContextItems({
  actions,
  displayPokemon,
  encounterData,
  eitherPokemonIsEgg,
  hasArtVariants,
  isLoadingVariants,
  moveEncountersBetweenLocations,
  preferredVariant,
  showStatusActions,
}: PokemonContextItemOptions): ContextMenuItem[] {
  const spriteId = getSpriteId(
    displayPokemon.head?.id,
    displayPokemon.body?.id,
  );
  const currentStatus =
    encounterData?.head?.status || encounterData?.body?.status;
  const hasPokemon = Boolean(encounterData?.head || encounterData?.body);
  const isVariantUnavailable = eitherPokemonIsEgg || !hasArtVariants;
  return [
    createVariantItem(
      isVariantUnavailable,
      isLoadingVariants,
      actions.onOpenVariantModal,
    ),
    ...getEncounterContextItems({
      actions,
      currentStatus,
      eitherPokemonIsEgg,
      encounterData,
      hasPokemon,
      moveEncountersBetweenLocations,
      showStatusActions,
    }),
    { id: "separator-2", separator: true },
    ...createExternalDexItems(spriteId, preferredVariant),
  ];
}

function createVariantItem(
  isUnavailable: boolean,
  isLoading: boolean,
  onClick: () => void,
): ContextMenuItem {
  return {
    disabled: isUnavailable,
    icon: isLoading ? Loader2 : Replace,
    iconClassName: isLoading ? "animate-spin" : "",
    id: "change-variant",
    label: "Change Preferred Artwork",
    onClick,
    tooltip: getVariantTooltip(isUnavailable, isLoading),
  };
}

function getEncounterContextItems({
  actions,
  currentStatus,
  eitherPokemonIsEgg,
  encounterData,
  hasPokemon,
  moveEncountersBetweenLocations,
  showStatusActions,
}: Pick<
  PokemonContextItemOptions,
  | "actions"
  | "eitherPokemonIsEgg"
  | "encounterData"
  | "moveEncountersBetweenLocations"
  | "showStatusActions"
> & {
  currentStatus: PokemonStatusType | undefined;
  hasPokemon: boolean;
}): ContextMenuItem[] {
  if (!(hasPokemon && eitherPokemonIsEgg === false && showStatusActions)) {
    return [];
  }

  const statusItems = createEncounterStatusItems(currentStatus, actions);
  return moveEncountersBetweenLocations
    ? [...statusItems, ...createMoveItems(encounterData, actions)]
    : statusItems;
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
  const displayHeadId = displayPokemon.head ? displayPokemon.head.id : null;
  const displayBodyId = displayPokemon.body ? displayPokemon.body.id : null;
  const { variant: preferredVariant } = usePreferredVariantState(
    displayHeadId,
    displayBodyId,
  );

  const [isVariantModalOpen, setIsVariantModalOpen] = useState(false);
  const [isMoveHeadModalOpen, setIsMoveHeadModalOpen] = useState(false);
  const [isMoveBodyModalOpen, setIsMoveBodyModalOpen] = useState(false);

  // Handler to mark both Pokemon in the fusion as deceased
  const handleMarkAsDeceased = () =>
    playthroughActions.markEncounterAsDeceased(locationId);
  const handleMoveToBox = () =>
    playthroughActions.moveEncounterToBox(locationId);
  const handleMarkAsCaptured = () =>
    playthroughActions.markEncounterAsCaptured(locationId);
  const handleMarkAsMissed = () =>
    playthroughActions.markEncounterAsMissed(locationId);
  const handleMarkAsReceived = () =>
    playthroughActions.markEncounterAsReceived(locationId);

  // Handler for moving head Pokemon
  const handleMoveHead = useCallback(
    (targetLocationId: string, targetField: "head" | "body") =>
      playthroughActions.relocateEncounterSlot({
        sourceField: "head",
        sourceLocationId: locationId,
        targetField,
        targetLocationId,
      }),
    [locationId],
  );

  // Handler for moving body Pokemon
  const handleMoveBody = useCallback(
    (targetLocationId: string, targetField: "head" | "body") =>
      playthroughActions.relocateEncounterSlot({
        sourceField: "body",
        sourceLocationId: locationId,
        targetField,
        targetLocationId,
      }),
    [locationId],
  );

  const closeVariantModal = useCallback(() => setIsVariantModalOpen(false), []);
  const closeMoveHeadModal = useCallback(() => setIsMoveHeadModalOpen(false), []);
  const closeMoveBodyModal = useCallback(() => setIsMoveBodyModalOpen(false), []);
  const openVariantModal = useCallback(() => setIsVariantModalOpen(true), []);
  const openMoveHeadModal = useCallback(() => setIsMoveHeadModalOpen(true), []);
  const openMoveBodyModal = useCallback(() => setIsMoveBodyModalOpen(true), []);

  const contextItems = createPokemonContextItems({
    actions: {
      onMarkAsCaptured: handleMarkAsCaptured,
      onMarkAsDeceased: handleMarkAsDeceased,
      onMarkAsMissed: handleMarkAsMissed,
      onMarkAsReceived: handleMarkAsReceived,
      onMoveToBox: handleMoveToBox,
      onOpenMoveBodyModal: openMoveBodyModal,
      onOpenMoveHeadModal: openMoveHeadModal,
      onOpenVariantModal: openVariantModal,
    },
    displayPokemon,
    eitherPokemonIsEgg,
    encounterData,
    hasArtVariants,
    isLoadingVariants,
    moveEncountersBetweenLocations: settings.moveEncountersBetweenLocations,
    preferredVariant,
    showStatusActions,
  });

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
        onClose={closeVariantModal}
      />

      {encounterData?.head ? (
        <LocationSelector
          currentLocationId={locationId}
          encounterData={{ head: encounterData.head }}
          isOpen={isMoveHeadModalOpen}
          moveTargetField="head"
          onClose={closeMoveHeadModal}
          onSelectLocation={handleMoveHead}
        />
      ) : null}

      {encounterData?.body ? (
        <LocationSelector
          currentLocationId={locationId}
          encounterData={{ body: encounterData.body }}
          isOpen={isMoveBodyModalOpen}
          moveTargetField="body"
          onClose={closeMoveBodyModal}
          onSelectLocation={handleMoveBody}
        />
      ) : null}
    </>
  );
}
