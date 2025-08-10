import { ContextMenu, type ContextMenuItem } from '@/components/ContextMenu';
import { Fragment, useState, useMemo, useCallback } from 'react';
import {
  ArrowUpRight,
  Loader2,
  Replace,
  Skull,
  Computer,
  Gift,
} from 'lucide-react';
import PokeballIcon from '@/assets/images/pokeball.svg';
import EscapeIcon from '@/assets/images/escape-cloud.svg';
import HeadIcon from '@/assets/images/head.svg';
import BodyIcon from '@/assets/images/body.svg';
import { useSpriteVariants, usePreferredVariantState } from '@/hooks/useSprite';
import { isEggId, type PokemonOptionType } from '@/loaders/pokemon';
import { playthroughActions } from '@/stores/playthroughs';
import { getDisplayPokemon } from './utils';
import dynamic from 'next/dynamic';

const LocationSelector = dynamic(
  () => import('./LocationSelector').then(mod => mod.LocationSelector),
  {
    ssr: false,
  }
);

const ArtworkVariantModal = dynamic(
  () => import('./ArtworkVariantModal').then(mod => mod.ArtworkVariantModal),
  {
    ssr: false,
  }
);

interface PokemonContextMenuProps {
  children: React.ReactNode;
  locationId: string;
  encounterData: {
    head?: PokemonOptionType | null;
    body?: PokemonOptionType | null;
    isFusion?: boolean;
  } | null;
  shouldLoad?: boolean;
}

