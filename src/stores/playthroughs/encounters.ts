import { z } from 'zod';
import {
  PokemonOptionSchema,
  PokemonOptionType,
  generatePokemonUID,
  PokemonStatus,
} from '@/loaders/pokemon';
import {
  generateSpriteUrl,
  getArtworkVariants,
  getSpriteId,
} from '@/lib/sprites';
import {
  getPreferredVariant,
  setPreferredVariant,
} from '@/lib/preferredVariants';
import { getDisplayPokemon } from '@/components/PokemonSummaryCard/utils';
import { queryClient } from '@/lib/queryClient';
import { spriteKeys } from '@/lib/queries/sprites';
import { EncounterDataSchema, EncounterData, Playthrough } from './types';
import { getActivePlaythrough, getCurrentTimestamp } from './store';
import { emitEvolutionEvent } from '@/lib/events';

function getFusionSpriteIdFromEncounter(enc?: {
  head: z.infer<typeof PokemonOptionSchema> | null;
  body: z.infer<typeof PokemonOptionSchema> | null;
  isFusion?: boolean;
}) {
  if (!enc || !enc.isFusion || !enc.head || !enc.body) return null;
  const headId = enc.head?.id ?? null;
  const bodyId = enc.body?.id ?? null;
  if (!headId || !bodyId) return null;
  try {
    return getSpriteId(headId, bodyId);
  } catch {
    return null;
  }
}

// Create encounter data (variants are now managed globally)
export const createEncounterData = async (
  pokemon: z.infer<typeof PokemonOptionSchema> | null,
  field: 'head' | 'body' = 'head',
  shouldCreateFusion: boolean = false,
  locationId?: string
): Promise<z.infer<typeof EncounterDataSchema>> => {
  const pokemonWithLocationAndUID = pokemon
    ? {
        ...pokemon,
        originalLocation: pokemon.originalLocation ?? locationId ?? '',
        uid: pokemon.uid || generatePokemonUID(),
      }
    : null;

  // Create encounter data without artwork variant (now managed globally)
  const encounterData: z.infer<typeof EncounterDataSchema> = {
    head: field === 'head' ? pokemonWithLocationAndUID : null,
    body: field === 'body' ? pokemonWithLocationAndUID : null,
    isFusion: shouldCreateFusion,
    updatedAt: getCurrentTimestamp(),
  };

  return encounterData;
};

// Get encounters for active playthrough
export const getEncounters = (): Playthrough['encounters'] => {
  const activePlaythrough = getActivePlaythrough();
  return activePlaythrough?.encounters || {};
};

// Update a Pokémon's properties by UID across all encounters
export const updatePokemonByUID = async (
  pokemonUID: string,
  updates: Partial<z.infer<typeof PokemonOptionSchema>>
) => {
  const activePlaythrough = getActivePlaythrough();
  if (!activePlaythrough?.encounters) {
    return;
  }

  // Find and update the Pokémon in all encounters
  for (const [_locationId, encounter] of Object.entries(
    activePlaythrough.encounters
  )) {
    if (encounter.head?.uid === pokemonUID) {
      encounter.head = { ...encounter.head, ...updates };
      encounter.updatedAt = getCurrentTimestamp();
    }
    if (encounter.body?.uid === pokemonUID) {
      encounter.body = { ...encounter.body, ...updates };
      encounter.updatedAt = getCurrentTimestamp();
    }
  }

  // Update the playthrough timestamp to trigger reactivity
  activePlaythrough.updatedAt = getCurrentTimestamp();
};

// Update a Pokémon's properties in a specific encounter by UID and field
export const updatePokemonInEncounter = async (
  locationId: string,
  pokemonUID: string,
  field: 'head' | 'body',
  updates: Partial<z.infer<typeof PokemonOptionSchema>>
) => {
  console.log('updatePokemonInEncounter called with:', {
    locationId,
    pokemonUID,
    field,
    updates,
  });

  const activePlaythrough = getActivePlaythrough();
  if (!activePlaythrough?.encounters?.[locationId]) {
    console.log(
      'No active playthrough or encounter not found for locationId:',
      locationId
    );
    return;
  }

  const encounter = activePlaythrough.encounters[locationId];
  console.log('Found encounter:', encounter);

  const pokemon = encounter[field];
  console.log('Pokemon in field', field, ':', pokemon);

  if (pokemon?.uid === pokemonUID) {
    console.log('Updating pokemon from:', pokemon, 'to:', {
      ...pokemon,
      ...updates,
    });
    encounter[field] = { ...pokemon, ...updates };
    encounter.updatedAt = getCurrentTimestamp();

    console.log('Updated encounter:', encounter);

    // Update the playthrough timestamp to trigger reactivity
    activePlaythrough.updatedAt = getCurrentTimestamp();
  } else {
    console.log(
      'Pokemon UID mismatch. Expected:',
      pokemonUID,
      'Found:',
      pokemon?.uid
    );
  }
};

