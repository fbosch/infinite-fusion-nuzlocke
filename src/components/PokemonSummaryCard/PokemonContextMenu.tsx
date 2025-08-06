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
import { useSpriteVariants } from '@/hooks/useSprite';
import { isEggId, type PokemonOptionType } from '@/loaders/pokemon';
import { playthroughActions } from '@/stores/playthroughs';
import dynamic from 'next/dynamic';

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
    artworkVariant?: string;
  } | null;
  shouldLoad?: boolean;
}

export function PokemonContextMenu({
  children,
  locationId,
  encounterData,
  shouldLoad,
}: PokemonContextMenuProps) {
  const eitherPokemonIsEgg =
    isEggId(encounterData?.head?.id) || isEggId(encounterData?.body?.id);

  // Check for art variants
  const { data: variants, isLoading: isLoadingVariants } = useSpriteVariants(
    encounterData?.head?.id,
    encounterData?.body?.id,
    shouldLoad && !eitherPokemonIsEgg
  );
  const hasArtVariants = variants && variants.length > 1;

  const [hasContextMenuBeenOpened, setHasContextMenuBeenOpened] =
    useState(false);
  const [isVariantModalOpen, setIsVariantModalOpen] = useState(false);

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

  const contextItems = useMemo<ContextMenuItem[]>(() => {
    const id =
      encounterData?.head?.id && encounterData?.body?.id
        ? `${encounterData.head.id}.${encounterData.body.id}`
        : encounterData?.head?.id || encounterData?.body?.id;
    const infinitefusiondexLink = `https://infinitefusiondex.com/details/${id}`;
    const fusiondexLink = `https://fusiondex.org/sprite/pif/${id}${encounterData?.artworkVariant ?? ''}/`;

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
          label: 'Move to Box',
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

      // Show "Mark as Missed" unless already missed
      if (currentStatus !== 'missed') {
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
        locationId={locationId}
        headId={encounterData?.head?.id}
        bodyId={encounterData?.body?.id}
        currentVariant={encounterData?.artworkVariant}
      />
    </>
  );
}