export function PokemonContextMenu({
  children,
  locationId,
  encounterData,
  shouldLoad,
}: PokemonContextMenuProps) {
  // Determine which Pokemon to display based on active/inactive states
  const displayPokemon = getDisplayPokemon(
    encounterData?.head ?? null,
    encounterData?.body ?? null,
    encounterData?.isFusion ?? false
  );

  const eitherPokemonIsEgg =
    isEggId(encounterData?.head?.id) || isEggId(encounterData?.body?.id);

  // Check for art variants using display Pokemon
  const { data: variants, isLoading: isLoadingVariants } = useSpriteVariants(
    displayPokemon.head?.id,
    displayPokemon.body?.id,
    shouldLoad && !eitherPokemonIsEgg
  );
  const hasArtVariants = variants && variants.length > 1;

  // Get current preferred variant for the display Pokemon
  const { variant: preferredVariant } = usePreferredVariantState(
    displayPokemon.head?.id ?? null,
    displayPokemon.body?.id ?? null
  );

  const [hasContextMenuBeenOpened, setHasContextMenuBeenOpened] =
    useState(false);
  const [isVariantModalOpen, setIsVariantModalOpen] = useState(false);
  const [isMoveHeadModalOpen, setIsMoveHeadModalOpen] = useState(false);
  const [isMoveBodyModalOpen, setIsMoveBodyModalOpen] = useState(false);

  // Handler to mark both Pokemon in the fusion as deceased
  const handleMarkAsDeceased = useCallback(async () => {
    await playthroughActions.markEncounterAsDeceased(locationId);
  }, [locationId]);

  // Handler to move both Pokemon in the fusion to box (stored status)
  const handleMoveToBox = useCallback(async () => {
    await playthroughActions.moveEncounterToBox(locationId);
  }, [locationId]);

  // Handler to mark both Pokemon in the fusion as captured
  const handleMarkAsCaptured = useCallback(async () => {
    await playthroughActions.markEncounterAsCaptured(locationId);
  }, [locationId]);

  // Handler to mark both Pokemon in the fusion as missed
  const handleMarkAsMissed = useCallback(async () => {
    await playthroughActions.markEncounterAsMissed(locationId);
  }, [locationId]);

  // Handler to mark both Pokemon in the fusion as received
  const handleMarkAsReceived = useCallback(async () => {
    await playthroughActions.markEncounterAsReceived(locationId);
  }, [locationId]);

  // Handler for moving head Pokemon
  const handleMoveHead = useCallback(
    async (targetLocationId: string, targetField: 'head' | 'body') => {
      if (!encounterData?.head) return;

      // Check if there's already a Pokemon in the target slot
      const activePlaythrough = playthroughActions.getActivePlaythrough();
      const targetEncounter = activePlaythrough?.encounters?.[targetLocationId];
      const existingPokemon = targetEncounter
        ? targetField === 'head'
          ? targetEncounter.head
          : targetEncounter.body
        : null;

      if (existingPokemon) {
        // If there's already a Pokemon in the target slot, swap them
        await playthroughActions.swapEncounters(
          locationId,
          targetLocationId,
          'head',
          targetField
        );
      } else {
        // If the target slot is empty, use atomic move to preserve other Pokemon at source
        await playthroughActions.moveEncounterAtomic(
          locationId,
          'head',
          targetLocationId,
          targetField,
          encounterData.head
        );
      }
    },
    [encounterData?.head, locationId]
  );

  // Handler for moving body Pokemon
  const handleMoveBody = useCallback(
    async (targetLocationId: string, targetField: 'head' | 'body') => {
      if (!encounterData?.body) return;

      // Check if there's already a Pokemon in the target slot
      const activePlaythrough = playthroughActions.getActivePlaythrough();
      const targetEncounter = activePlaythrough?.encounters?.[targetLocationId];
      const existingPokemon = targetEncounter
        ? targetField === 'head'
          ? targetEncounter.head
          : targetEncounter.body
        : null;

      if (existingPokemon) {
        // If there's already a Pokemon in the target slot, swap them
        await playthroughActions.swapEncounters(
          locationId,
          targetLocationId,
          'body',
          targetField
        );
      } else {
        // If the target slot is empty, use atomic move to preserve other Pokemon at source
        await playthroughActions.moveEncounterAtomic(
          locationId,
          'body',
          targetLocationId,
          targetField,
          encounterData.body
        );
      }
    },
    [encounterData?.body, locationId]
  );

  const contextItems = useMemo<ContextMenuItem[]>(() => {
    // Use display Pokemon for links instead of raw encounter data
    const id =
      displayPokemon.head?.id && displayPokemon.body?.id
        ? `${displayPokemon.head.id}.${displayPokemon.body.id}`
        : displayPokemon.head?.id || displayPokemon.body?.id;
    const infinitefusiondexLink = `https://infinitefusiondex.com/details/${id}`;
    const fusiondexLink = `https://fusiondex.org/sprite/pif/${id}${preferredVariant ? `${preferredVariant}` : ''}/`;

    // Get current status (both Pokemon should have the same status in a fusion)
    const currentStatus =
      encounterData?.head?.status || encounterData?.body?.status;
    const hasPokemon = encounterData?.head || encounterData?.body;

    const items: ContextMenuItem[] = [
      {
        id: 'change-variant',
        label: 'Change Preferred Artwork',
        disabled: eitherPokemonIsEgg || !hasArtVariants,
        icon: isLoadingVariants ? Loader2 : Replace,
        tooltip:
          eitherPokemonIsEgg || !hasArtVariants
            ? isLoadingVariants
              ? 'Loading artwork variants...'
              : 'No artwork variants available'
            : undefined,
        iconClassName: isLoadingVariants ? 'animate-spin' : '',
        onClick: () => {
          setIsVariantModalOpen(true);
        },
      },
    ];

    // Only show status options if there are Pokemon and they're not eggs
    if (hasPokemon && !eitherPokemonIsEgg) {
      items.push({
        id: 'separator-1',
        separator: true,
      });

      // Show "Mark as Deceased" unless already deceased or missed
      if (currentStatus !== 'deceased' && currentStatus !== 'missed') {
        items.push({
          id: 'mark-deceased',
          label: 'Mark as Deceased',
          icon: Skull,

          onClick: handleMarkAsDeceased,
        });
      }

      // Show "Move to Box" only if captured, received, or traded
      if (
        currentStatus === 'captured' ||
        currentStatus === 'received' ||
        currentStatus === 'traded'
      ) {
        items.push({
          id: 'move-to-box',
          label: 'Mark as Stored',
          icon: Computer,

          onClick: handleMoveToBox,
        });
      }

      // Show "Mark as Captured" unless already captured or received
      if (currentStatus !== 'captured' && currentStatus !== 'received') {
        items.push({
          id: 'mark-captured',
          label: 'Mark as Captured',
          icon: PokeballIcon,

          onClick: handleMarkAsCaptured,
        });
      }

      // Show "Mark as Missed" only when no status is set on either Pokemon
      if (!currentStatus) {
        items.push({
          id: 'mark-missed',
          label: 'Mark as Missed',
          icon: EscapeIcon,

          onClick: handleMarkAsMissed,
        });
      }

      // Show "Mark as Received" unless already received or captured
      if (currentStatus !== 'received' && currentStatus !== 'captured') {
        items.push({
          id: 'mark-received',
          label: 'Mark as Received',
          icon: Gift,

          onClick: handleMarkAsReceived,
        });
      }

      // Add move actions if there are Pokemon
      if (hasPokemon && !eitherPokemonIsEgg) {
        items.push({
          id: 'separator-move',
          separator: true,
        });

        // Show "Move Head" if head Pokemon exists
        if (encounterData?.head) {
          items.push({
            id: 'move-head',
            label: 'Move Head',
            icon: HeadIcon,
            onClick: () => {
              setIsMoveHeadModalOpen(true);
            },
          });
        }

        // Show "Move Body" if body Pokemon exists
        if (encounterData?.body) {
          items.push({
            id: 'move-body',
            label: 'Move Body',
            icon: BodyIcon,
            onClick: () => {
              setIsMoveBodyModalOpen(true);
            },
          });
        }
      }
    }

    items.push({
      id: 'separator-2',
      separator: true,
    });

    // Add external links
    items.push(
      {
        id: 'infinitefusiondex',
        label: 'Open InfiniteDex entry',
        href: infinitefusiondexLink,
        target: '_blank',
        favicon: 'https://infinitefusiondex.com/images/favicon.ico',
        icon: ArrowUpRight,
        iconClassName: 'dark:text-blue-300 text-blue-400',
      },
      {
        id: 'fusiondex',
        label: 'Open FusionDex entry',
        href: fusiondexLink,
        target: '_blank',
        favicon: 'https://www.fusiondex.org/favicon.ico',
        icon: ArrowUpRight,
        iconClassName: 'dark:text-blue-300 text-blue-400',
      }
    );

    return items;
  }, [
    encounterData,
    displayPokemon,
    eitherPokemonIsEgg,
    hasArtVariants,
    isLoadingVariants,
    handleMarkAsDeceased,
    handleMoveToBox,
    handleMarkAsCaptured,
    handleMarkAsMissed,
    handleMarkAsReceived,
  ]);

  return (
    <>
      <ContextMenu
        disabled={eitherPokemonIsEgg}
        items={contextItems}
        portalRootId='location-table'
        onOpenChange={
          hasContextMenuBeenOpened
            ? undefined
            : () => setHasContextMenuBeenOpened(true)
        }
      >
        {children}
      </ContextMenu>

      <ArtworkVariantModal
        isOpen={isVariantModalOpen}
        onClose={() => setIsVariantModalOpen(false)}
        headId={displayPokemon.head?.id}
        bodyId={displayPokemon.body?.id}
      />

      {/* Location Selector for Moving Head */}
      <LocationSelector
        isOpen={isMoveHeadModalOpen}
        onClose={() => setIsMoveHeadModalOpen(false)}
        currentLocationId={locationId}
        onSelectLocation={handleMoveHead}
        encounterData={
          encounterData?.head ? { head: encounterData.head } : null
        }
        moveTargetField='head'
      />

      {/* Location Selector for Moving Body */}
      <LocationSelector
        isOpen={isMoveBodyModalOpen}
        onClose={() => setIsMoveBodyModalOpen(false)}
        currentLocationId={locationId}
        onSelectLocation={handleMoveBody}
        encounterData={
          encounterData?.body ? { body: encounterData.body } : null
        }
        moveTargetField='body'
      />
    </>
  );
}