// Update encounter for a location
export const updateEncounter = async (
  locationId: string,
  pokemon: z.infer<typeof PokemonOptionSchema> | null,
  field: 'head' | 'body' = 'head',
  shouldCreateFusion: boolean = false
) => {
  const activePlaythrough = getActivePlaythrough();
  if (!activePlaythrough) {
    return;
  }

  // Ensure encounters object exists
  if (!activePlaythrough.encounters) {
    activePlaythrough.encounters = {};
  }

  // Get or create encounter
  let encounter = activePlaythrough.encounters[locationId];
  if (!encounter) {
    // Create encounter data (variants are now managed globally)
    const encounterData = await createEncounterData(
      pokemon,
      field,
      shouldCreateFusion,
      locationId
    );
    encounter = encounterData;
    activePlaythrough.encounters[locationId] = encounter;
    // Trigger animation if we created a fusion and set a Pokemon in this field
    if (encounterData.isFusion && encounterData.head && encounterData.body) {
      emitEvolutionEvent(locationId);
    }
    return;
  }

  // Handle both setting and clearing pokemon
  if (pokemon) {
    const pokemonWithLocationAndUID = {
      ...pokemon,
      originalLocation: pokemon.originalLocation ?? locationId,
      uid: pokemon.uid || generatePokemonUID(),
    };

    // Determine if this should be a fusion encounter
    const willBeFusion =
      shouldCreateFusion || encounter.isFusion || field === 'body';

    // Track previous value for the field being updated
    const previousFieldId = encounter[field]?.id ?? null;
    if (willBeFusion) {
      encounter[field] = pokemonWithLocationAndUID;
      encounter.isFusion = true; // Preserve or set fusion state

      // Default behavior: If setting status on one part of a fusion and the other part
      // doesn't have a status, set both to the same status
      if (
        pokemonWithLocationAndUID.status &&
        encounter.head &&
        encounter.body
      ) {
        const otherField = field === 'head' ? 'body' : 'head';
        const otherPokemon = encounter[otherField];

        if (otherPokemon && !otherPokemon.status) {
          encounter[otherField] = {
            ...otherPokemon,
            status: pokemonWithLocationAndUID.status,
          };
        }
      }
    } else {
      // For regular encounters (only when setting head and not creating fusion)
      encounter.head = pokemonWithLocationAndUID;
      encounter.body = null;
      encounter.isFusion = false;
    }

    encounter.updatedAt = getCurrentTimestamp();

    // Emit when head or body changes while fusion is active
    const newFieldId = encounter[field]?.id ?? null;
    const fieldChanged = previousFieldId !== newFieldId;
    if (
      encounter.isFusion &&
      encounter.head &&
      encounter.body &&
      fieldChanged
    ) {
      emitEvolutionEvent(locationId);
    }
  } else {
    // Handle clearing pokemon
    // Clear the field
    encounter[field] = null;
    encounter.updatedAt = getCurrentTimestamp();
  }
};

// Reset encounter for a location
export const resetEncounter = (locationId: string) => {
  const activePlaythrough = getActivePlaythrough();
  if (!activePlaythrough) return;

  // Ensure encounters object exists
  if (!activePlaythrough.encounters) {
    activePlaythrough.encounters = {};
  }

  delete activePlaythrough.encounters[locationId];
  // Note: No need to update timestamp since encounter is deleted
};

