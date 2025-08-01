/**
 * Route Processing Utilities
 * 
 * Pure functions for processing route names and IDs from scraped encounter data.
 * These utilities handle parsing route information from wiki content.
 */

// Pre-compiled regex patterns for better performance
export const ROUTE_PATTERNS = {
  // More inclusive pattern that captures routes, cities, and locations with encounter data
  ROUTE_MATCH: /^(Route \d+|.*(?:City|Town|Forest|Cave|Mountain|Mt\.|Island|Garden|River|Lake|Beach|Tower|Mansion|Building|Center|Zone|Area|Path|Road|Bridge|Tunnel|Valley|Canyon|Plateau|Field|Meadow|Grove|Ruins|Temple|Shrine|Laboratory|Factory|Power Plant|Safari|Park|Stadium|Gym|League|Elite Four|Champion|Victory Road).*(?:\s*\(ID\s+-?\d+(?:\.\d+)?\))?)/i,
  ROUTE_ID_EXTRACT: /\(ID\s+(-?\d+(?:\.\d+)?)\)/i,
  ROUTE_ID_CLEAN: /\s*\(ID\s+-?\d+(?:\.\d+)?\)\s*$/i
} as const;

/**
 * Checks if a text string matches a route pattern
 */
export function isRoutePattern(text: string): boolean {
  if (!text || typeof text !== 'string') {
    return false;
  }

  return ROUTE_PATTERNS.ROUTE_MATCH.test(text.trim());
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