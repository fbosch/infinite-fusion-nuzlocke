#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

function removeRouteIdFromFile(filePath) {
  console.log(`Processing ${filePath}...`);
  
  try {
    const data = fs.readFileSync(filePath, 'utf8');
    const encounters = JSON.parse(data);
    
    // Remove routeId from each encounter
    const cleanedEncounters = encounters.map(encounter => {
      const { routeId, ...rest } = encounter;
      return rest;
    });
    
    // Write back to file
    fs.writeFileSync(filePath, JSON.stringify(cleanedEncounters, null, 2));
    console.log(`✓ Removed routeId from ${encounters.length} encounters in ${filePath}`);
  } catch (error) {
    console.error(`✗ Error processing ${filePath}:`, error.message);
  }
}

// Process both classic and remix encounter files
const files = [
  'data/classic/encounters.json',
  'data/remix/encounters.json'
];

files.forEach(file => {
  const fullPath = path.join(process.cwd(), file);
  if (fs.existsSync(fullPath)) {
    removeRouteIdFromFile(fullPath);
  } else {
    console.error(`✗ File not found: ${fullPath}`);
  }
});

console.log('\nRoute ID removal complete!'); 