// Toggle fusion mode for an encounter
export const toggleEncounterFusion = async (locationId: string) => {
  const activePlaythrough = getActivePlaythrough();
  if (!activePlaythrough) return;

  // Ensure encounters object exists
  if (!activePlaythrough.encounters) {
    activePlaythrough.encounters = {};
  }

  // Get existing encounter or create default
  const currentEncounter = activePlaythrough.encounters[locationId];
  const existingEncounter = currentEncounter || {
    head: null,
    body: null,
    isFusion: false,
    updatedAt: getCurrentTimestamp(),
  };

  const previousIsFusion = !!existingEncounter.isFusion;
  const newIsFusion = !previousIsFusion;

  // When unfusing (going from fusion to non-fusion)
  if (existingEncounter.isFusion && !newIsFusion) {
    // If head is empty but body has data, move body to head
    if (!existingEncounter.head && existingEncounter.body) {
      const newEncounter = {
        head: existingEncounter.body,
        body: null,
        isFusion: false,
        updatedAt: getCurrentTimestamp(),
      };
      activePlaythrough.encounters[locationId] = newEncounter;
    } else {
      // If both slots have data or only head has data, preserve as-is
      const newEncounter = {
        ...existingEncounter,
        isFusion: false,
        updatedAt: getCurrentTimestamp(),
      };
      activePlaythrough.encounters[locationId] = newEncounter;
    }
  } else {
    // When fusing (going from non-fusion to fusion) or other cases
    const newEncounter = {
      ...existingEncounter,
      isFusion: newIsFusion,
      updatedAt: getCurrentTimestamp(),
    };
    activePlaythrough.encounters[locationId] = newEncounter;
  }

  // Emit animation trigger when we transition into fusion mode
  // Do not emit here; animation should be tied to head/body changes while fusion is active
};

// Flip head and body in a fusion encounter atomically
export const flipEncounterFusion = async (locationId: string) => {
  const activePlaythrough = getActivePlaythrough();
  if (!activePlaythrough) return;

  // Ensure encounters object exists
  if (!activePlaythrough.encounters) {
    activePlaythrough.encounters = {};
  }

  const encounter = activePlaythrough.encounters[locationId];
  if (!encounter || !encounter.isFusion) return;

  // Display state management is now handled globally

  // Swap head and body atomically
  const originalHead = encounter.head;
  const originalBody = encounter.body;

  // Only animate when both parts exist and the fusion actually changes
  const prevSpriteId = getFusionSpriteIdFromEncounter(encounter);

  encounter.head = originalBody;
  encounter.body = originalHead;
  encounter.updatedAt = getCurrentTimestamp();

  // No need to handle variants - they're managed globally

  const nextSpriteId = getFusionSpriteIdFromEncounter(encounter);
  if (prevSpriteId && nextSpriteId && prevSpriteId !== nextSpriteId) {
    emitEvolutionEvent(locationId);
  }
};

// Move encounter atomically from source to destination (for drag and drop)
export const moveEncounterAtomic = async (
  sourceLocationId: string,
  sourceField: 'head' | 'body',
  targetLocationId: string,
  targetField: 'head' | 'body',
  pokemon: z.infer<typeof PokemonOptionSchema>
) => {
  const activePlaythrough = getActivePlaythrough();
  if (!activePlaythrough) return;

  // Ensure encounters object exists
  if (!activePlaythrough.encounters) {
    activePlaythrough.encounters = {};
  }

  // Check if we're moving within the same encounter
  const isIntraEncounterMove = sourceLocationId === targetLocationId;

  // Pre-fetch the preferred variant for the target encounter to avoid flickering
  const pokemonWithLocationAndUID = {
    ...pokemon,
    originalLocation: pokemon.originalLocation ?? targetLocationId,
    uid: pokemon.uid || generatePokemonUID(),
  };

  // Check if target location has an existing encounter and preserve its fusion state
  const existingTargetEncounter =
    activePlaythrough.encounters[targetLocationId];
  const willBeFusion =
    targetField === 'body' || existingTargetEncounter?.isFusion === true;

  // Variants are now managed globally, no need to pre-fetch

  if (isIntraEncounterMove && existingTargetEncounter) {
    // Moving within same encounter - no need to fetch variants since they're global
    // Variants are managed globally now
  } else {
    // Moving between different encounters - variants managed globally
  }

  // Clear source first to avoid duplicates
  await clearEncounterFromLocation(sourceLocationId, sourceField);

  // Create the target encounter with the pre-fetched variant, preserving existing pokemon
  const newEncounter: z.infer<typeof EncounterDataSchema> = {
    head:
      targetField === 'head'
        ? pokemonWithLocationAndUID
        : existingTargetEncounter?.head || null,
    body:
      targetField === 'body'
        ? pokemonWithLocationAndUID
        : existingTargetEncounter?.body || null,
    isFusion: willBeFusion,

    updatedAt: getCurrentTimestamp(),
  };

  activePlaythrough.encounters[targetLocationId] = newEncounter;
  // Emit when creating/updating a fusion via drag/drop and the changed field is set
  if (newEncounter.isFusion && newEncounter.head && newEncounter.body) {
    emitEvolutionEvent(targetLocationId);
  }
};

