/**
 * Route Processing Utilities
 * 
 * Pure functions for processing route names and IDs from scraped encounter data.
 * These utilities handle parsing route information from wiki content.
 */

// Simple patterns for route validation
export const ROUTE_PATTERNS = {
  // Basic route pattern: "Route" followed by a number
  ROUTE_NUMBER: /^Route\s+\d+$/i,
  
  // Safari Zone pattern: "Safari Zone" followed by optional area
  SAFARI_ZONE: /^Safari Zone(?:\s+\(Area\s+\d+\))?$/i,
  
  // ID extraction pattern
  ROUTE_ID_EXTRACT: /\(ID\s+(-?\d+(?:\.\d+)?)\)/i,
  
  // ID cleanup pattern
  ROUTE_ID_CLEAN: /\s*\(ID\s+-?\d+(?:\.\d+)?\)\s*$/i,
  
  // Legacy pattern for test compatibility
  ROUTE_MATCH: /^Route\s+\d+$/i
} as const;

// Common location suffixes that indicate valid locations
const LOCATION_SUFFIXES = [
  'City', 'Town', 'Forest', 'Cave', 'Cavern', 'Mountain', 'Mountains',
  'Island', 'Islands', 'Garden', 'River', 'Lake', 'Beach', 'Cape',
  'Tower', 'Mansion', 'Building', 'Center', 'Zone', 'Area', 'Path',
  'Road', 'Bridge', 'Tunnel', 'Valley', 'Canyon', 'Plateau', 'Field',
  'Meadow', 'Grove', 'Ruins', 'Temple', 'Shrine', 'Laboratory',
  'Factory', 'Power Plant', 'Safari', 'Park', 'Stadium', 'Gym',
  'League', 'Elite Four', 'Champion', 'Victory Road', 'Sewers',
  'House', 'Falls', 'Well', 'Rage', 'Den', 'Dojo', 'Co.', 'Restaurant',
  'Cafe', 'Corner', 'Nightclub', 'HQ', 'Anne', 'Pillar', 'Origin',
  'Laboratory', 'Hollow', 'Summit', 'Room', 'Exit', 'Entrance',
  'Interior', 'Exterior', 'Depths', 'Hidden', 'Dark Room'
] as const;

// Common location prefixes
const LOCATION_PREFIXES = [
  'Mt.', 'Secret', 'Hidden', 'Deep', 'Sky', 'Birth',
  'Dream', 'Pinkan', 'Seafoam', 'Navel', 'Hall', 'P2', 'Lake of'
] as const;

/**
 * Checks if a text string matches a route pattern
 */
export function isRoutePattern(text: string): boolean {
  if (!text || typeof text !== 'string') {
    return false;
  }

  const trimmed = text.trim();
  
  // Check for empty or very short text
  if (trimmed.length < 3) {
    return false;
  }

  // Remove ID information for pattern matching
  const cleanText = trimmed.replace(ROUTE_PATTERNS.ROUTE_ID_CLEAN, '').trim();

  // Check for numbered routes
  if (ROUTE_PATTERNS.ROUTE_NUMBER.test(cleanText)) {
    return true;
  }

  // Check for Safari Zone
  if (ROUTE_PATTERNS.SAFARI_ZONE.test(cleanText)) {
    return true;
  }

  // Check for locations with common suffixes (case insensitive)
  // Use word boundary to avoid matching Pokémon names like "Magnezone" or "Bellsprout"
  const hasValidSuffix = LOCATION_SUFFIXES.some(suffix => {
    const lowerSuffix = suffix.toLowerCase();
    const lowerText = cleanText.toLowerCase();
    
    // Use regex with word boundaries to ensure we only match complete words
    const suffixRegex = new RegExp(`\\b${lowerSuffix}\\b`, 'i');
    const matches = suffixRegex.test(lowerText);
    
    // Additional validation: if the suffix is "Gym", make sure it's not followed by a person's title
    if (suffix.toLowerCase() === 'gym' && matches) {
      // Check if "Gym" is followed by common person/title words
      const personTitleRegex = /\bgym\s+(leader|trainer|master|champion|elite|four|gym\s+leader)/i;
      if (personTitleRegex.test(lowerText)) {
        return false;
      }
    }
    
    return matches;
  });

  if (hasValidSuffix) {
    return true;
  }

  // Check for locations with common prefixes (case insensitive)
  const hasValidPrefix = LOCATION_PREFIXES.some(prefix => {
    const lowerPrefix = prefix.toLowerCase();
    const lowerText = cleanText.toLowerCase();
    
    // For other prefixes, check if the text starts with the prefix
    return lowerText.startsWith(lowerPrefix);
  });

  if (hasValidPrefix) {
    return true;
  }

  // Check for specific known locations that don't follow the patterns (case insensitive)
  const knownLocations = [
    'Oak\'s Lab', 'Pallet Town', 'Viridian City', 'Pewter City',
    'Cerulean City', 'Vermilion City', 'Lavender Town', 'Celadon City',
    'Saffron City', 'Fuchsia City', 'Cinnabar Island', 'Indigo Plateau',
    'Seafoam Islands', 'Cinnabar Island', 'Pallet Town', 'Viridian Forest',
    'Rock Tunnel', 'Silph Co.', 'S.S. Anne', 'Team Rocket HQ',
    'Dragon\'s Den', 'Fighting Dojo', 'Kanto Daycare', 'National Park',
    'Kin Island', 'Knot Island', 'Bond Bridge', 'Celadon Cafe',
    'Celadon Game Corner', 'Saffron Restaurant', 'Violet City',
    'Blackthorn City', 'Vermilion City', 'Cerulean Cave', 'Mt. Ember',
    'Navel Rock', 'Ilex Forest', 'Deep Sea', 'Sky Pillar',
    'Hall of Origin', 'P2 Laboratory', 'Bell Tower', 'Lake of Rage',
    'Birth Island', 'Dream', 'Pinkan Hollow'
  ];

  if (knownLocations.some(location => 
    cleanText.toLowerCase() === location.toLowerCase()
  )) {
    return true;
  }

  // Check for locations with floor indicators (B1F, B2F, F1, etc.)
  if (/^(.*?)\s+(B?\d+F|F\d+|A\d+|Summit|Square|Entrance|Exit|Top|Bottom|Upper|Lower|North|South|East|West|Interior|Exterior|Depths|Hidden|Center|Dark Room|Route \d+ Exit|\(Area \d+\))$/i.test(cleanText)) {
    return true;
  }

  return false;
}

/**
 * Cleans a route name by removing ID information
 */
export function cleanRouteName(routeName: string): string {
  if (!routeName || typeof routeName !== 'string') {
    return '';
  }

  return routeName.replace(ROUTE_PATTERNS.ROUTE_ID_CLEAN, '').trim();
}

/**
 * Extracts route ID from text like "Route 1 (ID 78)"
 */
export function extractRouteId(routeName: string): number | undefined {
  if (!routeName || typeof routeName !== 'string') {
    return undefined;
  }

  const match = routeName.match(ROUTE_PATTERNS.ROUTE_ID_EXTRACT);
  if (!match || !match[1]) {
    return undefined;
  }

  const id = parseInt(match[1], 10);
  return isNaN(id) ? undefined : id;
}

/**
 * Processes a route name to extract both clean name and ID
 */
export function processRouteName(routeName: string): {
  cleanName: string;
  routeId?: number;
} {
  const cleanName = cleanRouteName(routeName);
  const routeId = extractRouteId(routeName);

  return {
    cleanName,
    ...(routeId !== undefined && { routeId })
  };
} 