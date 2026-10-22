import locationsData from "@data/shared/locations.json";
import { generatePrefixedId } from "@/shared/utils/id";
import { getActivePlaythrough, getCurrentTimestamp } from "./playthrough-state";
import type { CustomLocation } from "./types";

interface Location {
  description: string;
  id: string;
  name: string;
  region: string;
}

export type CombinedLocation =
  | Location
  | (CustomLocation & { region: string; description: string; isCustom: true });

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === "string" && value.length > 0;

const isLocation = (value: unknown): value is Location => {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const candidate = value as Record<string, unknown>;
  return (
    isNonEmptyString(candidate.id) &&
    isNonEmptyString(candidate.name) &&
    isNonEmptyString(candidate.region) &&
    isNonEmptyString(candidate.description)
  );
};

let locationsCache: Location[] | null = null;

const getLocations = (): Location[] => {
  if (locationsCache) {
    return locationsCache;
  }

  if (
    Array.isArray(locationsData) === false ||
    locationsData.every(isLocation) === false
  ) {
    console.error("Invalid locations data");
    throw new Error("Invalid locations data");
  }

  locationsCache = locationsData;
  return locationsCache;
};

export const mergeLocationsWithCustom = (
  customLocations: CustomLocation[] = [],
): CombinedLocation[] => {
  const defaultLocations = getLocations();
  if (customLocations.length === 0) {
    return defaultLocations;
  }

  const result: CombinedLocation[] = [...defaultLocations];
  let unplacedCustoms = [...customLocations];
  const maxPasses = customLocations.length + 1;
  let passCount = 0;

  while (unplacedCustoms.length > 0 && passCount < maxPasses) {
    const placedInThisPass: CustomLocation[] = [];
    for (const custom of unplacedCustoms) {
      const afterIndex = result.findIndex(
        (location) => location.id === custom.insertAfterLocationId,
      );
      if (afterIndex === -1) {
        continue;
      }

      result.splice(afterIndex + 1, 0, {
        ...custom,
        description: "Custom location",
        isCustom: true,
        region: "Custom",
      });
      placedInThisPass.push(custom);
    }

    const placedCustoms = new Set(placedInThisPass);
    unplacedCustoms = unplacedCustoms.filter(
      (custom) => placedCustoms.has(custom) === false,
    );
    if (placedInThisPass.length === 0) {
      console.warn(
        "Custom location dependency error: Could not place custom locations due to circular dependencies or missing references:",
        unplacedCustoms.map(
          (custom) => `${custom.name} (after ${custom.insertAfterLocationId})`,
        ),
      );
      break;
    }

    passCount += 1;
  }

  return result;
};

export const getLocationsSortedWithCustom = mergeLocationsWithCustom;

export const createCustomLocation = (
  name: string,
  _afterLocationId: string,
  _customLocations: CustomLocation[] = [],
): CustomLocation => ({
  id: generatePrefixedId("custom"),
  insertAfterLocationId: _afterLocationId,
  name: name.trim(),
});

export const updateCustomLocationDependencies = (
  removedLocationId: string,
  customLocations: CustomLocation[],
): CustomLocation[] => {
  const removedLocation = customLocations.find(
    (location) => location.id === removedLocationId,
  );
  if (!removedLocation) {
    return customLocations;
  }

  return customLocations.flatMap((location) => {
    if (location.id === removedLocationId) {
      return [];
    }

    return {
      ...location,
      insertAfterLocationId:
        location.insertAfterLocationId === removedLocationId
          ? removedLocation.insertAfterLocationId
          : location.insertAfterLocationId,
    };
  });
};

export const isCustomLocationPlacementValid = (
  afterLocationId: string,
  customLocations: CustomLocation[] = [],
): boolean =>
  getLocations().some((location) => location.id === afterLocationId) ||
  customLocations.some((location) => location.id === afterLocationId);

const getAvailableAfterLocationsFromLocations = (
  customLocations: CustomLocation[] = [],
) => mergeLocationsWithCustom(customLocations).slice(0, -1);

// Add a custom location to the active playthrough
export const addCustomLocation = (
  name: string,
  afterLocationId: string,
): Promise<string | null> => {
  const activePlaythrough = getActivePlaythrough();
  if (!activePlaythrough) {
    return Promise.resolve(null);
  }

  try {
    // Ensure customLocations array exists
    if (!activePlaythrough.customLocations) {
      activePlaythrough.customLocations = [];
    }

    const newCustomLocation = createCustomLocation(
      name,
      afterLocationId,
      activePlaythrough.customLocations,
    );

    // Create a new array instead of mutating the existing one to ensure reactivity
    activePlaythrough.customLocations = [
      ...activePlaythrough.customLocations,
      newCustomLocation,
    ];
    activePlaythrough.updatedAt = getCurrentTimestamp();

    return Promise.resolve(newCustomLocation.id);
  } catch (error) {
    console.error("Failed to add custom location:", error);
    return Promise.resolve(null);
  }
};

// Remove a custom location from the active playthrough
export const removeCustomLocation = async (
  customLocationId: string,
): Promise<boolean> => {
  await Promise.resolve();
  const activePlaythrough = getActivePlaythrough();
  if (!activePlaythrough?.customLocations) {
    return false;
  }

  const index = activePlaythrough.customLocations.findIndex(
    (loc) => loc.id === customLocationId,
  );

  if (index < 0) {
    return false;
  }

  // Update dependencies and remove the location in one operation
  activePlaythrough.customLocations = updateCustomLocationDependencies(
    customLocationId,
    activePlaythrough.customLocations,
  );

  // Also remove any encounters associated with this custom location
  if (activePlaythrough.encounters?.[customLocationId]) {
    delete activePlaythrough.encounters[customLocationId];
  }

  activePlaythrough.updatedAt = getCurrentTimestamp();
  return true;
};

// Update a custom location's name
export const updateCustomLocationName = (
  customLocationId: string,
  newName: string,
): boolean => {
  const activePlaythrough = getActivePlaythrough();
  if (!activePlaythrough?.customLocations) {
    return false;
  }

  const customLocation = activePlaythrough.customLocations.find(
    (loc) => loc.id === customLocationId,
  );

  if (customLocation) {
    customLocation.name = newName.trim();
    activePlaythrough.updatedAt = getCurrentTimestamp();
    return true;
  }

  return false;
};

// Get custom locations for the active playthrough
export const getCustomLocations = (): CustomLocation[] => {
  const activePlaythrough = getActivePlaythrough();
  return activePlaythrough?.customLocations || [];
};

// Validate if a custom location can be placed after a specific location
export const validateCustomLocationPlacement = async (
  afterLocationId: string,
): Promise<boolean> => {
  await Promise.resolve();
  const activePlaythrough = getActivePlaythrough();
  if (!activePlaythrough) {
    return false;
  }

  try {
    return isCustomLocationPlacementValid(
      afterLocationId,
      activePlaythrough.customLocations || [],
    );
  } catch (error) {
    console.error("Failed to validate custom location placement:", error);
    return false;
  }
};

// Get all available locations for placing custom locations after
export const getAvailableAfterLocations = () => {
  const activePlaythrough = getActivePlaythrough();

  return getAvailableAfterLocationsFromLocations(
    activePlaythrough?.customLocations || [],
  );
};

// Get merged locations (default + custom) for the active playthrough
export const getMergedLocations = () => {
  const activePlaythrough = getActivePlaythrough();

  return mergeLocationsWithCustom(activePlaythrough?.customLocations || []);
};
