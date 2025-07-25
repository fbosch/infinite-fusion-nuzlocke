#!/usr/bin/env node
import { copyFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

// Get current directory for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

// Files to copy for web worker dependencies
const dependencies = [
  {
    source: 'node_modules/comlink/dist/umd/comlink.js',
    destination: 'public/comlink.js',
    description: 'Comlink library for web worker communication'
  },
  {
    source: 'node_modules/fuse.js/dist/fuse.min.js',
    destination: 'public/fuse.min.js',
    description: 'Fuse.js library for fuzzy search'
  }
];

console.debug('📦 Copying web worker dependencies...\n');

// Ensure public directory exists
const publicDir = join(projectRoot, 'public');
if (!existsSync(publicDir)) {
  mkdirSync(publicDir, { recursive: true });
  console.debug('✅ Created public directory');
}

// Copy each dependency
dependencies.forEach(({ source, destination, description }) => {
  const sourcePath = join(projectRoot, source);
  const destPath = join(projectRoot, destination);

  try {
    if (!existsSync(sourcePath)) {
      throw new Error(`Source file not found: ${sourcePath}`);
    }

    copyFileSync(sourcePath, destPath);
    console.debug(`✅ Copied ${description}`);
    console.debug(`   ${source} → ${destination}`);
  } catch (error) {
    console.error(`❌ Failed to copy ${description}:`);
    console.error(`   ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  }
});

console.debug('\n🎉 All web worker dependencies copied successfully!');
console.debug('📝 Remember to run this script after updating dependencies.'); 