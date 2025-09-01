import { ContextMenu, type ContextMenuItem } from '@/components/ContextMenu';
import { Fragment, useState, useMemo, useCallback } from 'react';
import {
  ArrowUpRight,
  Loader2,
  Replace,
  Skull,
  Computer,
  Atom,
  Undo2,
  ArrowLeftRight,
} from 'lucide-react';
import { useSpriteVariants, usePreferredVariantState } from '@/hooks/useSprite';
import {
  isEggId,
  type PokemonOptionType,
  usePokemonEvolutionData,
  PokemonStatus,
} from '@/loaders/pokemon';
import { playthroughActions } from '@/stores/playthroughs';
import { getSpriteId } from '@/lib/sprites';
import { PokemonSprite } from '../PokemonSprite';
import dynamic from 'next/dynamic';
import { emitEvolutionEvent } from '@/lib/events';

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

  // Get evolution data for both Pokémon
  const { evolutions: headEvolutions, preEvolution: headPreEvolution } =
    usePokemonEvolutionData(headPokemon?.id, true);
  const { evolutions: bodyEvolutions, preEvolution: bodyPreEvolution } =
    usePokemonEvolutionData(bodyPokemon?.id, true);

  const [isVariantModalOpen, setIsVariantModalOpen] = useState(false);

  // Handler to mark team member as deceased
  const handleMarkAsDeceased = useCallback(async () => {
    if (!headPokemon?.uid && !bodyPokemon?.uid) return;

    // Mark both Pokémon as deceased if they exist
    if (headPokemon?.uid) {
      await playthroughActions.updatePokemonByUID(headPokemon.uid, {
        status: PokemonStatus.DECEASED,
      });
    }
    if (bodyPokemon?.uid) {
      await playthroughActions.updatePokemonByUID(bodyPokemon.uid, {
        status: PokemonStatus.DECEASED,
      });
    }

    // Clear the team member slot after marking as deceased
    await playthroughActions.updateTeamMember(position, null, null);
  }, [headPokemon?.uid, bodyPokemon?.uid, position]);

  // Handler to move team member to box
  const handleMoveToBox = useCallback(async () => {
    await playthroughActions.moveTeamMemberToBox(position);
  }, [position]);

  // Handler to evolve head Pokémon
  const handleEvolveHead = useCallback(
    async (
      evolutionId: number,
      evolutionName: string,
      evolutionNationalDexId: number
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
    [headPokemon]
  );

  // Handler to evolve body Pokémon
  const handleEvolveBody = useCallback(
    async (
      evolutionId: number,
      evolutionName: string,
      evolutionNationalDexId: number
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
    [bodyPokemon]
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
    if (!isFusion || !headPokemon?.uid || !bodyPokemon?.uid) return;

    // Swap head and body by updating the team member
    await playthroughActions.updateTeamMember(
      position,
      { uid: bodyPokemon.uid },
      { uid: headPokemon.uid }
    );
  }, [isFusion, headPokemon?.uid, bodyPokemon?.uid, position]);

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

    // Check if this is a fusion (both head and body exist and are different)
    const isFusion =
      headPokemon && bodyPokemon && headPokemon.id !== bodyPokemon.id;

    // Add inverse fusion option if this is a fusion
    if (isFusion) {
      items.push({
        id: 'invert-fusion',
        label: 'Invert Fusion',
        icon: ArrowLeftRight,
        onClick: handleFlipFusion,
        tooltip: 'Swap head and body Pokémon positions',
      });
    }

    // Add evolution options if available
    if (headPokemon && (headEvolutions?.length || headPreEvolution)) {
      items.push({
        id: 'evolution-separator',
        separator: true,
      });

      // Add devolve option for head Pokémon
      if (headPreEvolution) {
        items.push({
          id: 'devolve-head',
          label: (
            <div className='flex items-center gap-x-2 w-full'>
              <div className='flex items-center justify-center size-6 flex-shrink-0'>
                <PokemonSprite
                  pokemonId={headPreEvolution.id}
                  generation='gen7'
                />
              </div>
              <span className='truncate'>
                Devolve {isFusion ? 'Head' : ''} to {headPreEvolution.name}
              </span>
            </div>
          ),
          icon: Undo2,
          onClick: handleDevolveHead,
        });
      }

      // Add evolve options for head Pokémon
      if (headEvolutions && headEvolutions.length > 0) {
        if (headEvolutions.length === 1) {
          const evo = headEvolutions[0]!;
          items.push({
            id: `evolve-head-${evo.id}`,
            label: (
              <div className='flex items-center gap-x-2 w-full'>
                <div className='flex items-center justify-center size-6 flex-shrink-0'>
                  <PokemonSprite pokemonId={evo.id} generation='gen7' />
                </div>
                <span className='truncate'>
                  Evolve {isFusion ? 'Head' : ''} to {evo.name}
                </span>
              </div>
            ),
            icon: Atom,
            onClick: () =>
              handleEvolveHead(evo.id, evo.name, evo.nationalDexId),
          });
        } else {
          items.push({
            id: 'evolve-head',
            label: `Evolve ${isFusion ? 'Head' : ''} to…`,
            icon: Atom,
            children: headEvolutions.map(evo => ({
              id: `evolve-head-${evo.id}`,
              label: (
                <div className='flex items-center gap-x-2 w-full'>
                  <div className='flex items-center justify-center size-6 flex-shrink-0'>
                    <PokemonSprite pokemonId={evo.id} generation='gen7' />
                  </div>
                  <span className='truncate'>{evo.name}</span>
                </div>
              ),
              onClick: () =>
                handleEvolveHead(evo.id, evo.name, evo.nationalDexId),
            })),
          });
        }
      }
    }

    // Add evolution options for body Pokémon if it exists and is different from head
    if (
      bodyPokemon &&
      bodyPokemon.id !== headPokemon?.id &&
      (bodyEvolutions?.length || bodyPreEvolution)
    ) {
      // Add separator between head and body evolution sections
      items.push({
        id: 'head-body-evolution-separator',
        separator: true,
      });
      // Add devolve option for body Pokémon
      if (bodyPreEvolution) {
        items.push({
          id: 'devolve-body',
          label: (
            <div className='flex items-center gap-x-2 w-full'>
              <div className='flex items-center justify-center size-6 flex-shrink-0'>
                <PokemonSprite
                  pokemonId={bodyPreEvolution.id}
                  generation='gen7'
                />
              </div>
              <span className='truncate'>
                Devolve {isFusion ? 'Body' : ''} to {bodyPreEvolution.name}
              </span>
            </div>
          ),
          icon: Undo2,
          onClick: handleDevolveBody,
        });
      }

      // Add evolve options for body Pokémon
      if (bodyEvolutions && bodyEvolutions.length > 0) {
        if (bodyEvolutions.length === 1) {
          const evo = bodyEvolutions[0]!;
          items.push({
            id: `evolve-body-${evo.id}`,
            label: (
              <div className='flex items-center gap-x-2 w-full'>
                <div className='flex items-center justify-center size-6 flex-shrink-0'>
                  <PokemonSprite pokemonId={evo.id} generation='gen7' />
                </div>
                <span className='truncate'>
                  Evolve {isFusion ? 'Body' : ''} to {evo.name}
                </span>
              </div>
            ),
            icon: Atom,
            onClick: () =>
              handleEvolveBody(evo.id, evo.name, evo.nationalDexId),
          });
        } else {
          items.push({
            id: 'evolve-body',
            label: `Evolve ${isFusion ? 'Body' : ''} to…`,
            icon: Atom,
            children: bodyEvolutions.map(evo => ({
              id: `evolve-body-${evo.id}`,
              label: (
                <div className='flex items-center gap-x-2 w-full'>
                  <div className='flex items-center justify-center size-6 flex-shrink-0'>
                    <PokemonSprite pokemonId={evo.id} generation='gen7' />
                  </div>
                  <span className='truncate'>{evo.name}</span>
                </div>
              ),
              onClick: () =>
                handleEvolveBody(evo.id, evo.name, evo.nationalDexId),
            })),
          });
        }
      }
    }

    // Add status actions
    items.push({
      id: 'separator-1',
      separator: true,
    });

    // Show "Mark as Deceased" unless already deceased or missed
    if (
      currentStatus !== PokemonStatus.DECEASED &&
      currentStatus !== PokemonStatus.MISSED
    ) {
      items.push({
        id: 'mark-deceased',
        label: 'Move to Graveyard',
        icon: Skull,
        onClick: handleMarkAsDeceased,
      });
    }

    // Show "Move to Box" only if captured, received, traded, or deceased
    if (
      currentStatus === PokemonStatus.CAPTURED ||
      currentStatus === PokemonStatus.RECEIVED ||
      currentStatus === PokemonStatus.TRADED ||
      currentStatus === PokemonStatus.DECEASED
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
    headEvolutions,
    headPreEvolution,
    bodyEvolutions,
    bodyPreEvolution,
    handleEvolveHead,
    handleEvolveBody,
    handleDevolveHead,
    handleDevolveBody,
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