// Create fusion from drag and drop
export const createFusion = async (
  locationId: string,
  head: z.infer<typeof PokemonOptionSchema>,
  body: z.infer<typeof PokemonOptionSchema>
) => {
  const activePlaythrough = getActivePlaythrough();
  if (!activePlaythrough) return;

  // Ensure encounters object exists
  if (!activePlaythrough.encounters) {
    activePlaythrough.encounters = {};
  }

  // Preserve originalLocation - never overwrite once set!
  const headWithLocation = {
    ...head,
    originalLocation: head.originalLocation ?? locationId,
    uid: head.uid || generatePokemonUID(),
  };

  const bodyWithLocation = {
    ...body,
    originalLocation: body.originalLocation ?? locationId,
    uid: body.uid || generatePokemonUID(),
  };

  const encounter = {
    head: headWithLocation,
    body: bodyWithLocation,
    isFusion: true,
    updatedAt: getCurrentTimestamp(),
  };

  activePlaythrough.encounters[locationId] = encounter;
  // Emit animation on creating a fusion from DnD
  if (encounter.head && encounter.body) emitEvolutionEvent(locationId);
};

// Set artwork variant globally (no longer stored in encounters)
export const setArtworkVariant = async (
  locationId: string,
  variant?: string
) => {
  const activePlaythrough = getActivePlaythrough();
  if (!activePlaythrough) return;

  const encounter = activePlaythrough.encounters?.[locationId];
  if (!encounter) return;

  // Determine which Pokemon this variant applies to based on display state
  const displayPokemon = getDisplayPokemon(
    encounter.head,
    encounter.body,
    encounter.isFusion ?? false
  );

  // Update the global preferred variant cache
  try {
    if (displayPokemon.isFusion && displayPokemon.head && displayPokemon.body) {
      await setPreferredVariant(
        displayPokemon.head.id,
        displayPokemon.body.id,
        variant ?? ''
      );
    } else if (displayPokemon.head || displayPokemon.body) {
      const pokemon = displayPokemon.head || displayPokemon.body!;
      await setPreferredVariant(pokemon.id, null, variant ?? '');
    }
  } catch (error: unknown) {
    console.warn('Failed to set preferred variant in cache:', error);
  }

  // Update encounter timestamp to trigger reactivity
  encounter.updatedAt = getCurrentTimestamp();
};

