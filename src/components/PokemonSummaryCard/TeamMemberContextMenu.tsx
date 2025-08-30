import { ContextMenu, type ContextMenuItem } from '@/components/ContextMenu';
import { Fragment, useState, useMemo, useCallback } from 'react';
import { ArrowUpRight, Loader2, Replace, Skull, Computer } from 'lucide-react';
import { useSpriteVariants, usePreferredVariantState } from '@/hooks/useSprite';
import { isEggId, type PokemonOptionType } from '@/loaders/pokemon';
import { playthroughActions } from '@/stores/playthroughs';
import { getSpriteId } from '@/lib/sprites';
import dynamic from 'next/dynamic';

const ArtworkVariantModal = dynamic(
  () => import('./ArtworkVariantModal').then(mod => mod.ArtworkVariantModal),
  {
    ssr: false,
  }
);

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
  const { headPokemon, bodyPokemon, isFusion, position } = teamMember;

  // Check for art variants using the team member's Pokémon
  const { data: variants, isLoading: isLoadingVariants } = useSpriteVariants(
    headPokemon?.id,
    bodyPokemon?.id,
    shouldLoad && !isEggId(headPokemon?.id) && !isEggId(bodyPokemon?.id)
  );
  const hasArtVariants = variants && variants.length > 1;

  // Get current preferred variant for the team member
  const { variant: preferredVariant } = usePreferredVariantState(
    headPokemon?.id ?? null,
    bodyPokemon?.id ?? null
  );

  const [isVariantModalOpen, setIsVariantModalOpen] = useState(false);

  // Handler to mark team member as deceased
  const handleMarkAsDeceased = useCallback(async () => {
    if (!headPokemon?.uid && !bodyPokemon?.uid) return;

    // Mark both Pokémon as deceased if they exist
    if (headPokemon?.uid) {
      await playthroughActions.updatePokemonByUID(headPokemon.uid, {
        status: 'deceased',
      });
    }
    if (bodyPokemon?.uid) {
      await playthroughActions.updatePokemonByUID(bodyPokemon.uid, {
        status: 'deceased',
      });
    }

    // Clear the team member slot after marking as deceased
    await playthroughActions.updateTeamMember(position, null, null);
  }, [headPokemon?.uid, bodyPokemon?.uid, position]);

  // Handler to move team member to box
  const handleMoveToBox = useCallback(async () => {
    await playthroughActions.moveTeamMemberToBox(position);
  }, [position]);

  const contextItems = useMemo<ContextMenuItem[]>(() => {
    // Use team member Pokémon for links
    const id = getSpriteId(headPokemon?.id, bodyPokemon?.id);
    const infinitefusiondexLink = `https://infinitefusiondex.com/details/${id}`;
    const fusiondexLink = `https://fusiondex.org/sprite/pif/${id}${preferredVariant ? `${preferredVariant}` : ''}/`;

    // Get current status (check both Pokémon, they should have the same status)
    const currentStatus = headPokemon?.status || bodyPokemon?.status;

    const items: ContextMenuItem[] = [
      {
        id: 'change-variant',
        label: 'Change Preferred Artwork',
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
              ? 'Loading artwork variants...'
              : 'No artwork variants available'
            : undefined,
        iconClassName: isLoadingVariants ? 'animate-spin' : '',
        onClick: () => {
          setIsVariantModalOpen(true);
        },
      },
    ];

    // Add status actions
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

    // Show "Move to Box" only if captured, received, traded, or deceased
    if (
      currentStatus === 'captured' ||
      currentStatus === 'received' ||
      currentStatus === 'traded' ||
      currentStatus === 'deceased'
    ) {
      items.push({
        id: 'move-to-box',
        label: 'Move to Box',
        icon: Computer,
        onClick: handleMoveToBox,
      });
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
    headPokemon,
    bodyPokemon,
    preferredVariant,
    hasArtVariants,
    isLoadingVariants,
    handleMarkAsDeceased,
    handleMoveToBox,
  ]);

  return (
    <>
      <ContextMenu
        disabled={isEggId(headPokemon?.id) || isEggId(bodyPokemon?.id)}
        items={contextItems}
        portalRootId='team-slots'
      >
        {children}
      </ContextMenu>

      <ArtworkVariantModal
        isOpen={isVariantModalOpen}
        onClose={() => setIsVariantModalOpen(false)}
        headId={headPokemon?.id}
        bodyId={bodyPokemon?.id}
        isFusion={isFusion}
      />
    </>
  );
}
