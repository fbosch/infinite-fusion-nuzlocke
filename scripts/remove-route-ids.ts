#!/usr/bin/env node

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { ConsoleFormatter } from './console-utils';

interface Location {
  id: string;
  name: string;
  routeId: number;
  order: number;
  region: string;
  description: string;
}

interface LocationWithoutRouteId {
  id: string;
  name: string;
  order: number;
  region: string;
  description: string;
}

async function removeRouteIdsFromLocations() {
  ConsoleFormatter.printHeader('Remove Route IDs', 'Removing routeId fields from locations.json');
  
  try {
    const dataDir = path.join(process.cwd(), 'data', 'shared');
    const locationsPath = path.join(dataDir, 'locations.json');
    
    // Read the current locations file
    const locationsData = await ConsoleFormatter.withSpinner(
      'Reading locations.json...',
      () => fs.readFile(locationsPath, 'utf-8')
    );
    
    const locations: Location[] = JSON.parse(locationsData);
    ConsoleFormatter.info(`Found ${locations.length} locations`);
    
    // Remove routeId from each location
    const updatedLocations: LocationWithoutRouteId[] = locations.map(location => {
      const { routeId, ...locationWithoutRouteId } = location;
      return locationWithoutRouteId;
    });
    
    // Write the updated data back to the file
    await ConsoleFormatter.withSpinner(
      'Writing updated locations.json...',
      () => fs.writeFile(locationsPath, JSON.stringify(updatedLocations, null, 2))
    );
    
    ConsoleFormatter.success(`Successfully removed routeId from ${locations.length} locations`);
    
    // Get file stats
    const stats = await fs.stat(locationsPath);
    ConsoleFormatter.printSummary('Route ID Removal Complete!', [
      { label: 'Locations processed', value: locations.length.toString(), color: 'yellow' },
      { label: 'File size', value: ConsoleFormatter.formatFileSize(stats.size), color: 'cyan' },
      { label: 'File path', value: locationsPath, color: 'cyan' }
    ]);
    
  } catch (error) {
    ConsoleFormatter.error(`Error removing route IDs: ${error instanceof Error ? error.message : 'Unknown error'}`);
    process.exit(1);
  }
}

// Check if this script is being run directly
const __filename = fileURLToPath(import.meta.url);
if (process.argv[1] === __filename) {
  removeRouteIdsFromLocations();
} 