// Prefetch adjacent artwork variants for better UX
export const prefetchAdjacentVariants = async (
  headId?: number,
  bodyId?: number,
  currentVariant?: string,
  availableVariants?: string[]
) => {
  try {
    // Get available variants if not provided
    const variants =
      availableVariants || (await getArtworkVariants(headId, bodyId));

    // Early return if no variants or only one variant
    if (!variants || variants.length <= 1) return;

    // Find current variant index
    const currentIndex = variants.indexOf(currentVariant || '');

    // Calculate adjacent indices (next and previous)
    const nextIndex = (currentIndex + 1) % variants.length;
    const prevIndex = (currentIndex - 1 + variants.length) % variants.length;

    // Get the adjacent variants
    const adjacentVariants = [variants[nextIndex], variants[prevIndex]].filter(
      variant => variant && variant !== currentVariant
    );

    // Prefetch the adjacent variant images
    const prefetchPromises = adjacentVariants.map(variant => () => {
      try {
        const imageUrl = generateSpriteUrl(headId, bodyId, variant);
        // Create new Image object to trigger prefetch
        const img = new Image();
        img.setAttribute('decoding', 'async');
        img.src = imageUrl;
        // Optionally handle load/error events
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
      prefetchPromises.forEach(p => p());
    });

    // Execute prefetch operations in parallel (no need for await since we're just triggering prefetch)
  } catch (error) {
    console.warn('Failed to prefetch adjacent variants:', error);
  }
};

// Cycle through artwork variants for encounters (with validation)
export const cycleArtworkVariant = async (
  locationId: string,
  reverse: boolean = false
) => {
  const activePlaythrough = getActivePlaythrough();
  if (!activePlaythrough?.encounters) return;

  const encounter = activePlaythrough.encounters[locationId];
  if (!encounter) return;

  try {
    // First try to get cached variants from React Query
    const queryKey = spriteKeys.variants(
      encounter.head?.id,
      encounter.body?.id
    );
    let availableVariants = queryClient.getQueryData<string[]>(queryKey);

    // If not in cache, fetch variants
    if (!availableVariants) {
      availableVariants = await getArtworkVariants(
        encounter.head?.id,
        encounter.body?.id
      );
    }

    // Early return if no variants or only default
    if (!availableVariants || availableVariants.length <= 1) return;

    // Determine which Pokemon this variant applies to based on display state
    const displayPokemon = getDisplayPokemon(
      encounter.head,
      encounter.body,
      encounter.isFusion ?? false
    );

    const headId = displayPokemon.head?.id;
    const bodyId = displayPokemon.body?.id;

    // Get current variant from global preferred variants
    const currentVariant =
      getPreferredVariant(headId ?? null, bodyId ?? null) || '';
    const currentIndex = availableVariants.indexOf(currentVariant);
    const nextIndex = reverse
      ? (currentIndex - 1 + availableVariants.length) % availableVariants.length
      : (currentIndex + 1) % availableVariants.length;

    // Update global preferred variant
    const newVariant = availableVariants[nextIndex] || '';

    if (displayPokemon.isFusion && displayPokemon.head && displayPokemon.body) {
      await setPreferredVariant(
        displayPokemon.head.id,
        displayPokemon.body.id,
        newVariant
      );
    } else if (displayPokemon.head || displayPokemon.body) {
      const pokemon = displayPokemon.head || displayPokemon.body!;
      await setPreferredVariant(pokemon.id, null, newVariant);
    }

    // Update encounter timestamp to trigger reactivity
    encounter.updatedAt = getCurrentTimestamp();

    // Prefetch adjacent variants for smoother cycling
    if (availableVariants.length > 2) {
      prefetchAdjacentVariants(
        headId ?? undefined,
        bodyId ?? undefined,
        newVariant,
        availableVariants
      ).catch(error => {
        console.warn('Failed to prefetch adjacent variants:', error);
      });
    }
  } catch (error) {
    console.error('Failed to cycle artwork variant:', error);
    encounter.updatedAt = getCurrentTimestamp();
  }
};

// Preload artwork variants for all encounters in the current playthrough
export const preloadArtworkVariants = async () => {
  const activePlaythrough = getActivePlaythrough();
  if (!activePlaythrough) return;

  // Ensure encounters object exists
  if (!activePlaythrough.encounters) {
    activePlaythrough.encounters = {};
  }

  // Get all encounters that need variant preloading
  const encountersToPreload = Object.entries(
    activePlaythrough.encounters
  ).filter(([, encounter]) => {
    // Include fusion encounters with both head and body
    if (encounter.isFusion && encounter.head && encounter.body) {
      return true;
    }
    // Include single Pokémon encounters
    if (!encounter.isFusion && encounter.head) {
      return true;
    }
    return false;
  });

  if (encountersToPreload.length === 0) {
    console.debug('No encounters found to preload variants for');
    return;
  }

  console.debug(
    `Preloading artwork variants for ${encountersToPreload.length} encounters...`
  );

  try {
    // Process encounters in small batches to avoid overwhelming the server
    const batchSize = 3;
    for (let i = 0; i < encountersToPreload.length; i += batchSize) {
      const batch = encountersToPreload.slice(i, i + batchSize);

      const batchPromises = batch.map(([, encounter]) => {
        if (encounter.isFusion && encounter.head && encounter.body) {
          // Fusion encounter
          return getArtworkVariants(encounter.head.id, encounter.body.id).catch(
            (error: unknown) => {
              console.warn(
                `Failed to preload fusion variants ${encounter.head!.id}.${encounter.body!.id}:`,
                error
              );
            }
          );
        } else if (encounter.head) {
          // Single Pokémon encounter
          return getArtworkVariants(encounter.head.id).catch(
            (error: unknown) => {
              console.warn(
                `Failed to preload Pokémon variants ${encounter.head!.id}:`,
                error
              );
            }
          );
        }
        return Promise.resolve();
      });

      await Promise.all(batchPromises);

      // Add a small delay between batches to be respectful to the server
      if (i + batchSize < encountersToPreload.length) {
        await new Promise(resolve => setTimeout(resolve, 200));
      }
    }

    console.debug('Artwork variant preloading completed');
  } catch (error) {
    console.error('Failed to preload artwork variants:', error);
  }
};

// Helper methods for drag and drop operations

// Clear encounter from a specific location (replaces clearCombobox event)
export const clearEncounterFromLocation = async (
  locationId: string,
  field?: 'head' | 'body'
) => {
  const activePlaythrough = getActivePlaythrough();
  if (!activePlaythrough) return;

  // Ensure encounters object exists
  if (!activePlaythrough.encounters) {
    activePlaythrough.encounters = {};
  }

  const encounter = activePlaythrough.encounters[locationId];
  if (!encounter) return;

  if (!field) {
    // If no field specified, clear the entire encounter
    delete activePlaythrough.encounters![locationId];
    // No encounter timestamp to update since it's deleted
  } else {
    // Clear only the specified field
    encounter[field] = null;

    // When clearing part of a fusion, variants are managed globally
    if (encounter.isFusion) {
      // Variants are managed globally now, no need to handle them per encounter
    }

    // Only remove the entire encounter if it's not a fusion and we're clearing the head
    // OR if it's a regular encounter (not a fusion) and both are null
    if (!encounter.isFusion) {
      if (field === 'head' || (!encounter.head && !encounter.body)) {
        delete activePlaythrough.encounters![locationId];
        // No encounter timestamp to update since it's deleted
      } else {
        // Update encounter timestamp for partial clearing
        encounter.updatedAt = getCurrentTimestamp();
      }
    } else {
      // For fusions, keep the encounter structure and update timestamp
      encounter.updatedAt = getCurrentTimestamp();
    }
  }
};

// Move encounter from one location to another (replaces some clearCombobox usage)
export const moveEncounter = async (
  fromLocationId: string,
  toLocationId: string,
  pokemon: z.infer<typeof PokemonOptionSchema>,
  toField: 'head' | 'body' = 'head'
) => {
  const activePlaythrough = getActivePlaythrough();
  if (!activePlaythrough) return;

  // Ensure encounters object exists
  if (!activePlaythrough.encounters) {
    activePlaythrough.encounters = {};
  }

  // Clear the source location
  delete activePlaythrough.encounters[fromLocationId];

  // Create the destination encounter with pokemon in the correct field
  const pokemonWithLocationAndUID = {
    ...pokemon,
    originalLocation: pokemon.originalLocation ?? toLocationId,
    uid: pokemon.uid || generatePokemonUID(),
  };

  // Create new encounter
  const newEncounter: z.infer<typeof EncounterDataSchema> = {
    head: toField === 'head' ? pokemonWithLocationAndUID : null,
    body: toField === 'body' ? pokemonWithLocationAndUID : null,
    isFusion: toField === 'body', // If we're setting body field, it's a fusion
    updatedAt: getCurrentTimestamp(),
  };

  activePlaythrough.encounters[toLocationId] = newEncounter;

  // Variants are now managed globally, no need to apply them here
};

// Swap encounters between two locations (replaces switchCombobox event)
export const swapEncounters = async (
  locationId1: string,
  locationId2: string,
  field1: 'head' | 'body' = 'head',
  field2: 'head' | 'body' = 'head'
) => {
  const activePlaythrough = getActivePlaythrough();
  if (!activePlaythrough) return;

  // Ensure encounters object exists
  if (!activePlaythrough.encounters) {
    activePlaythrough.encounters = {};
  }

  const encounter1 = activePlaythrough.encounters[locationId1];
  const encounter2 = activePlaythrough.encounters[locationId2];

  if (!encounter1 || !encounter2) return;

  const pokemon1 = field1 === 'head' ? encounter1.head : encounter1.body;
  const pokemon2 = field2 === 'head' ? encounter2.head : encounter2.body;

  if (!pokemon1 || !pokemon2) return;

  // Preserve originalLocation for swapped Pokemon - never overwrite!
  const pokemon1WithLocation = {
    ...pokemon1,
    originalLocation: pokemon1.originalLocation ?? locationId2,
  };
  const pokemon2WithLocation = {
    ...pokemon2,
    originalLocation: pokemon2.originalLocation ?? locationId1,
  };

  // Directly swap the Pokemon
  if (field1 === 'head') {
    encounter1.head = pokemon2WithLocation;
  } else {
    encounter1.body = pokemon2WithLocation;
  }

  if (field2 === 'head') {
    encounter2.head = pokemon1WithLocation;
  } else {
    encounter2.body = pokemon1WithLocation;
  }

  // Apply preferred variants only if needed, without clearing first
  // Variants are now managed globally, no need to apply them here

  // Update both encounter timestamps since they were swapped
  const timestamp = getCurrentTimestamp();
  encounter1.updatedAt = timestamp;
  encounter2.updatedAt = timestamp;

  // If the swap results in a fusion encounter having both parts, emit animation
  const enc1NowFusion =
    encounter1.isFusion && encounter1.head && encounter1.body;
  const enc2NowFusion =
    encounter2.isFusion && encounter2.head && encounter2.body;
  if (enc1NowFusion) emitEvolutionEvent(locationId1);
  if (enc2NowFusion) emitEvolutionEvent(locationId2);
};

// Get location ID from combobox ID (helper for drag operations)
export const getLocationFromComboboxId = (
  comboboxId: string
): { locationId: string; field: 'head' | 'body' } => {
  if (comboboxId.endsWith('-head')) {
    return { locationId: comboboxId.replace('-head', ''), field: 'head' };
  }
  if (comboboxId.endsWith('-body')) {
    return { locationId: comboboxId.replace('-body', ''), field: 'body' };
  }
  if (comboboxId.endsWith('-single')) {
    return { locationId: comboboxId.replace('-single', ''), field: 'head' };
  }
  // Fallback - assume it's just the location ID
  return { locationId: comboboxId, field: 'head' };
};

// Move Pokemon to its original location with smart slot selection
export const moveToOriginalLocation = async (
  sourceLocationId: string,
  sourceField: 'head' | 'body',
  pokemon: z.infer<typeof PokemonOptionSchema>
) => {
  if (!pokemon.originalLocation) return;

  const originalLocationId = pokemon.originalLocation;

  // Don't move if already at original location
  if (originalLocationId === sourceLocationId) return;

  const activePlaythrough = getActivePlaythrough();
  if (!activePlaythrough) return;

  // Ensure encounters object exists
  if (!activePlaythrough.encounters) {
    activePlaythrough.encounters = {};
  }

  // Check what's at the original location
  const originalEncounter = activePlaythrough.encounters[originalLocationId];
  const existingHeadPokemon = originalEncounter?.head;
  const existingBodyPokemon = originalEncounter?.body;

  // Prefer empty slots first
  if (!existingHeadPokemon) {
    // Head slot is empty, move there
    await moveEncounterAtomic(
      sourceLocationId,
      sourceField,
      originalLocationId,
      'head',
      pokemon
    );
  } else if (!existingBodyPokemon) {
    // Head is occupied but body is empty, move to body slot
    await moveEncounterAtomic(
      sourceLocationId,
      sourceField,
      originalLocationId,
      'body',
      pokemon
    );
  } else {
    // Both slots are occupied, swap with the head slot (default behavior)
    await swapEncounters(
      sourceLocationId,
      originalLocationId,
      sourceField,
      'head'
    );
  }
};

// Status update actions for both Pokemon in a fusion/encounter

/**
 * Update both Pokemon in an encounter to the specified status
 */
const updateEncounterStatus = async (
  locationId: string,
  status: (typeof PokemonStatus)[keyof typeof PokemonStatus]
): Promise<void> => {
  const activePlaythrough = getActivePlaythrough();
  if (!activePlaythrough) return;

  // Ensure encounters object exists
  if (!activePlaythrough.encounters) {
    activePlaythrough.encounters = {};
  }

  const encounter = activePlaythrough.encounters[locationId];
  if (!encounter) return;

  // Update head Pokemon status if it exists
  if (encounter.head) {
    const updatedHead = {
      ...encounter.head,
      status,
    };
    await updateEncounter(locationId, updatedHead, 'head', false);
  }

  // Update body Pokemon status if it exists
  if (encounter.body) {
    const updatedBody = {
      ...encounter.body,
      status,
    };
    await updateEncounter(locationId, updatedBody, 'body', false);
  }
};

/**
 * Mark both Pokemon in an encounter as deceased
 */
export const markEncounterAsDeceased = async (
  locationId: string
): Promise<void> => {
  await updateEncounterStatus(locationId, PokemonStatus.DECEASED);
};

/**
 * Move both Pokemon in an encounter to box (stored status)
 */
export const moveEncounterToBox = async (locationId: string): Promise<void> => {
  await updateEncounterStatus(locationId, PokemonStatus.STORED);
};

/**
 * Mark both Pokemon in an encounter as captured
 */
export const markEncounterAsCaptured = async (
  locationId: string
): Promise<void> => {
  await updateEncounterStatus(locationId, PokemonStatus.CAPTURED);
};

/**
 * Mark both Pokemon in an encounter as missed
 */
export const markEncounterAsMissed = async (
  locationId: string
): Promise<void> => {
  await updateEncounterStatus(locationId, PokemonStatus.MISSED);
};

/**
 * Mark both Pokemon in an encounter as received
 */
export const markEncounterAsReceived = async (
  locationId: string
): Promise<void> => {
  await updateEncounterStatus(locationId, PokemonStatus.RECEIVED);
};

/**
 * Helper function to find a Pokémon by UID across all encounters
 */
function findPokemonByUID(
  encounters: Record<string, EncounterData> | undefined,
  uid: string
): PokemonOptionType | null {
  if (!encounters) return null;

  for (const locationId in encounters) {
    const encounter = encounters[locationId];
    if (encounter?.head?.uid === uid) {
      return encounter.head;
    }
    if (encounter?.body?.uid === uid) {
      return encounter.body;
    }
  }
  return null;
}

/**
 * Move a team member to the box by updating their status to stored and removing from team
 */
export const moveTeamMemberToBox = async (position: number): Promise<void> => {
  const activePlaythrough = getActivePlaythrough();
  if (!activePlaythrough?.team) return;

  // Validate position
  if (position < 0 || position >= 6) return;

  // Get the team member at the specified position
  const teamMember = activePlaythrough.team.members[position];
  if (!teamMember) return;

  // Update head Pokémon status to stored if it exists
  if (teamMember.headPokemonUid) {
    const headPokemon = findPokemonByUID(
      activePlaythrough.encounters,
      teamMember.headPokemonUid
    );

    if (headPokemon) {
      const updates: Partial<z.infer<typeof PokemonOptionSchema>> = {
        status: PokemonStatus.STORED,
      };

      // Set originalReceivalStatus if not already set and current status is active
      if (
        !headPokemon.originalReceivalStatus &&
        (headPokemon.status === PokemonStatus.CAPTURED ||
          headPokemon.status === PokemonStatus.RECEIVED ||
          headPokemon.status === PokemonStatus.TRADED)
      ) {
        updates.originalReceivalStatus = headPokemon.status;
      }

      await updatePokemonByUID(teamMember.headPokemonUid, updates);
    }
  }

  // Update body Pokémon status to stored if it exists
  if (teamMember.bodyPokemonUid) {
    const bodyPokemon = findPokemonByUID(
      activePlaythrough.encounters,
      teamMember.bodyPokemonUid
    );

    if (bodyPokemon) {
      const updates: Partial<z.infer<typeof PokemonOptionSchema>> = {
        status: PokemonStatus.STORED,
      };

      // Set originalReceivalStatus if not already set and current status is active
      if (
        !bodyPokemon.originalReceivalStatus &&
        (bodyPokemon.status === PokemonStatus.CAPTURED ||
          bodyPokemon.status === PokemonStatus.RECEIVED ||
          bodyPokemon.status === PokemonStatus.TRADED)
      ) {
        updates.originalReceivalStatus = bodyPokemon.status;
      }

      await updatePokemonByUID(teamMember.bodyPokemonUid, updates);
    }
  }

  // Remove the team member from the team
  activePlaythrough.team.members[position] = null;

  // Update the playthrough timestamp to trigger reactivity
  activePlaythrough.updatedAt = getCurrentTimestamp();
};

/**
 * Restore a Pokémon's status to its original receival status when adding to team
 */
export const restorePokemonToTeam = async (
  pokemonUID: string
): Promise<void> => {
  const activePlaythrough = getActivePlaythrough();
  if (!activePlaythrough?.encounters) return;

  const pokemon = findPokemonByUID(activePlaythrough.encounters, pokemonUID);
  if (!pokemon) return;

  // If Pokémon is stored, restore to original receival status
  if (pokemon.status === PokemonStatus.STORED) {
    const statusToRestore =
      pokemon.originalReceivalStatus || PokemonStatus.CAPTURED;

    await updatePokemonByUID(pokemonUID, {
      status: statusToRestore,
    });
  }
};
