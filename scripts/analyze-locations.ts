#!/usr/bin/env node

import fs from 'fs/promises';
import path from 'path';

async function analyzeLocations() {
  try {
    const dataDir = path.join(process.cwd(), 'data');
    
    // Read all data files
    const gifts = JSON.parse(await fs.readFile(path.join(dataDir, 'gifts.json'), 'utf8'));
    const trades = JSON.parse(await fs.readFile(path.join(dataDir, 'trades.json'), 'utf8'));
    const locations = JSON.parse(await fs.readFile(path.join(dataDir, 'locations.json'), 'utf8'));

    // Collect all location names
    const allLocations = new Set<string>();

    // From gifts
    gifts.forEach((gift: any) => allLocations.add(gift.location)); // eslint-disable-line @typescript-eslint/no-explicit-any

    // From trades  
    trades.forEach((trade: any) => allLocations.add(trade.location)); // eslint-disable-line @typescript-eslint/no-explicit-any

    // From locations
    locations.forEach((loc: any) => allLocations.add(loc.name)); // eslint-disable-line @typescript-eslint/no-explicit-any

    // Sort and display
    const sortedLocations = Array.from(allLocations).sort();
    console.log('All unique location names:');
    sortedLocations.forEach(loc => console.log(`  - ${loc}`));

    // Check for potential inconsistencies
    console.log('\nPotential inconsistencies:');
    const locationMap = new Map<string, string>();

    sortedLocations.forEach(loc => {
      const normalized = loc.toLowerCase().replace(/[^a-z0-9]/g, '');
      if (locationMap.has(normalized)) {
        console.log(`  - ${locationMap.get(normalized)} vs ${loc}`);
      } else {
        locationMap.set(normalized, loc);
      }
    });

    // Count locations by source
    console.log('\nLocation counts by source:');
    const giftLocations = new Set(gifts.map((g: any) => g.location)); // eslint-disable-line @typescript-eslint/no-explicit-any
    const tradeLocations = new Set(trades.map((t: any) => t.location)); // eslint-disable-line @typescript-eslint/no-explicit-any
    const locationNames = new Set(locations.map((l: any) => l.name)); // eslint-disable-line @typescript-eslint/no-explicit-any
    
    console.log(`  - Gifts: ${giftLocations.size} unique locations`);
    console.log(`  - Trades: ${tradeLocations.size} unique locations`);
    console.log(`  - Locations: ${locationNames.size} unique locations`);
    console.log(`  - Total unique: ${allLocations.size} locations`);

  } catch (error) {
    console.error('Error analyzing locations:', error);
  }
}

analyzeLocations(); 