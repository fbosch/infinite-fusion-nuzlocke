import { getDisplayPokemon } from "@/components/PokemonSummaryCard/utils";
import {
  getPreferredVariant,
  setPreferredVariant,
} from "@/lib/preferredVariants";
import { spriteKeys } from "@/lib/queries/sprites";
import { queryClient } from "@/lib/queryClient";
import { generateSpriteUrl, getArtworkVariants } from "@/lib/sprites";
import { getCurrentTimestamp } from "../store";
import { ensureActivePlaythroughWithEncounters } from "./shared";

// Set artwork variant globally (no longer stored in encounters)
export const setArtworkVariant = async (
  locationId: string,
  variant?: string,
) => {
  const activePlaythrough = ensureActivePlaythroughWithEncounters();
  if (!activePlaythrough) {
    return;
  }

  const encounter = activePlaythrough.encounters[locationId];
  if (!encounter) {
    return;
  }

  const displayPokemon = getDisplayPokemon(
    encounter.head,
    encounter.body,
    encounter.isFusion ?? false,
  );

  try {
    if (displayPokemon.isFusion && displayPokemon.head && displayPokemon.body) {
      await setPreferredVariant(
        displayPokemon.head.id,
        displayPokemon.body.id,
        variant ?? "",
      );
    } else if (displayPokemon.head || displayPokemon.body) {
      const pokemon = displayPokemon.head || displayPokemon.body;
      if (pokemon) {
        await setPreferredVariant(pokemon.id, null, variant ?? "");
      }
    }
  } catch (error: unknown) {
    console.warn("Failed to set preferred variant in cache:", error);
  }

  encounter.updatedAt = getCurrentTimestamp();
};

// Prefetch adjacent artwork variants for better UX
export const prefetchAdjacentVariants = async (
  headId?: number,
  bodyId?: number,
  currentVariant?: string,
  availableVariants?: string[],
) => {
  try {
    const variants =
      availableVariants || (await getArtworkVariants(headId, bodyId));

    if (!variants || variants.length <= 1) {
      return;
    }

    const currentIndex = variants.indexOf(currentVariant || "");
    const nextIndex = (currentIndex + 1) % variants.length;
    const prevIndex = (currentIndex - 1 + variants.length) % variants.length;

    const adjacentVariants = [variants[nextIndex], variants[prevIndex]].filter(
      (variant) => variant && variant !== currentVariant,
    );

    const prefetchPromises = adjacentVariants.map((variant) => () => {
      try {
        const imageUrl = generateSpriteUrl(headId, bodyId, variant);
        const img = new Image();
        img.setAttribute("decoding", "async");
        img.src = imageUrl;
        img.onload = () => {
          console.debug(`Prefetched variant: ${variant}`);
        };
        img.onerror = () => {
          console.warn(`Failed to prefetch variant: ${variant}`);
        };
      } catch (error) {
        console.warn(`Failed to get URL for variant ${variant}:`, error);
      }
    });

    window.requestAnimationFrame(() => {
      prefetchPromises.forEach((prefetch) => {
        prefetch();
      });
    });
  } catch (error) {
    console.warn("Failed to prefetch adjacent variants:", error);
  }
};

// Cycle through artwork variants for encounters (with validation)
export const cycleArtworkVariant = async (
  locationId: string,
  reverse: boolean = false,
) => {
  const activePlaythrough = ensureActivePlaythroughWithEncounters();
  if (!activePlaythrough) {
    return;
  }

  const encounter = activePlaythrough.encounters[locationId];
  if (!encounter) {
    return;
  }

  try {
    const queryKey = spriteKeys.variants(
      encounter.head?.id,
      encounter.body?.id,
    );
    let availableVariants = queryClient.getQueryData<string[]>(queryKey);

    if (!availableVariants) {
      availableVariants = await getArtworkVariants(
        encounter.head?.id,
        encounter.body?.id,
      );
    }

    if (!availableVariants || availableVariants.length <= 1) {
      return;
    }

    const displayPokemon = getDisplayPokemon(
      encounter.head,
      encounter.body,
      encounter.isFusion ?? false,
    );

    const headId = displayPokemon.head?.id;
    const bodyId = displayPokemon.body?.id;

    const currentVariant =
      getPreferredVariant(headId ?? null, bodyId ?? null) || "";
    const currentIndex = availableVariants.indexOf(currentVariant);
    const nextIndex = reverse
      ? (currentIndex - 1 + availableVariants.length) % availableVariants.length
      : (currentIndex + 1) % availableVariants.length;

    const newVariant = availableVariants[nextIndex] || "";

    if (displayPokemon.isFusion && displayPokemon.head && displayPokemon.body) {
      await setPreferredVariant(
        displayPokemon.head.id,
        displayPokemon.body.id,
        newVariant,
      );
    } else if (displayPokemon.head || displayPokemon.body) {
      const pokemon = displayPokemon.head || displayPokemon.body;
      if (pokemon) {
        await setPreferredVariant(pokemon.id, null, newVariant);
      }
    }

    encounter.updatedAt = getCurrentTimestamp();

    if (availableVariants.length > 2) {
      prefetchAdjacentVariants(
        headId ?? undefined,
        bodyId ?? undefined,
        newVariant,
        availableVariants,
      ).catch((error) => {
        console.warn("Failed to prefetch adjacent variants:", error);
      });
    }
  } catch (error) {
    console.error("Failed to cycle artwork variant:", error);
    encounter.updatedAt = getCurrentTimestamp();
  }
};

// Preload artwork variants for all encounters in the current playthrough
export const preloadArtworkVariants = async () => {
  const activePlaythrough = ensureActivePlaythroughWithEncounters();
  if (!activePlaythrough) {
    return;
  }

  const encountersToPreload = Object.entries(
    activePlaythrough.encounters,
  ).filter(([, encounter]) => {
    if (encounter.isFusion && encounter.head && encounter.body) {
      return true;
    }

    if (!encounter.isFusion && encounter.head) {
      return true;
    }

    return false;
  });

  if (encountersToPreload.length === 0) {
    console.debug("No encounters found to preload variants for");
    return;
  }

  console.debug(
    `Preloading artwork variants for ${encountersToPreload.length} encounters...`,
  );

  try {
    const batchSize = 3;
    for (let i = 0; i < encountersToPreload.length; i += batchSize) {
      const batch = encountersToPreload.slice(i, i + batchSize);

      const batchPromises = batch.map(([, encounter]) => {
        if (encounter.isFusion && encounter.head && encounter.body) {
          return getArtworkVariants(encounter.head.id, encounter.body.id).catch(
            (error: unknown) => {
              console.warn(
                `Failed to preload fusion variants ${encounter.head?.id}.${encounter.body?.id}:`,
                error,
              );
            },
          );
        }

        if (encounter.head) {
          return getArtworkVariants(encounter.head.id).catch(
            (error: unknown) => {
              console.warn(
                `Failed to preload Pokemon variants ${encounter.head?.id}:`,
                error,
              );
            },
          );
        }

        return Promise.resolve();
      });

      await Promise.all(batchPromises);

      if (i + batchSize < encountersToPreload.length) {
        await new Promise((resolve) => setTimeout(resolve, 200));
      }
    }

    console.debug("Artwork variant preloading completed");
  } catch (error) {
    console.error("Failed to preload artwork variants:", error);
  }
};
