import { z } from 'zod';
import {
  CustomLocationSchema,
  createCustomLocation,
} from '@/loaders/locations';
import { getActivePlaythrough, getCurrentTimestamp } from './store';

// Add a custom location to the active playthrough
export const addCustomLocation = async (
  name: string,
  afterLocationId: string
): Promise<string | null> => {
  const activePlaythrough = getActivePlaythrough();
  if (!activePlaythrough) return null;

  try {
    // Ensure customLocations array exists
    if (!activePlaythrough.customLocations) {
      activePlaythrough.customLocations = [];
    }

    const newCustomLocation = createCustomLocation(
      name,
      afterLocationId,
      activePlaythrough.customLocations
    );

    // Create a new array instead of mutating the existing one to ensure reactivity
    activePlaythrough.customLocations = [
      ...activePlaythrough.customLocations,
      newCustomLocation,
    ];
    activePlaythrough.updatedAt = getCurrentTimestamp();

    return newCustomLocation.id;
  } catch (error) {
    console.error('Failed to add custom location:', error);
    return null;
  }
};

// Remove a custom location from the active playthrough
export const removeCustomLocation = async (
  customLocationId: string
): Promise<boolean> => {
  const activePlaythrough = getActivePlaythrough();
  if (!activePlaythrough || !activePlaythrough.customLocations) return false;

  const index = activePlaythrough.customLocations.findIndex(
    loc => loc.id === customLocationId
  );

  if (index !== -1) {
    // Import the dependency update function
    const { updateCustomLocationDependencies } = await import(
      '@/loaders/locations'
    );

    // Update dependencies and remove the location in one operation
    activePlaythrough.customLocations = updateCustomLocationDependencies(
      customLocationId,
      activePlaythrough.customLocations
    );

    // Also remove any encounters associated with this custom location
    if (
      activePlaythrough.encounters &&
      activePlaythrough.encounters[customLocationId]
    ) {
      delete activePlaythrough.encounters[customLocationId];
    }

    activePlaythrough.updatedAt = getCurrentTimestamp();
    return true;
  }

  return false;
};

// Update a custom location's name
export const updateCustomLocationName = (
  customLocationId: string,
  newName: string
): boolean => {
  const activePlaythrough = getActivePlaythrough();
  if (!activePlaythrough || !activePlaythrough.customLocations) return false;

  const customLocation = activePlaythrough.customLocations.find(
    loc => loc.id === customLocationId
  );

  if (customLocation) {
    customLocation.name = newName.trim();
    activePlaythrough.updatedAt = getCurrentTimestamp();
    return true;
  }

  return false;
};

// Get custom locations for the active playthrough
export const getCustomLocations = (): z.infer<
  typeof CustomLocationSchema
>[] => {
  const activePlaythrough = getActivePlaythrough();
  return activePlaythrough?.customLocations || [];
};

// Validate if a custom location can be placed after a specific location
export const validateCustomLocationPlacement = async (
  afterLocationId: string
): Promise<boolean> => {
  const activePlaythrough = getActivePlaythrough();
  if (!activePlaythrough) return false;

  try {
    const { validateCustomLocationPlacement } = await import(
      '@/loaders/locations'
    );
    return validateCustomLocationPlacement(
      afterLocationId,
      activePlaythrough.customLocations || []
    );
  } catch (error) {
    console.error('Failed to validate custom location placement:', error);
    return false;
  }
};

// Get all available locations for placing custom locations after
export const getAvailableAfterLocations = async () => {
  const activePlaythrough = getActivePlaythrough();

  try {
    const { getAvailableAfterLocations } = await import('@/loaders/locations');
    return getAvailableAfterLocations(activePlaythrough?.customLocations || []);
  } catch (error) {
    console.error('Failed to get available after locations:', error);
    return [];
  }
};

// Get merged locations (default + custom) for the active playthrough
export const getMergedLocations = async () => {
  const activePlaythrough = getActivePlaythrough();

  try {
    const { getLocationsSortedWithCustom } = await import(
      '@/loaders/locations'
    );
    return getLocationsSortedWithCustom(
      activePlaythrough?.customLocations || []
    );
  } catch (error) {
    console.error('Failed to get merged locations:', error);
    return [];
  }
};
