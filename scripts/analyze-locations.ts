#!/usr/bin/env node

import fs from 'fs/promises';
import path from 'path';

async function analyzeLocations() {
  try {
    const dataDir = path.join(process.cwd(), 'data');
    
    // Read all data files from new structure
    const classicGifts = JSON.parse(await fs.readFile(path.join(dataDir, 'classic/gifts.json'), 'utf8'));
    const classicTrades = JSON.parse(await fs.readFile(path.join(dataDir, 'classic/trades.json'), 'utf8'));
    const remixGifts = JSON.parse(await fs.readFile(path.join(dataDir, 'remix/gifts.json'), 'utf8'));
    const remixTrades = JSON.parse(await fs.readFile(path.join(dataDir, 'remix/trades.json'), 'utf8'));
    const locations = JSON.parse(await fs.readFile(path.join(dataDir, 'shared/locations.json'), 'utf8'));

    // Collect all location names
    const allLocations = new Set<string>();

    // From classic gifts and trades
    classicGifts.forEach((gift: any) => allLocations.add(gift.location));  
    classicTrades.forEach((trade: any) => allLocations.add(trade.location));  

    // From remix gifts and trades
    remixGifts.forEach((gift: any) => allLocations.add(gift.location));  
    remixTrades.forEach((trade: any) => allLocations.add(trade.location));  

    // From locations
    locations.forEach((loc: any) => allLocations.add(loc.name));  

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
    const classicGiftLocations = new Set(classicGifts.map((g: any) => g.location));  
    const classicTradeLocations = new Set(classicTrades.map((t: any) => t.location));  
    const remixGiftLocations = new Set(remixGifts.map((g: any) => g.location));  
    const remixTradeLocations = new Set(remixTrades.map((t: any) => t.location));  
    const locationNames = new Set(locations.map((l: any) => l.name));  
    
    console.log(`  - Classic Gifts: ${classicGiftLocations.size} unique locations`);
    console.log(`  - Classic Trades: ${classicTradeLocations.size} unique locations`);
    console.log(`  - Remix Gifts: ${remixGiftLocations.size} unique locations`);
    console.log(`  - Remix Trades: ${remixTradeLocations.size} unique locations`);
    console.log(`  - Locations: ${locationNames.size} unique locations`);
    console.log(`  - Total unique: ${allLocations.size} locations`);

  } catch (error) {
    console.error('Error analyzing locations:', error);
  }
}

analyzeLocations(); 